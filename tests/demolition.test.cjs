const assert=require('node:assert/strict');
const W=require('../dist/world.js'),F=require('../dist/game.js');

const s=F.fresh();
assert.equal(s.version,6);
assert(F.valid(s));
assert(W.removableById['fence-0']);

const fence='fence-0';
assert.match(F.act(s,{type:'demolish',id:fence}),/1\/2/);
assert.equal(s.durability[fence],1);
let reloaded=F.migrate(JSON.parse(JSON.stringify(s)));
assert.equal(reloaded.durability[fence],1);
F.act(reloaded,{type:'demolish',id:fence});
assert(reloaded.removedObjects.includes(fence));
assert(!(fence in reloaded.durability));
assert.match(F.act(reloaded,{type:'demolish',id:fence}),/уже свободно/);
assert(F.valid(reloaded));

// A damaged prop can be repaired without first destroying it.
const repair=F.fresh();
F.act(repair,{type:'demolish',id:'object-16'});
assert.equal(repair.durability['object-16'],1);
const repairCoins=repair.coins;
F.act(repair,{type:'repair',id:'object-16'});
assert(!('object-16' in repair.durability));
assert.equal(repair.coins,repairCoins-2);
assert(F.valid(repair));

// A removed obstruction must immediately unblock building, and a newly
// purchased plot prevents the old obstruction from being restored on top of it.
W.setObstacleMask(new Uint8Array(W.WIDTH*W.HEIGHT));
W.setFootprint(fence,['4,0']);
assert(!W.canPlace(s,4,0).ok);
assert(W.canPlace(reloaded,4,0).ok);
reloaded.coins=500;
F.act(reloaded,{type:'placePlot',c:4,r:0});
assert(!W.canRestore(reloaded,fence).ok);
const blocked=JSON.stringify(reloaded);
assert.match(F.act(reloaded,{type:'restore',id:fence}),/грядка/);
assert.equal(JSON.stringify(reloaded),blocked);
reloaded.plotCells.pop();reloaded.plots.pop();reloaded.plotPurchases--;
const coins=reloaded.coins;
F.act(reloaded,{type:'restore',id:fence});
assert.equal(reloaded.coins,coins-5);
assert(!reloaded.removedObjects.includes(fence));
assert(!W.canPlace(reloaded,4,0).ok);
assert(F.valid(reloaded));

// Workshops first need a selected free cell and a construction timer.
const farm=F.fresh();farm.buildings.mill=false;
const millSite=W.cells.find(c=>W.canPlaceBuilding(farm,'mill',c.c,c.r).ok);
assert(millSite);
const startedAt=1000;
assert.match(F.act(farm,{type:'buildAt',id:'mill',...millSite},startedAt),/строительство/);
assert.equal(farm.buildings.mill,false);
assert(F.valid(farm));
assert.equal(farm.construction.mill.ready,11000);
assert(!W.canPlace(farm,millSite.c,millSite.r).ok);
assert(!F.advance(farm,10999));
assert(F.advance(farm,11000));
assert(farm.buildings.mill);
farm.inventory.wheat=2;
F.act(farm,{type:'craft',id:'flour'},12000);
const mill=W.removables.find(o=>o.building==='mill');
const saved=JSON.stringify(farm);
assert.match(F.act(farm,{type:'demolish',id:mill.uid},12001),/Сначала забери/);
assert.equal(JSON.stringify(farm),saved);
F.act(farm,{type:'collect',id:'mill'},32000);
assert.match(F.act(farm,{type:'demolish',id:mill.uid},33000),/разборка/);
assert(!F.advance(farm,40999));
assert(F.advance(farm,41000));
assert.equal(farm.buildings.mill,false);
assert(farm.removedObjects.includes(mill.uid));
assert.equal(farm.jobs.mill,null);
farm.coins=100;
assert.match(F.act(farm,{type:'restore',id:mill.uid}),/Постройки/);
const nextSite=W.cells.find(c=>W.canPlaceBuilding(farm,'mill',c.c,c.r).ok&&(c.c!==millSite.c||c.r!==millSite.r));
assert(nextSite);
F.act(farm,{type:'buildAt',id:'mill',...nextSite},42000);
F.advance(farm,52000);
assert(farm.buildings.mill);
assert(farm.removedObjects.includes(mill.uid)); // The old location remains free.
assert.deepEqual(farm.buildingSites.mill,nextSite);
assert(!W.canPlace(farm,nextSite.c,nextSite.r).ok);
assert(F.valid(farm));

// Orchard trees can be returned, so a player cannot permanently lose fruit orders.
const orchard=F.fresh();
const fruitTree=W.removableById['object-0'];
for(let i=0;i<fruitTree.maxHP;i++)F.act(orchard,{type:'demolish',id:fruitTree.uid});
assert.match(F.act(orchard,{type:'tree',i:0},1000),/убрано/);
assert.equal(orchard.inventory.apple,0);
F.act(orchard,{type:'restore',id:fruitTree.uid});
F.act(orchard,{type:'tree',i:0},1000);
assert.equal(orchard.inventory.apple,2);

// Save migration preserves the former economy and gives new construction fields.
const old=F.fresh();old.version=4;delete old.removedObjects;delete old.durability;
const migrated=F.migrate(old);
assert.equal(migrated.version,6);
assert.deepEqual(migrated.removedObjects,[]);
assert.deepEqual(migrated.durability,{});
assert.equal(migrated.barn,true);
assert.deepEqual(migrated.construction,{barn:null,mill:null,bakery:null,coop:null});
assert(!F.valid({...migrated,removedObjects:['unknown-item']}));
assert(!F.valid({...migrated,durability:{'fence-0':-1}}));
console.log('PASS: demolition, timed movable buildings, durability, safe restoration, busy workshops, orchards and v4 migration');
