return await(async()=>{
const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms)),$=id=>document.getElementById(id);
function check(ok,n){if(!ok)throw Error(n);checks.push(n);}
let item=HospitalFixtures.make('clean'),posts=[];
window.fetch=async(url,options={})=>{if(options.method==='POST')posts.push({url,body:JSON.parse(options.body)});return new Response(JSON.stringify([item]),{status:200,headers:{'Content-Type':'application/json'}});};
await wait(2400);check(document.querySelector('.request-card'),'Polling fallback displays incoming');check($('hospital-connection').textContent.includes('polling'),'Polling reconnect indicator visible');check(posts.length===0,'Incoming polling sends no decisions');
window.WebSocket=class{constructor(url){window.hospitalTestSocket=this;this.readyState=0;setTimeout(()=>{this.readyState=1;this.onopen?.();this.emit([item]);},30);}emit(data){this.onmessage?.({data:JSON.stringify(data)});}close(){this.readyState=3;this.onclose?.();}};
const end=Date.now()+12500;while(!window.hospitalTestSocket&&Date.now()<end)await wait(100);await wait(100);check(!!window.hospitalTestSocket,'Socket reconnect attempted');check($('hospital-connection').hidden,'Socket snapshot clears reconnect banner');
document.querySelector('.request-card').click();document.querySelector('[data-action=confirm]').click();document.querySelector('input[value=cardiac]').click();$('decision-submit').click();await wait(100);check(posts.length===1&&posts[0].url.endsWith('/requests/demo-1/confirm')&&posts[0].body.severity==='cardiac','Confirm sends scoped endpoint and severity');
document.querySelector('.request-card').click();document.querySelector('[data-action=confirm]').click();hospitalTestSocket.emit([{...item,status:'handled_elsewhere'}]);check(!$('decision-sheet').open&&[...document.querySelectorAll('[data-action]')].every(b=>b.disabled),'Remote handling invalidates open decision');
return JSON.stringify({passed:checks.length,checks},null,2);
})();
