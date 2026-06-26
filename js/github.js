/**
 * github.js
 * Live GitHub project fetcher with:
 *  - 5-minute client-side cache (localStorage)
 *  - Skeleton → card transition
 *  - Category filter bar
 *  - Language color mapping
 *  - Error / empty states
 */

(function () {
  // ============================================================
  //   CONSTANTS
  // ============================================================
  const GITHUB_USERNAME = 'Christ-abel';
  const API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=12`;
  const TOPICS_URL_BASE = `https://api.github.com/repos/${GITHUB_USERNAME}`;
  const CACHE_KEY = 'nekesa_gh_repos';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ML/AI keywords for auto-classification
  const ML_KEYWORDS = ['ml', 'ai', 'machine-learning', 'deep-learning', 'neural', 'yolo', 'ocr',
    'computer-vision', 'nlp', 'tensorflow', 'pytorch', 'sklearn', 'python', 'model', 'dataset', 'data-science'];
  const WEB_KEYWORDS = ['web', 'react', 'nextjs', 'frontend', 'backend', 'node', 'express',
    'html', 'css', 'javascript', 'api', 'fullstack', 'portfolio', 'app'];
  const AUTOMATION_KEYWORDS = ['n8n', 'automation', 'workflow', 'bot', 'scraper', 'webhook', 'cron', 'scheduler'];
  const DATA_KEYWORDS = ['data', 'analytics', 'pandas', 'etl', 'pipeline', 'database', 'sql', 'visualization', 'dashboard', 'notebook'];

  // Custom descriptions for each repo (human-written, shown instead of GitHub description)
  const REPO_DESCRIPTIONS = {
    'cheston-property-app':        'A full-stack property management app for tracking listings, tenants and rental activity in one place.',
    'Nekesa-Portifolio-':          'My personal portfolio site showcasing machine learning, computer vision, automation and web development work.',
    'AI4EAC-Finance-challenge-':   'A machine learning submission for the AI4EAC Finance Challenge, tackling predictive modeling on financial datasets.',
    'align-teams-final':           'A team collaboration tool built to help groups stay aligned on goals, tasks and project timelines.',
    'tiktok-data-analysis':        'An exploratory data analysis project examining TikTok engagement metrics to surface trends in content performance.',
    'Walumbeweb':                  'A responsive personal web project built to experiment with modern frontend layouts and design patterns.',
    'TraficVolumePrediction':      'A machine learning model that forecasts road traffic volume to support smarter urban planning decisions.',
    'LOGO-Detector':               'A computer vision system that detects and identifies brand logos in images, trained using YOLO architecture.',
    'carPricePredictor2':          'An improved car price estimator with enhanced feature engineering and better predictive accuracy than the first version.',
    'CarpricePredictor':           'A regression model that estimates the market price of used cars based on make, model, mileage and condition.',
    'real_estate_predictor-':      'A predictive model that estimates property values using location data and key real estate features.',
    'ServiceApp':                  'A service request management application for logging, tracking and resolving support tickets from start to finish.',
    'LINEAR-REGRESSION':           'A from-scratch implementation of linear regression built to deepen understanding of the algorithm and its math.',
    'myProject':                   'An early personal project used to explore development concepts, experiment with tooling and build foundational skills.',
  };

  // Language → color map (GitHub standard)
  const LANG_COLORS = {
    Python: '#3572A5',
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    'Jupyter Notebook': '#DA5B0B',
    HTML: '#e44b23',
    CSS: '#563d7c',
    Shell: '#89e051',
    C: '#555555',
    'C++': '#f34b7d',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#FA7343',
    Kotlin: '#A97BFF',
    R: '#198CE7',
  };

  // ============================================================
  //   STATE
  // ============================================================
  let allRepos = [];
  let activeFilter = 'all';

  // ============================================================
  //   DOM REFS
  // ============================================================
  const grid = document.getElementById('projects-grid');
  const errorEl = document.getElementById('projects-error');
  const emptyEl = document.getElementById('projects-empty');
  const lastUpdatedEl = document.getElementById('last-updated');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // ============================================================
  //   CACHE HELPERS
  // ============================================================
  function getCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) return data;
    } catch (_) {}
    return null;
  }

  function setCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch (_) {}
  }

  // ============================================================
  //   FETCH
  // ============================================================
  async function fetchGitHubRepos(force = false) {
    // Hide error/empty
    errorEl.style.display = 'none';
    emptyEl.style.display = 'none';

    // Check cache first
    if (!force) {
      const cached = getCached();
      if (cached) {
        allRepos = cached;
        renderRepos();
        updateLastUpdated();
        return;
      }
    }

    showSkeletons();

    try {
      const res = await fetch(API_URL, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      const repos = await res.json();

      // Filter out forks optionally, sort by stars then updated
      const filtered = repos
        .filter(r => !r.fork)
        .sort((a, b) => {
          if (b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count;
          return new Date(b.updated_at) - new Date(a.updated_at);
        });

      allRepos = filtered;
      setCache(filtered);
      renderRepos();
      updateLastUpdated();
    } catch (err) {
      console.error('[GitHub Fetch]', err);
      grid.innerHTML = '';
      errorEl.style.display = 'flex';
    }
  }

  // Expose to global for the retry button
  window.fetchGitHubRepos = fetchGitHubRepos;

  // ============================================================
  //   CLASSIFY REPO
  // ============================================================
  function classifyRepo(repo) {
    const searchText = [
      repo.name,
      repo.description || '',
      repo.language || '',
      ...(repo.topics || []),
    ].join(' ').toLowerCase();

    const categories = [];
    if (ML_KEYWORDS.some(k => searchText.includes(k))) categories.push('ml');
    if (WEB_KEYWORDS.some(k => searchText.includes(k))) categories.push('web');
    if (AUTOMATION_KEYWORDS.some(k => searchText.includes(k))) categories.push('automation');
    if (DATA_KEYWORDS.some(k => searchText.includes(k))) categories.push('data');
    return categories.length ? categories : ['other'];
  }

  // ============================================================
  //   RENDER
  // ============================================================
  function renderRepos() {
    const toShow = activeFilter === 'all'
      ? allRepos
      : allRepos.filter(repo => classifyRepo(repo).includes(activeFilter));

    grid.innerHTML = '';

    if (toShow.length === 0) {
      emptyEl.style.display = 'flex';
      return;
    }
    emptyEl.style.display = 'none';

    toShow.forEach((repo, idx) => {
      const card = buildCard(repo, idx);
      grid.appendChild(card);

      // Stagger fade-in
      requestAnimationFrame(() => {
        setTimeout(() => card.classList.add('aos-visible'), idx * 60);
      });
    });
  }

  function formatRepoName(name) {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function buildCard(repo, idx) {
    const langColor = LANG_COLORS[repo.language] || '#60A5FA';
    const name = formatRepoName(repo.name);
    const desc = REPO_DESCRIPTIONS[repo.name] || repo.description || 'A project by Christabel Nekesa.';
    const topics = (repo.topics || []).slice(0, 4);
    const categories = classifyRepo(repo);

    const card = document.createElement('article');
    card.className = 'project-card glass-card';
    card.setAttribute('data-categories', categories.join(','));
    card.setAttribute('role', 'listitem');
    card.style.transitionDelay = `${idx * 0.04}s`;

    // Build topics HTML
    const topicsHTML = topics.length
      ? `<div class="project-topics">${topics.map(t => `<span class="project-topic">${t}</span>`).join('')}</div>`
      : '';

    // Category badge
    const primaryCat = categories[0];
    const catLabels = { ml: 'ML/AI', web: 'Web Dev', automation: 'Automation', data: 'Data', other: 'Dev' };

    card.innerHTML = `
      <div class="project-card-header">
        <h3 class="project-name">${escapeHtml(name)}</h3>
        <div class="project-lang-dot">
          ${repo.language ? `<span class="lang-dot" style="background:${langColor}" title="${repo.language}"></span><span>${escapeHtml(repo.language)}</span>` : ''}
        </div>
      </div>

      <p class="project-description">${escapeHtml(desc)}</p>

      ${topicsHTML}

      <div class="project-card-footer">
        <div class="project-stats">
          <span class="project-stat" title="Stars">
            <i class="fas fa-star" aria-hidden="true"></i>
            ${repo.stargazers_count}
          </span>
          <span class="project-stat" title="Forks">
            <i class="fas fa-code-fork" aria-hidden="true"></i>
            ${repo.forks_count}
          </span>
        </div>
        <a
          href="${escapeHtml(repo.html_url)}"
          target="_blank"
          rel="noopener noreferrer"
          class="project-github-link"
          aria-label="View ${escapeHtml(name)} on GitHub"
        >
          <i class="fab fa-github" aria-hidden="true"></i>
          View on GitHub
        </a>
      </div>
    `;

    return card;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ============================================================
  //   SKELETONS
  // ============================================================
  function showSkeletons() {
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const sk = document.createElement('div');
      sk.className = 'project-skeleton glass-card';
      sk.setAttribute('aria-hidden', 'true');
      grid.appendChild(sk);
    }
  }

  // ============================================================
  //   LAST UPDATED
  // ============================================================
  function updateLastUpdated() {
    if (!lastUpdatedEl) return;
    const now = new Date();
    lastUpdatedEl.textContent = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) + ' EAT';
  }

  // ============================================================
  //   FILTER BUTTONS
  // ============================================================
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderRepos();
    });
  });

  // ============================================================
  //   AUTO-REFRESH (poll every 5 minutes)
  // ============================================================
  setInterval(() => fetchGitHubRepos(true), CACHE_TTL);

  // ============================================================
  //   INIT
  // ============================================================
  fetchGitHubRepos();
})();
