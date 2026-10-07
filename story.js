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
  syncAudioForScreen(screen);
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
      note(523.25,.45);note(659.25,.45,.14);note(783.99,.6,.28);
    }
  });
}
$('#next').addEventListener('click',()=>show(current+1));
$('#replay').addEventListener('click',()=>{completed.clear();show(1);});
$$('[data-level]').forEach(button=>button.addEventListener('click',()=>show(Number(button.dataset.level))));
// Original quiet chiptune. The final button also unlocks a short victory tune.
// An explicit mute is separate from the initially silent background music.
let audio=null,gain=null,music=false,soundPreference=null,audioMode='off';
let timer=null,victoryTimer=null,phrase=0,audioEpoch=0;
const activeNotes=new Set();
function soundUI(){
  $('#sound').setAttribute('aria-pressed',String(music));
  $('#sound').setAttribute('aria-label',music?'Выключить музыку':'Включить музыку');
}
function clearAudio(){
  audioEpoch++;
  if(timer!==null)clearInterval(timer);
  if(victoryTimer!==null)clearTimeout(victoryTimer);
  timer=null;victoryTimer=null;
  activeNotes.forEach(({oscillator,envelope})=>{
    oscillator.onended=null;
    try{envelope.gain.cancelScheduledValues(0);oscillator.stop(audio.currentTime);}catch(_){}
    oscillator.disconnect();envelope.disconnect();
  });
  activeNotes.clear();
}
function silence(){clearAudio();audioMode='off';music=false;soundUI();}
function note(frequency,duration=.4,delay=0,volume=.018,type='triangle'){
  if(!music||!audio||audio.state!=='running'||document.hidden)return;
  const time=audio.currentTime+delay;
  const oscillator=audio.createOscillator(),envelope=audio.createGain();
  const entry={oscillator,envelope};activeNotes.add(entry);
  oscillator.type=type;oscillator.frequency.value=frequency;
  envelope.gain.setValueAtTime(0,time);
  envelope.gain.linearRampToValueAtTime(volume,time+.018);
  envelope.gain.exponentialRampToValueAtTime(.0001,time+duration+.08);
  oscillator.connect(envelope);envelope.connect(gain);
  oscillator.onended=()=>{activeNotes.delete(entry);oscillator.disconnect();envelope.disconnect();};
  oscillator.start(time);oscillator.stop(time+duration+.12);
}
function playPhrase(){
  if(audioMode!=='ambient'||!music||document.hidden)return;
  const melodies=[[523.25,659.25,783.99,659.25],[440,523.25,659.25,523.25],[349.23,440,523.25,659.25],[392,493.88,587.33,783.99]];
  const melody=melodies[phrase++%4];
  melody.forEach((frequency,i)=>note(frequency,.38,i*.46,.013));
  note(melody[0]/2,1.8,0,.018);
}
function victoryPhrase(){
  const frequency=midi=>440*Math.pow(2,(midi-69)/12);
  const melody=[
    [0,72,.16],[.20,76,.16],[.40,79,.18],[.62,84,.38],
    [1.08,83,.18],[1.30,79,.18],[1.52,81,.32],[1.96,88,.34],
    [2.40,86,.18],[2.62,84,.18],[2.84,79,.28],
    [3.26,81,.18],[3.48,83,.18],[3.70,84,.36],
    [4.20,88,.18],[4.42,91,.24],[4.80,84,.95]
  ];
  melody.forEach(([at,midi,length])=>note(frequency(midi),length,at,.012,'square'));
  [[0,48],[1.08,55],[1.96,53],[2.84,55],[3.70,48],[4.80,48]].forEach(([at,midi])=>note(frequency(midi),.65,at,.018));
  [60,64,67].forEach((midi,i)=>note(frequency(midi),.83,4.80+i*.035,.008));
}
async function startAudio(mode,announceFailure=false){
  clearAudio();audioMode=mode;music=true;soundUI();
  if(document.hidden)return;
  const epoch=audioEpoch;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw new Error('Audio unavailable');
    if(!audio){audio=new Audio();gain=audio.createGain();gain.gain.value=.65;gain.connect(audio.destination);}
    // resume() is invoked inside the click call stack, before the first await.
    await audio.resume();
    if(epoch!==audioEpoch||!music||document.hidden)return;
    gain.gain.setTargetAtTime(.65,audio.currentTime,.05);
    if(mode==='victory'){
      victoryPhrase();
      victoryTimer=setTimeout(()=>{
        victoryTimer=null;
        if(epoch!==audioEpoch||current!==4||!music)return;
        if(soundPreference==='on')startAudio('ambient');else silence();
      },6100);
    }else{
      playPhrase();timer=setInterval(playPhrase,2600);
    }
  }catch(_){
    if(epoch!==audioEpoch)return;
    silence();
    if(announceFailure)announcement('Музыка не включилась. На игры это не влияет.');
  }
}
function syncAudioForScreen(screen){
  if(screen===4&&soundPreference!=='off')startAudio('victory');
  else if(soundPreference==='on')startAudio('ambient');
  else silence();
}
$('#sound').addEventListener('click',()=>{
  if(music){soundPreference='off';silence();}
  else{soundPreference='on';startAudio(current===4?'victory':'ambient',true);}
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    clearAudio();
    if(audio)audio.suspend().catch(()=>{});
  }else if(music){
    startAudio(audioMode==='victory'&&current===4?'victory':'ambient');
  }
});
show(0);
})();
