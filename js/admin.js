// =================================
// Admin View Controller Module
// =================================

import { GameVerseDB } from "./db.js";
import { ACHIEVEMENTS } from "./config.js";
import { ToastManager } from "./toast.js";

export const AdminController = {
  initialized: false,
  users: [],
  matches: [],

  async update() {
    await this.refreshAdminView();

    if (!this.initialized) {
      this.bindEvents();
      this.initialized = true;
    }
  },

  async refreshAdminView() {
    try {
      this.users = await GameVerseDB.getAllUsers();
      this.matches = await GameVerseDB.getAllMatches();

      // 1. Render Overview
      this.renderOverview(this.users, this.matches);

      // 2. Render User Registry
      this.renderUsersTable();

      // 3. Render Match History Tab
      this.renderMatchesTable();

      // 4. Render Leaderboard Tab
      this.renderLeaderboardTable();

      // 5. Render Game Analytics Tab
      this.renderGameAnalyticsTable();

      // 6. Render Achievements Tab
      this.renderAchievementsTable();

      // 7. Render System Settings
      this.renderSystemSettings();
    } catch (e) {
      console.error("Admin view refresh failed:", e);
    }
  },

  renderOverview(allUsers, allMatches) {
    // 1. Total Players (excluding Admins)
    const statUsers = document.getElementById("admin-stat-users");
    if (statUsers) statUsers.textContent = allUsers.filter(u => !u.isAdmin).length;

    // 2. Active Users (excluding Admins)
    const activeCount = allUsers.filter(u => !u.isAdmin && u.stats?.gamesPlayed > 0).length;
    const statActive = document.getElementById("admin-stat-active-users");
    if (statActive) statActive.textContent = activeCount;

    // 3. Disabled Users (excluding Admins)
    const disabledCount = allUsers.filter(u => !u.isAdmin && u.isDisabled).length;
    const statDisabled = document.getElementById("admin-stat-disabled-users");
    if (statDisabled) statDisabled.textContent = disabledCount;

    // 4. Administrators
    const adminsCount = allUsers.filter(u => u.isAdmin).length;
    const statAdmins = document.getElementById("admin-stat-admins");
    if (statAdmins) statAdmins.textContent = adminsCount;

    // 5. Matches Played
    const statMatches = document.getElementById("admin-stat-matches");
    if (statMatches) statMatches.textContent = allMatches.length;

    // 6. Games Available
    const statGamesCount = document.getElementById("admin-stat-games-count");
    if (statGamesCount) statGamesCount.textContent = 2;

    // 7. Most Played Game
    const gameCounts = allMatches.reduce((acc, curr) => {
      acc[curr.game] = (acc[curr.game] || 0) + 1;
      return acc;
    }, {});
    let favGame = "None";
    let maxGameCount = 0;
    for (const key in gameCounts) {
      if (gameCounts[key] > maxGameCount) {
        maxGameCount = gameCounts[key];
        favGame = key;
      }
    }
    const statTopGame = document.getElementById("admin-stat-top-game");
    if (statTopGame) statTopGame.textContent = favGame;

    // 8. Top Player
    const activePlayers = allUsers.filter(u => !u.isAdmin && !u.isDisabled);
    let topPlayer = "None";
    let maxPoints = -1;
    activePlayers.forEach(p => {
      const points = p.stats?.points || 0;
      if (points > maxPoints) {
        maxPoints = points;
        topPlayer = p.username;
      }
    });
    const statTopPlayer = document.getElementById("admin-stat-top-player");
    if (statTopPlayer) statTopPlayer.textContent = topPlayer;

    // 9. System Administrators Table rendering
    const adminListContainer = document.getElementById("admin-overview-admins-list");
    if (adminListContainer) {
      const adminMeta = JSON.parse(localStorage.getItem("gv_admin_meta") || "{}");
      const admins = allUsers.filter(u => u.isAdmin);
      adminListContainer.innerHTML = admins.map(adm => {
        const dateStr = adm.joinedDate 
          ? new Date(adm.joinedDate).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
          : "N/A";
        const lastLoginDate = adminMeta.lastLogin 
          ? new Date(adminMeta.lastLogin).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
          : "N/A";
        return `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <img src="./assets/avatars/avatar${adm.avatar || 1}.svg" style="width:24px; height:24px; border-radius:50%;" onerror="this.src='./assets/default-avatar.svg'">
                <span class="font-bold text-gradient" style="color: gold; text-shadow: 0 0 2px rgba(255, 215, 0, 0.2);">${adm.username}</span>
              </div>
            </td>
            <td>${adm.email}</td>
            <td><span class="badge" style="background: rgba(255, 215, 0, 0.15); color: gold; border: 1px solid rgba(255, 215, 0, 0.3); font-weight: bold;">Admin</span></td>
            <td class="text-center"><span class="badge badge-success">Full</span></td>
            <td class="text-center"><span class="badge badge-info">Active</span></td>
            <td class="text-center">${dateStr}</td>
            <td class="text-right text-muted" style="font-size: 0.8rem;">${lastLoginDate}</td>
          </tr>
        `;
      }).join("");
    }

    // 10. New Users List (Recent 5 players)
    const newUsersContainer = document.getElementById("admin-overview-new-users");
    if (newUsersContainer) {
      const sortedUsers = allUsers.filter(u => !u.isAdmin)
        .sort((a, b) => new Date(b.joinedDate) - new Date(a.joinedDate))
        .slice(0, 5);
      
      if (sortedUsers.length === 0) {
        newUsersContainer.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No users registered yet.</td></tr>`;
      } else {
        newUsersContainer.innerHTML = sortedUsers.map(u => {
          const dateStr = new Date(u.joinedDate).toLocaleDateString([], { month: "short", day: "numeric" });
          const roleBadge = `<span class="badge badge-primary">Player</span>`;
          return `
            <tr>
              <td>
                <div style="display:flex; align-items:center; gap:8px;">
                  <img src="./assets/avatars/avatar${u.avatar || 1}.svg" class="nav-avatar" style="width:22px; height:22px;" onerror="this.src='./assets/default-avatar.svg'">
                  <strong>${u.username}</strong>
                </div>
              </td>
              <td>${u.email}</td>
              <td class="text-right text-muted">${dateStr} ${roleBadge}</td>
            </tr>
          `;
        }).join("");
      }
    }

    // 11. Recent Matches List (Recent 5)
    const recentMatchesContainer = document.getElementById("admin-overview-recent-matches");
    if (recentMatchesContainer) {
      const sortedMatches = [...allMatches]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
      
      const userMap = new Map(allUsers.map(u => [u.id, u.username]));

      if (sortedMatches.length === 0) {
        recentMatchesContainer.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No matches recorded yet.</td></tr>`;
      } else {
        recentMatchesContainer.innerHTML = sortedMatches.map(m => {
          const playerName = userMap.get(m.userId) || "Unknown Player";
          const dateStr = new Date(m.timestamp).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          let resultClass = "text-muted";
          if (m.result === "Win") resultClass = "text-success";
          else if (m.result === "Loss") resultClass = "text-danger";

          return `
            <tr>
              <td><strong>${playerName}</strong></td>
              <td>${m.game}</td>
              <td class="${resultClass} font-bold">${m.result}</td>
              <td class="text-right text-muted" style="font-size:0.75rem;">${dateStr}</td>
            </tr>
          `;
        }).join("");
      }
    }
  },

  renderUsersTable() {
    const rowsContainer = document.getElementById("admin-users-rows");
    if (!rowsContainer) return;

    const searchQuery = (document.getElementById("admin-search-users")?.value || "").toLowerCase().trim();
    const statusFilter = document.getElementById("admin-filter-users-status")?.value || "all";

    const filteredUsers = this.users.filter(u => !u.isAdmin).filter(u => {
      const nameMatch = u.username.toLowerCase().includes(searchQuery);
      const emailMatch = u.email.toLowerCase().includes(searchQuery);
      const queryMatch = nameMatch || emailMatch;

      if (!queryMatch) return false;

      if (statusFilter === "active") {
        return !u.isDisabled;
      } else if (statusFilter === "disabled") {
        return u.isDisabled;
      }
      return true; // "all"
    });

    if (filteredUsers.length === 0) {
      rowsContainer.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">No users found matching query.</td>
        </tr>
      `;
    } else {
      rowsContainer.innerHTML = filteredUsers.map(u => {
        const joinedDate = new Date(u.joinedDate).toLocaleDateString([], {
          year: "numeric",
          month: "short",
          day: "numeric"
        });

        let statusLabel = "";
        if (u.isAdmin) {
          statusLabel = `<span class="badge badge-accent">Admin</span>`;
        } else {
          statusLabel = u.isDisabled 
            ? `<span class="badge badge-danger">Disabled</span>`
            : `<span class="badge badge-success">Active</span>`;
        }

        const statusActionText = u.isDisabled ? "Enable" : "Disable";
        const statusBtnClass = u.isDisabled ? "btn-outline" : "btn-warning";

        const viewBtn = `<button class="btn btn-outline btn-xs btn-view-details" data-id="${u.id}"><i class="fas fa-eye"></i> View</button>`;
        
        // Admins cannot be deleted/disabled
        const statusBtn = u.isAdmin
          ? `<button class="btn btn-outline btn-xs" disabled style="opacity: 0.5; cursor: not-allowed;">Disable</button>`
          : `<button class="btn ${statusBtnClass} btn-xs btn-toggle-status" data-id="${u.id}" data-disabled="${u.isDisabled}">${statusActionText}</button>`;
          
        const deleteBtn = u.isAdmin
          ? `<button class="btn btn-danger btn-xs" disabled style="opacity: 0.5; cursor: not-allowed;"><i class="fas fa-trash-alt"></i> Delete</button>`
          : `<button class="btn btn-danger btn-xs btn-delete-user" data-id="${u.id}"><i class="fas fa-trash-alt"></i> Delete</button>`;

        return `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <img src="./assets/avatars/avatar${u.avatar || 1}.svg" class="nav-avatar" style="width:26px; height:26px;" onerror="this.src='./assets/default-avatar.svg'">
                <strong>${u.username}</strong>
              </div>
            </td>
            <td>${u.email}</td>
            <td class="text-center">${joinedDate}</td>
            <td class="text-center">${u.stats?.gamesPlayed || 0}</td>
            <td class="text-center text-success">${u.stats?.wins || 0}</td>
            <td class="text-center">${statusLabel}</td>
            <td class="text-right">
              <div style="display:flex; gap:5px; justify-content:flex-end;">
                ${viewBtn}
                ${statusBtn}
                ${deleteBtn}
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
  },

  async renderMatchesTable() {
    const rowsContainer = document.getElementById("admin-matches-rows");
    if (!rowsContainer) return;

    try {
      const userMap = new Map(this.users.map(u => [u.id, u.username]));

      // Read filter elements
      const filterUser = (document.getElementById("admin-match-filter-user")?.value || "").toLowerCase().trim();
      const filterGame = document.getElementById("admin-match-filter-game")?.value || "all";
      const filterDiff = document.getElementById("admin-match-filter-diff")?.value || "all";
      const filterResult = document.getElementById("admin-match-filter-result")?.value || "all";
      const sortOrder = document.getElementById("admin-match-sort")?.value || "desc";

      let filteredMatches = this.matches.filter(m => {
        const playerName = (userMap.get(m.userId) || "").toLowerCase();
        if (filterUser && !playerName.includes(filterUser)) return false;
        if (filterGame !== "all" && m.game !== filterGame) return false;
        if (filterDiff !== "all" && m.difficulty !== filterDiff) return false;
        if (filterResult !== "all" && m.result !== filterResult) return false;
        return true;
      });

      // Sort
      filteredMatches.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });

      if (filteredMatches.length === 0) {
        rowsContainer.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted">No matches found matching criteria.</td>
          </tr>
        `;
      } else {
        rowsContainer.innerHTML = filteredMatches.map(m => {
          const playerName = userMap.get(m.userId) || "Unknown Player";
          const dateStr = new Date(m.timestamp).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });

          let icon = "fa-gamepad";
          let colorClass = "";
          if (m.game === "Tic Tac Toe") {
            icon = "fa-hashtag";
            colorClass = "text-primary";
          } else if (m.game === "Rock Paper Scissors") {
            icon = "fa-hand-rock";
            colorClass = "text-accent";
          }

          let resultClass = "text-muted";
          if (m.result === "Win") resultClass = "text-success";
          else if (m.result === "Loss") resultClass = "text-danger";

          let diffClass = "badge-secondary";
          if (m.difficulty === "Easy") diffClass = "badge-info";
          else if (m.difficulty === "Medium") diffClass = "badge-primary";
          else if (m.difficulty === "Hard") diffClass = "badge-accent";

          return `
            <tr>
              <td><strong>${playerName}</strong></td>
              <td><i class="fas ${icon} ${colorClass}" style="margin-right: 8px;"></i>${m.game}</td>
              <td class="${resultClass} font-bold">${m.result}</td>
              <td><span class="badge ${diffClass}">${m.difficulty || "Easy"}</span></td>
              <td>${dateStr}</td>
            </tr>
          `;
        }).join("");
      }
    } catch (e) {
      console.error("Failed to render admin matches table:", e);
    }
  },

  async renderLeaderboardTable() {
    const rowsContainer = document.getElementById("admin-leaderboard-rows");
    if (!rowsContainer) return;

    try {
      const rankedPlayers = await GameVerseDB.getLeaderboard();

      if (rankedPlayers.length === 0) {
        rowsContainer.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted">No players ranked yet.</td>
          </tr>
        `;
      } else {
        rowsContainer.innerHTML = rankedPlayers.map((p, idx) => {
          return `
            <tr>
              <td class="font-bold text-gradient">#${idx + 1}</td>
              <td>
                <div style="display:flex; align-items:center; gap:8px;">
                  <img src="./assets/avatars/avatar${p.avatar || 1}.svg" class="nav-avatar" style="width:26px; height:26px;" onerror="this.src='./assets/default-avatar.svg'">
                  <strong>${p.username}</strong>
                </div>
              </td>
              <td class="text-center">${p.gamesPlayed}</td>
              <td class="text-center text-success">${p.wins}</td>
              <td class="text-center text-primary font-bold">${p.points} pts</td>
              <td class="text-center text-secondary">${p.winPercentage}%</td>
            </tr>
          `;
        }).join("");
      }
    } catch (e) {
      console.error("Failed to render admin leaderboard table:", e);
    }
  },

  async renderGameAnalyticsTable() {
    const container = document.getElementById("admin-analytics-container");
    if (!container) return;

    try {
      // Group matches by game
      const gameMatches = {};
      this.matches.forEach(m => {
        if (!gameMatches[m.game]) {
          gameMatches[m.game] = [];
        }
        gameMatches[m.game].push(m);
      });

      const gameNames = Object.keys(gameMatches);

      if (gameNames.length === 0) {
        container.innerHTML = `
          <div class="text-center text-muted" style="grid-column: 1 / -1; padding: 40px;">
            <i class="fas fa-chart-bar" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
            <p>No matches recorded yet. Play games or seed demo data to populate analytics!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = gameNames.map(game => {
        const matches = gameMatches[game];
        const played = matches.length;
        const wins = matches.filter(m => m.result === "Win").length;
        const losses = matches.filter(m => m.result === "Loss").length;
        const draws = matches.filter(m => m.result === "Draw").length;
        const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

        // Calculate streaks per user for this game, find global best streak
        const userMatchesMap = {};
        matches.forEach(m => {
          if (!userMatchesMap[m.userId]) userMatchesMap[m.userId] = [];
          userMatchesMap[m.userId].push(m);
        });

        let globalBestStreak = 0;
        Object.values(userMatchesMap).forEach(uMatches => {
          // Sort chronologically
          const sorted = [...uMatches].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          let currentStreak = 0;
          let bestStreak = 0;
          sorted.forEach(m => {
            if (m.result === "Win") {
              currentStreak++;
              if (currentStreak > bestStreak) bestStreak = currentStreak;
            } else {
              currentStreak = 0;
            }
          });
          if (bestStreak > globalBestStreak) globalBestStreak = bestStreak;
        });

        let icon = "fa-gamepad";
        let colorClass = "text-primary";
        if (game === "Tic Tac Toe") {
          icon = "fa-hashtag";
          colorClass = "text-primary";
        } else if (game === "Rock Paper Scissors") {
          icon = "fa-hand-rock";
          colorClass = "text-accent";
        }

        return `
          <div class="stat-card glass" style="display:flex; flex-direction:column; padding:20px; border-radius:12px; min-height:220px; border:1px solid var(--card-border-default);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px; margin-bottom:15px;">
              <h4 style="margin:0;"><i class="fas ${icon} ${colorClass}" style="margin-right:8px;"></i>${game}</h4>
              <span class="badge badge-accent" style="padding: 4px 10px; font-weight: bold; border-radius: 20px;">${winRate}% WR</span>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:0.9rem;">
              <div><strong>Games Played:</strong> ${played}</div>
              <div><strong>Wins:</strong> <span class="text-success">${wins}</span></div>
              <div><strong>Losses:</strong> <span class="text-danger">${losses}</span></div>
              <div><strong>Draws:</strong> <span class="text-warning">${draws}</span></div>
              <div style="grid-column: 1 / -1; margin-top:5px; border-top:1px dashed rgba(255,255,255,0.05); padding-top:8px;">
                <strong>Global Best Streak:</strong> <span class="text-accent">${globalBestStreak} Wins</span>
              </div>
            </div>
          </div>
        `;
      }).join("");

    } catch (e) {
      console.error("Failed to render game analytics:", e);
    }
  },

  async renderAchievementsTable() {
    const rowsContainer = document.getElementById("admin-achievements-rows");
    if (!rowsContainer) return;

    try {
      rowsContainer.innerHTML = ACHIEVEMENTS.map(ach => {
        const unlockedPlayers = this.users
          .filter(u => u.achievements && u.achievements.some(a => a.id === ach.id))
          .map(u => u.username);
        
        const count = unlockedPlayers.length;
        const playersListStr = count > 0 ? unlockedPlayers.join(", ") : "No players yet";

        return `
          <tr>
            <td style="font-size: 1.5rem; text-align: center;"><i class="fas fa-${ach.icon} ${ach.color}"></i></td>
            <td>
              <strong>${ach.title}</strong>
              <div class="text-muted" style="font-size: 0.8rem; margin-top: 2px;">${ach.desc}</div>
            </td>
            <td class="text-center font-bold text-accent">${count} unlock(s)</td>
            <td class="text-muted" style="font-size: 0.85rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${playersListStr}">
              ${playersListStr}
            </td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      console.error("Failed to render admin achievements table:", e);
    }
  },

  renderSystemSettings() {
    const usersSizeElem = document.getElementById("admin-sys-users-size");
    const matchesSizeElem = document.getElementById("admin-sys-matches-size");
    const adminMatchesSizeElem = document.getElementById("admin-sys-adminmatches-size");

    const usersRaw = localStorage.getItem("gv_users") || "";
    const matchesRaw = localStorage.getItem("gv_matches") || "";
    const adminMatchesRaw = localStorage.getItem("gv_admin_matches") || "";

    if (usersSizeElem) usersSizeElem.textContent = this.formatBytes(new Blob([usersRaw]).size);
    if (matchesSizeElem) matchesSizeElem.textContent = this.formatBytes(new Blob([matchesRaw]).size);
    if (adminMatchesSizeElem) adminMatchesSizeElem.textContent = this.formatBytes(new Blob([adminMatchesRaw]).size);
  },

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  async showUserDetailModal(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    const detailBody = document.getElementById("admin-user-details-body");
    if (!detailBody) return;

    const joinedStr = new Date(user.joinedDate).toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    
    const winRatio = user.stats?.gamesPlayed > 0 ? Math.round((user.stats.wins / user.stats.gamesPlayed) * 100) : 0;

    let achievementsHtml = user.achievements && user.achievements.length > 0
      ? user.achievements.map(a => {
          const ach = ACHIEVEMENTS.find(ac => ac.id === a.id);
          const title = ach ? ach.title : a.id;
          const date = new Date(a.unlockedAt).toLocaleDateString();
          return `<span class="badge badge-accent" style="margin-right: 5px; margin-bottom: 5px; display: inline-block;">🏆 ${title} (${date})</span>`;
        }).join("")
      : '<span class="text-muted">No achievements unlocked.</span>';

    detailBody.innerHTML = `
      <div style="display:flex; gap:16px; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:15px;">
        <img src="./assets/avatars/avatar${user.avatar || 1}.svg" style="width:60px; height:60px;" onerror="this.src='./assets/default-avatar.svg'">
        <div>
          <h4 style="margin:0 0 4px 0;">${user.username}</h4>
          <p class="text-muted" style="margin:0 0 2px 0; font-size:0.85rem;">Email: ${user.email}</p>
          <p class="text-muted" style="margin:0; font-size:0.85rem;">Joined: ${joinedStr}</p>
        </div>
      </div>
      
      <h5 style="margin-bottom:10px;">Simulation Stats</h5>
      <div class="stats-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-bottom:20px;">
        <div class="stat-item text-center glass" style="padding:8px 4px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
          <strong style="display:block; font-size:1.1rem;">${user.stats?.gamesPlayed || 0}</strong>
          <span style="font-size:0.7rem;" class="text-muted">Played</span>
        </div>
        <div class="stat-item text-center glass text-success" style="padding:8px 4px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
          <strong style="display:block; font-size:1.1rem;">${user.stats?.wins || 0}</strong>
          <span style="font-size:0.7rem;" class="text-muted">Wins</span>
        </div>
        <div class="stat-item text-center glass text-danger" style="padding:8px 4px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
          <strong style="display:block; font-size:1.1rem;">${user.stats?.losses || 0}</strong>
          <span style="font-size:0.7rem;" class="text-muted">Losses</span>
        </div>
        <div class="stat-item text-center glass text-warning" style="padding:8px 4px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
          <strong style="display:block; font-size:1.1rem;">${user.stats?.draws || 0}</strong>
          <span style="font-size:0.7rem;" class="text-muted">Draws</span>
        </div>
        <div class="stat-item text-center glass text-accent" style="padding:8px 4px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
          <strong style="display:block; font-size:1.1rem;">${user.stats?.streak || 0}</strong>
          <span style="font-size:0.7rem;" class="text-muted">Streak</span>
        </div>
        <div class="stat-item text-center glass text-primary" style="padding:8px 4px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
          <strong style="display:block; font-size:1.1rem;">${user.stats?.points || 0}</strong>
          <span style="font-size:0.7rem;" class="text-muted">Points</span>
        </div>
      </div>

      <div style="font-size:0.9rem; margin-bottom:20px;">
        <p style="margin:0 0 6px 0;"><strong>Win Ratio:</strong> ${winRatio}%</p>
        <p style="margin:0 0 6px 0;"><strong>Favorite Game:</strong> ${user.stats?.favGame || "None"}</p>
        <p style="margin:0 0 6px 0;"><strong>Highest Streak:</strong> ${user.stats?.highestStreak || 0}</p>
      </div>

      <h5 style="margin-bottom:8px;">Trophies Unlocked</h5>
      <div style="padding:10px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid rgba(255,255,255,0.05); font-size:0.85rem; margin-bottom:20px;">
        ${achievementsHtml}
      </div>

      <!-- Action Buttons to Reset User stats / achievements -->
      <div style="display:flex; gap:10px; justify-content:flex-end; border-top:1px solid rgba(255,255,255,0.05); padding-top:15px;">
        <button class="btn btn-warning btn-sm btn-reset-user-stats" data-id="${user.id}"><i class="fas fa-sync-alt"></i> Reset Statistics</button>
        <button class="btn btn-danger btn-sm btn-reset-user-achievements" data-id="${user.id}"><i class="fas fa-award"></i> Reset Achievements</button>
      </div>
    `;

    document.getElementById("admin-user-modal")?.classList.remove("hide");
  },

  bindEvents() {
    // 1. Search and Status filter for Users Table
    const searchInput = document.getElementById("admin-search-users");
    if (searchInput) {
      searchInput.addEventListener("input", () => this.renderUsersTable());
    }

    const filterStatus = document.getElementById("admin-filter-users-status");
    if (filterStatus) {
      filterStatus.addEventListener("change", () => this.renderUsersTable());
    }

    // 2. Filters & Sort for Match History Table
    const matchUser = document.getElementById("admin-match-filter-user");
    if (matchUser) matchUser.addEventListener("input", () => this.renderMatchesTable());

    const matchGame = document.getElementById("admin-match-filter-game");
    if (matchGame) matchGame.addEventListener("change", () => this.renderMatchesTable());

    const matchDiff = document.getElementById("admin-match-filter-diff");
    if (matchDiff) matchDiff.addEventListener("change", () => this.renderMatchesTable());

    const matchResult = document.getElementById("admin-match-filter-result");
    if (matchResult) matchResult.addEventListener("change", () => this.renderMatchesTable());

    const matchSort = document.getElementById("admin-match-sort");
    if (matchSort) matchSort.addEventListener("change", () => this.renderMatchesTable());

    // 3. User Details Reset Buttons Inside Modal
    const modalDetailsBody = document.getElementById("admin-user-details-body");
    if (modalDetailsBody) {
      modalDetailsBody.addEventListener("click", async (e) => {
        const statsBtn = e.target.closest(".btn-reset-user-stats");
        const achBtn = e.target.closest(".btn-reset-user-achievements");

        if (statsBtn) {
          e.preventDefault();
          const id = statsBtn.dataset.id;
          if (confirm("Are you sure you want to reset this user's gameplay statistics and matches?")) {
            try {
              await GameVerseDB.resetUserStats(id);
              ToastManager.show("User statistics successfully reset.", "success");
              document.getElementById("admin-user-modal")?.classList.add("hide");
              await this.refreshAdminView();
            } catch (err) {
              ToastManager.show(err.message, "error");
            }
          }
        }

        if (achBtn) {
          e.preventDefault();
          const id = achBtn.dataset.id;
          if (confirm("Are you sure you want to lock all achievements for this user?")) {
            try {
              await GameVerseDB.resetUserAchievements(id);
              ToastManager.show("User achievements successfully locked.", "success");
              document.getElementById("admin-user-modal")?.classList.add("hide");
              await this.refreshAdminView();
            } catch (err) {
              ToastManager.show(err.message, "error");
            }
          }
        }
      });
    }

    // 4. Modal Close Handlers
    const closeBtn = document.getElementById("admin-user-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.getElementById("admin-user-modal")?.classList.add("hide");
      });
    }
    
    document.addEventListener("click", (e) => {
      if (e.target === document.getElementById("admin-user-modal")) {
        document.getElementById("admin-user-modal")?.classList.add("hide");
      }
    });

    // 5. System Settings / Database Operations
    const seedBtn = document.getElementById("admin-settings-seed-btn");
    if (seedBtn) {
      seedBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await GameVerseDB.seedDemoData();
          ToastManager.show("Demo simulation data successfully seeded!", "success");
          await this.refreshAdminView();
        } catch (err) {
          ToastManager.show(err.message, "error");
        }
      });
    }

    const resetGameBtn = document.getElementById("admin-settings-reset-game-btn");
    if (resetGameBtn) {
      resetGameBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to wipe matches and reset stats for all players?")) {
          try {
            await GameVerseDB.resetAllGameStats();
            ToastManager.show("Global player stats and game logs reset.", "success");
            await this.refreshAdminView();
          } catch (err) {
            ToastManager.show(err.message, "error");
          }
        }
      });
    }

    const clearDbBtn = document.getElementById("admin-settings-clear-db-btn");
    if (clearDbBtn) {
      clearDbBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (confirm("Wipe complete database? This will clear all users, matches, and re-instantiate default admin account.")) {
          try {
            await GameVerseDB.clearData();
            ToastManager.show("Database successfully reset to defaults.", "info");
            await this.refreshAdminView();
          } catch (err) {
            ToastManager.show(err.message, "error");
          }
        }
      });
    }

    // 6. Reset Leaderboard Button inside Leaderboard Tab
    const resetLeaderboardBtn = document.getElementById("admin-reset-leaderboard-btn");
    if (resetLeaderboardBtn) {
      resetLeaderboardBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to reset the leaderboard points and game logs?")) {
          try {
            await GameVerseDB.resetAllGameStats();
            ToastManager.show("Leaderboard rankings successfully reset.", "success");
            await this.refreshAdminView();
          } catch (err) {
            ToastManager.show(err.message, "error");
          }
        }
      });
    }

    // 7. Tabs Switches click handlers
    const tabBtns = document.querySelectorAll(".admin-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetTab = btn.dataset.tab;
        
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        document.querySelectorAll(".admin-details .details-panel").forEach(panel => {
          if (panel.id === targetTab) {
            panel.classList.remove("hide");
          } else {
            panel.classList.add("hide");
          }
        });
      });
    });

    // 8. Actions delegation on users table (View Details, Toggle Status, Delete User)
    const tableBody = document.getElementById("admin-users-rows");
    if (tableBody) {
      tableBody.addEventListener("click", async (e) => {
        const viewBtn = e.target.closest(".btn-view-details");
        const toggleBtn = e.target.closest(".btn-toggle-status");
        const deleteBtn = e.target.closest(".btn-delete-user");

        if (viewBtn) {
          e.preventDefault();
          this.showUserDetailModal(viewBtn.dataset.id);
        }

        if (toggleBtn) {
          e.preventDefault();
          const userId = toggleBtn.dataset.id;
          const currentDisabled = toggleBtn.dataset.disabled === "true";
          const newStatus = !currentDisabled;
          
          try {
            await GameVerseDB.setUserStatus(userId, newStatus);
            ToastManager.show(`User account status updated.`, "info");
            await this.refreshAdminView();
          } catch (err) {
            ToastManager.show(err.message, "error");
          }
        }

        if (deleteBtn) {
          e.preventDefault();
          const userId = deleteBtn.dataset.id;
          if (confirm("Are you sure you want to permanently delete this user profile?")) {
            try {
              await GameVerseDB.deleteUser(userId);
              ToastManager.show("User deleted successfully.", "success");
              await this.refreshAdminView();
            } catch (err) {
              ToastManager.show(err.message, "error");
            }
          }
        }
      });
    }
  }
};
