// =================================
// Theme Manager Module
// =================================

export const ThemeManager = {
  theme: "dark",

  init() {
    this.theme = localStorage.getItem("gv_theme") || "dark";
    this.apply(this.theme);
    this.bindEvents();
  },

  apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gv_theme", theme);
    this.updateToggleIcon(theme);
  },

  toggle() {
    this.theme = this.theme === "dark" ? "light" : "dark";
    this.apply(this.theme);
  },

  updateToggleIcon(theme) {
    const icon = document.getElementById("theme-icon");
    if (!icon) return;
    if (theme === "light") {
      icon.className = "fas fa-moon";
    } else {
      icon.className = "fas fa-sun";
    }
  },

  bindEvents() {
    // Event delegation to support dynamically loaded Navbar
    document.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest("#theme-toggle");
      if (toggleBtn) {
        e.preventDefault();
        this.toggle();
      }
    });
  }
};
