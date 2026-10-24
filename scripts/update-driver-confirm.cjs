const fs=require('fs');let s=fs.readFileSync('static/driver.js','utf8');
s=s.replace('contactsNotified=false;','contactsNotified=false,confirmedHospital=null;');
s=s.replace('  function contactsControl(){',`  function confirmDestination(){
    const button=element('button','Confirm hospital','confirm-hospital');button.id='confirm-hospital';button.type='button';button.disabled=!usable()||!state.destination?.id;
    button.onclick=()=>{if(!usable()||!state.destination?.id)return;confirmedHospital=state.destination.id;draw();window.scrollTo({top:0,behavior:'instant'});};
    return button;
  }
  function contactsControl(){`);
s=s.replace('screen.append(controls,line,routePreview(),trust(),contactsControl(),cancelControl())','screen.append(controls,line,trust(),contactsControl(),cancelControl())');
s=s.replace('screen.append(routePreview(),route,contactsControl(),cancelControl())','screen.append(route,contactsControl(),cancelControl())');
s=s.replace("element('h1','New route'),destination(),routePreview(),contactsControl()","element('h1','New route'),destination(),contactsControl()");
s=s.replace('    updateFooter();updateButtons();\n  }',`    if(['pending','granted','redirected'].includes(status)&&state.destination?.id){
      if(confirmedHospital===state.destination.id)screen.prepend(routePreview());
      else {const card=screen.querySelector('.destination');card?.after(confirmDestination());}
    }
    updateFooter();updateButtons();
  }`);
s=s.replace("function updateButtons(){const change=", "function updateButtons(){const confirm=$('confirm-hospital');if(confirm)confirm.disabled=!usable()||!state?.destination?.id;const change=");
s=s.replace('    const next=normalizeState(value);const previousStatus=state?.status;',"    const next=normalizeState(value);const previousStatus=state?.status;\n    if(next.status==='idle'||next.status==='expired'||next.destination?.id!==state?.destination?.id)confirmedHospital=null;");
s=s.replace('function applyFixture(index){fixtureIndex=', 'function applyFixture(index){confirmedHospital=null;contactsNotified=false;fixtureIndex=');
fs.writeFileSync('static/driver.js',s);
