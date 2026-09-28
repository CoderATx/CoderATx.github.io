/* FORWARD – iOS-läge + enhetsläge (Auto / Telefon / Dator) */
(function(){
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.navigator.standalone === true) || window.matchMedia('(display-mode: standalone)').matches;
  var root = document.documentElement;
  var MODE_KEY = 'forward_device_mode';
  var TIP_KEY = 'forward_ios_tip_v1';

  if (isIOS) root.classList.add('ios');
  if (standalone) root.classList.add('standalone');

  var css = document.createElement('style');
  css.textContent = [
    /* --- iOS / standalone --- */
    'html.standalone body{overscroll-behavior-y:none;}',
    'html.standalone #bottomnav{padding-bottom:calc(7px + env(safe-area-inset-bottom,0px));}',
    'html.standalone main{padding-top:calc(20px + env(safe-area-inset-top,0px));}',
    'html.ios input,html.ios select,html.ios textarea{font-size:16px;}',

    /* --- Telefonläge på valfri skärm --- */
    'html.dev-phone #sidebar{display:none !important;}',
    'html.dev-phone #bottomnav{display:flex !important;left:50% !important;right:auto !important;',
      'transform:translateX(-50%);width:min(500px,calc(100% - 20px)) !important;}',
    'html.dev-phone main{margin:0 auto !important;max-width:520px !important;padding:20px 16px 130px !important;}',
    'html.dev-phone .grid,html.dev-phone .grid2{grid-template-columns:1fr !important;}',
    'html.dev-phone .card[style*="span 2"]{grid-column:auto !important;}',
    'html.dev-phone .fab{right:18px !important;bottom:96px !important;}',
    'html.dev-phone .fab-menu{right:18px !important;bottom:164px !important;}',
    'html.dev-phone #rest-chip{left:14px !important;bottom:96px !important;}',

    /* --- Datorläge på valfri skärm --- */
    'html.dev-desktop #sidebar{display:flex !important;}',
    'html.dev-desktop #bottomnav{display:none !important;}',
    'html.dev-desktop main{margin-left:240px !important;margin-right:0 !important;max-width:1060px !important;',
      'padding:36px 44px 80px !important;}',
    'html.dev-desktop .fab{right:28px !important;bottom:28px !important;}',
    'html.dev-desktop .fab-menu{right:28px !important;bottom:100px !important;}',
    'html.dev-desktop #rest-chip{left:26px !important;bottom:26px !important;}',

    /* --- Väljaren --- */
    '.devpick{display:flex;gap:8px;flex-wrap:wrap;}',
    '.devpick button{flex:1;min-width:92px;padding:11px 12px;border-radius:12px;cursor:pointer;font-weight:600;',
      'font-size:.85rem;border:1px solid var(--border-strong,rgba(255,255,255,.16));background:transparent;color:inherit;}',
    '.devpick button.on{background:linear-gradient(120deg,#7c83ff,#9a7cff);border-color:transparent;color:#fff;}',

    /* --- iOS-tips --- */
    '#ios-tip{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:400;',
      'max-width:460px;margin:0 auto;background:var(--card2,#151522);',
      'border:1px solid var(--border-strong,rgba(255,255,255,.16));border-radius:20px;',
      'padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.5);font-size:.9rem;line-height:1.5;}',
    '#ios-tip b{display:block;margin-bottom:4px;font-size:.95rem;}',
    '#ios-tip .ios-row{display:flex;gap:10px;margin-top:12px;}',
    '#ios-tip button{flex:1;padding:10px 14px;border-radius:12px;border:none;cursor:pointer;font-weight:600;font-size:.85rem;}',
    '#ios-tip .ok{background:linear-gradient(120deg,#7c83ff,#9a7cff);color:#fff;}',
    '#ios-tip .no{background:transparent;color:inherit;border:1px solid var(--border-strong,rgba(255,255,255,.16));}'
  ].join('');
  document.head.appendChild(css);

  /* ---------- Enhetsläge ---------- */
  var viewportMeta = document.querySelector('meta[name="viewport"]');
  var viewportDefault = viewportMeta ? viewportMeta.getAttribute('content') : 'width=device-width, initial-scale=1, viewport-fit=cover';
  var smallScreen = window.matchMedia('(max-width:860px)').matches;

  function getMode(){
    var m = localStorage.getItem(MODE_KEY);
    return (m === 'phone' || m === 'desktop') ? m : 'auto';
  }

  function applyMode(mode){
    root.classList.remove('dev-phone','dev-desktop');
    if (mode === 'phone') root.classList.add('dev-phone');
    if (mode === 'desktop') root.classList.add('dev-desktop');
    if (viewportMeta) {
      /* datorläge på en liten skärm: rita som en bred skärm och zooma ut */
      if (mode === 'desktop' && smallScreen) viewportMeta.setAttribute('content','width=1100');
      else viewportMeta.setAttribute('content', viewportDefault);
    }
  }

  function setMode(mode){
    localStorage.setItem(MODE_KEY, mode);
    applyMode(mode);
    if (typeof renderSettings === 'function') renderSettings();
    if (typeof toast === 'function') {
      toast(mode === 'phone' ? 'Telefonläge på' : mode === 'desktop' ? 'Datorläge på' : 'Auto: följer skärmen');
    }
  }
  window.setDeviceMode = setMode;

  applyMode(getMode());

  function deviceCard(){
    var view = document.getElementById('view-settings');
    if (!view || document.getElementById('device-card')) return;
    var grid = view.querySelector('.grid') || view;
    var mode = getMode();
    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'device-card';
    card.innerHTML =
      '<h3>Enhet</h3>' +
      '<div class="label" style="margin-bottom:12px;">Välj hur appen ska se ut. Auto följer skärmen du är på.</div>' +
      '<div class="devpick">' +
        '<button class="' + (mode==='auto'?'on':'') + '" data-m="auto">Auto</button>' +
        '<button class="' + (mode==='phone'?'on':'') + '" data-m="phone">📱 Telefon</button>' +
        '<button class="' + (mode==='desktop'?'on':'') + '" data-m="desktop">💻 Dator</button>' +
      '</div>';
    card.querySelectorAll('button').forEach(function(b){
      b.onclick = function(){ setMode(b.getAttribute('data-m')); };
    });
    grid.insertBefore(card, grid.firstChild);
  }

  if (typeof window.renderSettings === 'function') {
    var origRenderSettings = window.renderSettings;
    window.renderSettings = function(){
      var r = origRenderSettings.apply(this, arguments);
      deviceCard();
      return r;
    };
    window.renderSettings();
  }

  /* ---------- iOS-specifikt ---------- */
  if (standalone && isIOS) {
    document.addEventListener('click', function(e){
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.target === '_blank') return;
      var url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch(err){ return; }
      if (url.origin === location.origin) { e.preventDefault(); location.href = url.href; }
    }, true);

    var lastTouch = 0;
    document.addEventListener('touchend', function(e){
      var now = Date.now();
      if (now - lastTouch <= 320) e.preventDefault();
      lastTouch = now;
    }, {passive:false});
  }

  function showTip(force){
    if (document.getElementById('ios-tip')) return;
    var box = document.createElement('div');
    box.id = 'ios-tip';
    box.innerHTML =
      '<b>Lägg FORWARD på hemskärmen</b>' +
      'Tryck på Dela-knappen i Safari och välj ”Lägg till på hemskärmen”. Sen startar appen i helskärm, utan adressfält, och funkar offline.' +
      '<div class="ios-row"><button class="ok">Uppfattat</button><button class="no">Inte nu</button></div>';
    document.body.appendChild(box);
    box.querySelector('.ok').onclick = function(){ localStorage.setItem(TIP_KEY,'1'); box.remove(); };
    box.querySelector('.no').onclick = function(){ if(!force) localStorage.setItem(TIP_KEY,'1'); box.remove(); };
  }

  if (isIOS && !standalone && !localStorage.getItem(TIP_KEY)) {
    setTimeout(function(){ showTip(false); }, 1500);
  }

  var btn = document.getElementById('install-app');
  if (btn && isIOS && !standalone) {
    btn.style.display = 'inline-flex';
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      showTip(true);
    }, true);
  }
  if (btn && standalone) btn.style.display = 'none';
})();
