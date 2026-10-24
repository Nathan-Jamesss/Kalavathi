(function(root){
  'use strict';
  const classes=['cardiac','trauma','obstetric','paediatric','general'];
  const active=s=>['pending','confirmed','granted','redirected_in'].includes(s);
  function summary(record){
    const history=Array.isArray(record?.history)?record.history.filter(h=>h&&typeof h==='object'):[];
    if(history.some(h=>String(h.outcome).toLowerCase().replaceAll('_','-')==='expired-unconfirmed'))return {label:'UNCONFIRMED CLAIMS ON RECORD',rule:'At least one request expired without confirmation.',tier:'bad'};
    if(!history.length)return {label:'MIXED RECORD',rule:'No previous outcomes are available for assessment.',tier:''};
    if(history.every(h=>['hospital-confirmed','arrival-confirmed'].includes(String(h.outcome).toLowerCase().replaceAll('_','-'))))return {label:'CLEAN RECORD',rule:'Every recorded outcome is hospital-confirmed or arrival-confirmed.',tier:'good'};
    return {label:'MIXED RECORD',rule:'Includes self-cancelled or other outcomes; none expired unconfirmed.',tier:''};
  }
  function validRequest(r){return r&&typeof r.request_id==='string'&&typeof r.device_id==='string'&&typeof r.status==='string';}
  function over(r){return Number(r.record?.presses_used)>Number(r.record?.presses_allowed);}
  function mayAct(r){return !!r&&(r.signature_valid===true||(r.signature_valid===null&&r.security_mode==='software_demo'))&&active(r.status);}
  if(typeof module!=='undefined'&&module.exports){module.exports={summary,over,mayAct,validRequest};return;}
  const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n;};
  const mock=new URLSearchParams(location.search).get('mock')==='1';
  let hospitalId='city';try{hospitalId=decodeURIComponent(location.pathname.match(/^\/hospital\/([^/]+)/)?.[1]||'city');}catch{}
  const api='/api/hospital/'+encodeURIComponent(hospitalId),fixtures=root.HospitalFixtures;
  let requests=[],selectedId=null,view='queue',online=false,busy=false,accepting=null,history=[],sequence=0,audio=null,alertActive=false;
  let socket=null,pollTimer=null,retryTimer=null,retries=0,stopped=false,version=0,connection='connecting',sheet=null,hold=null;
  const seen=new Set(),etaClocks=new Map();
  const selected=()=>requests.find(r=>r.request_id===selectedId);
  const usable=()=>online&&!busy;
  function eta(r){const clock=etaClocks.get(r.request_id);const seconds=Math.max(0,Number(r.eta_s)-(clock?(performance.now()-clock.at)/1000:0));return Number.isFinite(seconds)?Math.ceil(seconds/60)+' min':'ETA unavailable';}
  function distance(m){return Number.isFinite(Number(m))?(Number(m)/1000).toFixed(1)+' km':'Distance unavailable';}
  function count(v){return Math.max(0,Math.floor(Number(v)||0));}
  function time(ts){const d=new Date(ts);return Number.isNaN(d.getTime())?'Time unavailable':d.toLocaleString();}
  function chip(r){return el('span',over(r)?'OVER-LIMIT':r.trust_tier==='hospital_verified'?'HOSPITAL-VERIFIED':'SELF-DECLARED','chip '+(over(r)?'bad':r.trust_tier==='hospital_verified'?'good':''));}
  function connectState(kind){
    connection=kind;online=['live','polling','mock'].includes(kind);
    const banner=$('hospital-connection');banner.hidden=kind==='mock'||kind==='live';banner.classList.toggle('offline',kind==='offline');
    banner.textContent=kind==='offline'?'Offline. Reconnecting — decisions disabled.':kind==='polling'?'Connected by polling · reconnecting live updates…':'Connecting to hospital service…';
    if(!online)abortHold();updateControls();
  }
  function updateControls(){
    const r=selected();document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=!usable()||!mayAct(r)||(b.dataset.action==='confirm'&&(over(r)||r.hospital_confirmed))||(b.dataset.action==='approve_over_limit'&&r.hospital_confirmed);});
    document.querySelectorAll('[data-queue-accept]').forEach(button=>{const item=requests.find(x=>x.request_id===button.dataset.queueAccept);button.disabled=!usable()||!mayAct(item)||item?.hospital_confirmed===true;});
    $('availability').disabled=!usable();$('availability').textContent=accepting===null?'Set availability':accepting?'Open for arrivals':'Diverting patients';$('availability').classList.toggle('diverting',accepting===false);$('availability').setAttribute('aria-pressed',String(accepting===true));
    $('decision-submit').disabled=!usable()||!sheet||(sheet.kind!=='availability'&&(!mayAct(r)||r.request_id!==sheet.requestId));
  }
  function resetAlert(){alertActive=false;$('incoming-alert').hidden=true;document.title='Kalavathi · Hospital';}
  function notify(){
    alertActive=true;$('incoming-alert').hidden=false;document.title='NEW PATIENT · Kalavathi';
    try{navigator.vibrate?.([180,80,180]);}catch{}
    try{if(audio?.state==='running'){const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=880;g.gain.setValueAtTime(.12,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.25);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.26);}}catch{}
  }
  function prime(){try{const A=root.AudioContext||root.webkitAudioContext;if(A){audio=audio||new A();audio.resume().catch(()=>{});}}catch{}}
  document.addEventListener('pointerdown',prime,{once:true});document.addEventListener('keydown',prime,{once:true});
  function ingest(payload){
    const list=Array.isArray(payload)?payload:payload?.requests;
    if(!Array.isArray(list)||!list.every(validRequest))throw Error('Invalid incoming request data');
    let incoming=false;
    for(const r of list){if(!seen.has(r.request_id)&&active(r.status))incoming=true;seen.add(r.request_id);const previous=etaClocks.get(r.request_id);if(!previous||previous.eta!==r.eta_s)etaClocks.set(r.request_id,{at:performance.now(),eta:r.eta_s});}
    requests=list.slice().sort((a,b)=>(Date.parse(b.received_at)||0)-(Date.parse(a.received_at)||0));
    if(!Array.isArray(payload)){if(typeof payload.accepting==='boolean')accepting=payload.accepting;if(typeof payload.hospital?.name==='string')$('hospital-name').textContent=payload.hospital.name;if(Array.isArray(payload.hospital?.tags))$('hospital-tags').textContent=payload.hospital.tags.join(' · ');}
    if(sheet&&sheet.kind!=='availability'&&!mayAct(selected()))closeSheet();
    if(hold&&!mayAct(selected()))abortHold();
    if(incoming)$('hospital-feedback').textContent='';
    if(hold&&mayAct(selected()))updateControls();else render();if(incoming)notify();
  }
  function render(){
    abortHold();const target=$('hospital-view');target.replaceChildren();target.setAttribute('aria-label',view==='history'?'Session decisions':selectedId?'Request detail':'Incoming requests');
    $('queue-count').textContent=String(requests.filter(r=>active(r.status)).length);
    for(const [id,current] of [['queue-tab',view==='queue'],['history-tab',view==='history']]){if(current)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}
    if(view==='history')renderHistory(target);else if(selectedId)renderDetail(target);else renderQueue(target);
    updateControls();
  }
  function renderQueue(target){
    const incoming=requests.filter(r=>active(r.status));
    if(!incoming.length){const empty=el('div',null,'empty-state');empty.append(el('h2','No patients waiting'),el('p','A new patient will appear here when their device requests this hospital.'));const latest=requests[0];if(latest&&!active(latest.status))empty.append(el('p',latest.expiry_reason==='hospital response timed out'?'The previous request expired before acceptance. The patient needs a new token.':'Previous patient: '+(latest.expiry_reason||latest.status).replaceAll('_',' '),'previous-status'));target.append(empty);return;}
    const grid=el('div',null,'queue-grid');
    for(const r of incoming){
      const card=el('article',null,'request-card');
      card.append(el('span',r.hospital_confirmed?'Patient accepted':'Waiting for acceptance','intake-label'),el('h2',r.destination?.name||$('hospital-name').textContent));
      const etaText=el('strong',eta(r)+' to arrival');etaText.dataset.eta=r.request_id;etaText.dataset.detail='1';card.append(etaText,el('span',distance(r.distance_m)+' · '+r.declared_type),chip(r));
      const record=r.record||{},tier=summary(record);card.append(el('span',`${count(record.presses_used)} of ${count(record.presses_allowed)} device presses used`));
      if(tier.tier==='bad')card.append(el('p','Review needed: earlier claims expired unconfirmed.','intake-warning'));
      if(r.redirected_from)card.append(el('span','Redirected from '+r.redirected_from));
      if(r.token_id)card.append(el('small','Token …'+r.token_id.slice(-8)));
      if(!r.hospital_confirmed){
        const button=el('button',over(r)?'Review & accept over-limit patient':'Accept patient & confirm token','accept-patient');button.type='button';button.dataset.queueAccept=r.request_id;button.onclick=()=>{selectedId=r.request_id;resetAlert();openSheet(over(r)?'approve_over_limit':'confirm');};card.insertBefore(button,card.children[2]||null);
        if(!mayAct(r))card.append(el('p','Acceptance disabled: the device record could not be verified.','intake-warning'));
        else{const reply=el('p',null,'reply-clock');reply.dataset.reply=r.request_id;card.append(reply);}
      }else card.append(el('p','Accepted. The patient phone and traffic control have been updated.','accepted-message'));
      const details=el('button','View patient & device record','secondary');details.type='button';details.onclick=()=>{selectedId=r.request_id;resetAlert();render();window.scrollTo(0,0);};card.append(details);grid.append(card);
    }target.append(grid);
  }
  function renderDetail(target){
    const back=el('button','← Incoming queue','secondary');back.type='button';back.onclick=()=>{selectedId=null;render();};target.append(back);
    const r=selected();if(!r){target.append(el('p','This request is no longer in the incoming queue. It may have been handled elsewhere.','empty-state'));return;}
    const stack=el('div',null,'detail-stack'),arrival=el('section',null,'arrival-block');
    const etaText=el('h2',eta(r)+' to arrival');etaText.dataset.eta=r.request_id;etaText.dataset.detail='1';arrival.append(etaText,el('p',distance(r.distance_m)),el('p',r.declared_type+' · claimed by driver'),chip(r));
    if(r.token_id)arrival.append(el('p','Token '+r.token_id));if(r.redirected_from)arrival.append(el('p','Redirected from '+r.redirected_from));stack.append(arrival);
    const record=r.record||{},tier=summary(record),panel=el('section',null,'record-panel');panel.append(el('h2','DEVICE RECORD'),el('p',`${count(record.presses_used)} of ${count(record.presses_allowed)} presses used this period`));
    const dots=el('div',null,'quota-dots');dots.setAttribute('aria-label',`${count(record.presses_used)} used of ${count(record.presses_allowed)} allowed`);for(let i=0;i<Math.min(30,count(record.presses_allowed));i++)dots.append(el('span',null,'quota-dot'+(i<count(record.presses_used)?'':' used')));panel.append(dots);
    const tableWrap=el('div',null,'history-table-wrap'),table=el('table',null,'history-table'),head=el('thead'),tr=el('tr');tr.append(el('th','Date / time'),el('th','Outcome'));head.append(tr);table.append(head);const body=el('tbody');
    for(const h of (Array.isArray(record.history)?record.history:[]).slice(0,50)){const row=el('tr');row.append(el('td',time(h.ts)));const cell=el('td'),outcome=String(h.outcome||'unknown').replaceAll('_','-');cell.append(el('span',outcome,'chip '+(outcome.toLowerCase()==='expired-unconfirmed'?'bad':['hospital-confirmed','arrival-confirmed'].includes(outcome.toLowerCase())?'good':'')));row.append(cell);body.append(row);}table.append(body);tableWrap.append(table);panel.append(tableWrap);
    const software=r.signature_valid===null&&r.security_mode==='software_demo';
    panel.append(el('p',tier.label,'chip '+tier.tier),el('p',tier.rule,'record-rule'),el('p',software?'Software demo record · no device signature':r.signature_valid===true?(mock?'Signature verified · simulated':'Signature verified'):'INVALID SIGNATURE','signature'+(r.signature_valid===true||software?'':' invalid')));
    const details=el('details'),label=el('summary','Device ID / key fingerprint');details.append(label,el('p',r.device_id),el('p',typeof r.key_fingerprint==='string'?r.key_fingerprint:'Key fingerprint not supplied'));panel.append(details);stack.append(panel);
    const route=el('section',null,'mini-route');route.append(el('h2','Route progress'));const list=el('ol',null,'junctions');
    for(const j of (Array.isArray(r.junctions)?r.junctions:[]).slice(0,4)){const li=el('li'),state=['passed','green','reserved','released'].includes(j.state)?j.state:'released';li.append(el('span',null,'junction-marker '+state),el('strong',j.id),el('span',state));li.setAttribute('aria-label',j.name+': '+state);list.append(li);}route.append(list);stack.append(route);
    if(!active(r.status))stack.append(el('p',r.reason||(r.status==='cancelled'?'Cancelled by driver.':'Already handled elsewhere.'),'status-note'));
    else if(!mayAct(r))stack.append(el('p','Decisions disabled because the device record signature is invalid or missing.','status-note'));
    const actions=el('div',null,'request-actions'),row=el('div',null,'action-row');
    const confirm=actionButton('Accept patient & confirm token','confirm');row.append(confirm);
    if(over(r))row.append(actionButton('Approve over-limit','approve_over_limit'));
    row.append(actionButton('Redirect','redirect','secondary'));actions.append(row);
    if(r.trust_tier==='hospital_verified'&&active(r.status)){
      const revoke=actionButton('Revoke · hold 2 seconds','revoke','revoke');
      revoke.onclick=e=>e.preventDefault();
      function start(e){if(!usable()||!mayAct(selected())||hold)return;if(e.type==='keydown'&&![' ','Enter'].includes(e.key))return;if(e.type==='pointerdown'&&(e.button!==0||e.isPrimary===false))return;e.preventDefault();if(e.pointerId!==undefined)revoke.setPointerCapture(e.pointerId);const id=r.request_id;hold={timer:setTimeout(()=>{hold=null;if(selectedId===id&&mayAct(selected()))openSheet('revoke');},2000)};}
      revoke.addEventListener('pointerdown',start);revoke.addEventListener('keydown',start);for(const event of ['pointerup','pointercancel','lostpointercapture','keyup','blur'])revoke.addEventListener(event,abortHold);
      revoke.addEventListener('pointermove',e=>{const b=revoke.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)abortHold();});actions.append(revoke);
    }stack.append(actions);target.append(stack);
  }
  function actionButton(text,action,cls){const b=el('button',text,cls);b.type='button';b.dataset.action=action;b.onclick=()=>openSheet(action);return b;}
  function renderHistory(target){const list=el('div',null,'history-list');if(!history.length&&!requests.some(r=>!active(r.status)))list.append(el('p','No previous requests or decisions','empty-state'));for(const h of history){const item=el('article',null,'history-item');item.append(el('strong',h.outcome),el('p',h.device),el('time',time(h.ts)));list.append(item);}for(const r of requests.filter(r=>!active(r.status))){const item=el('article',null,'history-item');item.append(el('strong',(r.expiry_reason||r.status).replaceAll('_',' ')),el('p',r.device_id),el('time',time(r.closed_at||r.received_at)));list.append(item);}target.append(list);}
  function abortHold(){if(hold){clearTimeout(hold.timer);hold=null;}}
  addEventListener('blur',abortHold);document.addEventListener('visibilitychange',()=>{if(document.hidden)abortHold();});document.addEventListener('keydown',e=>{if(e.key==='Escape')abortHold();});
  function closeSheet(){sheet=null;$('decision-sheet').close();}
  $('sheet-close').onclick=closeSheet;$('decision-sheet').addEventListener('cancel',()=>{sheet=null;});
  function choices(title,name,values){const group=el('fieldset',null,'choice-group');group.append(el('legend',title));for(const value of values){const label=el('label',null,'choice'),input=el('input');input.type='radio';input.name=name;input.value=value;label.append(input,el('span',value[0].toUpperCase()+value.slice(1)));group.append(label);}return group;}
  async function openSheet(kind){
    if(!usable()||(kind!=='availability'&&!mayAct(selected())))return;
    sheet={kind,requestId:selectedId,to:null,reason:null};$('sheet-content').replaceChildren();$('sheet-error').textContent='';
    const titles={confirm:'Accept this patient?',approve_over_limit:'Review & accept over-limit patient',redirect:'Redirect patient',revoke:'Revoke confirmation?',availability:'Change hospital availability'};$('decision-title').textContent=titles[kind];$('decision-submit').textContent=kind==='redirect'?'Continue':kind==='availability'?'Confirm availability':kind==='revoke'?'Confirm revoke':'Accept patient & confirm token';
    if(kind==='availability')$('sheet-content').append(el('p',accepting===true?'Switch to Diverting? New patients should be directed elsewhere.':'Switch to Accepting incoming patients?'));
    else if(['confirm','approve_over_limit'].includes(kind)){
      $('sheet-content').append(el('p','Choose the emergency type. Acceptance confirms this token and updates the patient and traffic screens.'),choices('Your hospital assessment','severity',classes));
      if(kind==='approve_over_limit')$('sheet-content').append(choices('Reason for override','override-reason',['Verified genuine emergency','Prior unconfirmed claims reviewed','Other']));
    }else if(kind==='revoke')$('sheet-content').append(el('p','Revoke this hospital confirmation? Traffic control and the driver must be notified by the backend.'));
    $('decision-sheet').showModal();updateControls();
    if(kind==='redirect'){
      $('sheet-content').append(el('p','Loading hospitals…'));
      const current=sheet;
      try{
        const payload=mock?fixtures.hospitals:await fetchJSON('/api/hospitals');if(sheet!==current)return;
        const hospitals=Array.isArray(payload)?payload:payload?.hospitals;if(!Array.isArray(hospitals))throw Error('Hospital list unavailable');
        const type=selected()?.declared_type;
        const list=hospitals.filter(h=>h.id!==hospitalId&&typeof h.id==='string'&&typeof h.name==='string').sort((a,b)=>Number(b.tags?.includes(type))-Number(a.tags?.includes(type)));
        const container=el('div',null,'sheet-hospitals');
        for(const h of list){const button=el('button');button.type='button';const available=h.accepting===true||h.availability==='accepting';button.disabled=!available;button.append(el('strong',h.name),el('span',(Array.isArray(h.tags)?h.tags.join(' · '):'Capabilities unavailable')),el('span',distance(h.distance_m??Number(h.distance_km)*1000)+' · '+(Number.isFinite(Number(h.eta_s))?Math.ceil(h.eta_s/60)+' min':'ETA unavailable')+' · '+(available?'Accepting':'Unavailable')));button.onclick=()=>{if(sheet!==current)return;sheet.to=h;container.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));};container.append(button);}
        const label=el('label','Reason for redirect'),reason=el('textarea');reason.id='redirect-reason';reason.maxLength=240;label.htmlFor=reason.id;reason.placeholder='Why does the patient need another hospital?';$('sheet-content').replaceChildren(container,label,reason);
        if(!list.length)$('sheet-content').prepend(el('p','No other hospitals available.'));
      }catch(e){if(sheet===current)$('sheet-error').textContent=e.message;}
    }
  }
  async function fetchJSON(url,options={}){const response=await fetch(url,{credentials:'same-origin',...options,signal:AbortSignal.timeout(4000)});if(!response.ok){if(response.status===409)throw Error('This request changed or was handled elsewhere. Refreshing the queue.');throw Error('Hospital service unavailable. Try again.');}return response.status===204?null:response.json();}
  async function refresh(){const started=version;const result=await fetchJSON(api+'/incoming');if(started===version)ingest(result);return result;}
  $('decision-submit').onclick=async()=>{
    if(!sheet||!usable())return;const current=sheet,r=selected();if(current.kind!=='availability'&&(!mayAct(r)||r.request_id!==current.requestId))return;
    const data={};$('sheet-error').textContent='';
    if(['confirm','approve_over_limit'].includes(current.kind)){
      data.severity=document.querySelector('input[name=severity]:checked')?.value;if(!classes.includes(data.severity)){$('sheet-error').textContent='Choose a severity class.';return;}
      if(current.kind==='approve_over_limit'){data.reason=document.querySelector('input[name=override-reason]:checked')?.value;if(!data.reason){$('sheet-error').textContent='Choose a reason for the override.';return;}}
    }
    if(current.kind==='confirm'&&over(r))return;
    if(current.kind==='redirect'){
      const reason=$('redirect-reason')?.value.trim();if(!current.to||!reason){$('sheet-error').textContent='Choose an accepting hospital and enter a reason.';return;}
      current.reason=reason;current.kind='redirect_confirm';$('decision-title').textContent='Redirect to '+current.to.name+'?';$('sheet-content').replaceChildren(el('p','Driver will be notified by the service.'),el('p',reason));$('decision-submit').textContent='Confirm redirect';return;
    }
    if(current.kind==='redirect_confirm'){data.to_hospital_id=current.to.id;data.reason=current.reason;}
    if(current.kind==='availability')data.accepting=accepting!==true;
    busy=true;updateControls();
    try{
      if(!mock){const suffix=current.kind==='availability'?'/availability':'/requests/'+encodeURIComponent(current.requestId)+'/'+(current.kind==='redirect_confirm'?'redirect':current.kind);await fetchJSON(api+suffix,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}
      else if(current.kind==='availability')accepting=data.accepting;
      else{const item=requests.find(x=>x.request_id===current.requestId);if(!mayAct(item))throw Error('Request no longer active');if(['confirm','approve_over_limit'].includes(current.kind)){item.status='confirmed';item.hospital_confirmed=true;item.trust_tier='hospital_verified';item.severity=data.severity;}else{item.status=current.kind==='revoke'?'revoked':'redirected';item.reason=current.kind==='revoke'?'Hospital revoked confirmation.':'Redirected to '+current.to.name;}}
      if(current.kind==='availability')accepting=data.accepting;
      const outcome=current.kind==='availability'?'Availability updated':current.kind==='redirect_confirm'?'Patient redirected':current.kind==='revoke'?'Confirmation revoked':current.kind==='approve_over_limit'?'Over-limit request approved':'Patient confirmed';
      if(current.kind!=='availability')history.unshift({outcome:outcome+(data.severity?' · '+data.severity:''),device:r.device_id,ts:new Date().toISOString()});
      closeSheet();selectedId=null;view='queue';$('hospital-feedback').textContent=(mock?'Demo: ':'')+(['confirm','approve_over_limit'].includes(current.kind)?'Patient accepted. Token confirmed — patient and traffic screens are updating.':outcome+'.');render();
      if(!mock){try{await refresh();}catch{connectState('offline');}}
    }catch(e){$('sheet-error').textContent=e.message;if(!mock){try{await refresh();}catch{connectState('offline');}}}
    finally{busy=false;updateControls();}
  };
  async function loadHospitalChoices(){try{const data=mock?fixtures.hospitals:await fetchJSON('/api/hospitals');const hospitals=Array.isArray(data)?data:data.hospitals;const select=$('hospital-location');select.replaceChildren();for(const item of hospitals){const option=el('option',item.name);option.value=item.id;option.selected=item.id===hospitalId;select.append(option);}select.onchange=()=>{location.href='/hospital/'+encodeURIComponent(select.value)+(mock?'?mock=1':'');};}catch{}}
  loadHospitalChoices();
  $('availability').onclick=()=>openSheet('availability');
  $('queue-tab').onclick=()=>{view='queue';selectedId=null;resetAlert();render();};$('history-tab').onclick=()=>{view='history';selectedId=null;render();};$('incoming-alert').onclick=()=>{view='queue';selectedId=null;resetAlert();render();window.scrollTo(0,0);};
  function startPolling(){if(!pollTimer&&!stopped)pollTimer=setTimeout(()=>{pollTimer=null;poll();},0);}
  async function poll(){if(mock||stopped)return;try{await refresh();if(connection!=='live')connectState('polling');}catch{if(connection!=='live')connectState('offline');}finally{if(!stopped&&connection!=='live')pollTimer=setTimeout(()=>{pollTimer=null;poll();},2000);}}
  function reconnect(){startPolling();if(!retryTimer&&!stopped)retryTimer=setTimeout(()=>{retryTimer=null;connect();},Math.min(1000*2**retries++,10000));}
  function connect(){
    if(stopped)return;
    try{socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/hospital/'+encodeURIComponent(hospitalId));socket.onopen=()=>{retries=0;};socket.onmessage=e=>{try{ingest(JSON.parse(e.data));version++;connectState('live');clearTimeout(pollTimer);pollTimer=null;}catch{socket.close();}};socket.onerror=()=>{startPolling();socket.close();};socket.onclose=()=>{if(stopped)return;if(connection==='live')connectState('connecting');reconnect();};}catch{reconnect();}
  }
  if(mock){$('hospital-demo').hidden=false;$('hospital-demo').open=false;$('demo-disclosure').hidden=false;accepting=true;connectState('mock');render();$('inject').onclick=()=>{const item=fixtures.make($('demo-case').value,++sequence);if($('demo-case').value==='cancelled'&&selected()){const request=selected();request.status='cancelled';request.reason='Cancelled by the driver.';ingest(requests);return;}ingest([item,...requests]);};$('offline-demo').onclick=()=>connectState(online?'offline':'mock');}
  else{render();connectState('connecting');startPolling();connect();}
  setInterval(()=>{for(const n of document.querySelectorAll('[data-eta]')){const r=requests.find(x=>x.request_id===n.dataset.eta);if(r)n.textContent=eta(r)+(n.dataset.detail?' to arrival':'');}for(const n of document.querySelectorAll('[data-reply]')){const r=requests.find(x=>x.request_id===n.dataset.reply);const created=r?.created||Date.parse(r?.received_at);const left=Math.max(0,Math.ceil((created+60000-Date.now())/1000));n.textContent=left>0?'Please accept within '+left+' s':'Waiting for request status…';}},1000);
  addEventListener('pagehide',()=>{stopped=true;abortHold();clearTimeout(pollTimer);clearTimeout(retryTimer);socket?.close();});
  addEventListener('pageshow',e=>{if(e.persisted&&!mock){stopped=false;connectState('connecting');startPolling();connect();}});
})(globalThis);
