const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const {createCloudHandler}=require('../lib/cloud');
function storage(){let value=null,version=0;return {async read(){return value?{value:structuredClone(value),etag:String(version)}:null;},async write(next,etag){if(etag!==(value?String(version):undefined)){const e=Error('conflict');e.conflict=true;throw e;}value=structuredClone(next);version++;},snapshot:()=>structuredClone(value)};}
async function fixture(t,store=storage()){let now=100000;const server=http.createServer(createCloudHandler(store,{clock:()=>now}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});const base='http://127.0.0.1:'+server.address().port;
 const get=(p,cookie)=>fetch(base+p,{headers:cookie?{cookie}:{}}),post=(p,cookie,body)=>fetch(base+p,{method:'POST',headers:{cookie,origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)}),role=async p=>(await get(p)).headers.get('set-cookie').split(';')[0];return {get,post,role,store,advance:ms=>now+=ms};}
test('cloud invocations preserve hospital confirmation, role sessions, lease and token across fresh app instances',async t=>{
 const f=await fixture(t),driver=await f.role('/driver/kalavathi-01?demo=1'),hospital=await f.role('/hospital/city'),traffic=await f.role('/traffic/');
 assert.equal((await f.get('/driver/kalavathi-01',driver)).headers.get('set-cookie'),null);assert.match(await(await f.get('/hospital/city',hospital)).text(),/data-transport="polling"/);
 assert.equal((await f.post('/api/demo/request',driver,{request_id:'cloud-one'})).status,200);assert.equal((await f.post('/api/hospital/city/requests/cloud-one/confirm',hospital,{severity:'cardiac'})).status,200);
 f.advance(1000);assert.equal((await f.post('/api/traffic/lease',traffic,{owner:'cloud-worker',protocol:'kalavathi-city-v3'})).status,200);assert.equal((await f.post('/api/traffic/report',traffic,{owner:'cloud-worker',request_id:'cloud-one',state:'granted'})).status,200);
 const patient=await(await f.get('/api/driver/kalavathi-01/state',driver)).json();assert.equal(patient.status,'granted');assert.equal(patient.trust_tier,'hospital_verified');assert.equal(patient.presses_used,1);
 assert.equal((await f.post('/api/hospital/city/requests/cloud-one/revoke',driver,{})).status,401);assert.equal((await f.post('/api/driver/kalavathi-01/cancel',driver,{})).status,200);assert.equal((await(await f.get('/api/traffic/state',traffic)).json()).request.expiry_reason,'cancelled by driver');
});
test('concurrent cloud retries consume one allowance and preserve sessions from both requests',async t=>{
 const f=await fixture(t);const [driver,hospital]=await Promise.all([f.role('/driver/kalavathi-01?demo=1'),f.role('/hospital/city')]);
 const replies=await Promise.all([f.post('/api/demo/request',driver,{request_id:'duplicate-one'}),f.post('/api/demo/request',driver,{request_id:'duplicate-one'})]);assert.ok(replies.every(r=>r.status===200));assert.equal((await(await f.get('/api/driver/kalavathi-01/state',driver)).json()).presses_used,1);assert.equal((await f.get('/api/hospital/city/incoming',hospital)).status,200);
});
test('static assets do not overwrite role cookies and storage failures do not publish uncommitted responses',async t=>{
 const f=await fixture(t);await f.role('/traffic/');const state=f.store.snapshot();const asset=await f.get('/traffic/kalavathi-screen.js');assert.equal(asset.status,200);assert.equal(asset.headers.get('set-cookie'),null);assert.deepEqual(f.store.snapshot(),state);
 const bad=await fixture(t,{read:async()=>{throw Error('unavailable');}});const response=await bad.get('/driver/kalavathi-01');assert.equal(response.status,503);assert.equal(response.headers.get('set-cookie'),null);assert.match(await response.text(),/temporarily unavailable/);
});
