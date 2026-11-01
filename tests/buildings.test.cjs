const assert=require('node:assert/strict');
const W=require('../dist/world.js'),F=require('../dist/game.js');

W.setObstacleMask(new Uint8Array(W.WIDTH*W.HEIGHT));
const free=(s,id)=>W.cells.find(p=>W.canPlaceBuilding(s,id,p.c,p.r).ok);
const barnUid=W.structureById.barn.uid;
let s=F.fresh();
assert(s.barn);
assert(s.buildings.mill&&s.buildings.bakery&&s.buildings.coop); // Preserve the familiar starting farm.
assert(F.valid(s));
assert.match(F.act(s,{type:'demolish',id:barnUid},1000),/разборка/);
assert(!F.advance(s,10999));
assert(s.barn);
assert(F.advance(s,11000));
assert.equal(s.barn,false);
assert.equal(s.coins,160); // Original barn material is returned: never a softlock.
assert(F.valid(s));
const before=JSON.stringify(s);
for(const action of [{type:'plot',i:0,crop:'wheat'},{type:'animal',id:'hen'},{type:'order',i:0},{type:'placePlot',c:4,r:0},{type:'sell',item:'wheat'}]){
 assert.match(F.act(s,action,11001),/амбар/i);
 assert.equal(JSON.stringify(s),before);
}
assert(!W.canPlace(s,4,0).ok);
assert.match(F.act(s,{type:'buildAt',id:'mill',c:4,r:0},11001),/построено/i);

const site=free(s,'barn');
assert(site);
const saving=F.migrate(JSON.parse(JSON.stringify(s)));
assert(saving&&!saving.barn);
assert.match(F.act(s,{type:'buildAt',id:'barn',...site},12000),/строительство/);
assert.equal(s.coins,80);
assert.equal(s.barn,false);
assert(!W.canPlace(s,site.c,site.r).ok);
assert(!F.advance(s,23999));
assert(F.advance(s,24000));
assert(s.barn);
assert(F.valid(s));
assert(!W.canPlace(s,site.c,site.r).ok);
assert(!F.advance(s,25000));
assert.equal(s.coins,80);

// An existing plot cannot be covered by a workshop, and one pixel-equivalent
// occupied grid cell of a relocated building blocks the next plot.
W.setBuildingFootprint('mill',[{c:0,r:0},{c:1,r:0}]);
assert.match(F.act(s,{type:'demolish',id:W.structureById.mill.uid},25000),/разборка/);
assert(F.advance(s,33000));
assert(!s.buildings.mill);
const mill=free(s,'mill');
assert(mill);
const first=JSON.stringify(s);
assert.match(F.act(s,{type:'buildAt',id:'mill',c:s.plotCells[0].c,r:s.plotCells[0].r},34000),/грядка|пересекается/);
assert.equal(JSON.stringify(s),first);
s.coins=200;
F.act(s,{type:'buildAt',id:'mill',...mill},35000);
assert(s.construction.mill);
assert(!W.canPlace(s,mill.c,mill.r).ok);
assert(!W.canPlace(s,mill.c+1,mill.r).ok);
assert(F.advance(s,45000));
assert(s.buildings.mill);
assert(F.valid(s));

// A v5 save is upgraded without losing its established farm and buildings.
const old=F.fresh();old.version=5;old.buildings.mill=true;
delete old.barn;delete old.buildingSites;delete old.construction;delete old.demolition;
const migrated=F.migrate(old);
assert(migrated&&F.valid(migrated));
assert(migrated.barn&&migrated.buildings.mill);
assert.equal(migrated.buildingSites.mill,null);
console.log('PASS: barn lock, timed demolition and reconstruction, no softlock, building footprints, v5 migration');
