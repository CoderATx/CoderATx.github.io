/* LOCKED-läge i FORWARD: XP, nivåer, streaks, missions, plugg, challenges, AI-insikt */
'use strict';

/* ---------- XP-motor ---------- */
const XP_VALUES={pass:50,habit:20,study:40,goal:200,pr:30,chal:200};
const XP_DAILY_CAP=300;
function xpNeeded(l){return 100+50*(l-1);}
function levelFromXp(xp){let l=1,rest=Number(xp||0);while(rest>=xpNeeded(l)&&l<999){rest-=xpNeeded(l);l++;}return{level:l,into:rest,need:xpNeeded(l)};}
function xpDay(){const t=todayStr();if(!db.xpday||db.xpday.day!==t)db.xpday={day:t,amount:0,reasons:{}};return db.xpday;}
function xpLimit(reason){return reason==='pass'?1:reason==='study'?3:5;}
function canXp(reason){const d=xpDay();return (d.reasons[reason]||0)<xpLimit(reason)&&d.amount<XP_DAILY_CAP;}
function giveXp(amount,reason){
  if(!canXp(reason))return;
  const d=xpDay();
  const before=levelFromXp(db.xp||0);
  db.xp=(db.xp||0)+amount;
  d.amount+=amount;d.reasons[reason]=(d.reasons[reason]||0)+1;
  db.xplog=db.xplog||[];
  db.xplog.unshift({date:new Date().toISOString(),amount:amount,reason:reason});
  if(db.xplog.length>200)db.xplog.length=200;
  save();autoSave();
  xpFloat(amount);
  const after=levelFromXp(db.xp);
  if(after.level>before.level)showLevelUp(after.level);
}
function xpFloat(amount){
  const el=document.createElement('div');
  el.className='lk-xpfloat';el.textContent='+'+amount+' XP';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1200);
}
function showLevelUp(newLevel){
  let box=document.getElementById('lk-lvlup');
  if(!box){
    box=document.createElement('div');box.id='lk-lvlup';
    box.innerHTML='<div class="lk-lvlbox"><div class="lk-lvllab">NIVÅ UPP</div><div class="lk-lvlbig" id="lk-lvlbig"></div><div class="lk-lvlsub">Stay locked in.</div></div>';
    document.body.appendChild(box);
  }
  document.getElementById('lk-lvlbig').textContent=(newLevel-1)+' → '+newLevel;
  box.classList.add('show');
  lkConfetti(80);
  setTimeout(()=>box.classList.remove('show'),2600);
}
function lkConfetti(n){
  const colors=['#7c83ff','#4fd1ff','#3ddc97','#ffc857','#9a7cff'];
  for(let i=0;i<n;i++){
    const s=document.createElement('span');
    s.className='lk-cf';
    s.style.left=(Math.random()*100)+'vw';
    s.style.background=colors[Math.floor(Math.random()*colors.length)];
    s.style.animationDuration=(1.6+Math.random()*1.8)+'s';
    s.style.animationDelay=(Math.random()*0.4)+'s';
    s.style.width=(5+Math.random()*6)+'px';
    s.style.height=(8+Math.random()*9)+'px';
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),4200);
  }
}

/* ---------- XP kopplat till det du redan gör ---------- */
const _ttd=window.toggleTrainingDay;
window.toggleTrainingDay=function(key){_ttd(key);if(db.trainingDays.includes(key))giveXp(XP_VALUES.pass,'pass');};
const _aw=window.addWorkout;
window.addWorkout=function(ev){const r=_aw(ev);if(db.workouts.length)giveXp(XP_VALUES.pass,'pass');return r;};
const _tht=window.toggleHabitToday;
window.toggleHabitToday=function(id){
  const h=db.habits.find(x=>x.id===id);const had=h&&h.checkins.includes(todayStr());
  _tht(id);
  const h2=db.habits.find(x=>x.id===id);
  if(h2&&!had&&h2.checkins.includes(todayStr()))giveXp(XP_VALUES.habit,'habit');
};
const _ar=window.addRecord;
window.addRecord=function(ev){const r=_ar(ev);giveXp(XP_VALUES.pr,'pr');return r;};
const _ugp=window.updateGoalProgress;
window.updateGoalProgress=function(id,val){
  const g=db.goals.find(x=>x.id===id);const was=g&&g.status==='Completed';
  _ugp(id,val);
  const g2=db.goals.find(x=>x.id===id);
  if(g2&&g2.status==='Completed'&&!was)giveXp(XP_VALUES.goal,'goal_'+id);
};

