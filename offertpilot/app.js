/* OffertPilot — konto, router, dashboard, onboarding, inställningar */
'use strict';
var SB_URL='https://uxeaxqzovrtnqaialzsk.supabase.co';
var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZWF4cXpvdnJ0bnFhaWFsenNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MDUwNzEsImV4cCI6MjA5NzQ4MTA3MX0.Xm9hj1ZiH10sjBiYuh-Fzm5lIsqcGLxC9NbynyySbNY';
var sb=window.supabase.createClient(SB_URL,SB_KEY);
var OP_USER=null, OP_PROFILE=null, OP_OFFERS=null, OP_EMAIL='';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function kr(n){return new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0}).format(Math.round(n||0))+' kr';}
function dstr(iso){try{return new Date(iso).toLocaleDateString('sv-SE');}catch(e){return '';}}
function toast(msg,err){var w=document.getElementById('toasts');var t=document.createElement('div');t.className='toast'+(err?' err':'');t.textContent=msg;w.appendChild(t);setTimeout(function(){t.remove();},3200);}
function root(){return document.getElementById('root');}
function landingEl(){return document.getElementById('landing');}
function appEl(){return document.getElementById('app');}
function logEv(ev,meta){if(!OP_USER)return;sb.from('op_events').insert({user_id:OP_USER,event:ev,meta:meta||{}}).then(function(){});}
function groqKey(){try{return (localStorage.getItem('op_groq_key')||'').trim();}catch(e){return '';}}

function navLinks(){
  var links=[['#/dashboard','Dashboard'],['#/new','Ny offert'],['#/priser','Priser'],['#/installningar','Inställningar']];
  if(OP_PROFILE&&OP_PROFILE.is_admin)links.push(['#/admin','Admin']);
  var h=location.hash||'#/'
  var nav=document.getElementById('topnav'),mob=document.getElementById('mobnav');
  nav.innerHTML=links.map(function(l){return '<a href="'+l[0]+'" class="'+(h.indexOf(l[0])===0?'on':'')+'">'+l[1]+'</a>';}).join('');
  mob.innerHTML=links.concat([['#/logout','Logga ut']]).map(function(l){return '<a href="'+l[0]+'" class="'+(h.indexOf(l[0])===0?'on':'')+'">'+l[1]+'</a>';}).join('');
}
document.getElementById('menu-btn').onclick=function(){document.getElementById('mobnav').classList.toggle('open');};

function route(){
  var h=location.hash||'#/';navLinks();
  var authMode=h.indexOf('#/signup')===0?'up':h.indexOf('#/login')===0?'in':h.indexOf('#/reset')===0?'reset':null;
  if(!OP_USER){
    appEl().hidden=!authMode;landingEl().hidden=!!authMode;window.scrollTo(0,0);
    document.querySelector('.topbar').style.display=authMode?'none':'';
    if(authMode)renderAuth(authMode);
    return;
  }
  landingEl().hidden=true;appEl().hidden=false;
  if(OP_PROFILE&&!OP_PROFILE.onboarding_done){renderOnboarding();return;}
  if(h.indexOf('#/dashboard')===0||h==='#/'||h==='#')renderDashboard();
  else if(h.indexOf('#/new')===0)renderOfferEditor(null);
  else if(h.indexOf('#/offer/')===0)openOffer(h.split('#/offer/')[1]);
  else if(h.indexOf('#/installningar')===0)renderSettings();
  else if(h.indexOf('#/priser')===0)renderPricing();
  else if(h.indexOf('#/admin')===0)renderAdmin();
  else if(h.indexOf('#/logout')===0)doLogout();
  else if(h.indexOf('#/login')===0)renderAuth('in');
  else if(h.indexOf('#/signup')===0)renderAuth('up');
  else if(h.indexOf('#/reset')===0)renderAuth('reset');
  else renderDashboard();
}
window.addEventListener('hashchange',route);

function doLogout(){sb.auth.signOut().then(function(){OP_USER=null;OP_PROFILE=null;OP_OFFERS=null;location.hash='#/';route();toast('Utloggad.');});}

