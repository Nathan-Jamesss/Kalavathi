const fs=require('node:fs');const assert=require('node:assert/strict');const path=require('node:path');
const report=JSON.parse(fs.readFileSync(path.join(__dirname,'results.json'),'utf8'));
assert.equal(report.results.length,12);
const summary=[];
for(const result of report.results){
  const e=result.elements;assert.ok(result.simTime>=.015,`${result.name}: simulator did not settle`);
  if(result.kind==='driver'){
    const off=result.name==='buzzer-off',i=e[9].current,base=e[1].current,vce=e[4].volts[1]-e[4].volts[2];
    if(off){assert.ok(Math.abs(i)<1e-6);assert.ok(Math.abs(base)<1e-6);}
    else{assert.ok(i>.018&&i<.022);assert.ok(base>0&&base<.0035);assert.ok(vce<.15);}
    summary.push({case:result.name,pass:true,load_mA:i*1000,control_mA:base*1000,vce_V:vce});
  }else if(result.kind==='button'){
    const pressed=result.name==='button-pressed',voltage=e[2].volts[1];
    assert.ok(pressed?voltage<.05:voltage>3.1);
    assert.ok(Math.abs(e[1].current)<.00036);
    summary.push({case:result.name,pass:true,input_V:voltage,pullup_mA:e[1].current*1000});
  }else{
    const off=result.name==='led-off',i=e[1].current;
    assert.ok(off?Math.abs(i)<1e-6:i>.001&&i<.0021);
    summary.push({case:result.name,pass:true,current_mA:i*1000});
  }
}
const config=fs.readFileSync(path.join(__dirname,'../../firmware/kalavathi_device/config.h'),'utf8');
for(const [macro,pin] of Object.entries({EMERGENCY_PIN:25,RESET_PIN:26,RED_PIN:27,AMBER_PIN:32,GREEN_PIN:33,GPS_RX_PIN:16,GPS_TX_PIN:17,PIEZO_PIN:23}))assert.match(config,new RegExp(`#define ${macro} ${pin}\\b`));
const drawing=fs.readFileSync(path.join(__dirname,'../draw-schematic.js'),'utf8');
for(const pin of ['GPIO25','GPIO26','GPIO27','GPIO32','GPIO33','GPIO16','GPIO23'])assert.ok(drawing.includes(pin));
fs.writeFileSync(path.join(__dirname,'summary.json'),JSON.stringify(summary,null,2));
console.log('PASS: 12 CircuitJS cases; measured values within declared model limits.');
console.log('PASS: selected ESP32 pin configuration matches schematic assignments.');
console.log('Models do not verify physical board health, GPS, RF, firmware or unmarked buzzer ratings.');
