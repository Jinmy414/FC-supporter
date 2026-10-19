// Static inspection only: never evaluates recovered code or makes network requests.
const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const walk = require('acorn-walk');

function inspect(source) {
  const ast = acorn.parse(source, { ecmaVersion: 'latest', locations: true });
  const calls = [];
  walk.ancestor(ast, {
    CallExpression(node, ancestors) {
      if (node.callee.type !== 'Identifier' || node.callee.name !== 'be') return;
      const options = node.arguments[1];
      const property = name => options?.type === 'ObjectExpression'
        ? options.properties.find(p => p.type === 'Property' && !p.computed &&
          (p.key.name || p.key.value) === name)?.value : undefined;
      const route = node.arguments[0];
      if (!route) return;
      const wrapped = route.type === 'CallExpression' && route.callee.name === 'qo';
      const expression = wrapped ? route.arguments[0] : route;
      const method = property('method');
      const body = property('body');
      const enclosing = [...ancestors].reverse().find(n =>
        n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression');
      calls.push({
        line: node.loc.start.line,
        function: enclosing?.id?.name || '(anonymous)',
        routeExpression: source.slice(route.start, route.end),
        literalRoute: expression?.type === 'Literal' && typeof expression.value === 'string' ? expression.value : null,
        solveBase: wrapped,
        // Variables, spreads and computed options need manual inspection.
        method: method?.type === 'Literal' ? method.value : method ? '(dynamic)' :
          !options || options.type === 'ObjectExpression' && !options.properties.some(p =>
            p.type === 'SpreadElement' || p.computed) ? 'GET' : '(unresolved)',
        bodyExpression: body ? source.slice(body.start, body.end) : null,
        optionsExpression: options ? source.slice(options.start, options.end) : null
      });
    }
  });
  return { schemaVersion: 1, sourceSHA256: crypto.createHash('sha256').update(source).digest('hex'),
    scope: 'Observed client call sites only; not a server schema or proof of server behaviour.', calls };
}

if (require.main === module) {
  const [, , input, output] = process.argv;
  if (!input || !output) throw new Error('Usage: node scripts/backend-contracts.cjs INPUT.js OUTPUT.json');
  const report = inspect(fs.readFileSync(input, 'utf8'));
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(`Indexed ${report.calls.length} backend call sites without executing client code.`);
}
module.exports = { inspect };
