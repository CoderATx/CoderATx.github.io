/* FORWARD - Konto: valfri inloggning (Supabase) + molnsynk */
(function(){
  var SB_URL = 'https://uxeaxqzovrtnqaialzsk.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZWF4cXpvdnJ0bnFhaWFsenNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MDUwNzEsImV4cCI6MjA5NzQ4MTA3MX0.Xm9hj1ZiH10sjBiYuh-Fzm5lIsqcGLxC9NbynyySbNY';
  var KEY_STORE = 'forward_sb_key';
  var SBJS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  var sb = null, currentUser = null, syncTimer = null, hooked = false, lastErr = 0;

  function getKey(){ try { return (localStorage.getItem(KEY_STORE) || '').trim(); } catch(e){ return ''; } }
  function esc2(s){ return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s); }
  function val(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function setStatus(t){ var el = document.getElementById('acct-status'); if (el) el.textContent = t; }
  function syncFail(){
    if (Date.now() - lastErr < 30000) return;
    lastErr = Date.now();
    if (typeof toast === 'function') toast('Synk misslyckades: kör SQL-koden i Supabase (copierad i chatten).');
  }
  function loadScript(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function init(){
    var key = getKey() || SB_KEY;
    if (!key || !window.supabase) return false;
    try { sb = window.supabase.createClient(SB_URL, key); return true; }
    catch(e){ return false; }
  }

  function collect(){
    var out = {};
    for (var i = 0; i < localStorage.length; i++){
      var k = localStorage.key(i);
      if (k.indexOf('forward_') !== 0 || k === KEY_STORE || k.indexOf('_saved_at') !== -1) continue;
      try { out[k] = JSON.parse(localStorage.getItem(k)); } catch(e){ out[k] = localStorage.getItem(k); }
    }
    return out;
  }
  function restore(obj){
    Object.keys(obj || {}).forEach(function(k){
      if (k === KEY_STORE) return;
      try { localStorage.setItem(k, typeof obj[k] === 'string' ? obj[k] : JSON.stringify(obj[k])); } catch(e){}
    });
  }
  function localHasData(){
    try {
      var d = JSON.parse(localStorage.getItem('forward_app_data_v1')) || {};
      return ((d.workouts||[]).length + (d.trainingDays||[]).length + (d.goals||[]).length + (d.habits||[]).length) > 0;
    } catch(e){ return false; }
  }

  function upload(){
    if (!sb || !currentUser) return Promise.resolve(false);
    return sb.from('forward_data')
      .upsert({user_id: currentUser, data: collect(), updated_at: new Date().toISOString()})
      .then(function(res){ if (res.error) throw res.error; return true; })
      .catch(function(){ syncFail(); return false; });
  }
  function download(){
    if (!sb || !currentUser) return Promise.resolve(null);
    return sb.from('forward_data').select('data').eq('user_id', currentUser).maybeSingle()
      .then(function(res){ if (res.error) throw res.error; return res.data; });
  }

  function hookWrites(){
    if (hooked) return; hooked = true;
    var orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v){
      orig.call(this, k, v);
      if (currentUser && typeof k === 'string' && k.indexOf('forward_') === 0 && k !== KEY_STORE){
        clearTimeout(syncTimer);
        syncTimer = setTimeout(upload, 1500);
      }
    };
    window.addEventListener('beforeunload', function(){ if (currentUser) upload(); });
  }

  function afterAuth(uid, silent){
    currentUser = uid;
    hookWrites();
    download().then(function(row){
      var cloud = (row && row.data && Object.keys(row.data).length) ? row.data : null;
      if (cloud && (!localHasData() || confirm('Kontot har sparad data.\n\nOK = hämta data från kontot till den här enheten\nAvbryt = behåll enhetens data och skriv över kontot'))){
        restore(cloud);
        if (typeof db !== 'undefined' && typeof loadDB === 'function'){ db = loadDB(); }
        if (typeof renderAll === 'function') renderAll();
        if (!silent && typeof toast === 'function') toast('Data hämtad från kontot ✓');
      } else if (!cloud || localHasData()){
        upload();
      }
    }).catch(function(){
      if (!silent && typeof toast === 'function') toast('Kunde inte hämta data från kontot.');
    });
    updateCard();
  }

  function signUp(){
    if (!sb) return syncFail();
    var em = val('acct-email'), pw = val('acct-pass');
    if (!em || pw.length < 6) return toast('Fyll i e-post och ett lösenord (minst 6 tecken).');
    sb.auth.signUp({email: em, password: pw}).then(function(res){
      if (res.error) return toast(res.error.message);
      if (res.data && res.data.session){ afterAuth(res.data.user.id); toast('Konto skapat ✓'); }
      else toast('Kolla din mail och bekräfta kontot, sen logga in.');
    });
  }
  function signIn(){
    if (!sb) return syncFail();
    var em = val('acct-email'), pw = val('acct-pass');
    if (!em || !pw) return toast('Fyll i e-post och lösenord.');
    sb.auth.signInWithPassword({email: em, password: pw}).then(function(res){
      if (res.error) return toast('Inloggningen misslyckades: ' + res.error.message);
      afterAuth(res.data.user.id);
      toast('Inloggad ✓');
    });
  }
  function signOutNow(){
    if (!sb) return;
    sb.auth.signOut().then(function(){
      currentUser = null;
      clearTimeout(syncTimer);
      updateCard();
      toast('Utloggad. Data stannar på den här enheten.');
    });
  }

  function ensureCard(){
    var view = document.getElementById('view-settings');
    if (!view || document.getElementById('acct-card')) return;
    var grid = view.querySelector('.grid') || view;
    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'acct-card';
    card.innerHTML =
      '<h3>Konto &amp; synk (valfritt)</h3>' +
      '<div class="label" id="acct-status" style="margin-bottom:12px;"></div>' +
      '<div class="fieldrow"><div class="field" style="flex:2;min-width:180px;"><label>E-post</label><input id="acct-email" type="email" autocomplete="username"></div>' +
        '<div class="field" style="min-width:130px;"><label>Lösenord</label><input id="acct-pass" type="password" autocomplete="current-password"></div></div>' +
      '<div class="row" style="flex-wrap:wrap;gap:10px;">' +
        '<button class="btn" id="acct-in">Logga in</button>' +
        '<button class="btn ghost" id="acct-up">Skapa konto</button>' +
        '<button class="btn danger" id="acct-out" style="display:none;">Logga ut</button>' +
      '</div>' +
      '<div class="label" style="margin-top:12px;">Utan konto fungerar allt som vanligt och datan sparas bara på den här enheten. Med konto synkas träning, mat och mål automatiskt mellan dina enheter.</div>';
    grid.appendChild(card);
    card.querySelector('#acct-in').onclick = signIn;
    card.querySelector('#acct-up').onclick = signUp;
    card.querySelector('#acct-out').onclick = signOutNow;
    updateCard();
  }

  function updateCard(){
    var card = document.getElementById('acct-card'); if (!card) return;
    var loggedIn = !!currentUser;
    card.querySelector('#acct-in').style.display = loggedIn ? 'none' : '';
    card.querySelector('#acct-up').style.display = loggedIn ? 'none' : '';
    card.querySelector('#acct-out').style.display = loggedIn ? '' : 'none';
    card.querySelector('#acct-email').style.display = loggedIn ? 'none' : '';
    card.querySelector('#acct-pass').style.display = loggedIn ? 'none' : '';
    setStatus(loggedIn ? 'Inloggad. Träning, mat och mål synkas automatiskt.' : 'Ej inloggad. Skapa ett konto eller logga in nedan.');
  }

  function restoreSession(silent){
    if (!sb) return Promise.resolve();
    return sb.auth.getSession().then(function(res){
      var s = res.data && res.data.session;
      if (s && s.user) afterAuth(s.user.id, silent);
      else updateCard();
    });
  }

  /* Koppla in kortet i Inställningar */
  if (typeof window.renderSettings === 'function'){
    var origRS = window.renderSettings;
    window.renderSettings = function(){ var r = origRS.apply(this, arguments); ensureCard(); return r; };
  }
  ensureCard();

  /* Starta: ladda Supabase-klienten, återställ eventuell session */
  loadScript(SBJS).then(function(){
    if (init()) restoreSession(true);
  }).catch(function(){});
})();
