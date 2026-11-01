'use strict';
(function(){
let ready=false,initializing=null;
const reasons=new Set(['loading']);
const isVK=window.FARM_PLATFORM==='vk'||new URLSearchParams(window.location.search).has('vk_app_id');
function sync(){const playing=ready&&reasons.size===0;document.documentElement.classList.toggle('game-paused',!playing);document.querySelector('main').inert=!playing;}
function timeout(promise,ms){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('VK Bridge timeout')),ms);})]).finally(()=>clearTimeout(timer));}
const api=window.FarmPlatform={
 get paused(){return !ready||reasons.size>0;},
 pause(reason){reasons.add(reason);sync();},resume(reason){reasons.delete(reason);sync();},
 init(){if(initializing)return initializing;initializing=(async()=>{
  const status=document.getElementById('platform-status');
  if(isVK){
   try{
    if(!window.vkBridge)throw Error('VK Bridge отсутствует');
    window.vkBridge.subscribe(event=>{const type=event.detail?.type;if(type==='VKWebAppViewHide')api.pause('platform');if(type==='VKWebAppViewRestore')api.resume('platform');});
    await timeout(window.vkBridge.send('VKWebAppInit'),12000);
    status.textContent='ВКонтакте · ферма подключена';
   }catch(error){status.textContent='Не удалось подключиться к ВКонтакте';document.getElementById('boot').innerHTML='<div><h2>Открой игру во ВКонтакте</h2><p>Если игра уже открыта в ВК, проверь интернет и повтори запуск.</p><button onclick="location.reload()">Повторить</button></div>';console.error(error);return;}
  }else status.textContent='Версия для ВК · браузерный тест';
  document.getElementById('boot').hidden=true;ready=true;reasons.delete('loading');if(document.hidden)reasons.add('hidden');sync();
 })();return initializing;}
};
document.addEventListener('visibilitychange',()=>document.hidden?api.pause('hidden'):api.resume('hidden'));
document.addEventListener('contextmenu',e=>e.preventDefault());
})();
