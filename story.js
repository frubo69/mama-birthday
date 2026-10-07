(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const levels=[
{type:'catch',world:'home',title:'Мам, лови!',description:'Поймай меня пять раз. С каждым разом я буду чуть быстрее.',win:'Поймала. Я не сомневался.',after:'Ладно, теперь можно поставить меня на землю.'},
{type:'panic',world:'garden',title:'Без паники.',description:'20 секунд. Разрезай тревоги взмахом пальца.',win:'Всё, выдохнул.',after:'Вот так ты обычно и разбираешься с моими тревогами.'},
{type:'travel',world:'garden',title:'Время отдыхать.',description:'Ты заслужила отдых. Собираем чемодан — и в путешествие.',win:'Всё поместилось.',after:'Чемодан собран. Можно официально отдыхать.'}
];
let current=0;const completed=new Set();
const announcement=text=>{$('#announcement').textContent=text;};
function background(name){$$('[data-world]').forEach(el=>el.classList.toggle('visible',el.dataset.world===name));}
function show(screen){
  if(screen<0||screen>4)return;
  window.MamaGames?.stop();
  current=screen;
  window.MamaAudio?.setScreen(screen);
  $('#cover').hidden=screen!==0;
  $('#game-page').hidden=!(screen>=1&&screen<=3);
  $('#final-page').hidden=screen!==4;
  $('#story').dataset.screen=screen===0?'cover':screen===4?'final':'game';
  $('#story').dataset.done='false';
  $('#next').disabled=false;
  $('#win-note').hidden=true;
  $$('.page').forEach(page=>page.scrollTop=0);
  $$('[data-level]').forEach(button=>{
    const n=Number(button.dataset.level);
    if(screen===n)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    button.classList.toggle('finished',completed.has(n));
    button.querySelector('span').textContent=completed.has(n)?'✓':String(n);
  });
  if(screen===0){background('home');$('#next-label').textContent='Ну, погоди, сын';return;}
  if(screen===4){background('garden');$('#final-title').focus({preventScroll:true});return;}
  const level=levels[screen-1];
  $('#game-page').dataset.game=level.type;
  background(level.world);
  $('#level-label').textContent=`0${screen} / 03`;
  $('#game-title').textContent=level.title;
  $('#game-description').textContent=level.description;
  $('#game-status').textContent='Готовность: мама.';
  $('#next').disabled=true;
  $('#game-title').focus({preventScroll:true});
  if(!window.MamaGames){$('#game-status').textContent='Игра не загрузилась. Обнови страницу.';return;}
  window.MamaGames.start(level.type,{
    host:$('#game-host'),
    onStatus:text=>{$('#game-status').textContent=text;},
    onComplete:({stats}={})=>{
      if(current!==screen)return;
      completed.add(screen);
      $('#next').disabled=false;
      $('#next-label').textContent=screen===3?'К поздравлению':'Дальше';
      $('#win-title').textContent=level.win;
      $('#win-description').textContent=level.type==='panic'&&stats?`Счёт: ${stats.score}. ${level.after}`:level.after;
      $('#win-note').hidden=false;
      $('#story').dataset.done='true';
      const button=$(`[data-level="${screen}"]`);
      button.classList.add('finished');button.querySelector('span').textContent='✓';
      announcement(level.win);
      window.MamaAudio?.sfx('complete');
    }
  });
}
$('#next').addEventListener('click',()=>{window.MamaAudio?.unlock();show(current+1);});
$('#replay').addEventListener('click',()=>{window.MamaAudio?.unlock();completed.clear();show(1);});
$$('[data-level]').forEach(button=>button.addEventListener('click',()=>{window.MamaAudio?.unlock();show(Number(button.dataset.level));}));
// The shared engine controls effects, optional ambient music, and the finale.
const audioEngine=window.MamaAudio;
function soundUI(state){
  const enabled=Boolean(state&&state.enabled);
  $('#sound').setAttribute('aria-pressed',String(enabled));
  $('#sound').setAttribute('aria-label',enabled?'Выключить звук':'Включить звук');
}
if(audioEngine)audioEngine.subscribe(soundUI);else soundUI(null);
$('#sound').addEventListener('click',()=>{
  if(!audioEngine){announcement('Звук недоступен. На игры это не влияет.');return;}
  const enabled=audioEngine.setEnabled(!audioEngine.enabled);
  if(enabled)audioEngine.unlock().then(ok=>{if(!ok&&audioEngine.enabled)announcement('Звук не включился. На игры это не влияет.');});
});
show(0);
})();
