// =================================
// GameVerseDB Module
// =================================

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
   * Initialize LocalStorage Tables
   */
  async init() {
    if (!localStorage.getItem("gv_users")) {
      localStorage.setItem("gv_users", JSON.stringify([]));
    }
    if (!localStorage.getItem("gv_matches")) {
      localStorage.setItem("gv_matches", JSON.stringify([]));
    }

    // Automatically create a default administrator account only if one does not already exist
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const adminExists = users.some(u => u.isAdmin || u.username.toLowerCase() === "admin");
    if (!adminExists) {
      const defaultAdmin = {
        id: "usr_admin_default",
        username: "admin",
        email: "admin@gameverse.local",
        password: "admin",
        avatar: "1",
        isAdmin: true,
        isDisabled: false,
        joinedDate: new Date().toISOString(),
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          streak: 0,
          highestStreak: 0,
          points: 0,
          favGame: "None"
        },
        achievements: []
      };
      users.push(defaultAdmin);
      localStorage.setItem("gv_users", JSON.stringify(users));
    }

    return this._asyncResponse(true);
  },

  /**
   * Session Management
   */
  async getCurrentUser() {
    const session = sessionStorage.getItem("gv_current_user") || localStorage.getItem("gv_remembered_user");
    if (!session) return this._asyncResponse(null);
    
    // Refresh user data from localStorage DB
    const parsedSession = JSON.parse(session);
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const freshUser = users.find(u => u.id === parsedSession.id);
    
    if (freshUser) {
      return this._asyncResponse(freshUser);
    }
    return this._asyncResponse(null);
  },

  async setCurrentUser(user, remember = false) {
    if (!user) {
      sessionStorage.removeItem("gv_current_user");
      localStorage.removeItem("gv_remembered_user");
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
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    
    // Validations
    const usernameExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (usernameExists) {
      return this._asyncResponse(null, true, "Username already exists.");
    }
    if (emailExists) {
      return this._asyncResponse(null, true, "Email is already registered.");
    }

    const newUser = {
      id: "usr_" + Date.now() + Math.random().toString(36).substr(2, 5),
      username,
      email,
      password, // Plain text for local simulation, will be hashed in Flask
      avatar,
      isAdmin: username.toLowerCase() === "admin", // Admin auto-grant for user 'admin'
      isDisabled: false,
      joinedDate: new Date().toISOString(),
      stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        streak: 0,
        highestStreak: 0,
        points: 0,
        favGame: "None"
      },
      achievements: []
    };

    users.push(newUser);
    localStorage.setItem("gv_users", JSON.stringify(users));
    return this._asyncResponse(newUser);
  },

  async login(username, password) {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || user.password !== password) {
      return this._asyncResponse(null, true, "Invalid username or password.");
    }
    if (user.isDisabled) {
      return this._asyncResponse(null, true, "This account has been disabled by an administrator.");
    }

    if (user.isAdmin) {
      let adminMeta = JSON.parse(localStorage.getItem("gv_admin_meta") || "{}");
      adminMeta.lastLogin = new Date().toISOString();
      localStorage.setItem("gv_admin_meta", JSON.stringify(adminMeta));
    }

    return this._asyncResponse(user);
  },

  /**
   * Profile Actions
   */
  async updateProfile(userId, username, email, avatar) {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return this._asyncResponse(null, true, "User not found.");
    }

    // Check unique constraints if username/email changed
    const usernameExists = users.some((u, idx) => idx !== userIndex && u.username.toLowerCase() === username.toLowerCase());
    const emailExists = users.some((u, idx) => idx !== userIndex && u.email.toLowerCase() === email.toLowerCase());

    if (usernameExists) {
      return this._asyncResponse(null, true, "Username already in use.");
    }
    if (emailExists) {
      return this._asyncResponse(null, true, "Email already in use.");
    }

    users[userIndex].username = username;
    users[userIndex].email = email;
    users[userIndex].avatar = avatar;

    localStorage.setItem("gv_users", JSON.stringify(users));
    return this._asyncResponse(users[userIndex]);
  },

  async changePassword(userId, oldPassword, newPassword) {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return this._asyncResponse(null, true, "User not found.");
    }

    if (users[userIndex].password !== oldPassword) {
      return this._asyncResponse(null, true, "Current password is incorrect.");
    }

    users[userIndex].password = newPassword;
    localStorage.setItem("gv_users", JSON.stringify(users));
    return this._asyncResponse(true);
  },

  /**
   * Match Log Actions
   */
  async saveMatch(userId, matchData) {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const matches = JSON.parse(localStorage.getItem("gv_matches") || "[]");
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return this._asyncResponse(null, true, "User not found.");

    const user = users[userIndex];
    if (user.isAdmin) {
      // Admin gameplay is for testing only. Store separately in gv_admin_matches.
      const adminMatches = JSON.parse(localStorage.getItem("gv_admin_matches") || "[]");
      const newMatch = {
        id: "mat_admin_" + Date.now() + Math.random().toString(36).substr(2, 5),
        userId,
        game: matchData.game,
        result: matchData.result,
        difficulty: matchData.difficulty,
        details: matchData.details + " (Admin Test Match)",
        timestamp: new Date().toISOString(),
        isAdminMatch: true
      };
      adminMatches.push(newMatch);
      localStorage.setItem("gv_admin_matches", JSON.stringify(adminMatches));
      return this._asyncResponse({ match: newMatch, user });
    }

    const newMatch = {
      id: "mat_" + Date.now() + Math.random().toString(36).substr(2, 5),
      userId,
      game: matchData.game,           // "Tic Tac Toe" or "Rock Paper Scissors"
      result: matchData.result,       // "Win", "Loss", "Draw"
      difficulty: matchData.difficulty, // "Easy", "Medium", "Hard", "PvP"
      details: matchData.details,     // e.g. "Won series 2 - 1 vs smart computer"
      timestamp: new Date().toISOString()
    };

    matches.push(newMatch);
    localStorage.setItem("gv_matches", JSON.stringify(matches));

    // Update User Statistics
    user.stats.gamesPlayed++;

    if (newMatch.result === "Win") {
      user.stats.wins++;
      user.stats.streak++;
      user.stats.points += 10;
      if (user.stats.streak > user.stats.highestStreak) {
        user.stats.highestStreak = user.stats.streak;
      }
    } else if (newMatch.result === "Loss") {
      user.stats.losses++;
      user.stats.streak = 0; // reset streak
    } else {
      user.stats.draws++;
      user.stats.points += 5;
      user.stats.streak = 0; // reset streak
    }

    // Recalculate Favorite Game
    const userMatches = matches.filter(m => m.userId === userId);
    const counts = userMatches.reduce((acc, curr) => {
      acc[curr.game] = (acc[curr.game] || 0) + 1;
      return acc;
    }, {});
    
    let fav = "None";
    let max = 0;
    for (const key in counts) {
      if (counts[key] > max) {
        max = counts[key];
        fav = key;
      }
    }
    user.stats.favGame = fav;

    localStorage.setItem("gv_users", JSON.stringify(users));
    return this._asyncResponse({ match: newMatch, user });
  },

  async getMatchHistory(userId) {
    const matches = JSON.parse(localStorage.getItem("gv_matches") || "[]");
    const userMatches = matches.filter(m => m.userId === userId);
    return this._asyncResponse(userMatches);
  },

  async getAllMatches() {
    const matches = JSON.parse(localStorage.getItem("gv_matches") || "[]");
    return this._asyncResponse(matches);
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
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return this._asyncResponse(false);

    const user = users[userIndex];
    if (user.isAdmin) {
      return this._asyncResponse(false);
    }

    if (user.achievements.some(a => a.id === achievementId)) {
      return this._asyncResponse(false); // already unlocked
    }

    user.achievements.push({
      id: achievementId,
      unlockedAt: new Date().toISOString()
    });

    localStorage.setItem("gv_users", JSON.stringify(users));
    return this._asyncResponse(user);
  },

  /**
   * Social / Ranks
   */
  async getLeaderboard() {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    // Filter out disabled users and admins for leaderboard display
    const rankedPlayers = users
      .filter(u => !u.isDisabled && !u.isAdmin)
      .map(u => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        gamesPlayed: u.stats.gamesPlayed,
        wins: u.stats.wins,
        points: u.stats.points,
        winPercentage: u.stats.gamesPlayed > 0 ? Math.round((u.stats.wins / u.stats.gamesPlayed) * 100) : 0
      }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins);

    return this._asyncResponse(rankedPlayers);
  },

  /**
   * Admin Panel Services
   */
  async getAllUsers() {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    return this._asyncResponse(users);
  },

  async setUserStatus(userId, disabled) {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return this._asyncResponse(false, true, "User not found.");

    users[userIndex].isDisabled = disabled;
    localStorage.setItem("gv_users", JSON.stringify(users));
    return this._asyncResponse(users[userIndex]);
  },

  async deleteUser(userId) {
    let users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    let matches = JSON.parse(localStorage.getItem("gv_matches") || "[]");

    users = users.filter(u => u.id !== userId);
    matches = matches.filter(m => m.userId !== userId);

    localStorage.setItem("gv_users", JSON.stringify(users));
    localStorage.setItem("gv_matches", JSON.stringify(matches));

    let adminMeta = JSON.parse(localStorage.getItem("gv_admin_meta") || "{}");
    adminMeta.deletedAccounts = (adminMeta.deletedAccounts || 0) + 1;
    localStorage.setItem("gv_admin_meta", JSON.stringify(adminMeta));

    return this._asyncResponse(true);
  },

  async getAdminStats() {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const matches = JSON.parse(localStorage.getItem("gv_matches") || "[]");

    const totalUsers = users.filter(u => !u.isAdmin).length;
    const totalMatches = matches.length;

    // Top player (highest points)
    const activePlayers = users.filter(u => !u.isAdmin && !u.isDisabled);
    let topPlayer = "None";
    let maxPoints = -1;
    activePlayers.forEach(p => {
      if (p.stats.points > maxPoints) {
        maxPoints = p.stats.points;
        topPlayer = p.username;
      }
    });

    // Most played game
    const counts = matches.reduce((acc, curr) => {
      acc[curr.game] = (acc[curr.game] || 0) + 1;
      return acc;
    }, {});
    let favGame = "None";
    let maxCount = 0;
    for (const key in counts) {
      if (counts[key] > maxCount) {
        maxCount = counts[key];
        favGame = key;
      }
    }

    return this._asyncResponse({
      totalUsers,
      totalMatches,
      topPlayer,
      favGame
    });
  },

  async resetUserStats(userId) {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return this._asyncResponse(false);

    users[userIndex].stats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      highestStreak: 0,
      points: 0,
      favGame: "None"
    };
    
    // Also clear matches for this user
    let matches = JSON.parse(localStorage.getItem("gv_matches") || "[]");
    matches = matches.filter(m => m.userId !== userId);

    localStorage.setItem("gv_users", JSON.stringify(users));
    localStorage.setItem("gv_matches", JSON.stringify(matches));
    
    // Update current session user data
    const session = sessionStorage.getItem("gv_current_user") || localStorage.getItem("gv_remembered_user");
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.id === userId) {
        const fresh = users[userIndex];
        const freshStr = JSON.stringify(fresh);
        if (sessionStorage.getItem("gv_current_user")) sessionStorage.setItem("gv_current_user", freshStr);
        if (localStorage.getItem("gv_remembered_user")) localStorage.setItem("gv_remembered_user", freshStr);
      }
    }

    return this._asyncResponse(true);
  },

  async resetUserAchievements(userId) {
    const users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return this._asyncResponse(false);

    users[userIndex].achievements = [];
    localStorage.setItem("gv_users", JSON.stringify(users));

    // Update current session user data
    const session = sessionStorage.getItem("gv_current_user") || localStorage.getItem("gv_remembered_user");
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.id === userId) {
        const fresh = users[userIndex];
        const freshStr = JSON.stringify(fresh);
        if (sessionStorage.getItem("gv_current_user")) sessionStorage.setItem("gv_current_user", freshStr);
        if (localStorage.getItem("gv_remembered_user")) localStorage.setItem("gv_remembered_user", freshStr);
      }
    }

    return this._asyncResponse(true);
  },

  /**
   * Testing Sandbox Seeder
   */
  async seedDemoData() {
    // Clean old seeded data, but keep admin
    let users = JSON.parse(localStorage.getItem("gv_users") || "[]");
    const admin = users.find(u => u.isAdmin);
    users = admin ? [admin] : [];

    let adminMeta = JSON.parse(localStorage.getItem("gv_admin_meta") || "{}");
    adminMeta.demoDataSeeded = (adminMeta.demoDataSeeded || 0) + 1;
    localStorage.setItem("gv_admin_meta", JSON.stringify(adminMeta));
    
    const demoUsers = [
      { id: "demo_1", username: "ShadowBlade", email: "shadow@gameverse.com", password: "user123", avatar: "1", isAdmin: false, isDisabled: false, joinedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      { id: "demo_2", username: "PixelKing", email: "pixel@gameverse.com", password: "user123", avatar: "3", isAdmin: false, isDisabled: false, joinedDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
      { id: "demo_3", username: "RetroGamer", email: "retro@gameverse.com", password: "user123", avatar: "2", isAdmin: false, isDisabled: false, joinedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
      { id: "demo_4", username: "ApexHunter", email: "hunter@gameverse.com", password: "user123", avatar: "4", isAdmin: false, isDisabled: false, joinedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { id: "demo_5", username: "ViperQc", email: "viper@gameverse.com", password: "user123", avatar: "6", isAdmin: false, isDisabled: false, joinedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    const seededMatches = [];

    // Create realistic statistics and matches for each user
    demoUsers.forEach((usr, idx) => {
      usr.stats = {
        gamesPlayed: 10 + idx * 5, // 10, 15, 20, 25, 30 matches
        wins: 6 + idx * 3,          // 6, 9, 12, 15, 18 wins
        losses: 2 + idx,           // 2, 3, 4, 5, 6 losses
        draws: 2 + idx,            // 2, 3, 4, 5, 6 draws (or modified draws to match sum)
        streak: idx + 1,
        highestStreak: idx + 3,
        favGame: idx % 2 === 0 ? "Tic Tac Toe" : "Rock Paper Scissors",
        points: (6 + idx * 3) * 10 + (2 + idx) * 5 // Win = 10, Draw = 5, Loss = 0
      };
      
      usr.achievements = [
        { id: "first-win", unlockedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString() }
      ];
      if (usr.stats.wins >= 10) {
        usr.achievements.push({ id: "wins-10", unlockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() });
      }
      if (idx === 4) {
        usr.achievements.push({ id: "streak-5", unlockedAt: new Date().toISOString() });
        usr.achievements.push({ id: "defeat-hard-ai", unlockedAt: new Date().toISOString() });
      }

      // Generate actual history array elements for each user
      for (let i = 0; i < usr.stats.gamesPlayed; i++) {
        let res = "Win";
        if (i < usr.stats.losses) res = "Loss";
        else if (i < usr.stats.losses + usr.stats.draws) res = "Draw";

        seededMatches.push({
          id: `demo_m_${idx}_${i}`,
          userId: usr.id,
          game: i % 2 === 0 ? "Tic Tac Toe" : "Rock Paper Scissors",
          result: res,
          difficulty: i % 3 === 0 ? "Hard" : (i % 3 === 1 ? "Medium" : "Easy"),
          details: res === "Win" ? "Victorious match against bot AI" : (res === "Loss" ? "Defeated by bot" : "Stalemate split decision"),
          timestamp: new Date(Date.now() - (i + 1) * 12 * 60 * 60 * 1000).toISOString() // scattered times
        });
      }

      users.push(usr);
    });

    localStorage.setItem("gv_users", JSON.stringify(users));
    localStorage.setItem("gv_matches", JSON.stringify(seededMatches));
    return this._asyncResponse(true);
  },

  async clearData() {
    let adminMeta = JSON.parse(localStorage.getItem("gv_admin_meta") || "{}");
    adminMeta.databaseResets = (adminMeta.databaseResets || 0) + 1;
    localStorage.setItem("gv_admin_meta", JSON.stringify(adminMeta));

    localStorage.removeItem("gv_users");
    localStorage.removeItem("gv_matches");
    sessionStorage.removeItem("gv_current_user");
    localStorage.removeItem("gv_remembered_user");
    await this.init();
    return this._asyncResponse(true);
  }
};
