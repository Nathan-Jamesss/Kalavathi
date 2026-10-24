const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalizeState,remaining,changeDeadline,canCancel}=require('../static/driver.js');
test('driver validates incoming status and keeps quota bounded',()=>{
  assert.throws(()=>normalizeState({status:'invented'}),/status/);
  const state=normalizeState({status:'pending',presses_used:6,presses_allowed:5});
  assert.equal(remaining(state),0);
  assert.equal(state.destination,null);
  assert.equal(normalizeState({status:'arrived'}).status,'expired');
  assert.deepEqual(normalizeState({status:'granted',junctions:[null,{id:'J1',name:'Market',state:'invalid'}]}).junctions,[{id:'J1',name:'Market',state:'released'}]);
});
test('countdown cannot be extended by repeated pending snapshots',()=>{
  const first=changeDeadline(null,15,1000);
  assert.equal(first,16000);
  assert.equal(changeDeadline(first,15,4000),16000);
  assert.equal(changeDeadline(first,2,4000),6000);
  assert.equal(changeDeadline(first,0,4000),4000);
});
test('cancel is available only during an active request',()=>{
  for(const status of ['pending','granted','redirected','refused'])assert.ok(canCancel(status));
  for(const status of ['idle','expired'])assert.equal(canCancel(status),false);
});
