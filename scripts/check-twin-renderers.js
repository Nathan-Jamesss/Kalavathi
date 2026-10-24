return await(async()=>{
const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));function check(v,n){if(!v)throw Error(n);checks.push(n);}
const before=SIM.time();await wait(600);check(SIM.time()>before,'Simulation clock advances');check(document.querySelector('#canvas-host canvas')?.width>0,'Original 2D renderer draws a canvas');
document.getElementById('view-3d').click();await wait(400);check(!document.getElementById('three-host').hidden&&document.querySelector('#three-host canvas'),'Original 3D view opens');
document.getElementById('view-2d').click();check(document.getElementById('three-host').hidden,'Original 2D toggle restored');
return JSON.stringify({passed:checks.length,checks},null,2);
})();
