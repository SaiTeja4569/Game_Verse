// =================================
// Tic Tac Toe Game Controller
// =================================

import { GameVerseDB } from "../../js/db.js";
import { ToastManager } from "../../js/toast.js";
import { Helpers } from "../../js/helpers.js";

export const TicTacToeGame = {
  initialized: false,
  board: ["", "", "", "", "", "", "", "", ""],
  mode: "pvc",          // "pvc" (vs computer) or "pvp" (vs player 2)
  difficulty: "easy",   // "easy", "medium", "hard"
  turn: "X",            // "X" or "O"
  isGameOver: false,
  scores: {
    p1: 0,
    p2: 0,
    draws: 0
  },
  moveHistory: [],

  start() {
    this.resetBoardState();
    this.updateUserLabels();
    if (!this.initialized) {
      this.bindEvents();
      this.initialized = true;
    }
  },

  async update() {
    // Alias for router consistency
    this.updateUserLabels();
  },

  async updateUserLabels() {
    const user = await GameVerseDB.getCurrentUser();
    const p1Label = document.getElementById("ttt-score-p1-label");
    const p2Label = document.getElementById("ttt-score-p2-label");

    if (p1Label) {
      p1Label.textContent = user ? `${user.username} (X)` : "You (X)";
    }
    if (p2Label) {
      if (this.mode === "pvc") {
        p2Label.textContent = "Computer (O)";
      } else {
        p2Label.textContent = "Player 2 (O)";
      }
    }
  },

  resetBoardState() {
    this.board = ["", "", "", "", "", "", "", "", ""];
    this.turn = "X";
    this.isGameOver = false;
    this.moveHistory = [];
    
    // Clear boxes in UI
    const boxes = document.querySelectorAll(".ttt-box");
    boxes.forEach(box => {
      box.textContent = "";
      box.classList.remove("x", "o");
      box.disabled = false;
    });

    // Hide overlays
    const overlay = document.getElementById("ttt-overlay");
    if (overlay) overlay.classList.add("hide");

    // HUD Message
    const hud = document.getElementById("ttt-hud-msg");
    if (hud) hud.textContent = "Your Turn! Click a square.";

    // Clear history console
    const historyConsole = document.getElementById("ttt-move-history");
    if (historyConsole) {
      historyConsole.innerHTML = `<p class="text-muted text-center pt-8">No moves made in this round.</p>`;
    }
  },

  resetScoreboard() {
    this.scores = { p1: 0, p2: 0, draws: 0 };
    this.updateScoreboardUI();
    ToastManager.show("Scoreboard reset.", "info");
  },

  updateScoreboardUI() {
    const p1Score = document.getElementById("ttt-score-p1");
    const p2Score = document.getElementById("ttt-score-p2");
    const drawsScore = document.getElementById("ttt-score-draws");

    if (p1Score) p1Score.textContent = this.scores.p1;
    if (p2Score) p2Score.textContent = this.scores.p2;
    if (drawsScore) drawsScore.textContent = this.scores.draws;
  },

  logMove(player, index) {
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    this.moveHistory.push(`Player ${player} placed at Row ${row}, Col ${col}`);

    const historyConsole = document.getElementById("ttt-move-history");
    if (historyConsole) {
      historyConsole.innerHTML = this.moveHistory
        .map((log, idx) => `<div class="move-log-item"><strong>#${idx + 1}</strong>: ${log}</div>`)
        .join("");
      historyConsole.scrollTop = historyConsole.scrollHeight;
    }
  },

  handleBoxClick(index) {
    if (this.isGameOver || this.board[index] !== "") return;

    // Apply Player Move
    this.applyMove(index, this.turn);
    this.logMove(this.turn, index);

    if (this.checkGameOver(this.turn)) return;

    // Toggle turn
    this.turn = this.turn === "X" ? "O" : "X";

    // Update HUD
    const hud = document.getElementById("ttt-hud-msg");
    if (this.mode === "pvp") {
      if (hud) hud.textContent = `Player ${this.turn}'s Turn!`;
    } else {
      if (hud) hud.textContent = "Computer is thinking...";
      
      // Computer Turn
      setTimeout(() => this.playComputerTurn(), 400);
    }
  },

  applyMove(index, player) {
    this.board[index] = player;
    const boxes = document.querySelectorAll(".ttt-box");
    if (boxes[index]) {
      boxes[index].textContent = player;
      boxes[index].classList.add(player.toLowerCase());
      boxes[index].disabled = true;
    }
  },

  playComputerTurn() {
    if (this.isGameOver) return;

    let move = -1;
    if (this.difficulty === "easy") {
      move = this.getRandomMove();
    } else if (this.difficulty === "medium") {
      move = this.getMediumAIMove();
    } else {
      move = this.getBestMoveMinimax();
    }

    if (move !== -1) {
      this.applyMove(move, "O");
      this.logMove("O", move);

      if (this.checkGameOver("O")) return;

      this.turn = "X";
      const hud = document.getElementById("ttt-hud-msg");
      if (hud) hud.textContent = "Your Turn! Click a square.";
    }
  },

  getRandomMove() {
    const emptyIndices = this.board
      .map((val, idx) => (val === "" ? idx : -1))
      .filter(idx => idx !== -1);
    
    if (emptyIndices.length === 0) return -1;
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  },

  getMediumAIMove() {
    // 1. Can AI win in one move?
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === "") {
        this.board[i] = "O";
        if (this.checkWinState(this.board, "O")) {
          this.board[i] = "";
          return i;
        }
        this.board[i] = "";
      }
    }

    // 2. Can player win in one move? Block!
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === "") {
        this.board[i] = "X";
        if (this.checkWinState(this.board, "X")) {
          this.board[i] = "";
          return i;
        }
        this.board[i] = "";
      }
    }

    // 3. Fallback to random
    return this.getRandomMove();
  },

  getBestMoveMinimax() {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (this.board[i] === "") {
        this.board[i] = "O";
        let score = this.minimax(this.board, 0, false);
        this.board[i] = "";
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  },

  minimax(b, depth, isMax) {
    if (this.checkWinState(b, "O")) return 10 - depth;
    if (this.checkWinState(b, "X")) return depth - 10;
    if (b.every(cell => cell !== "")) return 0;

    if (isMax) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === "") {
          b[i] = "O";
          let score = this.minimax(b, depth + 1, false);
          b[i] = "";
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === "") {
          b[i] = "X";
          let score = this.minimax(b, depth + 1, true);
          b[i] = "";
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  },

  checkWinState(b, player) {
    const wins = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    return wins.some(pattern => {
      return b[pattern[0]] === player && b[pattern[1]] === player && b[pattern[2]] === player;
    });
  },

  checkGameOver(player) {
    if (this.checkWinState(this.board, player)) {
      this.isGameOver = true;
      this.scores[player === "X" ? "p1" : "p2"]++;
      this.updateScoreboardUI();
      this.showResultOverlay(player === "X" ? "Win" : "Loss");
      return true;
    }

    if (this.board.every(cell => cell !== "")) {
      this.isGameOver = true;
      this.scores.draws++;
      this.updateScoreboardUI();
      this.showResultOverlay("Draw");
      return true;
    }

    return false;
  },

  async showResultOverlay(result) {
    const overlay = document.getElementById("ttt-overlay");
    const title = document.getElementById("ttt-overlay-title");
    const desc = document.getElementById("ttt-overlay-desc");

    if (!overlay || !title || !desc) return;

    const user = await GameVerseDB.getCurrentUser();
    const p1Name = user ? user.username : "You";

    // Play celebration confetti animation immediately on round win
    if (result === "Win") {
      Helpers.launchConfetti();
    }

    if (result === "Win") {
      title.textContent = "Round Won!";
      desc.textContent = `${p1Name} has defeated the opponent!`;
      title.className = "text-success font-bold";
    } else if (result === "Loss") {
      title.textContent = "Round Lost!";
      desc.textContent = this.mode === "pvc" ? "Defeated by the Computer bot." : "Player O has won the round!";
      title.className = "text-danger font-bold";
    } else {
      title.textContent = "Stalemate!";
      desc.textContent = "The round ends in a Draw.";
      title.className = "text-muted font-bold";
    }

    // Keep the board visible for a dynamic delay based on outcome
    let delay = 500; // 0.5 seconds for Loss or Draw
    if (result === "Win") {
      delay = 1500; // 1.5 seconds for Victory
    }

    setTimeout(() => {
      if (this.isGameOver) {
        overlay.classList.remove("hide");
      }
    }, delay);

    // Save match metrics to Database
    if (user) {
      let finalResult = "Draw";
      if (result === "Win") finalResult = "Win";
      if (result === "Loss") finalResult = "Loss";

      const diffText = this.mode === "pvc" 
        ? (this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1))
        : "PvP";

      const detailsText = this.mode === "pvc"
        ? `Played vs Computer on ${diffText} difficulty`
        : `Local 2-Player match vs Player 2`;

      try {
        const saveRes = await GameVerseDB.saveMatch(user.id, {
          game: "Tic Tac Toe",
          result: finalResult,
          difficulty: diffText,
          details: detailsText
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
          if (finalResult === "Win" && this.mode === "pvc" && this.difficulty === "hard") {
            const up = await GameVerseDB.unlockAchievement(user.id, "defeat-hard-ai");
            if (up) ToastManager.show("Trophy Unlocked: Deep Blue Who?", "achievement");
          }
        }
      } catch (err) {
        console.error("Failed to save match stats:", err);
      }
    }
  },

  bindEvents() {
    // Box Click Delegation inside Grid
    const grid = document.querySelector(".ttt-grid");
    if (grid) {
      grid.addEventListener("click", (e) => {
        const box = e.target.closest(".ttt-box");
        if (box) {
          e.preventDefault();
          this.handleBoxClick(parseInt(box.dataset.index, 10));
        }
      });
    }

    // Opponent Mode Toggle
    const modeToggle = document.getElementById("ttt-mode-toggle");
    if (modeToggle) {
      modeToggle.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-toggle");
        if (btn) {
          e.preventDefault();
          modeToggle.querySelectorAll(".btn-toggle").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          
          this.mode = btn.dataset.mode;
          
          // Toggle difficulty selector visibility
          const diffGroup = document.getElementById("ttt-difficulty-group");
          if (diffGroup) {
            if (this.mode === "pvp") {
              diffGroup.classList.add("hide");
            } else {
              diffGroup.classList.remove("hide");
            }
          }

          this.updateUserLabels();
          this.resetBoardState();
        }
      });
    }

    // Difficulty Toggles
    const diffGroup = document.getElementById("ttt-difficulty-group");
    if (diffGroup) {
      diffGroup.addEventListener("click", (e) => {
        const tab = e.target.closest(".diff-tab");
        if (tab) {
          e.preventDefault();
          diffGroup.querySelectorAll(".diff-tab").forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          
          this.difficulty = tab.dataset.diff;
          this.resetBoardState();
        }
      });
    }

    // Reset scoreboard
    const restartBtn = document.getElementById("ttt-restart-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetScoreboard();
      });
    }

    // Clear board
    const boardResetBtn = document.getElementById("ttt-board-reset-btn");
    if (boardResetBtn) {
      boardResetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetBoardState();
      });
    }

    // Overlay Play Again round
    const playAgainBtn = document.getElementById("ttt-modal-play-again");
    if (playAgainBtn) {
      playAgainBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetBoardState();
      });
    }
  }
};
