(function(){
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Real mouse pointer only — the pointer-sheen (and other hover-specular effects) are pointless on touch,
  // where they also cost pointermove work during scroll. Gate the JS the same way the CSS gates the sheen.
  var fineHover = !!(window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches);

  /* ---------- Liquid-glass refraction gate (Chromium renders SVG-on-backdrop) ---------- */
  try{
    if(window.chrome && CSS.supports('backdrop-filter','url(#x)')){
      document.documentElement.classList.add('refraction-ok');
    }
  }catch(e){/* no-op: frosted-glass floor stays in effect */}

  /* ---------- Mobile nav menu (hamburger) toggle + focus management ---------- */
  (function(){
    var burger=document.querySelector('.nav-burger'), menu=document.getElementById('mobile-menu');
    if(!burger||!menu) return;
    var links = Array.prototype.slice.call(menu.querySelectorAll('a'));
    function isOpen(){ return burger.getAttribute('aria-expanded')==='true'; }
    // restoreFocus: pull focus back to the burger (Escape / toggle-close) so keyboard + SR users
    // aren't stranded. On open, move focus INTO the menu (first link) so it's announced + navigable.
    function setOpen(o, restoreFocus){
      burger.setAttribute('aria-expanded', o?'true':'false');
      menu.classList.toggle('open', o);
      if(o){ if(links[0]) links[0].focus(); }
      else if(restoreFocus){ burger.focus(); }
    }
    burger.addEventListener('click',function(e){ e.stopPropagation(); setOpen(!isOpen(), false); });
    // link click closes + navigates (anchor takes focus naturally — don't yank it back to the burger)
    links.forEach(function(a){ a.addEventListener('click',function(){ setOpen(false, false); }); });
    document.addEventListener('click',function(e){ if(isOpen() && !menu.contains(e.target) && e.target!==burger) setOpen(false, false); });
    document.addEventListener('keydown',function(e){
      if(!isOpen()) return;
      if(e.key==='Escape'){ setOpen(false, true); return; }
      if(e.key==='Tab'){
        // trap focus across [burger + menu links] while the menu is open
        var order = [burger].concat(links), i = order.indexOf(document.activeElement);
        if(e.shiftKey && i<=0){ e.preventDefault(); order[order.length-1].focus(); }
        else if(!e.shiftKey && i===order.length-1){ e.preventDefault(); order[0].focus(); }
      }
    });
  })();

  /* ---------- Pointer-reactive sheen (rAF-throttled). No tilt/pull — it blurred the glass text. ---------- */
  if(!reduceMotion && fineHover){
    document.querySelectorAll('.reactive').forEach(function(el){
      var raf = 0, lx = 50, ly = 50;
      el.addEventListener('pointermove', function(e){
        var r = el.getBoundingClientRect();
        lx = (e.clientX - r.left)/r.width*100;
        ly = (e.clientY - r.top)/r.height*100;
        if(raf) return;
        raf = requestAnimationFrame(function(){
          raf = 0;
          el.style.setProperty('--mx', lx.toFixed(1)+'%');
          el.style.setProperty('--my', ly.toFixed(1)+'%');
        });
      });
    });
  }

  /* ---------- Nav scroll-lift (e1→e2 when floating over content), rAF-throttled ---------- */
  (function(){
    var nav = document.querySelector('.nav');
    if(!nav) return;
    var ticking = false;
    function update(){ nav.classList.toggle('stuck', window.scrollY > 40); ticking = false; }
    window.addEventListener('scroll', function(){
      if(!ticking){ ticking = true; requestAnimationFrame(update); }
    }, {passive:true});
    update();
  })();

  /* ---------- Liquid press ripple on CTAs + answer options (injected, GPU-cheap) ---------- */
  if(!reduceMotion){
    document.querySelectorAll('.cta-glass, .opt').forEach(function(el){
      var box = document.createElement('span');
      box.className = 'ripple'; box.setAttribute('aria-hidden','true');
      el.appendChild(box);
      el.addEventListener('pointerdown', function(e){
        if(el.disabled) return;
        var r = el.getBoundingClientRect();
        var dot = document.createElement('i');
        dot.style.setProperty('--rx', (e.clientX - r.left)+'px');
        dot.style.setProperty('--ry', (e.clientY - r.top)+'px');
        box.appendChild(dot);
        requestAnimationFrame(function(){ dot.classList.add('go'); });
        dot.addEventListener('animationend', function(){ dot.remove(); });
      });
    });
  }

  /* ---------- Segmented glass toggle — slide the .thumb under the active button ---------- */
  (function(){
    var seg = document.getElementById('mode-seg');
    if(!seg) return;
    var thumb = seg.querySelector('.thumb');
    var btns = Array.prototype.slice.call(seg.querySelectorAll('button'));
    var helper = document.getElementById('quiz-helper-text');
    var HINTS = {
      train: 'Тут можна помилятися — це тренування, а не іспит.',
      exam:  'Як на справжньому іспиті: одна спроба на питання.'
    };
    function place(btn){
      if(!thumb) return;
      thumb.style.width = btn.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + (btn.offsetLeft - 4) + 'px)';
    }
    function select(btn, focus){
      btns.forEach(function(b){
        var on = b === btn;
        b.setAttribute('aria-checked', on ? 'true':'false');
        b.tabIndex = on ? 0 : -1;
      });
      place(btn);
      if(helper && btn.dataset.mode && HINTS[btn.dataset.mode]) helper.textContent = HINTS[btn.dataset.mode];
      if(focus) btn.focus();
    }
    btns.forEach(function(b, i){
      b.addEventListener('click', function(){ select(b); });
      b.addEventListener('keydown', function(e){
        var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1
                : (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   ? -1 : 0;
        if(!dir) return;
        e.preventDefault();
        select(btns[(i + dir + btns.length) % btns.length], true);
      });
    });
    var active = seg.querySelector('button[aria-checked="true"]') || btns[0];
    requestAnimationFrame(function(){ place(active); });
    window.addEventListener('resize', function(){
      place(seg.querySelector('button[aria-checked="true"]') || btns[0]);
    });
    // Fonts change button metrics — on slower phone font loads the thumb can land a few px off. Re-place
    // once the web fonts are ready so the thumb aligns to the final text width.
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){ place(seg.querySelector('button[aria-checked="true"]') || btns[0]); });
    }
  })();

  /* ---------- Interactive sample question ---------- */
  var options  = document.getElementById('options');
  var feedback = document.getElementById('feedback');
  var fbIc     = document.getElementById('fb-ic');
  var fbText   = document.getElementById('fb-text');
  var xp       = document.getElementById('xp');
  var resetBtn = document.getElementById('reset');
  var answered = false;

  var ICON_OK = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 13 4 4L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_NO = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var CORRECT = '<b>Правильно!</b> Жовте миготливе означає, що перехрестя нерегульоване — далі діють знаки пріоритету.';
  var WRONG   = '<b>Не зовсім.</b> Жовте миготливе = перехрестя нерегульоване; рухайся за знаками пріоритету. Правильна відповідь підсвічена нижче.';

  function getButtons(){ return Array.prototype.slice.call(options.querySelectorAll('.opt')); }
  function optText(b){ var s = b.querySelector('span:last-child'); return s ? s.textContent : ''; }

  function answer(clicked){
    if(answered) return;
    answered = true;
    var buttons = getButtons();
    var isRight = clicked.getAttribute('data-correct') === 'true';

    buttons.forEach(function(b){
      b.disabled = true;
      if(b.getAttribute('data-correct') === 'true'){
        b.classList.add('correct');
        if(!reduceMotion) b.classList.add('reveal-soft');
        var m = b.querySelector('.mark');
        if(m) m.textContent = '✓';
        b.setAttribute('aria-label', 'Правильна відповідь: ' + optText(b));
      }
    });
    if(!isRight){
      clicked.classList.add('wrong');
      var mk = clicked.querySelector('.mark');
      if(mk) mk.textContent = '✕';
      clicked.setAttribute('aria-label', 'Неправильна відповідь: ' + optText(clicked));
    }

    feedback.classList.remove('ok','no');
    feedback.classList.add('show', isRight ? 'ok' : 'no');
    fbIc.innerHTML = isRight ? ICON_OK : ICON_NO;
    fbText.innerHTML = isRight ? CORRECT : WRONG;

    xp.classList.add('show');
    resetBtn.classList.add('show');
    /* move focus to the explanation so keyboard/SR users don't sit on a disabled option */
    feedback.setAttribute('tabindex','-1');
    feedback.focus();
  }

  function reset(){
    answered = false;
    getButtons().forEach(function(b,i){
      b.disabled = false;
      b.classList.remove('correct','wrong','reveal-soft');
      b.removeAttribute('aria-label');
      var m = b.querySelector('.mark');
      if(m) m.textContent = ['А','Б','В','Г'][i];
    });
    feedback.classList.remove('show','ok','no');
    fbText.innerHTML = '';
    fbIc.innerHTML = '';
    xp.classList.remove('show');
    resetBtn.classList.remove('show');
    var first = getButtons()[0];
    if(first) first.focus();
  }

  getButtons().forEach(function(b){
    b.addEventListener('click', function(){ answer(b); });
  });
  resetBtn.addEventListener('click', reset);

  /* ---------- Scroll reveal + animated meters ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  function fillMeters(root){
    root.querySelectorAll('.xp-bar i, .meter i').forEach(function(el){
      if(el.dataset.filled) return; el.dataset.filled = '1';
      el.style.width = (el.getAttribute('data-w') || 0) + '%';
    });
    root.querySelectorAll('.ring .val').forEach(function(c){
      if(c.dataset.filled) return; c.dataset.filled = '1';
      var dash = parseFloat(c.getAttribute('data-dash')) || 251;
      var pct  = parseFloat(c.getAttribute('data-pct')) || 0;
      c.style.strokeDasharray = dash;
      c.style.strokeDashoffset = dash;
      requestAnimationFrame(function(){ c.style.strokeDashoffset = dash * (1 - pct/100); });
    });
  }
  function fillReadyArc(){
    var arc = document.getElementById('readyArc');
    if(!arc || arc.dataset.filled) return; arc.dataset.filled = '1';
    var card = arc.closest('.ready-card');
    var num = card && card.querySelector('.ready-num');
    // Single source of truth: the readiness % lives in .ready-num[data-target]; the arc fill AND the
    // count-up numeral both derive from it, so changing the HTML value can't desync the arc from the
    // number. (251 = the arc path's stroke-dasharray length — a fixed geometric constant.)
    var target = num ? (parseInt(num.getAttribute('data-target'), 10) || 78) : 78;
    requestAnimationFrame(function(){
      arc.style.transition = reduceMotion ? 'none' : 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)';
      arc.style.strokeDashoffset = 251 * (1 - target/100);
    });
    if(reduceMotion) return;
    var bloom = card && card.querySelector('.bloom');
    if(bloom) setTimeout(function(){ bloom.classList.add('lit'); }, 250);
    /* count the numeral 0 -> target in sync with the arc settling (the emotional payoff) */
    if(num){
      num.textContent = '0%';
      var t0 = null, dur = 1500;
      requestAnimationFrame(function step(ts){
        if(t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        num.textContent = Math.round(eased * target) + '%';
        if(p < 1){ requestAnimationFrame(step); }
        else { num.classList.add('count'); }
      });
    }
  }

  if('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('in');
          fillMeters(e.target);
          if(e.target.querySelector && e.target.querySelector('#readyArc')) fillReadyArc();
          if(!reduceMotion && e.target.classList.contains('final-card')){
            var fb = e.target.querySelector('.bloom');
            if(fb) setTimeout(function(){ fb.classList.add('lit'); }, 200);
          }
          io.unobserve(e.target);
        }
      });
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.12});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
    fillMeters(document); fillReadyArc();
  }

  /* ---------- Nav scroll-spy: aria-current on the section in the middle band ---------- */
  (function(){
    if(!('IntersectionObserver' in window)) return;
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
    var map = {};
    links.forEach(function(a){
      var sec = document.getElementById(a.getAttribute('href').slice(1));
      if(sec) map[sec.id] = a;
    });
    var ids = Object.keys(map);
    if(!ids.length) return;
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          links.forEach(function(a){ a.removeAttribute('aria-current'); });
          map[e.target.id].setAttribute('aria-current','true');
        }
      });
    }, {rootMargin:'-45% 0px -50% 0px', threshold:0});
    ids.forEach(function(id){ spy.observe(document.getElementById(id)); });
  })();
})();

