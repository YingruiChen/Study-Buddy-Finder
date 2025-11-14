// start importing things we need
import express from "express"; // main web server
import cookieParser from "cookie-parser"; // for reading cookies
import { createClient } from "@supabase/supabase-js"; // database helper
import path from "path"; // for file paths
import { fileURLToPath } from "url"; // for finding where files are
import cors from "cors"; // for letting websites talk to each other

// setup secret keys
const PORT = process.env.PORT; // which door to listen on
const SUPABASE_URL = process.env.SUPABASE_URL; // where our database lives
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // secret key for database
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);// make a friend to talk to database
const __filename = fileURLToPath(import.meta.url); // figure out where we are
const __dirname = path.dirname(__filename);

const app = express(); // start our web server
app.use(express.json()); // teach server how to understand things
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public"))); // serve static files
app.use( // safety rules for talking
  cors({
    origin: ["http://127.0.0.1:5500"],// only let this address talk
    credentials: true,// allow cookies to be sent
  })
);

const requireAuth = async (req, res, next) => {// security guard middleware
  const token = req.cookies?.access_token;// look for ticket in cookies
  if (!token)// if no ticket found
    return res.status(401).json({ error: "Missing or invalid access token" });

  const { data, error } = await supabase.auth.getUser(token);// ask database if ticket is real
  if (error || !data?.user)
    return res.status(401).json({ error: "Invalid or expired session" });

  req.user = data.user;// remember who you are
  next();// ok you can go in
};

app.get("/", (_req, res) => {// front door route
  res.status(200).json({ message: "OK" });// just say im here
});

app.post("/signup", async (req, res) => {// sign up for new account
  try {
    const { email, password } = req.body;// get info from form
    if (!email || !password)// check if we have everything
      return res.status(400).json({ error: "Email, and password required" });
// tell database to make new user
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
// yay new user made
    res.status(200).json({
      message: "User signed up successfully",
      user: data.user,
    });
  } catch (err) {
    res.status(500).json({ error: "Signup request failed" });
  }
});
// login to account
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)// check for email and password
      return res.status(400).json({ error: "Email and password required" });
// ask database if login is correct
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return res.status(401).json({ error: error.message });

    const accessToken = data.session?.access_token;// get your special ticket
    if (!accessToken)
      return res.status(401).json({ error: "No session returned" });
// give you a cookie with your ticket inside
    res.cookie("access_token", accessToken, {
      httpOnly: true,// only server can read this
      secure: true,// send only over safe connection
      sameSite: "none",// can be sent from other websites
      path: "/",// works on all pages
      maxAge: 7 * 24 * 60 * 60 * 1000,// ticket lasts 1 week
    });

    res.status(200).json({ message: "Login successful", user: data.user });
  } catch (err) {
    res.status(500).json({ error: "Login request failed" });
  }
});
// ask who am i
app.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});
// log out of account
app.post("/logout", async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();// tell database youre leaving

    res.clearCookie("access_token", { path: "/" });// throw away your cookie ticket

    if (error) throw error;

    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Logout failed" });
  }
});
// secret clubhouse only for logged in users
app.get("/private", requireAuth, (req, res) => {
  res.status(200).json({
    message: `Welcome, ${req.user.email}!`,
    user: req.user,
  });
});
// make a new study buddy listing
app.post("/listings", async (req, res) => {
  const { location, group_size, time, description } = req.body;// get info about the study session

  if (!location || !group_size || !time) {// check if we have the important stuff
    return res.status(400).json({ error: "Missing required fields" });
  }
// save to database
  const { data, error } = await supabase
    .from("listings")
    .insert([{ location, group_size, time, description }])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
// heres your new listing
  res.json(data[0]);
});
// look at all study buddy listings
app.get("/listings", async (req, res) => {// get all listings from database newest first
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
// here are all the listings
  res.json(data);
});
// delete a study buddy listing
app.delete("/listings/:id", (req, res) => {
  try {
    const { id } = req.params;// which listing to delete
    res.status(200).json({ message: `DELETE success for ID: ${id}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "DELETE request failed" });
  }
});
// start listening
app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});
