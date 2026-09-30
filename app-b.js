// ---------- Training ----------
let exBuffer=[];
function renderTraining(){
  document.getElementById('view-training').innerHTML=`
    <div class="rowbetween"><div><h1>Träning</h1><div class="sub">Logga dina pass och följ din utveckling.</div></div>
    <button class="btn" onclick="togglePanel('w-panel')">+ Nytt pass</button></div>
    <form class="panel" id="w-panel" onsubmit="return addWorkout(event)">
      <div class="fieldrow">
        <div class="field"><label>Namn</label><input id="w-title" required placeholder="t.ex. Push, Legs, Football"></div>
        <div class="field"><label>Datum</label><input id="w-date" type="date" required value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="field"><label>Varaktighet (min)</label><input id="w-dur" type="number" min="0"></div>
      <div class="field"><label>Anteckning</label><textarea id="w-notes" placeholder="Hur kändes passet?"></textarea></div>
      <div id="ex-list"></div>
      <div class="row"><input id="ex-name" placeholder="Övning" style="flex:2;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;">
        <input id="ex-sets" type="number" placeholder="Set" style="width:70px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;">
        <input id="ex-reps" type="number" placeholder="Reps" style="width:70px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;">
        <input id="ex-weight" type="number" placeholder="Kg" style="width:70px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;">
        <button type="button" class="btn ghost" onclick="addExRow()">Lägg till övning</button></div>
      <div class="row"><button class="btn" type="submit">Spara pass</button><button type="button" class="btn ghost" onclick="togglePanel('w-panel')">Avbryt</button></div>
    </form>
    <div id="w-list"></div>
  `;
  renderExBuffer();
  const list=document.getElementById('w-list');
  const items=[...db.workouts].sort((a,b)=>new Date(b.date)-new Date(a.date));
  list.innerHTML = items.length? items.map(w=>{
    const vol=(w.exercises||[]).reduce((s,e)=>s+(e.sets*e.reps*e.weight||0),0);
    return `<div class="list-item"><div class="rowbetween"><div><div class="title">${esc(w.title)}</div><div class="meta">${fmtDate(w.date)} · ${w.duration||'–'} min · Volym ${vol.toLocaleString('sv-SE')} kg</div></div>
      <button class="btn ghost" onclick="deleteItem('workouts','${w.id}')">Ta bort</button></div>
      ${(w.exercises||[]).length? `<div style="margin-top:8px;">${w.exercises.map(e=>`<span class="tag">${esc(e.name)}: ${e.sets}×${e.reps} @ ${e.weight}kg</span>`).join('')}</div>`:''}
      ${w.notes?`<div class="meta" style="margin-top:6px;">${esc(w.notes)}</div>`:''}
      </div>`;
  }).join('') : `<div class="empty">Inga träningspass ännu.<br><button class="btn" onclick="togglePanel('w-panel')">+ Lägg till ditt första pass</button></div>`;

  document.getElementById('view-training').insertAdjacentHTML('beforeend', `
    <div class="rowbetween" style="margin-top:34px;">
      <h2 style="margin-bottom:0;">Kalender</h2>
      <div class="row">
        <button type="button" class="btn ghost" onclick="calShift(-1)">‹</button>
        <span style="font-weight:700;">${calTitle()}</span>
        <button type="button" class="btn ghost" onclick="calShift(1)">›</button>
      </div>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="cal">
        ${['M','T','O','T','F','L','S'].map(h=>`<div class="cal-h">${h}</div>`).join('')}
        ${calCells()}
      </div>
      <div class="locked-hint" style="margin-top:10px;">Grönt = tränad dag. Tryck på en dag för att kryssa i eller ta bort.</div>
    </div>
    <div class="rowbetween" style="margin-top:34px;"><h2 style="margin-bottom:0;">Personliga rekord</h2>
    <button class="btn ghost" onclick="togglePanel('r-panel')">+ Nytt rekord</button></div>
    <form class="panel" id="r-panel" onsubmit="return addRecord(event)" style="margin-top:14px;">
      <div class="fieldrow">
        <div class="field"><label>Övning / disciplin</label><input id="r-name" required placeholder="t.ex. Bench Press, 5km"></div>
        <div class="field"><label>Resultat</label><input id="r-value" required placeholder="t.ex. 100 kg, 23:14"></div>
      </div>
      <div class="row"><button class="btn" type="submit">Spara rekord</button><button type="button" class="btn ghost" onclick="togglePanel('r-panel')">Avbryt</button></div>
    </form>
    <div class="imgrid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">
      ${db.records.length? db.records.map(r=>`
        <div class="card" style="padding:16px;">
          <div class="rowbetween"><h3 style="margin:0;">${esc(r.name)}</h3><a href="#" onclick="deleteItem('records','${r.id}');return false;" style="color:var(--text3);font-size:.8rem;">✕</a></div>
          <div class="big" style="font-size:1.5rem;margin-top:4px;">${esc(r.value)}</div>
          <div class="label">${fmtDate(r.date)}</div>
        </div>`).join('') : `<div class="empty" style="grid-column:1/-1;">Inga rekord loggade ännu.</div>`}
    </div>
  `);
}
function addRecord(ev){
  ev.preventDefault();
  db.records.push({id:uid(), name:document.getElementById('r-name').value, value:document.getElementById('r-value').value, date:new Date().toISOString()});
  save(); togglePanel('r-panel'); renderTraining(); renderDashboard(); toast('Rekord sparat 🏆');
  return false;
}
function addExRow(){
  const name=document.getElementById('ex-name').value.trim();
  const sets=+document.getElementById('ex-sets').value, reps=+document.getElementById('ex-reps').value, weight=+document.getElementById('ex-weight').value;
  if(!name) return;
  exBuffer.push({name,sets:sets||0,reps:reps||0,weight:weight||0});
  ['ex-name','ex-sets','ex-reps','ex-weight'].forEach(id=>document.getElementById(id).value='');
  renderExBuffer();
}
function renderExBuffer(){
  document.getElementById('ex-list').innerHTML = exBuffer.map((e,i)=>`<span class="tag">${esc(e.name)}: ${e.sets}×${e.reps} @ ${e.weight}kg <a href="#" onclick="exBuffer.splice(${i},1);renderExBuffer();return false;" style="color:var(--danger);">✕</a></span>`).join(' ');
}
function addWorkout(ev){
  ev.preventDefault();
  db.workouts.push({id:uid(), title:document.getElementById('w-title').value, date:document.getElementById('w-date').value,
    duration:+document.getElementById('w-dur').value||null, notes:document.getElementById('w-notes').value, exercises:exBuffer});
  exBuffer=[]; save(); togglePanel('w-panel'); renderTraining(); renderDashboard(); toast('Träningspass sparat ✓');
  return false;
}

