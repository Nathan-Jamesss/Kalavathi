const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');
const tests=fs.readdirSync(path.join(__dirname,'..','test')).filter(n=>n.endsWith('.test.js')).sort().map(n=>path.join(__dirname,'..','test',n));
const result=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});if(result.error){console.error(result.error.message);process.exitCode=1;}else process.exitCode=result.status??1;
