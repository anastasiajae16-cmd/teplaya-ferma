(function(root){
'use strict';
const world=root.FarmWorld||(typeof require==='function'?require('./world.js'):null);
const crops={wheat:{name:'Пшеница',icon:'🌾',cost:2,time:15000,yield:2},carrot:{name:'Морковь',icon:'🥕',cost:4,time:25000,yield:2},corn:{name:'Кукуруза',icon:'🌽',cost:6,time:35000,yield:3},berry:{name:'Клубника',icon:'🍓',cost:8,time:45000,yield:3}};
const goods={...crops,egg:{name:'Яйца',icon:'🥚'},milk:{name:'Молоко',icon:'🥛'},flour:{name:'Мука',icon:'🌾'},bread:{name:'Хлеб',icon:'🍞'},jam:{name:'Варенье',icon:'🍯'},apple:{name:'Яблоки',icon:'🍎'},pear:{name:'Груши',icon:'🍐'}};
const animals={hen:{name:'Курочка Ряба',icon:'🐔',food:'wheat',product:'egg',time:20000},cow:{name:'Бурёнка',icon:'🐄',food:'carrot',product:'milk',time:30000}};
const buildings={barn:{name:'Амбар',icon:'🏚️',cost:80,time:12000,level:1,description:'Главное здание: без него хозяйство останавливается'},mill:{name:'Мельница',icon:'🪵',cost:60,time:10000,level:1,description:'Пшеница превращается в муку'},bakery:{name:'Деревенская пекарня',icon:'🏡',cost:100,time:18000,level:2,description:'Свежий хлеб и домашнее варенье'},coop:{name:'Курятник',icon:'🐔',cost:45,time:8000,level:1,description:'Уютный домик для птиц и украшение двора'}};
const crafts={flour:{building:'mill',need:{wheat:2},product:'flour',amount:1,time:20000},bread:{building:'bakery',need:{flour:1,egg:1},product:'bread',amount:1,time:30000},jam:{building:'bakery',need:{berry:3},product:'jam',amount:1,time:25000}};
const quests=[{name:'Первый урожай',text:'Собери урожай с двух грядок',key:'harvests',target:2,reward:15},{name:'Вкусное угощение',text:'Покорми любое животное',key:'feeds',target:1,reward:20},{name:'Добрые соседи',text:'Доставь два заказа',key:'orders',target:2,reward:30},{name:'Своя мельница',text:'Изготовь первую муку',key:'flour',target:1,reward:35},{name:'Ароматный хлеб',text:'Испеки первый хлеб',key:'bread',target:1,reward:50}];
const recipes=[{who:'Бабушка Нина',face:'👵',need:{wheat:4},reward:24,xp:12},{who:'Пекарь Миша',face:'👨‍🍳',need:{egg:2,wheat:2},reward:42,xp:20},{who:'Соседка Аня',face:'👩‍🌾',need:{carrot:4},reward:36,xp:16},{who:'Кафе у пруда',face:'☕',need:{milk:2,berry:3},reward:74,xp:30},{who:'Дедушка Фёдор',face:'👴',need:{corn:3},reward:32,xp:15},{who:'Лавка на площади',face:'🏡',need:{berry:6},reward:58,xp:24},{who:'Пекарь Миша',face:'👨‍🍳',need:{flour:2},reward:42,xp:20,building:'mill'},{who:'Деревенский завтрак',face:'🥐',need:{bread:2,milk:2},reward:105,xp:35,building:'bakery'},{who:'Чай у бабушки',face:'🫖',need:{jam:2},reward:64,xp:25,building:'bakery'},{who:'Фруктовая лавка',face:'🧺',need:{apple:4,pear:2},reward:38,xp:12}];
function fresh(){return {version:6,plotCells:world.initialCells(6),plotPurchases:0,plotBaseCount:6,orchard:Array(6).fill(0),coins:80,xp:0,completed:0,quest:0,stats:{harvests:0,feeds:0,orders:0,flour:0,bread:0},barn:true,buildings:{mill:true,bakery:true,coop:true},buildingSites:{barn:null,mill:null,bakery:null,coop:null},construction:{barn:null,mill:null,bakery:null,coop:null},demolition:{barn:null,mill:null,bakery:null,coop:null},jobs:{mill:null,bakery:null},inventory:Object.fromEntries(Object.keys(goods).map(k=>[k,0])),plots:Array.from({length:6},()=>null),animals:{hen:null,cow:null},orders:[0,1,2],removedObjects:[],durability:{}};}
function migrate(raw){
 if(!raw||typeof raw!=='object')return null;
 const s=JSON.parse(JSON.stringify(raw));
 if(s.version===1){const base=fresh();s.version=2;s.inventory={...base.inventory,...s.inventory};s.buildings=base.buildings;s.jobs=base.jobs;s.quest=0;s.stats={...base.stats,orders:s.completed};}
 if(s.version===2){s.version=3;s.orchard=Array(6).fill(0);s.inventory={apple:0,pear:0,...s.inventory};}
 if(s.version===3){s.version=4;s.plotCells=world.initialCells(s.plots?.length||0);s.plotPurchases=0;s.plotBaseCount=s.plots.length;}
 if(s.version===4){s.version=5;s.removedObjects=[];s.durability={};}
 if(s.version===5){s.version=6;s.barn=!s.removedObjects.includes(world.structureById.barn.uid);s.buildings.coop=!s.removedObjects.includes(world.structureById.coop.uid);s.buildingSites={barn:null,mill:null,bakery:null,coop:null};s.construction={barn:null,mill:null,bakery:null,coop:null};s.demolition={barn:null,mill:null,bakery:null,coop:null};}
 return valid(s)?s:null;
}
function valid(s){
 if(!s||s.version!==6||!Array.isArray(s.orchard)||s.orchard.length!==6||!s.orchard.every(Number.isFinite)||!Number.isFinite(s.coins)||s.coins<0||!Number.isFinite(s.xp)||s.xp<0||!Number.isInteger(s.completed)||s.completed<0)return false;
 if(!Array.isArray(s.plots)||s.plots.length<6||s.plots.length>world.cells.length||!Array.isArray(s.plotCells)||s.plotCells.length!==s.plots.length||!s.plotCells.every(cell=>cell&&world.inBounds(cell.c,cell.r))||new Set(s.plotCells.map(cell=>cell.c+','+cell.r)).size!==s.plotCells.length)return false;
 if(!Number.isInteger(s.plotPurchases)||s.plotPurchases<0||![6,9].includes(s.plotBaseCount)||s.plotPurchases!==s.plots.length-s.plotBaseCount||!s.plots.every(p=>p===null||!!crops[p.crop]&&Number.isFinite(p.ready)))return false;
 if(!s.inventory||!Object.keys(goods).every(k=>Number.isInteger(s.inventory[k])&&s.inventory[k]>=0)||!s.animals||!Object.keys(animals).every(k=>s.animals[k]===null||Number.isFinite(s.animals[k])))return false;
 if(!Array.isArray(s.orders)||s.orders.length!==3||new Set(s.orders).size!==3||!s.orders.every(n=>Number.isInteger(n)&&n>=0&&n<recipes.length)||!Number.isInteger(s.quest)||s.quest<0||s.quest>quests.length||!s.stats||!['harvests','feeds','orders','flour','bread'].every(k=>Number.isInteger(s.stats[k])&&s.stats[k]>=0))return false;
 if(!Array.isArray(s.removedObjects)||new Set(s.removedObjects).size!==s.removedObjects.length||!s.removedObjects.every(id=>!!world.removableById[id])||!s.durability||typeof s.durability!=='object'||Array.isArray(s.durability)||!Object.entries(s.durability).every(([id,hp])=>world.removableById[id]&&!s.removedObjects.includes(id)&&Number.isInteger(hp)&&hp>0&&hp<world.removableById[id].maxHP))return false;
 if(typeof s.barn!=='boolean'||!s.buildings||typeof s.buildings.coop!=='boolean'||!s.jobs||!['mill','bakery'].every(k=>typeof s.buildings[k]==='boolean'&&(s.jobs[k]===null||s.buildings[k]&&crafts[s.jobs[k].craft]?.building===k&&Number.isFinite(s.jobs[k].ready))))return false;
 if(!s.buildingSites||!s.construction||!s.demolition)return false;
 for(const id of world.structureIds){
  const site=s.buildingSites[id],construction=s.construction[id],demolition=s.demolition[id];
  if(site!==null&&(!site||!world.inBounds(site.c,site.r)))return false;
  if(construction!==null&&(!site||!Number.isFinite(construction.started)||!Number.isFinite(construction.ready)||construction.ready<=construction.started))return false;
  if(demolition!==null&&(!Number.isFinite(demolition.started)||!Number.isFinite(demolition.ready)||demolition.ready<=demolition.started))return false;
  if(construction&&demolition)return false;
  if(id==='barn'?(s.barn&&!!construction):s.buildings[id]&&!!construction)return false;
  if(demolition&&!(id==='barn'?s.barn:s.buildings[id]))return false;
 }
 return true;
}
function eligible(s,r){return !r.building||s.buildings[r.building];}
function advance(s,now=Date.now()){
 let changed=false;
 for(const id of world.structureIds){
  if(s.construction[id]&&s.construction[id].ready<=now){
   s.construction[id]=null;if(id==='barn')s.barn=true;else s.buildings[id]=true;
   changed=true;
  }
  if(s.demolition[id]&&s.demolition[id].ready<=now){
   s.demolition[id]=null;if(id==='barn'){s.barn=false;s.coins+=buildings.barn.cost;}else{s.buildings[id]=false;if(id!=='coop')s.jobs[id]=null;}
   const uid=world.structureById[id].uid;if(!s.removedObjects.includes(uid))s.removedObjects.push(uid);
   delete s.durability[uid];changed=true;
  }
 }
 return changed;
}
function act(s,a,now=Date.now()){
advance(s,now);
if(s.barn===false&&!['buildAt','build','demolish','restore','repair'].includes(a.type))return 'Сначала восстанови амбар — хозяйство остановлено';
if(a.type==='plot') {if(!Number.isInteger(a.i)||a.i<0||a.i>=s.plots.length)return 'Нет такой грядки';const p=s.plots[a.i];if(p){if(now<p.ready)return 'Урожай ещё растёт';const c=crops[p.crop];s.inventory[p.crop]+=c.yield;s.stats.harvests++;s.xp+=2;s.plots[a.i]=null;return `Собрано: ${c.icon} +${c.yield}`;}const c=crops[a.crop];if(!c)return 'Выбери семена';if(s.coins<c.cost)return 'Не хватает монет — выполни заказ';s.coins-=c.cost;s.plots[a.i]={crop:a.crop,ready:now+c.time};return `${c.icon} Посадили! Скоро появится урожай`;
}if(a.type==='animal'){const d=animals[a.id];if(!d)return 'Нет такого животного';const ready=s.animals[a.id];if(ready!==null){if(now<ready)return 'Наш друг ещё занят';s.inventory[d.product]+=2;s.xp+=4;s.animals[a.id]=null;return `${goods[d.product].icon} Получено: +2`;}if(s.inventory[d.food]<2)return `Нужно ${goods[d.food].icon} ×2`;s.inventory[d.food]-=2;s.stats.feeds++;s.animals[a.id]=now+d.time;return 'Спасибо за угощение!';}
if(a.type==='order'){if(!Number.isInteger(a.i)||a.i<0||a.i>2)return 'Нет такого заказа';const d=recipes[s.orders[a.i]];if(!Object.entries(d.need).every(([k,v])=>s.inventory[k]>=v))return 'Сначала собери нужные продукты';Object.entries(d.need).forEach(([k,v])=>s.inventory[k]-=v);s.coins+=d.reward;s.xp+=d.xp;s.completed++;s.stats.orders++;const available=recipes.map((_,i)=>i).filter(i=>!s.orders.includes(i)&&eligible(s,recipes[i]));s.orders[a.i]=available[(s.completed-1)%available.length];return `Заказ доставлен! +${d.reward} 🪙 · +${d.xp} ⭐`;}
if(a.type==='tree'){if(!Number.isInteger(a.i)||a.i<0||a.i>=s.orchard.length)return 'Нет такого дерева';if(s.removedObjects.includes('object-'+a.i))return 'Это дерево убрано. Его можно вернуть в разделе разборки';if(s.orchard[a.i]>now)return 'Фрукты ещё созревают';const fruit=a.i%2?'pear':'apple';s.inventory[fruit]+=2;s.orchard[a.i]=now+60000;s.xp+=3;return goods[fruit].icon+' Собрано: +2';}
if(a.type==='build')return 'Выбери место для постройки на карте';
if(a.type==='buildAt'){
 const b=buildings[a.id];if(!b)return 'Нет такого здания';
 if(world.structureActive(s,a.id))return 'Уже построено или строится';
 if(s.demolition[a.id])return 'Дождись завершения разборки';
 if(1+Math.floor(s.xp/50)<b.level)return 'Нужен уровень '+b.level;
 const allowed=world.canPlaceBuilding(s,a.id,a.c,a.r);if(!allowed.ok)return allowed.reason;
 if(s.coins<b.cost)return 'Не хватает монет: нужно '+b.cost;
 s.coins-=b.cost;s.buildingSites[a.id]={c:a.c,r:a.r};s.construction[a.id]={started:now,ready:now+b.time};
 const uid=world.structureById[a.id].uid;if(!s.removedObjects.includes(uid))s.removedObjects.push(uid);
 delete s.durability[uid];return 'Началось строительство: '+b.name+' · '+b.time/1000+' с';
}
if(a.type==='demolish'){
 const item=world.removableById[a.id];if(!item)return 'Этот объект нельзя разобрать';
 if(world.structureById[item.id]){
  if(!world.structureActive(s,item.id))return 'Постройки здесь уже нет';
  if(s.construction[item.id])return 'Сначала дождись окончания строительства';
  if(s.demolition[item.id])return 'Разборка уже идёт';
  if(item.building&&s.jobs[item.building])return 'Сначала забери продукцию из мастерской';
  const time=item.id==='barn'?10000:item.id==='mill'?8000:12000;
  s.demolition[item.id]={started:now,ready:now+time};
  return 'Началась разборка: '+item.name+' · '+time/1000+' с';
 }
 if(s.removedObjects.includes(a.id))return 'Здесь уже свободно';
 if(item.building&&s.jobs[item.building])return 'Сначала забери продукцию из мастерской';
 const hp=s.durability[a.id]??item.maxHP;
 if(hp>1){s.durability[a.id]=hp-1;return item.name+': прочность '+(hp-1)+'/'+item.maxHP;}
 delete s.durability[a.id];s.removedObjects.push(a.id);
 if(item.building){s.buildings[item.building]=false;s.jobs[item.building]=null;}
 return item.name+' убран(а). Место свободно!';
}
if(a.type==='restore'){
 const item=world.removableById[a.id];if(!item||!s.removedObjects.includes(a.id))return 'Объект уже на месте';
 if(world.structureById[item.id])return 'Открой Постройки и выбери место для '+item.name;
 const allowed=world.canRestore(s,a.id);if(!allowed.ok)return allowed.reason;
 if(s.coins<item.restoreCost)return 'Для восстановления нужно '+item.restoreCost+' монет';
 s.coins-=item.restoreCost;s.removedObjects=s.removedObjects.filter(id=>id!==a.id);delete s.durability[a.id];return item.name+' восстановлен(а)!';
}
if(a.type==='repair'){
 const item=world.removableById[a.id],hp=s.durability[a.id];if(!item||!hp)return 'Ремонт не требуется';
 const cost=(item.maxHP-hp)*2;if(s.coins<cost)return 'Для ремонта нужно '+cost+' монет';
 s.coins-=cost;delete s.durability[a.id];return item.name+' отремонтирован(а)!';
}
if(a.type==='craft'){const c=crafts[a.id];if(!c||!s.buildings[c.building])return 'Сначала построй здание';if(s.jobs[c.building])return 'Сначала забери готовую продукцию';if(!Object.entries(c.need).every(([k,v])=>s.inventory[k]>=v))return 'Не хватает ингредиентов';Object.entries(c.need).forEach(([k,v])=>s.inventory[k]-=v);s.jobs[c.building]={craft:a.id,ready:now+c.time};return 'Начали производство: '+goods[c.product].name;}
if(a.type==='collect'){const j=s.jobs[a.id];if(!j)return 'Здесь пока ничего нет';if(j.ready>now)return 'Продукт ещё готовится';const c=crafts[j.craft];s.inventory[c.product]+=c.amount;s.jobs[a.id]=null;s.xp+=6;if(c.product in s.stats)s.stats[c.product]+=c.amount;return goods[c.product].icon+' Готово: '+goods[c.product].name;}
if(a.type==='quest'){const q=quests[s.quest];if(!q)return 'Все задания выполнены';if(s.stats[q.key]<q.target)return 'Задание ещё не выполнено';s.coins+=q.reward;s.xp+=10;s.quest++;return 'Задание выполнено! +'+q.reward+' 🪙';}
if(a.type==='sell'){if(!goods[a.item]||s.inventory[a.item]<1)return 'В амбаре пока пусто';const prices={wheat:2,carrot:3,corn:3,berry:4,egg:5,milk:6,flour:6,bread:16,jam:15,apple:3,pear:3};s.inventory[a.item]--;s.coins+=prices[a.item];return 'Продано: +'+prices[a.item]+' 🪙';}
if(a.type==='placePlot'){
 const location=world.canPlace(s,a.c,a.r);if(!location.ok)return location.reason;
 const price=world.plotPrice(s);if(!Number.isSafeInteger(price)||s.coins<price)return 'Не хватает монет: нужно '+price;
 s.coins-=price;s.plots.push(null);s.plotCells.push({c:a.c,r:a.r});s.plotPurchases++;
 return 'Грядка установлена! −'+price+' 🪙';
}
if(a.type==='expand')return 'Выбери место для новой грядки на карте';return 'Неизвестное действие';}
root.Farm={crops,goods,animals,recipes,buildings,crafts,quests,fresh,valid,migrate,act,advance,plotPrice:world.plotPrice};if(typeof module!=='undefined')module.exports=root.Farm;
})(typeof window!=='undefined'?window:globalThis);
