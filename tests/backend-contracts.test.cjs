const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspect } = require('../scripts/backend-contracts.cjs');

test('indexes literal routes, request bodies, method and enclosing function', () => {
  const report = inspect('async function solve(payload) { return be(qo("/v1/solves"), {method:"POST",body:JSON.stringify(payload)}); }');
  assert.deepEqual(report.calls[0], {
    line: 1, function: 'solve', routeExpression: 'qo("/v1/solves")', literalRoute: '/v1/solves',
    solveBase: true, method: 'POST', bodyExpression: 'JSON.stringify(payload)',
    optionsExpression: '{method:"POST",body:JSON.stringify(payload)}'
  });
  assert.match(report.sourceSHA256, /^[a-f0-9]{64}$/);
});
test('retains dynamic route expressions instead of inventing endpoint URLs', () => {
  const call = inspect('be(qo("/v1/solves/" + id), {signal});').calls[0];
  assert.equal(call.literalRoute, null);
  assert.equal(call.method, 'GET');
  assert.equal(call.routeExpression, 'qo("/v1/solves/" + id)');
});
test('marks variable, spread and computed request options unresolved', () => {
  for (const options of ['options', '{...options}', '{[key]: value}']) {
    assert.equal(inspect(`be("/x", ${options});`).calls[0].method, '(unresolved)');
  }
  assert.equal(inspect('be("/x", {method: verb});').calls[0].method, '(dynamic)');
});
test('does not evaluate inspected source or include unrelated fetch calls', () => {
  const report = inspect('throw Error("must not execute"); fetch("/ignore"); be("/config");');
  assert.equal(report.calls.length, 1);
  assert.equal(report.calls[0].method, 'GET');
  assert.equal(report.calls[0].literalRoute, '/config');
});
