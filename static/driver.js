(function(root){
  'use strict';
  const statuses=['idle','pending','granted','redirected','refused','expired'];
  const number=v=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):0;
  function normalizeState(value){
    if(!value||typeof value!=='object')throw Error('Invalid driver state');
    const status=value.status==='arrived'?'expired':value.status;
    if(!statuses.includes(status))throw Error('Invalid driver status');
    return {...value,status,presses_used:number(value.presses_used),presses_allowed:number(value.presses_allowed),
      change_window_s_left:Math.min(15,number(value.change_window_s_left)),destination:value.destination&&typeof value.destination==='object'?value.destination:null,
      junctions:Array.isArray(value.junctions)?value.junctions.filter(j=>j&&typeof j==='object'&&typeof j.id==='string'&&typeof j.name==='string').slice(0,16).map(j=>({...j,state:['reserved','green','passed','released'].includes(j.state)?j.state:'released'})):[],reason:typeof value.reason==='string'?value.reason:null,
      expiry_reason:value.status==='arrived'?'arrived':value.expiry_reason,trust_tier:value.trust_tier==='hospital_verified'?'hospital_verified':'self_declared'};
  }
  function remaining(state){return Math.max(0,state.presses_allowed-state.presses_used);}
  function changeDeadline(previous,seconds,now){return Math.min(previous??Infinity,now+Math.min(15,number(seconds))*1000);}
  function canCancel(status){return ['pending','granted','redirected','refused'].includes(status);}
  if(typeof module!=='undefined'&&module.exports){module.exports={normalizeState,remaining,changeDeadline,canCancel};return;}
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const pathId=location.pathname.match(/^\/driver\/([^/]+)\/?$/);
  let deviceId;
  try{deviceId=pathId?decodeURIComponent(pathId[1]):params.get('device_id')||document.body.dataset.deviceId||'kalavathi-01';}catch{deviceId='kalavathi-01';}
  const api='/api/driver/'+encodeURIComponent(deviceId);
  const mock=params.get('mock')==='1';
  const connectedDemo=params.get('demo')==='1';
  let state=null,deadline=null,expiryTimer=null,showIdle=false,lastDestination=null;
  let online=false,connection='connecting',socket=null,pollTimer=null,retryTimer=null,retries=0,stopped=false;
  let currentHold=null,requestBusy=false,pickerAbort=null,pickerSerial=0,lastRedirect='';
  let fixtureIndex=0,audioContext=null,liveVersion=0,contactsNotified=false,confirmedHospital=null;
  const fixtures=root.DriverFixtures;

  function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(className)e.className=className;return e;}
  function eta(value){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.max(1,Math.ceil(n/60))+' min':'ETA unavailable';}
  function title(value){return String(value||'general').replaceAll('_',' ');}
  function usable(){return (mock?connection!=='offline':online)&&!requestBusy;}
  function screenStatus(){return showIdle?'idle':state?.status||'idle';}
  function updateConnection(kind){
    connection=kind;online=['live','polling','mock'].includes(kind);
    const banner=$('connection-banner');banner.hidden=kind==='live'||kind==='mock';
    banner.classList.toggle('offline',kind==='offline');
    banner.textContent=kind==='offline'?'Offline. Reconnecting…':kind==='polling'?'Reconnecting live updates…':kind==='connecting'?'Connecting to traffic control…':'Reconnecting…';
    $('connection-dot').className='connection-dot '+(kind==='live'||kind==='mock'?'green':kind==='offline'?'red':'');
    $('connection-label').textContent=kind==='live'?'Connected':kind==='polling'?'Connected by polling; reconnecting live updates':kind;
    if(!online)abortHold();
    updateButtons();updateDetails();
  }
  function updateDetails(){
    $('device-details').textContent=`Device ${deviceId}. ${mock?'Mock demo. ':''}${connection==='polling'?'Polling while live updates reconnect.':connection==='live'?'Live connection.':connection==='mock'?'Offline-capable mock mode.':'Connection unavailable.'} Presses used ${state?state.presses_used:'—'} of ${state?state.presses_allowed:'—'}.`;
  }
  function updateFooter(){
    $('footer-device').textContent=deviceId;
    $('footer-presses').textContent='Presses left '+(state?remaining(state):'—');updateDetails();
  }
  $('device-toggle').onclick=()=>{const expanded=$('device-details').hidden;$('device-details').hidden=!expanded;$('device-toggle').setAttribute('aria-expanded',String(expanded));};
  function icon(colour){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 48 48');svg.setAttribute('class','status-icon');svg.setAttribute('aria-hidden','true');
    const circle=document.createElementNS(svg.namespaceURI,'circle');circle.setAttribute('cx','24');circle.setAttribute('cy','24');circle.setAttribute('r','19');circle.setAttribute('fill','none');circle.setAttribute('stroke','currentColor');circle.setAttribute('stroke-width','3');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',colour==='green'?'M14 24l7 7 14-15':colour==='red'?'M17 17l14 14M31 17L17 31':'M24 12v13l8 5');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','3');svg.append(circle,path);return svg;
  }
  function heading(text,colour){const wrap=element('div',null,'status-heading '+(colour||''));if(colour)wrap.append(icon(colour));wrap.append(element('h1',text));return wrap;}
  function quota(large=false){
    const wrap=element('div');wrap.append(element('p',state?`${remaining(state)} of ${state.presses_allowed} left`:'— of — left',large?'quota-large':''));
    if(large&&state){const dots=element('div',null,'quota-dots');dots.setAttribute('aria-hidden','true');for(let i=0;i<Math.min(30,state.presses_allowed);i++)dots.append(element('span',null,'quota-dot'+(i>=remaining(state)?' used':'')));wrap.append(dots);}
    return wrap;
  }
  function destination(){
    const box=element('div',null,'destination');box.append(element('h2',state.destination?.name||'Destination unavailable'));
    const tags=element('div',null,'tags');for(const tag of (Array.isArray(state.destination?.tags)?state.destination.tags:[]).slice(0,6))tags.append(element('span',title(tag),'tag'));box.append(tags,element('p',eta(state.destination?.eta_s),'eta'));return box;
  }
  function trust(){return element('p',state.trust_tier==='hospital_verified'?'HOSPITAL-VERIFIED'+(state.severity?' · '+String(state.severity).toUpperCase():''):'SELF-DECLARED','trust-chip'+(state.trust_tier==='hospital_verified'?' verified':''));}
  function cancelControl(){
    const wrap=element('div'),button=element('button',null,'hold-cancel');button.type='button';button.id='cancel-request';
    const progress=document.createElement('progress');progress.max=2000;progress.value=0;progress.setAttribute('aria-hidden','true');
    button.append(progress,element('span','CANCEL REQUEST'));wrap.append(button,element('p','Hold for 2 seconds','hold-hint'));
    function start(event){
      if(!usable()||!canCancel(screenStatus())||currentHold)return;
      if(event.type==='keydown'&&![' ','Enter'].includes(event.key))return;
      if(event.type==='pointerdown'&&(event.button!==0||event.isPrimary===false))return;
      event.preventDefault();
      if(event.pointerId!==undefined)button.setPointerCapture(event.pointerId);
      const hold={start:performance.now(),frame:null,button,progress,pointerId:event.pointerId};currentHold=hold;
      const tick=()=>{if(currentHold!==hold)return;const elapsed=performance.now()-hold.start;progress.value=elapsed;if(elapsed>=2000){currentHold=null;progress.value=0;performCancel();}else hold.frame=requestAnimationFrame(tick);};hold.frame=requestAnimationFrame(tick);
    }
    button.addEventListener('pointerdown',start);button.addEventListener('keydown',start);
    for(const name of ['pointerup','pointercancel','lostpointercapture','keyup','blur'])button.addEventListener(name,abortHold);
    button.addEventListener('pointermove',event=>{if(!currentHold)return;const r=button.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)abortHold();});
    button.addEventListener('click',event=>event.preventDefault());button.addEventListener('contextmenu',event=>event.preventDefault());return wrap;
  }
  function abortHold(){if(currentHold){cancelAnimationFrame(currentHold.frame);currentHold.progress.value=0;currentHold=null;}}
  addEventListener('blur',abortHold);document.addEventListener('visibilitychange',()=>{if(document.hidden)abortHold();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')abortHold();});
  function routePreview(){
    const box=element('section',null,'map-card patient-route');box.append(element('p','HOME → HOSPITAL · MODEL ROUTE','map-label'));
    const C=KalavathiCity,route=C.route(state.destination?.id),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 2200 1700');svg.setAttribute('role','img');svg.setAttribute('aria-label','Route from Home through '+route.ids.join(', ')+' to '+(state.destination?.name||'hospital'));
    function shape(tag,attrs,text){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;svg.append(n);return n;}
    shape('rect',{x:0,y:0,width:2200,height:1700,fill:'#e5eee9'});
    for(const y of C.rows)shape('path',{d:'M0 '+y+'H2200',stroke:'#fff','stroke-width':75});for(const x of C.cols)shape('path',{d:'M'+x+' 0V1700',stroke:'#fff','stroke-width':75});
    const path=route.points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ');shape('path',{d:path,stroke:'#176b59','stroke-width':25,fill:'none','stroke-linejoin':'round'});
    for(const n of C.nodes){const j=state.junctions.find(j=>j.id===n.id);shape('circle',{cx:n.x,cy:n.y,r:34,fill:j?.state==='green'||j?.state==='passed'?'#176b59':'#82958c',stroke:'#fff','stroke-width':6});shape('text',{x:n.x-32,y:n.y-55,'font-size':54,fill:'#203e35'},n.id);}
    shape('text',{x:60,y:115,'font-size':75,'font-weight':700,fill:'#172a32'},'HOME');
    for(const h of C.hospitals){shape('rect',{x:h.x-65,y:h.y-40,width:130,height:80,rx:10,fill:h.id===state.destination?.id?'#176b59':'#8fa69b'});shape('text',{x:h.x-30,y:h.y+24,'font-size':70,fill:'#fff'},'+');shape('text',{x:Math.max(25,h.x-220),y:h.y<300?h.y-65:h.y+115,'font-size':48,fill:'#172a32'},h.id===state.destination?.id?'DESTINATION':h.id==='city'?'City':h.id==='central'?'Central':'Riverside');}
    const p=state.vehicle||C.home.gate;shape('circle',{cx:p.x,cy:p.y,r:38,fill:'#13aac0',stroke:'#fff','stroke-width':10});shape('text',{x:p.x+45,y:p.y+90,'font-size':56,'font-weight':700,fill:'#172a32'},'YOUR CAR');
    box.append(svg,element('p',(state.destination?.name||'Hospital')+' · '+eta(state.destination?.eta_s),'route-caption'));
    if(state.comparison?.saved_s!=null)box.append(element('p',(state.comparison.saved_s>=0?state.comparison.saved_s.toFixed(1)+' s saved':Math.abs(state.comparison.saved_s).toFixed(1)+' s longer')+' · city model comparison','patient-savings'));
    box.append(element('p','Simulated indoor position','map-disclosure'));return box;
  }
  function confirmDestination(){
    const button=element('button','Use this destination','confirm-hospital');button.id='confirm-hospital';button.type='button';button.disabled=!usable()||!state.destination?.id;
    button.onclick=()=>{if(!usable()||!state.destination?.id)return;confirmedHospital=state.destination.id;draw();window.scrollTo({top:0,behavior:'instant'});};
    return button;
  }
  function contactsControl(){
    const wrap=element('div',null,'contacts-control');
    const button=element('button',contactsNotified?'Demo alert recorded':'Notify emergency contacts','notify-contacts');button.type='button';
    button.disabled=!mock||!usable()||contactsNotified;
    button.onclick=()=>{if(!mock||!usable()||contactsNotified)return;contactsNotified=true;draw();};
    wrap.append(button,element('p',contactsNotified?'Simulation only. No messages were sent.':mock?'Demo only · no messages will be sent':'Contact notifications are not connected yet.','support-text'));
    return wrap;
  }
  function draw(){
    abortHold();const screen=$('screen');screen.replaceChildren();const status=screenStatus();screen.className='screen '+status;screen.setAttribute('aria-busy','false');
    if(status==='idle'){
      screen.append(element('p','YOUR JOURNEY, SUPPORTED','eyebrow'),heading('Help starts here.'),element('p',mock?'Activate a demo token to see your hospital and route.':'Press the red button on your device to request priority.','intro'),quota(true));
      if(mock||connectedDemo){const activate=element('button','Activate demo token','activate-token');activate.id='activate-token';activate.type='button';activate.disabled=!usable()||!state;activate.onclick=async()=>{if(!usable())return;contactsNotified=false;if(mock){receive({...fixtures.states[1].state,presses_used:state.presses_used+1,presses_allowed:state.presses_allowed});return;}requestBusy=true;updateButtons();try{receive(await jsonFetch('/api/demo/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:globalThis.crypto?.randomUUID?.()||'demo-'+Date.now(),declared_type:'general'})}));}catch(e){$('action-error').textContent=e.message;}finally{requestBusy=false;updateButtons();}};screen.append(activate,element('p','Simulates the physical device button · hospital must confirm the token','support-text'));}
      const cancel=element('button','Cancel','secondary');cancel.disabled=true;cancel.type='button';screen.append(cancel);
    }else if(status==='pending'){
      screen.append(heading(state.trust_tier==='hospital_verified'?'Hospital confirmed token':'Waiting for hospital','amber'),element('p',state.trust_tier==='hospital_verified'?'Priority requested from traffic control':'Token created · awaiting hospital confirmation','token-status'),destination());
      const controls=element('div',null,'change-controls'),ring=element('div',null,'countdown');
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 88 88');svg.setAttribute('aria-hidden','true');
      for(const klass of ['ring-track','ring-fill']){const circle=document.createElementNS(svg.namespaceURI,'circle');for(const [k,v] of Object.entries({cx:44,cy:44,r:37,class:klass}))circle.setAttribute(k,String(v));if(klass==='ring-fill'){circle.id='ring-fill';circle.setAttribute('stroke-dasharray',String(2*Math.PI*37));}svg.append(circle);}
      const digits=element('strong','15');digits.id='countdown-seconds';ring.append(svg,digits);
      const change=element('button','Change hospital','change-button');change.type='button';change.id='change-hospital';change.onclick=openPicker;controls.append(ring,change);
      const line=element('p');line.id='change-status';screen.append(controls,line,trust(),contactsControl(),cancelControl());tickCountdown();
    }else if(status==='granted'){
      screen.append(heading('Priority granted by traffic control','green'),trust(),element('p','Priority requested from traffic control'),destination());
      const route=element('div',null,'route-panel');const next=state.junctions.find(j=>['reserved','green'].includes(j.state));route.append(element('p',next?'Next: '+next.name:'Reserved junctions cleared','next-junction'));
      const list=element('ol',null,'junctions');for(const j of state.junctions){const li=element('li');const mark=element('span',null,'junction-marker '+String(j.state));li.append(mark,element('strong',j.id),element('p',j.state==='passed'?'Passed':j.state==='green'?'Green':j.state==='released'?'Released':'Reserved'));li.setAttribute('aria-label',`${j.name}: ${j.state}`);list.append(li);}route.append(list);screen.append(route,contactsControl(),cancelControl());
    }else if(status==='redirected'){
      screen.append(element('p','Hospital redirected you','redirect-banner'));
      const previous=state.previous_destination?.name||lastDestination?.name;
      screen.append(element('p',(previous?previous+' → ':'New destination: ')+(state.destination?.name||'Hospital unavailable'),'route-change'));
      if(state.reason)screen.append(element('p',state.reason));screen.append(element('h1','New route'),destination(),contactsControl(),cancelControl());
    }else if(status==='refused'){
      screen.append(heading('Request refused','red'),trust(),element('p',state.reason||'Traffic priority was not granted.','reason-text'));
      screen.append(element('p',/review|sent to hospital/i.test(state.reason||'')?'Waiting for hospital review.':'No traffic priority is active.'));
      screen.append(element('p',`${state.presses_used} of ${state.presses_allowed} presses used`),quota());
      if(/review|sent to hospital/i.test(state.reason||''))screen.append(cancelControl());
    }else{
      const reason=String(state.expiry_reason||'time cap').replaceAll('_',' ');
      screen.append(heading(reason==='arrived'?'Arrived. Priority ended.':'Priority ended.','blue'),element('p',reason,'expiry-reason'),quota(true));
    }
    if(['pending','granted','redirected','refused'].includes(status)&&state.destination?.id){
      if(state.trust_tier==='hospital_verified')screen.prepend(routePreview());
      else {const card=screen.querySelector('.destination');card?.after(element('p','Waiting for '+(state.destination?.name||'hospital')+' staff to accept your request.','support-text'));if(connectedDemo&&state.destination?.id){const link=element('a','Hospital team: open acceptance page','hospital-desk-link');link.href='/hospital/'+encodeURIComponent(state.destination.id);link.target='_blank';link.rel='noopener';card?.after(link);}}
    }
    if(state?.token_id)screen.append(element('p','Token '+state.token_id,'support-text'));
    updateFooter();updateButtons();
  }
  function secondsLeft(){return Math.max(0,Math.ceil(((deadline||0)-performance.now())/1000));}
  function tickCountdown(){
    if(screenStatus()!=='pending')return;
    const seconds=secondsLeft();const counter=$('countdown-seconds'),ring=$('ring-fill');if(counter)counter.textContent=String(seconds);if(ring)ring.setAttribute('stroke-dashoffset',String(2*Math.PI*37*(1-seconds/15)));
    if($('change-status'))$('change-status').textContent=seconds>0?`Going to ${state.destination?.name||'hospital'} — ${seconds} s to change`:'Destination locked';
    const change=$('change-hospital');if(change)change.disabled=!usable()||seconds===0||state.trust_tier==='hospital_verified';
    if(state.trust_tier==='hospital_verified'&&$('change-status'))$('change-status').textContent='Destination confirmed by hospital';
    if(seconds===0&&$('hospital-picker').open){$('hospital-picker').close();pickerAbort?.abort();$('action-error').textContent='Destination locked.';}
  }
  function updateButtons(){const confirm=$('confirm-hospital');if(confirm)confirm.disabled=!usable()||!state?.destination?.id;const change=$('change-hospital');if(change)change.disabled=!usable()||secondsLeft()===0||state.trust_tier==='hospital_verified';const cancel=$('cancel-request');if(cancel)cancel.disabled=!usable();const activate=$('activate-token');if(activate)activate.disabled=!usable()||!state;const notify=document.querySelector('.notify-contacts');if(notify)notify.disabled=!mock||!usable()||contactsNotified;}
  function receive(value){
    const next=normalizeState(value);const previousStatus=state?.status;
    if(next.status==='idle'||next.status==='expired'||next.destination?.id!==state?.destination?.id)confirmedHospital=null;
    if(state?.destination&&(state.status!=='redirected'||next.destination?.id!==state.destination.id))lastDestination=state.destination;
    if(next.status==='pending')deadline=changeDeadline(previousStatus==='pending'?deadline:null,next.change_window_s_left,performance.now());else deadline=null;
    if(next.status!=='expired'){clearTimeout(expiryTimer);expiryTimer=null;showIdle=false;}
    else if(previousStatus!=='expired'){showIdle=false;clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>{showIdle=true;draw();},10000);}
    const signature=JSON.stringify(next),same=state&&JSON.stringify(state)===signature;state=next;
    if(next.status==='redirected'){
      const notification=JSON.stringify([next.destination?.id,next.reason]);
      if(previousStatus!=='redirected'||notification!==lastRedirect){lastRedirect=notification;notifyRedirect();}
    }
    if(next.status!=='pending'&&$('hospital-picker').open){$('hospital-picker').close();pickerAbort?.abort();}
    // Preserve a held button across identical polling frames; cancel when state changes.
    if(!same&&!(currentHold&&previousStatus===next.status))draw();else{updateFooter();tickCountdown();updateButtons();}
  }
  async function jsonFetch(url,options={}){
    const response=await fetch(url,{credentials:'same-origin',...options,signal:options.signal||AbortSignal.timeout(4000)});
    if(!response.ok){let detail;try{const body=await response.json();detail=body.detail||body.error;}catch{}throw Error(typeof detail==='string'?detail:'Unable to update request. Try again.');}
    return response.status===204?null:response.json();
  }
  async function post(suffix,body){
    return jsonFetch(api+suffix,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});
  }
  async function performCancel(){
    if(!usable()||!canCancel(screenStatus()))return;requestBusy=true;updateButtons();$('action-error').textContent='';
    try{
      if(mock){receive({...state,status:'expired',expiry_reason:'cancelled by driver'});}
      else{const result=await post('/cancel');if(result?.status)receive(result);else await refresh();}
    }catch(error){$('action-error').textContent=error.message;}
    finally{requestBusy=false;updateButtons();}
  }
  async function openPicker(){
    if(!usable()||secondsLeft()===0)return;abortHold();const picker=$('hospital-picker');$('hospital-list').replaceChildren();$('picker-message').textContent='Loading capable hospitals…';picker.showModal();
    const serial=++pickerSerial;pickerAbort?.abort();pickerAbort=new AbortController();const timer=setTimeout(()=>pickerAbort?.abort(),4000);
    try{
      const type=state.severity||state.destination?.tags?.[0]||'general';
      const result=mock?fixtures.hospitals:await jsonFetch('/api/hospitals?type='+encodeURIComponent(type),{signal:pickerAbort.signal});
      if(!picker.open||serial!==pickerSerial)return;
      const hospitals=Array.isArray(result)?result:result?.hospitals;
      if(!Array.isArray(hospitals))throw Error('Hospital list unavailable.');
      const capable=hospitals.filter(h=>h&&typeof h.id==='string'&&typeof h.name==='string'&&Array.isArray(h.tags)&&h.tags.includes(type));
      $('picker-message').textContent=capable.length?'Choose a capable hospital.':'No capable hospitals available. Keep your current destination.';
      for(const hospital of capable.slice(0,50)){
        const button=element('button',null,'hospital-option');button.type='button';button.append(element('strong',hospital.name),element('span',hospital.tags.join(' · ')));
        const distance=Number(hospital.distance_km);button.append(element('span',(Number.isFinite(distance)?distance.toFixed(1)+' km · ':'')+eta(hospital.eta_s)));
        button.onclick=()=>chooseHospital(hospital);$('hospital-list').append(button);
      }
    }catch(error){if(picker.open&&serial===pickerSerial)$('picker-message').textContent=error.name==='AbortError'?'Connection unavailable. Keep your current destination.':error.message;}
    finally{clearTimeout(timer);}
  }
  async function chooseHospital(hospital){
    if(!usable()||screenStatus()!=='pending'||secondsLeft()===0)return;
    requestBusy=true;updateButtons();for(const button of $('hospital-list').querySelectorAll('button'))button.disabled=true;
    try{
      if(mock)receive({...state,destination:hospital,change_window_s_left:secondsLeft()});
      else{const result=await post('/destination',{hospital_id:hospital.id});if(result?.status)receive(result);else await refresh();}
      $('hospital-picker').close();
    }catch(error){$('picker-message').textContent=error.message;}
    finally{requestBusy=false;updateButtons();for(const button of $('hospital-list').querySelectorAll('button'))button.disabled=false;}
  }
  $('picker-back').onclick=()=>{$('hospital-picker').close();pickerAbort?.abort();};
  $('hospital-picker').addEventListener('cancel',()=>pickerAbort?.abort());

  function primeAudio(){try{const Audio=root.AudioContext||root.webkitAudioContext;if(Audio){audioContext=audioContext||new Audio();audioContext.resume().catch(()=>{});}}catch{}}
  document.addEventListener('pointerdown',primeAudio,{once:true});document.addEventListener('keydown',primeAudio,{once:true});
  function notifyRedirect(){
    try{navigator.vibrate?.([180,70,180]);}catch{}
    try{if(audioContext?.state==='running'){const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.frequency.value=880;gain.gain.setValueAtTime(.12,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.2);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+.22);}}catch{}
  }
  async function refresh(){const version=liveVersion;const result=await jsonFetch(api+'/state');if(version===liveVersion)receive(result);return result;}
  async function poll(){
    if(stopped||mock)return;
    try{await refresh();if(socket?.readyState!==WebSocket.OPEN)updateConnection('polling');else if(connection!=='live')updateConnection('polling');}
    catch{if(connection!=='live')updateConnection('offline');}
    finally{if(!stopped&&connection!=='live')pollTimer=setTimeout(poll,2000);}
  }
  function startPolling(){if(!pollTimer){pollTimer=setTimeout(()=>{pollTimer=null;poll();},0);}}
  function reconnect(){
    if(stopped||retryTimer)return;startPolling();retryTimer=setTimeout(()=>{retryTimer=null;connect();},Math.min(1000*2**retries++,10000));
  }
  function connect(){
    if(stopped)return;
    try{
      socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/driver/'+encodeURIComponent(deviceId));
      socket.onopen=()=>{retries=0;};
      socket.onmessage=event=>{try{const message=JSON.parse(event.data);receive(message);liveVersion++;updateConnection('live');clearTimeout(pollTimer);pollTimer=null;}catch{socket.close();}};
      socket.onerror=()=>{if(!['polling','offline'].includes(connection))updateConnection('reconnecting');startPolling();socket.close();};
      socket.onclose=()=>{if(stopped)return;if(connection==='live')updateConnection('reconnecting');reconnect();};
    }catch{if(connection!=='offline')updateConnection('reconnecting');reconnect();}
  }
  function applyFixture(index){confirmedHospital=null;contactsNotified=false;fixtureIndex=(index+fixtures.states.length)%fixtures.states.length;deadline=null;state=null;showIdle=false;clearTimeout(expiryTimer);$('action-error').textContent='';updateConnection('mock');receive(JSON.parse(JSON.stringify(fixtures.states[fixtureIndex].state)));$('mock-state').value=String(fixtureIndex);}
  if(mock){
    $('demo-slot').append($('mock-panel'));$('mock-panel').hidden=false;$('mock-panel').open=false;$('mock-panel').querySelector('summary').textContent='Demo ▾';
    fixtures.states.forEach((f,i)=>{const option=element('option',f.label);option.value=String(i);$('mock-state').append(option);});
    $('mock-state').onchange=()=>applyFixture(Number($('mock-state').value));$('mock-prev').onclick=()=>applyFixture(fixtureIndex-1);$('mock-next').onclick=()=>applyFixture(fixtureIndex+1);
    $('mock-offline').onclick=()=>updateConnection(connection==='offline'?'mock':'offline');applyFixture(0);
  }else{draw();updateConnection('connecting');startPolling();connect();}
  setInterval(tickCountdown,200);
  addEventListener('pagehide',()=>{stopped=true;abortHold();clearTimeout(pollTimer);clearTimeout(retryTimer);socket?.close();});
  addEventListener('pageshow',event=>{if(event.persisted&&!mock){stopped=false;updateConnection('connecting');startPolling();connect();}});
})(globalThis);

