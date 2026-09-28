/* FORWARD – extra funktioner: vattenlogg på dashboarden, laddar matdagbok och meny */
(function(){
  var KEY = 'forward_water_v1';
  var GOAL = 8;

  function dayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function all(){
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ return {}; }
  }
  function get(){ return all()[dayKey()] || 0; }
  function set(n){
    var d = all();
    d[dayKey()] = Math.max(0, Math.min(12, n));
    localStorage.setItem(KEY, JSON.stringify(d));
  }
  function streak(){
    var d = all(), s = 0, day = new Date();
    while (true) {
      var k = day.getFullYear() + '-' + String(day.getMonth()+1).padStart(2,'0') + '-' + String(day.getDate()).padStart(2,'0');
      if ((d[k] || 0) >= GOAL) { s++; day.setDate(day.getDate()-1); } else break;
    }
    return s;
  }

  function render(){
    var view = document.getElementById('view-dashboard');
    if (!view) return;
    var old = document.getElementById('water-card');
    if (old) old.remove();

    var n = get();
    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'water-card';
    var glasses = '';
    for (var i = 1; i <= GOAL; i++) {
      glasses += '<button class="glass ' + (i <= n ? 'on' : '') + '" data-n="' + i + '" aria-label="' + i + ' glas"><span></span></button>';
    }
    var st = streak();
    card.innerHTML =
      '<div class="wrow"><h3 style="margin:0;">Vatten idag</h3>' +
      '<span class="label">' + n + ' av ' + GOAL + ' glas' + (st > 1 ? ' · ' + st + ' dagar i rad' : '') + '</span></div>' +
      '<div class="glasses"></div>';
    var holder = card.querySelector('.glasses');
    holder.innerHTML = glasses;
    holder.querySelectorAll('.glass').forEach(function(b){
      b.onclick = function(){
        var v = +b.getAttribute('data-n');
        set(v === get() ? v - 1 : v);
        render();
        if (v === GOAL && get() === GOAL && typeof toast === 'function') toast('Dagens vatten klart 💧');
      };
    });

    var anchor = view.querySelector('.locked-card');
    if (anchor && anchor.nextSibling) view.insertBefore(card, anchor.nextSibling);
    else view.appendChild(card);
  }

  if (typeof window.renderDashboard === 'function') {
    var orig = window.renderDashboard;
    window.renderDashboard = function(){
      var r = orig.apply(this, arguments);
      render();
      return r;
    };
    window.renderDashboard();
  }

  /* Rätta rubriken på matmålskortet i Inställningar */
  var settingsView = document.getElementById('view-settings');
  if (settingsView && window.MutationObserver) {
    new MutationObserver(function(){
      var h = document.querySelector('#food-goal-card h3');
      if (h && h.textContent !== 'Matmål per dag') h.textContent = 'Matmål per dag';
    }).observe(settingsView, {childList:true, subtree:true});
  }

  /* Matdagboken, sedan menyn */
  var food = document.createElement('script');
  food.src = 'food.js';
  food.onload = food.onerror = function(){
    var nav = document.createElement('script');
    nav.src = 'nav.js';
    document.body.appendChild(nav);
  };
  document.body.appendChild(food);
})();
