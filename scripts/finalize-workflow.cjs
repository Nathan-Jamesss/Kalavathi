const fs=require('fs');let s=fs.readFileSync('lib/workflow.js','utf8');s=s.replace('if(r.hospital_confirmed)out.push','if(r.hospital_confirmed||r.ever_hospital_confirmed)out.push').replace('!live(r)&&!r.hospital_confirmed','!live(r)&&!r.hospital_confirmed&&!r.ever_hospital_confirmed');
s=s.replace("const v=this.view(r),status=['cancelled'", "const v=this.view(r),status=r.redirected_from&&!r.hospital_confirmed&&r.status==='pending'?'redirected':['cancelled'");
fs.writeFileSync('lib/workflow.js',s);
