const fs=require('fs');let r=fs.readFileSync('static/digital-twin/kalavathi-render.js','utf8');r=r.replace('drawBackdrop();drawRoads();','drawBackdrop();drawNeighborhoods();drawRoads();');
const start=r.indexOf('function drawRoute()'),end=r.indexOf('function drawCars()',start);
r=r.slice(0,start)+`function drawNeighborhoods(){
 const blocks=[{x:32,y:30,w:330,h:170},{x:476,y:30,w:244,h:170},{x:840,y:30,w:320,h:170},{x:32,y:355,w:330,h:125},{x:480,y:355,w:235,h:125},{x:840,y:355,w:320,h:125},{x:400,y:645,w:300,h:120},{x:840,y:645,w:320,h:120}];
 for(const b of blocks){noStroke();fill('#141e2b');rect(b.x,b.y,b.w,b.h,12);fill('#213246');for(let x=b.x+16;x<b.x+b.w-12;x+=38)for(let y=b.y+16;y<b.y+b.h-12;y+=32)rect(x,y,17,10,2);}
}
function drawRoute(){
 const state=window.KalavathiTrafficState,verified=state?.request?.hospital_confirmed;
 noFill();stroke(verified?'#145c45':'#274654');strokeWeight(25);strokeJoin(ROUND);beginShape();for(const p of KalavathiRoute.points)vertex(p.x,p.y);endShape();
 stroke(verified?'#34d399':'#22d3ee');strokeWeight(5);beginShape();for(const p of KalavathiRoute.points)vertex(p.x,p.y);endShape();
 if(verified){let remaining=Math.max(0,Math.min(1,state.progress||0))*KalavathiRoute.total;stroke('#6ee7b7');strokeWeight(16);beginShape();vertex(KalavathiRoute.points[0].x,KalavathiRoute.points[0].y);for(let i=1;i<KalavathiRoute.points.length;i++){const a=KalavathiRoute.points[i-1],b=KalavathiRoute.points[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(remaining>=length){vertex(b.x,b.y);remaining-=length;}else{vertex(a.x+(b.x-a.x)*remaining/length,a.y+(b.y-a.y)*remaining/length);break;}}endShape();}
 noStroke();
}
`+r.slice(end);
r=r.replace('ellipse(0,0,58,58)','ellipse(0,0,78,78)').replace('rect(0,0,34,19,6)','rect(0,0,48,26,8)').replace('rect(0,0,15,13,3)','rect(0,0,20,18,4)').replace("textSize(17);textStyle(BOLD);text('FAMILY CAR',p.x-50,p.y-32)","textSize(20);textStyle(BOLD);text('PATIENT CAR',p.x-58,p.y-42)");
const ls=r.indexOf('function drawLabels()'),le=r.indexOf('\n})();',ls);
r=r.slice(0,ls)+`function drawLabels(){
 for(const j of SIM.junctions){noStroke();fill(C.labelBg);rect(j.x-46,j.y-100,92,36,7);fill(C.label);textSize(22);textStyle(BOLD);text(j.id,j.x-14,j.y-75);textStyle(NORMAL);}
 // Home is the start, hospital the end of the complete clockwise model route.
 stroke('#67e8f9');strokeWeight(3);fill('#122b3a');rect(22,170,236,82,12);noStroke();fill('#67e8f9');triangle(40,204,58,186,76,204);rect(45,204,26,26,2);fill('#e8eef7');textSize(26);textStyle(BOLD);text('HOME',90,205);textStyle(NORMAL);textSize(16);fill(C.dim);text('Patient journey starts here',90,232);stroke('#67e8f9');strokeWeight(2);line(80,252,80,276);noStroke();
 drawingContext.shadowColor='#34d399';drawingContext.shadowBlur=18;fill('#12392d');stroke('#34d399');strokeWeight(3);rect(22,620,342,133,16);drawingContext.shadowBlur=0;noStroke();fill('#34d399');rect(45,641,48,48,9);fill('#09251b');rect(65,650,9,30);rect(54,661,30,9);fill('#e8eef7');textSize(24);textStyle(BOLD);text('HOSPITAL',110,661);textStyle(NORMAL);textSize(19);text(window.KalavathiTrafficState?.request?.destination?.name||'Destination hospital',45,717,300,30);stroke('#34d399');strokeWeight(3);line(80,620,80,566);noStroke();fill('#34d399');ellipse(80,544,24,24);fill('#67e8f9');ellipse(80,296,20,20);
}
`+r.slice(le);fs.writeFileSync('static/digital-twin/kalavathi-render.js',r);
