// ---------- Min resa (Journey) ----------
const ACHIEVEMENTS = [
  {em:'🏋️', t:'Första passet', test:()=>db.workouts.length>=1},
  {em:'🔥', t:'10 dagars streak', test:()=>calcStreak()>=10},
  {em:'💪', t:'100 träningspass', test:()=>db.workouts.length>=100},
  {em:'📈', t:'Första PR:et', test:()=>db.records.length>=1},
  {em:'🎯', t:'Första målet klart', test:()=>db.goals.some(g=>g.status==='Completed')},
  {em:'📖', t:'50 journalanteckningar', test:()=>db.journal.length>=50},
  {em:'💭', t:'Första drömmen', test:()=>db.dreams.length>=1},
  {em:'🌱', t:'7 dagars habit-streak', test:()=>db.habits.some(h=>calcHabitStreak(h)>=7)},
];
function renderJourney(){
  const ev=[
    ...db.workouts.map(w=>({date:w.date, em:'🏋️', text:`Tränade: ${w.title}`})),
    ...db.goals.map(g=>({date:g.createdAt||g.deadline||new Date().toISOString(), em:'🎯', text:`Nytt mål: ${g.title}`})),
    ...db.goals.filter(g=>g.completedAt).map(g=>({date:g.completedAt, em:'✅', text:`Mål klart: ${g.title}`})),
    ...db.dreams.map(d=>({date:d.createdAt||new Date().toISOString(), em:'💭', text:`Ny dröm: ${d.title}`})),
    ...db.journal.map(j=>({date:j.date, em:'📖', text:`Journal: ${j.title}`})),
    ...db.photos.map(p=>({date:p.date, em:'📸', text:`Bild: ${p.title||p.category}`})),
    ...db.records.map(r=>({date:r.date, em:'🏆', text:`Nytt PR: ${r.name} ${r.value}`})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));

  const byYear={};
  ev.forEach(e=>{ const y=new Date(e.date).getFullYear(); (byYear[y]=byYear[y]||[]).push(e); });
  const years=Object.keys(byYear).sort((a,b)=>b-a);

  document.getElementById('view-journey').innerHTML=`
    <h1>Min resa</h1><div class="sub">Allt du byggt, samlat på en tidslinje.</div>
    <div class="badge-grid">${ACHIEVEMENTS.map(a=>{const on=a.test(); return `<div class="badge ${on?'':'locked'}"><span class="em">${a.em}</span><span class="t">${a.t}</span></div>`;}).join('')}</div>
    <div class="timeline">
      ${years.length? years.map(y=>`<div class="tl-year">${y}</div>${byYear[y].map(e=>`<div class="tl-item"><div class="tl-date">${fmtDate(e.date)}</div>${e.em} ${e.text}</div>`).join('')}`).join('')
      : `<div class="empty">Din resa börjar med din första post.</div>`}
    </div>
  `;
}

