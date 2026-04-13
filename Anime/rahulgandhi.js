
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const debounce = (fn, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn.apply(this, args), delay); }; };

    // --- SECURITY LAYER START ---
    (function blockDevTools() {
      // 1. Disable Right Click
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showToast('Action disabled for security.', 'error');
      });

      // 2. Disable Keyboard Shortcuts (F12, Ctrl+U, Ctrl+Shift+I/J/C)
      document.addEventListener('keydown', (e) => {
        if (
          e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
          (e.ctrlKey && e.key === 'U')
        ) {
          e.preventDefault();
        }
      });

      // 3. The Debugger Trap (Freezes page if DevTools is forced open)
      setInterval(() => {
        const start = Date.now();
        debugger; // This pauses execution ONLY if DevTools are open
        if (Date.now() - start > 100) {
          // If paused, wipe the website content immediately
          document.body.innerHTML = '<div style="height:100vh;display:flex;align-items:center;justify-content:center;background:#05050a;color:#ff2e93;font-size:24px;font-family:sans-serif;font-weight:bold;">Security Alert: Developer Tools Blocked</div>';
          window.location.replace("about:blank");
        }
      }, 1000);
    })();
    // --- SECURITY LAYER END ---

    let toastTimeout;
    const showToast = (msg, type = 'info') => {
      const toast = $('#toast'); clearTimeout(toastTimeout);
      let icon = type === 'error' 
        ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
        : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
      $('#toastMessage').innerHTML = `${icon} ${msg}`;
      toast.className = `fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border backdrop-blur-xl font-bold text-sm flex items-center transition-all ${type === 'error' ? 'bg-red-900/90 border-red-500 text-white' : 'bg-dark/95 border-primary text-primary'}`;
      toast.classList.remove('hidden');
      requestAnimationFrame(() => toast.classList.remove('opacity-0', '-translate-y-4'));
      toastTimeout = setTimeout(() => { toast.classList.add('opacity-0', '-translate-y-4'); setTimeout(() => toast.classList.add('hidden'), 400); }, 3000);
    };

    // --- LAZY LOAD ANIMATION OBSERVER ---
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px 50px 0px" });

    const initLazyLoad = () => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if(node.nodeType === 1) {
              if(node.classList.contains('lazy-show')) scrollObserver.observe(node);
              const children = node.querySelectorAll('.lazy-show');
              children.forEach(c => scrollObserver.observe(c));
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    // --- PRELOADER & CONSENT MODAL LOGIC ---
    window.addEventListener('load', () => {
      setTimeout(() => {
        const preloader = $('#preloader');
        if (preloader) preloader.classList.add('hidden-loader');
        
        if (!localStorage.getItem('animeConsentAccepted')) {
          setTimeout(() => {
            const consentModal = $('#consentModal');
            if (consentModal) {
              consentModal.classList.remove('hidden');
              consentModal.classList.add('flex'); 
              requestAnimationFrame(() => {
                consentModal.classList.remove('opacity-0');
              });
            }
          }, 600);
        }
      }, 1500);
    });

    document.addEventListener('DOMContentLoaded', () => {
      const consentCheck = $('#consentCheck');
      const consentBtn = $('#consentBtn');
      const consentModal = $('#consentModal');

      if (consentCheck && consentBtn) {
        consentCheck.addEventListener('change', (e) => {
          if (e.target.checked) {
            consentBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
          } else {
            consentBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
          }
        });

        consentBtn.addEventListener('click', () => {
          localStorage.setItem('animeConsentAccepted', 'true');
          consentModal.classList.add('opacity-0');
          setTimeout(() => {
            consentModal.classList.add('hidden');
            consentModal.classList.remove('flex');
          }, 500); 
        });
      }
    });

    // AUTH
    const appAuth = {
      mode: 'login', isDummy: !window.firebase || !firebase.apps.length, user: null,
      init() { if (!this.isDummy) { firebase.auth().onAuthStateChanged((user) => { this.user = user; router.loadProfile(); }); } },
      switchTab(tab) {
        this.mode = tab;
        $$('.auth-tab').forEach(t => t.classList.replace('active', 'text-gray-500'));
        $(`.auth-tab[onclick*="${tab}"]`).classList.replace('text-gray-500', 'active');
        $('#authTitle').textContent = tab === 'login' ? 'Sign In' : 'Create Account';
        $('#authSubtitle').textContent = tab === 'login' ? 'Enter your details to proceed.' : 'Join the Animeverse network today.';
        $('#authSubmitBtn').textContent = tab === 'login' ? 'Sign In Securely' : 'Register Account';
        $('#forgotPassWrap').style.display = tab === 'login' ? 'flex' : 'none';
      },
      async submit() {
        const email = $('#authEmail').value.trim(); const pass = $('#authPassword').value;
        if(!email || !pass) return showToast('Please fill all fields', 'error');
        if(this.isDummy) { this.user = { displayName: 'OtakuMaster', email: email, photoURL: null }; showToast(`${this.mode === 'login'?'Login':'Registration'} success!`); $('#authEmail').value = ''; $('#authPassword').value = ''; router.loadProfile(); return; }
        try { if(this.mode === 'login') await firebase.auth().signInWithEmailAndPassword(email, pass); else await firebase.auth().createUserWithEmailAndPassword(email, pass); showToast(`Success!`); } catch(e) { showToast(e.message, 'error'); }
      },
      async googleSignIn() {
        if(this.isDummy) { this.user = { displayName: 'Google User', email: 'user@gmail.com', photoURL: null }; showToast('Google Login success!'); router.loadProfile(); return; }
        try { const provider = new firebase.auth.GoogleAuthProvider(); await firebase.auth().signInWithPopup(provider); showToast('Google Sign In successful'); } catch(e) { showToast(e.message, 'error'); }
      },
      async forgotPassword() {
        const email = $('#authEmail').value.trim(); if(!email) return showToast('Enter your email first', 'error');
        if(this.isDummy) return showToast('Reset link sent to ' + email);
        try { await firebase.auth().sendPasswordResetEmail(email); showToast('Password reset link sent!'); } catch(e) { showToast(e.message, 'error'); }
      },
      async signOut() {
        if(this.isDummy) { this.user = null; showToast('Logged out'); router.loadProfile(); return; }
        await firebase.auth().signOut(); showToast('Logged out securely');
      }
    };

    // ROUTER
    const router = {
      currentView: 'home',
      navigate(view, data = null) {
        $$('.view').forEach(v => { v.classList.remove('active'); v.style.animation = 'none'; });
        const target = $(`#view-${view}`);
        if (target) {
          void target.offsetWidth; target.classList.add('active'); target.style.animation = ''; this.currentView = view;
          if (view === 'details' && data) this.loadDetails(data);
          if (view === 'genre' && data) this.loadGenre(data);
          if (view === 'history') this.loadHistory();
          if (view === 'profile') this.loadProfile();
          
          if(view === 'search') setTimeout(() => $('#searchInputPage').focus(), 100);
          
          $$('.nav-tab, .nav-link').forEach(el => { 
            el.classList.toggle('active', el.dataset.view === view && !el.dataset.section); 
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      back() { this.navigate('home'); },
      
      async loadGenre(data) {
        $('#genreTitle').textContent = data.name + ' Anime'; const list = $('#genreList');
        list.innerHTML = Array(12).fill(`<div class="skeleton rounded-xl w-full poster-aspect"></div>`).join('');
        try { const res = await tmdb.fetch('/discover/tv', { with_genres: `16,${data.id}`, with_original_language: 'ja', sort_by: 'popularity.desc' }); res.results.forEach(m => m.media_type = 'tv'); list.innerHTML = res.results.filter(a => a.poster_path).map(a => renderCard(a)).join(''); } catch(e) { list.innerHTML = '<p class="text-red-500 col-span-full">Failed to load genre.</p>'; }
      },

      async loadDetails(reqData) {
        const id = reqData.id; const type = reqData.media_type || 'tv';
        const titleEls = [$('#detailTitle'), $('#detailTitleMobile')];
        titleEls.forEach(el => { if(el) el.textContent = 'Loading Anime...'; });
        $('#detailOverview').innerHTML = '<div class="h-4 w-full bg-white/10 rounded animate-pulse mb-2"></div><div class="h-4 w-3/4 bg-white/10 rounded animate-pulse"></div>';
        const posterEls = [$('#detailPoster'), $('#detailPosterMobile')];
        posterEls.forEach(el => { if(el) { el.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; el.classList.add('skeleton'); }});
        $('#detailHeroBg').style.backgroundImage = ''; $('#episodeSection').classList.add('hidden'); $('#creditsList').innerHTML = ''; $('#detailGenres').innerHTML = '';
        const iframe = $('#videoFrame'); const overlay = $('#playerOverlay'); const serverSection = $('#serverSection');
        iframe.src = ''; iframe.classList.add('hidden'); overlay.classList.remove('hidden'); serverSection.classList.add('hidden');
        $$('.server-btn').forEach(b => b.classList.remove('active')); $$('[data-server="1"]')[0]?.classList.add('active');

        try {
          const anime = await tmdb.getDetails(id, type);
          const titleText = anime.name || anime.title || 'Unknown Title'; const yearText = (anime.first_air_date || anime.release_date)?.split('-')[0] || 'TBA';
          titleEls.forEach(el => { if(el) el.textContent = titleText; });
          $('#detailOverview').textContent = anime.overview || 'Synopsis not available.';
          $('#detailRating span').textContent = anime.vote_average?.toFixed(1) || '0.0'; if($('#detailRatingMobile')) $('#detailRatingMobile').textContent = anime.vote_average?.toFixed(1) || '0.0';
          if($('#detailYear')) $('#detailYear').textContent = yearText; if($('#detailYearMobile')) $('#detailYearMobile').textContent = yearText;
          if($('#detailType')) $('#detailType').textContent = type === 'movie' ? 'Movie' : 'TV'; if($('#detailTypeMobile')) $('#detailTypeMobile').textContent = type === 'movie' ? 'Movie' : 'TV';
          
          const posterPath = anime.poster_path ? `${IMG_BASE}/w500${anime.poster_path}` : '';
          posterEls.forEach(el => { if(el && posterPath) { el.src = posterPath; el.onload = ()=> el.classList.remove('skeleton'); }});
          if(anime.backdrop_path) { $('#detailHeroBg').style.backgroundImage = `url(${IMG_BASE}/original${anime.backdrop_path})`; $('#playerOverlay').style.backgroundImage = `url(${IMG_BASE}/original${anime.backdrop_path})`; }

          if (anime.genres) $('#detailGenres').innerHTML = anime.genres.map(g => `<span class="px-3 py-1.5 bg-white/5 shadow-inner rounded-lg border border-white/10 text-[10px] uppercase font-bold text-gray-300 tracking-widest">${g.name}</span>`).join('');
          
          const imdbId = anime.external_ids?.imdb_id || anime.imdb_id || id;

          if (type === 'tv' && anime.seasons) {
            $('#episodeSection').classList.remove('hidden'); const validSeasons = anime.seasons.filter(s => s.season_number > 0);
            $('#seasonSelect').innerHTML = (validSeasons.length ? validSeasons : anime.seasons).map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('');
            const loadEpisodes = async (seasonNum) => {
              const epGrid = $('#episodeGrid'); epGrid.innerHTML = Array(4).fill('<div class="h-10 bg-white/5 rounded-lg skeleton"></div>').join('');
              try {
                const epData = await tmdb.fetch(`/tv/${id}/season/${seasonNum}`);
                if(epData.episodes?.length > 0) {
                  epGrid.innerHTML = epData.episodes.map(ep => `<button class="ep-card bg-dark/50 border border-white/10 rounded-lg py-2.5 px-3 font-bold text-sm transition hover:bg-white/5" data-ep="${ep.episode_number}"><span class="ep-num">EP ${ep.episode_number}</span></button>`).join('');
                  $$('.ep-card').forEach(btn => btn.onclick = () => { $$('.ep-card').forEach(b => b.classList.remove('active')); btn.classList.add('active'); this.loadPlayer(id, type, seasonNum, btn.dataset.ep, $('.server-btn.active')?.dataset.server || '1', imdbId); overlay.classList.add('hidden'); iframe.classList.remove('hidden'); serverSection.classList.remove('hidden'); });
                  $$('.ep-card')[0]?.classList.add('active');
                } else epGrid.innerHTML = `<button class="ep-card active bg-primary/20 border border-primary/50 text-primary rounded-lg py-2.5 font-bold col-span-2" data-ep="1">EP 1</button>`;
              } catch(e) { epGrid.innerHTML = `<p class="text-red-400 text-sm">Failed to load episodes</p>`; }
            };
            $('#seasonSelect').onchange = (e) => loadEpisodes(e.target.value); if($('#seasonSelect').options.length) loadEpisodes($('#seasonSelect').options[0].value);
          }

          if (anime.credits?.cast) {
            $('#creditsList').innerHTML = anime.credits.cast.slice(0, 10).map(p => `
              <div class="flex-shrink-0 w-20 text-center group cursor-pointer">
                <div class="w-16 h-16 mx-auto rounded-full overflow-hidden mb-2 border-2 border-white/10 group-hover:border-primary transition duration-300 shadow-lg"><img src="${p.profile_path ? `${IMG_BASE}/w185${p.profile_path}` : 'https://via.placeholder.com/185/10101a/ff2e93?text=?'}" class="w-full h-full object-cover skeleton transition-transform duration-500 group-hover:scale-110" onload="this.classList.remove('skeleton')"></div>
                <p class="text-[11px] font-bold text-gray-200 truncate leading-tight">${p.name}</p>
              </div>
            `).join('');
          }

          const triggerPlay = () => {
            overlay.classList.add('hidden'); iframe.classList.remove('hidden'); serverSection.classList.remove('hidden');
            this.loadPlayer(id, type, $('#seasonSelect')?.value || 1, $('.ep-card.active')?.dataset.ep || 1, $('.server-btn.active')?.dataset.server || '1', imdbId);
            this.addToHistory({ id, title: titleText, media_type: type, poster_path: anime.poster_path, first_air_date: yearText }); 
          };

          $('#playBtn').onclick = (e) => { e.stopPropagation(); triggerPlay(); }; overlay.onclick = triggerPlay;
          $$('.server-btn').forEach(btn => btn.onclick = () => { $$('.server-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); if(!overlay.classList.contains('hidden')) triggerPlay(); else this.loadPlayer(id, type, $('#seasonSelect')?.value || 1, $('.ep-card.active')?.dataset.ep || 1, btn.dataset.server, imdbId); });

          const addHist = () => { this.addToHistory({id, title:titleText, media_type:type, poster_path:anime.poster_path, first_air_date:yearText}); showToast('Added to watch list!'); };
          if($('#addToHistoryBtn')) $('#addToHistoryBtn').onclick = addHist; if($('#addToHistoryBtnMobile')) $('#addToHistoryBtnMobile').onclick = addHist;

        } catch (e) { console.error(e); titleEls.forEach(el => { if(el) el.textContent = 'API Error'; }); showToast('Failed to load details', 'error'); }
      },
      
      loadPlayer(id, type, season = 1, episode = 1, server = '1', imdbId = null) {
        const iframe = $('#videoFrame'); 
        let url = '';
        const targetId = (server === '1' && imdbId) ? imdbId : id; 
        
        // Base64 Encoded Server URLs (Hides them from plain text search)
        const s1 = atob('aHR0cHM6Ly9waWV4ZTQxMXFvay5jb20='); // Gw Server
        const s2 = atob('aHR0cHM6Ly92aWRzdG9ybS5ydQ=='); // 4k Streaming
        const s3 = atob('aHR0cHM6Ly9wbGF5ZXIudmlkZWFzeS5uZXQ='); // Mafia
        const s4 = atob('aHR0cHM6Ly92c2VtYmVkLnJ1'); // Zerox
        const s5 = atob('aHR0cHM6Ly9wbGF5ZXIudmlkaWZ5LnRvcA=='); // vidify
        const s6 = atob('aHR0cHM6Ly9tdWx0aWVtYmVkLm1vdg=='); // multiembed
        const s7 = atob('aHR0cHM6Ly93d3cuMmVtYmVkLmNj'); // 2embed

        switch(server) {
          case '1': 
            url = type === "movie" ? `${s1}/play/${targetId}` : `${s1}/play/${targetId}?s=${season}&e=${episode}`;
            break;
          case '2': 
            url = type === 'tv' ? `${s2}/tv/${id}/${season}/${episode}` : `${s2}/movie/${id}`; 
            break;
          case '3': 
            url = type === 'tv' ? `${s3}/anime/${id}/${episode}` : `${s3}/movie/${id}`; 
            break;
          case '4': 
            url = type === 'tv' ? `${s4}/embed/tv/${id}/${season}-${episode}?autoplay=1&autonext=1` : `${s4}/embed/movie/${id}?autoplay=1&autonext=1`; 
            break;
          case '5': 
            url = type === 'tv' ? `${s5}/embed/tv/${id}/${season}/${episode}` : `${s5}/embed/movie/${id}`; 
            break;
          case '6': 
            url = `${s6}/directstream.php?video_id=${id}`; 
            break;
          case '7': 
            url = type === 'tv' ? `${s7}/embedtv/${id}` : `${s7}/embed/${id}`; 
            break;
        }
        
        // Load the URL safely
        iframe.src = url;
      },
      
      addToHistory(anime) {
        if(!anime || !anime.id) return; let history = JSON.parse(localStorage.getItem('animeHistory') || '[]');
        history = history.filter(a => a.id !== anime.id); history.unshift({ ...anime, watchedAt: Date.now() });
        if (history.length > 50) history = history.slice(0, 50); localStorage.setItem('animeHistory', JSON.stringify(history));
      },
      
      loadHistory() {
        const list = $('#historyList'); const history = JSON.parse(localStorage.getItem('animeHistory') || '[]');
        if (!history.length) {
          list.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-500"><svg class="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><p class="text-xl font-anime font-black">List is empty</p></div>`;
          $('#clearHistoryBtn').classList.add('hidden'); return;
        }
        $('#clearHistoryBtn').classList.remove('hidden'); list.innerHTML = history.map(anime => renderCard(anime, false, null, true)).join('');
      },
      
      loadProfile() {
        const history = JSON.parse(localStorage.getItem('animeHistory') || '[]');
        if (appAuth.user) {
          $('#profileName').textContent = appAuth.user.displayName || 'Anime Fan'; $('#profileEmail').textContent = appAuth.user.email; $('#profileHistoryCount').textContent = history.length;
          if(appAuth.user.photoURL) { $('#profileAvatarBig').src = appAuth.user.photoURL; $('#profileAvatarBig').classList.remove('hidden'); $('#profileAvatarSvg').classList.add('hidden'); } 
          else { $('#profileAvatarBig').classList.add('hidden'); $('#profileAvatarSvg').classList.remove('hidden'); }
          $('#headerAuthBtn').innerHTML = `<svg class="w-4 h-4 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> Profile`;
          $('#profileAuth').classList.add('hidden'); $('#profileSignedIn').classList.remove('hidden');
        } else {
          $('#headerAuthBtn').innerHTML = `<svg class="w-4 h-4 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg> Sign In`;
          $('#profileAuth').classList.remove('hidden'); $('#profileSignedIn').classList.add('hidden');
        }
      }
    };

    const tmdb = {
      async fetch(endpoint, params = {}) {
        const url = new URL(`${TMDB_BASE}${endpoint}`); url.searchParams.append('api_key', TMDB_API_KEY);
        Object.entries(params).forEach(([k,v]) => url.searchParams.append(k, v));
        const res = await fetch(url); if (!res.ok) throw new Error(`TMDB Error`); return res.json();
      },
      async getTrendingAnime() { 
        const data = await this.fetch('/trending/all/day', { language: 'en-US' }); 
        data.results = data.results.filter(a => ['tv', 'movie'].includes(a.media_type) && (a.original_language === 'ja' || a.genre_ids?.includes(16)));
        return data;
      },
      async getPopularAnime() { 
        const data = await this.fetch('/discover/movie', { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc', page: 1 }); 
        data.results.forEach(m => m.media_type = 'movie');
        return data;
      },
      async getTopRatedAnime() { 
        const data = await this.fetch('/discover/tv', { with_genres: '16', with_original_language: 'ja', sort_by: 'vote_average.desc', 'vote_count.gte': 500, page: 1 }); 
        data.results.forEach(m => m.media_type = 'tv');
        return data;
      },
      async searchAnime(query) { 
        const data = await this.fetch('/search/multi', { query, include_adult: false }); 
        data.results = data.results.filter(a => ['tv', 'movie'].includes(a.media_type) && (a.original_language === 'ja' || a.genre_ids?.includes(16)));
        return data;
      },
      async getDetails(id, type = 'tv') { return this.fetch(`/${type}/${id}`, { append_to_response: 'credits,external_ids' }); }
    };

    const renderCard = (anime, isTop = false, rank = null, historyView = false) => {
      if(!anime.poster_path) return '';
      const title = anime.name || anime.title; const rating = anime.vote_average ? anime.vote_average.toFixed(1) : (historyView ? '--' : '0.0'); const year = (anime.first_air_date || anime.release_date)?.split('-')[0] || '--';
      const mType = anime.media_type === 'movie' ? 'MOVIE' : 'TV';
      return `
        <div class="glass-card lazy-show rounded-xl overflow-hidden card-hover cursor-pointer relative ${isTop ? 'min-w-[160px] md:min-w-[200px]' : ''}" onclick="router.navigate('details', {id: ${anime.id}, media_type: '${anime.media_type || 'tv'}'})">
          ${rank ? `<div class="absolute -top-1 -left-1 w-8 h-8 rounded-br-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-black text-xs z-10 shadow-lg">${rank}</div>` : ''}
          <div class="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur rounded text-[9px] font-bold z-10 border border-white/10 uppercase tracking-widest text-primary">${mType}</div>
          <div class="relative w-full poster-aspect overflow-hidden bg-dark skeleton"><img src="${IMG_BASE}/w300${anime.poster_path}" class="w-full h-full object-cover" onload="this.parentElement.classList.remove('skeleton')"></div>
          <div class="p-3 border-t border-white/5 bg-[#0a0a0f] h-[70px]">
            <h4 class="font-bold text-xs md:text-sm leading-tight truncate text-gray-100 font-anime">${title}</h4>
            <div class="flex justify-between items-center mt-1.5 text-[10px] font-bold text-gray-500">
              ${historyView ? `<span>${year}</span>` : `<span class="flex items-center gap-1 text-yellow-400/90"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> ${rating}</span>`}
              <span>${mType}</span>
            </div>
          </div>
        </div>
      `;
    };

    const sections = {
      hero: {
        slides: [], currentIndex: 0, interval: null,
        async init() {
          try {
            const data = await tmdb.getTrendingAnime(); this.slides = data.results.filter(a => a.backdrop_path).slice(0, 5);
            if(!this.slides.length) return;
            $('#heroSlider').innerHTML = this.slides.map((a, i) => `<div class="hero-slide w-full h-full ${i === 0 ? 'active' : ''}"><div class="hero-bg w-full h-full bg-cover bg-center" style="background-image: url('${IMG_BASE}/original${a.backdrop_path}')"></div></div>`).join('');
            this.update(this.slides[0]); this.start();
          } catch(e) { $('#heroTitle').textContent = "Connection Error"; }
        },
        update(anime) {
          $('#heroTitle').textContent = anime.name || anime.title; $('#heroRatingValue').textContent = anime.vote_average?.toFixed(1) || '0.0'; $('#heroOverview').textContent = anime.overview;
          $('#heroTypeBadge').textContent = anime.media_type === 'movie' ? 'MOVIE HD' : 'TV HD';
          const nav = () => router.navigate('details', { id: anime.id, media_type: anime.media_type || 'tv' }); $('#heroWatchBtn').onclick = nav;
        },
        start() {
          if (this.interval) clearInterval(this.interval);
          this.interval = setInterval(() => { this.currentIndex = (this.currentIndex + 1) % this.slides.length; $$('.hero-slide').forEach((s, i) => s.classList.toggle('active', i === this.currentIndex)); this.update(this.slides[this.currentIndex]); }, 8000);
        }
      },
      async buildRow(id, fetchFn, isTop) {
        const c = $(id); if(!c) return; c.innerHTML = Array(6).fill(`<div class="skeleton rounded-xl ${isTop?'min-w-[160px] md:min-w-[200px]':'w-full'} poster-aspect"></div>`).join('');
        try { const data = await fetchFn(); c.innerHTML = data.results.filter(a => a.poster_path).slice(0, 12).map((a, i) => renderCard(a, isTop, isTop?i+1:null)).join(''); } catch(e) { c.innerHTML = '<p class="text-sm text-red-500 p-4">Loading failed.</p>'; }
      }
    };

    // SEARCH SYSTEM 
    const searchSystem = {
      init() {
        const attachSearch = (inputId, resultsId, suggestionsId, loadingId, errorId) => {
          const input = $(inputId); const results = $(resultsId); const sugg = $(suggestionsId); const load = $(loadingId); const err = $(errorId);
          if(!input || !results) return;
          
          input.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim(); 
            if (!query) { 
              results.classList.add('hidden'); if(load) load.classList.add('hidden'); if(err) err.classList.add('hidden'); if(sugg) sugg.classList.remove('hidden'); return; 
            }
            if(sugg) sugg.classList.add('hidden'); results.classList.add('hidden'); if(err) err.classList.add('hidden');
            if(load) load.classList.remove('hidden');
            
            try {
              const data = await tmdb.searchAnime(query); const valid = data.results.filter(r => r.poster_path).slice(0, 12);
              if(load) load.classList.add('hidden');
              if (!valid.length) { if(err) err.classList.remove('hidden'); return; }
              
              results.classList.remove('hidden');
              
              if(inputId === '#searchInput') {
                results.innerHTML = valid.map(anime => `
                  <div class="flex gap-3 p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition" onclick="router.navigate('details', {id: ${anime.id}, media_type: '${anime.media_type}'}); document.dispatchEvent(new Event('closeDesktopSearch'));">
                    <img src="${IMG_BASE}/w92${anime.poster_path}" class="w-10 h-14 object-cover rounded shadow">
                    <div class="flex flex-col justify-center min-w-0">
                      <h4 class="font-bold text-sm truncate text-white">${anime.name || anime.title}</h4>
                      <span class="text-[10px] text-primary font-bold tracking-widest mt-0.5 uppercase">${anime.media_type === 'movie' ? 'MOVIE' : 'TV'} • ${(anime.first_air_date || anime.release_date)?.split('-')[0] || ''}</span>
                    </div>
                  </div>
                `).join('');
              } else {
                results.innerHTML = valid.map(anime => renderCard(anime, false)).join('');
              }
            } catch(e) { 
              if(load) load.classList.add('hidden'); 
              if(err) { err.textContent = 'API Error occurred'; err.classList.remove('hidden'); }
            }
          }, 400));
        };

        attachSearch('#searchInput', '#searchResults', null, null, null); 
        attachSearch('#searchInputPage', '#searchResultsPage', '#searchSuggestions', '#searchLoadingPage', '#searchErrorPage');
        
        document.addEventListener('closeDesktopSearch', () => {
          $('#searchResults').classList.add('hidden'); $('#searchInput').value = ''; $('#searchInput').blur();
        });
        
        document.addEventListener('click', (e) => { 
          const sr = $('#searchResults'); 
          if (sr && !$('#searchInput').contains(e.target) && !sr.contains(e.target)) {
            sr.classList.add('hidden');
          } 
        });
      }
    };

// --- PWA REGISTRATION & OFFLINE LOGIC ---
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Registering SW with exact path
        navigator.serviceWorker.register('/Anime/sw.js')
          .then(reg => console.log('PWA SW Registered!', reg.scope))
          .catch(err => console.error('PWA Setup Failed:', err));
      });
    }

    const offlineModal = document.getElementById('offlineModal');
    
    window.addEventListener('offline', () => {
      offlineModal.classList.remove('hidden');
      offlineModal.classList.add('flex');
      requestAnimationFrame(() => offlineModal.classList.remove('opacity-0'));
    });

    window.addEventListener('online', () => {
      offlineModal.classList.add('opacity-0');
      setTimeout(() => {
        offlineModal.classList.add('hidden');
        offlineModal.classList.remove('flex');
        showToast('Internet connection restored!', 'info');
      }, 500);
    });

    // --- PWA INSTALL PROMPT LOGIC ---
    let deferredPrompt;
    const installBtn = document.getElementById('installPwaBtn');

    // Listen for the browser telling us the app can be installed
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      deferredPrompt = e;
      // Remove 'hidden' and show the button
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.classList.add('flex');
      }
    });

    // Handle the install button click
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          // Hide the button if they install it
          installBtn.classList.add('hidden');
          installBtn.classList.remove('flex');
        }
        // Throw away the prompt, it can only be used once
        deferredPrompt = null;
      });
    }

    // Double check: if app is installed successfully, hide the button forever
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      if (installBtn) {
        installBtn.classList.add('hidden');
        installBtn.classList.remove('flex');
      }
    });
    
    // INIT
    document.addEventListener('DOMContentLoaded', async () => {
      initLazyLoad(); 
      appAuth.init();
      
      $$('.nav-link, .nav-tab').forEach(el => el.addEventListener('click', (e) => {
        const targetView = el.dataset.view;
        if (!targetView) return; 
        router.navigate(targetView);
        if (el.dataset.section) setTimeout(() => $({trending:'#rowTrending', movies:'#rowPopular', top:'#rowTopRated'}[el.dataset.section])?.parentElement.scrollIntoView({behavior:'smooth', block: 'start'}), 100);
      }));

      const toggleMenu = () => { $('#mobileMenu').classList.toggle('open'); $('#menuOverlay').classList.toggle('hidden'); };
      $('#mobileMenuBtn').onclick = toggleMenu; $('#menuOverlay').onclick = toggleMenu; $('#closeMenuBtn').onclick = toggleMenu;
      $$('#mobileMenu .nav-link, #mobileMenu button[onclick]').forEach(link => link.addEventListener('click', toggleMenu));

      $('#clearHistoryBtn').onclick = () => { if(confirm('Wipe history?')) { localStorage.removeItem('animeHistory'); router.loadHistory(); showToast('History Cleared'); } };

      sections.hero.init();
      sections.buildRow('#rowTrending', () => tmdb.getTrendingAnime(), true);
      sections.buildRow('#rowPopular', () => tmdb.getPopularAnime(), false);
      sections.buildRow('#rowTopRated', () => tmdb.getTopRatedAnime(), false);
      
      searchSystem.init();
      router.loadProfile();
      window.addEventListener('popstate', () => router.navigate('home'));
    });
  
