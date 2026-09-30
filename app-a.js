const NAV=[
  {id:'dashboard',label:'Dashboard',icon:'M3 12l9-9 9 9M5 10v10h14V10'},
  {id:'coach',label:'AI Coach',icon:'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z'},
  {id:'journey',label:'Min resa',icon:'M3 12h4l3-9 4 18 3-9h4'},
  {id:'training',label:'Träning',icon:'M6 6l12 12M18 6L6 18'},
  {id:'schema',label:'Gym schema',icon:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z'},
  {id:'goals',label:'Mål',icon:'M12 2v20M2 12h20'},
  {id:'habits',label:'Habits',icon:'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'},
  {id:'program',label:'Program',icon:'M4 6h16M4 12h16M4 18h10'},
  {id:'body',label:'Kropp',icon:'M12 3v18M5 8l7-5 7 5'},
  {id:'dreams',label:'Drömmar',icon:'M12 21s-8-5-8-11a8 8 0 0116 0c0 6-8 11-8 11z'},
  {id:'journal',label:'Journal',icon:'M4 4h16v16H4z'},
  {id:'gallery',label:'Galleri',icon:'M3 3h18v18H3zM3 15l5-5 4 4 5-5 4 4'},
  {id:'stats',label:'Statistik',icon:'M4 20V10M12 20V4M20 20v-7'},
];
function icon(d){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;}
document.getElementById('navlinks').innerHTML = NAV.map(n=>`<button class="navlink" data-view="${n.id}">${icon(n.icon)}${n.label}</button>`).join('');
document.getElementById('bottomnav').innerHTML = NAV.map(n=>`<button class="navlink" data-view="${n.id}">${icon(n.icon)}${n.label}</button>`).join('') + `<button class="navlink" data-view="settings">${icon('M12 15a3 3 0 100-6 3 3 0 000 6z')}Inst.</button>`;

// ---------- Data ----------
const DB_KEY='forward_app_data_v1';
function loadDB(){
  try{ const d=JSON.parse(localStorage.getItem(DB_KEY)) || {}; return {workouts:[],trainingDays:[],goals:[],dreams:[],journal:[],photos:[],records:[],habits:[],body:[],programs:[],theme:'dark',...d}; }
  catch(e){ return {workouts:[],trainingDays:[],goals:[],dreams:[],journal:[],photos:[],records:[],habits:[],body:[],programs:[],theme:'dark'}; }
}
let db = loadDB();
let saveTimer=null;
function save(){
  try{
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    localStorage.setItem(DB_KEY+'_saved_at', new Date().toISOString());
  }catch(e){
    console.error('Storage error',e);
    toast('Kunde inte spara automatiskt — lagringsutrymmet kan vara fullt.');
  }
}
function autoSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(save,120); }
window.addEventListener('beforeunload',save);
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') save(); });
setInterval(save,30000);
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function fmtDate(d){ return new Date(d).toLocaleDateString('sv-SE',{day:'numeric',month:'long',year:'numeric'}); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayStr(d){ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function quickAdd(view,panel){ setView(view); togglePanel(panel); }
function readImageCompressed(file, cb){
  const r=new FileReader();
  r.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const MAX=1200; let w=img.width,h=img.height;
      if(w>MAX||h>MAX){ const k=MAX/Math.max(w,h); w=Math.round(w*k); h=Math.round(h*k); }
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      cb(c.toDataURL('image/jpeg',0.82));
    };
    img.onerror=()=>cb(r.result);
    img.src=r.result;
  };
  r.readAsDataURL(file);
}

// ---------- Nav ----------
function setView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  document.querySelectorAll('.navlink').forEach(b=>b.classList.toggle('active', b.dataset.view===id));
  renderAll();
  window.scrollTo(0,0);
}
document.querySelectorAll('.navlink').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

