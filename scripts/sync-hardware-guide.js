const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const guide=path.join(root,'FINAL_HARDWARE_GUIDE.md');
let content=fs.readFileSync(guide,'utf8');
for(const [tag,file] of [['ESP32_CODE','firmware/kalavathi_bench/kalavathi_bench.ino'],['UNO_CODE','firmware/kalavathi_junctions/kalavathi_junctions.ino']]){
  const code=fs.readFileSync(path.join(root,file),'utf8').trimEnd();
  const block=`<!-- ${tag} -->\n\n\`\`\`cpp\n${code}\n\`\`\`\n\n<!-- ${tag}_END -->`;
  const existing=new RegExp(`<!-- ${tag} -->[\\s\\S]*?<!-- ${tag}_END -->`);
  if(existing.test(content))content=content.replace(existing,()=>block);
  else{if(!content.includes(`<!-- ${tag} -->`))throw Error('Missing section '+tag);content=content.replace(`<!-- ${tag} -->`,()=>block);}
}
fs.writeFileSync(guide,content);console.log('Guide contains both complete, current Arduino sketches.');