/* ===== LIVING MAP BACKGROUND — gating + scroll→journey sync ===== */
(function(){
  var mapbg = document.getElementById('mapbg');
  var frame = document.getElementById('mapbgFrame');
  if(!mapbg || !frame) return;

  // WCAG 2.2.2 — stop/start the background motion (the pill is revealed by __setMapBg when capable).
  var toggleBtn = document.getElementById('mapbg-toggle');
  function reflectToggle(on){
    if(!toggleBtn) return;
    toggleBtn.classList.toggle('is-paused', !on);
    toggleBtn.setAttribute('aria-label', on ? 'Зупинити фоновий рух' : 'Увімкнути фоновий рух');
  }
  if(toggleBtn){
    toggleBtn.addEventListener('click', function(){ window.__setMapBg(!mapPref); });
  }

  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  // On DESKTOP the living map auto-runs (after first interaction). We keep a sane capability floor +
  // the honest opt-outs: reduced-motion, reduced-transparency (glass refraction is the whole point),
  // and save-data / reduced-data (don't pull ~1 MB MapLibre on a metered link). The floor is min-height
  // 480 (skips tiny landscape phones held sideways) + `tooWeak()` (truly ancient / low-end devices fall
  // back to the static pastel-glass field — no map download).
  // PHONES: the map is OFF by DEFAULT — the scroll-fps WebGL render + traffic canvas was the main mobile
  // lag/heat source (laggy even at idle on real devices). `phoneLike` gates the AUTO-boot below, so phones
  // show the calm static pastel field; the live map is OPT-IN via the toggle (or ?map=on). `allowed()`
  // still returns true for a capable phone so the toggle CAN enable it. Only the AUTO-run differs by device.
  var mqDevice = matchMedia('(min-height: 480px)');
  var mqReduceData = matchMedia('(prefers-reduced-data: reduce)');
  var mqReduceTransp = matchMedia('(prefers-reduced-transparency: reduce)');
  var mqContrast = matchMedia('(prefers-contrast: more)');   // CSS hides .mapbg for these users — gate the BOOT too (no invisible ~1MB MapLibre)
  function saveData(){ try{ return !!(navigator.connection && navigator.connection.saveData) || mqReduceData.matches; }catch(e){ return mqReduceData.matches; } }
  // Only TRULY weak / ancient devices skip the map entirely; weak-but-usable devices still get it in
  // LITE mode (map-bg.html reduces car count, canvas pixel-ratio, max zoom & frame-rate for them).
  function tooWeak(){
    try{
      // STRICTER RAM floor on phones/touch: the scroll-driven WebGL map's fast-scroll tile burst
      // (~up to 1 GB) + GPU heat punishes 2–3 GB budget phones, so only ≥4 GB phones run the live
      // map — 2–3 GB phones fall back to the calm static pastel field. Desktop keeps the ≥2 GB floor.
      // (navigator.deviceMemory is Chrome/Android-only & bucketed to [0.25,0.5,1,2,4,8]; iOS Safari
      //  doesn't expose it → iPhones, with strong GPUs, aren't gated by this.)
      var touch = false;
      try{ touch = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 760px)').matches; }catch(e){}
      var memFloor = touch ? 4 : 2;
      if(typeof navigator.deviceMemory === 'number' && navigator.deviceMemory > 0 && navigator.deviceMemory < memFloor) return true;
      if(typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency < 2) return true;
      // very slow link → don't pull ~1 MB MapLibre; fall back to the static field.
      var ct = navigator.connection && navigator.connection.effectiveType;
      if(ct === 'slow-2g' || ct === '2g') return true;
    }catch(e){}
    return false;
  }
  // never load/run the WebGL map under reduced-transparency (glass refraction is the whole point) either.
  // Diagnostic: ?map=off fully skips the map boot (iframe src never set → no MapLibre loads at all) → the
  // "no-map floor" RAM, to measure the live map's true memory share before committing to a pre-render rebuild.
  function mapOff(){ try{ return new URLSearchParams(location.search).get('map')==='off'; }catch(e){ return false; } }
  function allowed(){ return !mapOff() && mqDevice.matches && !mqReduce.matches && !mqReduceTransp.matches && !mqContrast.matches && !saveData() && !tooWeak(); }
  // PHONE PERF: do NOT auto-run the live WebGL map on phones/touch — the scroll-fps WebGL render + the
  // traffic canvas is the main mobile lag/heat source (measured on-device: laggy even at idle). Phones
  // default to the calm STATIC pastel field; the living map is OPT-IN via the toggle (or force ?map=on).
  // Desktop is unchanged. allowed() still returns true for a capable phone so the toggle CAN enable it —
  // only the AUTO-boot below is gated by !phoneLike.
  var phoneLike = false;
  try{ phoneLike = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches; }catch(e){}
  function mapForced(){ try{ return new URLSearchParams(location.search).get('map')==='on'; }catch(e){ return false; } }
  // Diagnostic: ?blur=off kills every backdrop-filter on the page (works with ?map=off too) → measures the
  // glass's share of the RAM floor. ?map=off&blur=off = the bare-HTML floor (no map, no glass).
  (function(){ try{ if(new URLSearchParams(location.search).get('blur')==='off'){
    var bs=document.createElement('style');
    bs.textContent='*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
    (document.head||document.documentElement).appendChild(bs);
  } }catch(e){} })();
  // Emulated-glass tier (drops backdrop-filter on all but the 2 lenses; see body.glass-emu CSS). Forced by
  // ?glass=emu, AND auto-enabled on weak/older devices — ≤4GB RAM, ≤4 logical cores, or whenever the map itself
  // is gated off (!allowed() covers reduced-transparency / reduced-motion / save-data / tooWeak / tiny screens).
  // These are exactly the machines the per-frame backdrop-filter re-blur overheats; capable machines (8GB+/8+
  // cores) keep the real refraction. This is the actual weak-device lite path (2016-era hardware target).
  (function(){ try{
    var dm = navigator.deviceMemory, hc = navigator.hardwareConcurrency;
    var weak = !allowed()
            || (typeof dm === 'number' && dm > 0 && dm <= 4)
            || (typeof hc === 'number' && hc > 0 && hc <= 4);
    if(new URLSearchParams(location.search).get('glass')==='emu' || weak){ document.body.classList.add('glass-emu'); }
  }catch(e){} })();

  var syncing = false, loaded = false, mapPref = (!phoneLike || mapForced());

  // Calibration: anchor each city's MAX zoom to a block of interest. While that block is centered
  // the camera holds at street zoom (a hold band); in the gaps it pulls back, travels and zooms
  // into the next city. Fast scrolling stays at altitude (the map's own scroll-velocity cap);
  // settling on a block lets the zoom rush in. jp = journey progress fed to the map (0..1).
  // 4-city journey (Lviv dropped). jp = each city's MAX-ZOOM dwell position in the map's journey
  // (its routeP ÷ routeEnd 2.17), so when a section is centered the map holds at that city's street zoom.
  // Kyiv routeP .41–.50 → .210 · Odesa .98–1.07 → .472 · Kharkiv 1.56–1.65 → .740 · Dnipro 2.09–2.17 → .982.
  var MAP_ANCHORS = [
    { sel:'#hero',     jp:0.210 },  // Kyiv    — hero
    { sel:'#game',     jp:0.472 },  // Odesa   — "Як це працює"
    { sel:'#pricing',  jp:0.740 },  // Kharkiv — pricing  (#features falls in the Odesa→Kharkiv fly)
    { sel:'#final',    jp:0.982 }   // Dnipro  — final CTA
  ];
  function smoother(t){ t = t < 0 ? 0 : t > 1 ? 1 : t; return t*t*t*(t*(t*6 - 15) + 10); }
  function curScroll(){
    var se = document.scrollingElement || document.documentElement;
    return window.scrollY || window.pageYOffset || se.scrollTop || 0;
  }
  function readProgress(){
    var y = curScroll(), vh = window.innerHeight, baseHold = vh * 0.20;
    var pts = [];
    for(var i = 0; i < MAP_ANCHORS.length; i++){
      var el = document.querySelector(MAP_ANCHORS[i].sel);
      if(!el) continue;
      var r = el.getBoundingClientRect();
      // scrollY at which this section sits centered in the viewport
      pts.push({ c: r.top + y + r.height / 2 - vh / 2, jp: MAP_ANCHORS[i].jp });
    }
    if(!pts.length) return 0.173;
    pts.sort(function(a, b){ return a.c - b.c; });
    if(y <= pts[0].c) return pts[0].jp;
    if(y >= pts[pts.length - 1].c) return pts[pts.length - 1].jp;
    for(var k = 0; k < pts.length - 1; k++){
      var a = pts[k], b = pts[k + 1];
      if(y >= a.c && y <= b.c){
        var h = Math.min(baseHold, (b.c - a.c) * 0.14);   // shorter max-zoom dwell, much longer fly
                                                          // between cities so the camera + map tiles
                                                          // have time to render (no fast blink)
        var aEnd = a.c + h, bStart = b.c - h;
        if(y <= aEnd) return a.jp;                         // holding at city A max zoom
        if(y >= bStart) return b.jp;                       // holding at city B max zoom
        return a.jp + (b.jp - a.jp) * smoother((y - aEnd) / Math.max(1, bStart - aEnd));
      }
    }
    return pts[pts.length - 1].jp;
  }
  // Scroll-driven sync (no perpetual rAF): write the journey progress only when the page actually
  // scrolls/resizes, coalesced to one write per frame. The map's own loop eases the camera from
  // there, so when the user is still we do zero work here.
  var queued = false;
  function writeProgress(){
    queued = false;
    if(!syncing) return;
    try{ var w = frame.contentWindow; if(w) w.__journeyProgress = readProgress(); }catch(e){}
  }
  function onScroll(){ if(syncing && !queued){ queued = true; requestAnimationFrame(writeProgress); } }
  function startSync(){
    if(syncing) return; syncing = true;
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
    onScroll();
    // Re-prime while the iframe boots (its contentWindow is replaced on navigation) and as fonts/
    // layout settle, so the first camera position is correct without needing a scroll.
    [120, 400, 900, 1800, 3000].forEach(function(ms){ setTimeout(onScroll, ms); });
  }
  function stopSync(){
    syncing = false;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  }
  function setPaused(p){ try{ var w = frame.contentWindow; if(w) w.__mapPaused = p; }catch(e){} }

  // If the map errors or simply never loads, tear the background down so no blank/broken frame shows.
  function mapFailed(){
    mapbg.classList.remove('is-on'); document.documentElement.classList.remove('map-live');
    stopSync();
    if(toggleBtn) toggleBtn.classList.remove('show');
  }

  function loadFrameOnce(){
    if(loaded) return;
    loaded = true;
    var settled = false, watchdog = 0;
    frame.addEventListener('load', function(){
      settled = true;
      if(watchdog){ clearTimeout(watchdog); watchdog = 0; }
      setPaused(false); onScroll();
    });
    frame.addEventListener('error', function(){
      if(settled) return;
      settled = true;
      if(watchdog){ clearTimeout(watchdog); watchdog = 0; }
      mapFailed();
    });
    // Start the map already at the hero city (first anchor) so it skips overview tiles.
    var startHash = '#p=' + (MAP_ANCHORS[0] ? MAP_ANCHORS[0].jp : 0.173);
    var src = frame.getAttribute('data-src') + startHash;
    // Loading speed: WARM the self-hosted MapLibre download NOW so the ~1 MB lands in parallel with the
    // hero paint and is HTTP-cache-warm by the time the iframe boots. Only reached on capable devices
    // (loadFrameOnce runs behind allowed()), so phones / data-saver never fetch it. Same-origin → the
    // iframe's <script src="vendor/maplibre-gl.js"> reuses this cached response (no double download).
    ['vendor/maplibre-gl.js', 'vendor/maplibre-gl.css'].forEach(function(href){
      try{
        var l = document.createElement('link');
        l.rel = 'prefetch'; l.as = /\.css$/.test(href) ? 'style' : 'script'; l.href = href;
        document.head.appendChild(l);
      }catch(e){}
    });
    var go = function(){
      frame.src = src;
      // watchdog: if the iframe never fires `load` (missing file, hung network), fall back gracefully.
      watchdog = setTimeout(function(){ if(!settled){ settled = true; mapFailed(); } }, 9000);
    };
    // Boot the iframe right after the hero paints — no long idle wait (the JS is already prefetching).
    if('requestIdleCallback' in window){
      requestIdleCallback(go, { timeout: 300 });
    }else{
      setTimeout(go, document.readyState === 'complete' ? 30 : 200);
    }
  }

  // Public hook the Tweaks panel calls.
  window.__setMapBg = function(on){
    mapPref = !!on;
    if(on && allowed()){
      mapbg.hidden = false;
      loadFrameOnce();
      setPaused(false);
      requestAnimationFrame(function(){ mapbg.classList.add('is-on'); document.documentElement.classList.add('map-live'); });
      startSync();
    }else{
      mapbg.classList.remove('is-on'); document.documentElement.classList.remove('map-live');
      stopSync();
      setPaused(true);   // freeze the iframe's render loop while hidden — no GPU/CPU cost
    }
    if(toggleBtn){
      // show the control whenever the map is capable on this device, so it can pause AND resume
      toggleBtn.classList.toggle('show', allowed());
      reflectToggle(mapPref && allowed());
    }
  };

  // Auto-enable on capable devices — but DEFER the actual MapLibre boot until the FIRST real user
  // interaction (mousemove / scroll / wheel / pointer / touch / key). The map is a decorative,
  // scroll-driven background, so for any engaged visitor it appears effectively instantly; meanwhile
  // MapLibre's ~2.7s parse+eval — which on a mid-tier CPU / budget phone blocks the page's INITIAL
  // interactivity (the cost that tanks Lighthouse TBT and is invisible on a fast Mac) — never lands in
  // the critical window. The map JS/CSS is PREFETCHED early (network only, no main-thread cost) so the
  // first-interaction boot is instant. A long safety timer covers a visitor who never interacts (it
  // fires well after the page has gone quiet / TTI, so it never re-introduces the boot cost into the
  // measured window). The Tweaks effect reconciles to the persisted preference after boot.
  if(allowed() && (!phoneLike || mapForced())){
    // (1) early, low-priority network warm — so the interaction-boot has the ~1 MB already cached
    ['vendor/maplibre-gl.js','vendor/maplibre-gl.css'].forEach(function(href){
      try{ var l=document.createElement('link'); l.rel='prefetch';
        l.as=/\.css$/.test(href)?'style':'script'; l.href=href; document.head.appendChild(l); }catch(e){}
    });
    // (2) boot on first interaction (or a long safety fallback)
    var __mapBooted=false, __mapSafety=0;
    // Boot on DELIBERATE engagement only — NOT hover: pointermove/mousemove would boot the ~2.7s
    // MapLibre parse on incidental mouse movement, back inside the initial-interactivity window. The map
    // is a scroll-driven journey background, so scroll/wheel/tap/key are the signals that actually matter.
    var __mapEvents=['pointerdown','wheel','scroll','touchstart','keydown'];
    var __bootMapBg=function(){
      if(__mapBooted) return; __mapBooted=true;
      __mapEvents.forEach(function(ev){ window.removeEventListener(ev, __bootMapBg); });
      if(__mapSafety){ clearTimeout(__mapSafety); __mapSafety=0; }
      window.__setMapBg(true);
    };
    var __armMapBoot=function(){
      __mapEvents.forEach(function(ev){ window.addEventListener(ev, __bootMapBg, {passive:true}); });
      __mapSafety=setTimeout(__bootMapBg, 10000);
    };
    if(document.readyState==='complete') __armMapBoot();
    else window.addEventListener('load', __armMapBoot, {once:true});
  }
  else if(allowed() && phoneLike && toggleBtn){
    // Phone: the map isn't auto-run — expose the toggle (in the "off" state) so a user can opt INTO the
    // live map on demand; the default stays the calm static field. Tapping it calls __setMapBg(true).
    toggleBtn.classList.add('show');
    reflectToggle(false);
  }
  // Re-evaluate when the device context changes (rotate, resize across the threshold, reduced-motion
  // toggle) so the map switches on/off to match capability without a reload.
  function onEnv(){ window.__setMapBg(mapPref); }
  if(mqReduce.addEventListener){
    mqReduce.addEventListener('change', onEnv);
    mqDevice.addEventListener('change', onEnv);
    mqReduceTransp.addEventListener('change', onEnv);
    mqContrast.addEventListener('change', onEnv);
    mqReduceData.addEventListener('change', onEnv);
  }

  // Idle-freeze the ambient bg drift + mascot float (see the `.bg-idle` CSS rule). They animate `transform`
  // behind the frosted glass, so while they move the glass re-blurs every frame — the confirmed idle GPU/fan
  // cost (freezing them halved idle GPU on an M2 Pro). Pause them ~1.2s after the last input; resume instantly
  // on any interaction; freeze immediately when the tab is hidden. Reduced-motion pauses them via CSS anyway.
  if(!mqReduce.matches){
    var __root=document.documentElement, __idleT=0, __isIdle=false;
    var __setIdle=function(v){ if(v===__isIdle) return; __isIdle=v; __root.classList.toggle('bg-idle', v); };
    var __activity=function(){ __setIdle(false); if(__idleT) clearTimeout(__idleT); __idleT=setTimeout(function(){ __setIdle(true); }, 1200); };
    ['pointerdown','pointermove','mousemove','wheel','scroll','touchstart','keydown'].forEach(function(ev){
      window.addEventListener(ev, __activity, {passive:true});
    });
    document.addEventListener('visibilitychange', function(){ if(document.hidden){ if(__idleT) clearTimeout(__idleT); __setIdle(true); } else __activity(); });
    __activity();   // arm: goes idle 1.2s after load if the visitor never interacts
  }
})();
