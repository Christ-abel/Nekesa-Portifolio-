/**
 * main.js
 * Core interactivity: navbar, typewriter, scroll animations,
 * mobile menu, stats counter, form handling, AOS-like system.
 */

/* ============================================================
   TYPEWRITER
   ============================================================ */
(function initTypewriter() {
  const el = document.getElementById('typewriter-text');
  if (!el) return;

  const roles = [
    'machine learning models',
    'web and software applications',
    'computer vision models',
  ];

  let roleIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let pauseFrames = 0;

  function tick() {
    const currentRole = roles[roleIdx];

    if (!isDeleting) {
      charIdx++;
      el.textContent = currentRole.slice(0, charIdx);

      if (charIdx === currentRole.length) {
        pauseFrames = 60; // hold at full word
        isDeleting = true;
        setTimeout(tick, pauseFrames * 16);
        return;
      }
      setTimeout(tick, 55 + Math.random() * 30);
    } else {
      charIdx--;
      el.textContent = currentRole.slice(0, charIdx);

      if (charIdx === 0) {
        isDeleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
        setTimeout(tick, 350);
        return;
      }
      setTimeout(tick, 28 + Math.random() * 18);
    }
  }

  setTimeout(tick, 1000);
})();

/* ============================================================
   NAVBAR
   ============================================================ */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const overlay = document.getElementById('mobile-overlay');
  const mobileLinks = overlay ? overlay.querySelectorAll('.mobile-nav-link, .mobile-cta') : [];
  const navLinks = document.querySelectorAll('.nav-link');

  // Scroll → scrolled class
  function onScroll() {
    if (window.scrollY > 40) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');

    // Active section highlight
    highlightActiveSection();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger toggle
  if (hamburger && overlay) {
    function closeMenu() {
      hamburger.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      overlay.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      overlay.setAttribute('aria-hidden', String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close when tapping the dark backdrop (outside menu items)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMenu();
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  }

  // Active section tracking
  const sections = document.querySelectorAll('section[id]');
  function highlightActiveSection() {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) current = section.getAttribute('id');
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-section') === current);
    });
  }
})();

/* ============================================================
   AOS — Animate On Scroll (viewport-aware)
   ============================================================ */
(function initAOS() {
  const elements = Array.from(document.querySelectorAll('[data-aos]'));

  function reveal(el) {
    el.classList.add('aos-visible');
  }

  function revealAll() {
    elements.forEach(el => reveal(el));
  }

  // If no real viewport exists (0x0), show everything immediately
  if (!window.innerHeight || window.innerHeight < 200) {
    revealAll();
    return;
  }

  // Real viewport — enable animation system
  document.body.classList.add('js-ready');

  function checkVisible() {
    const vh = window.innerHeight;
    elements.forEach(el => {
      if (el.classList.contains('aos-visible')) return;
      const rect = el.getBoundingClientRect();
      // Reveal when element top enters viewport (with 60px buffer)
      if (rect.top < vh + 60) reveal(el);
    });
  }

  // Check immediately and on every scroll
  checkVisible();
  window.addEventListener('scroll', checkVisible, { passive: true });
  window.addEventListener('resize', checkVisible, { passive: true });

  // Safety net: after 5s, show any still-hidden elements
  setTimeout(revealAll, 5000);
})();

/* ============================================================
   STATS COUNTER ANIMATION
   ============================================================ */
(function initStats() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (!counters.length) return;

  let started = false;

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target'), 10);
    const duration = 1800;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + (progress >= 1 ? '+' : '');
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !started) {
        started = true;
        counters.forEach(c => animateCounter(c));
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  const statsSection = document.querySelector('.stat-cards');
  if (statsSection) observer.observe(statsSection);
})();

/* ============================================================
   CONTACT FORM
   ============================================================ */
(function initContactForm() {
  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  const btn = document.getElementById('send-message-btn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic validation
    const name = form.querySelector('#contact-name').value.trim();
    const email = form.querySelector('#contact-email').value.trim();
    const message = form.querySelector('#contact-message').value.trim();

    if (!name || !email || !message) {
      showFeedback('Please fill in all required fields.', 'error');
      return;
    }

    // Button loading state
    const btnText = btn.querySelector('.btn-text');
    const btnIcon = btn.querySelector('i');
    btnText.textContent = 'Sending...';
    btnIcon.className = 'fas fa-spinner fa-spin';
    btn.disabled = true;

    try {
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        showFeedback('✅ Message sent! I\'ll get back to you soon.', 'success');
        form.reset();
      } else {
        const data = await response.json();
        const msg = data?.errors?.[0]?.message || 'Something went wrong. Please try again.';
        showFeedback('❌ ' + msg, 'error');
      }
    } catch (err) {
      showFeedback('❌ Network error. Please check your connection.', 'error');
    } finally {
      btnText.textContent = 'Send Message';
      btnIcon.className = 'fas fa-paper-plane';
      btn.disabled = false;
    }
  });

  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = 'form-feedback ' + type;
    setTimeout(() => {
      feedback.textContent = '';
      feedback.className = 'form-feedback';
    }, 6000);
  }
})();

/* ============================================================
   SMOOTH SCROLL for nav links
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navH + 1;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ============================================================
   HERO CANVAS SIZE FIX
   ============================================================ */
window.addEventListener('load', () => {
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
});
