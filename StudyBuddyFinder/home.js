const API = "http://localhost:3000";// Set our server address
// Automatically check whether the user is logged in when the page is loaded
(async () => {// Ask the server Who am I
  const res = await fetch(`${API}/me`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) return (location.href = "public/index.html");// If you are not logged in, it will redirect to the login page
  document.getElementById("welcome").textContent =// If logged in, a welcome message will be displayed on the page
    "Welcome back, " + data.user.email + "!";
})();

async function createListing() {
  const location = document.getElementById("location").value;//Obtain the information input by the user from the web form
  const group_size = parseInt(document.getElementById("group-size").value);
  const time = document.getElementById("time").value;
  const description = document.getElementById("description").value;
// Send the information to the server for saving
  const res = await fetch(`${API}/listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location, group_size, time, description }),
  });

  const data = await res.json();
  if (res.ok) {
    alert("Listing submitted!");
    console.log("Inserted:", data);//Display the results on the console
  } else {
    console.log("Error: " + data.error);
  }
}
//Get the list of all study groups
async function getListings() {
  const res = await fetch(`${API}/listings`, {
    method: "GET",
  });

  const data = await res.json();//Find the location on the webpage where the group details are displayed
  const paragraphs = document.querySelectorAll("div.group-details > p");//Display the information of the first group on the web page
  paragraphs[0].textContent += " " + data[0].group_size;
  paragraphs[1].textContent += " " + data[0].location;
  paragraphs[2].textContent += " " + data[0].time;
  paragraphs[3].textContent += " " + data[0].description;
  console.log(data);
}
//Exit the login function
async function logout() {
  try {//Tell the server that I want to exit
    const res = await fetch(`${API}/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) throw new Error("Fail");
//Clear the login information stored locally
    localStorage.removeItem("auth");
    sessionStorage.removeItem("auth");
//Jump to the login page
    window.location.replace("public/index.html");
  } catch (err) {
    console.log(err.message);
  }
}
