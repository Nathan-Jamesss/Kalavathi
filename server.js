const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Demo,save}=require('./lib/demo');
const {Workflow}=require('./lib/workflow');

function createApp({dataDir=path.join(__dirname,'data'),clock=Date.now,demoMode=false}={}){
  const configFile=path.join(dataDir,'config.json');
  const config=fs.existsSync(configFile)?JSON.parse(fs.readFileSync(configFile,'utf8')):
    {deviceKey:crypto.randomBytes(24).toString('hex'),operatorKey:crypto.randomBytes(18).toString('hex')};
  if(!fs.existsSync(configFile))save(configFile,config);
  const demo=new Demo(path.join(dataDir,'state.json'),clock);
  const workflow=new Workflow(path.join(dataDir,'workflow.json'),demo,clock);
  const sessionsFile=path.join(dataDir,'demo-sessions.json');
  const sessions=new Map(demoMode&&fs.existsSync(sessionsFile)?JSON.parse(fs.readFileSync(sessionsFile,'utf8')).filter(([,s])=>s.until>clock()):[]);
  function cookieName(role,id){return 'kalavathi-'+role+(role==='hospital'?'-'+encodeURIComponent(id):'');}
  function cookie(req,role,id){const match=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName(role,id)+'='));return match?.split('=')[1];}
  function mint(req,res,role,id){if(!demoMode)return;const old=sessions.get(cookie(req,role,id));if(old&&old.id===id&&old.role===role&&old.until>clock())return;const token=crypto.randomBytes(24).toString('hex');sessions.set(token,{role,id,until:clock()+12*3600000});save(sessionsFile,[...sessions]);res.setHeader('Set-Cookie',`${cookieName(role,id)}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);}
  function roleAllowed(req,role,id){if(!demoMode)return false;const s=sessions.get(cookie(req,role,id));return !!s&&s.until>clock()&&s.role===role&&(id===undefined||s.id===id);}
  let deviceSeen=0;
  const staticFiles={'/traffic':'index.html','/hospital-legacy':'index.html','/app.js':'app.js','/style.css':'style.css'};
  function equal(a,b){return typeof a==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
  function authorized(req,role){return equal(req.headers[role==='device'?'x-device-key':'x-operator-key'],config[role==='device'?'deviceKey':'operatorKey']);}
  const server=http.createServer(async(req,res)=>{
    function reply(code,value,type='application/json',traffic=false){
      res.writeHead(code,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
        'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'"+(traffic?" 'unsafe-inline'":"")+"; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'self'; base-uri 'none'"});
      res.end(type==='application/json'?JSON.stringify(value):value);
    }
    try{
      const url=new URL(req.url,'http://localhost');
      demo.tick();
      workflow.tick();
      const driverMatch=url.pathname.match(/^\/api\/driver\/([^/]+)\/(state|destination|cancel)$/);
      const hospitalMatch=url.pathname.match(/^\/api\/hospital\/([^/]+)\/(incoming|availability|requests\/([^/]+)\/(confirm|approve_over_limit|redirect|revoke))$/);
      if(req.method==='GET'&&url.pathname==='/api/hospitals')return reply(200,workflow.hospitals().filter(h=>!url.searchParams.get('type')||h.tags.includes(url.searchParams.get('type'))));
      if(req.method==='GET'&&driverMatch&&driverMatch[2]==='state'){
        if(!roleAllowed(req,'driver',driverMatch[1]))return reply(401,{error:'Open the patient page on this local demo server first'});
        return reply(200,workflow.driver(driverMatch[1]));
      }
      if(req.method==='GET'&&hospitalMatch&&hospitalMatch[2]==='incoming'){
        if(!roleAllowed(req,'hospital',hospitalMatch[1]))return reply(401,{error:'Open the hospital page on this local demo server first'});
        return reply(200,workflow.incoming(hospitalMatch[1]));
      }
      if(req.method==='GET'&&url.pathname==='/api/traffic/state'){
        if(!roleAllowed(req,'traffic'))return reply(401,{error:'Open the traffic page first'});return reply(200,workflow.traffic());
      }
      if(req.method==='GET'&&url.pathname==='/api/state')return reply(200,{...demo.snapshot(),deviceOnline:deviceSeen>0&&clock()-deviceSeen<5000});
      if(req.method==='GET'&&url.pathname==='/api/junctions')return reply(200,(demo.s.externalTraffic?workflow.lamps():demo.snapshot().junctions).join(' '),'text/plain');
      if(req.method==='GET'&&url.pathname==='/api/device/state'){
        if(!authorized(req,'device'))return reply(401,{error:'Device key required'});
        deviceSeen=clock();return reply(200,demo.snapshot().status,'text/plain');
      }
      // Role interfaces. Production hospital/driver APIs and sockets belong to FastAPI.
      if(req.method==='GET'&&url.pathname==='/')return reply(200,fs.readFileSync(path.join(__dirname,'templates','home.html'),'utf8'),'text/html');
      if(req.method==='GET'&&(/^\/hospital(?:\/[^/]+)?\/?$/.test(url.pathname))){
        mint(req,res,'hospital',url.pathname.split('/')[2]||'city');
        return reply(200,fs.readFileSync(path.join(__dirname,'templates','hospital.html'),'utf8'),'text/html');
      }
      if(req.method==='GET'&&(/^\/driver(?:\/[^/]+)?\/?$/.test(url.pathname))){
        mint(req,res,'driver',url.pathname.split('/')[2]||'kalavathi-01');
        return reply(200,fs.readFileSync(path.join(__dirname,'templates','driver.html'),'utf8'),'text/html');
      }
      if(req.method==='GET'&&url.pathname==='/traffic'){res.writeHead(302,{Location:'/traffic/'});return res.end();}
      if(req.method==='GET'&&url.pathname.startsWith('/traffic/')){
        const name=url.pathname.slice('/traffic/'.length)||'index.html';
        if(!/^(?:[a-zA-Z0-9_-]+\.(?:html|js|css)|lib\/[a-zA-Z0-9_.-]+\.(?:js|css|ttf|woff2))$/.test(name)||['config.example.js'].includes(name))return reply(404,{error:'Not found'});
        const file=path.join(__dirname,'static','digital-twin',name);if(!fs.existsSync(file))return reply(404,{error:'Not found'});
        mint(req,res,'traffic','network');const ext=path.extname(file),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.woff2':'font/woff2'}[ext];
        return reply(200,fs.readFileSync(file),type,true);
      }
      const driverAssets={'/static/driver.css':['driver.css','text/css'],'/static/driver.js':['driver.js','text/javascript'],'/static/driver-fixtures.js':['driver-fixtures.js','text/javascript']};
      for(const name of ['city-model.js','portal.css','hospital.css','hospital.js','hospital-fixtures.js'])driverAssets['/static/'+name]=[name,name.endsWith('.css')?'text/css':'text/javascript'];
      if(req.method==='GET'&&Object.hasOwn(driverAssets,url.pathname)){
        const [file,type]=driverAssets[url.pathname];return reply(200,fs.readFileSync(path.join(__dirname,'static',file),'utf8'),type);
      }
      if(req.method==='GET'&&Object.hasOwn(staticFiles,url.pathname)){
        const file=staticFiles[url.pathname];const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
        return reply(200,fs.readFileSync(path.join(__dirname,'public',file),'utf8'),type);
      }
      if(req.method!=='POST')return reply(404,{error:'Not found'});
      if(driverMatch||hospitalMatch||url.pathname.startsWith('/api/traffic/')||url.pathname.startsWith('/api/demo/')){
        if(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host)return reply(403,{error:'Same-origin request required'});
        if(!(req.headers['content-type']||'').startsWith('application/json'))return reply(415,{error:'JSON required'});
        let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)return reply(413,{error:'Request too large'});}
        let input;try{input=JSON.parse(raw||'{}');}catch{return reply(400,{error:'Invalid JSON'});}if(!input||typeof input!=='object'||Array.isArray(input))return reply(400,{error:'JSON object required'});
        if(driverMatch){if(!roleAllowed(req,'driver',driverMatch[1]))return reply(401,{error:'Patient demo session required'});if(driverMatch[2]==='destination')return reply(200,workflow.destination(driverMatch[1],input.hospital_id));if(driverMatch[2]==='cancel')return reply(200,workflow.cancel(driverMatch[1]));}
        if(hospitalMatch){if(!roleAllowed(req,'hospital',hospitalMatch[1]))return reply(401,{error:'Hospital demo session required'});return reply(200,hospitalMatch[2]==='availability'?workflow.availability(hospitalMatch[1],input.accepting):workflow.decision(hospitalMatch[1],hospitalMatch[3],hospitalMatch[4],input));}
        if(url.pathname==='/api/demo/request'){if(!demoMode||!roleAllowed(req,'driver','kalavathi-01'))return reply(403,{error:'Connected demo mode required'});return reply(200,workflow.request(input.request_id||crypto.randomUUID(),'kalavathi-01',input.declared_type||'general'));}
        if(url.pathname.startsWith('/api/traffic/')){if(!roleAllowed(req,'traffic'))return reply(401,{error:'Traffic demo session required'});if(url.pathname==='/api/traffic/lease'){if(input.protocol!=='kalavathi-city-v3')return reply(409,{error:'Reload the Kalavathi traffic page'});return reply(200,workflow.claim(input.owner));}if(url.pathname==='/api/traffic/report')return reply(200,workflow.report(input));if(url.pathname==='/api/traffic/override')return reply(200,workflow.override(input.request_id,input.action));if(url.pathname==='/api/traffic/reset'&&demoMode)return reply(200,workflow.reset());}
        return reply(404,{error:'Not found'});
      }
      if(req.headers.origin){
        let origin;try{origin=new URL(req.headers.origin);}catch{return reply(403,{error:'Invalid origin'});}
        if(origin.host!==req.headers.host)return reply(403,{error:'Cross-origin request refused'});
      }
      const deviceRoute=url.pathname.startsWith('/api/device/');
      if(!authorized(req,deviceRoute?'device':'operator'))return reply(401,{error:deviceRoute?'Device key required':'Enter the operator key shown in the server window'});
      if(!(req.headers['content-type']||'').startsWith('application/json'))return reply(415,{error:'JSON required'});
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2048)return reply(413,{error:'Request too large'});}
      let input;try{input=JSON.parse(body||'{}');}catch{return reply(400,{error:'Invalid JSON'});}
      if(!input||typeof input!=='object'||Array.isArray(input))return reply(400,{error:'JSON object required'});
      let state;
      if(url.pathname==='/api/request'||url.pathname==='/api/device/request'){workflow.request(input.request_id,'kalavathi-01',input.declared_type||'general');state=demo.snapshot();}
      else if(url.pathname==='/api/decision')state=demo.decide(input.action,input.severity,input.request_id);
      else if(url.pathname==='/api/reset'||url.pathname==='/api/device/reset'){workflow.reset();state=demo.snapshot();}
      else if(url.pathname==='/api/cancel'||url.pathname==='/api/device/cancel'){if(workflow.current()&&['pending','confirmed','granted'].includes(workflow.current().status))workflow.cancel('kalavathi-01');else demo.cancel();state=demo.snapshot();}
      else return reply(404,{error:'Not found'});
      if(deviceRoute)deviceSeen=clock();
      reply(200,state);
    }catch(error){
      if(res.headersSent){res.end();return;}
      const expected=/Invalid|Choose|request|override|active|Destination|Traffic|hospital|capable|confirmed|decision/.test(error.message);
      if(!expected)console.error(error);
      reply(expected?409:500,{error:expected?error.message:'Server could not save the request; check the server window'});
    }
  });
  server.requestTimeout=5000;server.headersTimeout=5000;
  const sockets=new Set();
  server.on('upgrade',(req,socket)=>{
    const url=new URL(req.url,'http://localhost'),m=url.pathname.match(/^\/ws\/(driver|hospital)\/([^/]+)$/);
    if(!m||!roleAllowed(req,m[1],m[2])||req.headers.origin!==`http://${req.headers.host}`||req.headers['sec-websocket-version']!=='13'||!req.headers['sec-websocket-key']){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
    const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
    const client={socket,role:m[1],id:m[2],last:null};sockets.add(client);socket.on('error',()=>sockets.delete(client));socket.on('close',()=>sockets.delete(client));socket.on('data',data=>{if((data[0]&15)===8)socket.end();else if(data.length>8192)socket.destroy();});
  });
  function broadcast(){for(const client of sockets){try{const data=JSON.stringify(client.role==='driver'?workflow.driver(client.id):workflow.incoming(client.id));if(data===client.last)continue;client.last=data;const payload=Buffer.from(data);let header;if(payload.length<126)header=Buffer.from([129,payload.length]);else if(payload.length<65536)header=Buffer.from([129,126,payload.length>>8,payload.length&255]);else{header=Buffer.alloc(10);header[0]=129;header[1]=127;header.writeBigUInt64BE(BigInt(payload.length),2);}if(client.socket.writableLength>65536){client.socket.destroy();continue;}client.socket.write(Buffer.concat([header,payload]));}catch{client.socket.destroy();}}}
  const timer=setInterval(()=>{demo.tick();workflow.tick();broadcast();},250);timer.unref();server.on('close',()=>{clearInterval(timer);for(const {socket} of sockets)socket.destroy();});
  return {server,config,demo,workflow};
}
if(require.main===module){
  const {server,config}=createApp({demoMode:true});const port=Number(process.env.PORT||8000);
  server.listen(port,'0.0.0.0',()=>{
    console.log(`Kalavathi tabletop demo: http://localhost:${port}`);
    console.log(`Traffic control: http://localhost:${port}/traffic`);
    console.log(`Hospital mock: http://localhost:${port}/hospital/city?mock=1`);
    console.log(`Patient mock: http://localhost:${port}/driver/kalavathi-01?mock=1`);
    console.log(`Hardware-connected hospital controls: http://localhost:${port}/hospital-legacy`);
    console.log(`Operator key (enter on dashboard/hospital phone): ${config.operatorKey}`);
    console.log('Device key: saved in data/config.json. Copy deviceKey into firmware config.h.');
    console.log('Local tabletop use only. Software counter; no hardware signatures.');
    const interfaces=require('node:os').networkInterfaces();
    for(const values of Object.values(interfaces))for(const item of values||[])if(item.family==='IPv4'&&!item.internal)console.log(`Phone URL: http://${item.address}:${port}`);
  });
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={createApp};
