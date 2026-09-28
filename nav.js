/* FORWARD – meny till vänster även på telefon, fällbar meny, och välj vilka delar som syns */
(function(){
  var HIDE_KEY = 'forward_hidden_sections_v1';
  var COLLAPSE_KEY = 'forward_nav_collapsed_v1';
  var LOCKED = ['dashboard','settings'];

  var css = document.createElement('style');
  css.textContent = [
    /* Smal meny till vänster på telefon */
    'html.nav-left #bottomnav{display:none !important;}',
    'html.nav-left #sidebar{display:flex !important;width:88px;padding:14px 6px calc(16px + env(safe-area-inset-bottom,0px));',
      'overflow-y:auto;gap:2px;}',
    'html.nav-left #sidebar .brand{font-size:0;padding:6px 0 10px;justify-content:center;}',
    'html.nav-left #sidebar .brand .dot{width:12px;height:12px;}',
    'html.nav-left .navlink{flex-direction:column;gap:4px;font-size:.56rem;text-align:center;padding:9px 2px;line-height:1.2;}',
    'html.nav-left .navlink svg{width:20px;height:20px;}',
    'html.nav-left .navlink.active::before{left:-6px;top:15%;bottom:15%;}',
    'html.nav-left #sidebar .bottom{padding-top:10px;}',
    'html.nav-left main{margin-left:88px !important;max-width:none !important;padding:18px 14px 60px !important;}',
    'html.nav-left .fab{right:14px !important;bottom:16px !important;}',
    'html.nav-left .fab-menu{right:14px !important;bottom:88px !important;}',
    'html.nav-left #rest-chip{left:100px !important;bottom:16px !important;}',
    'html.nav-left #toast-wrap{bottom:20px;}',

    /* Fälld meny */
    'html.nav-hidden #sidebar{display:none !important;}',
    'html.nav-hidden #bottomnav{display:none !important;}',
    'html.nav-hidden main{margin-left:0 !important;max-width:900px !important;margin-right:auto !important;',
      'padding:18px 16px 70px !important;}',
    'html.nav-hidden #rest-chip{left:16px !important;}',

    /* Knappen som fäller in och ut */
    '#nav-toggle{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;',
      'background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:12px;',
      'padding:8px 10px;margin-bottom:10px;font-size:.78rem;font-weight:600;}',
    '#nav-toggle:hover{color:var(--text);background:var(--card2);}',
    '#nav-open{position:fixed;z-index:80;left:12px;top:calc(12px + env(safe-area-inset-top,0px));',
      'display:none;align-items:center;justify-content:center;gap:8px;width:46px;height:46px;cursor:pointer;',
      'border-radius:14px;border:1px solid var(--border-strong);background:var(--card);color:var(--text);',
      'box-shadow:var(--shadow);font-size:1.1rem;}',
    'html.nav-hidden #nav-open{display:flex;}',
    'html.nav-hidden main{padding-top:70px !important;}',

    /* Sektionsväljaren */
    '.secpick{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:6px;}',
    '.secpick button{padding:10px 12px;border-radius:999px;cursor:pointer;font-size:.8rem;font-weight:600;',
      'border:1px solid var(--border-strong);background:transparent;color:inherit;text-align:center;}',
    '.secpick button.on{background:var(--accent-dim);border-color:var(--accent);color:var(--accent);}'
  ].join('');
  document.head.appendChild(css);

  /* ---------- Fäll in och ut ---------- */
  function collapsed(){ return localStorage.getItem(COLLAPSE_KEY) === '1'; }
  function setCollapsed(v){
    localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
    document.documentElement.classList.toggle('nav-hidden', !!v);
  }

  function buildToggles(){
    var sidebar = document.getElementById('sidebar');
    if (sidebar && !document.getElementById('nav-toggle')) {
      var t = document.createElement('button');
      t.id = 'nav-toggle';
      t.type = 'button';
      t.innerHTML = '☰';
      t.title = 'Dölj menyn';
      t.onclick = function(){ setCollapsed(true); };
      var brand = sidebar.querySelector('.brand');
      if (brand && brand.nextSibling) sidebar.insertBefore(t, brand.nextSibling);
      else sidebar.insertBefore(t, sidebar.firstChild);
    }
    if (!document.getElementById('nav-open')) {
      var o = document.createElement('button');
      o.id = 'nav-open';
      o.type = 'button';
      o.innerHTML = '☰';
      o.title = 'Visa menyn';
      o.onclick = function(){ setCollapsed(false); };
      document.body.appendChild(o);
    }
  }

  /* ---------- Layout ---------- */
  function hidden(){
    try { var a = JSON.parse(localStorage.getItem(HIDE_KEY)); return Array.isArray(a) ? a : []; } catch(e){ return []; }
  }
  function setHidden(list){ localStorage.setItem(HIDE_KEY, JSON.stringify(list)); }

  function phoneMode(){
    var root = document.documentElement;
    return root.classList.contains('dev-phone') ||
      (!root.classList.contains('dev-desktop') && window.matchMedia('(max-width:860px)').matches);
  }
  function applyLayout(){
    document.documentElement.classList.toggle('nav-left', phoneMode());
    document.documentElement.classList.toggle('nav-hidden', collapsed());
  }

  function applyHidden(){
    var h = hidden();
    document.querySelectorAll('.navlink[data-view]').forEach(function(b){
      var v = b.getAttribute('data-view');
      b.style.display = (h.indexOf(v) > -1 && LOCKED.indexOf(v) === -1) ? 'none' : '';
    });
    var active = document.querySelector('.view.active');
    if (active) {
      var id = active.id.replace('view-','');
      if (h.indexOf(id) > -1 && LOCKED.indexOf(id) === -1 && typeof setView === 'function') setView('dashboard');
    }
  }

  function sections(){
    var out = [], seen = {};
    document.querySelectorAll('#navlinks .navlink[data-view]').forEach(function(b){
      var v = b.getAttribute('data-view');
      if (seen[v]) return;
      seen[v] = 1;
      out.push({id:v, label:(b.textContent || v).trim()});
    });
    return out;
  }

  function card(){
    var view = document.getElementById('view-settings');
    if (!view || document.getElementById('sections-card')) return;
    var grid = view.querySelector('.grid') || view;
    var h = hidden();
    var list = sections().filter(function(s){ return LOCKED.indexOf(s.id) === -1; });
    var c = document.createElement('div');
    c.className = 'card';
    c.id = 'sections-card';
    c.innerHTML =
      '<h3>Visa i menyn</h3>' +
      '<div class="label" style="margin-bottom:10px;">Klicka bort det du inte använder, så blir appen fokuserad på det du faktiskt vill se.</div>' +
      '<div class="secpick">' + list.map(function(s){
        return '<button class="' + (h.indexOf(s.id) > -1 ? '' : 'on') + '" data-s="' + s.id + '">' + s.label + '</button>';
      }).join('') + '</div>' +
      '<div class="row" style="margin-top:12px;"><button class="btn ghost" id="sec-all">Visa allt igen</button></div>';

    c.querySelectorAll('.secpick button').forEach(function(b){
      b.onclick = function(){
        var id = b.getAttribute('data-s');
        var cur = hidden();
        var i = cur.indexOf(id);
        if (i > -1) cur.splice(i,1); else cur.push(id);
        setHidden(cur);
        b.classList.toggle('on', cur.indexOf(id) === -1);
        applyHidden();
      };
    });
    c.querySelector('#sec-all').onclick = function(){
      setHidden([]);
      applyHidden();
      c.querySelectorAll('.secpick button').forEach(function(b){ b.classList.add('on'); });
      if (typeof toast === 'function') toast('Alla delar visas igen');
    };
    grid.appendChild(c);
  }

  if (typeof window.renderSettings === 'function') {
    var orig = window.renderSettings;
    window.renderSettings = function(){ var r = orig.apply(this, arguments); card(); return r; };
  }
  if (typeof window.setDeviceMode === 'function') {
    var origMode = window.setDeviceMode;
    window.setDeviceMode = function(){ var r = origMode.apply(this, arguments); buildToggles(); applyLayout(); applyHidden(); return r; };
  }
  if (typeof window.setView === 'function') {
    var origView = window.setView;
    window.setView = function(){ var r = origView.apply(this, arguments); buildToggles(); applyHidden(); return r; };
  }
  window.matchMedia('(max-width:860px)').addEventListener('change', applyLayout);

  buildToggles();
  applyLayout();
  applyHidden();
  setTimeout(function(){ buildToggles(); applyLayout(); applyHidden(); }, 400);
})();
