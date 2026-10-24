return await (async()=>{
const $=id=>document.getElementById(id),checks=[];
function check(v,n){if(!v)throw Error(n);checks.push(n);}
$('activate-token').click();check(!document.querySelector('.map-card'),'Map hidden before confirmation');
$('confirm-hospital').click();check($('screen').firstElementChild.classList.contains('map-card'),'Confirmed map is first');
$('change-hospital').click();await new Promise(r=>setTimeout(r,100));document.querySelectorAll('.hospital-option')[1].click();await new Promise(r=>setTimeout(r,100));
check(!document.querySelector('.map-card'),'Changed hospital requires confirmation');
$('confirm-hospital').click();check($('screen').firstElementChild.textContent.includes('Riverside'),'Map reflects confirmed destination');
check(document.documentElement.scrollWidth<=innerWidth,'No horizontal overflow');return JSON.stringify({passed:checks.length,checks});
})();
