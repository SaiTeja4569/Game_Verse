// =================================
// Rock Paper Scissors Game Controller
// =================================

import { GameVerseDB } from "../../js/db.js";
import { ToastManager } from "../../js/toast.js";
import { Helpers } from "../../js/helpers.js";

export const RockPaperScissorsGame = {
  initialized: false,
  format: 1,            // 1 (Single), 3 (Best of 3), 5 (Best of 5)
  difficulty: "easy",   // "easy", "medium", "hard"
  scores: {
    user: 0,
    comp: 0,
    draws: 0
  },
  currentStreak: 0,
  bestStreak: 0,
  roundsLog: [],
  isSeriesOver: false,
  
  // Transition matrix for Hard Adaptive AI
  userMoveMatrix: {
    rock: { rock: 0, paper: 0, scissors: 0 },
    paper: { rock: 0, paper: 0, scissors: 0 },
    scissors: { rock: 0, paper: 0, scissors: 0 }
  },
  lastUserMove: null,

  async start() {
    this.resetSeries();
    await this.updateStreakDisplay();
    if (!this.initialized) {
      this.bindEvents();
      this.initialized = true;
    }
  },

  async update() {
    // Router consistency update hook
    await this.updateStreakDisplay();
  },

  async updateStreakDisplay() {
    const user = await GameVerseDB.getCurrentUser();
    
    // Read from DB if logged in, otherwise from memory
    const currStr = user ? (user.stats?.streak || 0) : this.currentStreak;
    const bestStr = user ? (user.stats?.highestStreak || 0) : this.bestStreak;

    const currentStreakEl = document.getElementById("rps-streak-current");
    const bestStreakEl = document.getElementById("rps-streak-best");

    if (currentStreakEl) currentStreakEl.textContent = currStr;
    if (bestStreakEl) bestStreakEl.textContent = bestStr;
  },

  resetSeries() {
    this.scores = { user: 0, comp: 0, draws: 0 };
    this.roundsLog = [];
    this.isSeriesOver = false;

    this.updateScoreboardUI();
    this.updateSeriesHUD();

    // Reset picks display
    const userPickEl = document.getElementById("rps-user-pick-display");
    const compPickEl = document.getElementById("rps-comp-pick-display");
    if (userPickEl) userPickEl.innerHTML = "?";
    if (compPickEl) compPickEl.innerHTML = "?";

    // HUD Message
    const hud = document.getElementById("rps-hud-msg");
    if (hud) hud.innerHTML = `<span class="glass-inline-msg">Make your move to start round!</span>`;

    // Clear logs list
    const logConsole = document.getElementById("rps-rounds-log");
    if (logConsole) {
      logConsole.innerHTML = `<p class="text-muted text-center pt-8">No rounds played in this series.</p>`;
    }

    // Hide overlays
    const overlay = document.getElementById("rps-overlay");
    if (overlay) overlay.classList.add("hide");
  },

  updateScoreboardUI() {
    const userScoreEl = document.getElementById("rps-score-user");
    const compScoreEl = document.getElementById("rps-score-comp");
    const drawsScoreEl = document.getElementById("rps-score-draws");

    if (userScoreEl) userScoreEl.textContent = this.scores.user;
    if (compScoreEl) compScoreEl.textContent = this.scores.comp;
    if (drawsScoreEl) drawsScoreEl.textContent = this.scores.draws;
  },

  updateSeriesHUD() {
    const hud = document.getElementById("rps-series-hud");
    if (!hud) return;

    if (this.format === 1) {
      hud.textContent = "Series Status: Single Round Mode";
    } else {
      const target = Math.ceil(this.format / 2);
      hud.textContent = `Series Status: First to ${target} Wins (Best of ${this.format})`;
    }
  },

  logRound(roundNum, userChoice, compChoice, result) {
    const uc = userChoice.charAt(0).toUpperCase() + userChoice.slice(1);
    const cc = compChoice.charAt(0).toUpperCase() + compChoice.slice(1);
    
    let outcomeText = "Draw";
    if (result === "Win") outcomeText = "Won";
    else if (result === "Loss") outcomeText = "Lost";

    this.roundsLog.push(`Round ${roundNum}: You picked ${uc}, Computer picked ${cc} - ${outcomeText}`);

    const logConsole = document.getElementById("rps-rounds-log");
    if (logConsole) {
      logConsole.innerHTML = this.roundsLog
        .map((log, idx) => `<div class="move-log-item"><strong>#${idx + 1}</strong>: ${log}</div>`)
        .join("");
      logConsole.scrollTop = logConsole.scrollHeight;
    }
  },

  handlePlayerMove(playerMove) {
    if (this.isSeriesOver) return;

    // 1. Generate computer move based on AI difficulty
    const compMove = this.getComputerMove(playerMove);

    // 2. Update Adaptive AI transition counts
    if (this.difficulty === "hard" && this.lastUserMove) {
      this.userMoveMatrix[this.lastUserMove][playerMove]++;
    }
    this.lastUserMove = playerMove;

    // 3. Evaluate Winner
    let result = "Draw"; // Default
    if (playerMove !== compMove) {
      if (
        (playerMove === "rock" && compMove === "scissors") ||
        (playerMove === "paper" && compMove === "rock") ||
        (playerMove === "scissors" && compMove === "paper")
      ) {
        result = "Win";
      } else {
        result = "Loss";
      }
    }

    // 4. Update Scoreboard
    if (result === "Win") {
      this.scores.user++;
      this.currentStreak++;
      if (this.currentStreak > this.bestStreak) {
        this.bestStreak = this.currentStreak;
      }
    } else if (result === "Loss") {
      this.scores.comp++;
      this.currentStreak = 0;
    } else {
      this.scores.draws++;
      this.currentStreak = 0;
    }

    // 5. Update UI Arena
    const userPickEl = document.getElementById("rps-user-pick-display");
    const compPickEl = document.getElementById("rps-comp-pick-display");
    
    const getPickHtml = (move) => {
      if (move === "rock") return `<i class="fas fa-hand-rock text-primary" style="font-size:3rem;"></i>`;
      if (move === "paper") return `<i class="fas fa-hand-paper text-accent" style="font-size:3rem;"></i>`;
      return `<i class="fas fa-hand-scissors text-warning" style="font-size:3rem;"></i>`;
    };

    if (userPickEl) userPickEl.innerHTML = getPickHtml(playerMove);
    if (compPickEl) compPickEl.innerHTML = getPickHtml(compMove);

    this.updateScoreboardUI();
    this.updateStreakDisplay();

    // 6. Log Round
    const roundNum = this.scores.user + this.scores.comp + this.scores.draws;
    this.logRound(roundNum, playerMove, compMove, result);

    // 7. Update HUD Message
    const hud = document.getElementById("rps-hud-msg");
    if (hud) {
      if (result === "Win") {
        hud.innerHTML = `<span class="glass-inline-msg text-success font-bold">Round Won! ${playerMove} beats ${compMove}.</span>`;
      } else if (result === "Loss") {
        hud.innerHTML = `<span class="glass-inline-msg text-danger font-bold">Round Lost! ${compMove} beats ${playerMove}.</span>`;
      } else {
        hud.innerHTML = `<span class="glass-inline-msg text-muted font-bold">Round Tied! Standard split.</span>`;
      }
    }

    // 8. Check Series Completion
    const targetWins = Math.ceil(this.format / 2);
    if (this.scores.user >= targetWins) {
      this.endSeries("Win");
    } else if (this.scores.comp >= targetWins) {
      this.endSeries("Loss");
    }
  },

  getComputerMove(playerMove) {
    const choices = ["rock", "paper", "scissors"];

    if (this.difficulty === "easy") {
      // Completely random
      return choices[Math.floor(Math.random() * 3)];
    }

    if (this.difficulty === "medium") {
      // Heuristic model: 50% probability to counter user's last played move, otherwise random
      if (this.lastUserMove && Math.random() < 0.50) {
        return this.getWinningCounter(this.lastUserMove);
      }
      return choices[Math.floor(Math.random() * 3)];
    }

    // Hard (Adaptive AI using transition probabilities)
    if (this.lastUserMove) {
      const transitionCounts = this.userMoveMatrix[this.lastUserMove];
      let predictedNext = "rock"; // Fallback default
      let maxCount = -1;

      // Identify move user selects most frequently after this.lastUserMove
      for (const choice of choices) {
        if (transitionCounts[choice] > maxCount) {
          maxCount = transitionCounts[choice];
          predictedNext = choice;
        } else if (transitionCounts[choice] === maxCount && Math.random() < 0.5) {
          // Tie-break randomly
          predictedNext = choice;
        }
      }

      // Play the counter to what we predict the user will play
      return this.getWinningCounter(predictedNext);
    }

    // No history? Random start!
    return choices[Math.floor(Math.random() * 3)];
  },

  getWinningCounter(move) {
    if (move === "rock") return "paper";
    if (move === "paper") return "scissors";
    return "rock";
  },

  async endSeries(seriesResult) {
    this.isSeriesOver = true;

    const overlay = document.getElementById("rps-overlay");
    const title = document.getElementById("rps-overlay-title");
    const desc = document.getElementById("rps-overlay-desc");

    if (!overlay || !title || !desc) return;

    const user = await GameVerseDB.getCurrentUser();
    const username = user ? user.username : "You";

    // Play celebration confetti immediately on series win
    if (seriesResult === "Win") {
      Helpers.launchConfetti();
    }

    if (seriesResult === "Win") {
      title.textContent = "Series Victory!";
      desc.textContent = `${username} won the series ${this.scores.user} - ${this.scores.comp}!`;
      title.className = "text-success font-bold";
    } else {
      title.textContent = "Series Defeat!";
      desc.textContent = `Computer won the series ${this.scores.comp} - ${this.scores.user}.`;
      title.className = "text-danger font-bold";
    }

    // Keep the board visible for a dynamic delay based on outcome
    let delay = 500; // 0.5 seconds for Loss or Draw
    if (seriesResult === "Win") {
      delay = 1500; // 1.5 seconds for Victory
    }

    setTimeout(() => {
      if (this.isSeriesOver) {
        overlay.classList.remove("hide");
      }
    }, delay);

    // Save final match metrics to database
    if (user) {
      const diffText = this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1);
      const targetText = this.format === 1 ? "Single Round" : `Best of ${this.format}`;
      const details = `${seriesResult === "Win" ? "Won" : "Lost"} series ${this.scores.user}-${this.scores.comp} vs ${diffText} AI (${targetText})`;

      try {
        const saveRes = await GameVerseDB.saveMatch(user.id, {
          game: "Rock Paper Scissors",
          result: seriesResult,
          difficulty: diffText,
          details: details
        });

        const updatedUser = saveRes.user;

        // Check Achievements
        if (updatedUser) {
          if (updatedUser.stats?.wins === 1) {
            const up = await GameVerseDB.unlockAchievement(user.id, "first-win");
            if (up) ToastManager.show("Trophy Unlocked: First Blood!", "achievement");
          }
          if (updatedUser.stats?.wins === 10) {
            const up = await GameVerseDB.unlockAchievement(user.id, "wins-10");
            if (up) ToastManager.show("Trophy Unlocked: Decimator!", "achievement");
          }
          if (updatedUser.stats?.streak === 5) {
            const up = await GameVerseDB.unlockAchievement(user.id, "streak-5");
            if (up) ToastManager.show("Trophy Unlocked: On Fire!", "achievement");
          }
          if (seriesResult === "Win" && this.difficulty === "hard") {
            const up = await GameVerseDB.unlockAchievement(user.id, "defeat-hard-ai");
            if (up) ToastManager.show("Trophy Unlocked: Deep Blue Who?", "achievement");
          }
        }
        await this.updateStreakDisplay();
      } catch (err) {
        console.error("Failed to save RPS series stats:", err);
      }
    }
  },

  bindEvents() {
    // Bind Move cards
    const choicesGroup = [
      { id: "rps-choice-rock", move: "rock" },
      { id: "rps-choice-paper", move: "paper" },
      { id: "rps-choice-scissors", move: "scissors" }
    ];

    choicesGroup.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          this.handlePlayerMove(item.move);
        });
      }
    });

    // Format toggle
    const formatToggle = document.getElementById("rps-format-toggle");
    if (formatToggle) {
      formatToggle.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-toggle");
        if (btn) {
          e.preventDefault();
          formatToggle.querySelectorAll(".btn-toggle").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");

          this.format = parseInt(btn.dataset.format, 10);
          this.resetSeries();
        }
      });
    }

    // Difficulty tabs
    const diffTabs = document.querySelector(".game-settings-panel");
    if (diffTabs) {
      diffTabs.addEventListener("click", (e) => {
        const tab = e.target.closest(".difficulty-tabs .diff-tab");
        if (tab) {
          e.preventDefault();
          diffTabs.querySelectorAll(".difficulty-tabs .diff-tab").forEach(t => t.classList.remove("active"));
          tab.classList.add("active");

          this.difficulty = tab.dataset.diff;
          this.resetSeries();
        }
      });
    }

    // Reset scores
    const restartBtn = document.getElementById("rps-restart-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetSeries();
      });
    }

    // Play Again (overlay)
    const playAgainBtn = document.getElementById("rps-modal-play-again");
    if (playAgainBtn) {
      playAgainBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetSeries();
      });
    }
  }
};
