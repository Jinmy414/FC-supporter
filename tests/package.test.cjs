const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process');
test('download manifest hashes match the actual ZIP and userscript',()=>{
 const m=JSON.parse(fs.readFileSync('site/downloads/manifest.json','utf8'));
 assert.equal(m.version,'1.2.0-beta.1');
 for(const f of m.files){const b=fs.readFileSync('site/downloads/'+f.name);assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}
});
test('extension ZIP contains the verified native client, local planner and notices but excludes recovery archives',()=>{
 const code=`import zipfile,json\nz=zipfile.ZipFile('site/downloads/fc-supporter.zip')\nassert z.testzip() is None\nprint(json.dumps(z.namelist()))`;
 const run=cp.spawnSync('python3',['-c',code],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);const names=JSON.parse(run.stdout);
 for(const name of ['manifest.json','app.html','core.js','app.js','solver-worker.js','native-loader.js','vendor/fodder/client.js','vendor/fodder/bridge.js','vendor/fodder/background.js','vendor/fodder/provenance.json','vendor/fodder/NOTICE.md','fonts/Archivo-LICENSE.txt','fonts/Geist-LICENSE.txt'])assert.ok(names.includes(name));
 assert.ok(!names.some(name=>/recovery\/|node_modules|client\.core\.js|chrome\/client|\.crx$|\.bundle$/.test(name)));
});
test('generated script mirrors are identical and main page is the installer',()=>{
 for(const file of ['core.js','app.js','app.css','solver-worker.js'])assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync('site/'+file,'utf8'));
 assert.equal(fs.readFileSync('site/app.html','utf8'),fs.readFileSync('app.html','utf8').replaceAll('href="https://jinmy414.github.io/FC-supporter/"','href="./"'));
 assert.match(fs.readFileSync('site/index.html','utf8'),/其他安装方式/);assert.match(fs.readFileSync('site/app.html','utf8'),/id="view-sbc"/);
});
