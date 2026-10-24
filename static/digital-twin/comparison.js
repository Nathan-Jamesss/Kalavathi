/* Paired fixed-signal baseline for the same scripted route; no real-world saving claim. */
(function(root){
 function baseline(createSim,Route){
  const sim=createSim();sim.reset({seed:20260905});const left=sim.junctions.find(j=>j.x===420&&j.y===560),right=sim.junctions.find(j=>j.x===780&&j.y===560);left.id='J4';right.id='J3';
  const trip=new Route.Trip(sim,{priority:false});trip.start('comparison');
  for(let i=0;i<12000&&!trip.finished;i++){sim.advance(.025);trip.step(.025);}
  if(!trip.finished)return null;return {duration:trip.elapsed,passedAt:trip.passedAt};
 }
 function metrics(reference,trip){
  if(!reference)return null;const checkpoint=trip.index-1;
  const saved=trip.finished?(Math.round(reference.duration*10)-Math.round(trip.elapsed*10))/10:checkpoint>=0?reference.passedAt[checkpoint]-trip.passedAt[checkpoint]:null;
  return {baseline_s:Math.round(reference.duration*10)/10,elapsed_s:Math.round(trip.elapsed*10)/10,saved_s:saved===null?null:Math.round(saved*10)/10,final:trip.finished,checkpoints:trip.passedAt.map(v=>Math.round(v*10)/10)};
 }
 const api={baseline,metrics};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KalavathiComparison=api;
})(globalThis);
