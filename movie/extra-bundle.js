<script id="cinepeace-final-js-fixes">
  (function () {
    const THEMES = {
      red: { type: 'solid', label: 'Red', colors: ['#e50914', '#ff6b6b'] },
      blue: { type: 'solid', label: 'Blue', colors: ['#0077ff', '#4cc9f0'] },
      green: { type: 'solid', label: 'Green', colors: ['#00c853', '#64dd17'] },
      purple: { type: 'solid', label: 'Purple', colors: ['#9c27b0', '#d500f9'] },
      orange: { type: 'solid', label: 'Orange', colors: ['#ff5722', '#ff9800'] },
      pink: { type: 'solid', label: 'Pink', colors: ['#e91e63', '#ff4d6d'] },
      teal: { type: 'solid', label: 'Teal', colors: ['#00bcd4', '#4dd0e1'] },
      indigo: { type: 'solid', label: 'Indigo', colors: ['#3f51b5', '#536dfe'] },
      amber: { type: 'solid', label: 'Amber', colors: ['#ffb300', '#ffd54f'] },
      lime: { type: 'solid', label: 'Lime', colors: ['#cddc39', '#aed581'] },
      cyan: { type: 'solid', label: 'Cyan', colors: ['#18ffff', '#00e5ff'] },
      rose: { type: 'solid', label: 'Rose', colors: ['#ff4d6d', '#ff8fab'] },
      aurora: { type: 'gradient', label: 'Aurora', colors: ['#4facfe', '#00f2fe'] },
      sunset: { type: 'gradient', label: 'Sunset', colors: ['#ff5f6d', '#ffc371'] },
      midnight: { type: 'gradient', label: 'Midnight', colors: ['#232526', '#414345'] },
      candy: { type: 'gradient', label: 'Candy', colors: ['#ff8a00', '#e52e71'] },
      ocean: { type: 'gradient', label: 'Ocean', colors: ['#00c6ff', '#0072ff'] },
      neon: { type: 'gradient', label: 'Neon', colors: ['#7f00ff', '#e100ff'] }
    };

    function rgbGlow(hex, alpha) {
      const value = String(hex || '').replace('#', '');
      if (value.length !== 6) return `rgba(229, 9, 20, ${alpha})`;
      const r = parseInt(value.slice(0, 2), 16);
      const g = parseInt(value.slice(2, 4), 16);
      const b = parseInt(value.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // applyTheme and renderThemeColors - use window versions if available, else define fallback
    if (typeof window.applyTheme !== 'function') {
      window.applyTheme = function(key) {
        const t = THEMES[key] || THEMES.red;
        const [start, end] = t.colors;
        document.documentElement.style.setProperty('--primary', start);
        document.documentElement.style.setProperty('--primary-hover', end);
        document.documentElement.style.setProperty('--primary-glow', 'rgba(229,9,20,0.38)');
        document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${start}, ${end})`);
        if (typeof state !== 'undefined') {
          state.themeColor = key in THEMES ? key : 'red';
          safeStorage.set('streamflix_theme', state.themeColor);
        }
      };
    }
    if (typeof window.renderThemeColors !== 'function') {
      window.renderThemeColors = function() {
        const container = document.getElementById('themeColors');
        if (!container) return;
        container.innerHTML = Object.entries(THEMES).map(([key, theme]) => {
          const bg = theme.type === 'gradient'
            ? `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
            : theme.colors[0];
          const active = (typeof state !== 'undefined' && state.themeColor === key) ? 'active' : '';
          return `<button class="theme-color ${theme.type} ${active}" type="button" data-theme="${key}" title="${theme.label}" aria-label="${theme.label} theme" style="background:${bg}" onclick="setThemeColor('${key}')"></button>`;
        }).join('');
      };
    }
window.setThemeColor = function (color) {
      applyTheme(color);
      renderThemeColors();
      showToast('Theme updated!', 'success');
    };

    const __originalLoadSettings = window.loadSettings;
    window.loadSettings = function () {
      if (typeof __originalLoadSettings === 'function') {
        __originalLoadSettings();
      }
      requestAnimationFrame(() => {
        renderThemeColors();
      });
    };

    const __originalOpenProfileModal = window.openProfileModal;
    window.openProfileModal = function () {
      if (typeof __originalOpenProfileModal === 'function') {
        __originalOpenProfileModal();
      }
      requestAnimationFrame(() => document.getElementById('profileNameModalInput')?.focus());
    };

    window.closeProfileModal = function () {
      const modal = document.getElementById('profileModal');
      if (!modal) return;
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    };

    window.triggerProfileImagePicker = function () {
      document.getElementById('profileImageInput')?.click();
    };

    let profileTempObjectUrl = '';

    window.handleProfileImageUpload = function (event) {
      const file = event?.target?.files?.[0];
      if (!file) return;

      if (profileTempObjectUrl) {
        URL.revokeObjectURL(profileTempObjectUrl);
        profileTempObjectUrl = '';
      }

      profileTempObjectUrl = URL.createObjectURL(file);
      state.profileAvatar = profileTempObjectUrl;
      renderHeaderProfile();

      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        state.profileAvatar = result;
        safeStorage.set('streamflix_profile_avatar', result);
        renderHeaderProfile();
        if (profileTempObjectUrl) {
          URL.revokeObjectURL(profileTempObjectUrl);
          profileTempObjectUrl = '';
        }
        showToast('Profile photo updated!', 'success');
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    };

    window.saveProfileFromModal = function () {
      const name = document.getElementById('profileNameModalInput')?.value || state.profileName || 'User';
      const email = document.getElementById('profileEmailModalInput')?.value || '';
      state.profileName = (name || 'User').trim() || 'User';
      state.profileEmail = (email || '').trim();
      safeStorage.set('streamflix_profile', state.profileName);
      safeStorage.set('streamflix_profile_email', state.profileEmail);
      syncProfileSettingsInputs();
      renderHeaderProfile();
      closeProfileModal();
      showToast('Profile saved!', 'success');
    };

    window.clearAppCacheAndReset = async function () {
      try {
        try { sessionStorage.clear(); } catch (_) {}
        const keys = Object.keys(localStorage);
        keys.forEach((key) => safeStorage.remove(key));
        if ('caches' in window && caches?.keys) {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        }
        document.cookie.split(';').forEach((cookie) => {
          const eq = cookie.indexOf('=');
          const name = (eq > -1 ? cookie.slice(0, eq) : cookie).trim();
          if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
        showToast('Cache cleared. Reloading...', 'success');
      } catch (error) {
        console.error('Reset failed:', error);
      } finally {
        setTimeout(() => window.location.reload(), 450);
      }
    };

    const __originalPlayItem = window.playItem;
    window.playItem = function (id, type) {
      if (typeof __originalPlayItem === 'function') {
        __originalPlayItem(id, type);
      }
      requestAnimationFrame(() => {
        document.querySelectorAll('#serverList button').forEach((btn) => {
          btn.type = 'button';
          btn.style.fontFamily = `'Bebas Neue', 'Inter', sans-serif`;
          btn.style.letterSpacing = '1px';
          btn.style.textTransform = 'uppercase';
        });
      });
    };

    const themeFromStorage = safeStorage.get('streamflix_theme') || state.themeColor || 'red';
    applyTheme(themeFromStorage);
    renderThemeColors();
    renderHeaderProfile();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        renderThemeColors();
        renderHeaderProfile();
      }, { once: true });
    }
  })();
  </script>
