return await(async()=>{
const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));function check(v,n){if(!v)throw Error(n);checks.push(n);}
const post=async(url,body)=>{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error);return data;};
await post('/api/traffic/reset',{});await post('/api/demo/request',{request_id:'friendly-'+Date.now()});await wait(1000);
const cards=document.querySelectorAll('.request-card');check(cards.length===1,'Incoming queue contains only the current patient');
const button=document.querySelector('[data-queue-accept]');check(button?.textContent==='Accept patient & confirm token','Primary acceptance is directly on the card');
check(button.getBoundingClientRect().bottom<=innerHeight,'Acceptance button fully visible without scrolling on phone');
check(document.getElementById('hospital-location').value==='city','Receiving hospital is clearly selected');
check(!document.querySelector('.availability-menu').open,'Availability is separate from accepting a patient');
button.click();document.getElementById('decision-submit').click();check(document.getElementById('sheet-error').textContent.includes('severity'),'Hospital must choose severity');
document.querySelector('input[value=cardiac]').click();document.getElementById('decision-submit').click();await wait(1000);
check(document.getElementById('hospital-feedback').textContent.includes('Patient accepted'),'Clear patient accepted feedback');
const patient=await(await fetch('/api/driver/kalavathi-01/state')).json();check(patient.trust_tier==='hospital_verified','Acceptance is shared with patient');
check(document.documentElement.scrollWidth<=innerWidth,'No horizontal overflow');return JSON.stringify({passed:checks.length,checks},null,2);
})();
