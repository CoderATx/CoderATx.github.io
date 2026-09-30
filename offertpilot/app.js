/* OffertPilot — konto, router, dashboard, onboarding, inställningar */
'use strict';
var SUPA_URL='https://erpeczvaslduhsvboqbt.supabase.co';
var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycGVjenZhc2xkdWhzdmJvcWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzI0MDAsImV4cCI6MjEwNjM0ODQwMH0.3UI9923X_IdmQKMJ0LcXwISXJF969MhQWh0IshdB9qA';
var sb=supabase.createClient(SUPA_URL,SUPA_KEY);
var OP_USER=null,OP_PROFILE=null,OP_OFFERS=null;

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function kr(n){return Number(n||0).toLocaleString('sv-SE',{minimumFractionDigits:0,maximumFractionDigits:0})+' kr';}
function dstr(d){if(!d)return '';var x=new Date(d);return x.toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'});}
function root(){return document.getElementById('root');}
function toast(msg,err){
  var t=document.createElement('div');t.className='toast'+(err?' err':'');t.textContent=msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(function(){t.remove();},3400);
}
function groqKey(){return localStorage.getItem('op_groq_key')||'';}
function logEv(e){
  if(!OP_USER)return;
  sb.from('op_events').insert({event:e}).then(function(){},function(){});
}
function show(el,on){document.getElementById(el).hidden=!on;}

/* ---------- auth ---------- */
function showLanding(){show('landing',true);show('app',false);show('auth',false);}
function showApp(){show('landing',false);show('app',true);show('auth',false);renderNav();}
function showAuth(mode){
  show('landing',false);show('app',false);show('auth',true);
  setAuthMode(mode||'login');
}
function setAuthMode(mode){
  var login=mode==='login';
  document.getElementById('tab-login').classList.toggle('on',login);
  document.getElementById('tab-signup').classList.toggle('on',!login);
  document.getElementById('auth-h').textContent=login?'Välkommen tillbaka':'Skapa ditt konto';
  document.getElementById('auth-go').textContent=login?'Logga in':'Skapa konto';
  document.getElementById('auth-go').setAttribute('data-mode',mode);
  document.getElementById('auth-msg').textContent='';
}
function authMsg(m,err){
  var d=document.getElementById('auth-msg');
  d.innerHTML='<p class="hint" style="color:'+(err?'var(--bad)':'var(--accent)')+';font-weight:600;margin-bottom:8px;">'+esc(m)+'</p>';
}
document.getElementById('tab-login').onclick=function(){setAuthMode('login');};
document.getElementById('tab-signup').onclick=function(){setAuthMode('signup');};
document.getElementById('menu-btn').onclick=function(){document.getElementById('mobnav').classList.toggle('open');};
document.getElementById('auth-go').onclick=function(){
  var mode=this.getAttribute('data-mode');
  var em=document.getElementById('auth-em').value.trim();
  var pw=document.getElementById('auth-pw').value;
  if(!em||!pw){authMsg('Fyll i mejl och lösenord.',true);return;}
  if(mode==='signup'){
    sb.auth.signUp({email:em,password:pw}).then(function(r){
      if(r.error){authMsg(r.error.message,true);return;}
      logEv('signup');
      afterLogin(r.data.user);
    });
  }else{
    sb.auth.signInWithPassword({email:em,password:pw}).then(function(r){
      if(r.error){authMsg(r.error.message,true);return;}
      logEv('login');
      afterLogin(r.data.user);
    });
  }
};

function afterLogin(user){
  OP_USER=user?user.email:null;
  if(!user){OP_PROFILE=null;OP_OFFERS=null;route();return;}
  sb.from('op_profiles').select('*').eq('user_id',user.id).maybeSingle().then(function(r){
    if(r.error){toast('Kunde inte läsa profilen: '+r.error.message,true);return;}
    if(!r.data){
      sb.from('op_profiles').insert({user_id:user.id,email:user.email||''}).then(function(ir){
        OP_PROFILE=ir.data||{user_id:user.id,onboarding_done:false};
        route();
      });
    }else{OP_PROFILE=r.data;route();}
  });
}

/* ---------- router ---------- */
var NAV=[
  {id:'dashboard',label:'Dashboard',hash:'#/dashboard'},
  {id:'new',label:'Ny offert',hash:'#/new'},
  {id:'settings',label:'Inställningar',hash:'#/settings'}
];
function renderNav(){
  var cur=location.hash||'#/';
  var html=NAV.map(function(n){
    var on=cur.indexOf(n.hash)===0;
    return '<a href="'+n.hash+'" class="'+(on?'on':'')+'">'+n.label+'</a>';
  }).join('');
  if(OP_PROFILE&&OP_PROFILE.is_admin)html+='<a href="#/admin" class="'+(cur.indexOf('#/admin')===0?'on':'')+'">Admin</a>';
  document.getElementById('topnav').innerHTML=html;
  document.getElementById('mobnav').innerHTML=html;
  document.getElementById('mobnav').addEventListener('click',function(){this.classList.remove('open');});
}
function route(){
  var h=location.hash||'#/';
  if(!OP_USER){
    if(h==='#/login')showAuth('login');
    else if(h==='#/signup')showAuth('signup');
    else showLanding();
    return;
  }
  if(!OP_PROFILE){return;}
  if(!OP_PROFILE.onboarding_done&&h!=='#/onboarding'){location.hash='#/onboarding';return;}
  showApp();renderNav();
  if(h==='#/'||h==='#/dashboard')renderDashboard();
  else if(h==='#/new')openOffer(null);
  else if(h.indexOf('#/offer/')===0)openOffer(h.slice(8));
  else if(h==='#/settings')renderSettings();
  else if(h==='#/admin')renderAdmin();
  else if(h==='#/onboarding')renderOnboarding();
  else renderDashboard();
}
window.addEventListener('hashchange',route);

/* ---------- onboarding ---------- */
function renderOnboarding(){
  root().innerHTML='<div class="onb"><div class="steplab">Steg 1 av 1</div><h1>Lägg in din firma</h1>'+
    '<p class="mut" style="margin:6px 0 16px;">Detta hamnar på varje offert. Du kan ändra det senare.</p>'+
    '<div class="card"><div class="field" style="margin-bottom:12px;"><label>Firmanamn *</label><input id="ob-name" placeholder="t.ex. Måleri i Haninge AB"></div>'+
    '<div class="row"><div class="field grow"><label>Org.nummer</label><input id="ob-org" placeholder="Valfritt, t.ex. 559123-4567"></div>'+
    '<div class="field grow"><label>Telefon</label><input id="ob-phone" placeholder="070-123 45 67"></div></div>'+
    '<button class="btn" id="ob-go" style="margin-top:16px;">Kom igång</button></div></div>';
  document.getElementById('ob-go').onclick=function(){
    var name=document.getElementById('ob-name').value.trim();
    if(!name){toast('Firmanamn krävs.',true);return;}
    sb.from('op_profiles').update({
      company_name:name,org_no:document.getElementById('ob-org').value.trim(),
      phone:document.getElementById('ob-phone').value.trim(),onboarding_done:true
    }).eq('user_id',OP_PROFILE.user_id).then(function(r){
      if(r.error){toast('Kunde inte spara: '+r.error.message,true);return;}
      OP_PROFILE.onboarding_done=true;OP_PROFILE.company_name=name;
      logEv('onboarding_done');
      location.hash='#/dashboard';
    });
  };
}

/* ---------- dashboard ---------- */
function renderDashboard(){
  loadOffers(function(list){
    var now=new Date(),mNow=now.getMonth()+'-'+now.getFullYear();
    var thisM=list.filter(function(o){return new Date(o.created_at).getMonth()+'-'+new Date(o.created_at).getFullYear()===mNow;});
    var acc=list.filter(function(o){return o.status==='accepterad';});
    var sent=list.filter(function(o){return o.status==='skickad';});
    var accVal=acc.reduce(function(a,o){return a+offerTotal(o).total;},0);
    var sentVal=sent.reduce(function(a,o){return a+offerTotal(o).total;},0);
    var conv=list.length?Math.round(acc.length/list.length*100):0;
    var rows=list.map(function(o){var t=offerTotal(o);
      return '<tr class="click" data-id="'+o.id+'"><td>#'+o.number+'</td><td>'+esc(o.customer_name)+'</td><td>'+kr(t.total)+'</td>'+
      '<td><span class="badge '+esc(o.status)+'">'+esc(o.status)+'</span></td><td class="mut">'+dstr(o.created_at)+'</td></tr>';}).join('');
    root().innerHTML=
      '<div class="viewhead"><h1>'+greet()+(OP_PROFILE&&OP_PROFILE.company_name?', '+esc(OP_PROFILE.company_name):'')+'</h1><div style="margin-left:auto"><a class="btn" href="#/new">＋ Ny offert</a></div></div>'+
      '<p class="mut">'+tagline()+'</p>'+
      '<div class="statrow">'+
      '<div class="card stat lift"><div class="lab">Offerter denna månad</div><div class="v vgrad" id="s1">0</div></div>'+
      '<div class="card stat lift"><div class="lab">Accepterade (alla)</div><div class="v vgrad" id="s2">0</div><div class="mini mut" id="s2b"></div></div>'+
      '<div class="card stat lift"><div class="lab">Värde accepterat</div><div class="v vgrad" id="s3">0</div></div>'+
      '<div class="card stat lift"><div class="lab">Pågår (skickat)</div><div class="v" id="s4">0</div></div>'+
      '</div>'+
      '<div class="row" style="margin:8px 0"><div class="grow"><input id="q" placeholder="Sök kund…"></div>'+
      '<div style="width:170px"><select id="f"><option value="">Alla status</option><option>utkast</option><option>skickad</option><option>accepterad</option><option>avslagen</option></select></div>'+
      '<div style="width:170px"><select id="s"><option value="ny">Nyaste först</option><option value="belopp">Belopp</option></select></div></div>'+
      (list.length?'<div class="tw"><table class="list"><thead><tr><th>Nr</th><th>Kund</th><th>Belopp</th><th>Status</th><th>Datum</th></tr></thead><tbody id="tb">'+rows+'</tbody></table></div>'
        :'<div class="empty"><b>Inga offerter än. Dags att ändra på det.</b><p style="margin-top:6px">Din första offert tar två minuter, och den första är alltid den roligaste.</p><a class="btn" style="margin-top:14px" href="#/new">Bygg din första offert</a></div>');
    function apply(){
      var q=document.getElementById('q').value.toLowerCase(),f=document.getElementById('f').value,s=document.getElementById('s').value;
      var l=list.filter(function(o){return (!q||o.customer_name.toLowerCase().indexOf(q)!==-1)&&(!f||o.status===f);});
      if(s==='belopp')l=l.slice().sort(function(a,b){return offerTotal(b).total-offerTotal(a).total;});
      document.getElementById('tb').innerHTML=l.map(function(o){var t=offerTotal(o);
        return '<tr class="click" data-id="'+o.id+'"><td>#'+o.number+'</td><td>'+esc(o.customer_name)+'</td><td>'+kr(t.total)+'</td>'+
        '<td><span class="badge '+esc(o.status)+'">'+esc(o.status)+'</span></td><td class="mut">'+dstr(o.created_at)+'</td></tr>';}).join('')||'<tr><td colspan="5" class="mut" style="text-align:center">Inga träffar.</td></tr>';
    }
    document.getElementById('q').oninput=apply;
    document.getElementById('f').onchange=apply;
    document.getElementById('s').onchange=apply;
    document.getElementById('tb').onclick=function(e){
      var tr=e.target.closest('tr[data-id]');if(tr)location.hash='#/offer/'+tr.getAttribute('data-id');
    };
    countUp(document.getElementById('s1'),thisM.length);
    countUp(document.getElementById('s2'),acc.length);
    document.getElementById('s2b').textContent='('+conv+' % vinst)';
    countUp(document.getElementById('s3'),accVal,'kr');
    countUp(document.getElementById('s4'),sentVal,'kr');
  });
}

function greet(){
  var h=new Date().getHours();
  if(h<5)return 'Sen kväll';
  if(h<10)return 'God morgon';
  if(h<12)return 'God förmiddag';
  if(h<18)return 'God eftermiddag';
  return 'God kväll';
}
var TAGS=['En offert idag är ett jobb nästa vecka.','Skicka den innan du hunnit ändra dig.','Konkurrenterna skriver sina offerter på kvällen. Du inte.','Firman växer, en offert i taget.','Bästa kunden är den som sagt ja. Nästa offert är ett klick bort.'];
function tagline(){return TAGS[Math.floor(Math.random()*TAGS.length)];}
function confetti(n){
  n=n||70;
  var colors=['#5a5fe0','#3d43c9','#8a5fe0','#0e9f6e','#f0b429','#c2334d'];
  for(var i=0;i<n;i++){
    var s=document.createElement('span');
    s.className='cf';
    s.style.left=(Math.random()*100)+'vw';
    s.style.background=colors[Math.floor(Math.random()*colors.length)];
    s.style.animationDuration=(1.6+Math.random()*1.8)+'s';
    s.style.animationDelay=(Math.random()*0.4)+'s';
    s.style.width=(5+Math.random()*6)+'px';
    s.style.height=(8+Math.random()*9)+'px';
    document.body.appendChild(s);
    (function(el){setTimeout(function(){el.remove();},4200);})(s);
  }
}
function countUp(el,end,suffix){
  if(!el)return;
  var t0=null,dur=700;
  function step(ts){
    if(!t0)t0=ts;
    var p=Math.min((ts-t0)/dur,1);
    var eased=1-Math.pow(1-p,3);
    var v=end*eased;
    el.textContent=(suffix==='kr'?kr(Math.round(v)):String(Math.round(v)));
    if(p<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function loadOffers(cb){
  sb.from('op_offers').select('*').then(function(r){
    if(r.error){toast('Kunde inte hämta offerter: '+r.error.message,true);OP_OFFERS=[];cb(OP_OFFERS);return;}
    OP_OFFERS=r.data||[];cb(OP_OFFERS);
  });
}

/* ---------- Inställningar ---------- */
function renderSettings(){
  var p=OP_PROFILE||{};
  root().innerHTML='<h1>Inställningar</h1>'+
    '<div class="card" style="max-width:640px"><h3 style="font-size:.8rem;text-transform:uppercase;color:var(--label);margin-bottom:12px">Firmainfo (hamnar på varje offert)</h3>'+
    '<div class="field"><label>Firmanamn</label><input id="st-co" value="'+esc(p.company_name||'')+'"></div>'+
    '<div class="row"><div class="field grow"><label>Telefon</label><input id="st-ph" value="'+esc(p.phone||'')+'"></div>'+
    '<div class="field grow"><label>Org.nummer</label><input id="st-org" value="'+esc(p.org_no||'')+'"></div></div>'+
    '<div class="field"><label>Kontaktmejl på offerten</label><input id="st-em" value="'+esc(p.contact_email||OP_USER||'')+'"></div>'+
    '<button class="btn" id="st-save">Spara</button></div>'+
    '<div class="card" style="max-width:640px;margin-top:16px"><h3 style="font-size:.8rem;text-transform:uppercase;color:var(--label);margin-bottom:12px">AI (valfritt)</h3>'+
    '<div class="field"><label>API-nyckel från Groq</label><input id="st-key" value="'+esc(groqKey())+'" placeholder="gsk_…"></div>'+
    '<p class="hint">Skapa en gratis nyckel på groq.com/keys. Utan nyckeln fungerar allt annat, du skriver posterna själv.</p>'+
    '<button class="btn ghost" id="st-keysave" style="margin-top:10px">Spara nyckel</button></div>'+
    '<div class="card" style="max-width:640px;margin-top:16px"><h3 style="font-size:.8rem;text-transform:uppercase;color:var(--label);margin-bottom:12px">Konto</h3>'+
    '<p class="mut mini" style="margin-bottom:12px">Inloggad som '+esc(OP_USER)+'. Plan: '+(OP_PROFILE&&OP_PROFILE.is_admin?'Admin':'Pro (beta)')+'. Betalning via Stripe läggs in innan lansering.</p>'+
    '<button class="btn danger" id="st-out">Logga ut</button></div>';
  document.getElementById('st-save').onclick=function(){
    sb.from('op_profiles').update({company_name:document.getElementById('st-co').value.trim(),
      phone:document.getElementById('st-ph').value.trim(),org_no:document.getElementById('st-org').value.trim(),
      contact_email:document.getElementById('st-em').value.trim()}).eq('user_id',OP_PROFILE.user_id).then(function(r){
      if(r.error){toast('Kunde inte spara: '+r.error.message,true);return;}
      OP_PROFILE.company_name=document.getElementById('st-co').value.trim();toast('Sparat ✓');
    });
  };
  document.getElementById('st-keysave').onclick=function(){
    var k=document.getElementById('st-key').value.trim();
    if(!k){localStorage.removeItem('op_groq_key');toast('Nyckeln borttagen.');return;}
    localStorage.setItem('op_groq_key',k);toast('Nyckeln sparad i webbläsaren ✓');
  };
  document.getElementById('st-out').onclick=function(){sb.auth.signOut();};
}

/* ---------- Admin ---------- */
function renderAdmin(){
  if(!OP_PROFILE||!OP_PROFILE.is_admin){
    root().innerHTML='<h1>Admin</h1><div class="empty" style="max-width:520px;margin-top:18px">Du har inte adminrättigheter.</div>';
    return;
  }
  root().innerHTML='<h1>Admin</h1><div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel"></div>';
  Promise.all([
    sb.from('op_profiles').select('*').order('created_at',{ascending:false}),
    sb.from('op_offers').select('id,status,vat,rot,items,created_at'),
    sb.from('op_events').select('event,user_id,created_at').gte('created_at',new Date(Date.now()-7*864e5).toISOString())
  ]).then(function(rs){
    var profs=rs[0].data||[],offers=rs[1].data||[],evs=rs[2].data||[];
    var last7=evs.filter(function(e){return e.event==='offer_created';}).length;
    var active=new Set(evs.map(function(e){return e.user_id;})).size;
    var acc=offers.filter(function(o){return o.status==='accepterad';}).length;
    root().innerHTML='<h1>Admin</h1>'+
      '<div class="statrow">'+
      '<div class="card stat"><div class="lab">Användare</div><div class="v">'+profs.length+'</div></div>'+
      '<div class="card stat"><div class="lab">Offerter totalt</div><div class="v">'+offers.length+'</div></div>'+
      '<div class="card stat"><div class="lab">Aktiva (7 dagar)</div><div class="v">'+active+'</div></div>'+
      '<div class="card stat"><div class="lab">Offerter (7 dagar)</div><div class="v">'+last7+'</div></div>'+
      '<div class="card stat"><div class="lab">Accepterade</div><div class="v">'+acc+'</div></div>'+
      '<div class="card stat"><div class="lab">Systemstatus</div><div class="v" style="color:var(--good);font-size:1.2rem">OK</div></div>'+
      '</div>'+
      '<div class="tw"><table class="list"><thead><tr><th>Företag</th><th>Mejl</th><th>Onboardad</th><th>Admin</th><th>Registrerad</th></tr></thead><tbody>'+
      profs.map(function(u){return '<tr><td>'+esc(u.company_name||'(ej satt)')+'</td><td>'+esc(u.email||'')+'</td><td>'+(u.onboarding_done?'✓':'–')+'</td><td>'+(u.is_admin?'✓':'–')+'</td><td class="mut">'+dstr(u.created_at)+'</td></tr>';}).join('')+
      '</tbody></table></div>';
  }).catch(function(){root().innerHTML='<h1>Admin</h1><div class="empty">Kunde inte hämta data. Försök igen.</div>';});
}

/* ---------- boot ---------- */
sb.auth.getSession().then(function(r){
  if(r.data&&r.data.session){afterLogin(r.data.session.user);}
  else route();
});
sb.auth.onAuthStateChange(function(ev,session){
  if(ev==='SIGNED_OUT'){OP_USER=null;OP_PROFILE=null;OP_OFFERS=null;location.hash='#/';route();return;}
  if(session&&session.user&&OP_USER!==session.user.email){afterLogin(session.user);}
});
