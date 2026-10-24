(function(root){
  const now=()=>new Date().toISOString();
  const hospitals=[{id:'city',name:'City Hospital',tags:['cardiac','general'],distance_m:2400,eta_s:420,accepting:true},{id:'riverside',name:'Riverside Medical Centre',tags:['cardiac','trauma'],distance_m:3200,eta_s:540,accepting:true},{id:'central',name:'Central Care',tags:['obstetric','paediatric','general'],distance_m:4600,eta_s:660,accepting:false}];
  function make(kind,index=1){
    const history=[{ts:now(),outcome:'hospital-confirmed'},{ts:now(),outcome:'arrival-confirmed'}];
    const item={request_id:'demo-'+index,device_id:'kalavathi-'+String(index).padStart(2,'0'),received_at:now(),declared_type:'cardiac',trust_tier:'self_declared',status:'pending',eta_s:420,distance_m:2400,signature_valid:true,key_fingerprint:'DEMO-KEY-ONLY · not a real signature',record:{presses_used:1,presses_allowed:5,history,summary_tier:'clean'},junctions:['J1','J2','J3','J4'].map((id,i)=>({id,name:'Junction '+(i+1),state:i===0?'passed':'reserved'})),redirected_from:null};
    if(kind==='over')item.record.presses_used=6;
    if(kind==='bad'){item.record.history=[{ts:now(),outcome:'EXPIRED-UNCONFIRMED'},{ts:now(),outcome:'self-cancelled'}];item.record.summary_tier='unconfirmed';item.record.presses_used=4;}
    if(kind==='invalid')item.signature_valid=false;
    if(kind==='cancelled'){item.status='cancelled';item.reason='Cancelled by the driver.';}
    if(kind==='redirected')item.redirected_from='Riverside Medical Centre';
    if(kind==='handled'){item.status='handled_elsewhere';item.reason='Already handled by another hospital.';}
    return item;
  }
  const fixtures={hospitals,make};if(typeof module!=='undefined'&&module.exports)module.exports=fixtures;else root.HospitalFixtures=fixtures;
})(globalThis);
