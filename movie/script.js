
    // ==================== SAFE STORAGE HELPER ====================
    const safeStorage = {
      get: function(key) {
        try { return localStorage.getItem(key); } catch(_) { return null; }
      },
      set: function(key, val) {
        try { localStorage.setItem(key, val); } catch(_) {}
      },
      remove: function(key) {
        try { localStorage.removeItem(key); } catch(_) {}
      }
    };


    // ==================== CINEPEACE SIDEBAR ====================
    function getMenuIconPath(isOpen) {
      return isOpen
        ? '<path d="M5 5l14 14M19 5L5 19"></path>'
        : '<path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"></path>';
    }

    function setMenuToggleIcon(isOpen) {
      const btn = document.querySelector('.menu-toggle');
      if (!btn) return;

      // Keep the same icon shape so desktop/TV never ends up with a dark or disappearing icon.
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"></path></svg>';
      btn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      btn.classList.toggle('is-open', !!isOpen);

      const isLight = document.body.classList.contains('white-mode');
      btn.style.color = isLight ? 'var(--text-primary)' : '#ffffff';
      btn.style.opacity = '1';
    }

    function setSidebarState(forceOpen = null) {
      const sidebar = document.getElementById('cineSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      const stored = safeStorage.get('cine_sidebar_state') || 'open';
      const shouldOpen = isDesktop
        ? (forceOpen === null ? stored === 'open' : !!forceOpen)
        : (forceOpen === true);

      if (!sidebar || !backdrop) return;

      document.body.classList.remove('sidebar-open', 'sidebar-collapsed');
      sidebar.classList.remove('open', 'collapsed');
      backdrop.classList.remove('active');

      if (isDesktop) {
        document.body.classList.add(shouldOpen ? 'sidebar-open' : 'sidebar-collapsed');
        document.body.classList.remove('no-scroll');
        sidebar.classList.add('open');
        if (!shouldOpen) sidebar.classList.add('collapsed');
      } else if (shouldOpen) {
        document.body.classList.add('sidebar-open', 'no-scroll');
        sidebar.classList.add('open');
        backdrop.classList.add('active');
      }

      setMenuToggleIcon(document.body.classList.contains('sidebar-open'));
      window.dispatchEvent(new Event('resize'));
    }

    function toggleSidebar(open = null) {
      const sidebar = document.getElementById('cineSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      const currentlyOpen = document.body.classList.contains('sidebar-open');
      const shouldOpen = open === null ? !currentlyOpen : !!open;

      safeStorage.set('cine_sidebar_state', shouldOpen ? 'open' : 'collapsed');

      if (!sidebar || !backdrop) return;

      if (isDesktop) {
        document.body.classList.toggle('sidebar-open', shouldOpen);
        document.body.classList.toggle('sidebar-collapsed', !shouldOpen);
        document.body.classList.remove('no-scroll');
        sidebar.classList.add('open');
        sidebar.classList.toggle('collapsed', !shouldOpen);
      } else {
        document.body.classList.toggle('sidebar-open', shouldOpen);
        document.body.classList.toggle('no-scroll', shouldOpen);
        sidebar.classList.toggle('open', shouldOpen);
        backdrop.classList.toggle('active', shouldOpen);
      }

      setMenuToggleIcon(shouldOpen);
    }

    function syncSidebarOnResize() {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      const sidebar = document.getElementById('cineSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (!sidebar || !backdrop) return;

      const stored = safeStorage.get('cine_sidebar_state') || 'open';
      const shouldOpen = isDesktop ? stored === 'open' : false;

      document.body.classList.remove('sidebar-open', 'sidebar-collapsed');
      sidebar.classList.remove('open', 'collapsed');
      backdrop.classList.remove('active');

      if (isDesktop) {
        document.body.classList.add(shouldOpen ? 'sidebar-open' : 'sidebar-collapsed');
        document.body.classList.remove('no-scroll');
        sidebar.classList.add('open');
        if (!shouldOpen) sidebar.classList.add('collapsed');
      } else if (shouldOpen) {
        document.body.classList.add('sidebar-open', 'no-scroll');
        sidebar.classList.add('open');
        backdrop.classList.add('active');
      }

      setMenuToggleIcon(shouldOpen);
    }

    // ==================== CONFIGURATION ====================
    const CONFIG = {
      API_KEY: '493d138156697ffeb0e02bc492f5136f',
      BASE_URL: 'https://api.themoviedb.org/3',
      IMG_BASE: 'https://image.tmdb.org/t/p',
      PLAYER_BASE: 'https://api.mhpu.fun/?tmdb=',
      TELEGRAM_URL: 'https://t.me/cinepeaceupdate',
      DOWNLOAD_SERVERS: [
        { name: 'Server 1 - Vidsrc', base: 'https://dl.vidsrc.vip' },
        { name: 'Server 2 - Vidsrc', base: 'https://dl.vidsrc.vip' }
      ]
    };
function resetPlayer() {
  finalizeContinueWatchingSession();
  const iframe = document.getElementById('inlinePlayer');
  const videoBox = document.getElementById('detailsVideo');
  const banner = document.getElementById('detailsBanner');
  const backdrop = document.getElementById('detailsBackdrop');

  if (iframe) iframe.src = "";
  if (videoBox) videoBox.classList.remove('playing');
  if (banner) banner.classList.remove('player-active');

  if (backdrop) {
    backdrop.style.backgroundImage = "none";
    backdrop.style.backgroundColor = "#000";
  }
}
function playTrailer(id, type) {
  const videoBox = document.getElementById("detailsVideo");
  const iframe = document.getElementById("inlinePlayer");

  const videos = state.currentDetails?.videos?.results || [];

  const trailer = videos.find(
    v => v.type === "Trailer" && v.site === "YouTube"
  );

  if (!trailer) {
    showToast("Trailer not available 😢", "error");
    return;
  }

  iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`;
  videoBox.classList.add("playing");
  document.getElementById('detailsBanner')?.classList.add('player-active');

  // optional cleanup
  const serverList = document.getElementById("serverList");
  if (serverList) serverList.innerHTML = "";
}
    // ==================== STATE ====================
    const state = {
      currentPage: 'home',
      previousPage: null,
      selectedCategory: safeStorage.get('streamflix_category') || 'action',
      language: safeStorage.get('streamflix_language') || 'en-US',
      profileName: safeStorage.get('streamflix_profile') || 'User',
      profileEmail: safeStorage.get('streamflix_profile_email') || '',
      profileAvatar: safeStorage.get('streamflix_profile_avatar') || '',
      themeColor: safeStorage.get('streamflix_theme') || 'red',
      appearanceMode: safeStorage.get('streamflix_appearance') || 'dark',
      bookmarks: JSON.parse(safeStorage.get('streamflix_bookmarks') || '[]'),
      currentItem: null,
      currentType: 'movie',
      currentDetails: null,
      selectedSeason: 1,
      selectedEpisode: 1,
      currentEpisodeInfo: null,
      currentServerIndex: 0,
      playerStarted: false,
      heroSlideIndex: 0,
      heroSlideTimer: null,
      heroItems: [],
      searchTimeout: null,
      isLoading: false,
      lastSearchQuery: safeStorage.get('streamflix_last_search_query') || '',
      lastSearchResults: JSON.parse(safeStorage.get('streamflix_last_search_results') || 'null')
    };

    const LANGUAGE_NAMES = {
      'en-US': 'English',
      'hi-IN': 'Hindi',
      'ta-IN': 'Tamil',
      'te-IN': 'Telugu',
      'ml-IN': 'Malayalam'
    };

    function getLanguageLabel(lang) {
      return LANGUAGE_NAMES[lang] || 'English';
    }

    function syncLanguageUI() {
      document.documentElement.lang = state.language || 'en-US';
      document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.lang === state.language);
      });
      const label = document.getElementById('settingsLanguageValue');
      if (label) label.textContent = getLanguageLabel(state.language);
    }

    function refreshLanguageSensitiveView() {
      if (state.currentPage === 'home') {
        loadHomeContent();
      } else if (state.currentPage === 'settings') {
        loadSettings();
      } else if (state.currentPage === 'search') {
        restoreSearchState();
      } else if (state.currentPage === 'bookmarks') {
        loadBookmarks();
      } else if (state.currentPage === 'history') {
        loadHistoryPage();
      } else if (state.currentPage === 'category') {
        loadCategoryPage(state.selectedCategory);
      }
    }

    // ==================== UTILITY FUNCTIONS ====================
    function getImageUrl(path, size = 'w500') {
  if (!path) {
    return 'https://via.placeholder.com/300x450/141414/808080?text=No+Image';
  }
  return `${CONFIG.IMG_BASE}/${size}${path}`;
}
    function getBackdropUrl(path) {
      if (!path) return null;
      return `${CONFIG.IMG_BASE}/original${path}`;
    }

    function fetchTMDB(endpoint, params = {}) {
      const searchParams = new URLSearchParams({
        api_key: CONFIG.API_KEY,
        language: state.language,
        ...params
      });
      return new Promise(function(resolve) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', CONFIG.BASE_URL + endpoint + '?' + searchParams, true);
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch(e) { resolve(null); }
          } else { resolve(null); }
        };
        xhr.onerror = function() { resolve(null); };
        xhr.send();
      });
    }

    function createSlug(title, id) {
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return `${id}-${slug}`;
    }

    function parseSlug(slug) {
      if (!slug) return null;
      const decoded = decodeURIComponent(slug);
      const match = decoded.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    }

    // ==================== CONTINUE WATCHING ====================
    const CONTINUE_WATCHING_KEY = 'streamflix_continue_watching';

    function getContinueWatchingList() {
      try {
        const raw = safeStorage.get(CONTINUE_WATCHING_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
          ? parsed.sort((a, b) => (b.lastUpdatedAt || 0) - (a.lastUpdatedAt || 0))
          : [];
      } catch (error) {
        console.error('Failed to read continue watching list:', error);
        return [];
      }
    }

    function saveContinueWatchingList(list) {
      try {
        const normalized = Array.isArray(list) ? list.slice(0, 12) : [];
        safeStorage.set(CONTINUE_WATCHING_KEY, JSON.stringify(normalized));
      } catch (error) {
        console.error('Failed to save continue watching list:', error);
      }
    }

    function getContinueKey(type, id) {
      return `${type}:${id}`;
    }

    function getEstimatedMinutes(details, type, episodeInfo = {}) {
      if (type === 'movie') {
        return Number(details?.runtime) || 120;
      }

      const episodeRuntime = Number(episodeInfo.runtime) || 0;
      if (episodeRuntime > 0) return episodeRuntime;

      const runtimes = Array.isArray(details?.episode_run_time) ? details.episode_run_time.filter(Boolean) : [];
      if (runtimes.length) return Number(runtimes[0]) || 45;

      return 45;
    }

    function getContinueProgress(entry) {
      const runtimeMinutes = Math.max(1, Number(entry.runtimeMinutes) || (entry.mediaType === 'movie' ? 120 : 45));
      const watchedSeconds = Math.max(0, Number(entry.watchedSeconds) || 0);
      const progress = Math.round((watchedSeconds / (runtimeMinutes * 60)) * 100);
      return Math.max(1, Math.min(99, progress || 0));
    }

    function upsertContinueWatching(details, type, meta = {}) {
      if (!details || !details.id) return;
      const ck = getContinueKey(type, details.id);
      if (getRemovedContinueKeys().includes(ck)) return;

      const list = getContinueWatchingList();
      const key = getContinueKey(type, details.id);
      const now = Date.now();
      const existingIndex = list.findIndex(item => item.key === key);
      const existing = existingIndex >= 0 ? list[existingIndex] : null;
      const previousStarted = existing?.playStartedAt || 0;
      const elapsedSeconds = previousStarted ? Math.max(0, Math.round((now - previousStarted) / 1000)) : 0;

      const entry = {
        key,
        id: details.id,
        mediaType: type,
        title: details.title || details.name || 'Untitled',
        poster_path: details.poster_path || '',
        backdrop_path: details.backdrop_path || '',
        overview: details.overview || '',
        watchedSeconds: (existing?.watchedSeconds || 0) + elapsedSeconds,
        playStartedAt: now,
        lastUpdatedAt: now,
        season: type === 'tv' ? (meta.season || existing?.season || 1) : null,
        episode: type === 'tv' ? (meta.episode || existing?.episode || 1) : null,
        totalEpisodes: type === 'tv' ? (meta.totalEpisodes || existing?.totalEpisodes || null) : null,
        totalSeasons: type === 'tv' ? (meta.totalSeasons || existing?.totalSeasons || null) : null,
        episodeTitle: type === 'tv' ? (meta.episodeTitle || existing?.episodeTitle || '') : '',
        runtimeMinutes: getEstimatedMinutes(details, type, meta.episodeInfo || existing?.episodeInfo || {}),
        progress: 0
      };

      entry.progress = getContinueProgress(entry);
      if (existingIndex >= 0) {
        list.splice(existingIndex, 1);
      }
      list.unshift(entry);
      saveContinueWatchingList(list);
    }

    function finalizeContinueWatchingSession() {
      const current = state.currentItem;
      const details = state.currentDetails;
      if (!current || !details) return;

      const list = getContinueWatchingList();
      const key = getContinueKey(state.currentType, current.id);
      const index = list.findIndex(item => item.key === key);
      if (index < 0) return;

      const entry = list[index];
      if (!entry.playStartedAt) return;

      const elapsedSeconds = Math.max(0, Math.round((Date.now() - entry.playStartedAt) / 1000));
      entry.watchedSeconds = (entry.watchedSeconds || 0) + elapsedSeconds;
      entry.playStartedAt = null;
      entry.lastUpdatedAt = Date.now();
      entry.progress = getContinueProgress(entry);

      if (entry.progress >= 95) {
        list.splice(index, 1);
      } else {
        list[index] = entry;
      }

      saveContinueWatchingList(list);
    }

    const CONTINUE_REMOVED_KEY = 'streamflix_continue_removed';

    function getRemovedContinueKeys() {
      try { return JSON.parse(safeStorage.get(CONTINUE_REMOVED_KEY) || '[]'); } catch(_) { return []; }
    }

    function addRemovedContinueKey(key) {
      const keys = getRemovedContinueKeys().filter(k => k !== key);
      keys.unshift(key);
      try { safeStorage.set(CONTINUE_REMOVED_KEY, JSON.stringify(keys.slice(0, 50))); } catch(_) {}
    }

    function removeContinueWatching(triggerOrKey, maybeKey) {
      const key = typeof triggerOrKey === 'string' ? triggerOrKey : maybeKey;
      const button = triggerOrKey && typeof triggerOrKey !== 'string' ? triggerOrKey : null;
      if (!key) return;

      const list = getContinueWatchingList().filter(item => item.key !== key);
      saveContinueWatchingList(list);
      addRemovedContinueKey(key);

      const safeKey = typeof CSS !== 'undefined' && CSS.escape
        ? CSS.escape(String(key))
        : String(key).replace(/[\"']/g, '\\$&');
      const card = button?.closest('.continue-watching-card') || document.querySelector(`.continue-watching-card[data-continue-key="${safeKey}"]`);
      if (card) {
        card.style.transition = 'opacity 0.24s ease, transform 0.24s ease, width 0.24s ease, margin 0.24s ease, padding 0.24s ease, flex-basis 0.24s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px) scale(0.92)';
        card.style.width = '0px';
        card.style.minWidth = '0px';
        card.style.flexBasis = '0px';
        card.style.marginLeft = '0px';
        card.style.marginRight = '0px';
        card.style.padding = '0px';
        card.style.overflow = 'hidden';

        setTimeout(() => {
          card.remove();

          const row = document.getElementById('row-continuewatching');
          if (row && !row.children.length) {
            const cwRow = row.closest('.cw-row');
            if (cwRow) cwRow.remove();
          }
        }, 220);
      }

      if (state.currentPage === 'history') {
        loadHistoryPage();
      }

      showToast('Removed from Continue Watching', 'info');
    }

    function clearContinueWatching() {
      safeStorage.remove(CONTINUE_WATCHING_KEY);
      if (state.currentPage === 'home') {
        loadHomeContent();
      }
      if (state.currentPage === 'history') {
        loadHistoryPage();
      }
      showToast('Continue Watching cleared', 'success');
    }

    function createContinueWatchingCard(entry, index = 0) {
      const title = entry.title || 'Untitled';
      const progress = Math.max(1, Math.min(99, Number(entry.progress) || getContinueProgress(entry)));
      const imagePath = entry.backdrop_path || entry.poster_path;
      const typeLabel = entry.mediaType === 'tv' ? 'TV' : 'MOVIE';
      const seasonEpisode = entry.mediaType === 'tv'
        ? `S${entry.season || 1} • E${entry.episode || 1}`
        : `${Math.round(progress)}% watched`;
      const runtimeText = entry.mediaType === 'tv'
        ? `${entry.totalSeasons ? `${entry.totalSeasons} seasons` : 'Series'}`
        : `${entry.runtimeMinutes || 0} min`;
      const yearText = entry.year || '';
      const progressWidth = `${progress}%`;

      return `
        <div class="continue-watching-card" data-continue-key="${entry.key}" onclick="openDetails(${entry.id}, '${entry.mediaType}')" style="animation-delay: ${index * 0.05}s">
          <img src="${getImageUrl(imagePath, 'w780')}" alt="${escapeHtml(title)}" loading="lazy">
          <div class="continue-watching-overlay">
            <div class="continue-watching-top">
              <span class="continue-badge ${entry.mediaType === 'tv' ? 'tv' : 'movie'}">
                <i class="fas fa-${entry.mediaType === 'tv' ? 'tv' : 'film'}"></i> ${typeLabel}
              </span>
              <button class="continue-remove" onclick="event.stopPropagation(); removeContinueWatching(this, '${entry.key}')" title="Remove">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div>
              <div class="continue-watching-title">${escapeHtml(title)}</div>
              <div class="continue-watching-meta">
                ${entry.mediaType === 'tv' ? `<span><i class="fas fa-layer-group"></i> ${seasonEpisode}</span>` : `<span><i class="fas fa-clock"></i> ${runtimeText}</span>`}
                ${yearText ? `<span><i class="fas fa-calendar"></i> ${yearText}</span>` : ''}
                <span><i class="fas fa-play-circle"></i> Resume</span>
              </div>
              <div class="continue-progress-wrap">
                <div class="continue-progress-text">
                  <span>${seasonEpisode}</span>
                  <span>${progress}%</span>
                </div>
                <div class="continue-progress-bar"><span style="width:${progressWidth}"></span></div>
              </div>
            </div>
          </div>
        </div>
      `;

    }

    function createContinueWatchingRow() {
      const items = getContinueWatchingList();
      if (!items.length) return '';

      return `
        <div class="movie-row cw-row">
          <div class="row-header">
            <h2 class="row-title"><i class="fas fa-clock-rotate-left"></i> Continue Watching</h2>
            <a href="#" class="row-see-all" onclick="navigateTo('history'); return false;">View all <i class="fas fa-chevron-right"></i></a>
          </div>
          <div class="row-container">
            <button class="row-arrow left" onclick="scrollRow('continuewatching', 'left')">
              <i class="fas fa-chevron-left"></i>
            </button>
            <div class="row-slider hide-scrollbar" id="row-continuewatching">
              ${items.map((item, i) => createContinueWatchingCard(item, i)).join('')}
            </div>
            <button class="row-arrow right" onclick="scrollRow('continuewatching', 'right')">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      `;

    }

    // ==================== RIPPLE EFFECT ====================
    function createRipple(event, element) {
      const rect = element.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
      element.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .nav-item, .language-btn, .movie-card');
      if (btn) createRipple(e, btn);
    });

    // ==================== TOAST NOTIFICATIONS ====================
    function showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
      toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('exit');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    // ==================== LANGUAGE SELECTION ====================
    function showLanguagePopup() {
      const overlay = document.getElementById('languageOverlay');
      overlay.classList.add('active');
      document.body.classList.add('no-scroll');
      syncLanguageUI();
    }

    function selectLanguage(lang) {
      if (!lang) return;
      state.language = lang;
      safeStorage.set('streamflix_language', lang);
      document.documentElement.lang = lang;

      const overlay = document.getElementById('languageOverlay');
      overlay.classList.remove('active');
      document.body.classList.remove('no-scroll');

      syncLanguageUI();
      showToast('Language updated!', 'success');
      refreshLanguageSensitiveView();
    }

    // ==================== THEME COLOR ====================
    const THEME_PALETTE = {
      red: '#e50914',
      blue: '#0077ff',
      green: '#00c853',
      purple: '#9c27b0',
      orange: '#ff5722',
      teal: '#00bcd4',
      lime: '#cddc39',
      cyan: '#18ffff',
      rose: '#ff4d6d'
    };

    /* renderThemeColors defined in cinepeace-player-gradient-footer-fixes script */

    function syncProfileSettingsInputs() {
      const nameEl = document.getElementById('profileNameInput');
      const emailEl = document.getElementById('profileEmailInput');
      if (nameEl) nameEl.value = state.profileName || 'User';
      if (emailEl) emailEl.value = state.profileEmail || '';
    }

    function setThemeColor(color) {
      const selected = Object.prototype.hasOwnProperty.call(THEME_PALETTE, color) ? color : 'red';
      const hex = THEME_PALETTE[selected];
      state.themeColor = selected;
      safeStorage.set('streamflix_theme', selected);
      document.documentElement.style.setProperty('--primary', hex);
      document.documentElement.style.setProperty('--primary-hover', hex);
      document.documentElement.style.setProperty('--primary-glow', hex + '66');
      renderThemeColors();
      showToast('Theme updated!', 'success');
    }

    function applyAppearanceMode(mode) {
      state.appearanceMode = mode === 'light' ? 'light' : 'dark';
      document.body.classList.toggle('white-mode', state.appearanceMode === 'light');
    }

    function setAppearanceMode(mode) {
      applyAppearanceMode(mode);
      safeStorage.set('streamflix_appearance', state.appearanceMode);
      showToast(state.appearanceMode === 'light' ? 'White mode enabled' : 'Dark mode enabled', 'success');
      if (state.currentPage === 'settings') loadSettings();
    }

    // ==================== NAVIGATION ====================
    function navigateTo(page, pushState = true) {
      resetPlayer();
      const pages = ['home', 'search', 'bookmarks', 'history', 'category', 'settings', 'details'];
      if (!pages.includes(page)) return;

      state.previousPage = state.currentPage;
      state.currentPage = page;

      if (pushState && page !== 'details') {
        const url = page === 'home' ? '#/' : `#/${page}`;
        history.pushState({ page }, '', url);
      }

      document.querySelectorAll('.page').forEach(p => {
        const isTarget = p.id === `${page}Page`;
        if (isTarget) {
          p.classList.remove('exit');
          p.classList.add('active');
        } else if (p.classList.contains('active')) {
          p.classList.add('exit');
          setTimeout(() => {
            p.classList.remove('active', 'exit');
          }, 150);
        }
      });

      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
      });
      document.querySelectorAll('.cine-side-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
      });

      if (!window.matchMedia('(min-width: 1024px)').matches) {
        toggleSidebar(false);
      } else {
        setMenuToggleIcon(document.body.classList.contains('sidebar-open') && !document.body.classList.contains('sidebar-collapsed'));
      }

      if (page === 'home') {
        loadHomeContent();
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      

      if (page === 'details') {
        document.body.classList.add('hide-header');
      } else {
        document.body.classList.remove('hide-header');
      }

      if (page === 'search') {
        setTimeout(() => document.getElementById('searchInput')?.focus(), 300);
        restoreSearchState();
      } else if (page === 'bookmarks') {
        loadBookmarks();
      } else if (page === 'history') {
        loadHistoryPage();
      } else if (page === 'category') {
        loadCategoryPage(state.selectedCategory || 'action');
      } else if (page === 'settings') {
        loadSettings();
      }
    }

    function goBack() {
      if (window.history.length > 1) {
        history.back();
      } else if (state.previousPage && state.previousPage !== 'details') {
        navigateTo(state.previousPage);
      } else {
        navigateTo('home');
      }
    }

    // ==================== BROWSER BACK / FORWARD ====================
