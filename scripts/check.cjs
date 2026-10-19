const fs=require('node:fs'),path=require('node:path'),acorn=require('acorn'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {parse:parseCSS}=require('rrweb-cssom');
const files=['core.js','app.js','solver-worker.js','popup.js','native-loader.js','native-bridge.js','vendor/fodder/client.js','vendor/fodder/bridge.js','vendor/fodder/background.js','site/install.js','site/downloads/fc-supporter.user.js'];
files.forEach(file=>acorn.parse(fs.readFileSync(file,'utf8'),{ecmaVersion:'latest'}));
for(const file of ['site/styles.css','site/app.css','app.css','popup.css'])parseCSS(fs.readFileSync(file,'utf8'));
for(const name of ['core.js','app.js','app.css','solver-worker.js'])assert.equal(fs.readFileSync(name,'utf8'),fs.readFileSync('site/'+name,'utf8'),'Unsynced '+name);
for(const file of ['site/index.html','site/install.html','site/app.html','app.html','popup.html']){
 const doc=new JSDOM(fs.readFileSync(file,'utf8')).window.document;
 const ids=[...doc.querySelectorAll('[id]')].map(node=>node.id);assert.equal(new Set(ids).size,ids.length,'Duplicate ID in '+file);
 for(const node of doc.querySelectorAll('[src],[href]')){
  const value=node.getAttribute('src')||node.getAttribute('href');
  if(!value||/^(?:https?:|data:|blob:)/.test(value))continue;
  const [resource,hash]=value.split('#');
  if(!resource){assert.ok(doc.getElementById(hash),file+' missing anchor '+hash);continue;}
  let target=path.resolve(path.dirname(file),resource.split('?')[0]);
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  assert.ok(fs.existsSync(target),file+' missing resource '+resource);
 }
}
for(const file of ['site/styles.css','site/app.css','app.css']){
 const css=fs.readFileSync(file,'utf8');
 for(const match of css.matchAll(/url\(([^)]+)\)/g)){
  const value=match[1].replace(/['"]/g,'');if(/^(data:|https?:)/.test(value))continue;
  assert.ok(fs.existsSync(path.resolve(path.dirname(file),value)),file+' missing CSS resource '+value);
 }
}
const idsFor = file => [...new JSDOM(fs.readFileSync(file,'utf8')).window.document.querySelectorAll('[id]')].map(node=>node.id).sort();
assert.deepEqual(idsFor('app.html'),idsFor('site/app.html'),'Extension and website controls differ');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));assert.equal(manifest.version,'1.2.0');assert.deepEqual(manifest.host_permissions,['https://fodder.gg/*','https://solve.fodder.gg/*']);assert.deepEqual(manifest.permissions,['storage','identity']);
assert.equal(manifest.background.service_worker,'vendor/fodder/background.js');
for(const entry of manifest.content_scripts){assert.deepEqual(entry.matches,['https://www.ea.com/ea-sports-fc/ultimate-team/web-app*','https://www.ea.com/*/ea-sports-fc/ultimate-team/web-app*']);for(const file of entry.js)assert.ok(fs.existsSync(file));}
assert.deepEqual(manifest.web_accessible_resources,[{resources:['vendor/fodder/client.js'],matches:['https://www.ea.com/*']}]);
console.log('Syntax, CSS parsing, IDs, links, resources, synchronized scripts and extension permissions passed.');
