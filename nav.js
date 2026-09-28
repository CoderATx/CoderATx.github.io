/* FORWARD – meny till vänster även på telefon + välj vilka delar som ska synas */
(function(){
  var HIDE_KEY = 'forward_hidden_sections_v1';
  var LOCKED = ['dashboard','settings'];

  var css = document.createElement('style');
  css.textContent = [
    /* Smal meny till vänster på telefon */
    'html.nav-left #bottomnav{display:none !important;}',
    'html.nav-left #sidebar{display:flex !important;width:88px;padding:14px 6px calc(16px + env(safe-area-inset-bottom,0px));',
      'overflow-y:auto;gap:2px;}',
    'html.nav-left #sidebar .brand{font-size:0;padding:6px 0 12px;justify-content:center;}',
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
    /* Sektionsväljaren */
    '.secpick{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:6px;}',
    '.secpick button{padding:10px 12px;border-radius:999px;cursor:pointer;font-size:.8rem;font-weight:600;',
      'border:1px solid var(--border-strong);background:transparent;color:inherit;text-align:center;}',
    '.secpick button.on{background:var(--accent-dim);border-color:var(--accent);color:var(--accent);}'
  ].join('');
  document.head.appendChild(css);

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
    window.setDeviceMode = function(){ var r = origMode.apply(this, arguments); applyLayout(); applyHidden(); return r; };
  }
  if (typeof window.setView === 'function') {
    var origView = window.setView;
    window.setView = function(){ var r = origView.apply(this, arguments); applyHidden(); return r; };
  }
  window.matchMedia('(max-width:860px)').addEventListener('change', applyLayout);

  applyLayout();
  applyHidden();
  setTimeout(function(){ applyLayout(); applyHidden(); }, 400);
})();
