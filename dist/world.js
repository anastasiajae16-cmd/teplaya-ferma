(function(root){
'use strict';
const WIDTH=1600,HEIGHT=1000,STEP_X=80,STEP_Y=40,HALF_W=75,HALF_H=37.5;
const trees=[{x:250,y:310,id:'apple'},{x:390,y:265,id:'pear'},{x:535,y:220,id:'apple'},{x:215,y:450,id:'pear'},{x:355,y:405,id:'apple'},{x:500,y:360,id:'pear'}];
const objects=[...trees.map((t,i)=>({...t,w:187,h:183,tree:i})),{id:'barn',x:810,y:310,w:270,h:246},{id:'mill',x:1080,y:412,w:218,h:277,building:'mill'},{id:'bakery',x:1260,y:570,w:242,h:223,building:'bakery'},{id:'coop',x:814,y:627,w:166,h:146},{id:'cow',x:1015,y:684,w:142,h:124,animal:'cow'},{id:'hen',x:834,y:704,w:63,h:49,animal:'hen'},{id:'hen',x:754,y:686,w:44,h:34},{id:'hen',x:800,y:737,w:46,h:35},{id:'hay',x:975,y:509,w:105,h:82},{id:'hay',x:905,y:365,w:87,h:66},{id:'lilac',x:1375,y:575,w:117,h:113},{id:'lilac',x:657,y:285,w:108,h:104},{id:'lilac',x:200,y:625,w:104,h:100},{id:'pine',x:75,y:740,w:188,h:226},{id:'pine',x:45,y:520,w:160,h:193},{id:'pine',x:1120,y:160,w:150,h:181},{id:'lilac',x:1020,y:180,w:114,h:111},{id:'lilac',x:1430,y:685,w:104,h:101},{id:'pine',x:120,y:222,w:177,h:171},{id:'pine',x:240,y:154,w:166,h:160},{id:'pine',x:1430,y:415,w:182,h:176},{id:'pine',x:1360,y:283,w:179,h:173},{id:'pine',x:1500,y:600,w:192,h:185},
 ...Array.from({length:3},(_,i)=>({id:'hay',x:1060+i*58,y:846+i*18,w:83,h:74}))];
const beds=[{x:360,y:800,w:250,h:125,color:'#f0c735'},{x:535,y:887,w:230,h:115,color:'#d8e5c4'},{x:210,y:717,w:160,h:79,color:'#d9577d'},{x:700,y:903,w:145,h:70,color:'#c63c42'}];
const fences=[...Array.from({length:4},(_,i)=>({x:1055+i*58,y:692+i*29})),...Array.from({length:3},(_,i)=>({x:1262+i*58,y:601+i*29})),...Array.from({length:2},(_,i)=>({x:250+i*58,y:695+i*29}))];
// IDs are positional and stable across saves. Animals are intentionally not destructible.
const names={apple:'Яблоня',pear:'Груша',pine:'Сосна',lilac:'Куст сирени',barn:'Амбар',mill:'Мельница',bakery:'Пекарня',coop:'Курятник',hay:'Стог сена'};
const removables=[...objects.flatMap((o,i)=>o.animal||o.id==='hen'?[]:[{...o,uid:'object-'+i,name:names[o.id],kind:o.building?'workshop':o.tree!==undefined?'orchard':['barn','coop'].includes(o.id)?'building':'decoration',maxHP:o.building?7:o.id==='barn'?7:o.id==='coop'?5:o.tree!==undefined?4:o.id==='pine'?3:o.id==='lilac'?2:1,restoreCost:o.building?0:o.tree!==undefined?30:o.id==='barn'?35:o.id==='coop'?25:o.id==='pine'?12:o.id==='lilac'?6:4}]),...fences.map((f,i)=>({...f,uid:'fence-'+i,id:'fence',name:'Забор',kind:'decoration',w:100,h:76,maxHP:2,restoreCost:5})),...beds.map((b,i)=>({...b,uid:'bed-'+i,id:'flowerbed',name:'Цветник',kind:'decoration',maxHP:2,restoreCost:8}))];
const removableById=Object.fromEntries(removables.map(o=>[o.uid,o]));
const objectIds=objects.map((o,i)=>({...o,uid:'object-'+i}));
const fenceIds=fences.map((f,i)=>({...f,uid:'fence-'+i}));
const bedIds=beds.map((b,i)=>({...b,uid:'bed-'+i}));
const center=(c,r)=>({x:470+(c-r)*STEP_X,y:510+(c+r)*STEP_Y});
const key=(c,r)=>c+','+r;
function snap(x,y){const a=(x-470)/STEP_X,b=(y-510)/STEP_Y;return {c:Math.round((a+b)/2),r:Math.round((b-a)/2)};}
function inBounds(c,r){if(!Number.isInteger(c)||!Number.isInteger(r))return false;const p=center(c,r);return p.x-HALF_W>=0&&p.x+HALF_W<=WIDTH&&p.y-HALF_H>=0&&p.y+HALF_H<=HEIGHT;}
const cells=[];for(let c=-30;c<=30;c++)for(let r=-30;r<=30;r++)if(inBounds(c,r))cells.push({c,r});
const initialCells=count=>Array.from({length:count},(_,i)=>({c:i%3,r:Math.floor(i/3)}));
let initialized=false,blocked=new Set(),footprints=new Map();
function setObstacleMask(alpha){
 if(!alpha||alpha.length!==WIDTH*HEIGHT)throw Error('Invalid world collision mask');
 blocked=new Set();footprints=new Map();
 for(const cell of cells){const p=center(cell.c,cell.r);let hit=false;
  for(let y=Math.floor(p.y-HALF_H);y<Math.ceil(p.y+HALF_H)&&!hit;y++){
   for(let x=Math.floor(p.x-HALF_W);x<Math.ceil(p.x+HALF_W);x++){
    // Any visible pixel is a collision: there is no allowed overlap percentage.
    if(Math.abs(x+.5-p.x)/HALF_W+Math.abs(y+.5-p.y)/HALF_H<=1&&alpha[y*WIDTH+x]>0){hit=true;break;}
   }
  }
  if(hit)blocked.add(key(cell.c,cell.r));
 }
 initialized=true;
}
function setFootprint(uid,keys){if(!removableById[uid])throw Error('Unknown obstacle');footprints.set(uid,new Set(keys));}
function removed(state,uid){return !!state?.removedObjects?.includes(uid);}
function isBlocked(state,c,r){const cell=key(c,r);if(blocked.has(cell))return true;for(const [uid,covered] of footprints)if(!removed(state,uid)&&covered.has(cell))return true;return false;}
function canPlace(state,c,r){
 if(!inBounds(c,r))return {ok:false,reason:'Грядка выходит за границы карты'};
 if(!initialized)return {ok:false,reason:'Карта ещё загружается'};
 if((state.plotCells||[]).some(cell=>cell.c===c&&cell.r===r))return {ok:false,reason:'Здесь уже есть грядка'};
 if(isBlocked(state,c,r))return {ok:false,reason:'Место перекрыто объектом, дорогой или водой'};
 return {ok:true,reason:'Свободное место'};
}
function canRestore(state,uid){const item=removableById[uid];if(!item)return {ok:false,reason:'Объект не найден'};
 const occupied=footprints.get(uid);if(occupied&&state.plotCells.some(p=>occupied.has(key(p.c,p.r))))return {ok:false,reason:'На этом месте уже стоит грядка'};
 return {ok:true};}
function plotPrice(state){return Math.ceil(100*Math.pow(1.1,state.plotPurchases||0)-1e-8);}
function prepare(art){
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const ellipse=(x,y,rx,ry)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
 const polygon=points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
 const road=(points,width)=>{ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
 // Permanently blocked ground: path and pond shore; decorations are separate removable layers.
 road([[660,0],[730,140],[770,310],[790,410],[760,490],[800,600],[870,760],[865,1000]],92);
 road([[780,445],[1000,440],[1245,525]],86);
 polygon([[1600,580],[1465,600],[1380,635],[1290,645],[1225,700],[1195,775],[1220,870],[1310,950],[1420,1000],[1600,1000]]);
 // Animals cannot be demolished, so their opaque sprite pixels stay protected.
 for(const o of objects)if(o.animal||o.id==='hen'){
  ellipse(o.x+16,o.y-4,o.w*.32,o.w*.11);
  ctx.drawImage(art.frames[o.id],o.x-o.w/2,o.y-o.h,o.w,o.h);
 }
 const pixels=ctx.getImageData(0,0,WIDTH,HEIGHT).data,alpha=new Uint8Array(WIDTH*HEIGHT);
 for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3];
 setObstacleMask(alpha);
 // Precalculate pixel-accurate occupied diamonds for each removable object once.
 // None of this image processing occurs in the animation frame loop.
 for(const item of removables){
  const x0=Math.floor(item.x-(item.w||0)/2-22),y0=Math.floor(item.y-(item.h||0)-22);
  const w=Math.ceil((item.w||0)+44),h=Math.ceil((item.h||0)+44);
  const tile=document.createElement('canvas');tile.width=w;tile.height=h;
  const tc=tile.getContext('2d',{willReadFrequently:true});tc.translate(-x0,-y0);tc.fillStyle='#000';
  if(item.id==='flowerbed'){
   tc.beginPath();tc.moveTo(item.x,item.y-item.h/2-15);tc.lineTo(item.x+item.w/2+6,item.y-8);
   tc.lineTo(item.x,item.y+item.h/2+4);tc.lineTo(item.x-item.w/2-6,item.y-8);tc.closePath();tc.fill();
  }else{
   tc.beginPath();tc.ellipse(item.x+16,item.y-4,item.w*.32,item.w*.11,0,0,Math.PI*2);tc.fill();
   tc.drawImage(art.frames[item.id],item.x-item.w/2,item.y-item.h,item.w,item.h);
  }
  const bytes=tc.getImageData(0,0,w,h).data,used=[];
  for(const cell of cells){const p=center(cell.c,cell.r);
   if(p.x+HALF_W<x0||p.x-HALF_W>x0+w||p.y+HALF_H<y0||p.y-HALF_H>y0+h)continue;
   const left=Math.max(0,Math.floor(p.x-HALF_W-x0)),right=Math.min(w,Math.ceil(p.x+HALF_W-x0));
   const top=Math.max(0,Math.floor(p.y-HALF_H-y0)),bottom=Math.min(h,Math.ceil(p.y+HALF_H-y0));
   let hit=false;for(let y=top;y<bottom&&!hit;y++)for(let x=left;x<right;x++){
    if(Math.abs(x+x0+.5-p.x)/HALF_W+Math.abs(y+y0+.5-p.y)/HALF_H<=1&&bytes[(y*w+x)*4+3]>0){hit=true;break;}
   }
   if(hit)used.push(key(cell.c,cell.r));
  }
  setFootprint(item.uid,used);
 }
}
const api={WIDTH,HEIGHT,HALF_W,HALF_H,trees,objects:objectIds,beds:bedIds,fences:fenceIds,removables,removableById,cells,center,snap,inBounds,initialCells,canPlace,canRestore,plotPrice,prepare,setObstacleMask,setFootprint,removed,get ready(){return initialized;}};
root.FarmWorld=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
