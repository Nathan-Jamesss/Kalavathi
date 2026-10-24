const fs=require('node:fs');const path=require('node:path');
const header='$ 1 0.000005 10.20027730826997 50 5 50 5e-11\n';
function driver(on,beta=100,voltage=5,baseR=1000,loadR=250){return header+[
`v 80 320 80 80 0 0 40 ${on?3.3:0} 0 0 0.5`,
`r 80 80 240 80 0 ${baseR}`,'w 240 80 240 160 0','r 240 160 240 320 0 100000',
`t 240 160 320 160 0 1 0 0 ${beta}`,'w 320 176 320 320 0','w 320 320 80 320 0',
'g 80 320 80 352 0',`v 480 320 480 80 0 0 40 ${voltage} 0 0 0.5`,
`r 480 80 320 80 0 ${loadR}`,'w 320 80 320 144 0','w 480 320 320 320 0','g 240 320 240 352 0',
].join('\n')+'\n';}
function button(closed,pullup=10000,supply=3.3){return header+[
`v 80 320 80 80 0 0 40 ${supply} 0 0 0.5`,`r 80 80 240 80 0 ${pullup}`,
'w 240 80 240 160 0',`s 240 160 240 320 0 ${closed?0:1} false`,
'c 240 160 400 160 0 1e-7 0','g 400 160 400 192 0','g 240 320 240 352 0','g 80 320 80 352 0',
].join('\n')+'\n';}
function led(on,resistance=1000,supply=3.3){return header+[
`v 80 320 80 80 0 0 40 ${on?supply:0} 0 0 0.5`,`r 80 80 240 80 0 ${resistance}`,
'162 240 80 240 240 2 default-led 1 0 0 0.01','g 240 240 240 272 0','g 80 320 80 352 0',
].join('\n')+'\n';}
const cases=[
{name:'buzzer-on',kind:'driver',circuit:driver(true)},
{name:'buzzer-off',kind:'driver',circuit:driver(false)},
{name:'buzzer-low-gain',kind:'driver',circuit:driver(true,50)},
{name:'buzzer-high-gain',kind:'driver',circuit:driver(true,300)},
{name:'buzzer-low-supply',kind:'driver',circuit:driver(true,50,4.75,1050)},
{name:'buzzer-high-supply',kind:'driver',circuit:driver(true,50,5.25,950)},
{name:'button-released',kind:'button',circuit:button(false)},
{name:'button-pressed',kind:'button',circuit:button(true)},
{name:'button-low-supply',kind:'button',circuit:button(false,10500,3.135)},
{name:'led-on',kind:'led',circuit:led(true)},
{name:'led-off',kind:'led',circuit:led(false)},
{name:'led-high-supply',kind:'led',circuit:led(true,950,3.465)},
];
for(const c of cases)fs.writeFileSync(path.join(__dirname,c.name+'.circuitjs.txt'),c.circuit);
const browserScript=`(async()=>{const cases=${JSON.stringify(cases)};const results=[];for(const c of cases){CircuitJS1.setSimRunning(false);CircuitJS1.importCircuit(c.circuit);CircuitJS1.setSimRunning(true);const start=Date.now();while(CircuitJS1.getTime()<0.015&&Date.now()-start<6000)await new Promise(r=>setTimeout(r,100));CircuitJS1.setSimRunning(false);results.push({name:c.name,kind:c.kind,simTime:CircuitJS1.getTime(),elements:CircuitJS1.getElements().map(e=>({type:e.getType(),volts:Array.from({length:e.getPostCount()},(_,i)=>e.getVoltage(i)),current:e.getCurrent(),info:e.getInfo()}))});}return JSON.stringify({simulator:'CircuitJS at https://www.falstad.com/circuit/circuitjs.html',date:'2026-10-21',models:'Generic NPN and LED. Buzzer represented by 250 ohm load. Ideal regulated supplies. GPS/RF/firmware not modelled.',results},null,2)})()`;
fs.writeFileSync(path.join(__dirname,'run-in-browser.js'),'return '+browserScript);
console.log('Wrote '+cases.length+' reproducible CircuitJS cases and browser runner.');
