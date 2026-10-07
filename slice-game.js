/* Short Zen: 20 active seconds, no bombs or penalties, and three-target swipe combos. */
(() => {
  'use strict';

  const W = 330, DURATION = 20, GRAVITY = 250;
  const WORDS = [['А вдруг?'], ['Не успею'], ['Что', 'делать?'], ['Всё', 'сложно']];
  const COLORS = [
    { fill: '#d9a4b0', edge: '#f1c7cf', ink: '#25304b' },
    { fill: '#b8b0d7', edge: '#dad3ef', ink: '#24324d' },
    { fill: '#dcc69d', edge: '#f3dfb9', ink: '#29364a' }
  ];

  function element(tag, name, text) {
    const node = document.createElement(tag);
    node.className = name;
    if (text !== undefined) node.textContent = text;
    if (tag === 'button') node.type = 'button';
    return node;
  }

  function installStyles() {
    if (document.getElementById('mama-slice-styles')) return;
    const style = document.createElement('style');
    style.id = 'mama-slice-styles';
    style.textContent = `
      .mama-mini-game.slice-game{width:100%;max-width:none;height:100%;display:flex;flex-direction:column;padding:0}
      .slice-game .game-board{display:flex;flex:1;min-height:0}
      .slice-game .slice-game-field{position:relative;flex:1;min-height:0;width:100%;height:100%;margin:0 auto}
      .slice-game canvas.slice-game-canvas{position:absolute;inset:0;display:block;width:100%;height:100%;margin:0;border:0;border-radius:0;background:#13243d;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
      .slice-game .slice-game-start,.slice-game .slice-game-fallback{font:inherit;min-height:46px;border:1px solid #f3d199;border-radius:13px;background:linear-gradient(120deg,#f9ddb0,#edc38a);color:#182132;font-size:15px;font-weight:650;padding:12px 24px;touch-action:manipulation;cursor:pointer}
      .slice-game .slice-game-intro{position:absolute;top:50%;left:50%;transform:translate(-50%,-25%);width:calc(100% - 50px);max-width:290px;text-align:center}
      .slice-game .slice-game-note{font-size:14px;line-height:1.6;color:#e0dcec;margin:0 0 20px;text-wrap:balance}
      .slice-game .slice-game-start{display:block;min-height:50px;width:175px;margin:0 auto;box-shadow:0 4px 20px #07122355}
      .slice-game .slice-game-fallback{display:block;min-width:175px;margin:30px auto}
      .slice-game .slice-game-start:focus-visible,.slice-game .slice-game-fallback:focus-visible,.slice-game canvas:focus-visible{outline:3px solid #ffe5a0;outline-offset:3px}
      .slice-game [hidden]{display:none!important}
    `;
    document.head.append(style);
  }

  // Test the whole pointer segment, including fast swipes with sparse events.
  function segmentHitsCircle(a, b, circle) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const projection = length2 ? ((circle.x - a.x) * dx + (circle.y - a.y) * dy) / length2 : 0;
    const t = Math.max(0, Math.min(1, projection));
    const x = a.x + t * dx - circle.x, y = a.y + t * dy - circle.y;
    return x * x + y * y <= circle.r * circle.r;
  }

  // Analytic motion remains a true parabola, independently of frame rate.
  function positionAt(bubble, age) {
    return { x: bubble.x0 + bubble.vx * age, y: bubble.y0 + bubble.vy * age + .5 * (bubble.gravity || GRAVITY) * age * age };
  }

  window.MamaSliceGame = function MamaSliceGame(session) {
    installStyles();
    session.root.classList.add('slice-game');
    session.instruction.textContent = 'Разрезай тревоги взмахом пальца. Три за один взмах — двойные очки.';
    const field = element('div', 'slice-game-field');
    const canvas = element('canvas', 'slice-game-canvas');
    let H = 500;
    canvas.width = W * 2; canvas.height = H * 2; canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Дзен: 20 секунд без бомб. Разрезай облачка пальцем. На клавиатуре нажимай пробел.');
    const start = element('button', 'slice-game-start', 'Начать');
    const intro = element('div', 'slice-game-intro');
    const note = element('p', 'slice-game-note', 'Разрезай облачка взмахом пальца. Три за один взмах — двойные очки.');
    intro.append(note, start);
    field.append(canvas, intro);
    session.board.append(field);
    const ctx = canvas.getContext('2d');
    let running = false, finished = false, hits = 0, score = 0, combos = 0, elapsed = 0;
    let bubbles = [], halves = [], particles = [], trail = [];
    let pointer = null, origin = null, last = null, dragging = false;
    let spawnIn = .25, serial = 0, wave = 0;
    let strokeHits = 0, strokeStarted = null, strokeLastAt = 0;
    let comboText = '', comboLife = 0, lastSecond = DURATION;

    function report() { session.setStatus(`Счёт: ${score} · осталось ${Math.max(0, Math.ceil(DURATION - elapsed))} сек`); }
    function finishStroke() {
      if (strokeHits >= 3) {
        score += strokeHits; combos++;
        comboText = `Комбо ×${strokeHits} · +${strokeHits}`; comboLife = .85;
        if (running && session.live) window.MamaAudio?.sfx('combo', { count: strokeHits });
        report();
      }
      strokeHits = 0; strokeStarted = null;
      dragging = false; origin = last;
    }
    function complete() {
      if (finished || !session.live) return;
      finishStroke(); finished = true; running = false;
      clearPointer();
      session.complete(`Время вышло. Счёт: ${score}`, { score, cuts: hits, combos, seconds: DURATION });
    }

    // A readable button fallback also keeps the level usable without Canvas.
    if (!ctx) {
      canvas.hidden = true;
      intro.style.position = 'static'; intro.style.transform = 'none';
      const fallback = element('button', 'slice-game-fallback', WORDS[0].join(' '));
      fallback.hidden = true; field.append(fallback);
      session.instruction.textContent = '20 секунд: нажимай на появляющиеся тревоги.';
      note.textContent = session.instruction.textContent;
      session.on(start, 'click', () => {
        if (running || !session.live) return;
        window.MamaAudio?.unlock(); window.MamaAudio?.sfx('start');
        running = true; intro.hidden = true; fallback.hidden = false;
        fallback.focus({ preventScroll: true }); report();
        session.animate(dt => {
          elapsed = Math.min(DURATION, elapsed + dt);
          if (elapsed >= DURATION - 1e-7) elapsed = DURATION;
          const second = Math.ceil(DURATION - elapsed);
          if (second !== lastSecond) { lastSecond = second; report(); }
          if (elapsed >= DURATION) { fallback.disabled = true; complete(); }
        });
      });
      session.on(fallback, 'click', () => {
        if (!running || !session.live || finished) return;
        window.MamaAudio?.sfx('slice');
        hits++; score++; report();
        fallback.textContent = WORDS[hits % WORDS.length].join(' ');
      });
      session.setStatus('20 секунд · без бомб и штрафов');
      return;
    }

    function resize() {
      const box = canvas.getBoundingClientRect();
      const nextH = box.width > 0 && box.height > 0 ? Math.max(400, Math.min(650, Math.round(box.height / box.width * W))) : 500;
      const ratio = nextH / H;
      H = nextH;
      canvas.width = W * 2; canvas.height = H * 2;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      bubbles.forEach(bubble => {
        bubble.y0 *= ratio; bubble.vy *= ratio; bubble.gravity *= ratio;
        Object.assign(bubble, positionAt(bubble, bubble.age));
      });
      halves.forEach(half => { half.y *= ratio; half.vy *= ratio; });
      particles.forEach(p => { p.y *= ratio; p.vy *= ratio; });
      trail = []; clearPointer(); draw();
    }

    function spawn() {
      // A whole wave has intersecting but slightly staggered arcs for combos.
      // Let its predecessors leave before filling the small phone field again.
      if (bubbles.length > 1) return;
      const count = [3, 4, 3, 5][wave++ % 4];
      const side = wave % 2 ? 1 : -1;
      for (let i = 0; i < count; i++) {
        const r = 36 + Math.random() * 3;
        const slot = side > 0 ? i : count - 1 - i;
        const x0 = 58 + slot * 214 / (count - 1) + (Math.random() - .5) * 10;
        const targetX = 72 + (count - 1 - slot) * 186 / (count - 1);
        const bubble = {
          x0, y0: H + r + 7, vx: (targetX - x0) / 3,
          vy: -(337 + (i % 3) * 27 + Math.random() * 10) * H / 350,
          gravity: GRAVITY * H / 350, age: -i * .065, r,
          lines: WORDS[serial % WORDS.length], color: COLORS[serial % COLORS.length]
        };
        serial++;
        Object.assign(bubble, positionAt(bubble, bubble.age));
        bubbles.push(bubble);
      }
    }

    function cloudShape(r) {
      // A stepped pixel silhouette, with generous uninterrupted space for text.
      const points = [[-.62,-.82],[-.3,-.82],[-.3,-1],[.3,-1],[.3,-.82],[.62,-.82],[.62,-.65],[.84,-.65],[.84,-.32],[1,-.32],[1,.34],[.84,.34],[.84,.64],[.64,.64],[.64,.83],[.3,.83],[.3,.96],[-.3,.96],[-.3,.83],[-.64,.83],[-.64,.64],[-.84,.64],[-.84,.34],[-1,.34],[-1,-.32],[-.84,-.32],[-.84,-.65],[-.62,-.65]];
      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(p[0] * r, p[1] * r) : ctx.moveTo(p[0] * r, p[1] * r));
      ctx.closePath();
    }

    function drawBubble(bubble, x = bubble.x, y = bubble.y) {
      ctx.save(); ctx.translate(x, y);
      cloudShape(bubble.r);
      ctx.fillStyle = bubble.color.fill; ctx.fill();
      ctx.strokeStyle = bubble.color.edge; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffffff35';
      ctx.fillRect(-bubble.r * .55, -bubble.r * .64, 9, 3);
      ctx.fillRect(-bubble.r * .7, -bubble.r * .48, 3, 7);
      ctx.font = '600 15px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = bubble.color.ink;
      bubble.lines.forEach((line, i) => ctx.fillText(line, 0, (i - (bubble.lines.length - 1) / 2) * 18 + 1));
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#13243d'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 24; i++) {
        const x = 14 + (i * 73) % 300, y = 16 + (i * 83) % (H - 42);
        ctx.fillStyle = i % 4 ? '#c5c2e22c' : '#ebd4a552';
        ctx.fillRect(x, y, 2, 2);
        if (i % 6 === 0) { ctx.fillRect(x - 2, y, 6, 2); ctx.fillRect(x, y - 2, 2, 6); }
      }
      ctx.fillStyle = '#f0dbb525'; ctx.fillRect(24, H - 15, W - 48, 1);
      ctx.font = '600 14px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#e0d9cc';
      ctx.fillText(`Очки: ${score}`, 16, 15);
      const remaining = Math.max(0, Math.ceil(DURATION - elapsed));
      ctx.font = '650 20px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'right'; ctx.fillStyle = remaining <= 10 ? '#f2d5b2' : '#f1e6d2';
      ctx.fillText(`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`, W - 16, 12);
      bubbles.forEach(bubble => drawBubble(bubble));
      halves.forEach(half => {
        ctx.save(); ctx.globalAlpha = Math.max(0, half.life / .58);
        ctx.translate(half.x, half.y); ctx.rotate(half.rotation);
        ctx.rotate(half.cutAngle); ctx.beginPath();
        ctx.rect(-100, half.side < 0 ? -100 : 0, 200, 100); ctx.clip();
        ctx.rotate(-half.cutAngle); drawBubble(half, 0, 0); ctx.restore();
      });
      particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / .45);
        ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      });
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        ctx.globalAlpha = Math.max(0, Math.min(a.life, b.life) / .18);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = '#eacba466'; ctx.lineWidth = 8; ctx.stroke();
        ctx.strokeStyle = '#fff5d8'; ctx.lineWidth = 3; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (comboLife > 0) {
        ctx.globalAlpha = Math.min(1, comboLife / .2);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '650 15px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.fillStyle = '#ffe2a9'; ctx.fillText(comboText, W / 2, 59);
        ctx.globalAlpha = 1;
      }
      if (!running && !finished) {
        const preview = { x: 165, y: H * .26, r: 38, lines: WORDS[0], color: COLORS[1] };
        drawBubble(preview);
        ctx.textAlign = 'center'; ctx.font = '13px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.fillStyle = '#c6cedf'; ctx.fillText('20 секунд · без бомб и штрафов', W / 2, H * .77);
      }
    }

    function split(bubble, a, b) {
      const cutAngle = Math.atan2(b.y - a.y, b.x - a.x);
      const nx = -Math.sin(cutAngle), ny = Math.cos(cutAngle);
      for (const side of [-1, 1]) {
        halves.push({ ...bubble, x: bubble.x + nx * side * 3, y: bubble.y + ny * side * 3,
          vx: bubble.vx * .15 + nx * side * 82, vy: -35 + ny * side * 82,
          cutAngle, side, rotation: 0, spin: side * .7, life: .58 });
      }
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2, speed = 32 + Math.random() * 75;
        particles.push({ x: bubble.x, y: bubble.y, vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30, life: .45, size: i % 3 ? 3 : 4,
          color: i % 2 ? bubble.color.edge : '#f6deb0' });
      }
    }

    function slice(a, b) {
      if (!running || !session.live) return;
      const survivors = [];
      bubbles.forEach(bubble => {
        if (bubble.age >= 0 && bubble.y - bubble.r < H && segmentHitsCircle(a, b, bubble)) {
          split(bubble, a, b); hits++; score++; strokeHits++;
        } else survivors.push(bubble);
      });
      if (survivors.length !== bubbles.length) {
        window.MamaAudio?.sfx('slice');
        bubbles = survivors; report();
      }
      draw();
    }

    function point(event) {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return null;
      return { x: (event.clientX - box.left) * W / box.width, y: (event.clientY - box.top) * H / box.height };
    }

    function clearPointer() {
      finishStroke();
      const previous = pointer;
      pointer = null; origin = null; last = null; dragging = false;
      if (previous !== null && canvas.hasPointerCapture?.(previous)) canvas.releasePointerCapture?.(previous);
    }

    session.on(canvas, 'pointerdown', event => {
      if (!running || !session.live || pointer !== null || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      const p = point(event); if (!p) return;
      pointer = event.pointerId; origin = p; last = p; dragging = false; trail = [];
      canvas.focus({ preventScroll: true }); canvas.setPointerCapture?.(pointer);
    });
    session.on(canvas, 'pointermove', event => {
      if (event.pointerId !== pointer || !last || !running || !session.live) return;
      event.preventDefault();
      const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
      const samples = events.length ? events : [event];
      for (const sample of samples) {
        const next = point(sample); if (!next || !last) continue;
        if (!dragging && Math.hypot(next.x - origin.x, next.y - origin.y) <= 5) continue;
        if (!dragging) window.MamaAudio?.sfx('swipe');
        dragging = true;
        if (strokeStarted === null) strokeStarted = elapsed;
        strokeLastAt = elapsed;
        if (!trail.length) trail.push({ ...last, life: .18 });
        trail.push({ ...next, life: .18 }); if (trail.length > 18) trail.shift();
        const from = last; last = next; slice(from, next);
      }
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => session.on(canvas, name, event => {
      if (event.pointerId === pointer) clearPointer();
    }));
    session.on(canvas, 'blur', clearPointer);
    session.on(document, 'visibilitychange', () => { if (document.hidden) { clearPointer(); trail = []; } });
    session.on(window, 'resize', resize);
    if (window.visualViewport) session.on(window.visualViewport, 'resize', resize);
    session.on(canvas, 'keydown', event => {
      if ((event.key !== ' ' && event.code !== 'Space') || event.repeat || !running || !session.live) return;
      event.preventDefault();
      const candidates = bubbles.filter(bubble => bubble.y > bubble.r && bubble.y < H - bubble.r);
      if (!candidates.length) return;
      const target = candidates.reduce((nearest, bubble) => Math.hypot(bubble.x - W / 2, bubble.y - H / 2) < Math.hypot(nearest.x - W / 2, nearest.y - H / 2) ? bubble : nearest);
      const a = { x: target.x - target.r - 8, y: target.y }, b = { x: target.x + target.r + 8, y: target.y };
      finishStroke(); strokeStarted = elapsed; strokeLastAt = elapsed;
      trail = [{ ...a, life: .18 }, { ...b, life: .18 }]; slice(a, b); finishStroke();
    });

    session.on(start, 'click', () => {
      if (running || !session.live || finished) return;
      window.MamaAudio?.unlock(); window.MamaAudio?.sfx('start');
      resize(); running = true; intro.hidden = true; canvas.focus({ preventScroll: true }); report(); draw();
      session.animate(dt => {
        if (!running || !session.live) return;
        elapsed = Math.min(DURATION, elapsed + dt);
        if (elapsed >= DURATION - 1e-7) elapsed = DURATION;
        if (strokeStarted !== null && (elapsed - strokeLastAt >= .2 || elapsed - strokeStarted >= .65)) finishStroke();
        if (elapsed >= DURATION) { finishStroke(); draw(); complete(); return; }
        const second = Math.ceil(DURATION - elapsed);
        if (second !== lastSecond) { lastSecond = second; report(); }
        spawnIn -= dt;
        if (spawnIn <= 0) { spawn(); spawnIn = .9 + Math.random() * .3; }
        bubbles = bubbles.filter(bubble => {
          bubble.age += dt; Object.assign(bubble, positionAt(bubble, bubble.age));
          if (bubble.vy + bubble.gravity * bubble.age > 0 && bubble.y - bubble.r > H + 8) return false;
          return true;
        });
        halves = halves.filter(half => {
          half.life -= dt; half.x += half.vx * dt; half.y += half.vy * dt;
          half.vy += 180 * dt; half.rotation += half.spin * dt; return half.life > 0;
        });
        particles = particles.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; return p.life > 0; });
        trail = trail.filter(p => { p.life -= dt; return p.life > 0; });
        comboLife = Math.max(0, comboLife - dt);
        draw();
      });
    });
    session.onCleanup(() => { clearPointer(); running = false; bubbles = []; halves = []; particles = []; trail = []; });
    session.setStatus('20 секунд · без бомб и штрафов');
    resize();
  };
})();
