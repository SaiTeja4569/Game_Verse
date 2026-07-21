// =================================
// Match History Controller Module
// =================================

import { GameVerseDB } from "./db.js";

export const HistoryController = {
  initialized: false,

  async update() {
    await this.renderHistory();
    
    if (!this.initialized) {
      this.bindEvents();
      this.initialized = true;
    }
  },

  async renderHistory() {
    try {
      const user = await GameVerseDB.getCurrentUser();
      if (!user) return;

      const matches = await GameVerseDB.getMatchHistory(user.id);
      const rowsContainer = document.getElementById("history-rows");
      if (!rowsContainer) return;

      // Extract current filter values from DOM
      const gameFilter = document.getElementById("filter-game")?.value || "all";
      const resultFilter = document.getElementById("filter-result")?.value || "all";
      const sortFilter = document.getElementById("filter-sort")?.value || "desc";

      let filtered = [...matches];

      // Apply Filters
      if (gameFilter !== "all") {
        filtered = filtered.filter(m => m.game === gameFilter);
      }
      if (resultFilter !== "all") {
        filtered = filtered.filter(m => m.result === resultFilter);
      }

      // Apply Sort
      filtered.sort((a, b) => {
        const timeA = new Date(a.timestamp);
        const timeB = new Date(b.timestamp);
        return sortFilter === "desc" ? timeB - timeA : timeA - timeB;
      });

      // Render
      if (filtered.length === 0) {
        rowsContainer.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted">No matches played matching these filters.</td>
          </tr>
        `;
      } else {
        rowsContainer.innerHTML = filtered.map(m => {
          const dateStr = new Date(m.timestamp).toLocaleString([], {
            year: "numeric",
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
              <td>
                <span class="card-label"><i class="fa-solid fa-gamepad"></i> Game</span>
                <span class="admin-game-cell-value"><i class="fas ${icon} ${colorClass}"></i><span>${m.game}</span></span>
              </td>
              <td class="text-center">
                <span class="card-label"><i class="fa-solid fa-trophy"></i> Result</span>
                <span class="${resultClass} font-bold">${m.result}</span>
              </td>
              <td class="text-center">
                <span class="card-label"><i class="fa-solid fa-star"></i> Difficulty</span>
                <span class="badge ${diffClass}">${m.difficulty || "Easy"}</span>
              </td>
              <td>
                <span class="card-label"><i class="fa-solid fa-info-circle"></i> Details</span>
                <span style="font-size: 0.9rem;">${m.details || ""}</span>
              </td>
              <td class="text-center" style="font-size: 0.85rem; color: var(--text-muted);">
                <span class="card-label"><i class="fa-solid fa-calendar-days"></i> Date</span>
                ${dateStr}
              </td>
            </tr>
          `;
        }).join("");
      }
    } catch (e) {
      console.error("Match history rendering failed:", e);
    }
  },

  bindEvents() {
    const filterIds = ["filter-game", "filter-result", "filter-sort"];
    filterIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => this.renderHistory());
      }
    });

    const clearBtn = document.getElementById("clear-filters-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        
        const gameSelect = document.getElementById("filter-game");
        const resultSelect = document.getElementById("filter-result");
        const sortSelect = document.getElementById("filter-sort");

        if (gameSelect) gameSelect.value = "all";
        if (resultSelect) resultSelect.value = "all";
        if (sortSelect) sortSelect.value = "desc";

        this.renderHistory();
      });
    }
  }
};