// ---------- Habits ----------
function calcHabitStreak(h){
  let streak=0, d=new Date();
  const days=new Set(h.checkins);
  while(days.has(todayStr(d))){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}
function renderHabits(){
  document.getElementById('view-habits').innerHTML=`
    <div class="rowbetween"><div><h1>Habits</h1><div class="sub">Kontinuitet bortom träningspasset.</div></div>
    <button class="btn" onclick="togglePanel('h-panel')">+ Ny habit</button></div>
    <form class="panel" id="h-panel" onsubmit="return addHabit(event)">
      <div class="field"><label>Namn</label><input id="h-name" required placeholder="t.ex. Läsning, Sömn, Stretching"></div>
      <div class="row"><button class="btn" type="submit">Skapa habit</button><button type="button" class="btn ghost" onclick="togglePanel('h-panel')">Avbryt</button></div>
    </form>
    <div id="h-list"></div>
  `;
  const today=todayStr();
  const list=document.getElementById('h-list');
  list.innerHTML = db.habits.length? db.habits.map(h=>{
    const doneToday=h.checkins.includes(today);
    const cells=[];
    for(let i=69;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); cells.push(h.checkins.includes(todayStr(d))); }
    return `<div class="habit-card">
      <div class="rowbetween">
        <div><div class="title">${esc(h.name)}</div><div class="meta">🔥 ${calcHabitStreak(h)} dagars streak</div></div>
        <div class="row"><button class="btn ${doneToday?'':'ghost'}" onclick="toggleHabitToday('${h.id}')">${doneToday?'✓ Klar idag':'Markera idag'}</button>
        <button class="btn ghost" onclick="deleteItem('habits','${h.id}')">✕</button></div>
      </div>
      <div class="heatmap">${cells.map(on=>`<div class="hm-cell ${on?'on':''}"></div>`).join('')}</div>
    </div>`;
  }).join('') : `<div class="empty">Inga habits ännu.<br><button class="btn" onclick="togglePanel('h-panel')">+ Skapa din första habit</button></div>`;
}
function addHabit(ev){
  ev.preventDefault();
  db.habits.push({id:uid(), name:document.getElementById('h-name').value, checkins:[]});
  save(); togglePanel('h-panel'); renderHabits(); toast('Habit skapad ✓');
  return false;
}
function toggleHabitToday(id){
  const h=db.habits.find(x=>x.id===id); const today=todayStr();
  const i=h.checkins.indexOf(today);
  if(i>-1) h.checkins.splice(i,1); else { h.checkins.push(today); toast('Bra jobbat 🔥'); }
  save(); renderHabits();
}

