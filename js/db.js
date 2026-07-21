// =================================
// GameVerseDB Module
// =================================

import * as sb from "./supabase.js";

/**
 * GameVerseDB - Asynchronous Storage Abstraction Layer
 * Wrapped in Promises to support frictionless future migration to Flask + MySQL.
 */
export const GameVerseDB = {
  // Simulate network delay if desired (set to 0 for instant responses, e.g. 150ms for realistic feel)
  latency: 100,

  /**
   * Helper to wrap results in a simulated async network call
   */
  _asyncResponse(data, shouldReject = false, errorMessage = "Storage Error") {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldReject) {
          reject(new Error(errorMessage));
        } else {
          resolve(data);
        }
      }, this.latency);
    });
  },

  /**
   * Initialize Supabase Client
   */
  async init() {
    await sb.sbInit();
    return this._asyncResponse(true);
  },

  /**
   * Session Management
   */
  async getCurrentUser() {
    const session = sessionStorage.getItem("gv_current_user") || localStorage.getItem("gv_remembered_user");
    if (!session) return this._asyncResponse(null);

    try {
      const parsedSession = JSON.parse(session);
      const freshUser = await sb.sbGetCurrentUser(parsedSession.id);
      return this._asyncResponse(freshUser);
    } catch (e) {
      console.warn("Failed to retrieve current user from Supabase session:", e);
      return this._asyncResponse(null);
    }
  },

  async setCurrentUser(user, remember = false) {
    if (!user) {
      sessionStorage.removeItem("gv_current_user");
      localStorage.removeItem("gv_remembered_user");
      try {
        await sb.supabase.auth.signOut();
      } catch (e) {
        console.warn("Supabase Auth signOut error:", e);
      }
    } else {
      const userStr = JSON.stringify(user);
      sessionStorage.setItem("gv_current_user", userStr);
      if (remember) {
        localStorage.setItem("gv_remembered_user", userStr);
      }
    }
    return this._asyncResponse(true);
  },

  /**
   * Authentication Actions
   */
  async register(username, email, password, avatar = "1") {
    try {
      const user = await sb.sbRegister(username, email, password, avatar);
      return this._asyncResponse(user);
    } catch (err) {
      return this._asyncResponse(null, true, err.message);
    }
  },

  async login(email, password) {
    try {
      const user = await sb.sbLogin(email, password);
      return this._asyncResponse(user);
    } catch (err) {
      return this._asyncResponse(null, true, err.message);
    }
  },

  /**
   * Profile Actions
   */
  async updateProfile(userId, username, email, avatar) {
    try {
      const user = await sb.sbUpdateProfile(userId, username, email, avatar);
      return this._asyncResponse(user);
    } catch (err) {
      return this._asyncResponse(null, true, err.message);
    }
  },

  async changePassword(userId, oldPassword, newPassword) {
    try {
      const success = await sb.sbChangePassword(userId, oldPassword, newPassword);
      return this._asyncResponse(success);
    } catch (err) {
      return this._asyncResponse(null, true, err.message);
    }
  },

  /**
   * Match Log Actions
   */
  async saveMatch(userId, matchData) {
    try {
      const result = await sb.sbSaveMatch(userId, matchData);
      return this._asyncResponse(result);
    } catch (err) {
      return this._asyncResponse(null, true, err.message);
    }
  },

  async getMatchHistory(userId) {
    try {
      const history = await sb.sbGetMatchHistory(userId);
      return this._asyncResponse(history);
    } catch (err) {
      return this._asyncResponse([], true, err.message);
    }
  },

  async getAllMatches() {
    try {
      const matches = await sb.sbGetAllMatches();
      return this._asyncResponse(matches);
    } catch (err) {
      return this._asyncResponse([], true, err.message);
    }
  },

  async resetAllGameStats() {
    localStorage.setItem("gv_matches", JSON.stringify([]));
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    users.forEach(u => {
      u.stats = {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        streak: 0,
        highestStreak: 0,
        points: 0,
        favGame: "None"
      };
      u.achievements = [];
    });
    localStorage.setItem("gv_users", JSON.stringify(users));

    // Update current session user data
    const session = sessionStorage.getItem("gv_current_user") || localStorage.getItem("gv_remembered_user");
    if (session) {
      const parsed = JSON.parse(session);
      const fresh = users.find(u => u.id === parsed.id);
      if (fresh) {
        const freshStr = JSON.stringify(fresh);
        if (sessionStorage.getItem("gv_current_user")) sessionStorage.setItem("gv_current_user", freshStr);
        if (localStorage.getItem("gv_remembered_user")) localStorage.setItem("gv_remembered_user", freshStr);
      }
    }
    return this._asyncResponse(true);
  },

  async unlockAchievement(userId, achievementId) {
    try {
      const user = await sb.sbUnlockAchievement(userId, achievementId);
      return this._asyncResponse(user);
    } catch (err) {
      return this._asyncResponse(false);
    }
  },

  /**
   * Social / Ranks
   */
  async getLeaderboard() {
    try {
      const ranks = await sb.sbGetLeaderboard();
      return this._asyncResponse(ranks);
    } catch (err) {
      return this._asyncResponse([], true, err.message);
    }
  },

  /**
   * Admin Panel Services
   */
  async getAllUsers() {
    try {
      const users = await sb.sbGetAllUsers();
      return this._asyncResponse(users);
    } catch (err) {
      return this._asyncResponse([], true, err.message);
    }
  },

  async setUserStatus(userId, disabled) {
    try {
      const user = await sb.sbSetUserStatus(userId, disabled);
      return this._asyncResponse(user);
    } catch (err) {
      return this._asyncResponse(false, true, err.message);
    }
  },

  async deleteUser(userId) {
    try {
      const success = await sb.sbDeleteUser(userId);
      return this._asyncResponse(success);
    } catch (err) {
      return this._asyncResponse(false, true, err.message);
    }
  },

  async getAdminStats() {
    try {
      const stats = await sb.sbGetAdminStats();
      return this._asyncResponse(stats);
    } catch (err) {
      return this._asyncResponse(null, true, err.message);
    }
  },

  async resetUserStats(userId) {
    try {
      const user = await sb.sbResetUserStats(userId);

      // Update current session user data if active
      const session = sessionStorage.getItem("gv_current_user") || localStorage.getItem("gv_remembered_user");
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.id === userId) {
          const freshStr = JSON.stringify(user);
          if (sessionStorage.getItem("gv_current_user")) sessionStorage.setItem("gv_current_user", freshStr);
          if (localStorage.getItem("gv_remembered_user")) localStorage.setItem("gv_remembered_user", freshStr);
        }
      }

      return this._asyncResponse(true);
    } catch (err) {
      return this._asyncResponse(false);
    }
  },

  async resetUserAchievements(userId) {
    try {
      const user = await sb.sbResetUserAchievements(userId);

      // Update current session user data if active
      const session = sessionStorage.getItem("gv_current_user") || localStorage.getItem("gv_remembered_user");
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.id === userId) {
          const freshStr = JSON.stringify(user);
          if (sessionStorage.getItem("gv_current_user")) sessionStorage.setItem("gv_current_user", freshStr);
          if (localStorage.getItem("gv_remembered_user")) localStorage.setItem("gv_remembered_user", freshStr);
        }
      }

      return this._asyncResponse(true);
    } catch (err) {
      return this._asyncResponse(false);
    }
  },

  async getAdminMeta() {
    try {
      return await sb.sbGetAdminMeta();
    } catch (err) {
      return { lastLogin: null, deletedAccounts: 0, demoDataSeeded: 0, databaseResets: 0 };
    }
  },

  async seedDemoData() {
    try {
      const success = await sb.sbSeedDemoData();
      return this._asyncResponse(success);
    } catch (err) {
      return this._asyncResponse(false, true, err.message);
    }
  },

  async clearData() {
    try {
      const success = await sb.sbClearData();
      return this._asyncResponse(success);
    } catch (err) {
      return this._asyncResponse(false, true, err.message);
    }
  }
};
