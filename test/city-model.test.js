const {test}=require('node:test');const assert=require('node:assert/strict');const C=require('../static/city-model');
test('sixteen connected junctions route to three separate hospital sites',()=>{
 assert.equal(C.nodes.length,16);const paths=C.hospitals.map(h=>C.route(h.id));assert.equal(new Set(paths.map(p=>p.ids.at(-1))).size,3);
 for(const p of paths){assert.equal(p.ids[0],'J1');for(let i=1;i<p.ids.length;i++)assert.ok(C.edges.some(e=>e.from===p.ids[i-1]&&e.to===p.ids[i]));assert.ok(p.length>1000);}
 assert.notDeepEqual(C.route('city').ids,C.route('city',false).ids);
 const cost=p=>p.ids.slice(1).reduce((sum,id,i)=>sum+C.edges.find(e=>e.from===p.ids[i]&&e.to===id).delay, p.length/45);
 assert.ok(cost(C.route('city'))<cost(C.route('city',false)));
});
test('ordinary cars and patient stop at a red signal instead of crossing the stop line',()=>{
 const e=new C.Engine({priority:false});e.cars=[e.patient];const c=e.patient.checks[0],s=e.signals.find(s=>s.id===c.id);s.phase='NS';s.age=0;e.patient.d=c.d-53;e.patient.speed=48;
 for(let i=0;i<100;i++)e.step(.025);assert.ok(e.patient.d<=c.d-52+.001);assert.equal(e.patient.speed,0);
 s.phase='EW';s.mode='green';s.age=0;for(let i=0;i<100;i++)e.step(.025);assert.ok(e.patient.d>c.d);
});
test('green wave clears amber and all-red before changing axis; cross traffic cannot enter on red',()=>{
 const e=new C.Engine();const s=e.signals[0];e.cars=[e.patient];s.phase='NS';s.age=5;e.step(.025);assert.equal(s.mode,'amber');assert.equal(s.phase,'NS');for(let i=0;i<79;i++)e.step(.025);assert.equal(s.mode,'amber');
 for(let i=0;i<5;i++)e.step(.025);assert.equal(s.mode,'allred');for(let i=0;i<42;i++)e.step(.025);assert.equal(s.mode,'green');assert.equal(s.phase,'EW');
});
test('all hospital journeys complete through queued traffic, report real saving and release their corridor',()=>{
 for(const h of C.hospitals){const base=C.baseline(h.id),e=new C.Engine({hospital:h.id});let waiting=false;while(!e.finished&&e.time<540){e.step(.05);if(e.patient.speed<1&&e.time>2)waiting=true;}
  assert.ok(e.finished,h.id+' finishes');assert.equal(e.passedAt.length,e.route.ids.length);assert.ok(e.signals.every(s=>s.owner!==e.patient));const m=C.metrics(base,e);assert.equal(m.final,true);assert.equal(m.saved_s,Math.round((m.baseline_s-m.elapsed_s)*10)/10);assert.ok(m.saved_s>0);assert.ok(e.cars.some(c=>!c.patient));if(h.id==='city')assert.ok(waiting,'patient queues rather than passing through other cars');
 }
});
test('city comparison withholds an unmeasured result and preserves a slower priority trip',()=>{
 const base={total:10,checkpoints:[5]},e={time:2,passedAt:[]};assert.equal(C.metrics(base,e).saved_s,null);
 e.finished=12;e.time=50;e.passedAt=[7];const m=C.metrics(base,e);assert.equal(m.saved_s,-2);assert.equal(m.elapsed_s,12);assert.equal(m.final,true);
});
