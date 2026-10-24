// Isolated local preview; no production driver backend is implied.
const path=require('node:path');
const {createApp}=require('../server');
const {server}=createApp({dataDir:path.join(__dirname,'..','data','driver-preview'),demoMode:true});
server.listen(8010,'0.0.0.0',()=>console.log('Driver mock preview: http://localhost:8010/driver/kalavathi-01?mock=1'));
