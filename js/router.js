// =================================
// SPA Router Module
// =================================

import { AuthManager } from "./auth.js";
import { ThemeManager } from "./theme.js";
import { HomeController } from "./home.js";
import { DashboardController } from "./dashboard.js";
import { LeaderboardController } from "./leaderboard.js";
import { HistoryController } from "./history.js";
import { ProfileController } from "./profile.js";
import { AdminController } from "./admin.js";
import { TicTacToeGame } from "../games/tic_tac_toe/ttt_game.js";
import { RockPaperScissorsGame } from "../games/rock_paper_scissors/rps_game.js";
import { ToastManager } from "./toast.js";

const routes = {
  "home": { id: "home-view", controller: HomeController, authRequired: false },
  "games": { id: "games-view", controller: null, authRequired: false },
  "games/tic_tac_toe": { id: "game-ttt-view", controller: TicTacToeGame, authRequired: false },
  "games/tic-tac_toe": { id: "game-ttt-view", controller: TicTacToeGame, authRequired: false },
  "games/rock_paper_scissors": { id: "game-rps-view", controller: RockPaperScissorsGame, authRequired: false },
  "dashboard": { id: "dashboard-view", controller: DashboardController, authRequired: true },
  "leaderboard": { id: "leaderboard-view", controller: LeaderboardController, authRequired: false },
  "profile": { id: "profile-view", controller: ProfileController, authRequired: true },
  "history": { id: "history-view", controller: HistoryController, authRequired: true },
  "admin": { id: "admin-view", controller: AdminController, authRequired: true, adminRequired: true }
};

export const Router = {
  async init() {
    // 1. Fetch & inject templates into placeholders
    await this.loadTemplates();
    
    // 2. Setup listeners for routing
    window.addEventListener("hashchange", () => this.handleRouting());
    
    // 3. Trigger initial routing evaluation
    await this.handleRouting();
  },

  async loadTemplates() {
    const loader = async (selector, url) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load template from ${url}`);
      el.innerHTML = await res.text();
    };

    try {
      await Promise.all([
        loader("#navbar-container", "./components/navbar.html"),
        loader("#footer-container", "./components/footer.html"),
        loader("#modals-container", "./components/modals.html"),
        loader("#home-view", "./components/home.html"),
        loader("#games-view", "./components/games.html"),
        loader("#game-ttt-view", "./components/tic_tac_toe.html"),
        loader("#game-rps-view", "./components/rock_paper_scissors.html"),
        loader("#dashboard-view", "./components/dashboard.html"),
        loader("#leaderboard-view", "./components/leaderboard.html"),
        loader("#profile-view", "./components/profile.html"),
        loader("#history-view", "./components/history.html"),
        loader("#admin-view", "./components/admin.html")
      ]);
    } catch (err) {
      console.error("Template injection failed:", err);
      ToastManager.show("Error loading templates.", "error");
    }
  },

  async handleRouting() {
    let hash = window.location.hash || "#/home";
    
    let path = hash.replace(/^#\/?/, "");
    if (!path) path = "home";

    // Support flexible trailing routes or query strings if any
    path = path.split("?")[0];

    let route = routes[path];
    
    // Dynamic matching for games/:gameId routes to support future game expansion
    if (!route && path.startsWith("games/")) {
      const gameKey = path.substring("games/".length);
      if (gameKey === "tic_tac_toe" || gameKey === "tic-tac_toe") {
        route = routes["games/tic_tac_toe"];
      } else if (gameKey === "rock_paper_scissors") {
        route = routes["games/rock_paper_scissors"];
      } else {
        // Automatically resolve page view ID for future games
        const viewId = `game-${gameKey.replace(/_/g, "-")}-view`;
        route = {
          id: viewId,
          controller: null,
          authRequired: false
        };
      }
    }
    
    if (!route) {
      window.location.hash = "#/home";
      return;
    }

    const user = AuthManager.currentUser;

    if (user && user.isAdmin) {
      if (path === "dashboard" || path === "history" || path === "leaderboard") {
        window.location.hash = "#/admin";
        return;
      }
    }

    if (route.authRequired && !user) {
      ToastManager.show("Please log in to access that area.", "info");
      AuthManager.showLoginModal();
      window.location.hash = "#/home";
      return;
    }

    if (route.adminRequired && (!user || !user.isAdmin)) {
      ToastManager.show("Access denied. Admin rights required.", "error");
      window.location.hash = user ? "#/dashboard" : "#/home";
      return;
    }

    // Hide all view screens
    document.querySelectorAll(".view-section").forEach(section => {
      section.classList.add("hide");
    });

    // Reveal active screen
    const targetView = document.getElementById(route.id);
    if (targetView) {
      targetView.classList.remove("hide");
    }

    // Automatically scroll to the top with a smooth animation on page change
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    // Highlight active link classes
    this.updateActiveNavLink(hash);

    // Call update/start functions on views
    if (route.controller) {
      if (typeof route.controller.update === "function") {
        await route.controller.update();
      }
      if (typeof route.controller.start === "function") {
        route.controller.start();
      }
    }
    
    // Refresh auth UI display state
    AuthManager.updateAuthUI();
    
    // Refresh Theme toggle icon
    ThemeManager.updateToggleIcon(ThemeManager.theme);
  },

  updateActiveNavLink(hash) {
    const links = document.querySelectorAll(".nav-link, .dropdown-item, .footer-links a");
    links.forEach(link => {
      const href = link.getAttribute("href");
      if (href === hash) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }
};