function buildCoachContext(){
  return {
    streak: calcStreak(),
    workouts: db.workouts.slice(-20).map(w=>({title:w.title,date:w.date,duration:w.duration,volume:(w.exercises||[]).reduce((s,e)=>s+(e.sets*e.reps*e.weight||0),0),exercises:(w.exercises||[]).map(e=>e.name)})),
    goals: db.goals.map(g=>({title:g.title,category:g.category,progress:g.progress,status:g.status,deadline:g.deadline})),
    dreams: db.dreams.map(d=>({title:d.title,why:d.why})),
    journal: db.journal.slice(-20).map(j=>({title:j.title,date:j.date,mood:j.mood,excerpt:(j.text||'').slice(0,140)})),
    records: db.records.map(r=>({name:r.name,value:r.value,date:r.date})),
    habits: db.habits.map(h=>({name:h.name,streak:calcHabitStreak(h)})),
  };
}
// ---------- AI Coach ----------
const AI_PROVIDERS={
  groq:{name:'Groq (gratis)',url:'https://api.groq.com/openai/v1/chat/completions',model:'llama-3.3-70b-versatile'},
  openrouter:{name:'OpenRouter (gratis-modeller)',url:'https://openrouter.ai/api/v1/chat/completions',model:'meta-llama/llama-3.3-70b-instruct:free'},
  openai:{name:'OpenAI',url:'https://api.openai.com/v1/chat/completions',model:'gpt-4o-mini'},
};
const AI_CFG_KEY='forward_ai_cfg_v1';
let coachTurns=[];
function getAICfg(){
  try{ return {provider:'groq',key:'',model:'',...(JSON.parse(localStorage.getItem(AI_CFG_KEY))||{})}; }
  catch(e){ return {provider:'groq',key:'',model:''}; }
}
function saveAICfgBtn(){
  const p=document.getElementById('ai-provider').value;
  const cfg={provider:p,key:document.getElementById('ai-key').value.trim(),model:document.getElementById('ai-model').value.trim()};
  localStorage.setItem(AI_CFG_KEY, JSON.stringify(cfg));
  renderSettings(); initSample(); toast('AI-inställningar sparade ✓');
}
function aiModelFieldDefault(){
  const sel=document.getElementById('ai-provider');
  if(!sel) return;
  document.getElementById('ai-model').placeholder = AI_PROVIDERS[sel.value].model;
}
function hasRealAI(){ const c=getAICfg(); return !!c.key || !!(window.claude&&window.claude.use); }
function localCoachAnswer(q){
  const t=(q||'').toLowerCase();
  const wks=[...db.workouts].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const now=new Date();
  const inLast=n=>wks.filter(w=>{const d=(now-new Date(w.date))/864e5; return d>=0&&d<n;});
  const vol=w=>(w.exercises||[]).reduce((s,e)=>s+(e.sets*e.reps*e.weight||0),0);
  const avg=arr=>arr.length?Math.round(arr.reduce((s,w)=>s+vol(w),0)/arr.length):0;
  const volThisWeek=avg(inLast(7)), volPrevWeek=avg(inLast(14).filter(w=>(now-new Date(w.date))/864e5>=7));
  const trend=volPrevWeek? Math.round((volThisWeek-volPrevWeek)/volPrevWeek*100) : null;
  const exCount={};
  wks.forEach(w=>(w.exercises||[]).forEach(e=>exCount[e.name]=(exCount[e.name]||0)+1));
  const topEx=Object.entries(exCount).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const streak=calcStreak();
  const goals=db.goals, active=goals.filter(g=>g.status!=='Completed');
  const habits=db.habits;
  const mentions=(...ws)=>ws.some(x=>t.includes(x));
  let out='';
  if(mentions('streak','konsekvent','konsekvens','varje dag','vane')){
    out='Din streak är '+streak+' dagar. ';
    out+= wks.length? ('Totalt '+wks.length+' pass loggade, '+inLast(7).length+' den senaste veckan.') : 'Du har inte loggat något pass än, börja med ett kort idag så får du igång den.';
    if(habits.length){ const hs=habits.map(h=>h.name+': '+calcHabitStreak(h)+' dagar').join(', '); out+=' Habits: '+hs+'.'; }
  } else if(mentions('volym','styrka','progress','tungt','utveckl')){
    out='Senaste veckans snittvolym är '+volThisWeek.toLocaleString('sv-SE')+' kg per pass';
    out+= trend===null? ' (ingen förra vecka att jämföra med än).' : (', det är '+(trend>=0?'+':'')+trend+'% mot veckan innan. ');
    if(topEx.length) out+='Mest tränat: '+topEx.map(p=>p[0]+' ('+p[1]+'g)').join(', ')+'.';
    if(db.records.length){ const r=db.records[db.records.length-1]; out+=' Senaste PR: '+r.name+' '+r.value+'.'; }
  } else if(mentions('mål','deadline')){
    if(!goals.length) out='Du har inga mål upplagga än. Lägg till ett under Mål så kan jag följa det.';
    else { out=active.length+' aktiva mål av '+goals.length+'. '; out+=active.slice(0,3).map(g=>g.title+' ligger på '+g.progress+'%').join(', ')+'.'; }
  } else if(mentions('pass','träna','träning','gym','övn')){
    out= wks.length? (wks.length+' pass loggade, '+inLast(7).length+' senaste veckan. Senast: '+wks[0].title+' ('+fmtDate(wks[0].date)+')'+(wks[0].notes?', dina anteckningar: ”'+wks[0].notes+'”':'')+'.')
      : 'Inga pass loggade än. Klicka på + Nytt pass under Träning så börjar grafen leva.';
  } else if(mentions('journal','känsla','mood','humör')){
    out= db.journal.length? (db.journal.length+' anteckningar. Senaste: ”'+(db.journal[db.journal.length-1].title||'')+'” ('+(db.journal[db.journal.length-1].mood||'')+').')
      : 'Inga journalanteckningar än. Att skriva av sig efter pass brukar hjälpa en se vad som faktiskt funkar.';
  } else {
    out='Jag kan hjälpa dig med den typen av fråga när en riktig AI-leverantör är ansluten. Just nu har appen ingen AI-anslutning aktiv, så jag vill inte låtsas kunna svara på allmänna frågor med en begränsad lokal analys. Gå till Inställningar → AI och anslut en API-nyckel.';
  }
  return out;
}
async function callProviderAPI(messages){
  const cfg=getAICfg();
  if(!cfg.key) throw {code:'no_key'};
  const p=AI_PROVIDERS[cfg.provider]||AI_PROVIDERS.groq;
  const headers={'Content-Type':'application/json','Authorization':'Bearer '+cfg.key};
  if(cfg.provider==='openrouter'){ headers['HTTP-Referer']='https://forward.local'; headers['X-Title']='FORWARD'; }
  const res=await fetch(p.url,{method:'POST',headers,body:JSON.stringify({model:cfg.model||p.model,messages,temperature:0.7,max_tokens:600})});
  if(!res.ok){
    let msg='HTTP '+res.status;
    try{ const j=await res.json(); msg=j.error&&j.error.message?j.error.message:msg; }catch(e){}
    throw {code:'api', text:msg};
  }
  const j=await res.json();
  return (j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||'';
}
async function getCoachReply(messages){
  if(window.claude&&window.claude.use){
    try{
      const sampleFn=await window.claude.use('sample');
      if(sampleFn){ const r=await sampleFn(messages,{modelTier:'default',cache:false}); return {text:r.text}; }
    }catch(e){}
  }
  const cfg=getAICfg();
  if(cfg.key){
    try{ return {text:await callProviderAPI(messages)}; }
    catch(e){ return {text:null,err:e}; }
  }
  const last=[...messages].reverse().find(x=>x.role==='user');
  return {text:localCoachAnswer(last?last.content:''),badge:'local'};
}
function renderCoachShell(){
  document.getElementById('view-coach').innerHTML = `
    <h1>AI Coach</h1><div class="sub">Fråga vad du vill. Om allt.</div>
    <div id="coach-note" class="label" style="margin:12px 0;"></div>
    <div id="coach-msgs" style="display:flex;flex-direction:column;gap:10px;margin:16px 0;max-width:640px;"></div>
    <div class="row" style="max-width:640px;">
      <input id="coach-input" placeholder="Fråga vad som helst..." style="flex:1;background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:11px 14px;">
      <button class="btn" id="coach-send" onclick="askCoach()">Fråga</button>
      <button class="btn ghost" onclick="askFo()">Fråga Fo</button>
    </div>
  `;
  document.getElementById('coach-input').addEventListener('keydown', e=>{ if(e.key==='Enter') askCoach(); });
  initSample();
}
function coachMsg(role, text){
  const wrap=document.getElementById('coach-msgs');
  const div=document.createElement('div');
  div.style.cssText = role==='user'
    ? 'align-self:flex-end;background:var(--accent-dim);padding:10px 14px;border-radius:14px 14px 2px 14px;max-width:85%;white-space:pre-wrap;'
    : 'align-self:flex-start;background:var(--card2);padding:10px 14px;border-radius:14px 14px 14px 2px;max-width:85%;white-space:pre-wrap;';
  div.textContent=text;
  wrap.appendChild(div); div.scrollIntoView({block:'nearest'});
  return div;
}
async function initSample(){
  const note=document.getElementById('coach-note');
  if(!note) return;
  const cfg=getAICfg();
  if(window.claude&&window.claude.use){ note.textContent='Svarar via claude.ai.'; return; }
  if(cfg.key){ note.textContent='Svarar via '+((AI_PROVIDERS[cfg.provider]||AI_PROVIDERS.groq).name)+'.'; return; }
  note.textContent='AI Coach är redo. För fullständiga svar på alla typer av frågor, anslut en AI-leverantör under Inställningar.';
}
function askFo(){
  const inp=document.getElementById('coach-input');
  const q=(inp&&inp.value.trim()) || 'Hur har min träning och utveckling gått nyligen? Ge mig en status och vad jag bör fokusera på här näst.';
  const pkg = 'Jag loggar min träning i min app FORWARD. Här är min fråga och min loggade data som JSON.\n\nFRÅGA: '+q+'\n\nMIN DATA:\n'+JSON.stringify(buildCoachContext());
  const done=()=>{ window.open('https://wajo.ai/','_blank'); toast('Kopierat! Klistra in i chatten med Fo.'); };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(pkg).then(done).catch(()=>{ fallbackCopy(pkg); done(); }); }
  else { fallbackCopy(pkg); done(); }
}
function fallbackCopy(text){
  const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove();
}
async function askCoach(){
  const inp=document.getElementById('coach-input'); const q=inp.value.trim(); if(!q) return;
  inp.value=''; const sendBtn=document.getElementById('coach-send'); sendBtn.disabled=true;
  coachMsg('user', q);
  const thinking=coachMsg('assistant','Tänker...');
  coachTurns.push({role:'user',content:q});
  const RULES = 'Du är FORWARD AI – en allmän AI-assistent inbyggd i appen FORWARD. Du ska kunna hjälpa användaren med nästan vilken fråga som helst: allmän kunskap, teknik, datorer, telefoner, träning, kost, sömn, studier, matematik, ekonomi, planering, skrivande, idéer, programmering, vardagsfrågor och andra ämnen.\n\nVIKTIGT: Svara på själva frågan även när den inte handlar om träning. Begränsa aldrig svaret till FORWARD-appen bara för att frågan ställs här. Om du inte vet eller saknar aktuell information, säg det tydligt i stället för att hitta på. För frågor som kräver aktuella uppgifter ska du vara tydlig med att du behöver aktuell information. För frågor om användarens egen träning, mål, habits, journal och historik ska du använda datan nedan och anpassa svaret personligt.\n\nSvara normalt och direkt. Ge en tydlig förklaring när det behövs och konkreta steg när användaren frågar hur man gör något. Svara på samma språk som användaren. Använd svenska när användaren skriver svenska.\n\nAnvändarens loggade data i FORWARD (JSON):\n'+JSON.stringify(buildCoachContext());
  const messages=[{role:'system',content:RULES},...coachTurns];
  try{
    const reply=await getCoachReply(messages);
    if(reply.text){ thinking.textContent=reply.text; coachTurns.push({role:'assistant',content:reply.text}); }
    else {
      const map={no_key:'Ingen API-nyckel sparad — lägg till en gratis nyckel under Inställningar.', api:'API:t svarade med fel', rate_limited:'För många frågor just nu — försök igen om en stund.', refused:'Kunde inte svara på det. Prova att omformulera frågan.', session_expired:'Du behöver logga in igen på claude.ai.'};
      let msg = reply.err ? ((map[reply.err.code]||reply.err.text||map.api)+(reply.err.code==='api'?': '+reply.err.text:'')) : 'Något gick fel. Försök igen.';
      thinking.textContent=msg+'\n\n(Lokal analys: '+localCoachAnswer(q)+')';
      coachTurns.pop();
    }
  }catch(e){
    thinking.textContent='Något gick fel. Försök igen.';
    coachTurns.pop();
  } finally {
    sendBtn.disabled=false;
  }
}