/* ---------- Dagens missions + nivåkort på dashboarden ---------- */
const _rd=window.renderDashboard;
window.renderDashboard=function(){
  _rd();
  const v=document.getElementById('view-dashboard');
  if(!v||document.getElementById('lk-levelcard'))return;
  const l=levelFromXp(db.xp||0);
  const pct=Math.min(100,Math.round(l.into/l.need*100));
  const today=todayStr();
  const workoutToday=db.workouts.some(w=>w.date===today);
  const missions=[];
  if(!db.trainingDays.includes(today)&&!workoutToday)missions.push({label:'Träna idag',xp:XP_VALUES.pass,fn:()=>toggleTrainingDay(today)});
  db.habits.filter(h=>!h.checkins.includes(today)).slice(0,2).forEach(h=>missions.push({label:h.name,xp:XP_VALUES.habit,fn:()=>toggleHabitToday(h.id)}));
  const studyDoneToday=(db.study||[]).filter(s=>s.day===today).length;
  if(studyDoneToday<3)missions.push({label:'Plugga 25+ min',xp:XP_VALUES.study,fn:()=>setView('study')});
  const html=
    '<div class="card lk-levelcard" id="lk-levelcard">'+
      '<div class="rowbetween"><div><div class="lk-lab">NIVÅ</div>'+
      '<div class="lk-big">'+l.level+'</div></div>'+
      '<span class="lk-streakpill">🔥 '+calcStreak()+' dagars streak</span></div>'+
      '<div class="lk-bar" style="margin-top:12px;"><i style="width:'+pct+'%"></i></div>'+
      '<div class="lk-lab" style="margin-top:6px;">'+l.into+' / '+l.need+' XP till nivå '+(l.level+1)+' · '+pct+'% · idag +'+xpDay().amount+' XP</div>'+
    '</div>'+
    '<div class="card lk-card">'+
      '<div class="rowbetween"><h3 style="margin:0;">Dagens missions</h3><span class="lk-tag">XP väntar</span></div>'+
      (missions.length?missions.map((m,i)=>'<div class="lk-mission" data-i="'+i+'"><span class="lk-mbox">○</span><span>'+esc(m.label)+'</span><span class="lk-mxp">+'+m.xp+' XP</span></div>').join('')
      :'<div class="lk-lab" style="margin-top:10px;">Alla missions klara idag. Locked in. 🔒</div>')+
    '</div>'+
    '<div class="card lk-card">'+
      '<div class="rowbetween"><h3 style="margin:0;">AI-insikt</h3>'+(insightCache()?'':'<button class="btn lk-minibtn" id="lk-insbtn">Generera</button>')+'</div>'+
      '<div class="lk-lab" style="margin-top:10px;" id="lk-instxt">'+esc(insightCache()||'Kort daglig analyse av dina siffror. Kräver Groq-nyckel (Inställningar → AI).')+'</div>'+
    '</div>';
  v.insertAdjacentHTML('afterbegin',html);
  document.querySelectorAll('#view-dashboard .lk-mission').forEach(el=>{
    el.addEventListener('click',()=>{const m=missions[+el.getAttribute('data-i')];if(m)m.fn();});
  });
  const ib=document.getElementById('lk-insbtn');
  if(ib)ib.addEventListener('click',genInsight);
};

