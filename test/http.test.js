const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createApp}=require('../server');
test('HTTP authentication, role boundaries, validation and full approval flow',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kalavathi-http-'));
  const {server,config}=createApp({dataDir:dir});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(route,body,key=config.operatorKey,header='X-Operator-Key',extra={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',[header]:key,...extra},body:JSON.stringify(body)});
  try{
    assert.equal((await post('/api/reset',{},'wrong')).status,401);
    assert.equal((await post('/api/decision',{action:'approve',severity:'cardiac'},config.deviceKey,'X-Device-Key')).status,401);
    assert.equal((await post('/api/reset',{},config.operatorKey,'X-Operator-Key',{Origin:'http://evil.example'})).status,403);
    assert.equal((await post('/api/request',{request_id:'<script>'})).status,409);
    assert.equal((await post('/api/request',{request_id:'http-one'},config.deviceKey,'X-Device-Key')).status,401);
    assert.equal((await post('/api/device/request',{request_id:'http-one'},config.deviceKey,'X-Device-Key')).status,200);
    assert.equal((await post('/api/decision',{action:'approve',severity:'cardiac',request_id:'stale'})).status,409);
    assert.equal((await post('/api/decision',{action:'approve',severity:'cardiac',request_id:'http-one'})).status,200);
    const state=await(await fetch(base+'/api/state')).json();assert.equal(state.status,'granted');assert.equal(state.used,1);
    const device=await fetch(base+'/api/device/state',{headers:{'X-Device-Key':config.deviceKey}});assert.equal(await device.text(),'granted');
    assert.equal((await post('/api/cancel',{})).status,200);
    assert.equal((await post('/api/reset',{})).status,200);
    assert.equal(await(await fetch(base+'/api/junctions')).text(),'R R R R');
    assert.equal((await fetch(base+'/data/config.json')).status,404);
    assert.equal((await fetch(base+'/')).status,200);
    const home=await(await fetch(base+'/')).text();assert.match(home,/Choose your role/);
    for(const route of ['/traffic','/hospital/city?mock=1','/driver/kalavathi-01?mock=1','/static/hospital.js','/static/hospital.css','/static/hospital-fixtures.js','/static/portal.css'])assert.equal((await fetch(base+route)).status,200,route);
    assert.match(await(await fetch(base+'/hospital/city')).text(),/Hospital workspace/);
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