// ---------- Program ----------
let progEx=[];
function renderProgram(){
  document.getElementById('view-program').innerHTML=`
    <div class="rowbetween"><div><h1>Program</h1><div class="sub">Spara dina träningsprogram och starta ett pass med ett klick.</div></div>
    <button class="btn" onclick="togglePanel('pg-panel')">+ Nytt program</button></div>
    <form class="panel" id="pg-panel" onsubmit="return saveProgram(event)">
      <div class="field"><label>Namn</label><input id="pg-name" required placeholder="t.ex. Push A, Ben-tung"></div>
      <div class="row">
        <input id="pg-ex-name" placeholder="Övning" style="flex:2;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;">
        <input id="pg-ex-sets" type="number" placeholder="Set" style="width:70px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;">
        <input id="pg-ex-reps" type="number" placeholder="Reps" style="width:70px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;">
        <input id="pg-ex-weight" type="number" placeholder="Kg" style="width:70px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;">
        <button type="button" class="btn ghost" onclick="addProgEx()">Lägg till övning</button>
      </div>
      <div id="pg-ex-list" style="margin-top:10px;"></div>
      <div class="row" style="margin-top:12px;"><button class="btn" type="submit">Spara program</button><button type="button" class="btn ghost" onclick="togglePanel('pg-panel')">Avbryt</button></div>
    </form>
    <div id="pg-list"></div>`;
  renderProgEx();
  const list=document.getElementById('pg-list');
  list.innerHTML = db.programs.length? db.programs.map(p=>`
    <div class="list-item">
      <div class="rowbetween"><div class="title">${esc(p.name)}</div>
      <div class="row">
        <button class="btn" onclick="startProgram('${p.id}')">▶ Starta pass</button>
        <button class="btn ghost" onclick="deleteItem('programs','${p.id}')">Ta bort</button>
      </div></div>
      ${(p.exercises||[]).length? `<div style="margin-top:8px;">${p.exercises.map(e=>`<span class="tag">${esc(e.name)}: ${e.sets}×${e.reps} @ ${e.weight}kg</span>`).join('')}</div>`:''}
    </div>`).join('') : `<div class="empty">Inga program ännu.<br><button class="btn" onclick="togglePanel('pg-panel')">+ Skapa ditt första program</button></div>`;
}
function addProgEx(){
  const name=document.getElementById('pg-ex-name').value.trim();
  if(!name) return;
  progEx.push({name,sets:+document.getElementById('pg-ex-sets').value||0,reps:+document.getElementById('pg-ex-reps').value||0,weight:+document.getElementById('pg-ex-weight').value||0});
  ['pg-ex-name','pg-ex-sets','pg-ex-reps','pg-ex-weight'].forEach(id=>document.getElementById(id).value='');
  renderProgEx();
}
function renderProgEx(){
  const el=document.getElementById('pg-ex-list'); if(!el) return;
  el.innerHTML = progEx.map((e,i)=>`<span class="tag">${esc(e.name)}: ${e.sets}×${e.reps} @ ${e.weight}kg <a href="#" onclick="progEx.splice(${i},1);renderProgEx();return false;" style="color:var(--danger);">✕</a></span>`).join(' ');
}
function saveProgram(ev){
  ev.preventDefault();
  db.programs.push({id:uid(),name:document.getElementById('pg-name').value,exercises:progEx,createdAt:new Date().toISOString()});
  progEx=[]; save(); togglePanel('pg-panel'); renderProgram(); toast('Program sparat ✓');
  return false;
}
function startProgram(id){
  const p=db.programs.find(x=>x.id===id); if(!p) return;
  exBuffer=(p.exercises||[]).map(e=>({...e}));
  setView('training');
  setTimeout(()=>{
    const panel=document.getElementById('w-panel'); if(panel && !panel.classList.contains('open')) panel.classList.add('open');
    const t=document.getElementById('w-title'); if(t) t.value=p.name;
  },40);
  toast('Programmet laddat — spara passet när du är klar ✓');
}

