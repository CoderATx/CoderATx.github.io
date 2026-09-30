/* Städcheck — jobb, kunder, AI-underlag, PDF */
'use strict';

function ensurePdf(cb){
  if(window.jspdf)return cb();
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
  s.onload=cb;s.onerror=function(){toast('Kunde inte ladda PDF-modulen. Kontrollera nätet.',true);};
  document.head.appendChild(s);
}

/* ---------- joblistan ---------- */
function renderJobs(){
  if(!SC_JOBS){root().innerHTML='<div class="viewhead"><h1>Jobb</h1></div><div class="skel" style="width:60%"></div><div class="skel"></div><div class="skel"></div>';loadJobs();return;}
  var months={};
  SC_JOBS.forEach(function(j){if(j.job_date)months[j.job_date.slice(0,7)]=true;});
  var now=new Date(),cur=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var mkeys=Object.keys(months).sort().reverse();
  if(mkeys.indexOf(cur)===-1)mkeys.unshift(cur);
  var sel=document.getElementById('jobs-month');
  var chosen=sel?sel.value:cur;
  var list=chosen==='all'?SC_JOBS:SC_JOBS.filter(function(j){return (j.job_date||'').indexOf(chosen)===0;});
  list=list.slice().sort(function(a,b){return (b.job_date||'')<(a.job_date||'')?-1:1;});
  root().innerHTML='<div class="viewhead"><h1>Jobb</h1>'+
    '<select id="jobs-month" style="width:auto;margin-left:auto;">'+
    '<option value="all"'+(chosen==='all'?' selected':'')+'>Alla månader</option>'+
    mkeys.map(function(m){var d=new Date(m+'-01');return '<option value="'+m+'"'+(chosen===m?' selected':'')+'>'+d.toLocaleDateString('sv-SE',{month:'long',year:'numeric'})+'</option>';}).join('')+
    '</select>'+
    '<a class="btn" href="#/job/new">＋ Nytt jobb</a></div>'+
    (list.length?('<div class="tw"><table class="list"><thead><tr><th>Datum</th><th>Kund</th><th>Arbete</th><th>Rut-avdrag</th><th>Totalt</th><th>Underlag</th><th>Status</th></tr></thead><tbody>'+
      list.map(function(j){var c=jobCalc(j);return '<tr class="click" onclick="openJob(\''+j.id+'\')"><td>'+dstr(j.job_date)+'</td><td>'+esc(j.customer_name||'(raderad kund)')+'</td><td>'+kr(c.arbete)+'</td><td>'+(j.rut?'-'+kr(c.rut):'–')+'</td><td>'+kr(c.total)+'</td><td>'+(j.ai_summary?'✓ AI':'(eget)')+'</td><td><span class="badge '+esc(j.status)+'">'+esc(j.status)+'</span></td></tr>';}).join('')+
      '</tbody></table></div>')
    :'<div class="empty"><h3>Inga jobb</h3><p class="mut" style="margin-top:6px;">Skapa ditt första jobb, det tar två minuter.</p><button class="btn" style="margin-top:16px;" onclick="location.hash=\'#/job/new\'">Nytt jobb</button></div>');
  var s2=document.getElementById('jobs-month');
  if(s2&&!s2._w){s2._w=true;s2.onchange=function(){renderJobs();};}
}

