const fs=require('fs'),dir='static/digital-twin/';
for(const name of ['index.html','console.html']){
let html=fs.readFileSync(dir+name,'utf8');
html=html.replace('https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js','lib/p5.min.js').replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','lib/three.min.js');
html=html.replace(/  <link rel="preconnect"[^>]*>\r?\n/g,'').replace(/  <link rel="stylesheet" href="https:\/\/fonts.googleapis.com[^>]*>/,'  <link rel="stylesheet" href="lib/fonts.css">');
html=html.replace('<script>window.CONFIG = window.CONFIG || {};</script>','').replace('<script src="config.js" onerror="void 0"></script>','<script src="config.js"></script>');
html=html.replace('</head>','  <link rel="stylesheet" href="kalavathi.css">\n</head>').replace('</body>','<script src="kalavathi.js"></script>\n</body>');
fs.writeFileSync(dir+name,html);
}
fs.writeFileSync(dir+'config.js','window.CONFIG = {}; // Offline local heuristic; no API keys.\n');
