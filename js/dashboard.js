// =================================
// Dashboard View Controller Module
// =================================

import { GameVerseDB } from "./db.js";
import { ACHIEVEMENTS } from "./config.js";

export const DashboardController = {
  async update() {
    try {
      const user = await GameVerseDB.getCurrentUser();
      if (!user) return;

      // 1. Update Profile Card
      const avatarImg = document.getElementById("dash-user-avatar");
      if (avatarImg) {
        avatarImg.src = `./assets/avatars/avatar${user.avatar || 1}.svg`;
        avatarImg.onerror = () => { avatarImg.src = "./assets/default-avatar.svg"; };
      }

      const welcomeName = document.getElementById("dash-welcome-username");
      if (welcomeName) {
        welcomeName.textContent = user.username;
      }

      const rankTier = document.getElementById("dash-user-rank-tier");
      if (rankTier) {
        let tier = "Rookie";
        const pts = user.stats?.points || 0;
        if (pts >= 300) tier = "Grandmaster";
        else if (pts >= 150) tier = "Gold Tier";
        else if (pts >= 50) tier = "Silver Tier";
        rankTier.textContent = tier;
      }

      // 2. Update Stats Grid
      const gp = document.getElementById("dash-games-played");
      const wins = document.getElementById("dash-wins");
      const losses = document.getElementById("dash-losses");
      const draws = document.getElementById("dash-draws");
      const streak = document.getElementById("dash-streak");
      const fav = document.getElementById("dash-fav-game");

      if (gp) gp.textContent = user.stats?.gamesPlayed || 0;
      if (wins) wins.textContent = user.stats?.wins || 0;
      if (losses) losses.textContent = user.stats?.losses || 0;
      if (draws) draws.textContent = user.stats?.draws || 0;
      if (streak) streak.textContent = user.stats?.streak || 0;
      if (fav) fav.textContent = user.stats?.favGame || "None";

      // 3. Calculate and Update Game-Specific Statistics
      const matches = await GameVerseDB.getMatchHistory(user.id);

      // TTT stats
      const tttMatches = matches.filter(m => m.game === "Tic Tac Toe");
      const tttPlayed = tttMatches.length;
      const tttWins = tttMatches.filter(m => m.result === "Win").length;
      const tttLosses = tttMatches.filter(m => m.result === "Loss").length;
      const tttDraws = tttMatches.filter(m => m.result === "Draw").length;
      const tttWinrateVal = tttPlayed > 0 ? Math.round((tttWins / tttPlayed) * 100) : 0;

      const tttDiffCounts = tttMatches.reduce((acc, curr) => {
        acc[curr.difficulty] = (acc[curr.difficulty] || 0) + 1;
        return acc;
      }, {});
      let tttFavDiff = "None";
      let tttMaxDiff = 0;
      for (const d in tttDiffCounts) {
        if (tttDiffCounts[d] > tttMaxDiff) {
          tttMaxDiff = tttDiffCounts[d];
          tttFavDiff = d;
        }
      }

      const tttPlayedEl = document.getElementById("dash-ttt-played");
      const tttWinsEl = document.getElementById("dash-ttt-wins");
      const tttLossesEl = document.getElementById("dash-ttt-losses");
      const tttDrawsEl = document.getElementById("dash-ttt-draws");
      const tttWinrateEl = document.getElementById("dash-ttt-winrate");
      const tttFavDiffEl = document.getElementById("dash-ttt-fav-difficulty");

      if (tttPlayedEl) tttPlayedEl.textContent = tttPlayed;
      if (tttWinsEl) tttWinsEl.textContent = tttWins;
      if (tttLossesEl) tttLossesEl.textContent = tttLosses;
      if (tttDrawsEl) tttDrawsEl.textContent = tttDraws;
      if (tttWinrateEl) tttWinrateEl.textContent = `${tttWinrateVal}% WR`;
      if (tttFavDiffEl) tttFavDiffEl.textContent = tttFavDiff;

      // RPS stats
      const rpsMatches = matches.filter(m => m.game === "Rock Paper Scissors");
      const rpsPlayed = rpsMatches.length;
      const rpsWins = rpsMatches.filter(m => m.result === "Win").length;
      const rpsLosses = rpsMatches.filter(m => m.result === "Loss").length;
      const rpsDraws = rpsMatches.filter(m => m.result === "Draw").length;
      const rpsWinrateVal = rpsPlayed > 0 ? Math.round((rpsWins / rpsPlayed) * 100) : 0;

      const rpsDiffCounts = rpsMatches.reduce((acc, curr) => {
        acc[curr.difficulty] = (acc[curr.difficulty] || 0) + 1;
        return acc;
      }, {});
      let rpsFavDiff = "None";
      let rpsMaxDiff = 0;
      for (const d in rpsDiffCounts) {
        if (rpsDiffCounts[d] > rpsMaxDiff) {
          rpsMaxDiff = rpsDiffCounts[d];
          rpsFavDiff = d;
        }
      }

      const rpsPlayedEl = document.getElementById("dash-rps-played");
      const rpsWinsEl = document.getElementById("dash-rps-wins");
      const rpsLossesEl = document.getElementById("dash-rps-losses");
      const rpsDrawsEl = document.getElementById("dash-rps-draws");
      const rpsWinrateEl = document.getElementById("dash-rps-winrate");
      const rpsFavDiffEl = document.getElementById("dash-rps-fav-difficulty");

      if (rpsPlayedEl) rpsPlayedEl.textContent = rpsPlayed;
      if (rpsWinsEl) rpsWinsEl.textContent = rpsWins;
      if (rpsLossesEl) rpsLossesEl.textContent = rpsLosses;
      if (rpsDrawsEl) rpsDrawsEl.textContent = rpsDraws;
      if (rpsWinrateEl) rpsWinrateEl.textContent = `${rpsWinrateVal}% WR`;
      if (rpsFavDiffEl) rpsFavDiffEl.textContent = rpsFavDiff;

      // 4. Update Recent Matches Table
      const matchesList = document.getElementById("dash-matches-list");

      if (matchesList) {
        if (!matches || matches.length === 0) {
          matchesList.innerHTML = `
            <tr>
              <td colspan="4" class="text-center text-muted">No matches played yet. Play a game to see history!</td>
            </tr>
          `;
        } else {
          // Sort by date descending and take top 5
          const recentMatches = [...matches]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

          matchesList.innerHTML = recentMatches
            .map(m => {
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
                  <td><i class="fas ${icon} ${colorClass}" style="margin-right: 8px;"></i>${m.game}</td>
                  <td class="${resultClass} font-bold">${m.result}</td>
                  <td><span class="badge ${diffClass}">${m.difficulty || "Easy"}</span></td>
                  <td>${dateStr}</td>
                </tr>
              `;
            })
            .join("");
        }
      }

      // 4. Update Achievements Preview List
      const achPreviewList = document.getElementById("dash-achievements-list");
      if (achPreviewList) {
        const unlockedIds = new Set(user.achievements?.map(a => a.id) || []);

        achPreviewList.innerHTML = ACHIEVEMENTS.map(ach => {
          const isUnlocked = unlockedIds.has(ach.id);
          const stateClass = isUnlocked ? "unlocked" : "locked";
          const iconColor = isUnlocked ? ach.color : "text-muted";

          return `
            <div class="achievement-mini-badge ${stateClass}">
              <i class="fas fa-${ach.icon} ${iconColor}"></i>
              <span class="tooltip">
                <strong>${ach.title}</strong><br>
                ${ach.desc} ${isUnlocked ? "(Unlocked)" : "(Locked)"}
              </span>
            </div>
          `;
        }).join("");
      }
    } catch (e) {
      console.error("Dashboard update failed:", e);
    }
  }
};
