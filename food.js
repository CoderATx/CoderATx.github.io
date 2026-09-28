/* FORWARD – Mat: kaloridagbok med makron, måltider och sökbar livsmedelsdatabas */
(function(){
  var DKEY = 'forward_food_v1';
  var GKEY = 'forward_food_goal_v1';
  var MEALS = [['frukost','Frukost','🍳'],['lunch','Lunch','🥗'],['middag','Middag','🍽️'],['mellanmal','Mellanmål','🍎']];

  function key(d){ d = d || new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function allDays(){ try { return JSON.parse(localStorage.getItem(DKEY)) || {}; } catch(e){ return {}; } }
  function day(){ var a = allDays()[key()]; return a || {frukost:[],lunch:[],middag:[],mellanmal:[]}; }
  function writeDay(obj){ var a = allDays(); a[key()] = obj; localStorage.setItem(DKEY, JSON.stringify(a)); }
  function goal(){
    var g = {kcal:2400, p:150, c:250, f:80};
    try { var s = JSON.parse(localStorage.getItem(GKEY)); if (s) for (var k in s) if (s[k]) g[k] = +s[k]; } catch(e){}
    return g;
  }
  function setGoal(g){ localStorage.setItem(GKEY, JSON.stringify(g)); }
  function esc2(s){ return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s); }

  function totals(d){
    var t = {kcal:0,p:0,c:0,f:0};
    MEALS.forEach(function(m){
      (d[m[0]] || []).forEach(function(it){
        t.kcal += +it.kcal || 0; t.p += +it.p || 0; t.c += +it.c || 0; t.f += +it.f || 0;
      });
    });
    ['kcal','p','c','f'].forEach(function(k){ t[k] = Math.round(t[k]); });
    return t;
  }
  function mealKcal(items){ return Math.round((items||[]).reduce(function(s,i){ return s + (+i.kcal||0); }, 0)); }

  /* ---------- Vy ---------- */
  function ensureView(){
    if (document.getElementById('view-food')) return;
    var main = document.querySelector('main');
    if (!main) return;
    var v = document.createElement('div');
    v.className = 'view';
    v.id = 'view-food';
    main.insertBefore(v, main.firstChild);

    var svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v8a3 3 0 006 0V3M8 11v10M16 3c-1.5 2-2 4-2 6s.5 3 2 3v9"/></svg>';
    function addLink(host, after){
      if (!host) return;
      var b = document.createElement('button');
      b.className = 'navlink';
      b.setAttribute('data-view','food');
      b.innerHTML = svg + 'Mat';
      if (after && host.children[after]) host.insertBefore(b, host.children[after]);
      else host.appendChild(b);
      b.addEventListener('click', function(){ if (typeof setView === 'function') setView('food'); });
    }
    addLink(document.getElementById('navlinks'), 1);
    addLink(document.getElementById('bottomnav'), 1);
  }

  function render(){
    ensureView();
    var view = document.getElementById('view-food');
    if (!view) return;
    var d = day(), g = goal(), t = totals(d);
    var left = Math.max(0, g.kcal - t.kcal);
    var pct = Math.min(100, Math.round(t.kcal / (g.kcal || 1) * 100));
    var R = 52, C = 2 * Math.PI * R, off = C - pct / 100 * C;

    function macro(label, val, target, color){
      var p = Math.min(100, Math.round(val / (target || 1) * 100));
      return '<div style="flex:1;min-width:90px;"><div class="rowbetween" style="flex-wrap:nowrap;">' +
        '<span class="label" style="margin:0;">' + label + '</span>' +
        '<span class="label" style="margin:0;">' + val + ' / ' + target + ' g</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + p + '%;background:' + color + ';"></div></div></div>';
    }

    var mealsHtml = MEALS.map(function(m){
      var items = d[m[0]] || [];
      return '<div class="card" data-meal="' + m[0] + '">' +
        '<div class="rowbetween"><div><h3 style="margin:0;">' + m[2] + ' ' + m[1] + '</h3>' +
        '<div class="label">' + mealKcal(items) + ' kcal</div></div>' +
        '<button class="btn ghost food-open" data-meal="' + m[0] + '">+ Lägg till</button></div>' +
        (items.length ? '<div style="margin-top:12px;">' + items.map(function(it, i){
          return '<div class="rowbetween" style="flex-wrap:nowrap;padding:7px 0;border-top:1px solid var(--border);">' +
            '<div style="min-width:0;"><div style="font-weight:600;font-size:.9rem;">' + esc2(it.name) + '</div>' +
            '<div class="label">' + (it.g ? it.g + ' g · ' : '') + Math.round(it.kcal) + ' kcal · P ' + Math.round(it.p) + ' K ' + Math.round(it.c) + ' F ' + Math.round(it.f) + '</div></div>' +
            '<button class="btn ghost food-del" data-meal="' + m[0] + '" data-i="' + i + '" style="padding:6px 12px;">✕</button></div>';
        }).join('') + '</div>' : '') +
        '<div class="panel" id="food-panel-' + m[0] + '" style="margin-top:12px;">' +
          '<div class="row"><input class="food-q" data-meal="' + m[0] + '" placeholder="Sök livsmedel, t.ex. kycklingfilé" style="flex:1;">' +
          '<button class="btn food-search" data-meal="' + m[0] + '">Sök</button></div>' +
          '<div class="food-results" data-meal="' + m[0] + '" style="margin-top:12px;"></div>' +
          '<div class="label" style="margin-top:16px;">Eller lägg in manuellt</div>' +
          '<div class="row" style="margin-top:8px;">' +
            '<input class="m-name" placeholder="Namn" style="flex:2;min-width:140px;">' +
            '<input class="m-kcal" type="number" placeholder="kcal" style="width:90px;">' +
            '<input class="m-p" type="number" placeholder="P" style="width:70px;">' +
            '<input class="m-c" type="number" placeholder="K" style="width:70px;">' +
            '<input class="m-f" type="number" placeholder="F" style="width:70px;">' +
            '<button class="btn ghost food-manual" data-meal="' + m[0] + '">Lägg till</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    view.innerHTML =
      '<h1>Mat</h1><div class="sub">Dagens kalorier och makron.</div>' +
      '<div class="card hero-card" style="text-align:center;">' +
        '<svg width="130" height="130" class="ring" style="margin-top:4px;">' +
          '<circle cx="65" cy="65" r="' + R + '" stroke="var(--card2)" stroke-width="11"/>' +
          '<circle cx="65" cy="65" r="' + R + '" stroke="var(--accent)" stroke-width="11" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"/>' +
        '</svg>' +
        '<div class="big" style="margin-top:-86px;">' + left + '</div>' +
        '<div class="label" style="margin-top:76px;">kcal kvar av ' + g.kcal + ' · ätit ' + t.kcal + '</div>' +
        '<div class="row" style="margin-top:18px;gap:14px;">' +
          macro('Protein', t.p, g.p, 'linear-gradient(90deg,#23b58a,#7fd9bd)') +
          macro('Kolhydrat', t.c, g.c, 'linear-gradient(90deg,#f2a65a,#f7c886)') +
          macro('Fett', t.f, g.f, 'linear-gradient(90deg,#7c83ff,#9a7cff)') +
        '</div>' +
      '</div>' +
      mealsHtml;

    view.querySelectorAll('.food-open').forEach(function(b){
      b.onclick = function(){ document.getElementById('food-panel-' + b.getAttribute('data-meal')).classList.toggle('open'); };
    });
    view.querySelectorAll('.food-del').forEach(function(b){
      b.onclick = function(){
        var d2 = day(); d2[b.getAttribute('data-meal')].splice(+b.getAttribute('data-i'), 1); writeDay(d2); render();
      };
    });
    view.querySelectorAll('.food-search').forEach(function(b){
      b.onclick = function(){ doSearch(b.getAttribute('data-meal')); };
    });
    view.querySelectorAll('.food-q').forEach(function(inp){
      inp.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); doSearch(inp.getAttribute('data-meal')); } });
    });
    view.querySelectorAll('.food-manual').forEach(function(b){
      b.onclick = function(){
        var p = b.closest('.panel');
        var name = p.querySelector('.m-name').value.trim();
        if (!name) return;
        add(b.getAttribute('data-meal'), {
          name: name, g: null,
          kcal: +p.querySelector('.m-kcal').value || 0,
          p: +p.querySelector('.m-p').value || 0,
          c: +p.querySelector('.m-c').value || 0,
          f: +p.querySelector('.m-f').value || 0
        });
      };
    });
  }

  function add(meal, item){
    var d = day();
    d[meal] = d[meal] || [];
    d[meal].push(item);
    writeDay(d);
    render();
    if (typeof toast === 'function') toast('Tillagt i ' + meal);
  }

  function doSearch(meal){
    var view = document.getElementById('view-food');
    var q = view.querySelector('.food-q[data-meal="' + meal + '"]').value.trim();
    var box = view.querySelector('.food-results[data-meal="' + meal + '"]');
    if (!q) return;
    box.innerHTML = '<div class="label">Söker...</div>';
    var url = 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(q) +
      '&search_simple=1&action=process&json=1&page_size=12&lc=sv' +
      '&fields=product_name,product_name_sv,brands,nutriments,code';
    fetch(url).then(function(r){ return r.json(); }).then(function(j){
      var list = (j.products || []).map(function(p){
        var n = p.nutriments || {};
        return {
          name: (p.product_name_sv || p.product_name || '').trim(),
          brand: (p.brands || '').split(',')[0],
          kcal: +n['energy-kcal_100g'] || (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : 0),
          p: +n.proteins_100g || 0, c: +n.carbohydrates_100g || 0, f: +n.fat_100g || 0
        };
      }).filter(function(x){ return x.name && x.kcal; }).slice(0, 8);

      if (!list.length){ box.innerHTML = '<div class="label">Inga träffar. Lägg in manuellt nedan.</div>'; return; }
      box.innerHTML = list.map(function(x, i){
        return '<div class="rowbetween" style="flex-wrap:nowrap;gap:10px;padding:9px 0;border-top:1px solid var(--border);">' +
          '<div style="min-width:0;"><div style="font-weight:600;font-size:.88rem;">' + esc2(x.name) + '</div>' +
          '<div class="label">' + (x.brand ? esc2(x.brand) + ' · ' : '') + Math.round(x.kcal) + ' kcal / 100 g</div></div>' +
          '<div class="row" style="flex-wrap:nowrap;"><input class="res-g" type="number" value="100" style="width:76px;">' +
          '<button class="btn res-add" data-i="' + i + '" style="padding:9px 14px;">+</button></div></div>';
      }).join('');
      box.querySelectorAll('.res-add').forEach(function(b){
        b.onclick = function(){
          var x = list[+b.getAttribute('data-i')];
          var grams = +b.closest('.row').querySelector('.res-g').value || 100;
          var k = grams / 100;
          add(meal, {name: x.name + (x.brand ? ' (' + x.brand + ')' : ''), g: grams,
            kcal: Math.round(x.kcal * k), p: +(x.p * k).toFixed(1), c: +(x.c * k).toFixed(1), f: +(x.f * k).toFixed(1)});
        };
      });
    }).catch(function(){
      box.innerHTML = '<div class="label">Kunde inte nå livsmedelsdatabasen just nu. Lägg in manuellt nedan.</div>';
    });
  }

  /* ---------- Mål i Inställningar ---------- */
  function goalCard(){
    var view = document.getElementById('view-settings');
    if (!view || document.getElementById('food-goal-card')) return;
    var grid = view.querySelector('.grid') || view;
    var g = goal();
    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'food-goal-card';
    card.innerHTML =
      '<h3>Matåtervinning per dag</h3>' +
      '<div class="label" style="margin-bottom:12px;">Dina dagliga mål för kalorier och makron.</div>' +
      '<div class="row">' +
        '<input id="fg-kcal" type="number" value="' + g.kcal + '" style="width:100px;" placeholder="kcal">' +
        '<input id="fg-p" type="number" value="' + g.p + '" style="width:80px;" placeholder="Protein">' +
        '<input id="fg-c" type="number" value="' + g.c + '" style="width:80px;" placeholder="Kolh">' +
        '<input id="fg-f" type="number" value="' + g.f + '" style="width:80px;" placeholder="Fett">' +
        '<button class="btn" id="fg-save">Spara</button>' +
      '</div>';
    card.querySelector('#fg-save').onclick = function(){
      setGoal({kcal:+document.getElementById('fg-kcal').value||2400, p:+document.getElementById('fg-p').value||150,
        c:+document.getElementById('fg-c').value||250, f:+document.getElementById('fg-f').value||80});
      render();
      if (typeof toast === 'function') toast('Mål sparade ✓');
    };
    grid.appendChild(card);
  }

  /* ---------- Koppla in ---------- */
  ensureView();
  render();

  if (typeof window.setView === 'function') {
    var origSetView = window.setView;
    window.setView = function(id){
      var r = origSetView.apply(this, arguments);
      if (id === 'food') {
        document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
        document.getElementById('view-food').classList.add('active');
        document.querySelectorAll('.navlink').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-view') === 'food'); });
        render();
      }
      return r;
    };
  }
  if (typeof window.renderSettings === 'function') {
    var origRS = window.renderSettings;
    window.renderSettings = function(){ var r = origRS.apply(this, arguments); goalCard(); return r; };
  }

  /* Dagens kalorier på dashboarden */
  function dashCard(){
    var view = document.getElementById('view-dashboard');
    if (!view) return;
    var old = document.getElementById('food-dash'); if (old) old.remove();
    var t = totals(day()), g = goal();
    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'food-dash';
    card.style.cursor = 'pointer';
    card.innerHTML =
      '<div class="rowbetween"><h3 style="margin:0;">Mat idag</h3>' +
      '<span class="label">' + t.kcal + ' / ' + g.kcal + ' kcal</span></div>' +
      '<div class="bar-track" style="margin-top:10px;"><div class="bar-fill" style="width:' + Math.min(100, Math.round(t.kcal/(g.kcal||1)*100)) + '%"></div></div>' +
      '<div class="label" style="margin-top:8px;">Protein ' + t.p + ' g · Kolhydrat ' + t.c + ' g · Fett ' + t.f + ' g</div>';
    card.onclick = function(){ if (typeof setView === 'function') setView('food'); };
    var anchor = document.getElementById('water-card');
    if (anchor) view.insertBefore(card, anchor);
    else view.appendChild(card);
  }
  if (typeof window.renderDashboard === 'function') {
    var origRD = window.renderDashboard;
    window.renderDashboard = function(){ var r = origRD.apply(this, arguments); dashCard(); return r; };
    window.renderDashboard();
  }
})();
