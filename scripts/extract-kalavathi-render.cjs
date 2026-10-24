const fs=require('fs');const s=fs.readFileSync('vendor/DigitalTwinGenesis/render.js','utf8');
const palette=s.slice(s.indexOf('  const C ='),s.indexOf('  const G ='));
const roads=s.slice(s.indexOf('  function drawBackdrop()'),s.indexOf('  /* Vehicles are drawn')).replace('SENSOR_FEED.incidentActive(j.id)','false');
const renderer=`/* Road and signal drawing extracted from DigitalTwinGenesis; Kalavathi private-car overlay. */
(function(){'use strict';
${palette}
const G=SIM.GEOM,W=G.world.w,H=G.world.h;let scaleFactor=1,offX=0,offY=0;
window.setup=function(){const host=document.getElementById('canvas-host');createCanvas(host.clientWidth,host.clientHeight).parent(host);textFont('Segoe UI');SIM.start();};
window.windowResized=function(){const host=document.getElementById('canvas-host');resizeCanvas(host.clientWidth,host.clientHeight);};
window.draw=function(){background(C.bg);scaleFactor=Math.min((width-40)/W,(height-40)/H);offX=(width-W*scaleFactor)/2;offY=(height-H*scaleFactor)/2;push();translate(offX,offY);scale(scaleFactor);drawBackdrop();drawRoads();drawJunctions();drawRoute();drawSignals();drawCars();drawFamilyCar();drawLabels();pop();};
${roads}
function drawRoute(){noFill();stroke(34,211,238,75);strokeWeight(6);beginShape();for(const p of KalavathiRoute.points)vertex(p.x,p.y);endShape();noStroke();}
function drawCars(){rectMode(CENTER);for(const v of SIM.vehicles){push();translate(v.x,v.y);if(v.dir==='N'||v.dir==='S')rotate(HALF_PI);stroke('#0b0e14');strokeWeight(1);fill(TYPE_COLOR[v.type.id]||C.accent);rect(0,0,v.type.len,Math.max(8,v.type.wid*2),2);pop();}rectMode(CORNER);}
function drawFamilyCar(){const state=window.KalavathiTrafficState;if(!state?.request)return;const p=state.position||KalavathiRoute.points[0];push();translate(p.x,p.y);rotate(p.angle||0);if(state.request.hospital_confirmed){noStroke();fill(34,211,238,45);ellipse(0,0,58,58);}stroke('#fff');strokeWeight(2);fill('#22d3ee');rectMode(CENTER);rect(0,0,34,19,6);noStroke();fill('#12333e');rect(0,0,15,13,3);rectMode(CORNER);pop();fill(C.label);noStroke();textSize(17);textStyle(BOLD);text('FAMILY CAR',p.x-50,p.y-32);textStyle(NORMAL);}
function drawLabels(){for(const j of SIM.junctions){noStroke();fill(C.labelBg);rect(j.x-40,j.y-95,80,32,6);fill(C.label);textSize(18);textStyle(BOLD);text(j.id,j.x-12,j.y-73);textStyle(NORMAL);}noStroke();fill('#121a25');rect(26,625,260,80,12);fill('#34d399');textSize(22);textStyle(BOLD);text(window.KalavathiTrafficState?.request?.destination?.name||'DESTINATION HOSPITAL',42,657);textStyle(NORMAL);fill(C.dim);textSize(15);text('Arrival ends signal priority',42,685);}
})();
`;
fs.writeFileSync('static/digital-twin/kalavathi-render.js',renderer);
