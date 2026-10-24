const fs=require('fs');const crypto=require('crypto');
const names=['sim.js','priority.js','scenarios.js','render.js','render3d.js','console.js','console-extras.js','link.js','publish.js','style.css','console.css','controllers.js','features.js','sensorFeed.js','bench.js','quantum.js','weights.js','nn.js','agent.js','coordinator.js'];
for(const name of names){const a=fs.readFileSync('vendor/DigitalTwinGenesis/'+name),b=fs.readFileSync('static/digital-twin/'+name);if(!a.equals(b))throw Error('Upstream file changed: '+name);}
console.log(names.length+' original DigitalTwinGenesis files are byte-identical.');
