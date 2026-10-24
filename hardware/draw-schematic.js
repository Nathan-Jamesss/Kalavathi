// Rebuild the vector electrical reference drawing using Node's built-in modules.
const fs=require('node:fs');const path=require('node:path');
const out=[];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,s,size=19,fill='#19334b',weight=400)=>out.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${esc(s)}</text>`);
const line=(x1,y1,x2,y2,color='#234c70')=>out.push(`<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2.2"/>`);
const rect=(x,y,w,h,fill='white',stroke='#b7c9d9')=>out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
const dot=(x,y)=>out.push(`<circle cx="${x}" cy="${y}" r="4" fill="#234c70"/>`);
const ground=(x,y)=>{line(x,y,x,y+10);line(x-14,y+10,x+14,y+10);line(x-9,y+16,x+9,y+16);line(x-4,y+22,x+4,y+22);};
const net=(x,y,s)=>{out.push(`<circle cx="${x}" cy="${y}" r="4" fill="white" stroke="#234c70" stroke-width="2"/>`);text(x+5,y-12,s,17,'#165c9e',600);};
const rh=(x,y,id,value)=>{line(x,y,x+12,y);rect(x+12,y-8,50,16);line(x+62,y,x+80,y);text(x+8,y-20,id+' '+value,16);};
const rv=(x,y,id,value)=>{line(x,y,x,y+12);rect(x-8,y+12,16,48);line(x,y+60,x,y+78);text(x+18,y+37,id+' '+value,16);};
const cap=(x,y,id,value)=>{line(x,y,x,y+20);line(x-13,y+20,x+13,y+20);line(x-13,y+28,x+13,y+28);line(x,y+28,x,y+49);text(x+20,y+29,id+' '+value,16);};
const panel=(x,y,w,h,title)=>{rect(x,y,w,h,'#fff');text(x+20,y+33,title,23,'#19334b',650);};
out.push('<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1510" viewBox="0 0 1800 1510"><style>text{font-family:Segoe UI,Arial,sans-serif}</style><rect width="1800" height="1510" fill="#f2f6fa"/>');
text(40,48,'Kalavathi main button unit',34,'#19334b',700);
text(40,80,'Photographed ESP32 30-pin board • Revision B • No secure element • Hardware set 1 only',21);
rect(40,100,1720,45,'#fff4d8','#dbac45');text(55,129,'Use the large micro-USB ESP32 board. GPS: regulated 5 V breakout input. Fit BZ1 only after verifying its 5 V / 20 mA rating.',19,'#76520a',600);

panel(40,170,500,600,'U1  ESP32 30-pin development board');
rect(75,235,205,465,'#edf4fb','#6b94bb');text(95,270,'Development board',19,'#19334b',650);
const pins=[['D25 / GPIO25','BTN_EMERGENCY'],['D26 / GPIO26','BTN_RESET'],['D27 / GPIO27','LED_RED'],['D32 / GPIO32','LED_AMBER'],['D33 / GPIO33','LED_GREEN'],['RX2 / GPIO16','GPS_RX'],['D23 / GPIO23','BUZZER_DRIVE'],['3V3','+3V3'],['VIN (USB)','USB_5V']];
pins.forEach(([pin,name],i)=>{const y=305+i*40;text(92,y+6,pin,18);line(240,y,305,y);net(305,y,name);});
text(95,680,'GND',18);line(185,685,185,708);ground(185,708);
text(65,751,'TX2 / GPIO17 unused; EN unchanged.',17);

panel(565,170,575,270,'USB power and board supplies');
rect(590,235,140,60,'#edf4fb');text(607,270,'Laptop USB',20);
line(730,265,800,265);rect(800,235,305,60,'#edf4fb');text(815,270,'U1 USB connector / onboard LDO',17);
text(590,335,'USB_5V = VIN rail; measure with USB connected.',18);
text(590,365,'+3V3 = onboard regulated logic supply.',18);
text(590,400,'Use USB as the only board power source.',18,'#76520a',600);

panel(1165,170,595,600,'U2  NEO-6M GPS + ANT1 antenna');
rect(1270,255,265,285,'#edf4fb','#6b94bb');text(1290,290,'GPS breakout',22,'#19334b',650);
net(1195,330,'VGPS');line(1195,330,1270,330);text(1290,336,'VCC',18);
text(1290,386,'GND',18);line(1270,380,1235,380);ground(1235,380);
text(1290,436,'TX (3.3 V logic)',18);line(1535,430,1570,430);rh(1570,430,'R8','1k');line(1650,430,1690,430);
net(1570,480,'GPS_RX');line(1690,430,1690,480);line(1690,480,1570,480);
text(1290,490,'RX / PPS: no connection',16);
line(1400,255,1400,225);rect(1335,210,130,30,'white');text(1351,231,'RF coax',16);
line(1465,225,1515,225);rect(1515,205,210,60,'#edf4fb');text(1530,231,'ANT1 GPS patch',18);text(1530,252,'Radiating face to sky',14);
net(1195,580,'VGPS');line(1195,580,1550,580);cap(1280,580,'C3','100nF');cap(1510,580,'C4','10uF');ground(1280,629);ground(1510,629);
text(1190,692,'VGPS = USB_5V to GY-NEO6MV2 VCC input.',18,'#76520a',600);
text(1190,720,'Onboard regulator supplies the 3.3 V GPS chip.',18,'#76520a',600);
text(1190,748,'Never apply 5 V to the bare GPS chip or GPIO.',17,'#76520a');

