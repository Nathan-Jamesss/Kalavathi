const fs=require('node:fs');const assert=require('node:assert/strict');const path=require('node:path');
const root=path.join(__dirname,'..');const guide=fs.readFileSync(path.join(root,'FINAL_HARDWARE_GUIDE.md'),'utf8');
for(const [tag,file] of [['ESP32_CODE','firmware/kalavathi_bench/kalavathi_bench.ino'],['UNO_CODE','firmware/kalavathi_junctions/kalavathi_junctions.ino']]){
  const section=guide.split(`<!-- ${tag} -->`)[1].split(`<!-- ${tag}_END -->`)[0];
  const embedded=section.split('```cpp\n')[1].split('\n```')[0].trim();
  assert.equal(embedded,fs.readFileSync(path.join(root,file),'utf8').trim(),file+' differs from guide');
}
const code=fs.readFileSync(path.join(root,'firmware/kalavathi_bench/kalavathi_bench.ino'),'utf8');
for(const [name,pin] of Object.entries({EMERGENCY_PIN:25,RESET_PIN:26,RED_PIN:27,AMBER_PIN:32,GREEN_PIN:33,GPS_RX_PIN:16,GPS_TX_PIN:17,BUZZER_PIN:23,OLED_CLK:18,OLED_DATA:19,OLED_RES:21,OLED_DC:22,OLED_CS:14}))assert.match(code,new RegExp(`${name} = ${pin}\\b`));
const pins=[25,26,27,32,33,16,17,23,18,19,21,22,14];assert.equal(new Set(pins).size,pins.length);
assert.match(code,/#define ENABLE_GPS 0/);assert.match(code,/#define ENABLE_ACTIVE_BUZZER_DRIVER 0/);
assert.equal((guide.match(/^```/gm)||[]).length%2,0,'Unclosed Markdown code fence');
console.log('PASS: both embedded sketches match files, pin assignments have no duplicates, safety flags stay off, code fences balanced.');
