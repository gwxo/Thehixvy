<script id="cine-system-overlays-js">
(function () {
  'use strict';

  /* ---- helpers ---- */
  function showOverlay(id)  { document.getElementById(id)?.classList.add('active'); }
  function hideOverlay(id)  { document.getElementById(id)?.classList.remove('active'); }
  function isOverlay(id)    { return document.getElementById(id)?.classList.contains('active'); }

  /* ================================================================
     1.  NO INTERNET DETECTION
  ================================================================ */
  var _wasOffline = false;
  var _firstLoad  = true;

  function handleOnline() {
    document.getElementById('cineOfflineBanner')?.classList.remove('show');
    if (_wasOffline) {
      hideOverlay('cineNoInternet');
      document.body.classList.remove('no-scroll');
      _wasOffline = false;
      if (typeof window.showToast === 'function') {
        window.showToast('Back online! 🎉', 'success');
      }
    }
  }

  function handleOffline() {
    _wasOffline = true;
    if (_firstLoad) {
      /* first page load with no internet → full overlay */
      showOverlay('cineNoInternet');
      document.body.classList.add('no-scroll');
    } else {
      /* went offline mid-session → small top banner only */
      document.getElementById('cineOfflineBanner')?.classList.add('show');
    }
  }

  window.cineRetryConnection = function () {
    if (navigator.onLine) {
      handleOnline();
    } else {
      /* shake the icon to give feedback */
      var icon = document.querySelector('#cineNoInternet .cso-wifi-icon');
      if (icon) {
        icon.style.animation = 'none';
        setTimeout(function() {
          icon.style.animation = '';
        }, 50);
      }
      if (typeof window.showToast === 'function') {
        window.showToast('Still offline… check your WiFi', 'error');
      }
    }
  };
window.addEventListener('online',  handleOnline);
  window.addEventListener('offline', handleOffline);

  /* check on load */
  document.addEventListener('DOMContentLoaded', function () {
    _firstLoad = false;
    if (!navigator.onLine) {
      _wasOffline = true;
      showOverlay('cineNoInternet');
      document.body.classList.add('no-scroll');
    }
  });

  /* ================================================================
     2.  404 – show when navigateTo/openDetails fails
         Exposed as window.cineShow404() so other code can call it
  ================================================================ */
  window.cineShow404 = function () {
    hideOverlay('cineNoInternet');
    showOverlay('cine404');
    document.body.classList.add('no-scroll');
  };

  window.cine404GoHome = function () {
    hideOverlay('cine404');
    document.body.classList.remove('no-scroll');
    if (typeof window.navigateTo === 'function') {
      window.navigateTo('home');
    }
  };

  /* ================================================================
     3.  AD BLOCKER DETECTION
         Strategy: try to load a tiny bait resource that ad-blockers
         commonly block (ads.js path). If it fails → show overlay.
         Only shown once per session.
  ================================================================ */
  window.cineAdBlockDismiss = function () {
    hideOverlay('cineAdBlock');
    document.body.classList.remove('no-scroll');
    try { sessionStorage.setItem('cine_adblock_dismissed', '1'); } catch(_) {}
  };

  function detectAdBlocker() {
    /* skip if already dismissed this session */
    try {
      if (sessionStorage.getItem('cine_adblock_dismissed')) return;
    } catch(_) {}

    var bait = document.createElement('div');
    bait.className = 'ad-banner pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads banner-ad';
    bait.style.cssText = 'position:absolute;width:1px;height:1px;top:-9999px;left:-9999px;pointer-events:none;';
    document.body.appendChild(bait);

    window.requestAnimationFrame(function () {
      var blocked = false;
      try {
        blocked = (
          bait.offsetParent === null ||
          bait.offsetHeight === 0 ||
          bait.offsetWidth  === 0 ||
          bait.clientHeight === 0 ||
          bait.clientWidth  === 0 ||
          window.getComputedStyle(bait).display === 'none' ||
          window.getComputedStyle(bait).visibility === 'hidden'
        );
      } catch (_) { blocked = true; }

      document.body.removeChild(bait);
            if (blocked) {
        /* delay a bit so page loads first */
        setTimeout(function () {
          if (!isOverlay('cineNoInternet') && !isOverlay('cine404')) {
            showOverlay('cineAdBlock');
            document.body.classList.add('no-scroll');
          }
        }, 3500);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(detectAdBlocker, 1500);
  });

})();
</script>
<script id="cine-notif-preloader-js">
(function() {
'use strict';

// ================================================================
// NOTIFICATION SYSTEM (FULLY FIXED)
// ================================================================

var DEFAULT_NOTIFICATIONS = [
  {
    id: 'n001',
    title: 'About Me!',
    text: 'Im A web & App Developer as well as Medico.',
    time: '01-04-26',
    image: '',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#e50914" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 2-3 2V8zM14 10h3"/></svg>',
    tag: 'NEW',
    unread: true,
    link: 'https://thehixvy.pages.dev',
    action: null
  },
  {
    id: 'n003',
    title: 'Join Our Telegram',
    text: 'Get instant movie alerts & direct download links on our Telegram channel.',
    time: 'Yesterday',
    image: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEisSxziRExJb-nx0c7xAtEWDtZ8BYcOp-MknhS9B8gYae5B1J68z_ppRdTB9NFQ8y8BwYSkUrm9WK0Xo_W1uiPbqB-3WsYaV8QMDLIh6EZBwjZdGrxYyqXj5oIoYC-yI74gr7HbnsWznu4_L_M-kc6P5OjYUZYQ6tFRFfebiJJXWxlN3dMvnS_EHRtM4REK/s996/10324.png',
    svg: '',
    tag: 'INFO',
    unread: true,
    link: 'https://t.me/thehixvy',
    action: null
  }
];

function getReadIds() {
  try {
    var r = sessionStorage.getItem('cine_notif_read');
    return r ? JSON.parse(r) : [];
  } catch(_) { return []; }
}

function saveReadId(id) {
  try {
    var ids = getReadIds();
    if (ids.indexOf(id) === -1) ids.push(id);
    sessionStorage.setItem('cine_notif_read', JSON.stringify(ids));
  } catch(_) {}
}

function loadNotifications() {
  var readIds = getReadIds();
  var base = (window.CINE_NOTIFICATIONS && window.CINE_NOTIFICATIONS.length)
    ? window.CINE_NOTIFICATIONS
        : DEFAULT_NOTIFICATIONS;
  return base.map(function(n) {
    var isRead = readIds.indexOf(n.id) !== -1;
    return {
      id: n.id || ('n' + Math.random()),
      title: n.title || '',
      text: n.text || '',
      time: n.time || '',
      image: n.image || '',
      svg: n.svg || '',
      tag: n.tag || '',
      unread: isRead ? false : (n.unread !== false),
      link: n.link || null,
      action: n.action || null
    };
  });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildThumbHtml(n) {
  if (n.image) {
    return '<div class="notif-thumb"><img src="' + escHtml(n.image) + '" alt="" loading="lazy"></div>';
  }
  if (n.svg) {
    return '<div class="notif-thumb notif-thumb-svg">' + n.svg + '</div>';
  }
  return '<div class="notif-thumb notif-thumb-default"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.4 2.4 0 002.4-2.4H9.6A2.4 2.4 0 0012 22zm7-6.2V11a7 7 0 10-14 0v4.8L3.5 17.3V18h17v-.7L19 15.8z"/></svg></div>';
}

function buildTagHtml(tag) {
  if (!tag) return '';
  var colors = {
    'NEW':    '#46d369',
    'UPDATE': '#f5c518',
    'INFO':   '#00bcd4',
    'ALERT':  '#e50914',
    'NEWS':   '#9c27b0'
  };
  var color = colors[tag] || '#808080';
  return '<span class="notif-tag" style="background:' + color + '22;color:' + color + ';border-color:' + color + '44">' + escHtml(tag) + '</span>';
}

function renderNotifications() {
  var list  = document.getElementById('notifList');
  var badge = document.getElementById('notifBadge');
  if (!list) return;

  var notifs = loadNotifications();
  var unread = notifs.filter(function(n) { return n.unread; }).length;

  if (badge) badge.classList.toggle('show', unread > 0);

  if (!notifs.length) {
    list.innerHTML = '<div class="notif-empty"><svg viewBox="0 0 24 24"><path d="M12 22a2.4 2.4 0 002.4-2.4H9.6A2.4 2.4 0 0012 22zm7-6.2V11a7 7 0 10-14 0v4.8L3.5 17.3V18h17v-.7L19 15.8z"/></svg>No notifications yet</div>';
    return;
  }
  list.innerHTML = notifs.map(function(n, i) {
    var delay = (i * 0.06).toFixed(2);
    var unreadClass = n.unread ? ' unread' : '';
    var thumb = buildThumbHtml(n);
    var tag   = buildTagHtml(n.tag);

    // ✅ লিংক এবং অ্যাকশন ডাটা সেট করা
    var linkAttr = n.link ? 'data-link="' + escHtml(n.link) + '"' : '';
    var actionTypeAttr = n.action && n.action.type ? 'data-action-type="' + escHtml(n.action.type) + '"' : '';
    var actionIdAttr = n.action && n.action.id ? 'data-action-id="' + n.action.id + '"' : '';

    return '<div class="notif-item' + unreadClass + '" style="animation-delay:' + delay + 's" data-notif-id="' + escHtml(n.id) + '" ' + linkAttr + ' ' + actionTypeAttr + ' ' + actionIdAttr + '>'
      + thumb
      + '<div class="notif-body">'
      + '<div class="notif-body-title">' + escHtml(n.title) + ' ' + tag + '</div>'
      + '<div class="notif-body-text">' + escHtml(n.text) + '</div>'
      + '<div class="notif-body-time">' + escHtml(n.time) + '</div>'
      + '</div></div>';
  }).join('');

  // ✅ ক্লিক হ্যান্ডলার
  list.querySelectorAll('.notif-item[data-notif-id]').forEach(function(el) {
    // পুরনো ইভেন্ট লিসেনার রিমুভ করার জন্য নতুন করে যোগ করা
    var newEl = el.cloneNode(true);
    el.parentNode.replaceChild(newEl, el);
    
    newEl.addEventListener('click', function(e) {
      e.stopPropagation();
      var id = this.getAttribute('data-notif-id');
      saveReadId(id);
      this.classList.remove('unread');
      
      var stillUnread = document.querySelectorAll('.notif-item.unread').length;
      if (badge) badge.classList.toggle('show', stillUnread > 0);

      // 🚀 লিংকে নেভিগেট
      var link = this.getAttribute('data-link');
      if (link && link.trim()) {
        window.open(link, '_blank', 'noopener,noreferrer');
        return;
      }
      
      // 🚀 অ্যাকশনে নেভিগেট
      var actionType = this.getAttribute('data-action-type');
      var actionId = this.getAttribute('data-action-id');
      if (actionType && actionId) {
        if (typeof window.openDetails === 'function') {
          window.openDetails(parseInt(actionId), actionType);
        }
        return;
      }
    });
  });
}
  window.toggleNotifPanel = function() {
  var panel = document.getElementById('notifPanel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
  } else {
    renderNotifications();
    panel.classList.add('open');
  }
};

window.notifMarkAllRead = function() {
  loadNotifications().forEach(function(n) { saveReadId(n.id); });
  renderNotifications();
};

// ✅ ক্লিক ইভেন্ট ব্লক করা (প্যানেলের বাইরে ক্লিক করলে বন্ধ)
document.addEventListener('click', function(e) {
  var panel = document.getElementById('notifPanel');
  var btn   = document.getElementById('notifToggleBtn');
  if (!panel || !panel.classList.contains('open')) return;
  if (!panel.contains(e.target) && btn && !btn.contains(e.target)) {
    panel.classList.remove('open');
  }
}, { passive: true });

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(renderNotifications, 900);
});

})();
</script>
<script id="cinebolt-final-runtime-fixes">
(function () {
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getMediaType(item, fallback = 'movie') {
    return item?.media_type || (item?.first_air_date ? 'tv' : fallback);
  }

  function getTitle(item) {
    return item?.title || item?.name || 'Unknown';
  }

  function getYear(item) {
    return String(item?.release_date || item?.first_air_date || '').split('-')[0];
  }

  function getRating(item) {
    return item?.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A';
  }

  function getOverview(item) {
    return String(item?.overview || '').trim();
  }

  // Replace the card renderer so rows actually show synopsis text.
  window.createMovieCard = function createMovieCard(item, type = 'poster', index = 0) {
    const title = getTitle(item);
    const imagePath = type === 'poster' ? item?.poster_path : (item?.backdrop_path || item?.poster_path);
    const rating = getRating(item);
    const year = getYear(item);
    const mediaType = getMediaType(item);
    const overview = getOverview(item);
return `
      <div class="movie-card ${type}" onclick="openDetails(${item.id}, '${mediaType}')" style="animation-delay: ${index * 0.05}s">
        <img src="${getImageUrl(imagePath, type === 'poster' ? 'w300' : 'w500')}" alt="${escapeHtml(title)}" loading="lazy">
        <div class="card-badge"><i class="fas fa-star"></i> ${rating}</div>
        <div class="card-play"><i class="fas fa-play"></i></div>
        <div class="card-overlay">
          <div class="card-title">${escapeHtml(title)}</div>
          <div class="card-meta">
            <span class="card-rating"><i class="fas fa-star"></i> ${rating}</span>
            <span>${escapeHtml(year || 'N/A')}</span>
          </div>
          ${overview ? `<div class="card-desc">${escapeHtml(overview)}</div>` : ''}
        </div>
      </div>
    `;
  };

  // Keep trailer mode separate from full movie playback.
  const originalResetPlayer = window.resetPlayer;
  window.resetPlayer = function () {
    window.__cineTrailerMode = false;
    const banner = document.getElementById('detailsBanner');
    banner?.classList.remove('player-trailer');
    return typeof originalResetPlayer === 'function' ? originalResetPlayer() : undefined;
  };

  const originalOpenDetails = window.openDetails;
  if (typeof originalOpenDetails === 'function') {
    window.openDetails = async function (id, type = 'movie', pushState = true) {
      window.__cineTrailerMode = false;
      document.getElementById('detailsBanner')?.classList.remove('player-trailer');
      return await originalOpenDetails.call(this, id, type, pushState);
    };
  }

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
      return result;
    };
  }

 const originalPlayCurrentDetailServer = window.playCurrentDetailServer;
  window.playCurrentDetailServer = function () {
    const banner = document.getElementById('detailsBanner');
    if (window.__cineTrailerMode || banner?.classList.contains('player-trailer')) {
      // Prevent accidental switch from trailer to full movie on the centered play button.
      showToast?.('Trailer is playing. Use the main Play button to start the movie.', 'info');
      return;
    }

    if (typeof originalPlayCurrentDetailServer === 'function') {
      return originalPlayCurrentDetailServer();
    }
  };

  // Make sure any later retries still use the fixed description renderer.
  window.__cineboltFinalFixesApplied = true;
})();
</script>


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

 
