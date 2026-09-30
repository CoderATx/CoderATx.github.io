/* FORWARD – Matscan: streckkod/QR + AI-foto (Lifesum-stil) */
(function(){
  var VIEW = 'view-food';
  var MEALS = [['frukost','Frukost'],['lunch','Lunch'],['middag','Middag'],['mellanmal','Mellanmål']];
  var H5Q = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';

  function esc2(s){ return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s); }
  function guessMeal(){
    var h = new Date().getHours();
    if (h < 11) return 'frukost';
    if (h < 15) return 'lunch';
    if (h < 18) return 'mellanmal';
    return 'middag';
  }
  function mealOptions(sel){
    var g = sel || guessMeal();
    return MEALS.map(function(m){
      return '<option value="' + m[0] + '"' + (m[0] === g ? ' selected' : '') + '>' + m[1] + '</option>';
    }).join('');
  }

  /* ---------- Kort på Matsidan ---------- */
  function ensureCard(){
    var view = document.getElementById(VIEW);
    if (!view || document.getElementById('food-scan-card')) return;
    var card = document.createElement('div');
    card.className = 'card hero-card';
    card.id = 'food-scan-card';
    card.innerHTML =
      '<h3>Skanna eller fota</h3>' +
      '<div class="label" style="margin-bottom:14px;">Streckkoden slår upp produkten automatiskt. Fota maten så uppskattar AI:n kalorier och makron.</div>' +
      '<div class="row" style="flex-wrap:wrap;gap:10px;">' +
        '<button class="btn" id="fs-photo">📷 Fota maten</button>' +
        '<button class="btn ghost" id="fs-scan">▤ Skanna streckkod / QR</button>' +
      '</div>' +
      '<div id="fs-out" style="margin-top:14px;"></div>' +
      '<input id="fs-file" type="file" accept="image/*" capture="environment" style="display:none;">';
    if (view.firstChild) view.insertBefore(card, view.firstChild); else view.appendChild(card);
    card.querySelector('#fs-scan').onclick = function(){ openScanner(); };
    card.querySelector('#fs-photo').onclick = function(){ card.querySelector('#fs-file').click(); };
    card.querySelector('#fs-file').onchange = function(){
      var f = this.files && this.files[0];
      this.value = '';
      if (f) photoFlow(f);
    };
  }
  new MutationObserver(function(){ ensureCard(); }).observe(document.documentElement, {childList:true, subtree:true});
  ensureCard();

  /* ---------- Resultatpanel ---------- */
  function showResult(item){
    var out = document.getElementById('fs-out');
    if (!out) return;
    item = item || {};
    out.innerHTML =
      '<div class="panel open" style="margin-top:2px;">' +
        '<div style="font-weight:600;margin-bottom:10px;">' + esc2(item.name || 'Hittad mat') + '</div>' +
        '<div class="row" style="flex-wrap:wrap;gap:8px;">' +
          '<div><label>kcal</label><input id="fs-k" type="number" value="' + Math.round(item.kcal || 0) + '" style="width:82px;"></div>' +
          '<div><label>Protein g</label><input id="fs-p" type="number" value="' + Math.round(item.p || 0) + '" style="width:72px;"></div>' +
          '<div><label>Kolhydrat g</label><input id="fs-c" type="number" value="' + Math.round(item.c || 0) + '" style="width:72px;"></div>' +
          '<div><label>Fett g</label><input id="fs-f" type="number" value="' + Math.round(item.f || 0) + '" style="width:72px;"></div>' +
        '</div>' +
        '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:12px;">' +
          '<div><label>Mål</label><select id="fs-meal">' + mealOptions(item.meal) + '</select></div>' +
          (item.per100 ? '<div><label>Gram</label><input id="fs-g" type="number" value="' + (item.g || 100) + '" style="width:78px;"></div>' : '') +
          '<button class="btn" id="fs-add" style="align-self:flex-end;">+ Lägg till</button>' +
        '</div>' +
      '</div>';
    out.querySelector('#fs-add').onclick = function(){
      var g = item.per100 ? (+out.querySelector('#fs-g').value || 100) / 100 : 1;
      var meal = out.querySelector('#fs-meal').value;
      var rec = {name: item.name || 'Mat', g: item.per100 ? Math.round(g * 100) : undefined,
        kcal: Math.round(+out.querySelector('#fs-k').value || 0),
        p: +(+out.querySelector('#fs-p').value || 0).toFixed(1),
        c: +(+out.querySelector('#fs-c').value || 0).toFixed(1),
        f: +(+out.querySelector('#fs-f').value || 0).toFixed(1)};
      window.FoodAdd(meal, rec);
      out.innerHTML = '';
    };
  }

  /* ---------- Streckkod / QR ---------- */
  function loadScript(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  var scanning = false;
  function openScanner(){
    var out = document.getElementById('fs-out');
    if (!out) return;
    out.innerHTML =
      '<div class="panel open" style="margin-top:2px;">' +
        '<div class="rowbetween" style="flex-wrap:nowrap;"><div style="font-weight:600;">Rikta kameran mot streckkoden</div>' +
        '<button class="btn ghost" id="fs-stop" style="padding:7px 12px;">Stäng</button></div>' +
        '<div id="fs-reader" style="margin-top:12px;border-radius:12px;overflow:hidden;"></div>' +
        '<div class="label" id="fs-scanmsg" style="margin-top:10px;">Startar kameran...</div>' +
      '</div>';
    out.querySelector('#fs-stop').onclick = stopScanner;
    loadScript(H5Q).then(function(){
      var hr = new Html5Qrcode('fs-reader', {formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ]});
      window.__fsScanner = hr;
      hr.start({facingMode:'environment'}, {fps:10, qrbox:{width:250, height:160}},
        function(txt){ onDecoded(txt); },
        function(){ /* inga träffar per frame */ }
      ).catch(function(){
        var m = document.getElementById('fs-scanmsg');
        if (m) m.textContent = 'Kunde inte starta kameran. Tillåt kamera i webbläsaren och prova igen.';
      });
      scanning = true;
    }).catch(function(){
      var m = document.getElementById('fs-scanmsg');
      if (m) m.textContent = 'Kunde inte ladda skannern. Kolla din internetanslutning.';
    });
  }
  function stopScanner(){
    if (window.__fsScanner && scanning){
      try { window.__fsScanner.stop().then(function(){ window.__fsScanner.clear(); }).catch(function(){}); } catch(e){}
      scanning = false;
    }
    window.__fsScanner = null;
    var out = document.getElementById('fs-out');
    if (out) out.innerHTML = '';
  }
  function onDecoded(code){
    stopScanner();
    if (/^\d{6,14}$/.test(code.trim())){ lookupBarcode(code.trim()); return; }
    showResult({name:'QR-kod: ' + code, kcal:0});
  }
  function lookupBarcode(code){
    var out = document.getElementById('fs-out');
    if (out) out.innerHTML = '<div class="label" style="margin-top:10px;">Söker upp produkten ' + esc2(code) + '...</div>';
    fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) +
      '.json?fields=product_name,product_name_sv,brands,nutriments')
      .then(function(r){ return r.json(); })
      .then(function(j){
        if (!j || !j.product){ showResult({name:'Okänd kod (' + code + ')', kcal:0}); return; }
        var n = j.product.nutriments || {};
        var kcal = +n['energy-kcal_100g'] || (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : 0);
        var name = ((j.product.product_name_sv || j.product.product_name || '') + '').trim();
        var brand = (j.product.brands || '').split(',')[0];
        if (!name) name = 'Produkt ' + code;
        showResult({name: name + (brand ? ' (' + brand + ')' : ''), kcal: kcal,
          p: +n.proteins_100g || 0, c: +n.carbohydrates_100g || 0, f: +n.fat_100g || 0,
          per100: true, g: 100});
      })
      .catch(function(){ showResult({name:'Kunde inte nå databasen (' + code + ')', kcal:0}); });
  }

  /* ---------- AI-foto ---------- */
  function shrink(file){
    return new Promise(function(res, rej){
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function(){
        var max = 640, k = Math.min(1, max / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        res(cv.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.onerror = rej;
      img.src = url;
    });
  }
  function visionCfg(){
    var cfg = (typeof getAICfg === 'function') ? getAICfg() : {};
    if (!cfg.key) return null;
    var models = {
      groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
      openrouter: 'google/gemini-2.0-flash-001'
    };
    return {key: cfg.key, provider: cfg.provider || 'groq', model: models[cfg.provider || 'groq'] || models.groq};
  }
  function photoFlow(file){
    var out = document.getElementById('fs-out');
    var v = visionCfg();
    if (!out) return;
    if (!v){
      out.innerHTML = '<div class="panel open" style="margin-top:2px;"><div style="font-weight:600;margin-bottom:6px;">AI-nyckel saknas</div>' +
        '<div class="label">Bildigenkänning kräver en gratis AI-nyckel. Lägg in den under Inställningar → AI (Groq är gratis), sen funkar "Fota maten".<br><br>Streckkodsskanningen funkar redan nu, den kräver ingen nyckel.</div></div>';
      return;
    }
    out.innerHTML = '<div class="label" style="margin-top:10px;">Analyserar bilden...</div>';
    shrink(file).then(function(b64){
      var prompt = 'Titta på matbilden. Uppskatta hela portionens näring för EN portion som personen äter. Svara ENDAST med JSON, inget annat, i formatet {"name":"kort svenska namn på rätten","kcal":heltal,"p":gram,"c":gram,"f":gram}. Om bilden inte visar mat, svara {"name":"ingen mat","kcal":0,"p":0,"c":0,"f":0}.';
      return fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {'Content-Type':'application/json', 'Authorization':'Bearer ' + v.key},
        body: JSON.stringify({
          model: v.model, temperature: 0.2, max_tokens: 300,
          messages: [{role:'user', content:[
            {type:'image_url', image_url:{url:'data:image/jpeg;base64,' + b64}},
            {type:'text', text: prompt}
          ]}]
        })
      });
    }).then(function(r){
      if (!r.ok) return r.json().then(function(j){ throw {text:(j.error && j.error.message) || ('HTTP ' + r.status)}; });
      return r.json();
    }).then(function(j){
      var txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      var m = txt.match(/\{[\s\S]*\}/);
      if (!m) throw {text:'Otydligt svar från AI:n'};
      var o = JSON.parse(m[0]);
      if (o.name === 'ingen mat' || !o.kcal){
        showResult({name:'Kunde inte känna igen mat i bilden. Fota närmare.', kcal:0});
        return;
      }
      showResult({name: o.name + ' (AI-uppskattning)', kcal: +o.kcal || 0, p: +o.p || 0, c: +o.c || 0, f: +o.f || 0});
    }).catch(function(e){
      showResult({name:'Kunde inte analysera: ' + ((e && e.text) || 'okänt fel'), kcal:0});
    });
  }
})();