panel(565,465,575,305,'S1 / S2  Active-low button inputs');
function button(x,label,node,idR,idC){
  text(x-25,535,label,18,'#19334b',650);net(x,560,'+3V3');rv(x,575,idR,'10k');line(x,560,x,575);line(x,653,x,670);dot(x,670);line(x,670,x+50,670);net(x+50,670,node);
  line(x,670,x,688);out.push(`<circle cx="${x}" cy="688" r="3" fill="white" stroke="#234c70"/><circle cx="${x}" cy="719" r="3" fill="white" stroke="#234c70"/>`);line(x,688,x+17,713);line(x,719,x,730);ground(x,730);
}
button(615,'S1 Emergency','BTN_EMERGENCY','R1','C1');
button(895,'S2 Demo reset','BTN_RESET','R2','C2');

panel(40,795,675,420,'D1 / D2 / D3  Three status indicators');
function led(y,netname,idr,idd,colour,label){
  net(65,y,netname);line(65,y,245,y);rh(245,y,idr,'1k');line(325,y,350,y);
  out.push(`<path d="M350 ${y-13} L350 ${y+13} L375 ${y} Z" fill="${colour}" stroke="#234c70" stroke-width="2"/>`);line(378,y-15,378,y+15);line(378,y,425,y);ground(425,y);
  line(375,y-22,395,y-40);line(390,y-23,410,y-41);
  out.push(`<path d="M395 ${y-40} L387 ${y-37} L392 ${y-32} Z M410 ${y-41} L402 ${y-38} L407 ${y-33} Z" fill="#234c70"/>`);
  text(455,y+5,idd+' '+label,18);
}
led(895,'LED_RED','R3','D1','#e64f5b','Refused');led(995,'LED_AMBER','R4','D2','#efb42f','Pending');led(1095,'LED_GREEN','R5','D3','#2ba874','Granted');
text(65,1170,'Anode toward resistor; cathode toward GND.',18);

panel(740,795,1020,420,'Q1 / BZ1  Transistor-driven feedback buzzer');
text(765,865,'Reference: rated 5 V active buzzer, ≤20 mA. Verify your existing sounder first.',18,'#76520a',600);
net(1220,900,'VBUZZ');line(1220,900,1450,900);line(1280,900,1280,930);
rect(1235,930,90,65,'#edf4fb','#6b94bb');text(1245,954,'BZ1 +',18);text(1245,980,'−',18);
line(1280,995,1280,1030);dot(1280,1030);line(1280,1030,1450,1030);
line(1450,900,1450,935);line(1435,935,1465,935);out.push('<path d="M1450 938 L1437 966 L1463 966 Z" fill="white" stroke="#234c70" stroke-width="2"/>');line(1450,966,1450,1030);text(1480,950,'D4 1N4148',18);text(1480,977,'Band/cathode to VBUZZ',16);
net(765,1095,'BUZZER_DRIVE');line(765,1095,980,1095);rh(980,1095,'R6','1k');line(1060,1095,1215,1095);dot(1100,1095);
line(1215,1060,1215,1130);line(1215,1078,1280,1040);line(1280,1030,1280,1040);line(1215,1110,1280,1150);line(1280,1150,1280,1170);ground(1280,1170);
out.push('<path d="M1268 1143 L1255 1124 L1248 1137 Z" fill="#234c70"/>');text(1300,1110,'Q1 2N3904 NPN',19);text(1300,1140,'Check E / B / C package pinout',17);
rv(1100,1100,'R7','100k');ground(1100,1178);
net(1580,1050,'VBUZZ');cap(1580,1070,'C5','100nF');line(1580,1050,1580,1070);ground(1580,1119);

panel(40,1240,1720,230,'Assembly notes and document alignment');
text(65,1300,'Optional C1/C2: 100 nF from each button input to GND. R1/R2 pull-ups remain fitted; debounce is also required in firmware.',20);
text(65,1338,'VBUZZ = verified USB_5V only for the specified 5 V sounder. All GND symbols are connected. No vehicle power connection.',20);
text(65,1376,'GPS: UART2, 9600 8N1 initially; RX2 / GPIO16 receives GPS TX. ANT1 connects only to GPS. Indoors use simulated position.',20);
text(65,1414,'The existing firmware still needs GPS, long-press handling and this buzzer driver added. Circuit not physically tested.',20,'#76520a',600);
text(65,1448,'Companion specification: MAIN_UNIT_DESIGN.md • Pin-level netlist: main-unit-netlist.csv • No Nano/Uno inside this unit.',18);
out.push('</svg>');
fs.writeFileSync(path.join(__dirname,'main-unit-schematic.svg'),out.join('\n'));
fs.writeFileSync(path.join(__dirname,'main-unit-schematic.html'),'<!doctype html><html><head><meta charset="utf-8"><title>Kalavathi main unit schematic</title><style>html,body{margin:0;background:#f2f6fa}svg{display:block;width:100%;height:auto}</style></head><body>'+out.join('\n')+'</body></html>');
console.log('Wrote main-unit-schematic.svg and .html');
