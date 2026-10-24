const $=id=>document.getElementById(id);
const page=location.pathname;
const hospital=page==='/hospital-legacy',driver=page==='/driver';
let key=sessionStorage.getItem('kalavathi-operator')||'';
let latest=null;
const messages={idle:'Ready for an emergency request.',pending:'Request received. Waiting for hospital confirmation; junctions remain red.',granted:'Hospital confirmed. The model corridor is active.',refused:'No corridor granted. A hospital operator can review and override the allowance.',cancelled:'Request cancelled. All junctions are red.',completed:'Vehicle arrived. Priority expired and junctions returned to red.',expired:'No hospital response within 60 seconds. Submit a new request to try again.'};
const labels={idle:'Ready',pending:'Awaiting hospital',granted:'Priority approved',refused:'Refused / review',cancelled:'Cancelled',completed:'Arrived',expired:'Expired'};
if(hospital){$('page-label').textContent='Hospital';$('title').textContent='Confirm care. Release priority.';$('subtitle').textContent='Review the incoming request and its software usage count before approving the model corridor.';$('actions-title').textContent='Hospital decision';$('test-controls').hidden=true;}
if(driver){$('page-label').textContent='Driver';$('title').textContent='Your request, in view.';$('subtitle').textContent='Press the physical emergency button. The hospital response will appear here.';$('actions-title').textContent='Request information';$('operator-login').hidden=true;$('driver-note').hidden=false;}
for(const link of document.querySelectorAll('nav a'))if(link.getAttribute('href')===page)link.setAttribute('aria-current','page');
for(let i=0;i<4;i++){
  const item=document.createElement('div');item.className='junction';
  const name=document.createElement('span');name.textContent=`Junction ${i+1}`;
  const signal=document.createElement('div');signal.className='signal';
  for(const colour of ['R','A','G']){const lamp=document.createElement('span');lamp.className='lamp '+colour;signal.append(lamp);}
  const state=document.createElement('span');state.className='state';state.textContent='Red';
  item.append(name,signal,state);$('junctions').append(item);
}
function lockView(){if(driver)return;$('operator-login').hidden=Boolean(key);$('operator-controls').hidden=!key;}
$('unlock').onclick=()=>{key=$('key').value.trim();sessionStorage.setItem('kalavathi-operator',key);$('key').value='';lockView();};
$('lock').onclick=()=>{key='';sessionStorage.removeItem('kalavathi-operator');lockView();};
lockView();
async function action(route,body={}){
  $('error').textContent='';
  try{
    const response=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Operator-Key':key},body:JSON.stringify(body)});
    const value=await response.json();if(!response.ok){if(response.status===401){key='';sessionStorage.removeItem('kalavathi-operator');lockView();}throw Error(value.error);}
    render(value);
  }catch(error){$('error').textContent=error.message;}
}
$('request').onclick=()=>action('request',{request_id:crypto.randomUUID?crypto.randomUUID():`web-${Date.now()}-${Math.random().toString(16).slice(2)}`});
$('reset').onclick=()=>action('reset');$('cancel').onclick=()=>action('cancel');
for(const name of ['approve','override','refuse'])$(name).onclick=()=>action('decision',{action:name,severity:$('severity').value,request_id:latest?.requestId});
function render(s){
  for(const button of document.querySelectorAll('#operator-controls button'))button.disabled=false;
  latest=s;$('status').textContent=labels[s.status]||s.status;$('remaining').textContent=s.remaining;$('used').textContent=s.used;
  $('explanation').textContent=messages[s.status]||'';$('lifetime').textContent=`Lifetime requests: ${s.lifetime}`;
  if(Object.hasOwn(s,'deviceOnline'))$('device').textContent=s.deviceOnline?'Connected':'Not connected';
  $('vehicle').style.left=(3+s.progress*80)+'%';
  const names={R:'Red',A:'Amber',G:'Green'};
  [...$('junctions').children].forEach((item,i)=>{for(const lamp of item.querySelectorAll('.lamp'))lamp.classList.toggle('on',lamp.classList.contains(s.junctions[i]));item.querySelector('.state').textContent=names[s.junctions[i]];});
  const active=['pending','granted'].includes(s.status),review=['pending','refused'].includes(s.status);
  $('request').disabled=active;$('approve').disabled=!review||s.used>5;$('override').disabled=!review||s.used<=5;$('refuse').disabled=!review;
  $('cancel').disabled=!['pending','granted','refused'].includes(s.status);
  $('events').replaceChildren();
  for(const event of s.events){const li=document.createElement('li');const time=document.createElement('time');time.textContent=new Date(event.time).toLocaleTimeString();li.append(time,document.createTextNode(event.message));$('events').append(li);}
  if(!s.events.length){const li=document.createElement('li');li.textContent='No requests yet.';$('events').append(li);}
}
async function poll(){
  try{const response=await fetch('/api/state',{signal:AbortSignal.timeout(3000)});if(!response.ok)throw Error();render(await response.json());$('connection').textContent='Connected to demo laptop';$('connection').className='connection online';}
  catch{$('connection').textContent='Laptop connection lost. Check hotspot and server.';$('connection').className='connection offline';$('status').textContent='Connection lost';for(const lamp of document.querySelectorAll('.lamp'))lamp.classList.remove('on');for(const label of document.querySelectorAll('.junction .state'))label.textContent='Unknown';for(const button of document.querySelectorAll('#operator-controls button'))if(button.id!=='lock')button.disabled=true;}
  finally{setTimeout(poll,750);}
}
poll();
