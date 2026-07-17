// =================================
// Toast Manager
// =================================

/**
 * ToastManager - Handles floating viewport notifications.
 */
export const ToastManager = {
  /**
   * Show a notification toast
   * @param {string} message - Notification text
   * @param {string} type - 'success', 'error', 'info', or 'achievement'
   * @param {number} duration - Milliseconds to show toast
   */
  show(message, type = "info", duration = 3500) {
    let container = document.getElementById("toast-container");
    
    // Fallback if container does not exist
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    // Select icon depending on alert type
    let icon = "info-circle";
    if (type === "success") icon = "check-circle";
    else if (type === "error") icon = "exclamation-triangle";
    else if (type === "achievement") icon = "trophy";

    toast.innerHTML = `
      <i class="fas fa-${icon} toast-icon"></i>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove timing triggers
    const removeTimeout = setTimeout(() => {
      this.close(toast);
    }, duration);

    // Manual click-to-dismiss
    toast.addEventListener("click", () => {
      clearTimeout(removeTimeout);
      this.close(toast);
    });
  },

  /**
   * Triggers the slideOut keyframe and disposes DOM node
   */
  close(toast) {
    toast.classList.add("slide-out");
    toast.addEventListener("animationend", (e) => {
      if (e.animationName === "slideOutRight") {
        toast.remove();
      }
    });
  }
};
