/* OffertPilot — offertbyggaren, PDF, AI, admin */
'use strict';

function openOffer(id){
  var o=(OP_OFFERS||[]).filter(function(x){return x.id===id;})[0];
  if(o)return renderOfferEditor(o);
  root().innerHTML='<div class="skel" style="width:50%"></div><div class="skel"></div><div class="skel"></div>';
  sb.from('op_offers').select('*').eq('id',id).maybeSingle().then(function(r){
    if(r.error||!r.data){toast('Offerten hittades inte.',true);location.hash='#/dashboard';return;}
    renderOfferEditor(r.data);
  });
}

function renderOfferEditor(o){
  var isNew=!o;
  o=o||{customer_name:'',customer_contact:'',items:[],vat:25,rot:true,status:'utkast',notes:'',number:null};
  o.items=o.items||[];
  function itemsHtml(){
    return o.items.map(function(it,i){
      return '<div class="item" data-i="'+i+'">'+
        '<div class="d"><input class="it-d" value="'+esc(it.desc)+'" placeholder="Till exempel: Målning vardagsrum"></div>'+
        '<input class="it-q q" type="number" step="any" value="'+esc(it.qty!=null?it.qty:'')+'" placeholder="Antal">'+
        '<select class="it-u u">'+['st','tim','m','rpl'].map(function(u){return '<option'+(it.unit===u?' selected':'')+'>'+u+'</option>';}).join('')+'</select>'+
        '<input class="it-p p" type="number" step="any" value="'+esc(it.price!=null?it.price:'')+'" placeholder="À-pris">'+
        '<button class="btn ghost x" data-del="'+i+'" title="Ta bort rad">✕</button></div>';
    }).join('')||'<p class="mut mini" id="noitems" style="margin-top:10px">Inga poster än. Lägg till din första arbetspost nedan.</p>';
  }
  root().innerHTML=
    '<div class="viewhead"><h1>'+(isNew?'Ny offert':'Offert #'+o.number)+'</h1>'+
    '<div style="margin-left:auto" class="row">'+
    '<select id="of-status" style="width:150px">'+['utkast','skickad','accepterad','avslagen'].map(function(s){return '<option'+(o.status===s?' selected':'')+'>'+s+'</option>';}).join('')+'</select>'+
    (isNew?'':'<button class="btn danger" id="of-del">Radera</button>')+'</div></div>'+
    '<div class="card"><div class="row"><div class="field grow"><label>Kund *</label><input id="of-name" value="'+esc(o.customer_name)+'" placeholder="Kundens namn eller firma"></div>'+
    '<div class="field grow"><label>Kontakt (mejl eller telefon)</label><input id="of-ct" value="'+esc(o.customer_contact)+'"></div></div>'+
    '<div class="row"><div class="field" style="width:130px"><label>Moms (%)</label><select id="of-vat">'+[25,12,6,0].map(function(v){return '<option value="'+v+'"'+(Number(o.vat)===v?' selected':'')+'>'+v+'</option>';}).join('')+'</select></div>'+
    '<div style="padding-top:22px"><label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:.9rem;color:var(--text);font-weight:500"><input type="checkbox" id="of-rot" style="width:auto"'+(o.rot?' checked':'')+'> ROT-avdrag (30% på arbete)</label></div></div>'+
    '<div style="margin-top:14px"><label>Arbetsposter</label><div id="items">'+itemsHtml()+'</div>'+
    '<button class="btn ghost" id="of-add" style="margin-top:10px">＋ Lägg till post</button></div>'+
    '<div class="totals" id="totals"></div>'+
    '<div class="row" style="margin-top:22px"><button class="btn" id="of-save">Spara</button>'+
    '<button class="btn ghost" id="of-pdf">Ladda ner PDF</button>'+
    '<button class="btn ghost" id="of-send">Skicka via mejl</button></div></div>'+
    '<div class="ai"><label style="text-transform:none;font-size:.9rem;color:var(--text);font-weight:600">AI: fyll posterna från en beskrivning</label>'+
    '<textarea id="ai-txt" placeholder="Till exempel: Måla om vardagsrum 25 kvm med två lager, spackla och slipa först, behov material och täckplast. Typ 8 timmar arbete."></textarea>'+
    '<div class="row" style="margin-top:10px"><button class="btn" id="ai-go">Fyll poster med AI</button>'+
    '<span class="hint">AI föreslår poster och priser. Du kan ändra allt innan du sparar.</span></div></div>';

  function readItems(){
    var arr=[];
    document.querySelectorAll('#items .item').forEach(function(row){
      var d=row.querySelector('.it-d').value.trim();
      var it={desc:d,qty:Number(row.querySelector('.it-q').value)||0,unit:row.querySelector('.it-u').value,price:Number(row.querySelector('.it-p').value)||0};
      if(d)arr.push(it);
    });
    return arr;
  }
  function drawTotals(){
    var t=offerTotal({items:readItems(),vat:document.getElementById('of-vat').value,rot:document.getElementById('of-rot').checked});
    document.getElementById('totals').innerHTML=
      '<div class="t"><span>Summa arbete och material</span><b>'+kr(t.sum)+'</b></div>'+
      (t.rot?'<div class="t" style="color:var(--good)"><span>ROT-avdrag (30% av arbete)</span><span>'+kr(t.rot)+'</span></div>':'')+
      '<div class="t"><span>Moms</span><span>'+kr(t.vat)+'</span></div>'+
      '<div class="t b"><span>Totalt att betala</span><span>'+kr(t.total)+'</span></div>';
  }
  document.getElementById('items').addEventListener('input',drawTotals);
  document.getElementById('items').addEventListener('change',drawTotals);
  document.getElementById('items').addEventListener('click',function(e){
    var b=e.target.closest('[data-del]');if(!b)return;
    o.items=readItems();o.items.splice(Number(b.getAttribute('data-del')),1);
    document.getElementById('items').innerHTML=itemsHtml();drawTotals();
  });
  document.getElementById('of-add').onclick=function(){
    o.items=readItems();o.items.push({desc:'',qty:1,unit:'st',price:0});
    document.getElementById('items').innerHTML=itemsHtml();drawTotals();
    var rows=document.querySelectorAll('#items .item');var last=rows[rows.length-1];if(last)last.querySelector('.it-d').focus();
  };
  document.getElementById('of-vat').onchange=drawTotals;
  document.getElementById('of-rot').onchange=drawTotals;
  drawTotals();

  function collect(){
    return {customer_name:document.getElementById('of-name').value.trim(),
      customer_contact:document.getElementById('of-ct').value.trim(),
      items:readItems(),vat:Number(document.getElementById('of-vat').value),
      rot:document.getElementById('of-rot').checked,
      status:document.getElementById('of-status').value,notes:o.notes||''};
  }
  function save(){
    var c=collect();
    if(!c.customer_name){toast('Kundens namn krävs.',true);return Promise.resolve(null);}
    if(!c.items.length){toast('Lägg till minst en arbetspost.',true);return Promise.resolve(null);}
    if(isNew){
      return sb.from('op_offers').insert(c).select().then(function(r){
        if(r.error){toast('Kunde inte spara: '+r.error.message,true);return null;}
        var created=r.data[0];
        sb.from('op_offers').select('number').order('number',{ascending:false}).limit(1).then(function(mx){
          var num=(mx.data&&mx.data[0]?mx.data[0].number:0)+1;
          sb.from('op_offers').update({number:num}).eq('id',created.id).then(function(){
            created.number=num;refreshCache(created);logEv('offer_created');
            toast('Sparat som offert #'+num+'.');location.hash='#/offer/'+created.id;
          });
        });
        OP_OFFERS=null;return created;
      });
    }
    return sb.from('op_offers').update(c).eq('id',o.id).then(function(r){
      if(r.error){toast('Kunde inte spara: '+r.error.message,true);return null;}
      Object.assign(o,c);refreshCache(o);toast('Sparat.');return o;
    });
  }
  function refreshCache(obj){
    if(!OP_OFFERS)OP_OFFERS=[];
    var i=OP_OFFERS.findIndex(function(x){return x.id===obj.id;});
    if(i===-1)OP_OFFERS.unshift(obj);else OP_OFFERS[i]=obj;
  }
  document.getElementById('of-save').onclick=function(){save();};
  document.getElementById('of-status').onchange=function(){if(!isNew)save();};
  if(document.getElementById('of-del'))document.getElementById('of-del').onclick=function(){
    if(!confirm('Radera offert #'+o.number+'? Det går inte att ångra.'))return;
    sb.from('op_offers').delete().eq('id',o.id).then(function(){
      OP_OFFERS=null;toast('Raderad.');location.hash='#/dashboard';
    });
  };
  document.getElementById('of-pdf').onclick=function(){
    var c=collect();
    if(!c.customer_name||!c.items.length)return toast('Kund och minst en post krävs för PDF.',true);
    ensurePdf(function(){
      exportPdf({number:o.number||'UTKAST',created_at:o.created_at||new Date().toISOString()},c);
      logEv('pdf_exported');
    });
  };
  document.getElementById('of-send').onclick=function(){
    var c=collect(),t=offerTotal(c);
    if(!c.customer_name||!c.items.length)return toast('Spara kund och poster först.',true);
    var to=c.customer_contact.indexOf('@')!==-1?c.customer_contact:'';
    var body='Hej '+c.customer_name+',\n\nHär kommer offert #'+(o.number||'utkast')+' från '+(OP_PROFILE&&OP_PROFILE.company_name||'mitt företag')+'.\n\n'+
      c.items.map(function(it){return it.desc+': '+(it.qty||0)+' '+it.unit+' à '+kr(it.price);}).join('\n')+
      '\n\nTotalt att betala: '+kr(t.total)+(c.rot?' (ROT-avdrag medräknat)':'')+'\n\nSvara gärna på mejlet om du har frågor.';
    if(to)location.href='mailto:'+to+'?subject='+encodeURIComponent('Offert #'+(o.number||'')+' från '+(OP_PROFILE&&OP_PROFILE.company_name||''))+'&body='+encodeURIComponent(body);
    else{navigator.clipboard&&navigator.clipboard.writeText(body);toast('Ingen mejladress på kunden. Texten är kopierad, klistra in den i mejlet eller SMS.');}
  };
  document.getElementById('ai-go').onclick=function(){
    var txt=document.getElementById('ai-txt').value.trim();
    if(!txt)return toast('Beskriv jobbet först.',true);
    var key=groqKey();
    if(!key)return toast('Lägg in din gratis Groq-nyckel under Inställningar först.',true);
    var btn=document.getElementById('ai-go');btn.disabled=true;btn.textContent='Tänker…';
    fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:'meta-llama/llama-4-scout-17b-16e-instruct',temperature:0.2,max_tokens:700,
        messages:[{role:'system',content:'Du är en hantverksassistent. Från jobbets beskrivning skapar du arbetsposter till en offert. Svara ENDAST med JSON: en lista [{"desc":str,"qty":tal,"unit":"st|tim|m|rpl","price":tal}] med priser i kronor enligt svenska normalnivåer. Ingen annan text.'},
          {role:'user',content:txt}]})})
    .then(function(r){return r.json();})
    .then(function(d){
      btn.disabled=false;btn.textContent='Fyll poster med AI';
      var content=d.choices&&d.choices[0]&&d.choices[0].message?d.choices[0].message.content:'';
      var m=content.match(/\[[\s\S]*\]/);
      if(!m)return toast('AI svarade ofullständigt. Testa igen.',true);
      var items=JSON.parse(m[0]).filter(function(it){return it&&it.desc;});
      if(!items.length)return toast('AI hittade inga poster.',true);
      o.items=readItems().filter(function(it){return it.desc;});
      o.items=o.items.concat(items.map(function(it){return {desc:String(it.desc),qty:Number(it.qty)||1,unit:['st','tim','m','rpl'].indexOf(it.unit)!==-1?it.unit:'st',price:Number(it.price)||0};}));
      document.getElementById('items').innerHTML=itemsHtml();drawTotals();
      logEv('ai_used');toast(items.length+' poster fyllda. Justera och spara.');
    }).catch(function(){btn.disabled=false;btn.textContent='Fyll poster med AI';toast('AI:n svarade inte. Testa igen.',true);});
  };
}

