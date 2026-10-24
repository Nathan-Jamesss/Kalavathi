return await (async()=>{
  const checks=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const assert=(condition,name)=>{if(!condition)throw Error(name);checks.push(name);};
  const $=id=>document.getElementById(id);
  async function fixture(i){$('mock-state').value=String(i);$('mock-state').dispatchEvent(new Event('change'));await wait(30);}
  for(let i=0;i<DriverFixtures.states.length;i++){
    await fixture(i);
    assert(document.documentElement.scrollWidth<=innerWidth,'No horizontal overflow: '+DriverFixtures.states[i].label);
    const buttons=[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length);
    assert(buttons.every(b=>b.getBoundingClientRect().height>=56),'56 px controls: '+DriverFixtures.states[i].label);
  }
  await fixture(1);$('change-hospital').click();await wait(100);
  assert($('hospital-picker').open,'Full-screen hospital picker opens');
  const options=[...document.querySelectorAll('.hospital-option')];
  assert(options.length===3,'Capable hospitals listed');options[1].click();await wait(100);
  assert(!$('hospital-picker').open&&$('screen').textContent.includes('Riverside Medical Centre'),'Hospital change returns to pending');
  let cancel=$('cancel-request');cancel.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));await wait(300);cancel.dispatchEvent(new KeyboardEvent('keyup',{key:' ',bubbles:true}));
  assert($('screen').classList.contains('pending'),'Short hold does not cancel');
  cancel.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));await wait(2250);cancel.dispatchEvent(new KeyboardEvent('keyup',{key:' ',bubbles:true}));
  assert($('screen').classList.contains('expired')&&$('screen').textContent.includes('cancelled by driver'),'Two-second hold cancels in mock mode');
  await wait(10100);assert($('screen').classList.contains('idle'),'Expiry returns to idle after ten seconds');
  await fixture(1);await wait(15200);
  assert($('change-hospital').disabled&&$('change-status').textContent==='Destination locked','Fifteen-second change window locks');
  $('mock-offline').click();assert(!$('connection-banner').hidden&&$('connection-banner').textContent.includes('Offline'),'Offline banner visible');
  assert($('cancel-request').disabled,'Offline action disabled');
  assert(!document.querySelector('script[src^="http"],link[href^="http"]'),'No remote script or stylesheet');
  assert(![...document.querySelectorAll('button')].some(b=>/send request|start emergency/i.test(b.textContent)),'No request-start button');
  await fixture(0);return JSON.stringify({passed:checks.length,checks},null,2);
})();
