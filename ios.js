/* FORWARD – iOS-läge: hemskärmsguide, standalone-beteende och Safari-fixar */
(function(){
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.navigator.standalone === true) || window.matchMedia('(display-mode: standalone)').matches;
  var root = document.documentElement;

  if (isIOS) root.classList.add('ios');
  if (standalone) root.classList.add('standalone');

  var css = document.createElement('style');
  css.textContent = [
    'html.standalone body{overscroll-behavior-y:none;}',
    'html.standalone #bottomnav{padding-bottom:calc(7px + env(safe-area-inset-bottom,0px));}',
    'html.standalone main{padding-top:calc(20px + env(safe-area-inset-top,0px));}',
    'html.ios input,html.ios select,html.ios textarea{font-size:16px;}',
    '#ios-tip{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:400;',
      'background:var(--card2,#151522);border:1px solid var(--border-strong,rgba(255,255,255,.16));border-radius:20px;',
      'padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.5);font-size:.9rem;line-height:1.5;}',
    '#ios-tip b{display:block;margin-bottom:4px;font-size:.95rem;}',
    '#ios-tip .ios-row{display:flex;gap:10px;margin-top:12px;}',
    '#ios-tip button{flex:1;padding:10px 14px;border-radius:12px;border:none;cursor:pointer;font-weight:600;font-size:.85rem;}',
    '#ios-tip .ok{background:linear-gradient(120deg,#7c83ff,#9a7cff);color:#fff;}',
    '#ios-tip .no{background:transparent;color:inherit;border:1px solid var(--border-strong,rgba(255,255,255,.16));}',
    '#ios-share{display:inline-block;width:14px;height:14px;vertical-align:-2px;}'
  ].join('');
  document.head.appendChild(css);

  /* I standalone öppnar iOS annars länkar i Safari och tappar appkänslan */
  if (standalone && isIOS) {
    document.addEventListener('click', function(e){
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.target === '_blank') return;
      var url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch(err){ return; }
      if (url.origin === location.origin && url.href !== location.href + '#') {
        e.preventDefault();
        location.href = url.href;
      }
    }, true);

    var lastTouch = 0;
    document.addEventListener('touchend', function(e){
      var now = Date.now();
      if (now - lastTouch <= 320) e.preventDefault();
      lastTouch = now;
    }, {passive:false});
  }

  var KEY = 'forward_ios_tip_v1';

  function showTip(force){
    if (document.getElementById('ios-tip')) return;
    var box = document.createElement('div');
    box.id = 'ios-tip';
    box.innerHTML =
      '<b>Lägg FORWARD på hemskärmen</b>' +
      'Tryck på Dela-knappen längst ner i Safari och välj ”Lägg till på hemskärmen”. Sen startar appen i helskärm, utan adressfält, och funkar offline.' +
      '<div class="ios-row"><button class="ok">Uppfattat</button><button class="no">Inte nu</button></div>';
    document.body.appendChild(box);
    box.querySelector('.ok').onclick = function(){ localStorage.setItem(KEY,'1'); box.remove(); };
    box.querySelector('.no').onclick = function(){ if(!force) localStorage.setItem(KEY,'1'); box.remove(); };
  }

  if (isIOS && !standalone && !localStorage.getItem(KEY)) {
    setTimeout(function(){ showTip(false); }, 1500);
  }

  /* Installera-knappen i appen: på iPhone finns ingen prompt, så visa guiden i stället */
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