/* ---------- AI-insikt (1/dag, riktig data) ---------- */
function insightCache(){return localStorage.getItem('forward_insight_'+todayStr())||'';}
function genInsight(){
  const cfg=getAICfg();
  if(!cfg.key){toast('Lägg in din Groq-nyckel i Inställningar först.');return;}
  if(insightCache()){toast('Du har redan en insikt idag. Ny imorgon.');return;}
  const btn=document.getElementById('lk-insbtn');
  if(btn){btn.disabled=true;btn.textContent='Tänker…';}
  const weekAgo=new Date();weekAgo.setDate(weekAgo.getDate()-7);
  const wk=ts=>new Date(ts)>=weekAgo;
  const ctx={
    streak:calcStreak(),
    pass_denna_vecka:db.workouts.filter(w=>wk(w.date)).length,
    habits:db.habits.map(h=>({namn:h.name,streak:calcHabitStreak(h),idag:h.checkins.includes(todayStr())})),
    mal_i_gang:db.goals.filter(g=>g.status!=='Completed').map(g=>({titel:g.title,progress:g.progress})),
    plugg_denna_vecka_min:(db.study||[]).filter(s=>wk(s.day)).reduce((a,s)=>a+s.minutes,0)
  };
  fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.key},
    body:JSON.stringify({model:cfg.model||'meta-llama/llama-4-scout-17b-16e-instruct',temperature:0.4,max_tokens:120,
      messages:[{role:'system',content:'Du är en kortfattad tränings- och livscoach. Givet användarens data, ge EN mening på svenska: vad som gick bra senaste veckan och vad dagens viktigaste fokus är. Inga klyschor, ingen hälsning, inga listor. Max 30 ord.'},
        {role:'user',content:JSON.stringify(ctx)}]})})
  .then(r=>r.json())
  .then(d=>{
    const t=d.choices&&d.choices[0]&&d.choices[0].message?d.choices[0].message.content.trim():'';
    if(!t)throw new Error('tomt svar');
    localStorage.setItem('forward_insight_'+todayStr(),t);
    const el=document.getElementById('lk-instxt');if(el)el.textContent=t;
    const b=document.getElementById('lk-insbtn');if(b)b.remove();
    toast('AI-insikten är klar ✓');
  })
  .catch(()=>{
    if(btn){btn.disabled=false;btn.textContent='Generera';}
    toast('AI:n svarade inte. Testa igen.');
  });
}

/* ---------- Plugg (study tracker) ---------- */
function addStudy(ev){
  ev.preventDefault();
  const s=document.getElementById('s-subj').value.trim();
  const m=+document.getElementById('s-min').value||0;
  const day=document.getElementById('s-day').value||todayStr();
  if(!s||m<=0){toast('Fyll i ämne och minuter.');return false;}
  db.study=db.study||[];
  db.study.push({id:uid(),subject:s,minutes:m,day:day});
  save();autoSave();
  if(m>=25)giveXp(XP_VALUES.study,'study');
  renderStudy();renderDashboard();
  toast('Pluggsession sparad ✓'+(m>=25?' +'+XP_VALUES.study+' XP':''));
  return false;
}
function renderStudy(){
  const v=document.getElementById('view-study');
  if(!v)return;
  const now=new Date();
  const monday=new Date(now);monday.setDate(now.getDate()-((now.getDay()+6)%7));
  const mStr=todayStr(monday);
  const week=(db.study||[]).filter(s=>s.day>=mStr);
  const bySub={};
  week.forEach(s=>{bySub[s.subject]=(bySub[s.subject]||0)+s.minutes;});
  const total=week.reduce((a,s)=>a+s.minutes,0);
  const fmt=min=>Math.floor(min/60)+'h '+String(min%60).padStart(2,'0')+'m';
  const max=Math.max(1,...Object.values(bySub));
  const subs=Object.keys(bySub).sort((a,b)=>bySub[b]-bySub[a]);
  v.innerHTML='<div class="rowbetween"><div><h1>Plugg</h1><div class="sub">Studietid per ämne, räknad.</div></div></div>'+
    '<form class="panel open" id="s-panel" onsubmit="return addStudy(event)">'+
      '<div class="fieldrow">'+
        '<div class="field"><label>Ämne</label><input id="s-subj" required placeholder="t.ex. Matematik, NOG, HVA"></div>'+
        '<div class="field" style="max-width:120px;"><label>Minuter</label><input id="s-min" type="number" min="1" value="45"></div>'+
        '<div class="field" style="max-width:170px;"><label>Datum</label><input id="s-day" type="date" value="'+todayStr()+'"></div>'+
      '</div>'+
      '<div class="row"><button class="btn" type="submit">Logga session</button></div>'+
    '</form>'+
    '<div class="card lk-card" style="margin-top:14px;">'+
      '<div class="rowbetween"><h3 style="margin:0;">Denna vecka</h3><span class="lk-tag">Totalt '+fmt(total)+'</span></div>'+
      (subs.length?subs.map(s=>'<div style="margin-top:12px;"><div class="rowbetween"><span>'+esc(s)+'</span><span class="lk-lab">'+fmt(bySub[s])+'</span></div>'+
        '<div class="lk-bar" style="margin-top:6px;"><i style="width:'+Math.round(bySub[s]/max*100)+'%"></i></div></div>').join('')
      :'<div class="lk-lab" style="margin-top:10px;">Inga sessioner denna vecka än. +'+XP_VALUES.study+' XP per session (25+ min).</div>')+
    '</div>'+
    '<div class="card lk-card" style="margin-top:14px;"><h3 style="margin:0 0 8px;">Senaste sessioner</h3>'+((db.study||[]).length?(db.study||[]).slice().sort((a,b)=>b.day<a.day?-1:1).slice(0,8).map(s=>'<div class="rowbetween" style="padding:7px 0;border-bottom:1px solid var(--border);"><span>'+esc(s.subject)+'</span><span class="lk-lab">'+s.minutes+' min · '+fmtDate(s.day)+'</span></div>').join(''):'<div class="lk-lab">Inga sessioner loggade än.</div>')+'</div>';
}

