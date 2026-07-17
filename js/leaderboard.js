// =================================
// Leaderboard View Controller Module
// =================================

import { GameVerseDB } from "./db.js";

export const LeaderboardController = {
  async update() {
    try {
      const players = await GameVerseDB.getLeaderboard();
      const podium = document.getElementById("leaderboard-podium");
      const rowsContainer = document.getElementById("leaderboard-rows");

      if (podium) {
        if (!players || players.length === 0) {
          podium.innerHTML = `<p class="text-muted">No players recorded yet. Start playing!</p>`;
        } else {
          const top3 = players.slice(0, 3);
          
          let firstHtml = "";
          let secondHtml = "";
          let thirdHtml = "";

          // 1st place (Gold)
          if (top3[0]) {
            const p = top3[0];
            firstHtml = `
              <div class="podium-item podium-gold">
                <div class="podium-avatar-wrapper">
                  <img src="./assets/avatars/avatar${p.avatar || 1}.svg" alt="${p.username}" class="podium-avatar">
                  <div class="podium-rank-badge">1</div>
                </div>
                <div class="podium-name">${p.username}</div>
                <div class="podium-points">${p.points} PTS</div>
              </div>
            `;
          }

          // 2nd place (Silver)
          if (top3[1]) {
            const p = top3[1];
            secondHtml = `
              <div class="podium-item podium-silver">
                <div class="podium-avatar-wrapper">
                  <img src="./assets/avatars/avatar${p.avatar || 1}.svg" alt="${p.username}" class="podium-avatar">
                  <div class="podium-rank-badge">2</div>
                </div>
                <div class="podium-name">${p.username}</div>
                <div class="podium-points">${p.points} PTS</div>
              </div>
            `;
          }

          // 3rd place (Bronze)
          if (top3[2]) {
            const p = top3[2];
            thirdHtml = `
              <div class="podium-item podium-bronze">
                <div class="podium-avatar-wrapper">
                  <img src="./assets/avatars/avatar${p.avatar || 1}.svg" alt="${p.username}" class="podium-avatar">
                  <div class="podium-rank-badge">3</div>
                </div>
                <div class="podium-name">${p.username}</div>
                <div class="podium-points">${p.points} PTS</div>
              </div>
            `;
          }

          // Order: Silver (2nd) - Gold (1st) - Bronze (3rd) for premium podium structure
          podium.innerHTML = `
            ${secondHtml}
            ${firstHtml}
            ${thirdHtml}
          `;
        }
      }

      if (rowsContainer) {
        if (!players || players.length === 0) {
          rowsContainer.innerHTML = `
            <tr>
              <td colspan="6" class="text-center text-muted">No players ranked yet. Be the first to register and play!</td>
            </tr>
          `;
        } else {
          rowsContainer.innerHTML = players
            .map((p, idx) => {
              const rank = idx + 1;
              let rankBadge = rank;
              
              if (rank === 1) rankBadge = `<span class="badge badge-accent" style="background:#FACC15; color:#000;">🥇 1st</span>`;
              else if (rank === 2) rankBadge = `<span class="badge badge-secondary" style="background:#CBD5E1; color:#000;">🥈 2nd</span>`;
              else if (rank === 3) rankBadge = `<span class="badge badge-warning" style="background:#B45309; color:#fff;">🥉 3rd</span>`;

              return `
                <tr>
                  <td class="text-center">${rankBadge}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                      <img src="./assets/avatars/avatar${p.avatar || 1}.svg" alt="Avatar" class="nav-avatar" style="width:30px; height:30px;">
                      <strong>${p.username}</strong>
                    </div>
                  </td>
                  <td class="text-center">${p.gamesPlayed}</td>
                  <td class="text-center text-success">${p.wins}</td>
                  <td class="text-center">${p.winPercentage}%</td>
                  <td class="text-center text-gradient font-bold">${p.points}</td>
                </tr>
              `;
            })
            .join("");
        }
      }
    } catch (e) {
      console.error("Leaderboard update failed:", e);
    }
  }
};
