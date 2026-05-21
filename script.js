const themeToggle = document.querySelector(".theme-toggle");
const themeState = document.querySelector(".theme-toggle__state");

function getSavedTheme() {
  try {
    return localStorage.getItem("theme");
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch (error) {
    // Theme still works for the current page when storage is unavailable.
  }
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  saveTheme(nextTheme);

  if (themeToggle) {
    const isDark = nextTheme === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }

  if (themeState) {
    themeState.textContent = nextTheme === "dark" ? "Dark" : "Light";
  }
}

applyTheme(getSavedTheme() || document.documentElement.dataset.theme || "dark");

themeToggle?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  applyTheme(current === "dark" ? "light" : "dark");
});

document.querySelectorAll("#year").forEach((node) => {
  node.textContent = new Date().getFullYear();
});
