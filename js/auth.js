// =================================
// Authentication Manager Module
// =================================

import { GameVerseDB } from "./db.js";
import { ToastManager } from "./toast.js";

export const AuthManager = {
  currentUser: null,

  async init() {
    this.currentUser = await GameVerseDB.getCurrentUser();
    this.updateAuthUI();
    this.bindEvents();
  },

  async login(username, password, remember = false) {
    try {
      const user = await GameVerseDB.login(username, password);
      this.currentUser = user;
      await GameVerseDB.setCurrentUser(user, remember);
      this.updateAuthUI();
      this.hideModals();
      ToastManager.show(`Welcome back, ${user.username}!`, "success");
      
      // Route to dashboard or update current path
      if (window.location.hash === "#/home" || window.location.hash === "" || window.location.hash === "#/" || window.location.hash === "#/dashboard") {
        window.location.hash = user.isAdmin ? "#/admin" : "#/dashboard";
      } else {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
      return user;
    } catch (err) {
      ToastManager.show(err.message, "error");
      throw err;
    }
  },

  async register(username, email, password, avatar) {
    try {
      const user = await GameVerseDB.register(username, email, password, avatar);
      this.currentUser = user;
      await GameVerseDB.setCurrentUser(user, false);
      this.updateAuthUI();
      this.hideModals();
      ToastManager.show(`Account created! Welcome, ${user.username}!`, "success");
      
      window.location.hash = user.isAdmin ? "#/admin" : "#/dashboard";
      return user;
    } catch (err) {
      ToastManager.show(err.message, "error");
      throw err;
    }
  },

  async logout() {
    await GameVerseDB.setCurrentUser(null);
    this.currentUser = null;
    this.updateAuthUI();
    ToastManager.show("Logged out successfully.", "info");
    window.location.hash = "#/home";
  },

  updateAuthUI() {
    const user = this.currentUser;
    
    const guestNodes = document.querySelectorAll(".guest-only");
    const authNodes = document.querySelectorAll(".auth-only");
    const adminNodes = document.querySelectorAll(".admin-only");
    const playerNodes = document.querySelectorAll(".player-only");

    if (user) {
      guestNodes.forEach(n => n.classList.add("hide"));
      authNodes.forEach(n => n.classList.remove("hide"));
      if (user.isAdmin) {
        adminNodes.forEach(n => n.classList.remove("hide"));
        playerNodes.forEach(n => n.classList.add("hide"));
      } else {
        adminNodes.forEach(n => n.classList.add("hide"));
        playerNodes.forEach(n => n.classList.remove("hide"));
      }

      // Update Nav User info
      const navAvatar = document.getElementById("nav-user-avatar");
      const navName = document.getElementById("nav-user-name");
      if (navAvatar) {
        navAvatar.src = user.avatar ? `./assets/avatars/avatar${user.avatar}.svg` : "./assets/default-avatar.svg";
        navAvatar.onerror = () => { navAvatar.src = "./assets/default-avatar.svg"; };
      }
      if (navName) {
        navName.textContent = user.username;
      }
    } else {
      guestNodes.forEach(n => n.classList.remove("hide"));
      authNodes.forEach(n => n.classList.add("hide"));
      adminNodes.forEach(n => n.classList.add("hide"));
      playerNodes.forEach(n => n.classList.add("hide"));
    }
  },

  showLoginModal() {
    const loginModal = document.getElementById("login-modal");
    if (loginModal) {
      loginModal.classList.remove("hide");
    }
  },

  showRegisterModal() {
    const regModal = document.getElementById("register-modal");
    if (regModal) {
      regModal.classList.remove("hide");
    }
  },

  hideModals() {
    const loginModal = document.getElementById("login-modal");
    const regModal = document.getElementById("register-modal");
    if (loginModal) loginModal.classList.add("hide");
    if (regModal) regModal.classList.add("hide");
  },

  bindEvents() {
    // Event delegation
    document.addEventListener("click", (e) => {
      // Mobile Nav Toggle
      if (e.target.closest("#nav-toggle")) {
        const navMenu = document.getElementById("nav-menu");
        if (navMenu) navMenu.classList.toggle("active");
      }

      // User dropdown toggle
      if (e.target.closest("#user-dropdown-toggle")) {
        e.preventDefault();
        const dropdown = document.querySelector(".dropdown");
        if (dropdown) dropdown.classList.toggle("active");
      } else {
        const dropdown = document.querySelector(".dropdown");
        if (dropdown && !e.target.closest(".dropdown")) {
          dropdown.classList.remove("active");
        }
      }

      // Close mobile menu on click nav link
      if (e.target.classList.contains("nav-link")) {
        const navMenu = document.getElementById("nav-menu");
        if (navMenu) navMenu.classList.remove("active");
      }

      // Modals
      if (e.target.closest("#nav-login-btn") || e.target.classList.contains("trigger-login")) {
        e.preventDefault();
        this.showLoginModal();
      }
      if (e.target.closest("#hero-register-btn") || e.target.classList.contains("trigger-register") || e.target.id === "go-to-register") {
        e.preventDefault();
        this.hideModals();
        this.showRegisterModal();
      }
      if (e.target.id === "go-to-login") {
        e.preventDefault();
        this.hideModals();
        this.showLoginModal();
      }

      if (e.target.id === "login-close-btn" || e.target === document.getElementById("login-modal")) {
        this.hideModals();
      }
      if (e.target.id === "register-close-btn" || e.target === document.getElementById("register-modal")) {
        this.hideModals();
      }

      // Avatar selection in registration picker
      const avatarOpt = e.target.closest("#register-avatar-picker .avatar-option");
      if (avatarOpt) {
        const picker = document.getElementById("register-avatar-picker");
        picker.querySelectorAll(".avatar-option").forEach(opt => opt.classList.remove("selected"));
        avatarOpt.classList.add("selected");
      }

      // Logout
      if (e.target.id === "nav-logout-btn") {
        e.preventDefault();
        this.logout();
      }
    });

    // Form Submissions
    document.addEventListener("submit", (e) => {
      if (e.target.id === "login-form") {
        e.preventDefault();
        const usernameInput = document.getElementById("login-username");
        const passwordInput = document.getElementById("login-password");
        if (usernameInput && passwordInput) {
          this.login(usernameInput.value.trim(), passwordInput.value, true);
        }
      }

      if (e.target.id === "register-form") {
        e.preventDefault();
        const usernameInput = document.getElementById("register-username");
        const emailInput = document.getElementById("register-email");
        const passwordInput = document.getElementById("register-password");
        const confirmInput = document.getElementById("register-confirm");
        const selectedAvatar = document.querySelector("#register-avatar-picker .avatar-option.selected");

        if (passwordInput.value !== confirmInput.value) {
          ToastManager.show("Passwords do not match.", "error");
          return;
        }

        const avatarId = selectedAvatar ? selectedAvatar.dataset.avatar : "1";
        this.register(usernameInput.value.trim(), emailInput.value.trim(), passwordInput.value, avatarId);
      }
    });
  }
};
