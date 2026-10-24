return await(async()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),checks=[];
  const assert=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  window.driverPostCount=0;
  window.fetch=(url,options={})=>{
    const post=options.method==='POST';if(post)window.driverPostCount++;
    const state=post?{...DriverFixtures.states[2].state,status:'expired',expiry_reason:'cancelled by driver'}:DriverFixtures.states[1].state;
    return Promise.resolve(new Response(JSON.stringify(state),{status:200,headers:{'Content-Type':'application/json'}}));
  };
  await wait(2200);
  assert(document.getElementById('screen').classList.contains('pending'),'HTTP fallback renders driver state');
  assert(document.getElementById('connection-banner').textContent.includes('Reconnecting live updates'),'Polling remains visibly reconnecting');
  assert(driverPostCount===0,'Polling does not start a request');
  window.WebSocket=class {
    static OPEN=1;static CLOSED=3;
    constructor(url){this.url=url;this.readyState=0;window.driverTestSocket=this;setTimeout(()=>{this.readyState=1;this.onopen?.();this.sendState(DriverFixtures.states[2].state);},40);}
    sendState(state){this.onmessage?.({data:JSON.stringify(state)});}
    close(){this.readyState=3;this.onclose?.();}
  };
  const limit=Date.now()+12500;
  while(!window.driverTestSocket&&Date.now()<limit)await wait(100);
  await wait(100);
  assert(Boolean(window.driverTestSocket),'WebSocket reconnect attempted');
  assert(document.getElementById('screen').classList.contains('granted'),'WebSocket snapshot updates screen');
  assert(document.getElementById('connection-banner').hidden,'Live socket clears reconnect banner');
  const cancel=document.getElementById('cancel-request');cancel.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));
  await wait(700);driverTestSocket.sendState({...DriverFixtures.states[2].state,destination:{...DriverFixtures.states[2].state.destination,eta_s:299}});
  await wait(700);driverTestSocket.sendState({...DriverFixtures.states[2].state,destination:{...DriverFixtures.states[2].state.destination,eta_s:298}});
  await wait(850);cancel.dispatchEvent(new KeyboardEvent('keyup',{key:' ',bubbles:true}));
  assert(driverPostCount===1,'Two-second hold survives changing live ETA and sends exactly one cancel');
  assert(document.getElementById('screen').classList.contains('expired'),'Cancellation renders backend-confirmed expiry');
  return JSON.stringify({passed:checks.length,checks},null,2);
})();
