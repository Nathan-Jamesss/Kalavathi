const fs=require('fs');let s=fs.readFileSync('static/driver.js','utf8');
s=s.replace("!state||remaining(state)===0;const notify=","!state;const notify=");
s=s.replace("if(mock){\n      const svg=", "if(mock||state.trust_tier==='hospital_verified'){\n      const svg=");
s=s.replace("mock?'DEMO ROUTE · NOT LIVE NAVIGATION':'Route preview unavailable'","mock?'DEMO ROUTE · NOT LIVE NAVIGATION':'DIGITAL TWIN ROUTE · SIMULATED POSITION'");
s=s.replace("      const shapes=[['path'", "      const liveVehicle=state.vehicle;\n      const shapes=[['path'");
s=s.replace("      box.append(svg,element('p','You → '",`      if(!mock){
        svg.replaceChildren();svg.setAttribute('viewBox','0 0 1200 800');
        const primitives=[['path',{d:'M0 280H1200 M0 560H1200 M420 0V800 M780 0V800',stroke:'#fff','stroke-width':64,fill:'none'}],['path',{d:'M0 296H1170',stroke:'#176B59','stroke-width':18,fill:'none'}],['circle',{cx:liveVehicle?.x||24,cy:liveVehicle?.y||296,r:24,fill:'#176B59',stroke:'#fff','stroke-width':8}],['rect',{x:1140,y:260,width:50,height:65,rx:10,fill:'#C93825'}]];
        for(const [tag,attrs] of primitives){const n=document.createElementNS(svg.namespaceURI,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));svg.append(n);}
      }
      box.append(svg,element('p','You → '`);
s=s.replace("      if(mock)receive({...state,destination:hospital,change_window_s_left:secondsLeft()});", "      if(mock)receive({...state,destination:hospital,change_window_s_left:secondsLeft()});");
fs.writeFileSync('static/driver.js',s);
let h=fs.readFileSync('templates/home.html','utf8').replace('/driver/kalavathi-01?mock=1','/driver/kalavathi-01?demo=1').replace('/hospital/city?mock=1','/hospital/city');
h=h.replace('View your destination, confirm the hospital and follow the demo route.','Choose your destination, wait for hospital token confirmation and view the route.').replaceAll('Interactive demo','Connected workflow').replace('Monitor the four model junctions and the existing tabletop device demonstration.','Open the original DigitalTwinGenesis street simulation and control room.').replace('Tabletop controls','Original DigitalTwinGenesis').replace('Patient and hospital demos use separate simulated data; they are not connected to the physical device yet.','One shared token connects the patient, hospital and traffic twin. Hospital confirmation is required before the twin considers priority. Indoor position is simulated; there is no secure element.').replace('These pages need the hospital and driver APIs. They show an offline state until those services are connected.','The patient page without the demo trigger waits for the physical device button. Keep the street twin open on the traffic laptop.');
fs.writeFileSync('templates/home.html',h);