window.addEventListener('popstate', () => {
  if (location.hash) {
    handleDeepLink();
  } else {
    navigateTo('home', false);
  }
});

window.addEventListener('beforeunload', () => {
  finalizeContinueWatchingSession();
});

    // ==================== HERO SLIDER ====================
    function createHeroSlide(item, index) {
      const title = item.title || item.name;
      const year = (item.release_date || item.first_air_date || '').split('-')[0];
      const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
      const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
      const trailerKey = item.trailer_key || null;
      
      return `
        <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
          <div class="hero-backdrop" style="background-image: url('${getBackdropUrl(item.backdrop_path)}')"></div>
          ${trailerKey ? `
            <div class="hero-video" data-trailer="${trailerKey}"></div>
          ` : ''}
          <div class="hero-gradient"></div>
          <div class="hero-content">
            <div class="hero-tag"><i class="fas fa-fire"></i> Trending #${index + 1}</div>
            <h1 class="hero-title">${title}</h1>
            <div class="hero-meta">
              <span class="hero-rating"><i class="fas fa-star"></i> ${rating}</span>
              <span class="hero-year">${year}</span>
              <span>${type === 'tv' ? 'TV Series' : 'Movie'}</span>
            </div>
            <p class="hero-overview">${item.overview || 'No description available.'}</p>
            <div class="hero-buttons">
              <button class="btn btn-primary" onclick="playItem(${item.id}, '${type}')">
                <i class="fas fa-play"></i> Play
              </button>
              <button class="btn btn-secondary" onclick="openDetails(${item.id}, '${type}')">
                <i class="fas fa-info-circle"></i> More Info
              </button>
            </div>
          </div>
        </div>
      `;

    }

    function createHeroIndicator(index) {
      return `<div class="hero-indicator ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="goToHeroSlide(${index})"></div>`;
    }

    function goToHeroSlide(index) {
      const slides = document.querySelectorAll('.hero-slide');
      const indicators = document.querySelectorAll('.hero-indicator');
      
      slides.forEach((slide, i) => {
        const isActive = i === index;
        slide.classList.toggle('active', isActive);
        
        if (isActive) {
          const video = slide.querySelector('.hero-video');
          if (video && video.dataset.trailer) {
            video.innerHTML = `
              <iframe src="https://www.youtube.com/embed/${video.dataset.trailer}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${video.dataset.trailer}" 
                      frameborder="0" 
                      allow="autoplay; encrypted-media" 
                      allowfullscreen>
              </iframe>
            `;
            video.classList.add('playing');
          }
        } else {
          const video = slide.querySelector('.hero-video');
          if (video) {
            video.innerHTML = '';
            video.classList.remove('playing');
          }
        }
      });
      
      indicators.forEach((ind, i) => {
        ind.classList.toggle('active', i === index);
      });
      
      state.heroSlideIndex = index;
      resetHeroTimer();
    }

    function nextHeroSlide() {
      const nextIndex = (state.heroSlideIndex + 1) % state.heroItems.length;
      goToHeroSlide(nextIndex);
    }

    function startHeroTimer() {
      state.heroSlideTimer = setInterval(nextHeroSlide, 6000);
    }

    function resetHeroTimer() {
      clearInterval(state.heroSlideTimer);
      startHeroTimer();
    }

    // ==================== CONTENT ROWS ====================
    function createSkeletonRow(title) {
      return `
        <div class="movie-row">
          <div class="row-header">
            <h2 class="row-title">${title}</h2>
          </div>
          <div class="row-container">
            <div class="row-slider hide-scrollbar">
              ${Array(6).fill().map(() => '<div class="skeleton skeleton-card poster"></div>').join('')}
            </div>
          </div>
        </div>
      `;

    }

    function createMovieRow(title, items, icon = 'fa-film', type = 'poster') {
      if (!items || !items.length) return '';
      
      const rowId = title.replace(/\s+/g, '').toLowerCase();
      
      return `
        <div class="movie-row">
          <div class="row-header">
            <h2 class="row-title"><i class="fas ${icon}"></i> ${title}</h2>
            <a href="#" class="row-see-all" onclick="navigateTo('search'); return false;">See All <i class="fas fa-chevron-right"></i></a>
          </div>
          <div class="row-container">
            <button class="row-arrow left" onclick="scrollRow('${rowId}', 'left')">
              <i class="fas fa-chevron-left"></i>
            </button>
            <div class="row-slider hide-scrollbar" id="row-${rowId}">
              ${items.map((item, i) => createMovieCard(item, type, i)).join('')}
            </div>
            <button class="row-arrow right" onclick="scrollRow('${rowId}', 'right')">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      `;

    }

        function createMovieCard(item, type = 'poster', index = 0) {
      const title = item.title || item.name || 'Unknown';
      const imagePath = type === 'poster' ? item.poster_path : (item.backdrop_path || item.poster_path);
      const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
      const year = (item.release_date || item.first_air_date || '').split('-')[0];
      const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
      const overview = (item.overview || 'No description available.').trim();

      return `
        <div class="movie-card ${type}" onclick="openDetails(${item.id}, '${mediaType}')" style="animation-delay: ${index * 0.05}s">
          <img src="${getImageUrl(imagePath, type === 'poster' ? 'w300' : 'w500')}" alt="${title}" loading="lazy">
          <div class="card-badge"><i class="fas fa-star"></i> ${rating}</div>
          <div class="card-play"><i class="fas fa-play"></i></div>
          <div class="card-overlay">
            <div class="card-title">${title}</div>
            <div class="card-meta">
              <span class="card-rating"><i class="fas fa-star"></i> ${rating}</span>
              <span>${year}</span>
            </div>
            <div class="card-overview">${overview}</div>
          </div>
        </div>
      `;

    }

    function scrollRow(rowId, direction) {
      const row = document.getElementById(`row-${rowId}`);
      if (!row) return;
      const scrollAmount = row.clientWidth * 0.8;
      row.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }

