const fs=require('fs');const source=fs.readFileSync('vendor/DigitalTwinGenesis/sim.js','utf8');fs.writeFileSync('static/digital-twin/baseline-sim.js','/* Local isolated copy of the unchanged Genesis simulation for comparison. */\nwindow.createKalavathiBaseline = function(){\n'+source+'\nreturn SIM;\n};\n');
let s=fs.readFileSync('static/digital-twin/kalavathi-screen.js','utf8');s=s.replace('let current=null,leader=false,stopped=false;','let current=null,leader=false,stopped=false,reference=null,comparisonValid=false;');
s=s.replace("   const fresh=trip.token!==current.token_id;trip.start(current.token_id);",`   const fresh=trip.token!==current.token_id;
    if(fresh&&current.status==='confirmed'){SIM.reset({seed:20260905});window.KalavathiInitializeMap();reference=KalavathiComparison.baseline(createKalavathiBaseline,KalavathiRoute);comparisonValid=!!reference;}
    else if(fresh){reference=null;comparisonValid=false;}
    trip.start(current.token_id);`);
s=s.replace("...report,reason:'Kalavathi", "...report,comparison:comparisonValid?KalavathiComparison.metrics(reference,trip):null,reason:'Kalavathi");
s=s.replace("window.KalavathiTrafficState.position=trip.position();", "window.KalavathiTrafficState.position=trip.position();window.KalavathiTrafficState.progress=trip.distance/KalavathiRoute.total;");
s=s.replace("window.KalavathiTrafficState.position=current?.vehicle?{...current.vehicle,angle:0}:null;", "window.KalavathiTrafficState.position=current?.vehicle?{...current.vehicle,angle:0}:null;window.KalavathiTrafficState.progress=current?.vehicle?1-current.vehicle.remaining_m/(KalavathiRoute.total/4):0;");
s=s.replace("  const list=$('k-junctions');",`  const comparison=r?.comparison;
  $('k-saved').textContent=comparison?.saved_s==null?'Calculating…':comparison.saved_s>=0?comparison.saved_s.toFixed(1)+' s':Math.abs(comparison.saved_s).toFixed(1)+' s longer';
  $('k-comparison-note').textContent=comparison?.saved_s==null?'Available after the first junction is cleared.':comparison.final?'Completed journey versus the same fixed-signal model.':'Compared at the last cleared junction.';
  $('k-baseline').textContent=comparison?comparison.baseline_s.toFixed(1)+' s without priority':'—';
  $('k-elapsed').textContent=comparison?comparison.elapsed_s.toFixed(1)+' s elapsed':'—';
  const list=$('k-junctions');`);
s=s.replace("trip.index=0;SIM.reset()","trip.index=0;reference=null;comparisonValid=false;SIM.reset()");
fs.writeFileSync('static/digital-twin/kalavathi-screen.js',s);
let w=fs.readFileSync('lib/workflow.js','utf8');w=w.replace("  if(input.state==='completed')",`  if(Object.hasOwn(input,'comparison')){
   const c=input.comparison;
   if(c===null)r.comparison=null;
   else if(c&&Number.isFinite(c.baseline_s)&&c.baseline_s>=0&&c.baseline_s<=600&&Number.isFinite(c.elapsed_s)&&c.elapsed_s>=0&&c.elapsed_s<=600&&(c.saved_s===null||(Number.isFinite(c.saved_s)&&Math.abs(c.saved_s)<=600)))r.comparison={baseline_s:c.baseline_s,elapsed_s:c.elapsed_s,saved_s:c.saved_s,final:c.final===true,checkpoints:Array.isArray(c.checkpoints)?c.checkpoints.filter(Number.isFinite).slice(0,4):[]};
  }
  if(input.state==='completed')`);fs.writeFileSync('lib/workflow.js',w);
for(const file of ['index.html','console.html']){let html=fs.readFileSync('static/digital-twin/'+file,'utf8').replace('<div class="k-card"><span class="k-label">DEVICE ALLOWANCE</span>','<div class="k-card k-savings"><span class="k-label">TIME SAVED · SIGNAL MODEL</span><strong id="k-saved">Calculating…</strong><p id="k-comparison-note">Available after the first junction is cleared.</p><div class="comparison-times"><span id="k-baseline">—</span><span id="k-elapsed">—</span></div></div><div class="k-card"><span class="k-label">DEVICE ALLOWANCE</span>');html=html.replace('<script src="trip.js"></script>','<script src="trip.js"></script><script src="baseline-sim.js"></script><script src="comparison.js"></script>');fs.writeFileSync('static/digital-twin/'+file,html);}
