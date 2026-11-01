'use strict';
(function(){
const viewport=document.getElementById('map-viewport'),canvas=document.getElementById('farm-canvas'),ctx=canvas.getContext('2d'),controls=document.getElementById('map-controls');
let loaded=false,state=null,width=0,height=0,dpr=1,fit=1,zoom=1,panX=0,panY=0,dirty=true,lastTime=0,initialCamera=true,dragged=false,pinchStart=0,placingBuilding=null,hovered=null,placing=false,selectedCell=null,demolishing=false,selectedTarget=null,animationTime=0,previousFrame=0;
let motion=!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
try{const saved=localStorage.getItem('teplaya-ferma-motion');if(saved==='on'||saved==='off')motion=saved==='on';}catch{}
const dust=[];
const pointers=new Map();
const trees=FarmWorld.trees;let spots=[];
function diamond(x,y,w,h,fill,stroke){ctx.beginPath();ctx.moveTo(x,y-h/2);ctx.lineTo(x+w/2,y);ctx.lineTo(x,y+h/2);ctx.lineTo(x-w/2,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function sprite(id,x,y,w,h,alpha=1,highlight=false,tilt=0,bob=0){const frame=FarmArt.frames[id];if(!frame||!loaded)return;ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(highlight){ctx.shadowColor='#fff5a4';ctx.shadowBlur=18;}ctx.translate(x,y);if(tilt)ctx.rotate(tilt);ctx.drawImage(frame,-w/2,-h+bob,w,h);ctx.restore();}
function visible(x,y,pad=120){const scale=fit*zoom,sx=width/2+panX+(x-800)*scale,sy=height/2+panY+(y-500)*scale;return sx>=-pad*scale&&sx<=width+pad*scale&&sy>=-pad*scale&&sy<=height+pad*scale;}
function sway(i,amount=.013){return motion?Math.sin(animationTime*.00095+i*2.37)*amount+Math.sin(animationTime*.00147+i*3.1)*amount*.26:0;}
function waterAndGrass(){if(!motion)return;
 ctx.save();ctx.beginPath();ctx.moveTo(1600,650);ctx.lineTo(1472,650);ctx.lineTo(1393,674);ctx.lineTo(1320,690);ctx.lineTo(1265,746);ctx.lineTo(1272,818);ctx.lineTo(1340,901);ctx.lineTo(1430,954);ctx.lineTo(1600,995);ctx.closePath();ctx.clip();
 for(let i=0;i<4;i++){const x=1360+i*62,y=740+(i%2)*80,phase=(animationTime*.00023+i*.24)%1,r=7+phase*25;ctx.beginPath();ctx.ellipse(x,y,r,r*.36,0,0,Math.PI*2);ctx.strokeStyle='rgba(242,255,224,'+(.2*(1-phase))+')';ctx.lineWidth=1.6;ctx.stroke();}
 ctx.restore();
 for(let i=0;i<42;i++){const x=90+(i*137)%1040,y=70+(i*173)%830;if(x>635&&x<885||x>1020&&y>560)continue;if(!visible(x,y,10))continue;const wind=sway(i,.08);ctx.save();ctx.translate(x,y);ctx.strokeStyle='rgba(38,110,30,.22)';ctx.lineWidth=1.5;for(let j=-1;j<=1;j++){ctx.beginPath();ctx.moveTo(j*3,0);ctx.quadraticCurveTo(j*3+wind*26,-5,j*3+wind*45+j*2,-10-j%2*2);ctx.stroke();}ctx.restore();}
}
function particles(){if(!motion){dust.length=0;return;}for(let i=dust.length-1;i>=0;i--){const p=dust[i],age=animationTime-p.start;if(age>550){dust.splice(i,1);continue;}if(!visible(p.x,p.y,35))continue;ctx.save();ctx.globalAlpha=(1-age/550)*.7;for(let n=0;n<6;n++){const angle=n*Math.PI/3+p.seed,travel=age*.035*(.5+(n%3)*.15);ellipse(p.x+Math.cos(angle)*travel,p.y-12+Math.sin(angle)*travel-age*.04,3+(n%2)*2,2.5,n%2?'#c1a071':'#eee0ae');}ctx.restore();}}
function label(text,x,y,{color='#fffbe6',bg='#65502ee8',size=13}={}){ctx.save();ctx.font='bold '+size+'px Arial';const m=ctx.measureText(text),w=m.width+18;ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(x-w/2,y-12,w,23,7);ctx.fill();ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,y+4);ctx.restore();}
function bubble(text,x,y){ctx.save();ellipse(x,y+4,25,13,'#354e2740');ellipse(x,y,22,18,'#fff5be');ctx.strokeStyle='#9c7b36';ctx.lineWidth=2;ctx.stroke();ctx.font='22px Arial';ctx.textAlign='center';ctx.fillStyle='#5a6a27';ctx.fillText(text,x,y+7);ctx.restore();}
function path(points,w,color){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}
function fenceLine(x,y,n){for(let i=0;i<n;i++)sprite('fence',x+i*58,y+i*29,100,76);}
function bed(x,y,w,h,color){diamond(x,y,w,h,'#725332','#bba05a');for(let r=0;r<5;r++)for(let c=0;c<9;c++){const a=x+(c-4)*w*.065-(r-2)*w*.065,b=y+(c-4)*h*.06+(r-2)*h*.06;path([[a,b+2],[a,b-9]],1.5,'#4b7f26');ellipse(a-3,b-2,4,2,'#62932f');ellipse(a+3,b-4,4,2,'#7ea83a');for(let k=0;k<5;k++)ellipse(a+Math.cos(k*Math.PI*2/5)*3,b-10+Math.sin(k*Math.PI*2/5)*3,2.5,2.2,color);ellipse(a,b-10,1.5,1.5,'#f8d26a');}}
function plant(type,x,y,ready,time,maxWidth=43,tilt=0){const frame=FarmArt.frames[type];if(!frame)return;const size=ready?1:.42+.44*Math.max(0,Math.min(1,time));const w=maxWidth*size,h=w*frame.height/frame.width;ctx.save();ctx.globalAlpha=ready?1:.94;ctx.filter=ready?'none':'saturate(.8)';ellipse(x+3,y+2,12*size,5*size,'#233f2524');ctx.translate(x,y);ctx.rotate(tilt);ctx.drawImage(frame,-w/2,-h,w,h);ctx.restore();}
function workClouds(o,progress,breaking){
 if(!motion)return;
 ctx.save();for(let j=0;j<7;j++){
  const drift=Math.sin(animationTime*.002+j*1.7)*9,rise=((animationTime*.018+j*19)%68);
  ctx.globalAlpha=(breaking?.36:.23)*(1-rise/90);
  ellipse(o.x+(j-3)*o.w*.095+drift,o.y-rise-8,9+j%3*4,6+j%2*4,breaking?'#cab597':'#ead5b1');
 }
 if(!breaking){
  ctx.globalAlpha=.85;ctx.strokeStyle='#c8a36d';ctx.lineWidth=5;
  for(let i=-1;i<=1;i++){const x=o.x+i*o.w*.26;path([[x,o.y],[x,o.y-o.h*.9]],4,'#b3814c');}
  path([[o.x-o.w*.37,o.y-o.h*.32],[o.x+o.w*.37,o.y-o.h*.32]],3,'#dfbb77');
 }
 ctx.restore();
}
function draw(){if(!state||!width||!loaded)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#78a33b';ctx.fillRect(0,0,width,height);const scale=fit*zoom;ctx.translate(width/2+panX,height/2+panY);ctx.scale(scale,scale);ctx.translate(-800,-500);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(FarmArt.terrain,0,0,1600,1000);waterAndGrass();
// Decorative flower fields are part of the landscape, distinct from clickable plots.
FarmWorld.beds.forEach(b=>{if(!FarmWorld.removed(state,b.uid)&&visible(b.x,b.y,160))bed(b.x,b.y,b.w,b.h,b.color);});
FarmWorld.fences.forEach((f,i)=>{if(!FarmWorld.removed(state,f.uid)&&visible(f.x,f.y,90))sprite('fence',f.x,f.y,100,76,1,demolishing&&(selectedTarget===f.uid||hovered===f.uid));});
// Ground beds are painted first, then plants in ground-depth order.
for(let i=0;i<spots.length;i++){const p=spots[i],locked=i>=state.plots.length;if(!visible(p.x,p.y,110))continue;
 diamond(p.x+3,p.y+7,154,79,'#4e592b32');
 const earth=ctx.createLinearGradient(0,p.y-38,0,p.y+38);earth.addColorStop(0,locked?'#83a545':'#88603c');earth.addColorStop(1,locked?'#72923f':'#a5784b');
 diamond(p.x,p.y,150,75,earth,hovered==='plot-'+i?'#fff3a7':locked?'#aac767':'#b9995c');
 if(!locked){sprite('soil',p.x,p.y+37,150,75);
 if(!state.plots[i]){ctx.save();ctx.fillStyle='#e4cc92';ctx.font='22px Arial';ctx.textAlign='center';ctx.fillText('+',p.x,p.y+7);ctx.restore();}}
 else label('🔒',p.x,p.y,{size:14,bg:'#537b33b0'});
}
// Every crop is fitted inside its own soil diamond. The clip also contains shadows
// and antialiased sprite edges, regardless of growth stage or camera scale.
for(let i=0;i<state.plots.length;i++){
 const crop=state.plots[i];if(!crop)continue;
 const p=spots[i],definition=Farm.crops[crop.crop],frame=FarmArt.frames[crop.crop];
 if(!frame||!visible(p.x,p.y,100))continue;
 const ready=crop.ready<=Date.now(),progress=1-(crop.ready-Date.now())/definition.time;
 const ratio=frame.height/frame.width,halfWidth=73,halfHeight=36,plants=[];
 // One common size per plot; seed positions follow the same two axes as the soil.
 for(let row=0;row<3;row++)for(let column=0;column<3;column++){
  const u=(column-1)*.42,v=(row-1)*.42;
  plants.push({centerX:(u-v)*35,centerY:(u+v)*16.25-7});
 }
 const uniformWidth=Math.min(18,...plants.map(planting=>
  (.97-Math.abs(planting.centerX)/halfWidth-Math.abs(planting.centerY)/halfHeight)/
  (1/(2*halfWidth)+ratio/(2*halfHeight))));
 for(const planting of plants){planting.x=p.x+planting.centerX;planting.y=p.y+planting.centerY+uniformWidth*ratio/2;planting.width=uniformWidth;}
 ctx.save();ctx.beginPath();ctx.moveTo(p.x,p.y-36);ctx.lineTo(p.x+73,p.y);ctx.lineTo(p.x,p.y+36);ctx.lineTo(p.x-73,p.y);ctx.closePath();ctx.clip();
 plants.sort((a,b)=>a.y-b.y).forEach((planting,j)=>plant(crop.crop,planting.x,planting.y,ready,progress,planting.width,sway(i*9+j,.025)));
 ctx.restore();
}
for(let i=0;i<state.plots.length;i++){
 const crop=state.plots[i];if(!crop)continue;const p=spots[i];if(!visible(p.x,p.y,100))continue;const ready=crop.ready<=Date.now();
 const text=ready?'✓':Math.ceil((crop.ready-Date.now())/1000)+'с';
 ctx.save();ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
 const badgeWidth=Math.min(28,ctx.measureText(text).width+8),badgeY=p.y+22;
 ctx.fillStyle=ready?'#5e842deb':'#66512fe8';ctx.beginPath();ctx.roundRect(p.x-badgeWidth/2,badgeY-6,badgeWidth,12,4);ctx.fill();
 ctx.fillStyle='#fff7d8';ctx.fillText(text,p.x,badgeY+.5);ctx.restore();
}
// Sort tall objects by their ground contact point for consistent overlap.
const objects=FarmWorld.objects.map(o=>{
 const structure=FarmWorld.structureById[o.id];
 if(structure){if(!FarmWorld.structureActive(state,o.id))return null;return {...o,...FarmWorld.structurePosition(state,o.id)};}
 return FarmWorld.removed(state,o.uid)?null:o;
}).filter(Boolean).sort((a,b)=>a.y-b.y);
for(let i=0;i<objects.length;i++){const o=objects[i];if(!visible(o.x,o.y,Math.max(o.w,o.h)))continue;
 const structure=!!FarmWorld.structureById[o.id],buildingKey=structure?o.id:null;
 const constructing=buildingKey&&state.construction[buildingKey],tearing=buildingKey&&state.demolition[buildingKey];
 const progress=constructing?Math.min(1,Math.max(0,(Date.now()-constructing.started)/(constructing.ready-constructing.started))):tearing?Math.min(1,Math.max(0,(Date.now()-tearing.started)/(tearing.ready-tearing.started))):1;
 ellipse(o.x+16,o.y-4,o.w*.32,o.w*.11,'#34562f35');
 const isTree=o.tree!==undefined||o.id==='pine'||o.id==='lilac',isAnimal=o.animal||o.id==='hen';
 const tilt=isTree?sway(i,.011):isAnimal?sway(i,.018):0,bob=isAnimal&&motion?Math.sin(animationTime*.002+i*2)*1.3:0;
 const marked=demolishing&&(selectedTarget===o.uid||hovered===o.uid),normalHover=!demolishing&&hovered===(o.tree!==undefined?'tree-'+o.tree:o.animal||o.building||o.id);
 if(constructing){
  ctx.save();ctx.beginPath();ctx.rect(o.x-o.w/2-10,o.y-o.h*progress,o.w+20,o.h*progress+10);ctx.clip();
  sprite(o.id,o.x,o.y,o.w,o.h,.32+.68*progress,marked||normalHover);
  ctx.restore();workClouds(o,progress,false);
 }else if(tearing){
  ctx.save();ctx.translate(o.x,o.y);ctx.scale(1,1-progress*.82);ctx.translate(-o.x,-o.y);
  sprite(o.id,o.x,o.y,o.w,o.h,1-progress*.65,marked||normalHover);
  ctx.restore();workClouds(o,progress,true);
 }else sprite(o.id,o.x,o.y,o.w,o.h,1,marked||normalHover,tilt,bob);
 if(demolishing){const item=FarmWorld.removableById[o.uid];if(item&&marked)label(structure?'Разобрать · '+item.name:(state.durability[o.uid]??item.maxHP)+' / '+item.maxHP+' ♥',o.x,o.y-o.h-7,{size:11,bg:'#8d543be8'});continue;}
 if(o.tree!==undefined){if(state.orchard[o.tree]<=Date.now())bubble(o.tree%2?'🍐':'🍎',o.x,o.y-o.h+14);else label(Math.ceil((state.orchard[o.tree]-Date.now())/1000)+' с',o.x,o.y-o.h+12,{size:11,bg:'#5c783cce'});}
 if(structure){
  if(constructing||tearing)label((tearing?'Разборка':'Стройка')+' · '+Math.ceil(( (tearing||constructing).ready-Date.now())/1000)+' с',o.x,o.y+8,{bg:'#8b6245',size:12});
  else if(o.building&&state.jobs[o.building])bubble(state.jobs[o.building].ready<=Date.now()?'✓':'⏳',o.x,o.y-o.h+16);
  else label(Farm.buildings[o.id].name,o.x,o.y+7,{size:12});
 }
 if(o.animal){const ready=state.animals[o.animal];bubble(ready===null?'♡':ready<=Date.now()?Farm.goods[Farm.animals[o.animal].product].icon:'⏳',o.x,o.y-o.h-10);}}
// Existing small farm props share the same hand-painted material and lighting.

particles();if(placing&&selectedCell)drawPlacement();}
function updateControls(){if(!state)return;let items;
 if(demolishing){items=FarmWorld.removables.filter(o=>FarmWorld.structureById[o.id]?(FarmWorld.structureActive(state,o.id)&&!state.construction[o.id]&&!state.demolition[o.id]):!FarmWorld.removed(state,o.uid)).map(o=>{
  const p=FarmWorld.structureById[o.id]?FarmWorld.structurePosition(state,o.id):o;
  return {key:o.uid,x:p.x,y:o.id==='flowerbed'?p.y:p.y-o.h*.43,w:o.w*.9,h:o.id==='flowerbed'?o.h:o.h*.85,kind:'demolition',id:o.uid,label:'Разобрать: '+o.name};
 });}
 else{
  items=spots.map((p,i)=>({key:'plot-'+i,x:p.x,y:p.y,w:146,h:73,kind:i<state.plots.length?'plot':'expand',id:i,label:i<state.plots.length?'Грядка '+(i+1)+(state.plots[i]?(state.plots[i].ready<=Date.now()?': собрать ':': растёт ')+Farm.crops[state.plots[i].crop].name:': посадить'): 'Расширить участок'}));
  trees.forEach((t,i)=>{if(!FarmWorld.removed(state,'object-'+i))items.push({key:'tree-'+i,x:t.x,y:t.y-70,w:132,h:145,kind:'tree',id:i,label:(i%2?'Груша':'Яблоня')+(state.orchard[i]<=Date.now()?': собрать фрукты':': растёт')});});
  for(const id of FarmWorld.structureIds){
   if(!FarmWorld.structureActive(state,id))continue;
   const p=FarmWorld.structurePosition(state,id),o=FarmWorld.structureById[id];
   items.push({key:id,x:p.x,y:p.y-o.h*.43,w:o.w*.75,h:o.h*.7,kind:id==='barn'?'inventory':'workshop',id,label:id==='barn'?'Открыть амбар':Farm.buildings[id].name});
  }
  items.push({key:'cow',x:1015,y:641,w:132,h:92,kind:'animal',id:'cow',label:'Бурёнка: кормить или собрать молоко'},{key:'hen',x:834,y:683,w:70,h:65,kind:'animal',id:'hen',label:'Курочка: кормить или собрать яйца'});
 }
 const present=new Set(items.map(i=>'map-hit-'+i.key));for(const child of [...controls.children])if(!present.has(child.id))child.remove();
 const scale=fit*zoom;for(const item of items){let b=document.getElementById('map-hit-'+item.key);if(!b){b=document.createElement('button');b.id='map-hit-'+item.key;b.className='map-hit';controls.append(b);}b.dataset.mapAction=item.kind;b.dataset.mapId=item.id;b.setAttribute('aria-label',item.label);b.title=item.label;b.style.left=width/2+panX+(item.x-800)*scale-item.w*scale/2+'px';b.style.top=height/2+panY+(item.y-500)*scale-item.h*scale/2+'px';b.style.width=item.w*scale+'px';b.style.height=item.h*scale+'px';b.style.zIndex=Math.round(item.y);}
}
function resize(){width=viewport.clientWidth;height=viewport.clientHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);fit=Math.max(width/1600,height/1000);if(initialCamera&&width<540&&height>width){panX=105*fit;panY=-20*fit;}initialCamera=false;clamp();dirty=true;updateControls();}
function zoomBy(factor){zoom=Math.max(1,Math.min(2.6,zoom*factor));clamp();dirty=true;updateControls();}
function clamp(){const limX=Math.max(0,(1600*fit*zoom-width)/2),limY=Math.max(0,(1000*fit*zoom-height)/2);panX=Math.max(-limX,Math.min(limX,panX));panY=Math.max(-limY,Math.min(limY,panY));}
viewport.addEventListener('pointerdown',e=>{if(window.FarmPlatform?.paused)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});if(pointers.size===2){const p=[...pointers.values()];pinchStart=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);pinchZoom=zoom;}dragged=false;});
viewport.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;if(pointers.size===1){const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>6){dragged=true;viewport.classList.add('dragging');viewport.setPointerCapture(e.pointerId);panX+=dx;panY+=dy;clamp();dirty=true;}}p.x=e.clientX;p.y=e.clientY;if(pointers.size===2&&pinchStart){const pp=[...pointers.values()];zoom=Math.max(1,Math.min(2.6,pinchZoom*Math.hypot(pp[0].x-pp[1].x,pp[0].y-pp[1].y)/pinchStart));dirty=true;dragged=true;}updateControls();});
function release(e){if(placing&&!dragged&&e.type==='pointerup'&&pointers.size===1)selectAt(e);pointers.delete(e.pointerId);viewport.classList.remove('dragging');if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);if(!pointers.size)setTimeout(()=>{dragged=false;},100);}
viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);viewport.addEventListener('click',e=>{if(dragged){e.stopImmediatePropagation();e.preventDefault();}},true);
viewport.addEventListener('wheel',e=>{e.preventDefault();if(window.FarmPlatform?.paused)return;zoomBy(e.deltaY<0?1.1:1/1.1);},{passive:false});
function placementInfo(){
 const building=placingBuilding,price=building?Farm.buildings[building].cost:state?FarmWorld.plotPrice(state):100;
 if(!selectedCell)return {active:placing,building,price,ok:false,reason:'Выбери свободную клетку на карте'};
 const location=building?FarmWorld.canPlaceBuilding(state,building,selectedCell.c,selectedCell.r):FarmWorld.canPlace(state,selectedCell.c,selectedCell.r),affordable=state.coins>=price;
 return {active:placing,building,validLocation:location.ok,price,c:selectedCell.c,r:selectedCell.r,ok:location.ok&&affordable,reason:!location.ok?location.reason:!affordable?'Не хватает '+(price-state.coins)+' монет':'Место свободно. Можно строить'};
}
function notifyPlacement(){document.dispatchEvent(new CustomEvent('farm-placement-change',{detail:placementInfo()}));}
function selectAt(event){if(!placing||FarmPlatform.paused)return;const rect=viewport.getBoundingClientRect(),scale=fit*zoom;
 const x=(event.clientX-rect.left-width/2-panX)/scale+800,y=(event.clientY-rect.top-height/2-panY)/scale+500;
 selectedCell=FarmWorld.snap(x,y);dirty=true;notifyPlacement();
}
function startPlacement(building=null){if(!loaded)return;placingBuilding=building;placing=true;selectedCell=null;hovered=null;viewport.classList.add('placing');viewport.tabIndex=0;viewport.focus({preventScroll:true});dirty=true;notifyPlacement();}
function stopPlacement(){placing=false;placingBuilding=null;selectedCell=null;viewport.classList.remove('placing');viewport.removeAttribute('tabindex');dirty=true;notifyPlacement();}
function demolitionInfo(){const item=selectedTarget?FarmWorld.removableById[selectedTarget]:null;
 return {active:demolishing,id:item?.uid||null,name:item?.name||null,building:!!(item&&FarmWorld.structureById[item.id]),hp:item?(state?.durability[item.uid]??item.maxHP):0,maxHP:item?.maxHP||0};}