/* ---------- Challenges ---------- */
function chalEntry(key){db.challenges=db.challenges||[];return db.challenges.filter(c=>c.key===key)[0];}
const CHALLENGES=[
  {key:'lock7',em:'🔥',t:'7 dagars lock-in',d:'Streak på 7 dagar i rad',target:7,prog:()=>calcStreak()},
  {key:'lock30',em:'🔒',t:'30 dagars lock-in',d:'Streak på 30 dagar i rad',target:30,prog:()=>calcStreak()},
  {key:'w10',em:'💪',t:'10 pass-challenge',d:'10 träningspass sedan du gick med',target:10,prog:()=>{const e=chalEntry('w10');return e?db.workouts.filter(w=>w.date>=e.started).length:0;}},
  {key:'s10',em:'📚',t:'10 pluggsessioner',d:'10 sessioner sedan du gick med',target:10,prog:()=>{const e=chalEntry('s10');return e?(db.study||[]).filter(s=>s.day>=e.started).length:0;}},
  {key:'push100',em:'🧱',t:'100 armhävningar',d:'Räkna själv: +10 per tryck',target:100,tally:10},
  {key:'money1000',em:'💰',t:'Spara 1 000 kr',d:'Lägg undan: +100 per tryck',target:1000,tally:100},
];
function joinChallenge(key){
  if(chalEntry(key))return;
  db.challenges.push({key:key,started:todayStr(),tally:0});
  save();renderChallenges();toast('Challenge påbörjad. Dags att locka in dig.');
}
function tallyChallenge(key){
  const e=chalEntry(key);if(!e)return;
  const c=CHALLENGES.filter(x=>x.key===key)[0];
  e.tally=(e.tally||0)+c.tally;
  save();
  if(e.tally>=c.target&&!e.done){e.done=todayStr();giveXp(XP_VALUES.chal,'chal_'+key);toast('Challenge klar 🏆 +'+XP_VALUES.chal+' XP');}
  renderChallenges();renderDashboard();
}
function renderChallenges(){
  const v=document.getElementById('view-challenges');
  if(!v)return;
  v.innerHTML='<h1>Challenges</h1><div class="sub">Valfria utmaningar. Klarar du en ger den +'+XP_VALUES.chal+' XP.</div>'+
    '<div class="lk-chalgrid">'+CHALLENGES.map(c=>{
      const e=chalEntry(c.key);
      const p=e?Math.min(100,Math.round((c.tally!=null?(e.tally||0):c.prog())/c.target*100)):0;
      const val=e?(c.tally!=null?(e.tally||0):c.prog()):0;
      return '<div class="card lk-card lk-chal'+(e&&e.done?' lk-done':'')+'">'+
        '<div class="rowbetween"><div class="lk-chalem">'+c.em+'</div>'+(e?(e.done?'<span class="lk-tag lk-good">klar</span>':'<span class="lk-tag">pågår</span>'):'')+'</div>'+
        '<h3 style="margin-top:8px;">'+c.t+'</h3><div class="lk-lab">'+c.d+'</div>'+
        (e?('<div class="lk-bar" style="margin-top:10px;"><i style="width:'+p+'%"></i></div><div class="lk-lab" style="margin-top:4px;">'+val+' / '+c.target+'</div>'+
          (c.tally!=null&&!e.done?'<button class="btn lk-minibtn" style="margin-top:10px;" onclick="tallyChallenge(\''+c.key+'\')">+'+c.tally+'</button>':'')
        ):'<button class="btn ghost lk-minibtn" style="margin-top:12px;" onclick="joinChallenge(\''+c.key+'\')">Gå med</button>')+
      '</div>';
    }).join('')+'</div>';
}

