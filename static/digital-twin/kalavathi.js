/* Integration adapter only. Original DigitalTwinGenesis engine and views unchanged. */
(function(){
 'use strict';
 const street=typeof SIM!=='undefined'&&typeof PRIORITY!=='undefined';
 const owner=globalThis.crypto?.randomUUID?.()||('traffic-'+Date.now()+'-'+Math.random().toString(16).slice(2));
 let local=null,token=null,stopped=false,current=null;
 const bar=document.createElement('aside');bar.id='kalavathi-link';bar.setAttribute('aria-label','Kalavathi shared request');
 const title=document.createElement('strong');title.textContent='KALAVATHI';const status=document.createElement('span');status.className='workflow-status';status.setAttribute('role','status');status.textContent='Connecting to shared token…';
 bar.append(title,status);
 for(const [label,href] of [['Home','/'],['Patient','/driver/kalavathi-01?demo=1'],['Hospital','/hospital/city'],[street?'Control room':'Street twin',street?'console.html':'index.html']]){const a=document.createElement('a');a.href=href;a.textContent=label;if(href!=='/'){a.target='_blank';a.rel='noopener';}bar.append(a);}
 for(const [label,action] of [['Grant priority','grant'],['Refuse priority','refuse']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.trafficDecision=action;button.disabled=true;button.onclick=async()=>{if(!current)return;if(!confirm(label+' for the hospital-confirmed token?'))return;try{await request('override',{request_id:current.request_id,action});error.textContent='';}catch(e){error.textContent=e.message;}};bar.append(button);}
 const reset=document.createElement('button');reset.type='button';reset.textContent='Reset Kalavathi demo';bar.append(reset);const security=document.createElement('span');security.className='workflow-security';security.textContent='Software demo · no secure element';bar.append(security);const error=document.createElement('span');error.className='workflow-error';bar.append(error);
 (document.getElementById('topbar')||document.getElementById('bar')).after(bar);
 async function request(path,body){const response=await fetch('/api/traffic/'+path,{credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(3500)});const data=await response.json();if(!response.ok)throw Error(data.error||'Traffic connection unavailable');return data;}
 function release(){if(local){if(!['completed','refused'].includes(local.state))PRIORITY.forceRefuse(local,'Kalavathi token ended or hospital confirmation changed.');local.planned=true;const i=SIM.vehicles.indexOf(local.vehicle);if(i>=0)SIM.vehicles.splice(i,1);local=null;token=null;}}
 reset.onclick=async()=>{if(!confirm('Reset the Kalavathi demo allowance and end the current token?'))return;try{await request('reset',{});if(street){release();SCENARIOS.clearAll();}else LINK.send('command',{action:'scenario',name:'normal'});error.textContent='';}catch(e){error.textContent=e.message;}};
 async function tick(){
  if(stopped)return;
  try{
   const data=await request('state'),r=data.request;current=r;error.textContent='';reset.disabled=false;bar.querySelectorAll('[data-traffic-decision]').forEach(b=>b.disabled=!r?.hospital_confirmed||!['confirmed','granted','refused'].includes(r.status));
   status.textContent=r?`${r.token_id} · ${r.hospital_confirmed?'HOSPITAL-VERIFIED':'SELF-DECLARED'} · ${r.traffic_status} · ${r.destination.name}`:'Ready · waiting for the physical button or connected demo trigger';
   if(street){
    const lease=await request('lease',{owner});
    if(!lease.leader){release();status.textContent+=' · another street tab is the active simulator';}
    else if(!r||!r.hospital_confirmed||!['confirmed','granted','refused'].includes(r.status)){release();}
    else{
     if(token!==r.token_id||!local||!PRIORITY.byId(local.id)){
      release();token=r.token_id;local=PRIORITY.submit({source:r.device_id,severity:r.severity==='general'?'S2':'S1',verification:'verified',vehicleType:'private car',persons:1,axis:'EW',approach:'E',lane:0,route:['J1','J2'],etaSec:14});
      if(local.vehicle)local.vehicle.emergency=false;
     }
     if(r.traffic_override==='grant'&&local.state!=='granted'){PRIORITY.forceGrant(local);local.reason='Priority granted by the traffic control operator.';if(local.vehicle)local.vehicle.emergency=false;}
     if(r.traffic_override==='refuse'&&local.state!=='refused')PRIORITY.forceRefuse(local,'Request refused by traffic control.');
     if(r.status==='refused'&&local.state==='refused'&&!r.traffic_override)return;
     const v=local.vehicle,passed=v?.passed||{},junctions=['J1','J2'].map(id=>{const j=SIM.junctionById(id);return {id,state:passed[id]?'passed':j.phase==='EW'&&j.state==='green'&&local.state==='granted'?'green':'reserved'};});
     const remaining=v?Math.max(0,(SIM.GEOM.world.w-v.x)/4):300;
     await request('report',{owner,request_id:r.request_id,state:local.state,reason:local.reason||'',junctions,vehicle:v?{x:v.x,y:v.y,remaining_m:remaining,remaining_s:remaining/11.1}:null});
    }
   }
  }catch(e){error.textContent='Shared token offline: '+e.message;reset.disabled=true;if(street)release();}
  finally{if(!stopped)setTimeout(tick,700);}
 }
 tick();addEventListener('pagehide',()=>{stopped=true;if(street)release();});
})();
