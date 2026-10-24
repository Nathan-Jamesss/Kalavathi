return await(async()=>{
const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));function check(ok,n){if(!ok)throw Error(n);checks.push(n);}
const post=async(url,body)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const b=await r.json();if(!r.ok)throw Error(b.error);return b;};
await post('/api/traffic/reset',{});SCENARIOS.clearAll();await wait(1000);
const pending=await post('/api/demo/request',{request_id:'browser-'+Date.now(),declared_type:'general'});await wait(1000);check(PRIORITY.requests.length===0,'Unconfirmed patient token never enters traffic arbitration');
const incoming=await(await fetch('/api/hospital/city/incoming')).json();check(incoming.requests[0].token_id===pending.token_id,'Hospital and patient share the same server token');
await post('/api/hospital/city/requests/'+pending.request_id+'/confirm',{severity:'cardiac'});await wait(4500);
check(PRIORITY.requests.length===1,'Confirmed token admitted to original engine exactly once');
const candidate=PRIORITY.requests[0];check(candidate.verification==='verified'&&candidate.source==='kalavathi-01','Original engine receives hospital verification and device source');
let traffic=await(await fetch('/api/traffic/state')).json();if(traffic.request.status!=='granted')await post('/api/traffic/override',{request_id:pending.request_id,action:'grant'});
await wait(2200);const driver=await(await fetch('/api/driver/kalavathi-01/state')).json();
check(driver.status==='granted'&&driver.trust_tier==='hospital_verified','Traffic decision reaches patient with hospital verification');
check(PRIORITY.requests.length===1,'Traffic review does not generate duplicate requests');
check(driver.token_id===pending.token_id,'Token identity is unchanged across the whole flow');
await post('/api/driver/kalavathi-01/cancel',{});await wait(1400);check(SIM.activeHolds().length===0,'Driver cancellation releases original engine holds');
return JSON.stringify({passed:checks.length,checks},null,2);
})();