/* ---------- Pengamål i Mål-vyn ---------- */
const _ag=window.addGoal;
window.addGoal=function(ev){
  const mt=document.getElementById('g-money')?+document.getElementById('g-money').value||0:0;
  const r=_ag(ev);
  if(mt>0){const g=db.goals[db.goals.length-1];if(g){g.moneyTarget=mt;g.moneyCurrent=0;save();}}
  return r;
};
const _rg=window.renderGoals;
window.renderGoals=function(){
  _rg();
  const form=document.getElementById('g-panel');
  if(form&&!document.getElementById('g-money')){
    const row=document.createElement('div');
    row.className='field';row.style.marginTop='8px';
    row.innerHTML='<label>Beloppsmål (valfritt, kr) — t.ex. spara 10 000</label><input id="g-money" type="number" min="0" placeholder="10000">';
    form.querySelector('.row').parentNode.insertBefore(row,form.querySelector('.row'));
  }
  const list=document.getElementById('g-list');
  if(!list)return;
  db.goals.forEach(g=>{
    if(!g.moneyTarget)return;
    const idx=db.goals.indexOf(g);
    const items=list.querySelectorAll('.list-item');
    const item=items[idx];
    if(!item)return;
    const pct=Math.min(100,Math.round((g.moneyCurrent||0)/g.moneyTarget*100));
    const track=item.querySelector('.bar-track');
    if(track)track.outerHTML=
      '<div class="rowbetween" style="margin-top:8px;"><span class="label">'+kr(g.moneyCurrent||0)+' / '+kr(g.moneyTarget)+' ('+pct+'%)</span>'+
      '<span class="row"><button class="btn ghost lk-minibtn" onclick="lockedMoney(\''+g.id+'\',100)">+100</button>'+
      '<button class="btn ghost lk-minibtn" onclick="lockedMoney(\''+g.id+'\',-100)">-100</button></span></div>'+
      '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div>';
  });
};
function lockedMoney(id,delta){
  const g=db.goals.find(x=>x.id===id);if(!g)return;
  g.moneyCurrent=Math.max(0,(g.moneyCurrent||0)+delta);
  g.progress=Math.min(100,Math.round(g.moneyCurrent/g.moneyTarget*100));
  const was=g.status==='Completed';
  if(g.progress>=100){g.status='Completed';g.completedAt=g.completedAt||new Date().toISOString();}else{g.status='In progress';g.completedAt=null;}
  save();
  if(g.status==='Completed'&&!was){giveXp(XP_VALUES.goal,'goal_'+id);toast('Sparmål nått 🎉');}
  renderGoals();renderDashboard();
}

/* ---------- Nav + renderAll ---------- */
NAV.push({id:'study',label:'Plugg',icon:'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'},
         {id:'challenges',label:'Challenges',icon:'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 100 8 4 4 0 000-8z'});