<script id="cinepeace-player-gradient-footer-fixes">
(function () {
  const THEME_SET = {
    red:      { type: 'solid',    label: 'Red',      colors: ['#e50914', '#ff6b6b'] },
    blue:     { type: 'solid',    label: 'Blue',     colors: ['#0077ff', '#4cc9f0'] },
    teal:     { type: 'gradient', label: 'Teal',     colors: ['#00bcd4', '#4dd0e1'] },
    aurora:   { type: 'gradient', label: 'Aurora',   colors: ['#4facfe', '#00f2fe'] },
    sunset:   { type: 'gradient', label: 'Sunset',   colors: ['#ff5f6d', '#ffc371'] },
    midnight: { type: 'gradient', label: 'Midnight', colors: ['#232526', '#414345'] }
  };

  function hexToRgb(hex) {
    const value = String(hex || '').replace('#', '');
    if (value.length !== 6) return [229, 9, 20];
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16)
    ];
  }

  function toRgba(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function resolveTheme(key) {
    return THEME_SET[key] || THEME_SET.red;
  }

  function applyTheme(key) {
    const theme = resolveTheme(key);
    const [start, end] = theme.colors;
    const gradient = `linear-gradient(135deg, ${start}, ${end})`;

    document.documentElement.style.setProperty('--primary', start);
    document.documentElement.style.setProperty('--primary-hover', end);
    document.documentElement.style.setProperty('--primary-glow', toRgba(start, 0.38));
    document.documentElement.style.setProperty('--primary-gradient', gradient);
    document.documentElement.style.setProperty('--accent-gradient', gradient);

    if (typeof state !== 'undefined') {
      state.themeColor = key in THEME_SET ? key : 'red';
      try { safeStorage.set('streamflix_theme', state.themeColor); } catch (_) {}
    }
  }

  function renderThemeColors() {
    const container = document.getElementById('themeColors');
    if (!container) return;

    container.innerHTML = Object.entries(THEME_SET).map(([key, theme]) => {
      const bg = theme.type === 'gradient'
        ? `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
        : theme.colors[0];
      const active = (typeof state !== 'undefined' && state.themeColor === key) ? 'active' : '';
      return `<button class="theme-color ${theme.type} ${active}" type="button" data-theme="${key}" title="${theme.label}" aria-label="${theme.label} theme" style="background:${bg}; background-image:${bg};" onclick="setThemeColor('${key}')"></button>`;
    }).join('');
  }

  window.setThemeColor = function (color) {
    applyTheme(color);
    renderThemeColors();
    if (typeof window.showToast === 'function') showToast('Theme updated!', 'success');
  };

  window.renderThemeColors = renderThemeColors;
  window.applyTheme = applyTheme;

  function setDetailsBannerState(stateName, text) {
    const banner = document.getElementById('detailsBanner');
    if (!banner) return;

    banner.classList.remove('player-loading', 'player-ready');
    if (stateName === 'loading') {
      banner.classList.add('player-loading');
      const label = document.getElementById('detailsPlayerLoaderText');
      if (label && text) label.textContent = text;
    } else if (stateName === 'ready') {
      banner.classList.add('player-ready');
    }

    banner.dataset.playerState = stateName;
  }

  function bindInlinePlayerLoad() {
    const iframe = document.getElementById('inlinePlayer');
    if (!iframe || iframe.dataset.cineBound === '1') return;

    iframe.dataset.cineBound = '1';
    iframe.addEventListener('load', () => {
      const banner = document.getElementById('detailsBanner');
      if (!banner) return;
      const started = Number(window.__cinePlayerLoadingStart || 0);
      const elapsed = started ? Date.now() - started : 0;
      const finish = () => setDetailsBannerState('ready');

      if (elapsed < 650) {
        window.setTimeout(finish, 650 - elapsed);
      } else {
        finish();
      }
    }, { passive: true });
  }

  window.playCurrentDetailServer = function () {
    if (typeof state === 'undefined' || !state.currentItem) return;
    const banner = document.getElementById('detailsBanner');
    if (state.playerStarted) {
      banner?.classList.add('player-started');
      return;
    }
    state.playerStarted = true;
    banner?.classList.add('player-started');
    if (typeof window.playItem === 'function') {
      window.playItem(state.currentItem.id, state.currentType || 'movie');
    }
  };

  const __origOpenDetails = window.openDetails;
  if (typeof __origOpenDetails === 'function') {
    window.openDetails = async function (id, type = 'movie', pushState = true) {
      setDetailsBannerState('loading', 'Loading details...');
      try {
        const result = __origOpenDetails(id, type, pushState);
        if (result && typeof result.then === 'function') await result;
      } finally {
        window.setTimeout(() => {
          if (document.getElementById('detailsBanner')) setDetailsBannerState('ready');
        }, 250);
      }
    };
  }

  const __origPlayItem = window.playItem;
  if (typeof __origPlayItem === 'function') {
    window.playItem = function (id, type) {
      bindInlinePlayerLoad();
      window.__cinePlayerLoadingStart = Date.now();
      setDetailsBannerState('loading', 'Server loading...');
      const result = __origPlayItem(id, type);
      window.setTimeout(() => {
        const banner = document.getElementById('detailsBanner');
        if (banner && banner.classList.contains('player-loading')) {
          setDetailsBannerState('ready');
        }
      }, 1200);
      return result;
    };
  }
  const __origPlayTrailer = window.playTrailer;
  if (typeof __origPlayTrailer === 'function') {
    window.playTrailer = function (id, type) {
      bindInlinePlayerLoad();
      window.__cinePlayerLoadingStart = Date.now();
      setDetailsBannerState('loading', 'Trailer loading...');
      const result = __origPlayTrailer(id, type);
      window.setTimeout(() => {
        const banner = document.getElementById('detailsBanner');
        if (banner && banner.classList.contains('player-loading')) {
          setDetailsBannerState('ready');
        }
      }, 1200);
      return result;
    };
  }

  const __origResetPlayer = window.resetPlayer;
  if (typeof __origResetPlayer === 'function') {
    window.resetPlayer = function () {
      const result = __origResetPlayer();
      const banner = document.getElementById('detailsBanner');
      if (banner) banner.classList.remove('player-loading', 'player-ready');
      return result;
    };
  }

  const __origShowDetailsLoading = window.showDetailsLoading;
  if (typeof __origShowDetailsLoading === 'function') {
    window.showDetailsLoading = function () {
      setDetailsBannerState('loading', 'Loading content...');
      return __origShowDetailsLoading();
    };
  }

  const __origRenderDetails = window.renderDetails;
  if (typeof __origRenderDetails === 'function') {
    window.renderDetails = function (...args) {
      const result = __origRenderDetails.apply(this, args);
      window.requestAnimationFrame(() => setDetailsBannerState('ready'));
      return result;
    };
  }

  const __origClear = window.clearAppCacheAndReset;
  if (typeof __origClear === 'function') {
    window.clearAppCacheAndReset = async function () {
      try {
        await __origClear();
      } catch (_) {
        try {
          try { localStorage.clear(); } catch(_) {}
          sessionStorage.clear();
        } catch (e) {}
        location.reload();
      }
    };
  }

  const __origLoadSettings = window.loadSettings;
  if (typeof __origLoadSettings === 'function') {
    window.loadSettings = function () {
      const result = __origLoadSettings();
      window.requestAnimationFrame(() => {
        renderThemeColors();
      });
      return result;
    };
  }

  function refreshServerButtonFont() {
    const buttons = document.querySelectorAll('#serverList button');
    buttons.forEach((btn) => {
      btn.style.fontFamily = "'Bebas Neue', 'Inter', sans-serif";
      btn.style.letterSpacing = '1px';
      btn.style.textTransform = 'uppercase';
    });
  }

  const __origLoadHome = window.loadHomeContent;
  if (typeof __origLoadHome === 'function') {
    window.loadHomeContent = function () {
      const result = __origLoadHome();
      window.requestAnimationFrame(refreshServerButtonFont);
      return result;
    };
  }
  const __origSetSidebar = window.setSidebarState;
  if (typeof __origSetSidebar === 'function') {
    window.setSidebarState = function (...args) {
      const result = __origSetSidebar.apply(this, args);
      const btn = document.querySelector('.menu-toggle');
      if (btn) btn.style.borderRadius = '14px';
      return result;
    };
  }

  applyTheme((typeof state !== 'undefined' && state.themeColor) || safeStorage.get('streamflix_theme') || 'red');
  renderThemeColors();
  bindInlinePlayerLoad();
  refreshServerButtonFont();

  document.addEventListener('click', (e) => {
    if (e.target?.closest?.('#serverList button')) {
      window.requestAnimationFrame(refreshServerButtonFont);
    }
  }, { passive: true });

  document.addEventListener('DOMContentLoaded', () => {
    renderThemeColors();
    refreshServerButtonFont();
  }, { once: true });
})();
</script>
