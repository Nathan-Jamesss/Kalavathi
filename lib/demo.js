const fs = require('node:fs');
const path = require('node:path');

function save(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file+'.tmp', JSON.stringify(value,null,2));
  fs.renameSync(file+'.tmp', file);
}

class Demo {
  constructor(file, clock=Date.now) {
    this.file=file; this.clock=clock;
    this.s=fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) :
      {used:0,lifetime:0,status:'idle',requestId:null,created:0,granted:0,severity:null,seen:[],events:[]};
    if(['pending','granted'].includes(this.s.status)) {
      this.s.status='cancelled'; this.log('Server restarted; corridor released.');
    }
    this.persist();
  }
  persist(){save(this.file,this.s);}
  log(message){this.s.events.unshift({time:this.clock(),message});this.s.events=this.s.events.slice(0,40);}
  request(id){
    if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw Error('Invalid request ID');
    if(this.s.seen.includes(id))return this.snapshot();
    if(['pending','granted'].includes(this.s.status))throw Error('A request is already active');
    this.s.seen.push(id);this.s.seen=this.s.seen.slice(-2000);
    this.s.used++;this.s.lifetime++;this.s.requestId=id;
    this.s.created=this.clock();this.s.granted=0;this.s.severity=null;
    this.s.status=this.s.used>5?'refused':'pending';
    this.log(this.s.status==='refused'?'Automatic allowance exceeded; hospital override required.':'Emergency request received; awaiting hospital.');
    this.persist();return this.snapshot();
  }
  decide(action,severity,requestId){
    this.tick();
    if(!['pending','refused'].includes(this.s.status))throw Error('No request awaiting a hospital decision');
    if(requestId!==this.s.requestId)throw Error('The request changed; review the current request before deciding');
    if(!['approve','override','refuse'].includes(action))throw Error('Invalid decision');
    if(action==='approve'&&this.s.used>5)throw Error('Hospital override required');
    if(action!=='refuse'&&!['cardiac','trauma','obstetric','paediatric','general','other'].includes(severity))throw Error('Choose a severity');
    this.s.severity=severity;
    this.s.status=action==='refuse'?'refused':'granted';
    this.s.granted=action==='refuse'?0:this.clock();
    this.log(action==='refuse'?'Hospital refused request.':`Hospital ${action==='override'?'overrode allowance and approved':'approved'} request (${severity}).`);
    this.persist();return this.snapshot();
  }
  cancel(){this.s.status='cancelled';this.log('Request cancelled; all junctions red.');this.persist();return this.snapshot();}
  reset(){
    this.s.used=0;this.s.status='idle';this.s.requestId=null;this.s.created=0;this.s.granted=0;this.s.severity=null;this.s.externalTraffic=false;
    this.log('Demo reset; software allowance renewed. Lifetime usage retained.');this.persist();return this.snapshot();
  }
  tick(){
    let changed=false;
    if(this.s.status==='pending'&&!this.s.externalTraffic&&this.clock()-this.s.created>=60000){this.s.status='expired';this.log('Hospital response timed out.');changed=true;}
    if(this.s.status==='granted'&&!this.s.externalTraffic&&this.clock()-this.s.granted>=27000){this.s.status='completed';this.log('Vehicle arrived; corridor released.');changed=true;}
    if(changed)this.persist();
  }
  snapshot(){
    const junctions=['R','R','R','R'];let progress=0;
    if(this.s.status==='granted'){
      const elapsed=Math.max(0,this.clock()-this.s.granted-1000);
      progress=Math.min(1,elapsed/26000);
      const junction=Math.floor(elapsed/6500),phase=elapsed%6500;
      if(this.clock()-this.s.granted>=1000&&junction<4)junctions[junction]=phase<5000?'G':phase<6000?'A':'R';
    }
    return {status:this.s.status,requestId:this.s.requestId,used:this.s.used,lifetime:this.s.lifetime,
      remaining:Math.max(0,5-this.s.used),limit:5,severity:this.s.severity,junctions,progress,
      events:this.s.events,positionSource:'Simulated tabletop route',security:'Software counter; no secure element'};
  }
}
module.exports={Demo,save};
