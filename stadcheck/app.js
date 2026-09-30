/* Städcheck — konto, router, dashboard, onboarding, inställningar, admin */
'use strict';
var SUPA_URL='https://erpeczvaslduhsvboqbt.supabase.co';
var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycGVjenZhc2xkdWhzdmJvcWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzI0MDAsImV4cCI6MjEwNjM0ODQwMH0.3UI9923X_IdmQKMJ0LcXwISXJF969MhQWh0IshdB9qA';
var sb=supabase.createClient(SUPA_URL,SUPA_KEY);
var SC_USER=null,SC_PROFILE=null,SC_JOBS=null,SC_CUSTOMERS=null;

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function kr(n){return Number(n||0).toLocaleString('sv-SE',{minimumFractionDigits:0,maximumFractionDigits:0})+' kr';}
function dstr(d){if(!d)return '';var x=new Date(d);return x.toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'});}
function todayStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function root(){return document.getElementById('root');}
function toast(msg,err){
  var t=document.createElement('div');t.className='toast'+(err?' err':'');t.textContent=msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(function(){t.remove();},3400);
}
function groqKey(){return localStorage.getItem('sc_groq_key')||'';}
function logEv(e){
  if(!SC_USER)return;
  sb.from('sc_events').insert({event:e}).then(function(){},function(){});
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
  SC_USER=user;
  if(!user){SC_PROFILE=null;SC_JOBS=null;SC_CUSTOMERS=null;route();return;}
  sb.from('st_profiles').select('*').eq('user_id',user.id).maybeSingle().then(function(r){
    if(r.error){toast('Kunde inte läsa profilen: '+r.error.message,true);return;}
    if(!r.data){
      sb.from('st_profiles').insert({user_id:user.id,email:user.email||''}).then(function(ir){
        SC_PROFILE=ir.data||{user_id:user.id,onboarding_done:false};
        route();
      });
    }else{SC_PROFILE=r.data;route();}
  });
}

/* ---------- router ---------- */
var NAV=[
  {id:'dashboard',label:'Dashboard',hash:'#/'},
  {id:'jobs',label:'Jobb',hash:'#/jobs'},
  {id:'customers',label:'Kunder',hash:'#/customers'},
  {id:'settings',label:'Inställningar',hash:'#/settings'}
];
function renderNav(){
  var cur=location.hash||'#/';
  var html=NAV.map(function(n){
    var on=(n.hash==='#/')?(cur==='#/'||cur.indexOf('#/job')===0):(cur.indexOf(n.hash)===0);
    return '<a href="'+n.hash+'" class="'+(on?'on':'')+'">'+n.label+'</a>';
  }).join('');
  if(SC_PROFILE&&SC_PROFILE.is_admin)html+='<a href="#/admin" class="'+(cur.indexOf('#/admin')===0?'on':'')+'">Admin</a>';
  document.getElementById('topnav').innerHTML=html;
  document.getElementById('mobnav').innerHTML=html;
  document.getElementById('mobnav').addEventListener('click',function(){this.classList.remove('open');});
}
function route(){
  var h=location.hash||'#/';
  if(!SC_USER){
    if(h==='#/login')showAuth('login');
    else if(h==='#/signup')showAuth('signup');
    else showLanding();
    return;
  }
  if(!SC_PROFILE){return;}
  if(!SC_PROFILE.onboarding_done&&h!=='#/onboarding'){location.hash='#/onboarding';return;}
  showApp();renderNav();
  if(h==='#/'||h==='#/dashboard')renderDashboard();
  else if(h==='#/jobs')renderJobs();
  else if(h.indexOf('#/job/')===0)openJob(h.slice(5));
  else if(h==='#/customers')renderCustomers();
  else if(h==='#/settings')renderSettings();
  else if(h==='#/admin')renderAdmin();
  else if(h==='#/onboarding')renderOnboarding();
  else renderDashboard();
}
window.addEventListener('hashchange',route);

/* ---------- onboarding ---------- */
function renderOnboarding(){
  root().innerHTML='<div class="onb"><div class="steplab">Steg 1 av 1</div><h1>Lägg in din firma</h1>'+
    '<p class="mut" style="margin:6px 0 16px;">Detta hamnar på rut-underlagen. Du kan ändra det senare.</p>'+
    '<div class="card"><div class="field" style="margin-bottom:12px;"><label>Firmanamn *</label><input id="ob-name" placeholder="t.ex. Glansig Städ"></div>'+
    '<div class="row"><div class="field grow"><label>Org.nummer</label><input id="ob-org" placeholder="Valfritt"></div>'+
    '<div class="field grow"><label>Telefon</label><input id="ob-phone" placeholder="070-123 45 67"></div></div>'+
    '<button class="btn" id="ob-go" style="margin-top:16px;">Kom igång</button></div></div>';
  document.getElementById('ob-go').onclick=function(){
    var name=document.getElementById('ob-name').value.trim();
    if(!name){toast('Firmanamn krävs.',true);return;}
    sb.from('st_profiles').update({
      company_name:name,org_no:document.getElementById('ob-org').value.trim(),
      phone:document.getElementById('ob-phone').value.trim(),onboarding_done:true
    }).eq('user_id',SC_USER.id).then(function(r){
      if(r.error){toast('Kunde inte spara: '+r.error.message,true);return;}
      SC_PROFILE.onboarding_done=true;SC_PROFILE.company_name=name;
      logEv('onboarding_done');
      location.hash='#/';
    });
  };
}

/* ---------- dashboard ---------- */
function jobCalc(j){
  var arbete=(j.items||[]).reduce(function(a,i){return a+Number(i.price||0);},0);
  var rutAv=j.rut?arbete*0.5:0;
  var netto=arbete-rutAv;
  var mat=Number(j.material||0);
  var moms=(netto+mat)*(Number(j.vat||0)/100);
  return {arbete:arbete,rut:rutAv,netto:netto,mat:mat,moms:moms,total:netto+mat+moms};
}
function renderDashboard(){
  if(!SC_JOBS){root().innerHTML='<div class="viewhead"><h1>Dashboard</h1></div><div class="skel" style="width:60%"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';loadJobs();return;}
  var now=new Date(),mKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var month=SC_JOBS.filter(function(j){return (j.job_date||'').indexOf(mKey)===0;});
  var ink=month.reduce(function(a,j){return a+jobCalc(j).total;},0);
  var rutG=month.reduce(function(a,j){return a+(j.rut?jobCalc(j).rut:0);},0);
  var withAi=SC_JOBS.filter(function(j){return !!j.ai_summary;}).length;
  var recent=SC_JOBS.slice().sort(function(a,b){return (b.job_date||'')<(a.job_date||'')?-1:1;}).slice(0,6);
  root().innerHTML='<div class="viewhead"><h1>Hej '+(SC_PROFILE&&SC_PROFILE.company_name?esc(SC_PROFILE.company_name):'')+'</h1>'+
    '<a class="btn" style="margin-left:auto;" href="#/job/new">＋ Nytt jobb</a></div>'+
    '<p class="mut">Så går det för din firma just nu.</p>'+
    '<div class="statrow">'+
    '<div class="card stat"><div class="lab">Jobb denna månad</div><div class="v">'+month.length+'</div></div>'+
    '<div class="card stat"><div class="lab">Intäkt denna månad</div><div class="v">'+kr(ink)+'</div></div>'+
    '<div class="card stat"><div class="lab">Rut-avdrag förmedlat</div><div class="v">'+kr(rutG)+'</div></div>'+
    '<div class="card stat"><div class="lab">Kunder</div><div class="v">'+(SC_CUSTOMERS?SC_CUSTOMERS.length:'–')+'</div></div>'+
    '</div>'+
    (SC_JOBS.length?('<div class="tw"><table class="list"><thead><tr><th>Jobb</th><th>Kund</th><th>Datum</th><th>Totalt</th><th>Status</th></tr></thead><tbody>'+
      recent.map(function(j){var c=jobCalc(j);return '<tr class="click" onclick="openJob(\''+j.id+'\')"><td>'+esc((j.items&&j.items[0]&&j.items[0].name)?j.items[0].name:'(utan poster)')+'</td><td>'+esc(j.customer_name||'(raderad kund)')+'</td><td>'+dstr(j.job_date)+'</td><td>'+kr(c.total)+'</td><td><span class="badge '+esc(j.status)+'">'+esc(j.status)+'</span></td></tr>';}).join('')+
      '</tbody></table></div><p class="hint" style="margin-top:8px;">'+withAi+' av '+SC_JOBS.length+' jobb har AI-genererat rut-underlag. <a href="#/jobs">Alla jobb</a></p>')
    :('<div class="empty"><h3>Inga jobb än</h3><p class="mut" style="margin-top:6px;">Lägg ditt första jobb och kolla hur snabbt underlaget blir klart.</p><button class="btn" style="margin-top:16px;" onclick="location.hash=\'#/job/new\'">Skapa ditt första jobb</button></div>'));
}
function loadJobs(){
  sb.from('st_jobs').select('*').then(function(r){
    if(r.error){toast('Kunde inte hämta jobb: '+r.error.message,true);SC_JOBS=[];route();return;}
    SC_JOBS=r.data||[];loadCustomers();
  });
}
function loadCustomers(){
  sb.from('st_customers').select('*').order('name').then(function(r){
    if(r.error){toast('Kunde inte hämta kunder: '+r.error.message,true);}
    SC_CUSTOMERS=r.data||[];
    route();
  });
}

/* ---------- settings ---------- */
function renderSettings(){
  var p=SC_PROFILE||{};
  root().innerHTML='<h1>Inställningar</h1>'+
    '<div class="card" style="max-width:560px;margin-top:14px;">'+
    '<h3 style="margin-bottom:12px;">Firman (på alla PDF:er)</h3>'+ 
    '<div class="field" style="margin-bottom:10px;"><label>Firmanamn</label><input id="st-name" value="'+esc(p.company_name)+'"></div>'+ 
    '<div class="row"><div class="field grow"><label>Org.nummer</label><input id="st-org" value="'+esc(p.org_no)+'"></div>'+
    '<div class="field grow"><label>Telefon</label><input id="st-phone" value="'+esc(p.phone)+'"></div></div>'+
    '<div class="field" style="margin-top:10px;"><label>Mejl på underlaget</label><input id="st-email" value="'+esc(p.contact_email||'')+'"></div>'+
    '<button class="btn" id="st-save" style="margin-top:14px;">Spara</button></div>'+
    '<div class="card" style="max-width:560px;margin-top:14px;">'+
    '<h3 style="margin-bottom:8px;">AI (Groq)</h3>'+
    '<p class="mut mini" style="margin-bottom:10px;">Skapa en gratis nyckel på console.groq.com/keys och klistra in den. Den sparas bara i din webbläsare, aldrig på servern.</p>'+
    '<div class="field"><label>Groq-nyckel</label><input id="st-groq" type="password" placeholder="'+(groqKey()?'Sparad (skriv en ny för att byta)':'gsk_...')+'"></div>'+
    '<button class="btn ghost" id="st-groq-save" style="margin-top:12px;">Spara nyckel</button></div>'+
    '<div class="card" style="max-width:560px;margin-top:14px;">'+
    '<h3 style="margin-bottom:8px;">Konto</h3>'+
    '<p class="mut mini" style="margin-bottom:10px;">Inloggad som '+esc(SC_USER?SC_USER.email:'')+' · Beta: allt öppet och gratis.</p>'+
    '<button class="btn ghost" id="st-logout">Logga ut</button></div>';
  document.getElementById('st-save').onclick=function(){
    sb.from('st_profiles').update({
      company_name:document.getElementById('st-name').value.trim(),
      org_no:document.getElementById('st-org').value.trim(),
      phone:document.getElementById('st-phone').value.trim(),
      contact_email:document.getElementById('st-email').value.trim()
    }).eq('user_id',SC_USER.id).then(function(r){
      if(r.error){toast('Kunde inte spara: '+r.error.message,true);return;}
      SC_PROFILE.company_name=document.getElementById('st-name').value.trim();toast('Sparat ✓');
    });
  };
  document.getElementById('st-groq-save').onclick=function(){
    var k=document.getElementById('st-groq').value.trim();
    if(!k){localStorage.removeItem('sc_groq_key');toast('Nyckeln borttagen.');return;}
    localStorage.setItem('sc_groq_key',k);toast('Nyckeln sparad i webbläsaren ✓');
  };
  document.getElementById('st-logout').onclick=function(){sb.auth.signOut();};
}

/* ---------- admin ---------- */
function renderAdmin(){
  if(!SC_PROFILE||!SC_PROFILE.is_admin){root().innerHTML='<h1>Admin</h1><div class="empty" style="max-width:520px;margin-top:18px;">Du har inte adminrättigheter.</div>';return;}
  root().innerHTML='<h1>Admin</h1><div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel"></div>';
  Promise.all([
    sb.from('st_profiles').select('*').order('created_at',{ascending:false}),
    sb.from('st_jobs').select('id,status,items,rut,material,job_date,created_at'),
    sb.from('sc_events').select('event,user_id,created_at').gte('created_at',new Date(Date.now()-7*864e5).toISOString())
  ]).then(function(rs){
    if(rs[0].error||rs[1].error||rs[2].error){root().innerHTML='<h1>Admin</h1><div class="empty">Kunde inte hämta data. Försök igen.</div>';return;}
    var profs=rs[0].data||[],jobs=rs[1].data||[],evs=rs[2].data||[];
    var active=new Set(evs.map(function(e){return e.user_id;})).size;
    root().innerHTML='<h1>Admin</h1>'+
      '<div class="statrow">'+
      '<div class="card stat"><div class="lab">Användare</div><div class="v">'+profs.length+'</div></div>'+
      '<div class="card stat"><div class="lab">Jobb totalt</div><div class="v">'+jobs.length+'</div></div>'+
      '<div class="card stat"><div class="lab">Aktiva (7 dagar)</div><div class="v">'+active+'</div></div>'+
      '<div class="card stat"><div class="lab">Händelser (7 dagar)</div><div class="v">'+evs.length+'</div></div>'+
      '</div>'+
      '<div class="tw"><table class="list"><thead><tr><th>Firma</th><th>Mejl</th><th>Onboardad</th><th>Admin</th><th>Registrerad</th></tr></thead><tbody>'+
      profs.map(function(u){return '<tr><td>'+esc(u.company_name||'(ej satt)')+'</td><td>'+esc(u.email||'')+'</td><td>'+(u.onboarding_done?'✓':'–')+'</td><td>'+(u.is_admin?'✓':'–')+'</td><td class="mut">'+dstr(u.created_at)+'</td></tr>';}).join('')+
      '</tbody></table></div>'+
      '<h3 style="margin-top:22px;">Senaste händelser</h3><div class="tw"><table class="list"><thead><tr><th>Händelse</th><th>Mejl</th><th>Tid</th></tr></thead><tbody>'+
      evs.slice(-12).reverse().map(function(e){var u=profs.filter(function(p){return p.user_id===e.user_id;})[0];return '<tr><td>'+esc(e.event)+'</td><td>'+esc(u&&u.email?u.email:'')+'</td><td class="mut">'+dstr(e.created_at)+'</td></tr>';}).join('')+
      '</tbody></table></div>';
  });
}

/* ---------- boot ---------- */
sb.auth.getSession().then(function(r){
  if(r.data&&r.data.session){SC_USER=r.data.session.user;afterLogin(SC_USER);}
  else route();
});
sb.auth.onAuthStateChange(function(ev,session){
  if(ev==='SIGNED_OUT'){SC_USER=null;SC_PROFILE=null;SC_JOBS=null;SC_CUSTOMERS=null;location.hash='#/';route();return;}
  if(session&&session.user&&(!SC_USER||SC_USER.id!==session.user.id)){SC_USER=session.user;afterLogin(session.user);}
});
