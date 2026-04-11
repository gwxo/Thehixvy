<script id="cinebolt-final-hardening">
(function () {
  const THEME_SET = {
    red:     { type: 'solid',     label: 'Red',     colors: ['#e50914', '#ff6b6b'] },
    blue:    { type: 'solid',     label: 'Blue',    colors: ['#0077ff', '#4cc9f0'] },
    green:   { type: 'solid',     label: 'Green',   colors: ['#00c853', '#64dd17'] },
    purple:  { type: 'solid',     label: 'Purple',  colors: ['#9c27b0', '#d500f9'] },
    orange:  { type: 'solid',     label: 'Orange',  colors: ['#ff5722', '#ff9800'] },
    pink:    { type: 'solid',     label: 'Pink',    colors: ['#e91e63', '#ff4d6d'] },
    teal:    { type: 'solid',     label: 'Teal',    colors: ['#00bcd4', '#4dd0e1'] },
    indigo:  { type: 'solid',     label: 'Indigo',  colors: ['#3f51b5', '#536dfe'] },
    amber:   { type: 'solid',     label: 'Amber',   colors: ['#ffb300', '#ffd54f'] },
    lime:    { type: 'solid',     label: 'Lime',    colors: ['#cddc39', '#aed581'] },
    cyan:    { type: 'solid',     label: 'Cyan',    colors: ['#18ffff', '#00e5ff'] },
    rose:    { type: 'solid',     label: 'Rose',    colors: ['#ff4d6d', '#ff8fab'] },
    aurora:  { type: 'gradient',  label: 'Aurora',  colors: ['#4facfe', '#00f2fe'] },
    sunset:  { type: 'gradient',  label: 'Sunset',  colors: ['#ff5f6d', '#ffc371'] },
    midnight:{ type: 'gradient',  label: 'Midnight',colors: ['#232526', '#414345'] },
    candy:   { type: 'gradient',  label: 'Candy',   colors: ['#ff8a00', '#e52e71'] },
    ocean:   { type: 'gradient',  label: 'Ocean',   colors: ['#00c6ff', '#0072ff'] },
    neon:    { type: 'gradient',  label: 'Neon',    colors: ['#7f00ff', '#e100ff'] }
  };

  const toRgba = (hex, alpha) => {
    const value = String(hex || '').replace('#', '');
    if (value.length !== 6) return `rgba(229, 9, 20, ${alpha})`;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const resolveTheme = (key) => THEME_SET[key] || THEME_SET.red;

  window.applyTheme = function applyTheme(key) {
    const themeKey = Object.prototype.hasOwnProperty.call(THEME_SET, key) ? key : 'red';
    const theme = resolveTheme(themeKey);
    const [start, end] = theme.colors;
    const gradient = `linear-gradient(135deg, ${start}, ${end})`;

    document.documentElement.style.setProperty('--primary', start);
    document.documentElement.style.setProperty('--primary-hover', end);
    document.documentElement.style.setProperty('--primary-glow', toRgba(start, 0.38));
    document.documentElement.style.setProperty('--primary-gradient', gradient);
    document.documentElement.style.setProperty('--accent-gradient', gradient);

    if (typeof state !== 'undefined') {
      state.themeColor = themeKey;
      try { safeStorage.set('streamflix_theme', themeKey); } catch (_) {}
    }
  };

  window.renderThemeColors = function renderThemeColors() {
    const container = document.getElementById('themeColors');
    if (!container) return;

    container.innerHTML = Object.entries(THEME_SET).map(([key, theme]) => {
      const bg = theme.type === 'gradient'
        ? `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
        : theme.colors[0];
      const active = (typeof state !== 'undefined' && state.themeColor === key) ? 'active' : '';
      return `<button class="theme-color ${theme.type} ${active}" type="button" data-theme="${key}" title="${theme.label}" aria-label="${theme.label} theme" style="background:${bg}; background-image:${bg};" onclick="setThemeColor('${key}')"></button>`;
    }).join('');
  };

  window.setThemeColor = function setThemeColor(color) {
    window.applyTheme(color);
    window.renderThemeColors();
    if (typeof window.showToast === 'function') showToast('Theme updated!', 'success');
  };

  const originalLoadSettings = window.loadSettings;
  if (typeof originalLoadSettings === 'function') {
    window.loadSettings = function (...args) {
      const result = originalLoadSettings.apply(this, args);
      window.requestAnimationFrame(() => window.renderThemeColors());
      return result;
    };
  }

  const originalLoadHomeContent = window.loadHomeContent;
  if (typeof originalLoadHomeContent === 'function') {
    let homeLock = null;
    window.loadHomeContent = function (...args) {
      if (homeLock) return homeLock;
      const call = Promise.resolve().then(() => originalLoadHomeContent.apply(this, args));
      homeLock = call.finally(() => {
        window.setTimeout(() => {
          if (homeLock === call) homeLock = null;
        }, 250);
      });
      window.requestAnimationFrame(() => {
        document.querySelectorAll('#serverList button').forEach((btn) => {
          btn.style.fontFamily = "'Bebas Neue', 'Inter', sans-serif";
          btn.style.letterSpacing = '1px';
          btn.style.textTransform = 'uppercase';
        });
      });
      return homeLock;
    };
  }

  const originalLoadBookmarks = window.loadBookmarks;
  window.loadBookmarks = function () {
    const grid = document.getElementById('bookmarksGrid');
    if (!grid) return typeof originalLoadBookmarks === 'function' ? originalLoadBookmarks() : undefined;

    const items = Array.isArray(state?.bookmarks) ? state.bookmarks : [];
    if (!items.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-bookmark"></i>
          <h3>Your list is empty</h3>
          <p>Save movies and TV shows to watch later</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map((item, i) => {
      const safeType = item.type || item.media_type || 'movie';
      const normalized = {
        ...item,
        media_type: safeType,
        title: item.title || item.name || 'Untitled',
        name: item.name || item.title || 'Untitled'
      };
      return window.createMovieCard ? window.createMovieCard(normalized, 'poster', i) : `
        <div class="search-card" onclick="openDetails(${item.id}, '${safeType}')" style="animation-delay: ${i * 0.05}s">
          <img src="${window.getImageUrl ? window.getImageUrl(item.poster_path, 'w300') : ''}" alt="${(item.title || item.name || 'Untitled').replace(/[&<>\"']/g, '')}">
        </div>
      `;
    }).join('');
  };

  const originalShareItem = window.shareItem;
  window.shareItem = async function (id, type, title) {
    const base = window.location.origin + window.location.pathname;
    const url = `${base}#/${type}/${id}`;
    const payload = {
      title: `${title} - CINEBOLT`,
      text: `Check out ${title} on CINEBOLT!`,
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error?.name !== 'AbortError') {
          if (typeof copyToClipboard === 'function') copyToClipboard(url);
          return;
        }
        return;
      }
    }

    if (typeof copyToClipboard === 'function') copyToClipboard(url);
    else if (originalShareItem && originalShareItem !== window.shareItem) return originalShareItem(id, type, title);
  };

  window.getImageUrl = function getImageUrl(path, size = 'w500') {
    if (!path) {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#141414"/>
              <stop offset="100%" stop-color="#222222"/>
            </linearGradient>
          </defs>
          <rect width="300" height="450" fill="url(#g)"/>
          <rect x="24" y="24" width="252" height="402" rx="18" fill="#1a1a1a" stroke="#2b2b2b"/>
          <circle cx="150" cy="182" r="42" fill="#2b2b2b"/>
          <path d="M120 246c16-20 44-20 60 0" fill="none" stroke="#3b3b3b" stroke-width="10" stroke-linecap="round"/>
          <text x="150" y="340" text-anchor="middle" fill="#7a7a7a" font-family="Arial, sans-serif" font-size="18">No Image</text>
        </svg>`;
      return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }
    return `${CONFIG.IMG_BASE}/${size}${path}`;
  };

  const originalDownloadContent = window.downloadContent;
  window.downloadContent = function (serverIndex) {
    if (!state.currentItem) {
      showToast?.('No content selected', 'error');
      return;
    }

    const { id, type } = state.currentItem;
    const server = CONFIG.DOWNLOAD_SERVERS?.[serverIndex] || CONFIG.DOWNLOAD_SERVERS?.[0];
    if (!server) {
      showToast?.('No download server available', 'error');
      return;
    }

    const url = type === 'tv'
      ? `${server.base}/tv/${id}/${state.selectedSeason}/${state.selectedEpisode}`
      : `${server.base}/movie/${id}`;

    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newTab) window.location.href = url;
    showToast?.('Opening download server...', 'info');
  };

  const originalPlayItem = window.playItem;
  if (typeof originalPlayItem === 'function') {
    window.playItem = function (id, type) {
      window.__cineTrailerMode = false;
      document.getElementById('detailsBanner')?.classList.remove('player-trailer');
      return originalPlayItem.call(this, id, type);
    };
  }

  const originalPlayTrailer = window.playTrailer;
  if (typeof originalPlayTrailer === 'function') {
    window.playTrailer = function (id, type) {
      const result = originalPlayTrailer.call(this, id, type);
      window.__cineTrailerMode = true;
      document.getElementById('detailsBanner')?.classList.add('player-trailer');
      if (typeof state !== 'undefined') state.playerStarted = false;
      return result;
    };
  }

  const originalPlayCurrentDetailServer = window.playCurrentDetailServer;
  window.playCurrentDetailServer = function () {
    const banner = document.getElementById('detailsBanner');
    if (window.__cineTrailerMode || banner?.classList.contains('player-trailer')) {
      showToast?.('Trailer is playing. Use the main Play button to start the movie.', 'info');
      return;
    }
    return typeof originalPlayCurrentDetailServer === 'function'
      ? originalPlayCurrentDetailServer.call(this)
      : undefined;
  };
</script>
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then((registration) => {
            console.log('PWA ServiceWorker registered successfully!');
          })
          .catch((error) => {
            console.log('ServiceWorker registration failed:', error);
          });
      });
    }
  </script>
  <!-- PWA Install Popup -->
  <div id="pwaInstallPopup" class="pwa-popup">
    <div class="pwa-content">
      <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjyKs_SvvTb8wWoP8NzjhFxD012HCU9CHKTBUc5LrfClHw1oSFWq5O_s6d8VouZO92-3iSNB0V8AUnzQkBfW7_RjThOykYuWAUH7WYMmbN5pkUAGx9KpW7rkPPGvkFrjyd5RoGWsSx9LzVl03XMwj-dDgS1bfEolj2_VFBI7Ji5lw9cCuGVpt_TSedFO979/s1024/10373.png" class="pwa-logo" alt="hixvyLogo">
      <div class="pwa-text">
        <h4>Install HixvyMovie</h4>
        <p>Add our app to your home screen for full-screen streaming, offline access, and a faster experience.</p>
      </div>
    </div>
    <div class="pwa-actions">
      <button class="pwa-btn pwa-btn-cancel" onclick="closePwaPopup()">Not Now</button>
      <button class="pwa-btn pwa-btn-install" onclick="installPwaApp()">Install App</button>
    </div>
  </div>

  <!-- PWA Install Logic -->
  <!-- PWA Install Logic -->
  <script>
    let deferredPrompt;

    // 1. Catch the browser's hidden install prompt
    // This event ONLY fires if the user HAS NOT installed the app yet.
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome from showing the default mini-infobar
      e.preventDefault();
      // Stash the event so it can be triggered later.
      deferredPrompt = e;
      
      // 👉 INTEGRATION: Show the "Install App" button in the sidebar
      const sidebarBtn = document.getElementById('installPwaSidebarBtn');
      if (sidebarBtn) sidebarBtn.style.display = 'flex';

      // Wait 3 seconds so the preloader animation can finish, then show popup
      setTimeout(() => {
        // Double check they aren't already running the app in standalone mode
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          const popup = document.getElementById('pwaInstallPopup');
          if (popup) popup.classList.add('show');
        }
      }, 3000);
    });

    function closePwaPopup() {
      // Hide popup. Because there is NO local storage saved, 
      // if they refresh the page, it will pop up again.
      const popup = document.getElementById('pwaInstallPopup');
      if (popup) popup.classList.remove('show');
    }

    async function installPwaApp() {
      if (deferredPrompt) {
        // Show the browser's native install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('User installed the PWA');
          
          // 👉 INTEGRATION: Hide the sidebar button because it's now installed
          const sidebarBtn = document.getElementById('installPwaSidebarBtn');
          if (sidebarBtn) sidebarBtn.style.display = 'none';
        }
        
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
      }
      // Hide popup
      closePwaPopup();
    }

    // If the user successfully installs the app via browser menu or our buttons
    window.addEventListener('appinstalled', () => {
      const popup = document.getElementById('pwaInstallPopup');
      if (popup) popup.classList.remove('show');
      
      // 👉 INTEGRATION: Hide the sidebar button
      const sidebarBtn = document.getElementById('installPwaSidebarBtn');
      if (sidebarBtn) sidebarBtn.style.display = 'none';

      deferredPrompt = null;
    });
  </script>

<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "84f8583f0582477fbf8406581afdbb9d"}'></script><!-- End Cloudflare Web Analytics -->

<!-- ============================================== -->
<!-- FAKE BLOG JAVASCRIPT LOGIC ADDED HERE          -->
<!-- ============================================== -->
<script id="stealth-blog-logic">
(function() {
    // === 🛑 SET YOUR SECRET PASSWORD HERE 🛑 ===
    const SECRET_PASSWORD = "admin"; 
    // ============================================

    const originalTitle = document.title;

    window.checkSecretPassword = function() {
        const inputVal = document.getElementById('blogSecretInput').value.trim();
        
        if (inputVal === SECRET_PASSWORD) {
            // Correct password: Save to local storage forever and unlock
            localStorage.setItem('hixvy_stealth_unlocked', 'true');
            unlockStreamingApp();
        } else if (inputVal !== "") {
            // Wrong password: Act like a normal blog search
            alert('No articles found for: "' + inputVal + '". Try searching for "Deforestation" or "Climate".');
            document.getElementById('blogSecretInput').value = "";
        }
    };

    // Allow pressing "Enter" on the keyboard in the search box
    document.getElementById('blogSecretInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkSecretPassword();
        }
    });

    function unlockStreamingApp() {
        // Remove the lock class to show the movie site
        document.body.classList.remove('app-locked');
        document.title = originalTitle || "The Hixvy";
        
        // Play the cinematic loading animation so it looks awesome when unlocked
        const loader = document.getElementById('loadingOverlay');
        if(loader) {
            loader.style.opacity = '1';
            loader.style.visibility = 'visible';
            setTimeout(() => {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    loader.style.display = 'none';
                    // Allow scrolling in the movie app again
                    document.body.classList.remove('no-scroll'); 
                }, 450);
            }, 1500);
        }
    }

    function lockApp() {
        // Add the lock class to hide the movie site and show the blog
        document.body.classList.add('app-locked');
        document.title = "EcoNature | The Vital Role of Trees"; // Fake title for browser tab
    }

    // CHECK STATE IMMEDIATELY ON LOAD
    document.addEventListener("DOMContentLoaded", function() {
        const isUnlocked = localStorage.getItem('hixvy_stealth_unlocked') === 'true';
        if (!isUnlocked) {
            lockApp(); // Hide movies, show blog
        } else {
            document.body.classList.remove('app-locked'); // Keep movies visible
        }
    });
})();
</script>
<!-- ============================================== -->
