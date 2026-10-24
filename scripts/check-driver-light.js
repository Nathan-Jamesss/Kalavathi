const panel=document.getElementById('mock-panel');
if(panel.open)throw Error('Demo dropdown starts open');
if(document.documentElement.scrollWidth>innerWidth)throw Error('Horizontal overflow');
document.getElementById('activate-token').click();
if(!document.querySelector('.map-card svg'))throw Error('Missing demo map');
if(document.getElementById('change-hospital').getBoundingClientRect().top>innerHeight-100)throw Error('Change control below fold');
document.querySelector('.notify-contacts').click();
if(!document.getElementById('screen').textContent.includes('No messages were sent'))throw Error('Misleading notification');
JSON.stringify({passed:5,checks:['Dropdown closed','No overflow','Activation opens map','Change hospital above fold','Notification explicitly simulated']});
