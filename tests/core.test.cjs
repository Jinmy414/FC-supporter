const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('core.js', 'utf8'), context);
const C = context.window.FCSupporterCore;
const positions = Array.from(C.FORMATIONS['4-3-3']);
function player(i, extra = {}) {
  return C.normalizePlayer({id:`p${i}`, name:`Player ${i}`, rating:80, positions:positions[i % 11], owned:true, league:`l${i}`, nation:`n${i}`, club:`c${i}`, ...extra}, i);
}
function squad(extra = {}) { return positions.map((_,i)=>player(i,extra)); }

test('JSON/CSV round trip retains attributes, UTF-8 and quoted names', () => {
  const data = C.parsePlayersText('\uFEFFid,name,rating,positions,owned,price,chemBonus\r\np0,"张, 三",80,CM,true,0,2\r\n','players.csv');
  assert.equal(data[0].name,'张, 三');
  assert.equal(data[0].chemBonus,2);
  const again=C.parsePlayersText(JSON.stringify(data),'players.json');
  assert.equal(again[0].id,'p0');
});
test('malformed CSV, invalid players and duplicate IDs fail with a useful error', () => {
  for(const text of ['id,name,rating\np0,"broken,80', '[null]', '[{"name":"bad","rating":500}]', JSON.stringify([player(1),player(1)])]) {
    assert.throws(()=>C.parsePlayersText(text));
  }
});
test('unknown formations and unsupported requirements are rejected', () => {
  assert.throws(()=>C.solveSquad(squad(),{formation:'0-0-11'}));
  assert.throws(()=>C.solveSquad(squad(),{minChemisty:33}));
  assert.throws(()=>C.solveSquad(squad(),{minRating:-1}));
});
test('two players in the same league receive no league chemistry', () => {
  const s=squad();s[1].league=s[0].league;
  assert.equal(C.assignPositions(s,'4-3-3').chemistry,0);
});
test('three league players receive their first league chemistry point', () => {
  const s=squad();s[1].league=s[2].league=s[0].league;
  assert.equal(C.assignPositions(s,'4-3-3').chemistry,3);
});
test('out of position cards do not contribute to chemistry thresholds', () => {
  const s=squad();s[1].positions=['CDM'];s[1].club=s[0].club;
  assert.equal(C.assignPositions(s,'4-3-3').chemistry,0);
});
test('missing position data does not give a card chemistry', () => {
  assert.equal(C.assignPositions(squad({positions:[],club:'c',league:'l',nation:'n'}),'4-3-3').chemistry,0);
});
test('one footballer cannot occupy two slots using different card variants', () => {
  const s=squad();s[1].assetId=s[0].assetId='same-footballer';
  assert.equal(C.evaluateSquad(s).valid,false);
});
test('squad builder requires eligible players for every position', () => {
  const r=C.buildSquad(squad({positions:['GK']}),{formation:'4-3-3'});
  assert.equal(r.squad,null);
});
test('valid squad builder respects budget, positions and player uniqueness', () => {
  const s=squad({club:'c',league:'l',nation:'n'});
  const r=C.buildSquad(s,{formation:'4-3-3',minChemistry:33});
  assert.ok(r.squad);assert.equal(r.evaluation.chemistry,33);
  r.squad.forEach(x=>assert.ok(x.player.positions.includes(x.position)));
});
test('batch prioritizes constrained squads while returning the original order', () => {
  const pool=Array.from({length:22},(_,i)=>player(i,{rating:i<11?75:90}));
  const r=C.solveBatch(pool,[{name:'low',minRating:75},{name:'high',minRating:90}]);
  assert.equal(r[0].requirement.name,'low');assert.equal(r[1].requirement.name,'high');
  assert.ok(r.every(x=>x.squad));
  const ids=r.flatMap(x=>x.squad.map(p=>p.id));assert.equal(new Set(ids).size,22);
});
test('swap excludes cards reserved in other challenges', () => {
  const s=squad(); const reserved=player(11,{rating:90}), free=player(12,{rating:80});
  const choices=C.findSwaps([...s,reserved,free],s,0,{},true,5,new Set([reserved.id]));
  assert.ok(choices.length);assert.ok(choices.every(x=>x.player.id!==reserved.id));
});
test('owned-only solving cannot use market cards and respects market budget', () => {
  const s=squad();s[0].owned=false;s[0].price=1000;
  assert.equal(C.solveSquad(s,{},false).squad,null);
  assert.equal(C.solveSquad(s,{budget:999}).squad,null);
  assert.ok(C.solveSquad(s,{budget:1000}).squad);
});
test('search limits always report incomplete search accurately', () => {
  const r=C.solveSquad([...squad(),player(12)],{nodeLimit:1});
  assert.equal(r.approximate,true);
});
test('result evaluation rejects all constraint violations', () => {
  const s=squad({club:'one',league:'one',nation:'one'});
  assert.equal(C.evaluateSquad(s,{maxSameClub:2}).valid,false);
  assert.equal(C.evaluateSquad(s,{minUniqueLeagues:2}).valid,false);
  assert.equal(C.evaluateSquad(s,{quality:'bronze'}).valid,false);
  assert.equal(C.evaluateSquad(s,{minRating:99}).valid,false);
});
test('small-pool solver agrees with exhaustive feasibility on rating and budget', () => {
  for(let seed=1;seed<=10;seed++){
    const pool=Array.from({length:12},(_,i)=>player(i,{rating:65+(i*7+seed*3)%28,owned:i%3!==0,price:100+(i*61)%500}));
    const req={minRating:76+(seed%4),budget:1000+seed*30};
    const feasible=pool.some((_,omit)=>C.evaluateSquad(pool.filter((_,i)=>i!==omit),req).valid);
    const r=C.solveSquad(pool,req);assert.equal(!!r.squad,feasible,`seed ${seed}`);
    if(r.squad)assert.equal(C.evaluateSquad(r.squad,req).valid,true);
  }
});

