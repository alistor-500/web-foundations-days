const loadBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusEl = document.getElementById("status");
const usersList = document.getElementById("users-list");

let allUsers = []; // the full list, kept so filtering needs no new request
function renderUsers(users) {
  usersList.textContent = "";

  for (const user of users) {
    const li = document.createElement("li");

    const nameEl = document.createElement("strong");
    nameEl.textContent = user.name;

    const details = document.createElement("p");
    details.textContent = `Email: ${user.email} | City: ${user.address.city} | Company: ${user.company.name}`;

    li.appendChild(nameEl);
    li.appendChild(details);
    usersList.appendChild(li);
  }
}
async function loadUsers() {
  loadBtn.disabled = true;
  statusEl.textContent = "Loading users...";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    allUsers = await response.json();
    filterInput.value = "";
    renderUsers(allUsers);
    statusEl.textContent = `Success: loaded ${allUsers.length} users.`;
  } catch (error) {
    statusEl.textContent = `Error: could not load users. ${error.message}`;
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", loadUsers);
function applyFilter() {
  if (allUsers.length === 0) {
    return; // nothing loaded yet
  }

  const term = filterInput.value.trim().toLowerCase();
  const matches = allUsers.filter(function (user) {
    return user.name.toLowerCase().includes(term);
  });

  renderUsers(matches);
  statusEl.textContent = `Showing ${matches.length} of ${allUsers.length} users.`;
}

filterInput.addEventListener("input", applyFilter);