function notifyDemolition(){document.dispatchEvent(new CustomEvent('farm-demolition-change',{detail:demolitionInfo()}));}
function startDemolition(){if(!loaded)return;demolishing=true;selectedTarget=null;hovered=null;viewport.classList.add('demolishing');dirty=true;updateControls();notifyDemolition();}
function stopDemolition(){demolishing=false;selectedTarget=null;hovered=null;viewport.classList.remove('demolishing');dirty=true;updateControls();notifyDemolition();}
function selectDemolition(uid){const item=FarmWorld.removableById[uid];if(!demolishing||!item)return;
 if(FarmWorld.structureById[item.id]?!FarmWorld.structureActive(state,item.id):FarmWorld.removed(state,uid))return;
 if(selectedTarget===uid){document.dispatchEvent(new CustomEvent('farm-demolition-hit',{detail:{id:uid}}));return;}
 selectedTarget=uid;dirty=true;notifyDemolition();}
function pulse(uid){const item=FarmWorld.removableById[uid];if(!item)return;const p=FarmWorld.structureById[item.id]?FarmWorld.structurePosition(state,item.id):item;if(motion){dust.push({x:p.x,y:p.y,start:animationTime,seed:(dust.length+1)*.76});if(dust.length>12)dust.shift();}dirty=true;}
function drawPlacement(){const p=FarmWorld.center(selectedCell.c,selectedCell.r),info=placementInfo();ctx.save();
 if(info.building){const o=FarmWorld.structureById[info.building];ctx.globalAlpha=.48;sprite(info.building,p.x,p.y,o.w,o.h);ctx.globalAlpha=1;}
 else{ctx.globalAlpha=.45;sprite('soil',p.x,p.y+37.5,150,75);ctx.globalAlpha=1;}
 diamond(p.x,p.y,150,75,info.validLocation?'#65b94588':'#d94c4c88',info.validLocation?'#e5ffc6':'#ffccc3');
 label(info.validLocation?info.price+' 🪙':'×',p.x,p.y,{bg:info.validLocation?'#416d2eea':'#9b3931ed',size:info.validLocation?12:19});ctx.restore();}
