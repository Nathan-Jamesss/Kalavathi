/* Offline Kalavathi city. Shared by server, patient map and traffic renderer. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KalavathiCity=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const width=2200,height=1700,cols=[400,850,1300,1750],rows=[300,650,1000,1350];
 const nodes=rows.flatMap((y,r)=>cols.map((x,c)=>({id:'J'+(r*4+c+1),x,y,r,c})));
 const node=id=>nodes.find(n=>n.id===id);
 const home={x:190,y:195,gate:{x:250,y:300},node:'J1'};
 const hospitals=[{id:'city',name:'City Hospital',node:'J16',x:1940,y:1460,gate:{x:1940,y:1350}}, {id:'riverside',name:'Riverside Medical Centre',node:'J4',x:1940,y:185,gate:{x:1940,y:300}}, {id:'central',name:'Central Care',node:'J13',x:190,y:1460,gate:{x:250,y:1350}}];
 const edges=[];for(const a of nodes)for(const b of nodes)if(b.id!==a.id&&Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1){const length=Math.hypot(a.x-b.x,a.y-b.y),busy=((a.r+b.r)*3+a.c+b.c)%5;edges.push({from:a.id,to:b.id,length,delay:5+busy*4});}
 function route(hospital='city',weighted=true){const h=hospitals.find(h=>h.id===hospital)||hospitals[0],dist=Object.fromEntries(nodes.map(n=>[n.id,Infinity])),prev={},open=new Set(nodes.map(n=>n.id));dist[home.node]=0;
  while(open.size){const u=[...open].sort((a,b)=>dist[a]-dist[b])[0];open.delete(u);if(u===h.node)break;for(const e of edges.filter(e=>e.from===u&&open.has(e.to))){const d=dist[u]+e.length/45+(weighted?e.delay:0);if(d<dist[e.to]){dist[e.to]=d;prev[e.to]=u;}}}
  const ids=[h.node];while(ids[0]!==home.node)ids.unshift(prev[ids[0]]);
  const points=[home.gate,...ids.map(node),h.gate],length=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);
  return {hospital_id:h.id,ids,points:points.map(p=>({x:p.x,y:p.y})),length,cost_s:dist[h.node]+340/45,optimized:weighted};
 }
 function geometry(points){let total=0;const segments=points.slice(1).map((b,i)=>{const a=points[i],length=Math.hypot(b.x-a.x,b.y-a.y),start=total;total+=length;return {a,b,length,start,angle:Math.atan2(b.y-a.y,b.x-a.x),axis:a.y===b.y?'EW':'NS'};});return {segments,total};}
 function position(path,d,lane=12){const g=path.segments?path:geometry(path);
  // Round a turn inside its junction, retaining the correct side of each road.
  for(let i=1;i<g.segments.length;i++){const a=g.segments[i-1],b=g.segments[i],boundary=b.start;if(Math.abs(d-boundary)>32||Math.abs(a.angle-b.angle)<.01)continue;
   const t=(d-boundary+32)/64,u=1-t,p={x:a.b.x-Math.cos(a.angle)*32-Math.sin(a.angle)*lane,y:a.b.y-Math.sin(a.angle)*32+Math.cos(a.angle)*lane},q={x:b.a.x+Math.cos(b.angle)*32-Math.sin(b.angle)*lane,y:b.a.y+Math.sin(b.angle)*32+Math.cos(b.angle)*lane},c={x:b.a.x-(Math.sin(a.angle)+Math.sin(b.angle))*lane,y:b.a.y+(Math.cos(a.angle)+Math.cos(b.angle))*lane};
   return {x:u*u*p.x+2*u*t*c.x+t*t*q.x,y:u*u*p.y+2*u*t*c.y+t*t*q.y,angle:Math.atan2(u*(c.y-p.y)+t*(q.y-c.y),u*(c.x-p.x)+t*(q.x-c.x))};
  }
  const s=g.segments.find(s=>d<=s.start+s.length)||g.segments.at(-1),t=Math.max(0,Math.min(1,(d-s.start)/s.length));return {x:s.a.x+(s.b.x-s.a.x)*t-Math.sin(s.angle)*lane,y:s.a.y+(s.b.y-s.a.y)*t+Math.cos(s.angle)*lane,angle:s.angle};}
 function checkpoints(points){let d=0;return points.slice(1).flatMap((p,i)=>{d+=Math.hypot(p.x-points[i].x,p.y-points[i].y);const n=nodes.find(n=>n.x===p.x&&n.y===p.y);return n?[{id:n.id,d,axis:p.y===points[i].y?'EW':'NS'}]:[];});}
 class Engine{
  constructor({hospital='city',priority=true,seed=73}={}){this.priority=priority;this.route=route(hospital);this.time=0;this.seed=seed;this.cars=[];this.passedAt=[];this.running=true;this.signals=nodes.map((n,i)=>({...n,phase:i%2?'NS':'EW',age:0,mode:'green',target:null,owner:null}));this.patient=this.makeCar(this.route.points,true);this.cars.push(this.patient);for(let i=0;i<68;i++)this.spawn(i);}
  random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/4294967296;}
  makeCar(points,patient=false){return {points,path:geometry(points),checks:checkpoints(points),d:patient?0:-30-this.random()*300,speed:0,patient,passed:0,done:false,color:Math.floor(this.random()*4)};}
  spawn(index){const r=Math.floor(this.random()*4),c=Math.floor(this.random()*4),horizontal=this.random()<.5,reverse=this.random()<.5;let list=nodes.filter(n=>horizontal?n.r===r:n.c===c);if(reverse)list.reverse();const a=list[0],b=list.at(-1),start=horizontal?{x:reverse?2170:30,y:a.y}:{x:a.x,y:reverse?1670:30},end=horizontal?{x:reverse?30:2170,y:b.y}:{x:b.x,y:reverse?30:1670};const car=this.makeCar([start,...list,end]);car.d=-index*29-this.random()*150;for(let attempt=0;attempt<20;attempt++){const d=this.random()*car.path.total,p=position(car.path,d);if(car.checks.some(c=>Math.abs(c.d-d)<85))continue;if(this.cars.some(v=>{const q=position(v.path,Math.max(0,v.d));return v.d>=0&&Math.hypot(p.x-q.x,p.y-q.y)<42;}))continue;car.d=d;break;}this.cars.push(car);}
  step(dt){if(!this.running)return;this.time+=dt;
   const ahead=this.patient.checks.filter(c=>this.patient.d<c.d+62).slice(0,2),demands=new Map();if(this.priority&&!this.patient.done)for(const c of ahead)if(c.d-this.patient.d<440)demands.set(c.id,c.axis);
   for(const s of this.signals){s.age+=dt;const desired=demands.get(s.id);if(s.mode==='green'){if((desired&&desired!==s.phase&&s.age>=5)||(!desired&&s.age>=18)){s.target=desired||(s.phase==='EW'?'NS':'EW');s.mode='amber';s.age=0;}}
    else if(s.mode==='amber'&&s.age>=2){s.mode='allred';s.age=0;}else if(s.mode==='allred'&&s.age>=1&&!s.owner){s.phase=s.target;s.mode='green';s.age=0;}}
   const ordered=[...this.cars].sort((a,b)=>b.d-a.d);
   for(const car of ordered){if(car.done)continue;let limit=car.path.total;
    for(const c of car.checks){const s=this.signals.find(s=>s.id===c.id);if(car.d>=c.d+62){if(s.owner===car)s.owner=null;continue;}
     if(car.d<=c.d-52+.001&&s.owner!==car){if(s.mode!=='green'||s.phase!==c.axis||(s.owner&&s.owner!==car))limit=Math.min(limit,c.d-52);else if(car.d>=c.d-54)s.owner=car;}
     else if(car.d<c.d+62){if(!s.owner)s.owner=car;}
     break;
    }
    const p=position(car.path,Math.max(0,car.d));for(const other of this.cars){if(other===car||other.done)continue;const q=position(other.path,Math.max(0,other.d));const along=(q.x-p.x)*Math.cos(p.angle)+(q.y-p.y)*Math.sin(p.angle),across=Math.abs(-(q.x-p.x)*Math.sin(p.angle)+(q.y-p.y)*Math.cos(p.angle));if(along>0&&across<15&&Math.cos(p.angle-q.angle)>.9&&other.d>=0)limit=Math.min(limit,car.d+along-32);}
    const gap=Math.max(0,limit-car.d),target=Math.min(car.patient?48:38,Math.sqrt(2*45*gap));car.speed=Math.max(0,Math.min(target,car.speed+35*dt));car.d+=Math.min(gap,car.speed*dt);
    while(car.passed<car.checks.length&&car.d>=car.checks[car.passed].d+60){if(car.patient)this.passedAt.push(this.time);car.passed++;}
    if(car.d>=car.path.total-.01){car.done=true;car.speed=0;for(const s of this.signals)if(s.owner===car)s.owner=null;if(car.patient){this.finished=this.time;}}
   }
   // Recycle ordinary traffic at the boundary, retaining the same deterministic demand.
   for(const car of this.cars)if(car.done&&!car.patient){car.done=false;car.d=-100-this.random()*500;car.passed=0;car.speed=0;}
  }
  snapshot(){const p=position(this.patient.path,this.patient.d);return {state:this.patient.done?'completed':'granted',junctions:this.patient.checks.map(c=>{const s=this.signals.find(s=>s.id===c.id);return {id:c.id,state:this.patient.d>=c.d+60?'passed':s.mode==='green'&&s.phase===c.axis&&this.priority&&c.d-this.patient.d<440?'green':'reserved'};}),vehicle:{x:p.x,y:p.y,remaining_m:Math.max(0,(this.route.length-this.patient.d)*2),remaining_s:Math.ceil(Math.max(0,this.route.length-this.patient.d)/32)}};}
 }
 function baseline(hospital){const e=new Engine({hospital,priority:false});while(!e.finished&&e.time<540)e.step(.025);return e.finished?{total:e.finished,checkpoints:e.passedAt}:null;}
 function metrics(base,e){if(!base)return null;const i=e.passedAt.length-1,b=Math.round(base.total*10)/10,t=Math.round((e.finished||e.time)*10)/10;return {baseline_s:b,elapsed_s:t,saved_s:e.finished?Math.round((b-t)*10)/10:i>=0?Math.round((base.checkpoints[i]-e.passedAt[i])*10)/10:null,final:!!e.finished,checkpoints:e.passedAt};}
 return {width,height,cols,rows,nodes,edges,node,home,hospitals,route,geometry,position,checkpoints,Engine,baseline,metrics};
});
