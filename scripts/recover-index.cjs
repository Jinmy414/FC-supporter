const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const walk = require('acorn-walk');
(async () => {
  const beautify = require('js-beautify').js;
  const root='recovery';
  const files=['client.core.js','fodder.user.js','chrome/client.js','chrome/background.js','chrome/bridge.js','chrome/loader.js'];
  const summary=[];
  for (const name of files) {
    const input=fs.readFileSync(path.join(root,'original',name),'utf8');
    const output=beautify(input,{indent_size:2,wrap_line_length:100,preserve_newlines:true,end_with_newline:true});
    const dest=path.join(root,'readable',name);
    fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,output);
    const ast=acorn.parse(output,{ecmaVersion:'latest',sourceType:'script',locations:true});
    const functions=[],routes=new Set(),prototypes=new Set();
    walk.simple(ast,{
      FunctionDeclaration(node){functions.push({name:node.id?.name,line:node.loc.start.line,endLine:node.loc.end.line});},
      Literal(node){if(typeof node.value==='string'&&(/\/(?:api|auth|solve|gallery|prices|account|client)\b/.test(node.value)||/^https?:\/\//.test(node.value)))routes.add(node.value);},
      AssignmentExpression(node){const left=output.slice(node.left.start,node.left.end);if(left.includes('.prototype.'))prototypes.add(left);}
    });
    fs.writeFileSync(path.join(root,'reports',name.replaceAll('/','-')+'.index.json'),JSON.stringify({file:'readable/'+name,functions,routes:[...routes],prototypeHooks:[...prototypes]},null,2));
    summary.push({file:name,lines:output.split('\n').length,namedFunctions:functions.length,routes:routes.size,prototypeHooks:prototypes.size});
  }
  fs.writeFileSync(path.join(root,'reports/readable-summary.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,2));
})();
