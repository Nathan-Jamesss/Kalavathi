const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Route=require('../static/digital-twin/trip'),Comparison=require('../static/digital-twin/comparison');
function create(){const ctx=vm.createContext({console,performance:{now:()=>0},requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}});vm.runInContext(fs.readFileSync('static/digital-twin/sim.js','utf8'),ctx);return vm.runInContext('SIM',ctx);}
test('saving is calculated against a same-route fixed-signal baseline, including waiting time',()=>{
 const baseline=Comparison.baseline(create,Route);assert.ok(baseline.duration>Route.total/50);assert.equal(baseline.passedAt.length,4);
 const sim=create();sim.reset({seed:20260905});const left=sim.junctionById('J3'),right=sim.junctionById('J4');left.id='J4';right.id='J3';const trip=new Route.Trip(sim);trip.start('priority');
 assert.equal(Comparison.metrics(baseline,trip).saved_s,null,'No invented saving before the first checkpoint');
 for(let i=0;i<12000&&!trip.finished;i++){sim.advance(.025);trip.step(.025);}
 const result=Comparison.metrics(baseline,trip);assert.equal(result.final,true);assert.equal(result.saved_s,Math.round((baseline.duration-trip.elapsed)*10)/10);assert.equal(result.checkpoints.length,4);assert.ok(Number.isFinite(result.saved_s));
});
test('comparison preserves a negative result instead of claiming positive time saved',()=>{
 const stats=Comparison.metrics({duration:50,passedAt:[10,20,30,40]},{finished:true,elapsed:60,index:4,passedAt:[15,25,35,45]});assert.equal(stats.saved_s,-10);
});
