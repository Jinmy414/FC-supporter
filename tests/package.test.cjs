const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process');
test('download manifest hashes match the actual ZIP and userscript',()=>{
 const m=JSON.parse(fs.readFileSync('site/downloads/manifest.json','utf8'));
 assert.equal(m.version,'1.1.0-beta.1');
 for(const f of m.files){const b=fs.readFileSync('site/downloads/'+f.name);assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}
});
test('extension ZIP contains worker, fonts and licenses and excludes recovered vendor code',()=>{
 const code=`import zipfile,json\nz=zipfile.ZipFile('site/downloads/fc-supporter.zip')\nassert z.testzip() is None\nprint(json.dumps(z.namelist()))`;
 const run=cp.spawnSync('python3',['-c',code],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);const names=JSON.parse(run.stdout);
 for(const name of ['manifest.json','app.html','core.js','app.js','solver-worker.js','fonts/Archivo-LICENSE.txt','fonts/Geist-LICENSE.txt'])assert.ok(names.includes(name));
 assert.ok(!names.some(name=>/recovery|node_modules|client\.core\.js|chrome\/client/.test(name)));
});
test('generated script mirrors are identical and main page is the installer',()=>{
 for(const file of ['core.js','app.js','app.css','solver-worker.js'])assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync('site/'+file,'utf8'));
 assert.match(fs.readFileSync('site/index.html','utf8'),/其他安装方式/);assert.match(fs.readFileSync('site/app.html','utf8'),/id="view-sbc"/);
});
