return await(async()=>{
const checks=[];function check(v,n){if(!v)throw Error(n);checks.push(n);}
check(document.title==='Control Room — Digital Twin Genesis','Original control room is the traffic operator UI');
check(!performance.getEntriesByType('resource').some(r=>r.name.startsWith('http')&&new URL(r.name).origin!==location.origin),'All loaded control-room assets are local');
window.confirm=()=>true;document.querySelector('#kalavathi-link button:not([data-traffic-decision])').click();await new Promise(r=>setTimeout(r,1100));
const data=await(await fetch('/api/traffic/state')).json();check(data.request===null,'Demo ready for the next device press');
return JSON.stringify({passed:checks.length,checks},null,2);
})();