test('out of range attributes, Meta and bonuses are rejected at import',()=>{
 for(const extra of [{pace:900},{meta:{CM:101}},{meta:[]},{chemBonus:5}])assert.throws(()=>C.parsePlayersText(JSON.stringify([{...player(0),...extra}])));
});
test('a role-specific Meta value is not reused for another role',()=>{
 const p=player(0,{rating:75,meta:{CB:99},stats:{diving:70,handling:70,reflexes:70,speed:70,positioning:70}});
 assert.ok(Math.abs(C.roleScore(p,'GK')-70)<1e-9);
});
test('a same-club maximum cannot pass when club data is missing',()=>{
 const s=squad();s[0].club='';assert.equal(C.evaluateSquad(s,{maxSameClub:2}).valid,false);
});

test('unique group upper bounds reject excess groups and accept exact boundaries', () => {
  for (const [field, key] of [['club','maxUniqueClubs'],['league','maxUniqueLeagues'],['nation','maxUniqueNations']]) {
    const s = squad();
    s.forEach((p,i) => {p[field] = `g${i%2}`;});
    assert.equal(C.evaluateSquad(s,{[key]:2}).valid,true,key);
    assert.equal(C.evaluateSquad(s,{[key]:1}).valid,false,key);
    s[0][field]='';
    assert.equal(C.evaluateSquad(s,{[key]:2}).valid,false,`${key}: missing metadata`);
  }
});

test('contradictory and invalid unique limits fail before search', () => {
  for (const group of ['Clubs','Leagues','Nations']) {
    for (const limit of [0,12,1.5,null,'']) {
      assert.throws(() => C.validateRequirement({[`maxUnique${group}`]:limit}));
    }
    assert.throws(() => C.validateRequirement({[`minUnique${group}`]:3,[`maxUnique${group}`]:2}),/不能大于/);
  }
});

test('unique maximum solver agrees with exhaustive small-pool feasibility', () => {
  for (let seed=0;seed<8;seed++) {
    const pool = Array.from({length:12},(_,i)=>player(i,{club:`g${(i+seed)%3}`,rating:70+i}));
    const req = {maxUniqueClubs:seed%2?2:3,minRating:75};
    const feasible = pool.some((_,omit)=>C.evaluateSquad(pool.filter((_,i)=>i!==omit),req).valid);
    const result = C.solveSquad(pool,req);
    assert.equal(!!result.squad,feasible,`seed ${seed}`);
  }
});

test('solver chooses a feasible group and swap preserves unique maximum', () => {
  const pool = squad({club:'one'});
  const alternative = player(11,{club:'other',rating:80});
  const req={maxUniqueClubs:1};
  const result=C.solveSquad([...pool,alternative],req);
  assert.ok(result.squad);
  assert.equal(new Set(result.squad.map(p=>p.club)).size,1);
  const choices=C.findSwaps([...pool,alternative],pool,0,req);
  assert.ok(choices.every(item=>item.player.club==='one'));
});