function ensurePdf(cb){
  if(window.jspdf)return cb();
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
  s.onload=cb;s.onerror=function(){toast('Kunde inte ladda PDF-modulen. Kontrollera nätet.',true);};
  document.head.appendChild(s);
}

function exportPdf(meta,c){
  var p=OP_PROFILE||{};
  var doc=new window.jspdf.jsPDF();
  var y=20;
  doc.setFont('helvetica','bold');doc.setFontSize(16);
  doc.text(p.company_name||'Min firma',14,y);
  doc.setFont('helvetica','normal');doc.setFontSize(9);
  if(p.org_no)doc.text('Org.nr: '+p.org_no,14,y+6);
  if(p.phone)doc.text('Tel: '+p.phone,14,y+(p.org_no?11:6));
  if(p.contact_email)doc.text(p.contact_email,14,y+(p.org_no&&p.phone?16:(p.org_no||p.phone?11:6)));
  doc.setFont('helvetica','bold');doc.setFontSize(18);
  doc.text('OFFERT #'+meta.number,150,y);
  doc.setFont('helvetica','normal');doc.setFontSize(9);
  doc.text('Datum: '+dstr(meta.created_at),150,y+6);
  y=y+22;
  doc.setFontSize(11);doc.setFont('helvetica','bold');
  doc.text('Kund: '+c.customer_name,14,y);y+=8;
  if(c.customer_contact){doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(c.customer_contact,14,y);y+=10;}
  y+=2;
  doc.setDrawColor(220,220,232);doc.line(14,y,196,y);y+=8;
  doc.setFontSize(9);doc.setFont('helvetica','bold');
  doc.text('Arbetspost',14,y);doc.text('Antal',130,y);doc.text('À-pris',155,y);doc.text('Summa',185,y,{align:'right'});y+=4;
  doc.line(14,y,196,y);y+=7;
  doc.setFont('helvetica','normal');
  var t=offerTotal(c);
  c.items.forEach(function(it){
    var sum=(Number(it.qty)||0)*(Number(it.price)||0);
    var d=String(it.desc);
    if(d.length>60){d=d.slice(0,57)+'...';}
    doc.text(d,14,y);doc.text(String(it.qty)+' '+it.unit,130,y);doc.text(kr(it.price),155,y);doc.text(kr(sum),196,y,{align:'right'});
    y+=7;
    if(y>250){doc.addPage();y=20;}
  });
  y+=3;doc.line(14,y,196,y);y+=8;
  doc.text('Summa',14,y);doc.text(kr(t.sum),196,y,{align:'right'});y+=7;
  if(t.rot){doc.text('ROT-avdrag (30% av arbete)',14,y);doc.text('-'+kr(t.rot),196,y,{align:'right'});y+=7;}
  doc.text('Moms ('+c.vat+'%)',14,y);doc.text(kr(t.vat),196,y,{align:'right'});y+=8;
  doc.setFont('helvetica','bold');doc.setFontSize(12);
  doc.text('Totalt att betala',14,y);doc.text(kr(t.total),196,y,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(8);
  doc.text('Skapad med OffertPilot',14,288);
  doc.save('offert-'+meta.number+'.pdf');
  toast('PDF:n laddas ner.');
}

/* ---------- Admin ---------- */
function renderAdmin(){
  if(!OP_PROFILE||!OP_PROFILE.is_admin){
    root().innerHTML='<h1>Admin</h1><div class="empty" style="max-width:520px;margin-top:18px">Du har inte adminrättigheter.</div>';return;
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
