const fs=require('node:fs');const crypto=require('node:crypto');const {save}=require('./demo');
const City=require('../static/city-model');
const TYPES=['cardiac','trauma','obstetric','paediatric','general'];
const HOSPITALS=[{id:'city',name:'City Hospital',tags:['cardiac','trauma','general'],distance_m:2400,distance_km:2.4,eta_s:420,accepting:true},{id:'riverside',name:'Riverside Medical Centre',tags:['cardiac','trauma','general'],distance_m:3200,distance_km:3.2,eta_s:540,accepting:true},{id:'central',name:'Central Care',tags:['obstetric','paediatric','general'],distance_m:4600,distance_km:4.6,eta_s:660,accepting:true}];
const live=r=>r&&['pending','confirmed','granted'].includes(r.status);
class Workflow{
 constructor(file,demo,clock=Date.now){this.file=file;this.demo=demo;this.clock=clock;this.lease=null;this.s=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{requests:[],availability:{}};for(const r of this.s.requests)if(live(r)){r.status='expired';r.expiry_reason='server restarted';}this.persist();}
 persist(){save(this.file,this.s);}
 hospitals(){return HOSPITALS.map(h=>({...h,accepting:this.s.availability[h.id]??h.accepting}));}
 current(){return this.s.requests.find(r=>r.request_id===this.demo.s.requestId);}
 find(id){return this.s.requests.find(r=>r.request_id===id);}
 hospital(id){const h=this.hospitals().find(h=>h.id===id);if(!h)throw Error('Invalid hospital');return h;}
 request(id,device='kalavathi-01',type='general'){
  if(device!=='kalavathi-01')throw Error('Invalid device');if(!TYPES.includes(type))throw Error('Invalid emergency type');
  if(this.find(id))return this.driver(device);if(this.demo.s.seen.includes(id))throw Error('The request retry is too old to recover');if(live(this.current()))throw Error('A request is already active');
  const hospital=this.hospitals().filter(h=>h.accepting&&h.tags.includes(type)).sort((a,b)=>a.distance_m-b.distance_m)[0];if(!hospital)throw Error('No capable hospital accepting patients');
  this.demo.request(id);const r={request_id:id,token_id:'KAL-'+crypto.randomUUID(),device_id:device,received_at:new Date(this.clock()).toISOString(),created:this.clock(),destination_id:hospital.id,declared_type:type,presses_used:this.demo.s.used,presses_allowed:5,status:'pending',trust_tier:'self_declared',severity:null,traffic_status:'awaiting_hospital',reason:null,expiry_reason:null,junctions:City.route(hospital.id).ids.map(id=>({id,name:'Junction '+id.slice(1),state:'reserved'})),vehicle:null,hospital_confirmed:false};
  this.demo.s.externalTraffic=true;this.demo.persist();this.s.requests.unshift(r);this.s.requests=this.s.requests.slice(0,300);this.persist();return this.driver(device);
 }
 history(device,exclude){return this.s.requests.filter(r=>r.device_id===device&&r.request_id!==exclude).flatMap(r=>{const out=[];if(r.hospital_confirmed||r.ever_hospital_confirmed)out.push({ts:r.confirmed_at||r.received_at,outcome:'hospital-confirmed'});if(r.expiry_reason==='arrived')out.push({ts:r.closed_at,outcome:'arrival-confirmed'});else if(r.expiry_reason==='cancelled by driver')out.push({ts:r.closed_at,outcome:'self-cancelled'});else if(!live(r)&&!r.hospital_confirmed&&!r.ever_hospital_confirmed)out.push({ts:r.closed_at||r.received_at,outcome:'EXPIRED-UNCONFIRMED'});return out;}).slice(0,50);}
 view(r){return {...r,route:City.route(r.destination_id),destination:this.hospital(r.destination_id),eta_s:r.vehicle?Math.max(0,Math.ceil(r.vehicle.remaining_s??60)):this.hospital(r.destination_id).eta_s,distance_m:r.vehicle?Math.max(0,Math.round(r.vehicle.remaining_m??2400)):this.hospital(r.destination_id).distance_m,signature_valid:null,security_mode:'software_demo',record:{presses_used:r.presses_used,presses_allowed:r.presses_allowed,history:this.history(r.device_id,r.request_id)},key_fingerprint:'No secure element · software demo record'};}
 incoming(id){const h=this.hospital(id);return {hospital:h,accepting:h.accepting,requests:this.s.requests.filter(r=>r.destination_id===id).slice(0,30).map(r=>this.view(r))};}
 driver(device){if(device!=='kalavathi-01')throw Error('Invalid device');this.tick();const r=this.current();if(!r||r.device_id!==device)return {status:'idle',trust_tier:'self_declared',presses_used:this.demo.s.used,presses_allowed:5,change_window_s_left:0,junctions:[],destination:null};
  const v=this.view(r),status=r.redirected_from&&!r.hospital_confirmed&&r.status==='pending'?'redirected':['cancelled','expired','arrived','revoked'].includes(r.status)?'expired':r.status==='confirmed'?'pending':r.status==='pending'&&r.presses_used>5?'refused':r.status;
  return {...v,status,change_window_s_left:Math.max(0,15-Math.floor((this.clock()-r.created)/1000)),destination:{...v.destination,eta_s:v.eta_s},reason:r.status==='pending'&&r.presses_used>5?'Allocation used. Request sent to hospital for review.':r.reason};
 }
 destination(device,id){const r=this.current();if(!r||r.device_id!==device||!['pending','confirmed'].includes(r.status)||r.hospital_confirmed||this.clock()-r.created>=15000)throw Error('Destination locked');const h=this.hospital(id);if(!h.accepting||!h.tags.includes(r.declared_type))throw Error('Choose a capable accepting hospital');r.destination_id=id;r.junctions=City.route(id).ids.map(id=>({id,name:'Junction '+id.slice(1),state:'reserved'}));this.persist();return this.driver(device);}
 close(r,status,reason){r.status=status;r.expiry_reason=reason;r.closed_at=new Date(this.clock()).toISOString();r.traffic_status='released';for(const j of r.junctions)if(j.state!=='passed')j.state='released';this.demo.s.externalTraffic=false;this.demo.s.status=status==='arrived'?'completed':status==='expired'?'expired':'cancelled';this.demo.log('Token ended: '+reason+'; corridor released.');this.demo.persist();this.persist();}
 cancel(device){const r=this.current();if(!r||!['pending','confirmed','granted','refused'].includes(r.status)||r.device_id!==device)throw Error('No active request to cancel');this.close(r,'cancelled','cancelled by driver');return this.driver(device);}
 reset(){const r=this.current();if(live(r))this.close(r,'cancelled','demo reset');this.demo.reset();this.lease=null;return this.driver('kalavathi-01');}
 decision(hospital,id,action,input){this.tick();const r=this.find(id);if(!r||r!==this.current()||r.destination_id!==hospital||!live(r))throw Error('The request changed or was already handled');
  if(action==='confirm'||action==='approve_over_limit'){
   if(r.hospital_confirmed)throw Error('The request was already confirmed');if(!TYPES.includes(input.severity))throw Error('Choose a severity');if(r.presses_used>5&&action!=='approve_over_limit')throw Error('Hospital override required');if(action==='approve_over_limit'&&!['Verified genuine emergency','Prior unconfirmed claims reviewed','Other'].includes(input.reason))throw Error('Choose an override reason');
   r.hospital_confirmed=true;r.ever_hospital_confirmed=true;r.confirmed_at=new Date(this.clock()).toISOString();r.severity=input.severity;r.trust_tier='hospital_verified';r.status='confirmed';r.traffic_status='awaiting_traffic';r.reason='Hospital confirmed token. Priority requested from traffic control.';
  }else if(action==='redirect'){
   const h=this.hospital(input.to_hospital_id);if(h.id===hospital||!h.accepting||!h.tags.includes(r.severity||r.declared_type)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>240)throw Error('Choose a capable accepting hospital and a redirect reason');
   if(r.status==='granted'){this.demo.cancel();this.demo.s.status='pending';this.demo.s.created=this.clock();this.demo.persist();}
   r.previous_destination=this.hospital(hospital);r.redirected_from=r.previous_destination.name;r.destination_id=h.id;r.hospital_confirmed=false;r.trust_tier='self_declared';r.status='pending';r.traffic_status='awaiting_hospital';r.severity=null;r.reason=input.reason;r.vehicle=null;r.comparison=null;r.junctions=City.route(h.id).ids.map(id=>({id,name:'Junction '+id.slice(1),state:'reserved'}));
  }else if(action==='revoke'){if(!r.hospital_confirmed)throw Error('No hospital confirmation to revoke');this.close(r,'revoked','hospital revoked');return this.incoming(hospital);}
  else throw Error('Invalid hospital decision');this.persist();return this.incoming(hospital);
 }
 availability(id,accepting){this.hospital(id);if(typeof accepting!=='boolean')throw Error('Invalid availability');this.s.availability[id]=accepting;this.persist();return this.incoming(id);}
 claim(owner){if(typeof owner!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(owner))throw Error('Invalid traffic worker');if(this.lease&&this.lease.until>this.clock()&&this.lease.owner!==owner)return {leader:false};this.lease={owner,until:this.clock()+5000};return {leader:true};}
 override(id,action){const r=this.current();if(!r||r.request_id!==id||!r.hospital_confirmed||!['confirmed','granted','refused'].includes(r.status)||this.clock()-r.created>=300000)throw Error('The request changed or token expired');if(!['grant','refuse'].includes(action))throw Error('Invalid traffic decision');r.traffic_override=action;this.persist();return this.traffic();}
 report(input){this.tick();if(!this.lease||this.lease.until<=this.clock()||this.lease.owner!==input.owner)throw Error('Traffic worker lease expired');const r=this.current();if(!r||r.request_id!==input.request_id||!r.hospital_confirmed||!(['confirmed','granted'].includes(r.status)||(r.status==='refused'&&r.traffic_override==='grant')))throw Error('The request changed or is not hospital-confirmed');if(!['queued','pending','granted','refused','completed'].includes(input.state))throw Error('Invalid traffic state');
  const was=r.status;if((r.traffic_override==='grant'&&input.state==='granted')||(r.traffic_override==='refuse'&&input.state==='refused'))r.traffic_override=null;r.traffic_status=input.state;r.reason=typeof input.reason==='string'?input.reason.slice(0,1000):null;
  if(input.state==='granted'){r.status='granted';if(was!=='granted'){if(was==='refused'){this.demo.s.status='pending';this.demo.s.created=this.clock();}this.demo.decide(r.presses_used>5?'override':'approve',r.severity,r.request_id);this.demo.s.externalTraffic=true;this.demo.persist();}r.last_traffic=this.clock();}
  if(input.state==='refused'){r.status='refused';this.demo.s.status='refused';this.demo.persist();}
  if(Array.isArray(input.junctions))r.junctions=input.junctions.filter(j=>j&&City.route(r.destination_id).ids.includes(j.id)&&['reserved','green','passed','released'].includes(j.state)).map(j=>({id:j.id,name:'Junction '+j.id.slice(1),state:j.state}));
  if(input.vehicle&&Number.isFinite(input.vehicle.x)&&Number.isFinite(input.vehicle.y)){r.vehicle={x:Math.max(0,Math.min(City.width,input.vehicle.x)),y:Math.max(0,Math.min(City.height,input.vehicle.y)),remaining_m:Math.max(0,Math.min(10000,Number(input.vehicle.remaining_m)||0)),remaining_s:Math.max(0,Math.min(10000,Number(input.vehicle.remaining_s)||0))};}
  if(Object.hasOwn(input,'comparison')){
   const c=input.comparison;
   if(c===null)r.comparison=null;
   else if(c&&Number.isFinite(c.baseline_s)&&c.baseline_s>=0&&c.baseline_s<=600&&Number.isFinite(c.elapsed_s)&&c.elapsed_s>=0&&c.elapsed_s<=600&&(c.saved_s===null||(Number.isFinite(c.saved_s)&&Math.abs(c.saved_s)<=600)))r.comparison={baseline_s:c.baseline_s,elapsed_s:c.elapsed_s,saved_s:c.saved_s,final:c.final===true,checkpoints:Array.isArray(c.checkpoints)?c.checkpoints.filter(Number.isFinite).slice(0,16):[]};
  }
  if(input.state==='completed')this.close(r,'arrived','arrived');else this.persist();return this.traffic();
 }
 traffic(){this.tick();const r=this.current();return {request:r?this.view(r):null,security:'Software demo · no secure element',traffic_online:!!this.lease&&this.lease.until>this.clock()};}
 lamps(){const r=this.current(),lamps=['R','R','R','R'];if(r?.status==='granted'){const first=r.junctions.find(j=>j.state!=='passed'&&j.state!=='released');if(first?.state==='green')lamps[r.junctions.indexOf(first)%4]='G';}return lamps;}
 tick(){const r=this.current();if(!r||(!live(r)&&r.status!=='refused'))return;const now=this.clock();if(r.status==='pending'&&now-r.created>=60000)this.close(r,'expired','hospital response timed out');else if(r.status==='granted'&&now-(r.last_traffic||0)>6000)this.close(r,'expired','traffic connection lost');else if(now-r.created>=300000)this.close(r,'expired','time cap');}
}
module.exports={Workflow,TYPES};
