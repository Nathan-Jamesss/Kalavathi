const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {createApp}=require('../server');
test('patient, hospital and traffic share a token and scoped demo sessions cannot cross roles',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kal-connected-')),app=createApp({dataDir:dir,demoMode:true});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
 const session=async route=>(await fetch(base+route)).headers.get('set-cookie').split(';')[0];const get=(route,cookie)=>fetch(base+route,{headers:{Cookie:cookie}});const post=(route,cookie,body={})=>fetch(base+route,{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  const driver=await session('/driver/kalavathi-01?demo=1'),hospital=await session('/hospital/city'),traffic=await session('/traffic/');
  assert.equal((await post('/api/demo/request',hospital,{request_id:'connected-one'})).status,403);
  const pending=await(await post('/api/demo/request',driver,{request_id:'connected-one'})).json();const queue=await(await get('/api/hospital/city/incoming',hospital)).json();assert.equal(queue.requests[0].token_id,pending.token_id);
  assert.equal((await post('/api/hospital/city/requests/connected-one/confirm',driver,{severity:'cardiac'})).status,401);
  assert.equal((await post('/api/hospital/city/requests/connected-one/confirm',hospital,{severity:'cardiac'})).status,200);
  const confirmed=await(await get('/api/driver/kalavathi-01/state',driver)).json();assert.equal(confirmed.trust_tier,'hospital_verified');assert.equal(confirmed.status,'pending');assert.equal(confirmed.token_id,pending.token_id);
  await post('/api/traffic/lease',traffic,{owner:'http-worker',protocol:'kalavathi-city-v3'});assert.equal((await post('/api/traffic/report',traffic,{owner:'http-worker',request_id:'connected-one',state:'granted'})).status,200);assert.equal((await(await get('/api/driver/kalavathi-01/state',driver)).json()).status,'granted');
  await post('/api/driver/kalavathi-01/cancel',driver);assert.equal((await(await get('/api/traffic/state',traffic)).json()).request.status,'cancelled');
  assert.equal((await fetch(base+'/api/driver/kalavathi-01/cancel',{method:'POST',headers:{Cookie:driver,'Content-Type':'application/json'},body:'{}'})).status,403);
  const source=await(await fetch(base+'/traffic/')).text();assert.match(source,/Kalavathi/);assert.match(source,/static\/city-model.js/);assert.doesNotMatch(source,/<script src="https:|priority.js|agent.js|btn-two-amb|MAX-PRESSURE/);
 }finally{app.server.closeAllConnections();await new Promise(resolve=>app.server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
test('demo role sessions survive server restart and hospital scopes remain independent',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kal-restart-'));let app=createApp({dataDir:dir,demoMode:true});
 const listen=async()=>{await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+app.server.address().port;};
 let base=await listen();
 try{
  const driver=(await fetch(base+'/driver/kalavathi-01')).headers.get('set-cookie').split(';')[0];const city=(await fetch(base+'/hospital/city')).headers.get('set-cookie').split(';')[0];const river=(await fetch(base+'/hospital/riverside')).headers.get('set-cookie').split(';')[0];
  assert.notEqual(city.split('=')[0],river.split('=')[0]);
  app.server.closeAllConnections();await new Promise(resolve=>app.server.close(resolve));app=createApp({dataDir:dir,demoMode:true});base=await listen();
  assert.equal((await fetch(base+'/api/driver/kalavathi-01/state',{headers:{Cookie:driver}})).status,200);
  for(const id of ['city','riverside'])assert.equal((await fetch(base+'/api/hospital/'+id+'/incoming',{headers:{Cookie:city+'; '+river}})).status,200);
 }finally{app.server.closeAllConnections();await new Promise(resolve=>app.server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
