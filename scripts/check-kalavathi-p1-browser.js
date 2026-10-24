return await(async()=>{
const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));function check(ok,n){if(!ok)throw Error(n);checks.push(n);}
const post=async(url,body)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const b=await r.json();if(!r.ok)throw Error(b.error);return b;};
check(!document.querySelector('.tabs,#btn-two-amb,#btn-qubo,#btn-mp,#view-3d'),'No ambulance or algorithm options');
check(!document.querySelector('script[src="priority.js"],script[src="agent.js"],script[src="scenarios.js"]'),'Unrelated original controllers are not loaded');
await post('/api/traffic/reset',{});await wait(800);
const pending=await post('/api/demo/request',{request_id:'kal-p1-'+Date.now()});await wait(1000);
check(!KalavathiDemo.trip.running&&KalavathiDemo.sim.activeHolds().length===0,'No priority before hospital confirms token');
const queue=await(await fetch('/api/hospital/city/incoming')).json();check(queue.requests[0].token_id===pending.token_id,'Same token reaches hospital');
await post('/api/hospital/city/requests/'+pending.request_id+'/confirm',{severity:'cardiac'});await wait(1400);
check(KalavathiDemo.trip.running,'Hospital confirmation starts Kalavathi rule-based track');
let driver=await(await fetch('/api/driver/kalavathi-01/state')).json();check(driver.status==='granted'&&driver.trust_tier==='hospital_verified','Patient receives hospital verification and traffic priority');check(driver.junctions.length===4,'All four junctions belong to this route');
KalavathiDemo.sim.setSpeedScale(8);
const end=Date.now()+30000;while(!KalavathiDemo.trip.finished&&Date.now()<end)await wait(300);await wait(1000);
driver=await(await fetch('/api/driver/kalavathi-01/state')).json();check(KalavathiDemo.trip.finished&&driver.expiry_reason==='arrived','Car reaches hospital and token expires');
check(driver.junctions.every(j=>j.state==='passed'),'J1 J2 J3 J4 all passed');check(KalavathiDemo.sim.activeHolds().length===0,'All priority holds released on arrival');
KalavathiDemo.sim.setSpeedScale(1);return JSON.stringify({passed:checks.length,checks},null,2);
})();
