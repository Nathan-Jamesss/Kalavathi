const fs=require('fs');let s=fs.readFileSync('static/driver.js','utf8');const a=s.indexOf('  function routePreview(){'),b=s.indexOf('  function confirmDestination(){',a);
s=s.slice(0,a)+`  function routePreview(){
    const box=element('section',null,'map-card patient-route');box.append(element('p','HOME → HOSPITAL · MODEL ROUTE','map-label'));
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 120 1000 650');svg.setAttribute('role','img');svg.setAttribute('aria-label','Complete route from Home through J1, J2, J3 and J4 to '+(state.destination?.name||'hospital'));
    function shape(tag,attrs,text){const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text)node.textContent=text;svg.append(node);return node;}
    for(const [x,y,w,h] of [[20,140,320,75],[470,140,240,75],[830,140,150,75],[20,350,320,120],[470,350,240,120],[830,350,150,120],[420,630,300,100]])shape('rect',{x,y,width:w,height:h,rx:12,fill:'#dce7e1'});
    shape('path',{d:'M0 280H1000 M0 560H1000 M420 120V770 M780 120V770',stroke:'#fff','stroke-width':64,fill:'none'});
    shape('path',{d:'M80 296H764V544H80',stroke:'#b2ddc8','stroke-width':28,fill:'none','stroke-linejoin':'round'});
    shape('path',{d:'M80 296H764V544H80',stroke:'#176B59','stroke-width':8,fill:'none','stroke-linejoin':'round'});
    shape('circle',{cx:80,cy:296,r:24,fill:'#176B59',stroke:'#fff','stroke-width':6});shape('text',{x:30,y:250,'font-size':32,'font-weight':700,fill:'#172a32'},'HOME');
    const junctions=[['J1',420,280],['J2',780,280],['J3',780,560],['J4',420,560]];
    for(const [id,x,y] of junctions){const j=state.junctions.find(j=>j.id===id);shape('circle',{cx:x,cy:y,r:28,fill:j?.state==='passed'||j?.state==='green'?'#176b59':'#52656d',stroke:'#fff','stroke-width':5});shape('text',{x:x-20,y:y+9,'font-size':23,'font-weight':700,fill:'#fff'},id);}
    shape('rect',{x:28,y:620,width:330,height:115,rx:18,fill:'#176b59'});shape('text',{x:50,y:665,'font-size':30,'font-weight':700,fill:'#fff'},'HOSPITAL');shape('text',{x:50,y:704,'font-size':24,fill:'#fff'},state.destination?.name||'Destination');shape('path',{d:'M80 620V564',stroke:'#176b59','stroke-width':8});
    const p=state.vehicle||{x:80,y:296};shape('circle',{cx:p.x,cy:p.y,r:28,fill:'#176b59',stroke:'#fff','stroke-width':7});shape('text',{x:p.x+35,y:p.y-25,'font-size':26,'font-weight':700,fill:'#172a32'},'YOUR CAR');
    box.append(svg,element('p',(state.destination?.name||'Hospital')+' · '+eta(state.destination?.eta_s),'route-caption'));
    if(state.comparison?.saved_s!=null)box.append(element('p',(state.comparison.saved_s>=0?state.comparison.saved_s.toFixed(1)+' s saved':Math.abs(state.comparison.saved_s).toFixed(1)+' s longer')+' · signal model comparison','patient-savings'));
    box.append(element('p','Simulated indoor position','map-disclosure'));return box;
  }
`+s.slice(b);fs.writeFileSync('static/driver.js',s);
