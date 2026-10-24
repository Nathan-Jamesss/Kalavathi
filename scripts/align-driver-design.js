const fs=require('node:fs');const path=require('node:path');
const file=path.join(__dirname,'..','static','driver.css');let css=fs.readFileSync(file,'utf8');
const tokens=`/* Tokens and component treatments from DigitalTwinGenesis console.css, f0a89bc. */
:root{--bg:#080C13;--panel:#121A25;--panel-2:#1B2531;--line:#2A3746;--text:#EAF1F9;--dim:#91A4BA;--accent:#22D3EE;--accent-2:#67E8F9;--good:#34D399;--good-bg:#0F2E26;--warn:#FBAF3F;--warn-bg:#33260F;--danger:#F87171;--danger-bg:#331616;--font:"Segoe UI",system-ui,-apple-system,sans-serif;--mono:"Cascadia Mono",Consolas,"JetBrains Mono",monospace;--blue:var(--accent);--muted:var(--dim);--green:var(--good);--red:var(--danger);--amber:var(--warn);--surface:var(--panel);font-family:var(--font);font-synthesis:none;color:var(--text);background:var(--bg)}
`;
css=css.replace(/^\/\*[^]*?\*\/\s*:root\{[^}]*\}\s*/,tokens);
for(const [old,value]of Object.entries({'#182d43':'var(--text)','#f3f6fa':'var(--bg)','#e09b1a':'var(--accent)','#e2e8f0':'var(--panel-2)','#52667b':'var(--dim)','#aebfd0':'var(--line)','#25405c':'var(--text)','#b8c7d7':'var(--line)','#fff4d8':'var(--warn-bg)','#dbac45':'var(--warn)','#fff0f1':'var(--danger-bg)','#d6a7ae':'var(--danger)','#e7eef5':'var(--panel-2)','#e1f1e9':'var(--good-bg)','#d6e0eb':'var(--line)','#cf6572':'var(--danger)','#c8d4df':'var(--panel-2)','#8195a9':'var(--line)','#217d54':'var(--good)','#64788e':'var(--dim)'}))css=css.replaceAll(old,value);
css=css.replaceAll('background:white','background:var(--panel)').replaceAll('color:white','color:var(--text)');
css=css.replaceAll('border-radius:10px','border-radius:14px').replaceAll('border-radius:6px','border-radius:8px');
css+=`\n/* Reused console components: .calm panels, .option buttons, .badge chips, .dot.live. */
button{color:#04252b}button.secondary,.text-button{color:var(--text);background:var(--panel-2)}button:disabled{color:var(--dim)}
.quota-large,.eta,.countdown strong{font-family:var(--mono);color:var(--accent-2)}
.quota-dot{background:var(--accent);border-color:var(--accent)}
.tag{font-family:var(--mono);color:var(--accent-2);background:var(--panel-2);border:1px solid var(--line)}
.trust-chip{font-family:var(--mono);color:var(--warn);background:var(--warn-bg);border:1px solid var(--warn)}
.trust-chip.verified{color:var(--good);background:var(--good-bg);border-color:var(--good)}
.destination,.route-panel,.reason-panel{background:var(--panel);border-radius:14px}
.change-button{background:var(--warn);border-color:var(--warn);color:#241800}.change-button:disabled{background:var(--panel-2);color:var(--dim);border-color:var(--line)}
.hold-cancel{color:var(--danger);background:var(--danger-bg);border-radius:12px}.hold-cancel:disabled{color:var(--dim);background:var(--panel-2)}
.hold-cancel progress::-webkit-progress-bar{background:transparent}.hold-cancel progress::-webkit-progress-value{background:var(--danger)}
.redirect-banner{background:var(--panel-2);border:2px solid var(--accent);color:var(--accent-2);border-radius:14px}
.device-footer{background:rgba(8,12,19,.94);backdrop-filter:blur(8px)}.device-footer>button{background:transparent;color:var(--text)}
.hospital-option{background:var(--panel);color:var(--text);border-radius:12px}.hospital-option:hover{border-color:var(--accent)}
.mock-panel{background:var(--panel);border-radius:14px}.mock-panel select{background:var(--panel-2);color:var(--text)}
.picker-heading button{background:var(--panel-2);color:var(--text)}.junctions li{color:var(--dim)}
`;
fs.writeFileSync(file,css);console.log('Aligned driver tokens and components with DigitalTwinGenesis console.css.');