/* ---------- kunder ---------- */
function renderCustomers(){
  if(!SC_CUSTOMERS){root().innerHTML='<div class="viewhead"><h1>Kunder</h1></div><div class="skel" style="width:60%"></div><div class="skel"></div>';loadJobs();return;}
  root().innerHTML='<div class="viewhead"><h1>Kunder</h1>'+
    '<button class="btn" style="margin-left:auto;" id="cu-add">＋ Ny kund</button></div>'+
    '<div class="card" id="cu-form" hidden style="max-width:560px;margin-top:12px;">'+
    '<div class="field" style="margin-bottom:10px;"><label>Namn *</label><input id="cu-name" placeholder="t.ex. Familjen Andersson / Kontor X AB"></div>'+
    '<div class="row"><div class="field grow"><label>Adress</label><input id="cu-addr" placeholder="Gata, ort"></div>'+
    '<div class="field grow"><label>Kontakt (mejl/telefon)</label><input id="cu-contact"></div></div>'+
    '<button class="btn" id="cu-save" style="margin-top:14px;">Spara kund</button></div>'+
    (SC_CUSTOMERS.length?('<div class="tw"><table class="list"><thead><tr><th>Namn</th><th>Adress</th><th>Kontakt</th><th>Jobb</th><th></th></tr></thead><tbody>'+
      SC_CUSTOMERS.map(function(c){
        var n=SC_JOBS?SC_JOBS.filter(function(j){return j.customer_id===c.id;}).length:0;
        return '<tr><td>'+esc(c.name)+'</td><td class="mut">'+esc(c.address||'')+'</td><td class="mut">'+esc(c.contact||'')+'</td><td>'+n+'</td><td><button class="btn danger" onclick="delCustomer(\''+c.id+'\')">Ta bort</button></td></tr>';
      }).join('')+'</tbody></table></div>')
    :'<div class="empty"><h3>Inga kunder än</h3><p class="mut" style="margin-top:6px;">Lägg in den du städar för, så kopplas jobben till rätt historik.</p></div>');
  document.getElementById('cu-add').onclick=function(){var f=document.getElementById('cu-form');f.hidden=!f.hidden;if(!f.hidden)document.getElementById('cu-name').focus();};
  document.getElementById('cu-save').onclick=function(){
    var name=document.getElementById('cu-name').value.trim();
    if(!name){toast('Kundens namn krävs.',true);return;}
    sb.from('st_customers').insert({name:name,address:document.getElementById('cu-addr').value.trim(),contact:document.getElementById('cu-contact').value.trim()}).then(function(r){
      if(r.error){toast('Kunde inte spara: '+r.error.message,true);return;}
      logEv('customer_created');SC_CUSTOMERS=null;toast('Kund sparad ✓');renderCustomers();
    });
  };
}
function delCustomer(id){
  if(!confirm('Ta bort kunden? Jobben behålls men kopplas loss.'))return;
  sb.from('st_customers').delete().eq('id',id).then(function(){
    SC_CUSTOMERS=null;SC_JOBS=null;toast('Kunden borttagen.');loadJobs();
  });
}

