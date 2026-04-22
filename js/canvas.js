/**
 * hero-canvas.js
 * Animated neural network / particle background for the hero section.
 * Reduces particle count on mobile for performance.
 */

(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, animFrame;

  // ---- Config ---------------------------------------------------
  const CONFIG = {
    particleCountDesktop: 90,
    particleCountMobile: 38,
    connectionDistance: 130,
    particleMaxRadius: 2.8,
    particleMinRadius: 0.8,
    speed: 0.45,
    colorBlue: '#3B82F6',
    colorPink: '#EC4899',
    colorWhite: 'rgba(248,250,252,0.6)',
    lineOpacityMax: 0.18,
    mouseInfluenceRadius: 160,
    mouseInfluenceForce: 0.012,
  };

  let mouse = { x: null, y: null };
  let isMobile = window.innerWidth < 768;

  // ---- Particle Class -------------------------------------------
  class Particle {
    constructor() { this.reset(); }

    reset(fromEdge = false) {
      if (fromEdge) {
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { this.x = Math.random() * W; this.y = -10; }
        else if (side === 1) { this.x = W + 10; this.y = Math.random() * H; }
        else if (side === 2) { this.x = Math.random() * W; this.y = H + 10; }
        else { this.x = -10; this.y = Math.random() * H; }
      } else {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
      }

      this.r = CONFIG.particleMinRadius + Math.random() * (CONFIG.particleMaxRadius - CONFIG.particleMinRadius);
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.2 + Math.random() * 0.6) * CONFIG.speed;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      const rng = Math.random();
      if (rng < 0.5) this.color = CONFIG.colorBlue;
      else if (rng < 0.8) this.color = CONFIG.colorPink;
      else this.color = CONFIG.colorWhite;

      this.alpha = 0.3 + Math.random() * 0.7;
      this.life = 0;
      this.maxLife = 400 + Math.random() * 400;
    }

    update() {
      this.life++;

      // Mouse influence
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.mouseInfluenceRadius && dist > 0) {
          const force = (CONFIG.mouseInfluenceRadius - dist) / CONFIG.mouseInfluenceRadius;
          this.vx += (dx / dist) * force * CONFIG.mouseInfluenceForce;
          this.vy += (dy / dist) * force * CONFIG.mouseInfluenceForce;
        }
      }

      // Dampen velocity
      this.vx *= 0.999;
      this.vy *= 0.999;

      this.x += this.vx;
      this.y += this.vy;

      // Fade in/out
      const lifeRatio = this.life / this.maxLife;
      if (lifeRatio < 0.1) this.alpha = lifeRatio * 10;
      else if (lifeRatio > 0.85) this.alpha = (1 - lifeRatio) / 0.15;

      // Out of bounds → reset
      if (this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20 || this.life >= this.maxLife) {
        this.reset(true);
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      // glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  // ---- Init -----------------------------------------------------
  function init() {
    resize();
    isMobile = window.innerWidth < 768;
    const count = isMobile ? CONFIG.particleCountMobile : CONFIG.particleCountDesktop;
    particles = Array.from({ length: count }, () => new Particle());
    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
  }

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  // ---- Draw connections -----------------------------------------
  function drawConnections() {
    const len = particles.length;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.connectionDistance) {
          const opacity = (1 - dist / CONFIG.connectionDistance) * CONFIG.lineOpacityMax;
          ctx.save();
          ctx.globalAlpha = opacity;
          const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          gradient.addColorStop(0, a.color);
          gradient.addColorStop(1, b.color);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // ---- Loop -----------------------------------------------------
  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawConnections();
    particles.forEach(p => { p.update(); p.draw(); });
    animFrame = requestAnimationFrame(loop);
  }

  // ---- Events ---------------------------------------------------
  window.addEventListener('resize', () => {
    resize();
    isMobile = window.innerWidth < 768;
    // Re-initialise on large resize
    const desiredCount = isMobile ? CONFIG.particleCountMobile : CONFIG.particleCountDesktop;
    if (Math.abs(particles.length - desiredCount) > 5) {
      particles = Array.from({ length: desiredCount }, () => new Particle());
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

  // ---- Start ----------------------------------------------------
  init();
})();
