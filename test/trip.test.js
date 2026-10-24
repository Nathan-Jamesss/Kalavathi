const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Trip,checkpoints,total}=require('../static/digital-twin/trip');
function simulator(){const ctx=vm.createContext({console,performance:{now:()=>0},requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}});vm.runInContext(fs.readFileSync('static/digital-twin/sim.js','utf8'),ctx);const sim=vm.runInContext('SIM',ctx);sim.reset();const left=sim.junctionById('J3'),right=sim.junctionById('J4');left.id='J4';right.id='J3';return sim;}
test('Kalavathi recorded car visits four junctions in order without skipping a red signal',()=>{
 const sim=simulator(),trip=new Trip(sim),passed=[];trip.start('test-token');let last=0;
 for(let i=0;i<8000&&!trip.finished;i++){
  const cp=checkpoints[trip.index],before=trip.distance;sim.advance(.025);const j=cp&&sim.junctionById(cp.id),green=j?.phase===cp?.axis&&j?.state==='green';trip.step(.025);
  if(cp&&before<=cp.at-65&&trip.distance>cp.at-65)assert.equal(green,true,'Car must enter '+cp.id+' only on green');
  if(trip.index>last){passed.push(cp.id);last=trip.index;}
  assert.ok(sim.activeHolds().length<=1,'Only the next junction receives a priority hold');
 }
 assert.equal(trip.finished,true);assert.equal(trip.distance,total);assert.deepEqual(passed,['J1','J2','J3','J4']);assert.equal(sim.activeHolds().length,0);
 assert.deepEqual(trip.snapshot().junctions.map(j=>j.state),['passed','passed','passed','passed']);
});
test('private-car track stops on cancellation and resumes without duplicating the token',()=>{
 const sim=simulator(),trip=new Trip(sim);trip.start('one');for(let i=0;i<100;i++){sim.advance(.05);trip.step(.05);}const distance=trip.distance;trip.clear();trip.step(1);assert.equal(trip.distance,distance);assert.equal(sim.activeHolds().length,0);trip.start('one');assert.equal(trip.distance,distance);trip.start('two');assert.equal(trip.distance,0);
});