// ---------- Goals ----------
function renderGoals(){
  document.getElementById('view-goals').innerHTML=`
    <div class="rowbetween"><div><h1>Mål</h1><div class="sub">Det du bygger mot.</div></div>
    <button class="btn" onclick="togglePanel('g-panel')">+ Nytt mål</button></div>
    <form class="panel" id="g-panel" onsubmit="return addGoal(event)">
      <div class="field"><label>Titel</label><input id="g-title" required placeholder="t.ex. Build more muscle"></div>
      <div class="fieldrow">
        <div class="field"><label>Kategori</label><select id="g-cat"><option>Fitness</option><option>Football</option><option>Education</option><option>Finance</option><option>Personal</option></select></div>
        <div class="field"><label>Deadline</label><input id="g-deadline" type="date"></div>
      </div>
      <div class="field"><label>Beskrivning</label><textarea id="g-desc"></textarea></div>
      <div class="row"><button class="btn" type="submit">Spara mål</button><button type="button" class="btn ghost" onclick="togglePanel('g-panel')">Avbryt</button></div>
    </form>
    <div id="g-list"></div>
  `;
  const list=document.getElementById('g-list');
  list.innerHTML = db.goals.length? db.goals.map(g=>`
    <div class="list-item">
      <div class="rowbetween"><div><span class="tag">${esc(g.category)}</span><span class="title">${esc(g.title)}</span></div>
      <button class="btn ghost" onclick="deleteItem('goals','${g.id}')">Ta bort</button></div>
      ${g.desc?`<div class="meta" style="margin:6px 0;">${esc(g.desc)}</div>`:''}
      <div class="rowbetween" style="margin-top:8px;"><span class="label">${g.progress}% · ${g.status}${g.deadline?' · deadline '+fmtDate(g.deadline):''}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${g.progress}%"></div></div>
      <div class="row" style="margin-top:10px;"><input type="range" min="0" max="100" value="${g.progress}" onchange="updateGoalProgress('${g.id}',this.value)" style="flex:1;"></div>
    </div>`).join('') : `<div class="empty">Inga mål ännu.<br><button class="btn" onclick="togglePanel('g-panel')">+ Lägg till ditt första mål</button></div>`;
}
function addGoal(ev){
  ev.preventDefault();
  db.goals.push({id:uid(), title:document.getElementById('g-title').value, category:document.getElementById('g-cat').value,
    deadline:document.getElementById('g-deadline').value, desc:document.getElementById('g-desc').value, progress:0, status:'In progress', createdAt:new Date().toISOString()});
  save(); togglePanel('g-panel'); renderGoals(); renderDashboard(); toast('Mål sparat ✓');
  return false;
}
function updateGoalProgress(id,val){
  const g=db.goals.find(x=>x.id===id); g.progress=+val;
  const wasCompleted = g.status==='Completed';
  g.status = val>=100?'Completed':'In progress';
  if(g.status==='Completed' && !wasCompleted){ g.completedAt=new Date().toISOString(); toast('Mål slutfört 🎉'); }
  save(); renderGoals();
}

