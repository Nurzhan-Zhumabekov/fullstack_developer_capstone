function readCsrfCookie() {
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith("csrftoken="));
  return cookie ? decodeURIComponent(cookie.slice("csrftoken=".length)) : "";
}

async function showAccount() {
  const area = document.querySelector("[data-account-links]");
  if (!area) return;

  try {
    const response = await fetch("/djangoapp/session", { credentials: "same-origin" });
    if (!response.ok) return;
    const session = await response.json();
    if (!session.authenticated) return;

    const username = document.createElement("span");
    username.className = "username";
    username.textContent = session.userName;
    const logout = document.createElement("button");
    logout.className = "btn subtle";
    logout.type = "button";
    logout.textContent = "Logout";

    const status = document.createElement("span");
    status.setAttribute("role", "status");

    logout.addEventListener("click", async () => {
      logout.disabled = true;
      try {
        const reply = await fetch("/djangoapp/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRFToken": readCsrfCookie() },
          body: "{}",
        });
        if (!reply.ok) throw new Error("Logout failed");
        window.location.reload();
      } catch {
        status.textContent = "Unable to log out. Try again.";
        logout.disabled = false;
      }
    });

    area.replaceChildren(username, logout, status);
  } catch {
    // The default login and register links remain usable.
  }
}

showAccount();