/* ---------- jobbredigeraren ---------- */
function openJob(id){
  if(id==='new')return renderJobEditor(null);
  var o=(SC_JOBS||[]).filter(function(x){return x.id===id;})[0];
  if(o)return renderJobEditor(o);
  root().innerHTML='<div class="skel" style="width:50%"></div><div class="skel"></div><div class="skel"></div>';
  sb.from('st_jobs').select('*').eq('id',id).maybeSingle().then(function(r){
    if(r.error||!r.data){toast('Jobbet hittades inte.',true);location.hash='#/jobs';return;}
    renderJobEditor(r.data);
  });
}
function renderJobEditor(j){
  var isNew=!j;
  j=j||{customer_id:null,customer_name:'',job_date:todayStr(new Date()),items:[],material:0,rut:true,vat:25,status:'klar',ai_summary:'',ai_customer_msg:''};
  j.items=j.items||[];
  function itemsHtml(){
    return j.items.map(function(it,i){
      return '<div class="item" data-i="'+i+'">'+
        '<div class="d"><input class="it-d" value="'+esc(it.name)+'" placeholder="t.ex. Hemstädning 3 rok"></div>'+
        '<input class="it-p p" type="number" step="any" value="'+esc(it.price!=null?it.price:'')+'" placeholder="Pris, kr exkl moms">'+
        '<button class="btn ghost x" data-del="'+i+'" title="Ta bort rad">✕</button></div>';
    }).join('')||'<p class="mut mini" style="margin-top:10px;">Inga poster än. Lägg till vad du gjorde.</p>';
  }
  var custOptions='<option value="">(Ny kund, skriv namnet)</option>'+
    (SC_CUSTOMERS||[]).map(function(c){return '<option value="'+c.id+'"'+(j.customer_id===c.id?' selected':'')+'>'+esc(c.name)+'</option>';}).join('');
  root().innerHTML='<div class="viewhead"><h1>'+(isNew?'Nytt jobb':'Jobb · '+dstr(j.job_date))+'</h1>'+
    '<div style="margin-left:auto;" class="row">'+
    '<select id="jb-status" style="width:150px;">'+['klar','fakturerad'].map(function(s){return '<option'+(j.status===s?' selected':'')+'>'+s+'</option>';}).join('')+'</select>'+
    (isNew?'':'<button class="btn danger" id="jb-del">Radera</button>')+'</div></div>'+
    '<div class="card"><div class="row">'+
    '<div class="field grow"><label>Kund *</label><select id="jb-cust">'+custOptions+'</select></div>'+
    '<div class="field grow" id="jb-newname-wrap" hidden><label>Kundens namn *</label><input id="jb-newname" value="'+esc(j.customer_name)+'" placeholder="t.ex. Familjen Andersson"></div>'+
    '<div class="field" style="width:170px;"><label>Datum</label><input id="jb-date" type="date" value="'+esc(j.job_date||'')+'"></div></div>'+
    '<div style="margin-top:14px;"><label>Checklista: vad gjorde du? (rut-berättigat arbete)</label><div id="items">'+itemsHtml()+'</div>'+
    '<button class="btn ghost" id="jb-add" style="margin-top:10px;">＋ Lägg till post</button></div>'+
    '<div class="row" style="margin-top:14px;">'+
    '<div class="field" style="width:160px;"><label>Material, kr (ej rut)</label><input id="jb-mat" type="number" step="any" value="'+esc(j.material||'')+'"></div>'+
    '<div class="field" style="width:120px;"><label>Moms (%)</label><select id="jb-vat">'+[25,12,6,0].map(function(v){return '<option value="'+v+'"'+(Number(j.vat)===v?' selected':'')+'>'+v+'</option>';}).join('')+'</select></div>'+
    '<div style="padding-top:22px;"><label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:.9rem;color:var(--text);font-weight:500;"><input type="checkbox" id="jb-rut" style="width:auto;"'+(j.rut?' checked':'')+'> Rut-avdrag (50 % av arbete)</label></div></div>'+
    '<div class="totals" id="totals"></div>'+
    '<div class="row" style="margin-top:22px;"><button class="btn" id="jb-save">Spara</button>'+
    '<button class="btn ghost" id="jb-pdf">Rut-underlag som PDF</button>'+
    '<button class="btn ghost" id="jb-msg">Kundmeddelande</button></div></div>'+
    '<div class="ai"><label style="text-transform:none;font-size:.9rem;color:var(--text);font-weight:600;">AI: gör underlaget av dina anteckningar</label>'+
    '<textarea id="ai-txt" placeholder="Klistra in vad du skrev på jobbet. Till exempel: hemstäd 3 rok 4h, badrummet grov, extra fönsterputs 250kr, kunden glad."></textarea>'+
    '<div class="row" style="margin-top:10px;"><button class="btn" id="ai-go">Skapa underlag med AI</button>'+
    '<span class="hint">AI:n skriver korrekt underlagstext, ett kundmeddelande och föreslår extraposter. Du redigerar allt.</span></div>'+
    (j.ai_summary?'<div style="margin-top:14px;"><label>Underlag (sparas med jobbet)</label><textarea id="ai-sum">'+esc(j.ai_summary)+'</textarea></div>'+
    '<div style="margin-top:10px;"><label>Kundmeddelande</label><textarea id="ai-cmsg">'+esc(j.ai_customer_msg||'')+'</textarea></div>':'')+'</div>';

  var custSel=document.getElementById('jb-cust');
  function custName(){
    if(custSel.value)return ((SC_CUSTOMERS||[]).filter(function(c){return c.id===custSel.value;})[0]||{}).name||'';
    return document.getElementById('jb-newname').value.trim();
  }
  custSel.onchange=function(){document.getElementById('jb-newname-wrap').hidden=!!custSel.value;};

  function readItems(){
    var arr=[];
    document.querySelectorAll('#items .item').forEach(function(row){
      var n=row.querySelector('.it-d').value.trim();
      if(n)arr.push({name:n,price:Number(row.querySelector('.it-p').value)||0});
    });
    return arr;
  }
  function drawTotals(){
    var t=jobCalc({items:readItems(),material:document.getElementById('jb-mat').value,rut:document.getElementById('jb-rut').checked,vat:document.getElementById('jb-vat').value});
    document.getElementById('totals').innerHTML=
      '<div class="t"><span>Arbete (rut-berättigat)</span><b>'+kr(t.arbete)+'</b></div>'+
      (t.rut>0?'<div class="t" style="color:var(--good);"><span>Rut-avdrag (50 % av arbete)</span><span>-'+kr(t.rut)+'</span></div>':'')+
      '<div class="t"><span>Material</span><span>'+kr(t.mat)+'</span></div>'+
      '<div class="t"><span>Moms</span><span>'+kr(t.moms)+'</span></div>'+
      '<div class="t b"><span>Kunden betalar</span><span>'+kr(t.total)+'</span></div>';
  }
  document.getElementById('items').addEventListener('input',drawTotals);
  document.getElementById('items').addEventListener('click',function(e){
    var b=e.target.closest('[data-del]');if(!b)return;
    j.items=readItems();j.items.splice(Number(b.getAttribute('data-del')),1);
    document.getElementById('items').innerHTML=itemsHtml();drawTotals();
  });
  document.getElementById('jb-add').onclick=function(){
    j.items=readItems();j.items.push({name:'',price:0});
    document.getElementById('items').innerHTML=itemsHtml();drawTotals();
    var rows=document.querySelectorAll('#items .item');var last=rows[rows.length-1];if(last)last.querySelector('.it-d').focus();
  };
  document.getElementById('jb-mat').addEventListener('input',drawTotals);
  document.getElementById('jb-rut').onchange=drawTotals;
  document.getElementById('jb-vat').onchange=drawTotals;
  drawTotals();

  function collect(){
    return {customer_id:custSel.value||null,customer_name:custName(),job_date:document.getElementById('jb-date').value,
      items:readItems(),material:Number(document.getElementById('jb-mat').value)||0,
      rut:document.getElementById('jb-rut').checked,vat:Number(document.getElementById('jb-vat').value),
      status:document.getElementById('jb-status').value,
      ai_summary:(document.getElementById('ai-sum')||{}).value||j.ai_summary||'',
      ai_customer_msg:(document.getElementById('ai-cmsg')||{}).value||j.ai_customer_msg||''};
  }
  function save(){
    var c=collect();
    if(!c.customer_name){toast('Välj kund eller skriv namnet.',true);return Promise.resolve(null);}
    if(!c.items.length){toast('Lägg till minst en arbetspost.',true);return Promise.resolve(null);}
    if(isNew){
      return sb.from('st_jobs').insert(c).select().then(function(r){
        if(r.error){toast('Kunde inte spara: '+r.error.message,true);return null;}
        SC_JOBS=null;SC_CUSTOMERS=null;logEv('job_created');
        toast('Jobbet sparat ✓');location.hash='#/jobs';
        return r.data[0];
      });
    }
    return sb.from('st_jobs').update(Object.assign({updated_at:new Date().toISOString()},c)).eq('id',j.id).then(function(r){
      if(r.error){toast('Kunde inte spara: '+r.error.message,true);return null;}
      Object.assign(j,c);SC_JOBS=null;toast('Sparat ✓');return j;
    });
  }
  document.getElementById('jb-save').onclick=function(){save();};
  document.getElementById('jb-status').onchange=function(){if(!isNew)save();};
  if(document.getElementById('jb-del'))document.getElementById('jb-del').onclick=function(){
    if(!confirm('Radera jobbet? Det går inte att ångra.'))return;
    sb.from('st_jobs').delete().eq('id',j.id).then(function(){
      SC_JOBS=null;toast('Raderat.');location.hash='#/jobs';
    });
  };
  document.getElementById('jb-pdf').onclick=function(){
    var c=collect();
    if(!c.customer_name||!c.items.length)return toast('Kund och minst en post krävs för PDF.',true);
    ensurePdf(function(){
      exportRutPdf(j,c,jobCalc(c));
      logEv('pdf_exported');
    });
  };
  document.getElementById('jb-msg').onclick=function(){
    var c=collect(),t=jobCalc(c);
    if(!c.customer_name)return toast('Välj kund först.',true);
    var msg=c.ai_customer_msg||('Hej '+c.customer_name+',\n\nTack för idag! Så här ser underlaget ut för '+dstr(c.job_date)+':\n\n'+
      c.items.map(function(it){return it.name+': '+kr(it.price);}).join('\n')+
      '\n\nArbete: '+kr(t.arbete)+(t.rut>0?'\nRut-avdrag (50 %): -'+kr(t.rut):'')+
      (t.mat>0?'\nMaterial: '+kr(t.mat):'')+
      '\nAtt betala: '+kr(t.total)+'\n\nHör av dig om du har frågor.');
    var to=((SC_CUSTOMERS||[]).filter(function(x){return x.id===c.customer_id;})[0]||{}).contact||'';
    if(to.indexOf('@')!==-1)location.href='mailto:'+to+'?subject='+encodeURIComponent('Rut-underlag '+dstr(c.job_date))+'&body='+encodeURIComponent(msg);
    else{navigator.clipboard&&navigator.clipboard.writeText(msg);toast('Meddelandet är kopierat, klistra in det i SMS eller mejl.');}
  };
  document.getElementById('ai-go').onclick=function(){
    var txt=document.getElementById('ai-txt').value.trim();
    if(!txt)return toast('Klistra in dina anteckningar först.',true);
    var key=groqKey();
    if(!key)return toast('Lägg in din gratis Groq-nyckel under Inställningar först.',true);
    var btn=this;btn.disabled=true;btn.textContent='Skapar underlag…';
    var c=collect();
    fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:'meta-llama/llama-4-scout-17b-16e-instruct',temperature:0.2,max_tokens:900,
        messages:[{role:'system',content:'Du hjälper svenska städfirmor skriva rut-underlag enligt Skatteverkets krav. Från firmanäsarens slarviga anteckningar skapar du: 1) en saklig beskrivning av utfört arbete (svenska, proffsig ton, utan kyliga klyschor), 2) ett kort vänligt meddelande till kunden (hälsning, vad som gjorts, tack, erbjudande att höra av sig), 3) extra arbetsposter du förstår gjordes men saknas i listan, med rimliga svenska priser exkl moms. Svara ENDAST med JSON: {"summary": str, "customer_msg": str, "extra": [{"name": str, "price": tal}]}. Ingen annan text.'},
          {role:'user',content:'Kund: '+c.customer_name+'. Datum: '+c.job_date+'. Poster redan i listan: '+JSON.stringify(c.items)+'. Anteckningar: '+txt}]})})
    .then(function(r){return r.json();})
    .then(function(d){
      btn.disabled=false;btn.textContent='Skapa underlag med AI';
      var content=d.choices&&d.choices[0]&&d.choices[0].message?d.choices[0].message.content:'';
      var m=content.match(/\{[\s\S]*\}/);
      if(!m)return toast('AI svarade ofullständigt. Testa igen.',true);
      var out=JSON.parse(m[0]);
      j.ai_summary=String(out.summary||'');j.ai_customer_msg=String(out.customer_msg||'');
      var extra=(out.extra||[]).filter(function(x){return x&&x.name;});
      if(extra.length){j.items=readItems();extra.forEach(function(x){j.items.push({name:String(x.name),price:Number(x.price)||0});});document.getElementById('items').innerHTML=itemsHtml();}
      var o1=document.getElementById('ai-sum'),o2=document.getElementById('ai-cmsg');
      if(o1)o1.parentNode.remove();
      if(o2)o2.parentNode.remove();
      var box=document.createElement('div');
      box.innerHTML='<div style="margin-top:14px;"><label>Underlag (sparas med jobbet)</label><textarea id="ai-sum">'+esc(j.ai_summary)+'</textarea></div><div style="margin-top:10px;"><label>Kundmeddelande</label><textarea id="ai-cmsg">'+esc(j.ai_customer_msg)+'</textarea></div>';
      document.querySelector('.ai').appendChild(box);
      drawTotals();
      logEv('ai_used');
      toast('Underlaget klart. Läs igenom och justera.');
    }).catch(function(){btn.disabled=false;btn.textContent='Skapa underlag med AI';toast('AI:n svarade inte. Testa igen.',true);});
  };
}

