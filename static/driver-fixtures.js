(function(root){
  const city={id:'city',name:'City Hospital',tags:['cardiac','general'],eta_s:420};
  const hospitals=[city,{id:'riverside',name:'Riverside Medical Centre',tags:['cardiac','trauma'],distance_km:3.2,eta_s:540},{id:'central',name:'Central Care',tags:['cardiac','obstetric','paediatric'],distance_km:4.6,eta_s:660}];
  hospitals[0]={...city,distance_km:2.4};
  const base={status:'idle',trust_tier:'self_declared',severity:null,destination:null,change_window_s_left:0,presses_used:0,presses_allowed:5,junctions:[],reason:null,expiry_reason:null};
  const states=[
    {label:'Idle',state:{...base}},
    {label:'Pending',state:{...base,status:'pending',destination:city,severity:'cardiac',change_window_s_left:15,presses_used:1}},
    {label:'Granted',state:{...base,status:'granted',trust_tier:'hospital_verified',severity:'cardiac',destination:{...city,eta_s:300},presses_used:1,junctions:[{id:'J1',name:'Market junction',state:'passed'},{id:'J2',name:'Station junction',state:'green'},{id:'J3',name:'River junction',state:'reserved'},{id:'J4',name:'Hospital junction',state:'reserved'}]}},
    {label:'Redirected',state:{...base,status:'redirected',trust_tier:'hospital_verified',severity:'cardiac',destination:hospitals[1],previous_destination:city,reason:'Cardiac team unavailable at City Hospital.',presses_used:1}},
    {label:'Refused',state:{...base,status:'refused',destination:city,presses_used:5,reason:'Allocation used (5 of 5). Request sent to hospital for review.'}},
    {label:'Expired',state:{...base,status:'expired',presses_used:1,expiry_reason:'time cap'}},
    {label:'Arrived',state:{...base,status:'expired',presses_used:1,expiry_reason:'arrived'}}
  ];
  const fixtures={states,hospitals};if(typeof module!=='undefined'&&module.exports)module.exports=fixtures;else root.DriverFixtures=fixtures;
})(globalThis);