// ---------- Kropp ----------
function renderBody(){
  document.getElementById('view-body').innerHTML=`
    <div class="rowbetween"><div><h1>Kropp</h1><div class="sub">Logga vikten och se trenden över tid.</div></div></div>
    <form class="panel open" onsubmit="return addBodyEntry(event)" style="margin-top:14px;">
      <div class="fieldrow">
        <div class="field"><label>Datum</label><input id="b-date" type="date" required value="${todayStr()}"></div>
        <div class="field"><label>Vikt (kg)</label><input id="b-weight" type="number" step="0.1" min="0" required placeholder="t.ex. 72.4"></div>
      </div>
      <div class="field"><label>Anteckning</label><input id="b-note" placeholder="valfritt"></div>
      <div class="row"><button class="btn" type="submit">Logga vikt</button></div>
    </form>
    <div class="card" id="body-chart"></div>
    <div id="b-list"></div>`;
  const el=document.getElementById('body-chart');
  const pts=[...db.body].sort((a,b)=>a.date<b.date?-1:1);
  if(pts.length<2){ el.innerHTML='<h3>Viktgraf</h3><div class="label" style="margin-top:10px;">Logga minst två vägningar för att se grafen.</div>'; }
  else{
    const W=560,H=150,P=26;
    const ws=pts.map(p=>+p.weight);
    let mn=Math.min(...ws), mx=Math.max(...ws);
    if(mx-mn<1){ mx=mx+0.5; mn=Math.max(0,mn-0.5); }
    const X=i=>P+i*(W-2*P)/(pts.length-1);
    const Y=v=>P+(mx-v)*(H-2*P)/(mx-mn);
    const poly=pts.map((p,i)=>X(i).toFixed(1)+','+Y(+p.weight).toFixed(1)).join(' ');
    el.innerHTML=`<h3>Viktgraf</h3>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin-top:10px;">
        <polyline points="${poly}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${pts.map((p,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(+p.weight).toFixed(1)}" r="3.5" fill="var(--grad2)"/>`).join('')}
      </svg>
      <div class="rowbetween" style="margin-top:8px;"><span class="label">${pts[0].date}: ${pts[0].weight} kg</span><span class="label">${pts[pts.length-1].date}: ${pts[pts.length-1].weight} kg</span></div>`;
  }
  const list=document.getElementById('b-list');
  const items=[...db.body].sort((a,b)=>b.date<a.date?-1:1);
  list.innerHTML = items.length? items.map(e=>`
    <div class="list-item"><div class="rowbetween"><div><span class="title">${e.weight} kg</span> <span class="label">· ${fmtDate(e.date)}</span></div>
    <button class="btn ghost" onclick="deleteItem('body','${e.id}')">Ta bort</button></div>
    ${e.note?`<div class="meta" style="margin-top:4px;">${esc(e.note)}</div>`:''}</div>`).join('') : `<div class="empty">Inga vägningar loggade än.</div>`;
}
function addBodyEntry(ev){
  ev.preventDefault();
  db.body.push({id:uid(),date:document.getElementById('b-date').value,weight:+document.getElementById('b-weight').value,note:document.getElementById('b-note').value});
  save(); renderBody(); renderDashboard(); toast('Vikt loggad ✓');
  return false;
}

// ---------- Statistik extra ----------
function renderStatsExtra(){
  const host=document.getElementById('view-stats');
  let el=document.getElementById('stats-extra');
  if(!el){ el=document.createElement('div'); el.id='stats-extra'; host.appendChild(el); }
  const now=new Date();
  const weeks=[];
  for(let i=7;i>=0;i--){
    const end=new Date(now); end.setDate(end.getDate()-7*i);
    const start=new Date(end); start.setDate(start.getDate()-7);
    const vol=db.workouts.filter(w=>{const d=new Date(w.date); return d>start&&d<=end;}).reduce((s,w)=>s+(w.exercises||[]).reduce((a,e)=>a+(e.sets*e.reps*e.weight||0),0),0);
    weeks.push(vol);
  }
  const mx=Math.max(...weeks,1);
  el.innerHTML=`
    <div class="grid2">
      <div class="card">
        <h3>Volym per vecka</h3>
        <div class="wchart">${weeks.map(v=>`<div class="col" style="height:${Math.max(4,Math.round(v/mx*100))}%" title="${v.toLocaleString('sv-SE')} kg"></div>`).join('')}</div>
        <div class="rowbetween" style="margin-top:8px;"><span class="label">8 veckor bakåt</span><span class="label">Denna vecka: ${weeks[7].toLocaleString('sv-SE')} kg</span></div>
      </div>
      <div class="card">
        <h3>1RM-kalkylator</h3>
        <div class="sub" style="margin-bottom:10px;">Uppskatta ditt max utifrån ett tungt set (Epley).</div>
        <div class="row">
          <input id="rm-weight" type="number" min="0" placeholder="Vikt (kg)" style="width:110px;">
          <input id="rm-reps" type="number" min="1" placeholder="Reps" style="width:80px;">
          <button class="btn" onclick="calc1RM()">Räkna</button>
        </div>
        <div id="rm-out" style="margin-top:12px;"></div>
      </div>
    </div>`;
}
function calc1RM(){
  const w=+document.getElementById('rm-weight').value, r=+document.getElementById('rm-reps').value;
  if(!w||!r){ toast('Fyll i vikt och reps.'); return; }
  const rm=w*(1+r/30);
  const rows=[100,95,90,85,80,75,70];
  document.getElementById('rm-out').innerHTML = `<div class="big" style="font-size:1.7rem;">${Math.round(rm)} kg</div>` +
    rows.map(p=>`<div class="rowbetween" style="padding:4px 0;"><span class="label">${p}% · ${p===100?'max':Math.round(r*p/100)+' reps'}</span><span>${Math.round(rm*p/100)} kg</span></div>`).join('');
}

// ---------- Vilotimer ----------
let restTimer=null, restLeft=0;
function restShow(show){
  let chip=document.getElementById('rest-chip');
  if(!chip){
    document.body.insertAdjacentHTML('beforeend', `<div id="rest-chip">
      <div class="row" style="gap:8px;flex-wrap:nowrap;">
        <b id="rest-display" style="font-size:1.15rem;min-width:52px;text-align:center;">0:00</b>
        <input id="rest-min" type="number" min="0" max="30" value="2" style="width:56px;" title="minuter">
        <button class="btn" onclick="restStart()" style="padding:7px 12px;">Start</button>
        <button class="btn ghost" onclick="restStop()" style="padding:7px 12px;">Nollställ</button>
        <button class="btn ghost" onclick="document.getElementById('rest-chip').classList.remove('show')" style="padding:7px 12px;">✕</button>
      </div>
      <div class="label" style="margin-top:4px;">Vilotimer</div>
    </div>`);
    chip=document.getElementById('rest-chip');
  }
  chip.classList.toggle('show', !!show);
}
function restStart(){
  restShow(true);
  const m=+document.getElementById('rest-min').value||0;
  restLeft=m*60; if(restLeft<=0) restLeft=120;
  if(restTimer) clearInterval(restTimer);
  restTimer=setInterval(restTick,1000); restTick();
}
function restTick(){
  const el=document.getElementById('rest-display');
  if(el) el.textContent = Math.floor(Math.max(0,restLeft)/60)+':'+String(Math.max(0,restLeft)%60).padStart(2,'0');
  if(restLeft<=0){ if(restTimer) clearInterval(restTimer); restTimer=null; toast('Vilan klar, kör vidare 💪'); return; }
  restLeft--;
}
function restStop(){
  if(restTimer) clearInterval(restTimer); restTimer=null; restLeft=0;
  const el=document.getElementById('rest-display'); if(el) el.textContent='0:00';
}

// ---------- Shared ----------
function togglePanel(id){ document.getElementById(id).classList.toggle('open'); }
function deleteItem(coll,id){ db[coll]=db[coll].filter(x=>x.id!==id); save(); renderAll(); }
function renderAll(){ renderDashboard(); renderJourney(); renderTraining(); renderSchema(); renderGoals(); renderHabits(); renderDreams(); renderJournal(); renderGallery(); renderStats(); renderStatsExtra(); renderSettings(); renderProgram(); renderBody(); }

document.documentElement.dataset.theme = db.theme==='light' ? 'light' : 'dark';
renderCoachShell();
initSample();
restShow(false);
setView('dashboard');
document.querySelector('.navlink[data-view="dashboard"]')?.classList.add('active');

// ---------- Installera som app / hemskärmsikon ----------
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredInstallPrompt=e;
  const b=document.getElementById('install-app'); if(b) b.style.display='inline-flex';
});
const installBtn=document.getElementById('install-app');
if(installBtn) installBtn.addEventListener('click',async()=>{
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null; installBtn.style.display='none';
  }else{
    alert('På iPhone/iPad: tryck på Dela i Safari och välj ”Lägg till på hemskärmen”. På Mac/Chrome: välj installera-ikonen i adressfältet om den visas.');
  }
});
window.addEventListener('appinstalled',()=>{ if(installBtn) installBtn.style.display='none'; });

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
