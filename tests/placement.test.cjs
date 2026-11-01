const assert=require('node:assert/strict');const W=require('../dist/world.js'),F=require('../dist/game.js');
const clear=()=>W.setObstacleMask(new Uint8Array(W.WIDTH*W.HEIGHT));
let s=F.fresh();assert(F.valid(s));assert.equal(W.canPlace(s,4,0).ok,false);clear();
assert.deepEqual([0,1,2,3,4].map(n=>W.plotPrice({plotPurchases:n})),[100,110,121,134,147]);
assert(!W.canPlace(s,0,0).ok);assert(!W.canPlace(s,100,100).ok);assert(!W.canPlace(s,.5,0).ok);
const free=W.cells.filter(c=>W.canPlace(s,c.c,c.r).ok);assert(free.length>100);
s.coins=99;const initial=JSON.stringify(s);F.act(s,{type:'placePlot',...free[0]});assert.equal(JSON.stringify(s),initial);
s.coins=1000;const before=s.coins;F.act(s,{type:'placePlot',...free[0]});assert.equal(s.coins,before-100);assert.equal(s.plots.length,7);assert.equal(s.plotPurchases,1);assert.deepEqual(s.plotCells.at(-1),free[0]);assert(F.valid(s));
const after=JSON.stringify(s);F.act(s,{type:'placePlot',...free[0]});assert.equal(JSON.stringify(s),after);
F.act(s,{type:'placePlot',...free[1]});assert.equal(s.coins,790);assert.equal(s.plotPurchases,2);assert.equal(W.plotPrice(s),121);
const restored=F.migrate(JSON.parse(JSON.stringify(s)));assert(restored);assert.deepEqual(restored.plotCells,s.plotCells);assert.equal(W.plotPrice(restored),121);
// A SINGLE visible pixel at the edge rejects the cell; no 1% allowance exists.
const mask=new Uint8Array(W.WIDTH*W.HEIGHT),candidate=free[2],p=W.center(candidate.c,candidate.r);
mask[Math.floor(p.y)*W.WIDTH+Math.floor(p.x+W.HALF_W-2)]=1;W.setObstacleMask(mask);assert(!W.canPlace(s,candidate.c,candidate.r).ok);
const blockedState=JSON.stringify(s);F.act(s,{type:'placePlot',...candidate});assert.equal(JSON.stringify(s),blockedState);
// Clearing the same obstruction makes the tile available again.
clear();assert(W.canPlace(s,candidate.c,candidate.r).ok);
for(const c of W.cells){const point=W.center(c.c,c.r);assert.deepEqual(W.snap(point.x,point.y),c);}
// All old plots/crops/animals survive migration; old 9-plot farms keep all 9.
for(const n of [6,9]){const old=F.fresh();old.version=3;old.plots=Array(n).fill(null);old.plots[0]={crop:'corn',ready:123456};delete old.plotCells;delete old.plotPurchases;delete old.plotBaseCount;old.coins=347;const m=F.migrate(old);assert(m);assert.equal(m.coins,347);assert.equal(m.plots.length,n);assert.deepEqual(m.plots[0],old.plots[0]);assert.equal(W.plotPrice(m),100);assert.equal(m.plotBaseCount,n);}
assert(!F.valid({...s,plotCells:s.plotCells.map(()=>({c:0,r:0}))}));assert(!F.valid({...s,plotPurchases:0}));
console.log('PASS: prices, insufficient funds, atomic purchase, duplicate/bounds rejection, one-pixel collision, grid snapping, save reload and 6/9-plot migration');