// ---------- Dashboard ----------
function renderDashboard(){
  const h=new Date().getHours();
  const greet = h<5?'Du är uppe sent':h<12?'God morgon':h<18?'God eftermiddag':'God kväll';
  const totalVol = w => (w.exercises||[]).reduce((s,e)=>s+(e.sets*e.reps*e.weight||0),0);
  const streak = calcStreak();
  const last = [...db.workouts].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
  const activeGoals = db.goals.filter(g=>g.status!=='Completed');
  const recentPhotos = [...db.photos].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);
  const recentPR = [...db.records].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
  const isFirstRun = !db.workouts.length && !db.goals.length && !db.habits.length && !db.journal.length && !db.photos.length && !db.records.length && !db.dreams.length && !localStorage.getItem('forward_seen_v1');
  if(isFirstRun) localStorage.setItem('forward_seen_v1','1');

  // 7-day activity
  const days=[]; const dayLbl=['S','M','T','O','T','F','L'];
  let onCount=0;
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const key=todayStr(d);
     const has = (db.trainingDays||[]).includes(key) || db.workouts.some(w=>new Date(w.date).toDateString()===d.toDateString());
    if(has) onCount++;
    days.push({lbl:dayLbl[d.getDay()], on:has});
  }
  const consistency = Math.round((onCount/7)*100);
  const R=42, C=2*Math.PI*R, offset=C-(consistency/100)*C;

  document.getElementById('view-dashboard').innerHTML = `
    <div class="date">${fmtDate(new Date())}</div>
    <h1 style="font-size:2.1rem;">${greet}<span style="color:var(--accent);">.</span></h1>
    <div class="sub">Bygg personen du vill bli, en dag i taget.</div>
    ${isFirstRun? `
    <div class="card" style="margin-top:18px; border-color:rgba(124,131,255,.35);">
      <h3>Välkommen till FORWARD</h3>
      <div class="sub" style="margin-bottom:14px;">Börja med ett av dessa, allt sparas bara i din webbläsare:</div>
      <div class="row">
        <button class="btn" onclick="quickAdd('training','w-panel')">Logga ditt första pass</button>
        <button class="btn ghost" onclick="quickAdd('goals','g-panel')">Sätt ett mål</button>
        <button class="btn ghost" onclick="quickAdd('habits','h-panel')">Skapa en habit</button>
      </div>
    </div>`:''}

    <div class="grid" style="grid-template-columns:1.3fr 1fr; margin-top:24px;">
      <div class="card hero-card">
        <h3>Veckans aktivitet</h3>
        <div class="weekbars">${days.map(d=>`<div class="bar"><div class="stick ${d.on?'on':''}" style="height:${d.on?'100%':'14%'}"></div><div class="lbl">${d.lbl}</div></div>`).join('')}</div>
        <div class="rowbetween" style="margin-top:18px;">
          <div><div class="big" style="font-size:1.6rem;">${streak} <span style="font-size:.9rem;color:var(--text3);">dagars streak 🔥</span></div>
          <div class="label" style="margin-top:2px;">${last? `Senast: ${esc(last.title)}, ${fmtDate(last.date)}`:'Inget pass loggat än'}</div></div>
        </div>
      </div>
      <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
        <svg width="110" height="110" class="ring"><circle cx="55" cy="55" r="${R}" stroke="var(--card2)" stroke-width="9"/><circle cx="55" cy="55" r="${R}" stroke="var(--accent)" stroke-width="9" stroke-dasharray="${C}" stroke-dashoffset="${offset}"/></svg>
        <div class="big" style="margin-top:-72px;">${consistency}%</div>
        <div class="label" style="margin-top:66px;">Konsistens denna vecka</div>
      </div>
    </div>

    <div class="card locked-card">
      <div class="rowbetween">
        <div><h3 style="margin-bottom:4px;">LOCKED IN</h3><div class="sub">Kryssa bara i dagen när du har tränat. Enkelt, snabbt och sparas automatiskt.</div></div>
        <span class="pr-badge">${onCount}/7 denna vecka</span>
      </div>
      <div class="lock-week">
        ${days.map((d,i)=>{ const dt=new Date(); dt.setDate(dt.getDate()-(6-i)); const key=todayStr(dt); const checked=(db.trainingDays||[]).includes(key) || db.workouts.some(w=>new Date(w.date).toDateString()===dt.toDateString()); return `<button type="button" class="lock-day ${checked?'locked':''}" onclick="toggleTrainingDay('${key}')" aria-label="${fmtDate(dt)} ${checked?'tränad':'inte tränad'}"><span class="lock-check">${checked?'✓':'○'}</span><span class="lock-label">${d.lbl}</span><span class="lock-date">${dt.getDate()}</span></button>`; }).join('')}
      </div>
      <div class="locked-hint">✓ = locked in · Klicka igen för att ta bort.</div>
    </div>

    <div class="grid" style="margin-top:16px;">
      <div class="card"><div class="icobox">${icon('M6 6l12 12M18 6L6 18')}</div><h3>Aktiva mål</h3><div class="big">${activeGoals.length}</div></div>
      <div class="card"><div class="icobox">${icon('M4 4h16v16H4z')}</div><h3>Journal</h3><div class="big">${db.journal.length}</div></div>
      <div class="card"><div class="icobox">${icon('M12 2v20M2 12h20')}</div><h3>Volym senaste pass</h3><div class="big">${last?totalVol(last).toLocaleString('sv-SE'):0}<span style="font-size:.9rem;color:var(--text3);"> kg</span></div></div>
      <div class="card"><div class="icobox">${icon('M12 21s-8-5-8-11a8 8 0 0116 0c0 6-8 11-8 11z')}</div><h3>Drömmar</h3><div class="big">${db.dreams.length}</div></div>
    </div>

    <div class="grid" style="margin-top:16px;">
      <div class="card"><div class="icobox">${icon('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z')}</div><h3>Tränade dagar totalt</h3><div class="big">${trainedDaysSet().size}</div><div class="label">Alla dagar du kryssat i, sen du började</div></div>
      <div class="card" style="cursor:pointer;" onclick="setView('schema')"><div class="icobox">${icon('M6 6l12 12M18 6L6 18')}</div><h3>Schemat idag</h3><div class="big" style="font-size:1.3rem;">${schemaDayLabel()}</div><div class="label">Klicka för att öppna gym-schemat</div></div>
    </div>

    <div class="grid" style="margin-top:16px;">
      <div class="card" style="grid-column:span 2;">
        <div class="rowbetween"><h3 style="margin-bottom:12px;">Mål i fokus</h3>${recentPR?`<span class="pr-badge">🏆 Nytt PR: ${esc(recentPR.name)} ${esc(recentPR.value)}</span>`:''}</div>
        ${activeGoals.slice(0,3).map(g=>`<div style="margin-bottom:12px;"><div class="rowbetween"><span>${esc(g.title)}</span><span class="label">${g.progress}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${g.progress}%"></div></div></div>`).join('') || `<div class="label">Inga mål ännu.</div>`}
      </div>
      <div class="card" style="grid-column:span 2;">
        <h3>Senaste bilder</h3>
        ${recentPhotos.length? `<div class="imgrid">${recentPhotos.map(p=>`<div class="imgcard" onclick="openLightbox('${p.id}')"><img src="${p.image}"></div>`).join('')}</div>` : `<div class="label">Inga bilder uppladdade än.</div>`}
      </div>
    </div>
  `;
}
function calcStreak(){
  const days = new Set([...(db.trainingDays||[]), ...db.workouts.map(w=>todayStr(new Date(w.date)))]);
  let streak=0, d=new Date();
  while(days.has(todayStr(d))){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}

function toggleTrainingDay(key){
  db.trainingDays=db.trainingDays||[];
  const i=db.trainingDays.indexOf(key);
  if(i>=0){ db.trainingDays.splice(i,1); toast('Dagen avmarkerad'); }
  else { db.trainingDays.push(key); toast('LOCKED IN 🔒'); }
  save(); renderDashboard(); if(document.getElementById('view-training')?.classList.contains('active')) renderTraining();
}

// ---------- Kalender + Gym schema ----------
function trainedDaysSet(){
  return new Set([...(db.trainingDays||[]), ...db.workouts.map(w=>todayStr(new Date(w.date)))]);
}
function schemaDayLabel(){
  const days=['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];
  const i=(new Date().getDay()+6)%7;
  const v=(db.schema||[])[i];
  return v? v : 'Inget planerat';
}
let calY=new Date().getFullYear(), calM=new Date().getMonth();
function calShift(n){
  calM+=n;
  if(calM<0){calM=11;calY--;}
  if(calM>11){calM=0;calY++;}
  renderTraining();
}
function calCells(){
  const set=trainedDaysSet();
  const today=new Date();
  const firstDow=(new Date(calY,calM,1).getDay()+6)%7; // måndag först
  const dim=new Date(calY,calM+1,0).getDate();
  const now=new Date();
  let cells='';
  for(let b=0;b<firstDow;b++) cells+='<div></div>';
  for(let d=1;d<=dim;d++){
    const key=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const on=set.has(key);
    const isToday=now.getFullYear()===calY&&now.getMonth()===calM&&now.getDate()===d;
    cells+=`<button type="button" class="cal-d ${on?'on':''} ${isToday?'today':''}" onclick="toggleTrainingDay('${key}')" aria-label="${d} ${on?'tränad':'inte tränad'}">${d}${on?' ✓':''}</button>`;
  }
  return cells;
}
function calTitle(){
  return new Date(calY,calM,1).toLocaleDateString('sv-SE',{month:'long',year:'numeric'});
}
function renderSchema(){
  const days=['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];
  const todayIdx=(new Date().getDay()+6)%7;
  const rows=days.map((d,i)=>{
    const val=(db.schema||[])[i]||'';
    const today=i===todayIdx;
    return `<div class="list-item" style="${today?'border-color:var(--accent);':''}">
      <div class="rowbetween"><div class="title">${d}</div>${today?'<span class="pr-badge">idag</span>':''}</div>
      <input value="${esc(val)}" placeholder="t.ex. Vila, Push: bänk, axlar, triceps" onchange="saveSchemaDay(${i},this.value)" style="margin-top:8px;width:100%;background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--text);">
    </div>`;
  }).join('');
  document.getElementById('view-schema').innerHTML=`
    <h1>Gym schema</h1>
    <div class="sub">Planera veckan. Skriv vad du ska träna varje dag, det sparas automatiskt.</div>
    <div class="grid" style="margin-top:18px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));">${rows}</div>
    <div class="locked-hint" style="margin-top:12px;">Dagens rad är grönmarkad. Ändra i fältet, det sparas när du klickar utanför.</div>`;
}
function saveSchemaDay(i,v){
  db.schema=db.schema||[];
  db.schema[i]=v.trim();
  save();
  toast('Schema sparat ✓');
}
