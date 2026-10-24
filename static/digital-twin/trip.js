/* Kalavathi P1: recorded indoor private-car track, using Genesis signal safety. */
(function(root){
 const points=[{x:80,y:296},{x:420,y:296},{x:764,y:296},{x:764,y:544},{x:420,y:544},{x:80,y:544}];
 const checkpoints=[{id:'J1',at:340,axis:'EW'},{id:'J2',at:684,axis:'EW'},{id:'J3',at:932,axis:'NS'},{id:'J4',at:1276,axis:'EW'}];
 const total=1616;
 class Trip{
  constructor(sim,options={}){this.sim=sim;this.priority=options.priority!==false;this.distance=0;this.index=0;this.token=null;this.running=false;this.finished=false;this.waiting=false;this.elapsed=0;this.passedAt=[];}
  start(token){if(token===this.token){this.running=!this.finished;return;}this.clear();this.token=token;this.distance=0;this.index=0;this.running=true;this.finished=false;this.elapsed=0;this.passedAt=[];}
  clear(){if(this.token)this.sim.clearPriorityHold(this.token);this.running=false;this.waiting=false;}
  position(){let left=this.distance;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(left<=length)return {x:a.x+(b.x-a.x)*left/length,y:a.y+(b.y-a.y)*left/length,angle:Math.atan2(b.y-a.y,b.x-a.x)};left-=length;}return {...points.at(-1),angle:Math.PI};}
  step(dt){
   if(!this.running||this.finished)return;const step=Math.max(0,Math.min(dt,.25));this.elapsed+=step;const cp=checkpoints[this.index];let next=Math.min(total,this.distance+step*50);
   if(cp){
    if(this.priority){this.sim.clearPriorityHold(this.token);this.sim.addPriorityHold(this.token,[cp.id],cp.axis,8);}
    const j=this.sim.junctionById(cp.id),green=j&&j.state==='green'&&j.phase===cp.axis;
    this.waiting=!green&&this.distance<cp.at;
    if(!green&&this.distance<=cp.at-65)next=Math.min(next,cp.at-65);
    this.distance=next;
    if(this.distance>=cp.at+50){this.sim.clearPriorityHold(this.token);this.passedAt.push(this.elapsed);this.index++;this.waiting=false;}
   }else this.distance=next;
   if(this.distance>=total){this.finished=true;this.clear();}
  }
  snapshot(){const p=this.position();return {state:this.finished?'completed':'granted',junctions:checkpoints.map((cp,i)=>{const j=this.sim.junctionById(cp.id);return {id:cp.id,state:i<this.index?'passed':i===this.index&&j?.state==='green'&&j.phase===cp.axis?'green':'reserved'};}),vehicle:{x:p.x,y:p.y,remaining_m:Math.round((total-this.distance)/4),remaining_s:Math.ceil((total-this.distance)/50)},waiting:this.waiting,progress:this.distance/total};}
 }
 const out={Trip,points,checkpoints,total};if(typeof module!=='undefined'&&module.exports)module.exports=out;else root.KalavathiRoute=out;
})(globalThis);
