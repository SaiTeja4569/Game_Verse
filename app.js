// =================================
// GameVerse SPA Root Bootstrapper
// =================================

import { GameVerseDB } from "./js/db.js";
import { ThemeManager } from "./js/theme.js";
import { AuthManager } from "./js/auth.js";
import { Router } from "./js/router.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Initialize storage tables in LocalStorage
    await GameVerseDB.init();

    // 2. Initialize application configurations
    ThemeManager.init();
    await AuthManager.init();

    // 3. Fetch templates and handle active routing
    await Router.init();

    console.log("GameVerse Single Page Application initialized successfully.");
  } catch (err) {
    console.error("Critical failure during GameVerse startup:", err);
  }
});
