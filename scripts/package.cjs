const fs=require('node:fs');
const cp=require('node:child_process');
for(const name of ['core.js','app.js','app.css','solver-worker.js'])fs.copyFileSync(name,'site/'+name);
const result=cp.spawnSync('python3',['scripts/package.py'],{stdio:'inherit'});
process.exit(result.status ?? 1);