function exportRutPdf(meta,c,t){
  var p=SC_PROFILE||{};
  var doc=new window.jspdf.jsPDF();
  var y=20;
  doc.setFont('helvetica','bold');doc.setFontSize(16);
  doc.text(p.company_name||'Min städfirma',14,y);
  doc.setFont('helvetica','normal');doc.setFontSize(9);
  if(p.org_no)doc.text('Org.nummer: '+p.org_no,14,y+6);
  if(p.phone)doc.text('Tel: '+p.phone,14,y+(p.org_no?11:6));
  if(p.contact_email)doc.text(p.contact_email,14,y+(p.org_no&&p.phone?16:(p.org_no||p.phone?11:6)));
  doc.setFont('helvetica','bold');doc.setFontSize(18);
  doc.text('RUT-UNDERLAG',128,y);
  doc.setFont('helvetica','normal');doc.setFontSize(9);
  doc.text('Arbetsdatum: '+dstr(c.job_date),128,y+6);
  doc.text('Fakturanummer: ____________',128,y+11);
  y+=24;
  doc.setFontSize(11);doc.setFont('helvetica','bold');
  doc.text('Kund: '+c.customer_name,14,y);y+=10;
  doc.setDrawColor(210,225,217);doc.line(14,y,196,y);y+=8;
  doc.setFontSize(9);doc.setFont('helvetica','bold');
  doc.text('Utfört arbete',14,y);doc.text('Kostnad',185,y,{align:'right'});y+=4;
  doc.line(14,y,196,y);y+=7;
  doc.setFont('helvetica','normal');
  c.items.forEach(function(it){
    var n=String(it.name);if(n.length>75)n=n.slice(0,72)+'...';
    doc.text(n,14,y);doc.text(kr(it.price),196,y,{align:'right'});y+=7;
    if(y>240){doc.addPage();y=20;}
  });
  y+=3;doc.line(14,y,196,y);y+=8;
  doc.text('Arbetskostnad (rut-berättigad)',14,y);doc.text(kr(t.arbete),196,y,{align:'right'});y+=7;
  if(t.mat>0){doc.text('Material (ej rut-berättigat)',14,y);doc.text(kr(t.mat),196,y,{align:'right'});y+=7;}
  if(t.rut>0){doc.text('Rut-avdrag (50 % av arbetskostnaden)',14,y);doc.text('-'+kr(t.rut),196,y,{align:'right'});y+=7;}
  if(t.moms>0){doc.text('Moms ('+c.vat+' %)',14,y);doc.text(kr(t.moms),196,y,{align:'right'});y+=7;}
  doc.setFont('helvetica','bold');doc.setFontSize(12);
  doc.text('Att betala',14,y);doc.text(kr(t.total),196,y,{align:'right'});
  if(c.ai_summary){
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    y+=12;doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Beskrivning av utfört arbete',14,y);
    doc.setFont('helvetica','normal');doc.setFontSize(9);y+=6;
    var lines=doc.splitTextToSize(c.ai_summary,182);
    lines.forEach(function(l){if(y>275){doc.addPage();y=20;}doc.text(l,14,y);y+=5;});
  }
  doc.setFontSize(8);doc.text('Underlag enligt Skatteverkets krav för rut. Spara i sju år. Skapad med Städcheck.',14,288);
  doc.save('rut-underlag-'+(c.job_date||'')+'.pdf');
  toast('PDF:n laddas ner.');
}
