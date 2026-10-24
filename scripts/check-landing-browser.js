const roles=[...document.querySelectorAll('.role-card')];
if(roles.length!==3)throw Error('Expected three role destinations');
if(document.documentElement.scrollWidth>innerWidth)throw Error('Landing overflow');
JSON.stringify({roles:roles.map(a=>a.getAttribute('href')),noOverflow:true});
