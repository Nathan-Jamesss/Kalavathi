const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {Demo} = require('../lib/demo');

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalavathi-'));
  let now = 100000;
  const demo = new Demo(path.join(dir, 'state.json'), () => now);
  return {demo, dir, advance: ms => {now += ms; demo.tick();}};
}
test('button request, hospital approval and timed safe expiry', () => {
  const {demo, advance, dir} = fixture();
  try {
    assert.equal(demo.request('one').status, 'pending');
    assert.deepEqual(demo.snapshot().junctions, ['R','R','R','R']);
    demo.decide('approve', 'cardiac','one');
    advance(1100);
    assert.deepEqual(demo.snapshot().junctions, ['G','R','R','R']);
    advance(5000);
    assert.deepEqual(demo.snapshot().junctions, ['A','R','R','R']);
    advance(1000);
    assert.deepEqual(demo.snapshot().junctions, ['R','R','R','R']);
    advance(30000);
    assert.equal(demo.snapshot().status, 'completed');
    assert.deepEqual(demo.snapshot().junctions, ['R','R','R','R']);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('retries are idempotent, quota blocks sixth request, hospital can override', () => {
  const {demo,dir} = fixture();
  try {
    demo.request('one'); demo.request('one');
    assert.equal(demo.snapshot().used,1);
    assert.throws(() => demo.request('overlap'), /active/);
    demo.cancel();
    for(let i=2;i<=6;i++){demo.request('req'+i); if(i<6)demo.cancel();}
    assert.equal(demo.snapshot().status,'refused');
    assert.equal(demo.snapshot().used,6);
    assert.throws(() => demo.decide('approve','cardiac','req6'), /override/);
    demo.decide('override','cardiac','req6');
    assert.equal(demo.snapshot().status,'granted');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('restart preserves quota and fails safely; reset preserves lifetime and rejects old retry', () => {
  const {demo,dir} = fixture();
  try {
    demo.request('one'); demo.decide('approve','cardiac','one');
    const restarted = new Demo(path.join(dir,'state.json'));
    assert.equal(restarted.snapshot().used,1);
    assert.equal(restarted.snapshot().status,'cancelled');
    assert.deepEqual(restarted.snapshot().junctions,['R','R','R','R']);
    restarted.reset();
    assert.equal(restarted.snapshot().used,0);
    assert.equal(restarted.snapshot().lifetime,1);
    restarted.request('one');
    assert.equal(restarted.snapshot().used,0);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('pending request expires and an invalid hospital decision is rejected', () => {
  const {demo,advance,dir} = fixture();
  try {
    assert.throws(()=>demo.decide('approve','cardiac'), /request/);
    demo.request('one'); advance(61000);
    assert.equal(demo.snapshot().status,'expired');
    assert.throws(()=>demo.decide('approve','cardiac'), /request/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('stale hospital decisions cannot approve a newer request',()=>{
  const {demo,dir}=fixture();
  try{
    demo.request('old');demo.cancel();demo.request('new');
    assert.throws(()=>demo.decide('approve','cardiac','old'),/changed/);
    assert.equal(demo.snapshot().status,'pending');
    demo.decide('approve','cardiac','new');
    assert.equal(demo.snapshot().status,'granted');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