// ==================== HOME CONTENT ====================
async function loadHomeContent() {
  const heroSlider = document.getElementById('heroSlider');
  const contentRows = document.getElementById('contentRows');
  
  // Strict Filter: আজকের তারিখ (April 1, 2026)
  const today = new Date().toISOString().split('T')[0]; 

  contentRows.innerHTML = [
    createSkeletonRow('Recently Released'),
    createSkeletonRow('Continue Watching'),
    createSkeletonRow('Action & Adventure'),
    createSkeletonRow('Animations'),
    createSkeletonRow('Anime Collection'),
    createSkeletonRow('K-Dramas'),
    createSkeletonRow('Horror Night'),
    createSkeletonRow('Drama & Comedy'),
    createSkeletonRow('Sci-Fi Masterpieces'),
    createSkeletonRow('Marvel Universe'),
    createSkeletonRow('DC World'),
    createSkeletonRow('Upcoming 2026')
  ].join('');

  try {
    // কমন সেটিংস: ভোট থাকতে হবে এবং রিলিজড হতে হবে
    const common = { 
      'primary_release_date.lte': today, 
      'vote_count.gte': 50, // N/A রেটিং বা ফেক মুভি আটকানোর জন্য
      'with_runtime.gte': 60, // শর্ট ফিল্ম বাদ দেওয়ার জন্য
      sort_by: 'primary_release_date.desc' 
    };

    const [trending, recentWorld, actionAdv, animations, anime, kDramas, horror, dramaComedy, sciFi, marvel, dc, upcoming2026] = await Promise.all([
      fetchTMDB('/trending/all/day'),

      // 1. Recent Worldwide (Bangla, Hindi, English mix)
      fetchTMDB('/discover/movie', { ...common, 'vote_count.gte': 10 }), 

      // 2. Action & Adventure
      fetchTMDB('/discover/movie', { ...common, with_genres: '28,12' }),

      // 3. Animations
      fetchTMDB('/discover/movie', { ...common, with_genres: '16' }),

      // 4. Anime (Japan Only)
      fetchTMDB('/discover/movie', { ...common, with_genres: '16', with_original_language: 'ja' }),

      // 5. K-Dramas (TV Series)
      fetchTMDB('/discover/tv', { 'first_air_date.lte': today, with_original_language: 'ko', 'vote_count.gte': 20, sort_by: 'first_air_date.desc' }),

      // 6. Horror
      fetchTMDB('/discover/movie', { ...common, with_genres: '27' }),

      // 7. Drama & Comedy
      fetchTMDB('/discover/movie', { ...common, with_genres: '18,35' }),

      // 8. Sci-Fi (Backdrop)
      fetchTMDB('/discover/movie', { ...common, with_genres: '878' }),

      // 9. Marvel
      fetchTMDB('/discover/movie', { ...common, with_companies: '420' }),

      // 10. DC (Icon Fixed)
      fetchTMDB('/discover/movie', { ...common, with_companies: '9993' }),

      // 11. Upcoming (Only Future - No N/A)
      fetchTMDB('/discover/movie', { 'primary_release_date.gte': '2026-04-02', sort_by: 'primary_release_date.asc' })
    ]);

    contentRows.innerHTML = [
      createMovieRow('Recently Released ', recentWorld?.results, 'fa-globe', 'poster'),
      createContinueWatchingRow(),
      createMovieRow('Action & Adventure', actionAdv?.results, 'fa-bolt', 'poster'),
      createMovieRow('Animations', animations?.results, 'fa-dragon', 'poster'),
      createMovieRow('Anime Collection', anime?.results, 'fa-clapperboard', 'poster'),
      createMovieRow('K-Dramas', kDramas?.results, 'fa-heart', 'backdrop'),
      createMovieRow('Horror Night', horror?.results, 'fa-ghost', 'poster'),
      createMovieRow('Drama & Comedy', dramaComedy?.results, 'fa-masks-theater', 'poster'),
      createMovieRow('Sci-Fi Masterpieces', sciFi?.results, 'fa-rocket', 'backdrop'),
      createMovieRow('Marvel Universe', marvel?.results, 'fa-mask', 'poster'),
      createMovieRow('DC World', dc?.results, 'fa-shield-halved', 'poster'),
      createMovieRow('Upcoming 2026', upcoming2026?.results, 'fa-calendar-plus', 'poster')
    ].join('');

    // Slider logic
    const heroItems = trending?.results?.slice(0, 6) || [];
    state.heroItems = heroItems;
    document.getElementById('heroSlider').innerHTML = heroItems.map((item, i) => createHeroSlide(item, i)).join('');
    document.getElementById('heroIndicators').innerHTML = heroItems.map((_, i) => createHeroIndicator(i)).join('');
    if (heroItems.length > 1) startHeroTimer();

  } catch (error) { console.error(error); }
}

    // ==================== DETAILS PAGE ====================
    async function openDetails(id, type = 'movie', pushState = true) {
      finalizeContinueWatchingSession();
      const backdrop = document.getElementById('detailsBackdrop');
      backdrop.style.backgroundImage = "none";
      backdrop.style.backgroundColor = "#000"; // instant black
      document.getElementById('detailsBanner')?.classList.remove('player-active');
      if (state.isLoading) return;
      state.isLoading = true;
      
      state.currentItem = { id, type };
      state.currentType = type;
      state.selectedSeason = 1;
      state.selectedEpisode = 1;
      state.currentEpisodeInfo = null;
      state.currentServerIndex = 0;
      state.playerStarted = false;
      document.getElementById('detailsBanner')?.classList.remove('player-started');
      
      showDetailsLoading();
      navigateTo('details', false);
      
      try {
        const details = await fetchTMDB(`/${type}/${id}`, { append_to_response: 'videos,credits,external_ids' });
        
        if (!details || details.success === false) {
          throw new Error('Content not found');
        }
        
        state.currentDetails = details;
        
        const url = `#/${type}/${id}`;

if (pushState) {
  history.pushState({ type, id }, '', url);
}
        
        renderDetails(details, type);
        const topTag = document.getElementById('topTag');

topTag.innerHTML = `
  <i class="fas fa-${type === 'tv' ? 'tv' : 'film'}"></i> 
  ${type === 'tv' ? 'TV SERIES' : 'MOVIE'}
`;
      } catch (error) {
        console.error('Failed to load details:', error);
        showDetailsError(id, type);
      } finally {
        state.isLoading = false;
      }
    }

    function showDetailsLoading() {
      document.getElementById('detailsBackdrop').style.backgroundImage = '';
      const detailsPosterEl = document.getElementById('detailsPoster');
      if (detailsPosterEl) {
        detailsPosterEl.innerHTML = '<div class="skeleton" style="width: 100%; height: 100%;"></div>';
      }
      document.getElementById('detailsInfo').innerHTML = `
        <div class="skeleton" style="width: 80px; height: 24px; margin-bottom: 12px;"></div>
        <div class="skeleton" style="width: 80%; height: 48px; margin-bottom: 12px;"></div>
        <div class="skeleton" style="width: 60%; height: 20px; margin-bottom: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 80px; margin-bottom: 24px;"></div>
        <div style="display: flex; gap: 12px; margin-bottom: 30px;">
          <div class="skeleton" style="width: 120px; height: 44px; border-radius: 6px;"></div>
          <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%;"></div>
          <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%;"></div>
        </div>
      `;

    }

    function showDetailsError(id, type) {
      document.getElementById('detailsInfo').innerHTML = `
        <div class="empty-state" style="text-align: left; padding: 40px 0;">
          <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--primary); margin-bottom: 20px;"></i>
          <h3 style="color: var(--text-primary); margin-bottom: 8px;">Failed to load content</h3>
          <p style="margin-bottom: 20px;">Please check your connection and try again.</p>
          <button class="btn btn-primary" onclick="openDetails(${id}, '${type}')">
            <i class="fas fa-redo"></i> Retry
          </button>
          <button class="btn btn-secondary" onclick="navigateTo('home')" style="margin-left: 12px;">
            <i class="fas fa-home"></i> Go Home
          </button>
        </div>
      `;

    }

    function renderDetails(details, type) {
      const title = details.title || details.name;
      const year = (details.release_date || details.first_air_date || '').split('-')[0];
      const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
      const matchScore = Math.round((details.vote_average || 0) * 10);
      const runtime = type === 'movie' 
        ? (details.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : '')
        : (details.number_of_seasons ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? 's' : ''}` : '');
      
      const country = details.production_countries?.[0]?.iso_3166_1 || details.origin_country?.[0] || '';
      
      const backdropUrl = getBackdropUrl(details.backdrop_path);
      if (backdropUrl) {
        document.getElementById('detailsBackdrop').style.backgroundImage = `url('${backdropUrl}')`;
      }
      
      const detailsPosterEl = document.getElementById('detailsPoster');
      if (detailsPosterEl) {
        detailsPosterEl.innerHTML = `<img src="${getImageUrl(details.poster_path, 'w300')}" alt="${title}">`;
      }
      
      const isBookmarked = state.bookmarks.some(b => b.id === details.id && b.type === type);
      
      const genres = (details.genres || []).map((g, i) => 
        `<span class="genre-pill" style="animation-delay: ${i * 0.1}s">${g.name}</span>`
      ).join('');
      
      const castData = details.credits?.cast || [];
      const cast = castData.slice(0, 10).map((person, i) => `
        <div class="cast-item" style="animation-delay: ${i * 0.05}s">
          <img class="cast-photo" src="${getImageUrl(person.profile_path, 'w200')}" alt="${person.name}" loading="lazy">
          <div class="cast-name">${person.name}</div>
          <div class="cast-character">${person.character || ''}</div>
        </div>
      `).join('');
      
      let seasonsHtml = '';
      if (type === 'tv' && details.seasons && details.seasons.length > 0) {
        const seasons = details.seasons.filter(s => s.season_number > 0);
        if (seasons.length > 0) {
          seasonsHtml = `
            <div class="seasons-section">
              <div class="season-header">
                <h3 class="season-title">Episodes</h3>
                <select class="season-select" id="seasonSelect" onchange="loadEpisodes()">
                  ${seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('')}
                </select>
              </div>
              <div class="episode-list" id="episodeList">
                <div class="skeleton" style="height: 100px; margin-bottom: 12px;"></div>
                <div class="skeleton" style="height: 100px; margin-bottom: 12px;"></div>
                <div class="skeleton" style="height: 100px; margin-bottom: 12px;"></div>
              </div>
            </div>
          `;
        }
      }
      
      const downloadHtml = `
        <div class="seasons-section" style="margin-top: 30px;">
          <h3 class="season-title" style="margin-bottom: 16px;"><i class="fas fa-download" style="color: var(--primary); margin-right: 8px;"></i>Download</h3>
          <div class="episode-list" id="downloadServers">
            ${CONFIG.DOWNLOAD_SERVERS.map((server, i) => `
              <div class="episode-item" onclick="downloadContent(${i})" style="animation-delay: ${i * 0.1}s">
                <div style="width: 60px; height: 60px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                  <i class="fas fa-cloud-download-alt"></i>
                </div>
                <div class="episode-info">
                  <div class="episode-number">${server.name}</div>
                  <div class="episode-overview">Click to download ${type === 'tv' ? 'selected episode' : 'movie'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      const communityHtml = `
        <div class="community-section" id="communitySection"></div>
      `;
      
      const trailer = details.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      
      document.getElementById('detailsInfo').innerHTML = `
        <h1 class="details-title">${title}</h1>

<!-- SERVER NOTICE ALERT -->
        <div style="font-size: 12px; color: var(--text-secondary); margin: 16px 0 8px; display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 10px 14px; border-radius: 8px; border-left: 3px solid var(--primary);">
          <i class="fas fa-info-circle" style="color: var(--primary); font-size: 14px;"></i>
          <span><strong>Note:</strong> Try different servers for better streaming quality.</span>
        </div>
    
<div id="serverList" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;"></div>
        <div class="details-meta">
          <div class="details-rating"><i class="fas fa-star"></i> <span>${rating}</span></div>
          <span class="match-score">${matchScore}% Match</span>
          <span>${year}</span>
          ${country ? `<span>${country}</span>` : ''}
          <span>${runtime}</span>
        </div>
        <div class="details-genres">${genres}</div>
        <p class="details-overview">${details.overview || 'No description available.'}</p>
        <div class="details-actions">
          <button class="btn btn-primary btn-play-large" onclick="playItem(${details.id}, '${type}')">
            <i class="fas fa-play"></i> Play
          </button>
          ${trailer ? `
            <button class="btn-icon" onclick="playTrailer(${details.id}, '${type}')" title="Watch Trailer">
              <i class="fas fa-video"></i>
            </button>
          ` : ''}
          <button class="btn-icon" id="bookmarkBtn" onclick="toggleBookmark(${details.id}, '${type}', '${title.replace(/'/g, "\\'")}', '${details.poster_path || ''}')" title="${isBookmarked ? 'Remove from' : 'Add to'} My List">
            <i class="fas fa-${isBookmarked ? 'check' : 'plus'}"></i>
          </button>
          <button class="btn-icon" onclick="shareItem(${details.id}, '${type}', '${title.replace(/'/g, "\\'")}')" title="Share">
            <i class="fas fa-share"></i>
          </button>
        </div>
        <div class="cast-section">
          <h3 class="cast-title">Cast</h3>
          <div class="cast-list hide-scrollbar">${cast || '<p style="color: var(--text-muted);">No cast information available.</p>'}</div>
        </div>
        ${seasonsHtml}
        ${downloadHtml}
        ${communityHtml}
      `;
      
      if (type === 'tv' && details.seasons && details.seasons.length > 0) {
        loadEpisodes();
      }

      requestAnimationFrame(() => renderCommunitySection());
    }

    async function loadEpisodes() {
      if (!state.currentItem || state.currentType !== 'tv') return;
      
      const seasonSelect = document.getElementById('seasonSelect');
      const episodeList = document.getElementById('episodeList');
      if (!seasonSelect || !episodeList) return;
      
      state.selectedSeason = parseInt(seasonSelect.value);
      episodeList.innerHTML = '<div class="skeleton" style="height: 100px; margin-bottom: 12px;"></div>'.repeat(3);
      
      try {
        const seasonData = await fetchTMDB(`/tv/${state.currentItem.id}/season/${state.selectedSeason}`);
        const episodes = seasonData?.episodes || [];
        
        episodeList.innerHTML = episodes.map((ep, i) => `
          <div class="episode-item ${i === 0 ? 'active' : ''}" 
               data-episode="${ep.episode_number}"
               data-title="${encodeURIComponent(ep.name || '')}"
               data-runtime="${ep.runtime || ''}"
               data-total-episodes="${episodes.length}"
               onclick="selectEpisode(this)"
               style="animation-delay: ${i * 0.05}s">
            <img class="episode-thumb" src="${getImageUrl(ep.still_path, 'w300')}" alt="Episode ${ep.episode_number}">
            <div class="episode-info">
              <div class="episode-number">${ep.episode_number}. ${ep.name}</div>
              <div class="episode-name">${ep.runtime ? ep.runtime + ' min' : ''}</div>
              <div class="episode-overview">${ep.overview || 'No description available.'}</div>
            </div>
          </div>
        `).join('') || '<p style="color: var(--text-muted);">No episodes available.</p>';
        
        state.selectedEpisode = episodes[0]?.episode_number || 1;
        state.currentEpisodeInfo = episodes[0]
          ? {
              title: episodes[0].name || '',
              runtime: episodes[0].runtime || 0,
              totalEpisodes: episodes.length
            }
