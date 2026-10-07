/* Three small, local-only birthday games. No global keyboard handlers. */
(() => {
  'use strict';

  let active = null;
  const css = `
    .mama-mini-game{width:100%;max-width:350px;margin:0 auto;color:inherit;font:inherit}
    .mama-mini-game *{box-sizing:border-box}
    .mama-mini-game [hidden]{display:none!important}
    .mama-mini-game button{font:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .mama-mini-game button:focus-visible,.mama-mini-game canvas:focus-visible{outline:3px solid #ffe5a0;outline-offset:3px}
    .mama-mini-game .game-instruction{font-size:14px;line-height:1.5;margin:0 0 10px;text-align:center}
    .mama-mini-game .game-status{min-height:24px;margin:9px 0;font-size:14px;line-height:1.5;text-align:center;font-variant-numeric:tabular-nums}
    .mama-mini-game .game-start{display:block;width:100%;min-height:46px;padding:10px 16px;margin:10px 0;border:1px solid #f3d199;border-radius:10px;background:#f3d199;color:#182132;font-weight:700}
    .mama-mini-game .game-canvas{display:block;width:100%;height:auto;max-width:330px;aspect-ratio:1;margin:0 auto;border:1px solid #ffffff30;border-radius:13px;touch-action:none;background:#111c30}
    .mama-mini-game .game-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}
    .mama-mini-game .game-lane{min-width:0;min-height:46px;border:1px solid #ffffff40;border-radius:9px;background:#18263f;color:#fff3d8;font-size:13px}
    .mama-mini-game .game-lane[aria-pressed="true"]{background:#f3d199;color:#182132;border-color:#f3d199}
    .mama-mini-game button:disabled{opacity:.48;cursor:default}
    .mama-mini-game .game-panic-grid,.mama-mini-game .game-route-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-width:300px;margin:0 auto}
    .mama-mini-game .game-bubble{position:relative;isolation:isolate;overflow:hidden;min-width:0;min-height:76px;aspect-ratio:1;border:1px solid #ffffff26;border-radius:14px;background:#152238;color:#a9b4c4;display:grid;place-items:center;padding:7px;font-size:14px;line-height:1.25}
    .mama-mini-game .game-bubble.game-bubble-active{background:#f0d7a9;color:#202638;border-color:#ffeac5;font-weight:650;cursor:pointer}
    .mama-mini-game .game-bubble-label{position:relative;z-index:1;overflow-wrap:anywhere}
    .mama-mini-game .game-bubble-clock{position:absolute;left:0;right:0;bottom:0;height:5px;transform:scaleX(var(--remaining,1));transform-origin:left;background:#a85056;opacity:0}
    .mama-mini-game .game-bubble-active .game-bubble-clock{opacity:1}
    .mama-mini-game .game-route-labels{display:flex;justify-content:space-between;gap:12px;max-width:300px;margin:5px auto 10px;font-size:14px;font-weight:600}
    .mama-mini-game .game-route-grid{position:relative;padding:6px;border:1px solid #ffffff24;border-radius:12px;background:#101d30}
    .mama-mini-game .game-route-tile,.mama-mini-game .game-route-empty{position:relative;min-width:0;min-height:72px;aspect-ratio:1;border:1px solid #ffffff35;border-radius:8px;background:#233249;display:grid;place-items:center;padding:0;color:#ffe0a1}
    .mama-mini-game .game-route-empty{border-color:#ffffff0a;background:#ffffff04;color:#546071;font-size:18px}
    .mama-mini-game .game-route-tile svg{display:block;width:100%;height:100%;overflow:visible}
    .mama-mini-game .game-route-tile.game-route-connected{border-color:#e8bf7c;background:#334139}
    .mama-mini-game .game-route-entry:before,.mama-mini-game .game-route-exit:after{position:absolute;top:50%;width:20px;height:6px;transform:translateY(-50%);background:#ffe0a1;content:"";z-index:1;pointer-events:none}
    .mama-mini-game .game-route-entry:before{left:-12px}
    .mama-mini-game .game-route-exit:after{right:-12px}
    .mama-mini-game .game-finished{color:#ffe0a1;font-weight:650}
    @media(prefers-reduced-motion:reduce){.mama-mini-game *{animation:none!important;transition:none!important}}
  `;

  function installStyles() {
    if (document.getElementById('mama-games-styles')) return;
    const style = document.createElement('style');
    style.id = 'mama-games-styles';
    style.textContent = css;
    document.head.append(style);
  }

  function el(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    if (tag === 'button') item.type = 'button';
    return item;
  }

  function createSession(type, options) {
    const { host, onComplete, onStatus } = options;
    const root = el('div', `mama-mini-game game-${type}`);
    const instruction = el('p', 'game-instruction');
    const status = el('p', 'game-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const board = el('div', 'game-board');
    root.append(instruction, board, status);
    host.replaceChildren(root);

    let dead = false;
    let finished = false;
    let frame = null;
    let update = null;
    let previousTime = null;
    const cleanup = [];

    function tick(time) {
      frame = null;
      if (dead || finished || document.hidden || !update) return;
      const dt = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, .05);
      previousTime = time;
      update(dt);
      schedule();
    }
    function schedule() {
      if (!dead && !finished && update && frame === null && !document.hidden) frame = requestAnimationFrame(tick);
    }
    function stopAnimation() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
      update = null;
    }
    function on(target, event, handler, options) {
      target.addEventListener(event, handler, options);
      cleanup.push(() => target.removeEventListener(event, handler, options));
    }
    on(document, 'visibilitychange', () => {
      previousTime = null;
      if (document.hidden && frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      } else schedule();
    });

    return {
      root, board, instruction, status, on,
      onCleanup(callback) { if (typeof callback === 'function') cleanup.push(callback); },
      get live() { return !dead && !finished; },
      setStatus(message) {
        if (dead) return;
        status.textContent = message;
        if (typeof onStatus === 'function') onStatus(message);
      },
      animate(callback) {
        stopAnimation();
        update = callback;
        schedule();
      },
      complete(message, stats) {
        if (dead || finished) return;
        finished = true;
        stopAnimation();
        status.classList.add('game-finished');
        this.setStatus(message);
        if (typeof onComplete === 'function') onComplete({ message, stats });
      },
      destroy() {
        if (dead) return;
        dead = true;
        stopAnimation();
        cleanup.splice(0).forEach(fn => fn());
      }
    };
  }

  function catchGame(session) {
    session.instruction.textContent = 'Води пальцем по полю — мама движется вместе с ним. Поймай сына 5 раз.';
    const canvas = el('canvas', 'game-canvas');
    let H = 500;
    canvas.width = 660; canvas.height = H * 2; canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Поймай сына: веди пальцем по полю. На клавиатуре держи стрелки влево или вправо.');
    const ctx = canvas.getContext('2d');
    if (!ctx) { session.setStatus('Поле недоступно. Попробуй открыть игру в другом браузере.'); return; }
    const start = el('button', 'game-start', 'Лови меня');
    const intro = el('div', 'catch-intro');
    intro.append(el('p', 'catch-intro-title', 'Мам, я прыгаю!'), el('p', 'catch-intro-note', 'Води пальцем по полю и поймай меня 5 раз.'), start);
    session.board.append(canvas, intro);
    let running = false, caught = 0, misses = 0, elapsed = 0;
    let momX = 165, boy = null, wait = 0, toast = '', pointer = null;
    const held = { left: false, right: false }, pictures = {};
    function chooseX(x) { if (!running || !session.live) return; momX = Math.max(29, Math.min(301, x)); draw(); }
    function spawn() {
      boy = { x: 36 + Math.random() * 258, y: 28, vx: (Math.random() < .5 ? -1 : 1) * (12 + caught * 4) };
      toast = ''; session.setStatus(`${caught} / 5 · лови меня`);
    }
    function fallback(x,y,size,mom) {
      const u=size/12;
      const block=(a,b,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x+a*u),Math.round(y+b*u),Math.ceil(w*u),Math.ceil(h*u));};
      block(3,0,6,4,'#493732');block(4,2,4,4,'#efbe99');block(4,3,1,1,'#283449');block(7,3,1,1,'#283449');
      block(3,6,6,4,mom?'#e7bda6':'#87b7da');block(0,5,3,2,'#efbe99');block(9,5,3,2,'#efbe99');block(3,10,2,2,'#dce4ed');block(7,10,2,2,'#dce4ed');
    }
    function sprite(name,x,y,size) {
      const p=pictures[name];
      if(p && p.complete && p.naturalWidth) { const scale=Math.min(size/p.naturalWidth,size/p.naturalHeight);ctx.drawImage(p,x-p.naturalWidth*scale/2,y,p.naturalWidth*scale,p.naturalHeight*scale); }
      else fallback(x-size/2,y,size,name==='mom');
    }
    function draw() {
      ctx.clearRect(0,0,330,H);
      const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#172740');bg.addColorStop(1,'#111d31');ctx.fillStyle=bg;ctx.fillRect(0,0,330,H);
      for(let i=0;i<15;i++){ctx.fillStyle=i%3===0?'#f2d29555':'#bdcce533';ctx.fillRect(12+(i*67)%305,12+(i*61)%(H-130),2,2);}
      ctx.fillStyle='#ffffff16';ctx.fillRect(12,H-14,306,2);
      ctx.fillStyle='#ffe5b914';ctx.fillRect(momX-27,H-17,54,3);
      sprite('mom',momX,H-89,78);
      if(boy){ctx.fillStyle='#f5e9cd22';ctx.fillRect(boy.x-1,boy.y-37,2,9);sprite('son',boy.x,boy.y-25,47);}
      ctx.textAlign='center';ctx.fillStyle='#ffebc7';
      if(running&&toast){ctx.font='bold 20px -apple-system,sans-serif';ctx.fillText(toast,165,H*.42);}
    }
    ['mom','son'].forEach(name=>{const p=new Image();pictures[name]=p;session.on(p,'load',()=>{if(session.live)draw();});session.on(p,'error',()=>{if(session.live)draw();});p.src=`assets/${name}.webp`;});
    function follow(event) { const b=canvas.getBoundingClientRect();if(b.width)chooseX((event.clientX-b.left)*330/b.width); }
    session.on(canvas,'pointerdown',event=>{
      if(!running||!session.live||!event.isPrimary)return;
      event.preventDefault();pointer=event.pointerId;canvas.focus({preventScroll:true});canvas.setPointerCapture?.(pointer);follow(event);
    });
    session.on(canvas,'pointermove',event=>{if(event.pointerId===pointer||(event.pointerType==='mouse'&&running))follow(event);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(name=>session.on(canvas,name,event=>{if(event.pointerId===pointer)pointer=null;}));
    session.on(canvas,'keydown',event=>{if(!running||!session.live)return;if(['ArrowLeft','ArrowRight','a','d'].includes(event.key)){event.preventDefault();held.left=held.left||event.key==='ArrowLeft'||event.key==='a';held.right=held.right||event.key==='ArrowRight'||event.key==='d';}});
    session.on(canvas,'keyup',event=>{if(event.key==='ArrowLeft'||event.key==='a')held.left=false;if(event.key==='ArrowRight'||event.key==='d')held.right=false;});
    session.on(canvas,'blur',()=>{held.left=false;held.right=false;});
    session.on(document,'visibilitychange',()=>{if(document.hidden){held.left=false;held.right=false;}});
    session.on(start,'click',()=>{
      if(running||!session.live)return;
      running=true;intro.hidden=true;canvas.focus({preventScroll:true});spawn();
      session.animate(dt=>{
        elapsed+=dt;
        if(held.left!==held.right)momX=Math.max(29,Math.min(301,momX+(held.right?1:-1)*235*dt));
        if(wait>0){wait-=dt;if(wait<=0)spawn();}
        else if(boy){
          boy.y+=(124+caught*12)*(H-104)/226*dt;boy.x+=boy.vx*dt;
          if(boy.x<25||boy.x>305){boy.x=Math.max(25,Math.min(305,boy.x));boy.vx*=-1;}
          if(boy.y>=H-76){
            if(Math.abs(boy.x-momX)<=34){caught++;toast=caught===5?'Пойман!':'Есть!';}
            else{misses++;toast='Ещё попытка';}
            boy=null;session.setStatus(`${caught} / 5 поймано`);
            if(caught===5){draw();session.complete('5 из 5. Поймала!',{caught,misses,seconds:Math.round(elapsed)});return;}
            wait=.35;
          }
        }
        draw();
      });
    });
    function resize() {
      const box=canvas.getBoundingClientRect();
      const nextH=box.width&&box.height?Math.max(300,Math.round(box.height/box.width*330)):500;
      if(boy)boy.y=28+(boy.y-28)*(nextH-104)/(H-104);
      H=nextH;canvas.width=660;canvas.height=H*2;ctx.setTransform(2,0,0,2,0,0);draw();
    }
    session.on(window,'resize',resize);
    if(window.ResizeObserver){const observer=new ResizeObserver(resize);observer.observe(session.board);session.onCleanup(()=>observer.disconnect());}
    session.onCleanup(()=>{if(pointer!==null&&canvas.hasPointerCapture?.(pointer))canvas.releasePointerCapture(pointer);});
    session.setStatus('5 поимок · скорость растёт');resize();
  }

  function stop() {
    if (active) active.destroy();
    active = null;
  }

  function start(type, options = {}) {
    const games = { catch: catchGame, panic: window.MamaSliceGame, travel: window.MamaTravelGame };
    if (!Object.prototype.hasOwnProperty.call(games, type)) throw new Error(`Unknown MamaGames game: ${type}`);
    if (!options.host || typeof options.host.replaceChildren !== 'function') throw new TypeError('MamaGames.start requires a host element');
    stop();
    installStyles();
    active = createSession(type, options);
    games[type](active);
  }

  window.MamaGames = Object.freeze({ start, stop });
})();