// ---------- Dreams ----------
function renderDreams(){
  document.getElementById('view-dreams').innerHTML=`
    <div class="rowbetween"><div><h1>Drömmar</h1><div class="sub">Din vision board.</div></div>
    <button class="btn" onclick="togglePanel('d-panel')">+ Ny dröm</button></div>
    <form class="panel" id="d-panel" onsubmit="return addDream(event)">
      <div class="field"><label>Titel</label><input id="d-title" required placeholder="t.ex. Drömhus"></div>
      <div class="field"><label>Bild</label><input id="d-image" type="file" accept="image/*"></div>
      <div class="field"><label>Varför vill jag uppnå den?</label><textarea id="d-why"></textarea></div>
      <div class="row"><button class="btn" type="submit">Spara dröm</button><button type="button" class="btn ghost" onclick="togglePanel('d-panel')">Avbryt</button></div>
    </form>
    <div id="d-grid" class="imgrid"></div>
  `;
  const grid=document.getElementById('d-grid');
  grid.innerHTML = db.dreams.length? db.dreams.map(d=>`
    <div class="imgcard">
      ${d.image?`<img src="${d.image}">`:`<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--card2);color:var(--text3);font-size:2rem;">✦</div>`}
      <div class="cap"><b style="color:var(--text);">${esc(d.title)}</b><br>${esc(d.why||'')}
      <br><button class="btn ghost" style="margin-top:8px;padding:5px 9px;font-size:.72rem;" onclick="deleteItem('dreams','${d.id}')">Ta bort</button></div>
    </div>`).join('') : `<div class="empty" style="grid-column:1/-1;">Inga drömmar tillagda ännu.<br><button class="btn" onclick="togglePanel('d-panel')">+ Lägg till din första dröm</button></div>`;
}
function addDream(ev){
  ev.preventDefault();
  const file=document.getElementById('d-image').files[0];
  const finish=(imgData)=>{ db.dreams.push({id:uid(), title:document.getElementById('d-title').value, why:document.getElementById('d-why').value, image:imgData||null, createdAt:new Date().toISOString()});
    save(); togglePanel('d-panel'); renderDreams(); toast('Dröm sparad ✓'); };
  if(file){ readImageCompressed(file, d=>finish(d)); } else finish(null);
  return false;
}

// ---------- Journal ----------
function renderJournal(){
  document.getElementById('view-journal').innerHTML=`
    <div class="rowbetween"><div><h1>Journal</h1><div class="sub">Skriv fritt om din resa.</div></div>
    <button class="btn" onclick="togglePanel('j-panel')">+ Ny anteckning</button></div>
    <form class="panel" id="j-panel" onsubmit="return addJournal(event)">
      <div class="fieldrow">
        <div class="field"><label>Titel</label><input id="j-title" required></div>
        <div class="field"><label>Mood</label><select id="j-mood"><option>💪 Motiverad</option><option>😌 Lugn</option><option>😓 Trött</option><option>🔥 Fokuserad</option><option>😕 Osäker</option></select></div>
      </div>
      <div class="field"><label>Text</label><textarea id="j-text" required></textarea></div>
      <div class="row"><button class="btn" type="submit">Spara</button><button type="button" class="btn ghost" onclick="togglePanel('j-panel')">Avbryt</button></div>
    </form>
    <div id="j-list"></div>
  `;
  const list=document.getElementById('j-list');
  const items=[...db.journal].sort((a,b)=>new Date(b.date)-new Date(a.date));
  list.innerHTML = items.length? items.map(j=>`
    <div class="list-item"><div class="rowbetween"><div><span class="title">${esc(j.title)}</span> <span class="tag">${esc(j.mood)}</span></div>
    <button class="btn ghost" onclick="deleteItem('journal','${j.id}')">Ta bort</button></div>
    <div class="meta">${fmtDate(j.date)}</div><div style="margin-top:8px;">${esc(j.text)}</div></div>`).join('')
    : `<div class="empty">Inga anteckningar ännu.<br><button class="btn" onclick="togglePanel('j-panel')">+ Skriv din första anteckning</button></div>`;
}
function addJournal(ev){
  ev.preventDefault();
  db.journal.push({id:uid(), title:document.getElementById('j-title').value, mood:document.getElementById('j-mood').value, text:document.getElementById('j-text').value, date:new Date().toISOString()});
  save(); togglePanel('j-panel'); renderJournal(); renderDashboard(); toast('Journalanteckning sparad ✓');
  return false;
}

// ---------- Gallery ----------
function renderGallery(){
  document.getElementById('view-gallery').innerHTML=`
    <div class="rowbetween"><div><h1>Galleri</h1><div class="sub">Dokumentera din resa i bilder.</div></div>
    <button class="btn" onclick="togglePanel('p-panel')">+ Ladda upp bild</button></div>
    <form class="panel" id="p-panel" onsubmit="return addPhoto(event)">
      <div class="field"><label>Bild</label><input id="p-image" type="file" accept="image/*" required></div>
      <div class="fieldrow">
        <div class="field"><label>Titel</label><input id="p-title"></div>
        <div class="field"><label>Kategori</label><select id="p-cat"><option>Gym</option><option>Football</option><option>Progress</option><option>Lifestyle</option><option>Inspiration</option><option>Other</option></select></div>
      </div>
      <div class="row"><button class="btn" type="submit">Ladda upp</button><button type="button" class="btn ghost" onclick="togglePanel('p-panel')">Avbryt</button></div>
    </form>
    <div id="p-grid" class="imgrid"></div>
  `;
  const grid=document.getElementById('p-grid');
  const items=[...db.photos].sort((a,b)=>new Date(b.date)-new Date(a.date));
  grid.innerHTML = items.length? items.map(p=>`
    <div class="imgcard" onclick="openLightbox('${p.id}')">
      <img src="${p.image}"><div class="cap">${esc(p.title||p.category)} · <span class="tag" style="margin:0;">${esc(p.category)}</span></div>
    </div>`).join('') : `<div class="empty" style="grid-column:1/-1;">Inga bilder ännu.<br><button class="btn" onclick="togglePanel('p-panel')">+ Ladda upp din första bild</button></div>`;
}
function addPhoto(ev){
  ev.preventDefault();
  const file=document.getElementById('p-image').files[0];
  if(!file) return false;
  readImageCompressed(file, dataUrl=>{
    db.photos.push({id:uid(), image:dataUrl, title:document.getElementById('p-title').value, category:document.getElementById('p-cat').value, date:new Date().toISOString()});
    save(); togglePanel('p-panel'); renderGallery(); renderDashboard(); toast('Bild uppladdad ✓');
  });
  return false;
}
function openLightbox(id){
  const p = db.photos.find(x=>x.id===id);
  if(!p) return;
  document.getElementById('lightbox-img').src = p.image;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox(){ document.getElementById('lightbox').classList.remove('open'); }

// ---------- Stats ----------
function renderStats(){
  const totalVol = db.workouts.reduce((s,w)=>s+(w.exercises||[]).reduce((a,e)=>a+(e.sets*e.reps*e.weight||0),0),0);
  const totalMin = db.workouts.reduce((s,w)=>s+(w.duration||0),0);
  const totalEx = db.workouts.reduce((s,w)=>s+(w.exercises||[]).length,0);
  document.getElementById('view-stats').innerHTML=`
    <h1>Statistik</h1><div class="sub">Din utveckling i siffror.</div>
    <div class="grid">
      <div class="card"><h3>Totalt antal pass</h3><div class="big">${db.workouts.length}</div></div>
      <div class="card"><h3>Total träningstid</h3><div class="big">${Math.floor(totalMin/60)}h ${totalMin%60}m</div></div>
      <div class="card"><h3>Total volym</h3><div class="big">${totalVol.toLocaleString('sv-SE')} kg</div></div>
      <div class="card"><h3>Övningar loggade</h3><div class="big">${totalEx}</div></div>
      <div class="card"><h3>Personliga rekord</h3><div class="big">${db.records.length}</div></div>
      <div class="card"><h3>Mål slutförda</h3><div class="big">${db.goals.filter(g=>g.status==='Completed').length}</div></div>
      <div class="card"><h3>Journalanteckningar</h3><div class="big">${db.journal.length}</div></div>
      <div class="card"><h3>Bilder uppladdade</h3><div class="big">${db.photos.length}</div></div>
      <div class="card"><h3>Nuvarande streak</h3><div class="big">🔥 ${calcStreak()}</div></div>
    </div>
  `;
}

// ---------- Settings ----------
function renderSettings(){
  document.getElementById('view-settings').innerHTML=`
    <h1>Inställningar</h1><div class="sub">Tema och data.</div>
    <div class="grid" style="grid-template-columns:1fr;max-width:480px;">
      <div class="card">
        <h3>Utseende</h3>
        <div class="row"><button class="btn ${document.documentElement.dataset.theme!=='light'?'':'ghost'}" onclick="setTheme('dark')">Dark</button>
        <button class="btn ${document.documentElement.dataset.theme==='light'?'':'ghost'}" onclick="setTheme('light')">Light</button></div>
      </div>
      <div class="card">
        <h3>Data</h3>
        <div class="label" style="margin-bottom:12px;">All data sparas lokalt i den här webbläsaren — inte i något moln.</div>
        <div class="row"><button class="btn ghost" onclick="exportData()">Exportera all data (JSON)</button>
          <button class="btn ghost" onclick="document.getElementById('import-file').click()">Importera data (JSON)</button>
          <input id="import-file" type="file" accept="application/json,.json" style="display:none;" onchange="importData(event)"></div>
        <div class="row" style="margin-top:10px;"><button class="btn danger" onclick="clearData()">Radera all data</button></div>
      </div>
    </div>
  `;
}

function importData(ev){
  const file=ev.target.files[0]; if(!file) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(typeof d!=='object'||d===null||!Array.isArray(d.workouts)) throw new Error('bad');
      if(!confirm('Importera och skriv \u00f6ver all lokal data i den h\u00e4r webbl\u00e4saren?')){ ev.target.value=''; return; }
      db={workouts:[],goals:[],dreams:[],journal:[],photos:[],records:[],habits:[],body:[],programs:[],theme:'dark',...d};
      document.documentElement.dataset.theme = db.theme==='light'?'light':'dark';
      save(); renderAll(); toast('Data importerad \u2713');
    }catch(e){ toast('Ogiltig fil \u2014 anv\u00e4nd en JSON som exporterats fr\u00e5n FORWARD.'); }
    ev.target.value='';
  };
  r.readAsText(file);
}
const APP_VERSION='1.3';
function setTheme(t){ document.documentElement.dataset.theme=t; db.theme=t; save(); renderSettings(); }
function exportData(){
  const blob = new Blob([JSON.stringify(db,null,2)], {type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='forward-data.json'; a.click();
}
function clearData(){
  if(confirm('Är du säker? All lokal data raderas permanent.')){ db={workouts:[],goals:[],dreams:[],journal:[],photos:[],records:[],habits:[],body:[],programs:[],theme:db.theme}; save(); renderAll(); }
}

// ---------- Toast & Quick Add ----------
function toast(msg){
  const el=document.createElement('div'); el.className='toast'; el.textContent=msg;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, 2400);
}
function quickAdd(view, panelId){
  document.getElementById('fab-menu').classList.remove('open');
  setView(view);
  setTimeout(()=>{ const p=document.getElementById(panelId); if(p && !p.classList.contains('open')) p.classList.add('open'); }, 30);
}
