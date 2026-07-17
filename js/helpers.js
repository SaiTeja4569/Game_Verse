// =================================
// Helper Utilities Module
// =================================

export const Helpers = {
  /**
   * Launch a premium canvas-based confetti blast for victories
   */
  launchConfetti() {
    // Check if there is already a canvas to prevent overlapping canvas elements
    if (document.getElementById("confetti-canvas")) return;

    const canvas = document.createElement("canvas");
    canvas.id = "confetti-canvas";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Dynamic blue, cyan, green, and accent colors from our palette
    const colors = ["#3B82F6", "#06B6D4", "#22C55E", "#F59E0B", "#EC4899", "#A855F7"];
    const particles = [];

    // Initialize particles originating from the top
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        r: Math.random() * 6 + 4,
        d: Math.random() * 100 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0
      });
    }

    let animationFrameId;
    const startTime = Date.now();

    function draw() {
      ctx.clearRect(0, 0, width, height);
      let active = false;

      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 1.5;
        p.x += Math.sin(p.tiltAngle) * 2;
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        if (p.y <= height) {
          active = true;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      // Terminate after 3.5 seconds or once all confetti leaves the screen
      if (active && Date.now() - startTime < 3500) {
        animationFrameId = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", handleResize);
        canvas.remove();
      }
    }

    draw();
  }
};