viewport.addEventListener('keydown',event=>{if(!placing||FarmPlatform.paused)return;
 const shifts={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(shifts[event.key]){event.preventDefault();if(!selectedCell)selectedCell=FarmWorld.snap(800-panX/(fit*zoom),500-panY/(fit*zoom));else{selectedCell.c+=shifts[event.key][0];selectedCell.r+=shifts[event.key][1];}dirty=true;notifyPlacement();}
 if(event.key==='Enter'){event.preventDefault();document.getElementById('confirm-placement').click();}
});
controls.addEventListener('pointerover',e=>{const button=e.target.closest('.map-hit');if(button){hovered=button.id.replace('map-hit-','');dirty=true;}});
controls.addEventListener('pointerout',()=>{hovered=null;dirty=true;});
window.addEventListener('resize',resize);
const ready=FarmArt.ready.then(()=>{FarmWorld.prepare(FarmArt);loaded=true;dirty=true;draw();});
window.FarmMap={ready,get placing(){return placing;},get placement(){return placementInfo();},get demolishing(){return demolishing;},get demolition(){return demolitionInfo();},get motion(){return motion;},startPlacement,stopPlacement,startDemolition,stopDemolition,selectDemolition,pulse,setMotion(on){motion=!!on;dust.length=0;try{localStorage.setItem('teplaya-ferma-motion',motion?'on':'off');}catch{}dirty=true;},render(s){state=s;spots=s.plotCells.map(cell=>FarmWorld.center(cell.c,cell.r));if(selectedTarget){const item=FarmWorld.removableById[selectedTarget];if(item&&(FarmWorld.structureById[item.id]?!FarmWorld.structureActive(s,item.id):FarmWorld.removed(s,selectedTarget)))selectedTarget=null;}dirty=true;updateControls();if(placing)notifyPlacement();if(demolishing)notifyDemolition();},zoomBy,reset(){zoom=1;panX=panY=0;clamp();dirty=true;updateControls();}};
function loop(t){const paused=window.FarmPlatform?.paused;if(!paused&&(dirty||t-lastTime>=(motion?33:500))){if(motion)animationTime+=Math.min(40,previousFrame?t-previousFrame:33);draw();dirty=false;lastTime=t;}previousFrame=t;requestAnimationFrame(loop);}resize();requestAnimationFrame(loop);
})();