/* ---------- Auth ---------- */
function renderAuth(mode){
  var up=mode==='up',rs=mode==='reset';
  root().innerHTML='<div class="authwrap"><div class="card">'+
    '<h1>'+(up?'Skapa konto':rs?'Återställ lösenord':'Logga in')+'</h1>'+
    '<p class="mut" style="margin-bottom:16px">'+(up?'Gratis under betan, inget betalkort.':'Välkommen tillbaka.')+'</p>'+
    '<div class="tabs"><button id="a-in" class="'+(!up?'on':'')+'">Logga in</button><button id="a-up" class="'+(up?'on':'')+'">Skapa konto</button></div>'+
    '<div class="field"><label>E-post</label><input id="a-em" type="email" autocomplete="username"></div>'+
    (rs?'':'<div class="field"><label>Lösenord</label><input id="a-pw" type="password" autocomplete="current-password"></div>')+
    (rs?'':'<div class="hint" style="margin:2px 0 14px"><a href="#/reset">Glömt lösenordet?</a></div>')+
    '<button class="btn" id="a-go" style="width:100%">'+(rs?'Skicka återställningsmejl':up?'Skapa konto':'Logga in')+'</button>'+
    '<div id="a-msg" class="hint"></div></div></div>';
  document.getElementById('a-in').onclick=function(){location.hash='#/login';};
  document.getElementById('a-up').onclick=function(){location.hash='#/signup';};
  document.getElementById('a-go').onclick=function(){
    var em=document.getElementById('a-em').value.trim(),pw=document.getElementById('a-pw');
    if(!em)return toast('Fyll i e-post.',true);
    if(rs){
      sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname+'#/login'}).then(function(r){
        if(r.error)toast(r.error.message,true);else{toast('Kolla din inkorg.');location.hash='#/login';}
      });return;
    }
    if(!pw.value||pw.value.length<6)return toast('Lösenordet måste vara minst 6 tecken.',true);
    var btn=document.getElementById('a-go');btn.disabled=true;btn.textContent='Ett ögonblick…';
    var q=up?sb.auth.signUp({email:em,password:pw.value}):sb.auth.signInWithPassword({email:em,password:pw.value});
    q.then(function(r){
      btn.disabled=false;btn.textContent=up?'Skapa konto':'Logga in';
      if(r.error){toast(r.error.message,true);return;}
      if(r.data.session){OP_USER=r.data.user.id;OP_EMAIL=r.data.user.email||'';afterLogin();}
      else{document.getElementById('a-msg').textContent='Kolla din inkorg och bekräfta kontot, sen loggar du in.';toast('Bekräfta via mejl.');}
    });
  };
}

function afterLogin(){
  sb.from('op_profiles').select('*').eq('id',OP_USER).maybeSingle().then(function(r){
    if(r.error){toast('Kunde inte läsa din profil: '+r.error.message,true);}
    OP_PROFILE=r.data||null;
    if(!OP_PROFILE){
      sb.from('op_profiles').insert({id:OP_USER,email:OP_EMAIL}).then(function(ins){
        OP_PROFILE=ins.data;logEv('signup');location.hash='#/dashboard';route();
      });
    }else{location.hash='#/dashboard';route();}
  });
}
sb.auth.getSession().then(function(r){
  var s=r.data&&r.data.session;
  if(s){OP_USER=s.user.id;OP_EMAIL=s.user.email||'';afterLogin();}
  else route();
});
sb.auth.onAuthStateChange(function(ev,sess){
  if(ev==='SIGNED_IN'&&sess&&!OP_USER){OP_USER=sess.user.id;OP_EMAIL=sess.user.email||'';afterLogin();}
});

/* ---------- Onboarding ---------- */
function renderOnboarding(){
  root().innerHTML='<div class="onb"><div class="steplab">Steg 1 av 1</div><h1>En sista sak: din firma.</h1>'+
    '<p class="mut" style="margin:8px 0 18px">Det här hamnar på varje offert. Du kan ändra det när som helst.</p>'+
    '<div class="card"><div class="field"><label>Firmanamn</label><input id="ob-co" placeholder="Till exempel: Måleri i Haninge AB"></div>'+
    '<div class="row"><div class="field grow"><label>Telefon</label><input id="ob-ph" type="tel" placeholder="07X-XXX XX XX"></div>'+
    '<div class="field grow"><label>Org.nummer (valfritt)</label><input id="ob-org" placeholder="556XXX-XXXX"></div></div>'+
    '<button class="btn big" id="ob-go" style="width:100%">Kom igång</button></div></div>';
  document.getElementById('ob-go').onclick=function(){
    var co=document.getElementById('ob-co').value.trim();
    if(!co)return toast('Firmanamn behövs, det hamnar på offerten.',true);
    sb.from('op_profiles').update({company_name:co,phone:document.getElementById('ob-ph').value.trim(),
      org_no:document.getElementById('ob-org').value.trim(),onboarding_done:true}).eq('id',OP_USER).then(function(r){
      if(r.error)return toast('Kunde inte spara: '+r.error.message,true);
      OP_PROFILE.onboarding_done=true;logEv('onboarding_done');toast('Klart! Bygg din första offert.');
      location.hash='#/new';route();
    });
  };
}