function lkRebuildNav(){
  const mk=n=>'<button class="navlink" data-view="'+n.id+'">'+icon(n.icon)+n.label+'</button>';
  document.getElementById('navlinks').innerHTML=NAV.map(mk).join('');
  document.getElementById('bottomnav').innerHTML=NAV.map(mk).join('')+'<button class="navlink" data-view="settings">'+icon('M12 15a3 3 0 100-6 3 3 0 000 6z')+'Inst.</button>';
  document.querySelectorAll('.navlink').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
}
lkRebuildNav();
const _ra=window.renderAll;
window.renderAll=function(){_ra();renderStudy();renderChallenges();};

/* ---------- Stil ---------- */
const lkStyle=document.createElement('style');
lkStyle.textContent=
 '.lk-lab{font-size:.78rem;color:var(--text3);}' +
 '.lk-big{font-family:var(--font-display);font-size:2.3rem;font-weight:700;color:var(--accent);line-height:1;}' +
 '.lk-bar{height:10px;border-radius:999px;background:var(--card2);border:1px solid var(--border);overflow:hidden;}' +
 '.lk-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--grad2));transition:width .5s ease;}' +
 '.lk-card{margin-top:14px;}' +
 '.lk-streakpill{background:rgba(251,191,36,.14);color:#ffc857;font-weight:700;font-size:.8rem;padding:4px 12px;border-radius:999px;}' +
 '.lk-tag{font-size:.72rem;font-weight:700;color:var(--accent);background:var(--accent-dim);padding:3px 10px;border-radius:999px;}' +
 '.lk-good{background:rgba(61,220,151,.15);color:#3ddc97;}' +
 '.lk-mission{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid var(--border);border-radius:12px;background:var(--card2);margin-top:8px;cursor:pointer;transition:border-color .15s;}' +
 '.lk-mission:hover{border-color:var(--accent);}' +
 '.lk-mxp{margin-left:auto;color:var(--accent);font-weight:700;font-size:.8rem;white-space:nowrap;}' +
 '.lk-minibtn{padding:7px 14px;font-size:.85rem;}' +
 '.lk-xpfloat{position:fixed;left:50%;top:38%;transform:translateX(-50%);z-index:300;color:var(--accent);font-family:var(--font-display);font-weight:700;font-size:1.35rem;pointer-events:none;text-shadow:0 0 18px rgba(124,131,255,.6);animation:lk-xfl 1.1s ease forwards;}' +
 '@keyframes lk-xfl{0%{opacity:0;transform:translate(-50%,10px) scale(.8);}25%{opacity:1;transform:translate(-50%,-6px) scale(1.06);}100%{opacity:0;transform:translate(-50%,-64px) scale(1);}}' +
 '#lk-lvlup{position:fixed;inset:0;z-index:310;display:none;align-items:center;justify-content:center;background:rgba(4,4,9,.78);backdrop-filter:blur(8px);}' +
 '#lk-lvlup.show{display:flex;}' +
 '.lk-lvlbox{text-align:center;animation:lk-lup .6s cubic-bezier(.2,1.4,.4,1);}' +
 '@keyframes lk-lup{0%{transform:scale(.6);opacity:0;}100%{transform:scale(1);opacity:1;}}' +
 '.lk-lvlbig{font-family:var(--font-display);font-size:3rem;font-weight:700;color:var(--accent);text-shadow:0 0 40px rgba(124,131,255,.7);}' +
 '.lk-lvlsub{color:var(--text3);margin-top:6px;}' +
 '.lk-cf{position:fixed;top:-24px;border-radius:2px;z-index:320;pointer-events:none;animation:lk-cfall linear forwards;}' +
 '@keyframes lk-cfall{0%{transform:translateY(-10px) rotate(0);opacity:1;}100%{transform:translateY(105vh) rotate(680deg);opacity:.4;}}' +
 '.lk-chalgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:16px;}' +
 '.lk-chal.lk-done{border-color:var(--accent);}' +
 '.lk-chalem{font-size:1.6rem;}' +
 '@media(prefers-reduced-motion:reduce){.lk-xpfloat,.lk-lvlbox,.lk-cf{animation:none!important;}}';
document.head.appendChild(lkStyle);
