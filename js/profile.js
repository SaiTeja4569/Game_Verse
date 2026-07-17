// =================================
// Profile View Controller Module
// =================================

import { GameVerseDB } from "./db.js";
import { ACHIEVEMENTS } from "./config.js";
import { ToastManager } from "./toast.js";

export const ProfileController = {
  initialized: false,

  async update() {
    await this.renderProfileData();
    
    if (!this.initialized) {
      this.bindEvents();
      this.initialized = true;
    }
  },

  async renderProfileData() {
    try {
      const user = await GameVerseDB.getCurrentUser();
      if (!user) return;

      const playerView = document.getElementById("player-profile-view");
      const adminView = document.getElementById("admin-profile-view");

      if (user.isAdmin) {
        // Toggle view containers
        if (playerView) playerView.classList.add("hide");
        if (adminView) adminView.classList.remove("hide");

        // Render Admin details
        const avatarImg = document.getElementById("admin-profile-user-avatar");
        if (avatarImg) {
          avatarImg.src = `./assets/avatars/avatar${user.avatar || 1}.svg`;
          avatarImg.onerror = () => { avatarImg.src = "./assets/default-avatar.svg"; };
        }

        const dispName = document.getElementById("admin-profile-display-username");
        if (dispName) dispName.textContent = user.username;

        const joinedDate = document.getElementById("admin-profile-joined-date");
        if (joinedDate) {
          joinedDate.textContent = user.joinedDate 
            ? new Date(user.joinedDate).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
            : "N/A";
        }

        // Fetch System Stats for Sidebar
        const allUsers = await GameVerseDB.getAllUsers();
        const allMatches = await GameVerseDB.getAllMatches();
        const adminMeta = JSON.parse(localStorage.getItem("gv_admin_meta") || "{}");

        const lastLoginDate = adminMeta.lastLogin 
          ? new Date(adminMeta.lastLogin).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
          : "N/A";

        const statPlayers = document.getElementById("admin-profile-stat-players");
        const statMatches = document.getElementById("admin-profile-stat-matches");
        const statDisabled = document.getElementById("admin-profile-stat-disabled");
        const statDeleted = document.getElementById("admin-profile-stat-deleted");
        const statSeeded = document.getElementById("admin-profile-stat-seeded");
        const statResets = document.getElementById("admin-profile-stat-resets");
        const statLastLogin = document.getElementById("admin-profile-stat-last-login");

        if (statPlayers) statPlayers.textContent = allUsers.filter(u => !u.isAdmin).length;
        if (statMatches) statMatches.textContent = allMatches.length;
        if (statDisabled) statDisabled.textContent = allUsers.filter(u => u.isDisabled).length;
        if (statDeleted) statDeleted.textContent = adminMeta.deletedAccounts || 0;
        if (statSeeded) statSeeded.textContent = adminMeta.demoDataSeeded || 0;
        if (statResets) statResets.textContent = adminMeta.databaseResets || 0;
        if (statLastLogin) statLastLogin.textContent = lastLoginDate;

        // Load Admin Edit Profile Form Fields
        const usernameInput = document.getElementById("admin-profile-username");
        const emailInput = document.getElementById("admin-profile-email");
        if (usernameInput) usernameInput.value = user.username || "";
        if (emailInput) emailInput.value = user.email || "";

        // Highlight selected avatar option in picker
        const avatarPicker = document.getElementById("admin-profile-avatar-picker");
        if (avatarPicker) {
          avatarPicker.querySelectorAll(".avatar-option").forEach(opt => {
            if (opt.dataset.avatar === String(user.avatar)) {
              opt.classList.add("selected");
            } else {
              opt.classList.remove("selected");
            }
          });
        }
      } else {
        // Toggle view containers
        if (adminView) adminView.classList.add("hide");
        if (playerView) playerView.classList.remove("hide");

        // Render Player Sidebar details
        const avatarImg = document.getElementById("profile-user-avatar");
        if (avatarImg) {
          avatarImg.src = `./assets/avatars/avatar${user.avatar || 1}.svg`;
          avatarImg.onerror = () => { avatarImg.src = "./assets/default-avatar.svg"; };
        }

        const dispName = document.getElementById("profile-display-username");
        if (dispName) dispName.textContent = user.username;

        const rankTier = document.getElementById("profile-display-rank-tier");
        if (rankTier) {
          let tier = "Rookie";
          const pts = user.stats?.points || 0;
          if (pts >= 300) tier = "Grandmaster";
          else if (pts >= 150) tier = "Gold Tier";
          else if (pts >= 50) tier = "Silver Tier";
          rankTier.textContent = tier;
        }

        const joinedDate = document.getElementById("profile-joined-date");
        if (joinedDate) {
          joinedDate.textContent = user.joinedDate 
            ? new Date(user.joinedDate).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
            : "N/A";
        }

        // Stats Columns
        const gp = document.getElementById("profile-stat-games");
        const wins = document.getElementById("profile-stat-wins");
        const losses = document.getElementById("profile-stat-losses");
        const draws = document.getElementById("profile-stat-draws");
        const ratio = document.getElementById("profile-stat-ratio");
        const fav = document.getElementById("profile-stat-fav");

        if (gp) gp.textContent = user.stats?.gamesPlayed || 0;
        if (wins) wins.textContent = user.stats?.wins || 0;
        if (losses) losses.textContent = user.stats?.losses || 0;
        if (draws) draws.textContent = user.stats?.draws || 0;
        if (ratio) {
          const games = user.stats?.gamesPlayed || 0;
          const won = user.stats?.wins || 0;
          ratio.textContent = games > 0 ? `${Math.round((won / games) * 100)}%` : "0%";
        }
        if (fav) fav.textContent = user.stats?.favGame || "None";

        // Load Player Edit Profile Form Fields
        const usernameInput = document.getElementById("profile-username");
        const emailInput = document.getElementById("profile-email");
        if (usernameInput) usernameInput.value = user.username || "";
        if (emailInput) emailInput.value = user.email || "";

        // Highlight selected avatar option in picker
        const avatarPicker = document.getElementById("profile-avatar-picker");
        if (avatarPicker) {
          avatarPicker.querySelectorAll(".avatar-option").forEach(opt => {
            if (opt.dataset.avatar === String(user.avatar)) {
              opt.classList.add("selected");
            } else {
              opt.classList.remove("selected");
            }
          });
        }

        // Showroom Achievements Grid
        const showroom = document.getElementById("profile-full-achievements-list");
        if (showroom) {
          const unlockedMap = new Map(user.achievements?.map(a => [a.id, a.unlockedAt]) || []);
          
          showroom.innerHTML = ACHIEVEMENTS.map(ach => {
            const unlockedAt = unlockedMap.get(ach.id);
            const isUnlocked = !!unlockedAt;
            
            let dateStr = "";
            if (isUnlocked) {
              const dateObj = new Date(unlockedAt);
              dateStr = dateObj.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
            }

            return `
              <div class="achievement-card ${isUnlocked ? "unlocked" : "locked"}">
                <div class="achievement-badge-box">
                  <i class="fas fa-${ach.icon} ${isUnlocked ? ach.color : "text-muted"}"></i>
                </div>
                <div class="achievement-details">
                  <h4>${ach.title}</h4>
                  <p>${ach.desc}</p>
                </div>
                ${isUnlocked ? `<span class="achievement-unlock-date">Unlocked ${dateStr}</span>` : `<span class="achievement-unlock-date">Locked</span>`}
              </div>
            `;
          }).join("");
        }
      }
    } catch (e) {
      console.error("Profile rendering failed:", e);
    }
  },

  bindEvents() {
    // 1. Player Tab switches
    const playerTabBtns = document.querySelectorAll("#player-profile-view .profile-tab-btn");
    playerTabBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetTab = btn.dataset.tab;
        playerTabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        document.querySelectorAll("#player-profile-view .profile-panel").forEach(panel => {
          if (panel.id === targetTab) {
            panel.classList.add("active");
          } else {
            panel.classList.remove("active");
          }
        });
      });
    });

    // 2. Admin Tab switches
    const adminTabBtns = document.querySelectorAll("#admin-profile-view .profile-tab-btn");
    adminTabBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetTab = btn.dataset.tab;
        adminTabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        document.querySelectorAll("#admin-profile-view .profile-panel").forEach(panel => {
          if (panel.id === targetTab) {
            panel.classList.add("active");
          } else {
            panel.classList.remove("active");
          }
        });
      });
    });

    // 3. Player Avatar Picker option clicks
    const playerPicker = document.getElementById("profile-avatar-picker");
    if (playerPicker) {
      playerPicker.addEventListener("click", (e) => {
        const opt = e.target.closest(".avatar-option");
        if (opt) {
          e.preventDefault();
          playerPicker.querySelectorAll(".avatar-option").forEach(o => o.classList.remove("selected"));
          opt.classList.add("selected");
        }
      });
    }

    // 4. Admin Avatar Picker option clicks
    const adminPicker = document.getElementById("admin-profile-avatar-picker");
    if (adminPicker) {
      adminPicker.addEventListener("click", (e) => {
        const opt = e.target.closest(".avatar-option");
        if (opt) {
          e.preventDefault();
          adminPicker.querySelectorAll(".avatar-option").forEach(o => o.classList.remove("selected"));
          opt.classList.add("selected");
        }
      });
    }

    // 5. Player Edit Profile Submit
    const playerEditForm = document.getElementById("edit-profile-form");
    if (playerEditForm) {
      playerEditForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const user = await GameVerseDB.getCurrentUser();
        if (!user) return;

        const usernameVal = document.getElementById("profile-username").value.trim();
        const emailVal = document.getElementById("profile-email").value.trim();
        const selectedOpt = document.querySelector("#profile-avatar-picker .avatar-option.selected");
        const avatarVal = selectedOpt ? selectedOpt.dataset.avatar : "1";

        try {
          const updatedUser = await GameVerseDB.updateProfile(user.id, usernameVal, emailVal, avatarVal);
          const isRemembered = !!localStorage.getItem("gv_remembered_user");
          await GameVerseDB.setCurrentUser(updatedUser, isRemembered);
          ToastManager.show("Profile updated successfully!", "success");
          window.dispatchEvent(new Event("hashchange"));
        } catch (err) {
          ToastManager.show(err.message, "error");
        }
      });
    }

    // 6. Admin Edit Profile Submit
    const adminEditForm = document.getElementById("admin-edit-profile-form");
    if (adminEditForm) {
      adminEditForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const user = await GameVerseDB.getCurrentUser();
        if (!user) return;

        const usernameVal = document.getElementById("admin-profile-username").value.trim();
        const emailVal = document.getElementById("admin-profile-email").value.trim();
        const selectedOpt = document.querySelector("#admin-profile-avatar-picker .avatar-option.selected");
        const avatarVal = selectedOpt ? selectedOpt.dataset.avatar : "1";

        try {
          const updatedUser = await GameVerseDB.updateProfile(user.id, usernameVal, emailVal, avatarVal);
          const isRemembered = !!localStorage.getItem("gv_remembered_user");
          await GameVerseDB.setCurrentUser(updatedUser, isRemembered);
          ToastManager.show("Admin profile updated successfully!", "success");
          window.dispatchEvent(new Event("hashchange"));
        } catch (err) {
          ToastManager.show(err.message, "error");
        }
      });
    }

    // 7. Player Change Password Submit
    const playerPwForm = document.getElementById("change-password-form");
    if (playerPwForm) {
      playerPwForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const user = await GameVerseDB.getCurrentUser();
        if (!user) return;

        const oldPw = document.getElementById("security-old-password");
        const newPw = document.getElementById("security-new-password");
        const confirmPw = document.getElementById("security-confirm-password");

        if (newPw.value !== confirmPw.value) {
          ToastManager.show("New passwords do not match.", "error");
          return;
        }

        try {
          await GameVerseDB.changePassword(user.id, oldPw.value, newPw.value);
          ToastManager.show("Password changed successfully!", "success");
          oldPw.value = "";
          newPw.value = "";
          confirmPw.value = "";
        } catch (err) {
          ToastManager.show(err.message, "error");
        }
      });
    }

    // 8. Admin Change Password Submit
    const adminPwForm = document.getElementById("admin-change-password-form");
    if (adminPwForm) {
      adminPwForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const user = await GameVerseDB.getCurrentUser();
        if (!user) return;

        const oldPw = document.getElementById("admin-security-old-password");
        const newPw = document.getElementById("admin-security-new-password");
        const confirmPw = document.getElementById("admin-security-confirm-password");

        if (newPw.value !== confirmPw.value) {
          ToastManager.show("New passwords do not match.", "error");
          return;
        }

        try {
          await GameVerseDB.changePassword(user.id, oldPw.value, newPw.value);
          ToastManager.show("Admin password changed successfully!", "success");
          oldPw.value = "";
          newPw.value = "";
          confirmPw.value = "";
        } catch (err) {
          ToastManager.show(err.message, "error");
        }
      });
    }
  }
};
