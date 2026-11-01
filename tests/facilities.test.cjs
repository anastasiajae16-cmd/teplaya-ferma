const assert=require('node:assert/strict');
const W=require('../dist/world.js'),F=require('../dist/game.js');

// The map must contain buildings, not independently rendered or collidable animals.
assert.equal(W.objects.filter(o=>o.id==='cow'||o.id==='hen').every(o=>o.hidden),true);
assert(W.structureById.coop&&W.structureById.cowshed);
assert(W.removableById[W.structureById.cowshed.uid]);
assert(!W.removables.some(o=>o.id==='cow'||o.id==='hen'));

const s=F.fresh();
assert.equal(s.version,7);
assert(s.buildings.coop&&s.buildings.cowshed);
s.inventory.wheat=4;s.inventory.carrot=4;
assert.match(F.act(s,{type:'animal',id:'hen'},1000),/Курятник/);
assert.match(F.act(s,{type:'animal',id:'cow'},1000),/Коровник/);
assert.equal(s.inventory.wheat,2);
assert.equal(s.inventory.carrot,2);
const coopUid=W.structureById.coop.uid,cowshedUid=W.structureById.cowshed.uid;
assert.match(F.act(s,{type:'demolish',id:coopUid},2000),/Сначала забери яйца/);
assert.match(F.act(s,{type:'demolish',id:cowshedUid},2000),/Сначала забери молоко/);
assert.match(F.act(s,{type:'animal',id:'hen'},21000),/Получено/);
assert.match(F.act(s,{type:'animal',id:'cow'},31000),/Получено/);
assert.equal(s.inventory.egg,2);
assert.equal(s.inventory.milk,2);
assert.match(F.act(s,{type:'demolish',id:cowshedUid},32000),/разборка/);
assert(F.advance(s,44000));
assert.equal(s.buildings.cowshed,false);
assert.match(F.act(s,{type:'animal',id:'cow'},45000),/Сначала построй/);
assert(F.valid(s));

// Upgrade an actual v6-shaped save without changing the old fields/timers.
const old=F.fresh();old.version=6;
old.coins=372;old.inventory.milk=9;old.animals.cow=42000;
delete old.buildings.cowshed;delete old.buildingSites.cowshed;
delete old.construction.cowshed;delete old.demolition.cowshed;
const migrated=F.migrate(old);
assert(migrated&&F.valid(migrated));
assert.equal(migrated.version,7);
assert.equal(migrated.coins,372);
assert.equal(migrated.inventory.milk,9);
assert.equal(migrated.animals.cow,42000);
assert.equal(migrated.buildings.cowshed,true);
assert.equal(migrated.buildingSites.cowshed,null);
assert.equal(old.version,6);
console.log('PASS: static livestock facilities, production, demolition, v6 save migration');
