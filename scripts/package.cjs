const fs=require('node:fs');
const cp=require('node:child_process');
for(const name of ['core.js','app.js','app.css','solver-worker.js'])fs.copyFileSync(name,'site/'+name);
const installURL='https://jinmy414.github.io/FC-supporter/';
fs.writeFileSync('site/app.html',fs.readFileSync('app.html','utf8').replaceAll(`href="${installURL}"`,'href="./"'));
const result=cp.spawnSync('python3',['scripts/package.py'],{stdio:'inherit'});
process.exit(result.status ?? 1);
