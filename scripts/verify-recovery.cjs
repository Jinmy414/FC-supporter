const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),acorn=require('acorn');
const files=['client.core.js','fodder.user.js','chrome/client.js','chrome/background.js','chrome/bridge.js','chrome/loader.js'];
function astHash(source){
 const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'script'});
 const serial=JSON.stringify(ast,(key,value)=>['start','end','loc','raw'].includes(key)?undefined:typeof value==='bigint'?value.toString():value);
 return crypto.createHash('sha256').update(serial).digest('hex');
}
const results=files.map(file=>{
 const original=fs.readFileSync(path.join('recovery/original',file),'utf8');
 const readable=fs.readFileSync(path.join('recovery/readable',file),'utf8');
 const a=astHash(original),b=astHash(readable);
 if(a!==b)throw Error('AST mismatch: '+file);
 return {file,syntax:true,astEquivalent:true,astSha256:a};
});
fs.writeFileSync('recovery/reports/verification.json',JSON.stringify(results,null,2));
console.log('All '+results.length+' recovered JS files parse successfully; formatting preserves their AST.');
