// Serverless adapter: publish a response only after the shared state is committed.
const {Readable}=require('node:stream');
const {createApp}=require('../server');
const clone=value=>value==null?null:structuredClone(value);
function memoryStore(snapshot={}){const data=clone(snapshot);return {data,read:key=>clone(data[key]),write:(key,value)=>{data[key]=clone(value);}};}
async function execute(snapshot,request,body,clock=Date.now){
 const store=memoryStore(snapshot),app=createApp({stateStore:store,demoMode:true,clock}),req=Readable.from(body?[Buffer.from(body)]:[]);Object.assign(req,{method:request.method,url:request.url,headers:request.headers});
 const result={status:200,headers:{},body:Buffer.alloc(0)},res={headersSent:false,setHeader(k,v){result.headers[k]=v;},writeHead(status,headers={}){result.status=status;Object.assign(result.headers,headers);this.headersSent=true;},end(body=''){result.body=Buffer.isBuffer(body)?body:Buffer.from(String(body));}};
 await app.server.listeners('request')[0](req,res);store.write('lease',app.workflow.lease);return {snapshot:store.data,...result};
}
function createCloudHandler(storage,{clock=Date.now,retries=8}={}){
 return async(req,res)=>{
  if(req.url.startsWith('/ws/')){res.writeHead(426,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({transport:'polling'}));return;}
  let body='';for await(const part of req){body+=part;if(Buffer.byteLength(body)>8192){res.writeHead(413);res.end('Request too large');return;}}
  // These responses cannot change a token or mint a role session. No Blob reads needed.
  const pathname=req.url.split('?')[0],asset=pathname==='/'||pathname.startsWith('/static/')||/^\/traffic\/(?:[a-zA-Z0-9_-]+\.(?:js|css)|lib\/[^/]+)$/.test(pathname);
  try{
   if(asset){const out=await execute({},req,body,clock);res.writeHead(out.status,out.headers);res.end(out.body);return;}
   for(let attempt=0;attempt<retries;attempt++){
    const saved=await storage.read(),before=saved?.value||{},out=await execute(before,req,body,clock);
    if(JSON.stringify(before)!==JSON.stringify(out.snapshot)){
     try{await storage.write(out.snapshot,saved?.etag);}catch(error){if(error.conflict&&attempt<retries-1){await new Promise(r=>setTimeout(r,30+Math.random()*80));continue;}throw error;}
    }
    res.writeHead(out.status,out.headers);res.end(out.body);return;
   }
  }catch(error){console.error('Cloud state transaction failed:',error.name||'Error');if(process.env.KALAVATHI_CLOUD_DEBUG==='1')console.error(String(error.message).replaceAll(process.env.BLOB_READ_WRITE_TOKEN||'__no_token__','[redacted]'));res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'2'});res.end(JSON.stringify({error:'Demo service temporarily unavailable. Please retry.'}));}
 };
}
module.exports={memoryStore,execute,createCloudHandler};