/* ---------- Dashboard ---------- */
function offerTotal(o){
  var sum=(o.items||[]).reduce(function(a,it){return a+(Number(it.qty)||0)*(Number(it.price)||0);},0);
  var labour=(o.items||[]).filter(function(it){return it.unit==='tim';}).reduce(function(a,it){return a+(Number(it.qty)||0)*(Number(it.price)||0);},0);
  var rot=o.rot?labour*0.3:0;
  var vat=((sum-rot)*(Number(o.vat)||0)/100);
  return {sum:sum,rot:rot,vat:vat,total:sum-rot+vat};
}
function loadOffers(cb){
  if(OP_OFFERS)return cb(OP_OFFERS);
  root().innerHTML='<div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel"></div>';
  sb.from('op_offers').select('*').order('created_at',{ascending:false}).then(function(r){
    if(r.error){toast('Kunde inte hämta offerter: '+r.error.message,true);OP_OFFERS=[];}
    else OP_OFFERS=r.data;
    cb(OP_OFFERS);
  });
}
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
      '<div class="viewhead"><h1>Dashboard</h1><div style="margin-left:auto"><a class="btn" href="#/new">＋ Ny offert</a></div></div>'+
      '<div class="statrow">'+
      '<div class="card stat"><div class="lab">Offerter denna månad</div><div class="v">'+thisM.length+'</div></div>'+
      '<div class="card stat"><div class="lab">Accepterade (alla)</div><div class="v">'+acc.length+' <span class="mini mut">('+conv+'%)</span></div></div>'+
      '<div class="card stat"><div class="lab">Värde accepterat</div><div class="v">'+kr(accVal)+'</div></div>'+
      '<div class="card stat"><div class="lab">Pågår (skickat)</div><div class="v">'+kr(sentVal)+'</div></div>'+
      '</div>'+
      '<div class="row" style="margin:8px 0"><div class="grow"><input id="q" placeholder="Sök kund…"></div>'+
      '<div style="width:170px"><select id="f"><option value="">Alla status</option><option>utkast</option><option>skickad</option><option>accepterad</option><option>avslagen</option></select></div>'+
      '<div style="width:170px"><select id="s"><option value="ny">Nyaste först</option><option value="belopp">Belopp</option></select></div></div>'+
      (list.length?'<div class="tw"><table class="list"><thead><tr><th>Nr</th><th>Kund</th><th>Belopp</th><th>Status</th><th>Datum</th></tr></thead><tbody id="tb">'+rows+'</tbody></table></div>'
        :'<div class="empty"><b>Inga offerter än.</b><p style="margin-top:6px">Din första offert tar två minuter.</p><a class="btn" style="margin-top:14px" href="#/new">Bygg din första offert</a></div>');
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
      contact_email:document.getElementById('st-em').value.trim()}).eq('id',OP_USER).then(function(r){
      if(r.error)toast('Kunde inte spara: '+r.error.message,true);
      else{Object.assign(OP_PROFILE,{company_name:document.getElementById('st-co').value.trim()});toast('Sparat.');}
    });
  };
  document.getElementById('st-keysave').onclick=function(){
    try{localStorage.setItem('op_groq_key',document.getElementById('st-key').value.trim());}catch(e){}
    toast('Nyckel sparad på den här enheten.');
  };
  document.getElementById('st-out').onclick=doLogout;
}

/* ---------- Priser (inloggad vy) ---------- */
function renderPricing(){
  root().innerHTML='<h1>Priser</h1><p class="mut" style="margin-bottom:6px">Under betan är allt öppet och gratis, utan betalkort. Betalning kopplas in via Stripe innan lanseringen.</p>'+
    '<div class="pgrid">'+
    '<div class="card pcard"><h3>Free</h3><div class="pr">0 kr <small>/ månad</small></div><ul><li>3 offerter per månad</li><li>PDF och ROT-beräkning</li><li>Statusspårning</li></ul></div>'+
    '<div class="card pcard hl"><h3>Pro</h3><div class="pr">149 kr <small>/ månad</small></div><ul><li>Obegränsat antal offerter</li><li>AI-poster</li><li>All statistik</li></ul></div>'+
    '<div class="card pcard"><h3>Business</h3><div class="pr">299 kr <small>/ månad</small></div><ul><li>Flera användare i firman</li><li>Gemensam kundlista</li></ul></div></div>';
}
