/* Six real objects, a 4 × 4 suitcase, and reversible drag-and-drop packing. */
(() => {
  'use strict';

  const STYLE_ID = 'mama-travel-packing-styles';
  const CSS = `
    .mama-mini-game.game-travel{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden}
    .mama-mini-game.game-travel>.game-instruction{flex:0 0 auto}
    .mama-mini-game.game-travel>.game-board{position:relative;display:flex;flex:1 1 auto;flex-direction:column;min-height:0;overflow:hidden}
    .mama-mini-game.game-travel>.game-status{display:none}
    .travel-pack-game{--travel-slot-height:52px;--travel-layout-gap:8px;box-sizing:border-box;display:flex;flex:1 1 auto;flex-direction:column;justify-content:space-between;gap:var(--travel-layout-gap);width:100%;height:100%;min-height:0;max-width:none;margin:0 auto;padding:12px 16px max(16px,env(safe-area-inset-bottom));color:#eee8dc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .travel-pack-game *,.travel-pack-ghost{box-sizing:border-box}
    .travel-pack-game [hidden]{display:none!important}
    .travel-pack-toolbar{display:flex;flex:0 0 44px;align-items:center;justify-content:space-between;gap:8px;min-height:44px;margin:0}
    .travel-pack-count{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:#d2dfdb}
    .travel-pack-reset{min-height:44px;min-width:76px;padding:7px 10px;border:1px solid #cad4de38;border-radius:10px;background:#233347;color:#efdfc3;font:600 12px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;touch-action:manipulation}
    .travel-pack-case{position:relative;flex:0 0 auto;width:226px;max-width:100%;padding:8px;margin:0 auto;border:1px solid #cab99180;border-radius:15px;background:linear-gradient(140deg,#9d8b68,#665d50 35%,#aa9470 77%,#7b6d58);box-shadow:0 7px 20px #0003,inset 0 0 0 2px #f8e6c524}
    .travel-pack-case:before{position:absolute;content:'';left:calc(50% - 21px);top:-8px;width:42px;height:9px;border:3px solid #bca67d;border-bottom:0;border-radius:6px 6px 0 0}
    .travel-pack-case:after{position:absolute;content:'';bottom:-4px;left:22px;right:22px;height:4px;border-left:12px solid #5f665f;border-right:12px solid #5f665f;border-radius:2px;pointer-events:none}
    .travel-pack-grid{position:relative;isolation:isolate;width:208px;max-width:100%;aspect-ratio:1;overflow:hidden;border-radius:8px;background-color:#15273a;background-image:linear-gradient(to right,#becbd71f 1px,transparent 1px),linear-gradient(to bottom,#becbd71f 1px,transparent 1px);background-size:25% 25%;box-shadow:inset 0 0 12px #0005}
    .travel-pack-preview{position:absolute;z-index:6;pointer-events:none;border:2px solid #ccecba;background:#92cca331;border-radius:9px;box-shadow:0 0 0 1px #0c1a2860}
    .travel-pack-preview[data-valid="false"]{border-color:#e9a1aa;background:#e9a1aa35}
    .travel-pack-tray{display:grid;flex:0 0 auto;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0;padding:0}
    .travel-pack-slot{position:relative;min-width:0;height:var(--travel-slot-height);border:1px dashed #bac8d82b;border-radius:12px;background:#ffffff03;display:grid;place-items:center}
    .travel-pack-placeholder{font-size:10px;color:#a7b3bf80;pointer-events:none}
    .travel-pack-item{position:relative;display:block;min-width:0;margin:0;padding:0;border:1px solid #d9d7c044;border-radius:9px;background:linear-gradient(145deg,#2a3c50,#1e3044);color:#efe3cb;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;overflow:hidden;font-family:inherit;box-shadow:0 2px 6px #0002}
    .travel-pack-item.travel-pack-in-tray{position:absolute;inset:0;width:100%;height:100%;border-radius:9px}
    .game-host .travel-pack-item.travel-pack-in-case,.travel-pack-item.travel-pack-in-case{position:absolute;z-index:2;min-height:0;overflow:visible;background-color:#75837024;background-image:linear-gradient(to right,#e8dfc71b 1px,transparent 1px),linear-gradient(to bottom,#e8dfc71b 1px,transparent 1px);border-color:#d7c9a475}
    .travel-pack-item.travel-pack-in-case:before{content:'';position:absolute;inset:-2px;pointer-events:auto}
    .travel-pack-item.travel-pack-selected{border-color:#ffe2a2;box-shadow:inset 0 0 0 1px #ffe2a267,0 2px 8px #0003}
    .travel-pack-item.travel-pack-drag-source{opacity:.22}
    .travel-pack-art{position:absolute;left:50%;top:50%;display:block;max-width:none!important;max-height:none!important;pointer-events:none;filter:drop-shadow(0 2px 1px #06121d66)}
    .travel-pack-name{position:absolute;bottom:4px;left:3px;right:3px;text-align:center;font-size:var(--travel-label-size,10px);line-height:1.1;color:#e3e0d8;white-space:nowrap;pointer-events:none}
    .travel-pack-size{position:absolute;top:4px;right:5px;font-size:10px;line-height:1;color:#d2d5cf;pointer-events:none}
    .travel-pack-in-case .travel-pack-name,.travel-pack-in-case .travel-pack-size{display:none}
    .travel-pack-in-case.travel-pack-selected .travel-pack-size{display:block;color:#ffdf9c}
    .travel-pack-ghost{position:fixed;z-index:2147483000;left:0;top:0;margin:0;padding:0;pointer-events:none;border:2px solid #ecdbb4;border-radius:9px;background-color:#23384ef2;background-image:linear-gradient(to right,#e8dfc724 1px,transparent 1px),linear-gradient(to bottom,#e8dfc724 1px,transparent 1px);box-shadow:0 10px 28px #0005;will-change:transform;overflow:hidden}
    .travel-pack-ghost.travel-pack-valid{border-color:#bde4ba;background-color:#27493ff2}
    .travel-pack-ghost.travel-pack-invalid{border-color:#e6a3ad;background-color:#543744f2}
    .travel-pack-item:focus-visible,.travel-pack-reset:focus-visible{outline:3px solid #ffe1a4;outline-offset:2px}
    .travel-pack-item:disabled{cursor:default;opacity:1}
    .travel-pack-reset:disabled{opacity:.45;cursor:default}
    .travel-pack-finished .travel-pack-case{box-shadow:0 0 0 2px #b1d2ae70,0 7px 20px #0003}
    .travel-pack-awaiting{pointer-events:none;opacity:.22;filter:blur(2px)}
    .travel-pack-intro{position:absolute;inset:0;z-index:12;display:grid;place-items:center;overflow:auto;padding:24px;background:linear-gradient(180deg,#102036e8,#102036d9 48%,#102036ed);text-align:center;overscroll-behavior:contain}
    .travel-pack-intro-content{width:100%;max-width:292px;margin:auto}
    .travel-pack-intro-picture{display:block;width:83px;height:69px;margin:0 auto 23px;filter:drop-shadow(0 7px 12px #050e2140)}
    .travel-pack-intro .travel-pack-intro-title{font:700 27px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:-.65px;color:#ffe3b7;margin:0;text-wrap:balance}
    .travel-pack-intro .travel-pack-intro-text{font:14px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#d5dfe8;margin:18px 0 25px;text-wrap:pretty}
    .travel-pack-intro-start{display:block;width:100%;min-height:51px;border:1px solid #ffe5b866;border-radius:13px;padding:13px 15px;background:linear-gradient(115deg,#f8deb1,#eec68e);color:#213248;font:650 14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 6px 22px #07142355,inset 0 1px #ffefd080;touch-action:manipulation}
    .travel-pack-intro-start:focus-visible{outline:3px solid #b6d5dc;outline-offset:4px}
    @media(prefers-reduced-motion:reduce){.travel-pack-game *,.travel-pack-ghost{animation:none!important;transition:none!important}}
  `;

  const ART = {
    shirt: { width: 100, height: 100, body: '<path d="M29 15 10 29 21 47 32 40v46h36V40l11 7 11-18-19-14-12 5H41Z" fill="#f2dfbc" stroke="#b5a181" stroke-width="2"/><path d="m29 15 12 5c1 11 17 11 18 0l12-5" fill="#d6b997"/><path d="M42 20q8 8 16 0" fill="none" stroke="#91766b" stroke-width="3"/><path d="M35 45h30v8H35z" fill="#be796a"/><path d="M35 56h30v5H35z" fill="#8d9d91"/><path d="M36 82h28M15 29l11 13m59-13L74 42" fill="none" stroke="#d0ba97" stroke-width="2"/>' },
    sandals: { width: 100, height: 100, body: '<g transform="rotate(-13 28 50)"><path d="M28 8C9 8 11 43 14 61l3 21c1 12 22 12 24 0l2-21c4-19 5-53-15-53Z" fill="#805d48"/><path d="M28 8C12 8 15 40 18 59l2 20c1 8 16 8 17 0l2-20c3-19 6-51-11-51Z" fill="#d9b181"/><path d="m16 31 12 15 14-15-4-8-10 13-8-13Z" fill="#eee1bc"/><path d="M25 44h7v17h-7Z" fill="#ebdcb6"/></g><g transform="rotate(13 73 51)"><path d="M72 10C54 10 55 43 58 63l3 20c2 12 23 12 24 0l3-20c3-20 5-53-16-53Z" fill="#805d48"/><path d="M72 10C58 10 60 43 63 62l2 19c1 7 15 7 16 0l2-19c3-19 6-52-11-52Z" fill="#d9b181"/><path d="m60 33 12 15 15-15-5-8-10 13-8-13Z" fill="#eee1bc"/><path d="M69 46h7v17h-7Z" fill="#ebdcb6"/></g>' },
    passport: { width: 64, height: 88, body: '<rect x="6" y="5" width="53" height="78" rx="5" fill="#493339"/><rect x="5" y="3" width="51" height="78" rx="5" fill="#97606b" stroke="#c18f8d" stroke-width="1.5"/><path d="M11 6v71" stroke="#6f424d" stroke-width="2"/><path d="M20 17h23m-20 5h17" stroke="#eed39c" stroke-width="2"/><circle cx="32" cy="44" r="13" fill="none" stroke="#ead297" stroke-width="2"/><path d="M19 44h26M32 31c-9 8-9 18 0 26m0-26c9 8 9 18 0 26" fill="none" stroke="#ead297" stroke-width="1.5"/><path d="M23 65h17m-13 5h9" stroke="#ead297" stroke-width="2"/>' },
    camera: { width: 112, height: 74, body: '<path d="M12 28h90v32H12z" fill="#101b27"/><path d="M24 15h20l7 10h39a11 11 0 0 1 11 11v22a9 9 0 0 1-9 9H19a9 9 0 0 1-9-9V32a7 7 0 0 1 7-7h7Z" fill="#a8b3ad" stroke="#64777a" stroke-width="2"/><path d="M10 37h91v17H10z" fill="#3b4d5a"/><rect x="77" y="16" width="15" height="8" rx="3" fill="#b68674"/><rect x="20" y="28" width="18" height="9" rx="2" fill="#eff0d9"/><circle cx="58" cy="45" r="25" fill="#283c4c" stroke="#cfcbc0" stroke-width="4"/><circle cx="58" cy="45" r="17" fill="#1a2d41" stroke="#658994" stroke-width="3"/><circle cx="58" cy="45" r="9" fill="#447388"/><path d="m51 37 9-4" stroke="#aed6d3" stroke-width="3" stroke-linecap="round"/>' },
    glasses: { width: 112, height: 55, body: '<path d="M7 19 11 8h19m75 11-4-11H82" fill="none" stroke="#bc9563" stroke-width="6" stroke-linecap="round"/><path d="M7 18h39v12c0 17-35 18-38 1Z" fill="#476676" stroke="#d2ad78" stroke-width="5"/><path d="M66 18h39l-1 13c-3 17-38 16-38-1Z" fill="#476676" stroke="#d2ad78" stroke-width="5"/><path d="M46 23q10-9 20 0" fill="none" stroke="#d2ad78" stroke-width="5"/><path d="m16 23 11 11m48-11 11 11" stroke="#94b8b4" stroke-width="3" opacity=".8"/>' },
    charger: { width: 72, height: 86, body: '<path d="M29 45v19c0 19 35 19 35-2V46" fill="none" stroke="#acb9bb" stroke-width="5"/><path d="M19 5v16m18-16v16" stroke="#c6cdcf" stroke-width="6" stroke-linecap="round"/><rect x="10" y="18" width="36" height="38" rx="8" fill="#eadfc6" stroke="#b8b49f" stroke-width="2"/><path d="m30 26-10 14h10l-7 10" fill="none" stroke="#ab9a71" stroke-width="3" stroke-linejoin="round"/><rect x="56" y="36" width="15" height="15" rx="3" fill="#e7dbc4"/><path d="M60 31h7v6h-7z" fill="#b9c3c4"/>' }
  };
  const DEFINITIONS = [
    { id: 'shirt', name: 'Футболка', w: 2, h: 2 },
    { id: 'sandals', name: 'Сандалии', w: 2, h: 2 },
    { id: 'passport', name: 'Паспорт', w: 1, h: 3 },
    { id: 'camera', name: 'Камера', w: 2, h: 1 },
    { id: 'glasses', name: 'Очки', w: 2, h: 1, rotation: 1 },
    { id: 'charger', name: 'Зарядка', w: 1, h: 1 }
  ];

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    if (tag === 'button') element.type = 'button';
    return element;
  }
  function art(id) {
    const definition = ART[id];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'travel-pack-art');
    svg.setAttribute('viewBox', `0 0 ${definition.width} ${definition.height}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = definition.body;
    return svg;
  }
  function dimensions(item) {
    return item.rotation % 2 ? { w: item.h, h: item.w } : { w: item.w, h: item.h };
  }
  function inside(point, rectangle) {
    return point.x >= rectangle.left && point.x <= rectangle.right && point.y >= rectangle.top && point.y <= rectangle.bottom;
  }

  window.MamaTravelGame = function (session) {
    if (!document.getElementById(STYLE_ID)) {
      const style = node('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.append(style);
    }
    session.instruction.textContent = 'Перетащи все 6 вещей в чемодан. Каждая уже лежит нужной стороной.';
    const root = node('div', 'travel-pack-game');
    const toolbar = node('div', 'travel-pack-toolbar');
    const count = node('span', 'travel-pack-count', '0 / 6 уложено');
    const reset = node('button', 'travel-pack-reset', 'Сначала');
    reset.setAttribute('aria-label', 'Достать все вещи и начать укладку сначала');
    toolbar.append(count, reset);
    const suitcase = node('div', 'travel-pack-case');
    const grid = node('div', 'travel-pack-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Чемодан, четыре ряда и четыре столбца');
    const preview = node('div', 'travel-pack-preview');
    preview.setAttribute('aria-hidden', 'true');
    preview.hidden = true;
    grid.append(preview);
    suitcase.append(grid);
    const tray = node('div', 'travel-pack-tray');
    tray.setAttribute('role', 'group');
    tray.setAttribute('aria-label', 'Вещи снаружи чемодана. Сюда можно вернуть любой предмет');
    root.append(toolbar, suitcase, tray);
    root.inert = true;
    root.setAttribute('aria-hidden', 'true');
    root.classList.add('travel-pack-awaiting');
    reset.disabled = true;
    const intro = node('section', 'travel-pack-intro');
    intro.setAttribute('aria-labelledby', 'travel-pack-intro-title');
    const introContent = node('div', 'travel-pack-intro-content');
    const introPicture = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    introPicture.setAttribute('class', 'travel-pack-intro-picture');
    introPicture.setAttribute('viewBox', '0 0 100 82');
    introPicture.setAttribute('aria-hidden', 'true');
    introPicture.innerHTML = '<path d="M37 22v-9c0-4 26-4 26 0v9" fill="none" stroke="#dfc391" stroke-width="5"/><rect x="11" y="22" width="78" height="52" rx="10" fill="#bca47b" stroke="#e8d4ad" stroke-width="2"/><rect x="16" y="27" width="68" height="42" rx="7" fill="#947e5f"/><path d="M30 24v47m40-47v47" stroke="#e9d4ac" stroke-width="6"/><rect x="45" y="42" width="10" height="9" rx="2" fill="#efdbb5"/><path d="M24 77h7m38 0h7" stroke="#58665f" stroke-width="5" stroke-linecap="round"/>';
    const introTitle = node('h2', 'travel-pack-intro-title', 'Ты заслужила отдых.');
    introTitle.id = 'travel-pack-intro-title';
    const introText = node('p', 'travel-pack-intro-text', 'Меня поймала, с тревогами разобралась. Теперь собираем чемодан — и в путешествие.');
    introText.id = 'travel-pack-intro-text';
    const introStart = node('button', 'travel-pack-intro-start', 'Собираем чемодан');
    introStart.setAttribute('aria-describedby', introText.id);
    introContent.append(introPicture, introTitle, introText, introStart);
    intro.append(introContent);
    session.board.replaceChildren(root, intro);

    let selected = null;
    let drag = null;
    let ghost = null;
    let complete = false;
    let started = false;
    let moves = 0;
    let invalidDrops = 0;
    let resets = 0;
    let disposed = false;
    let layoutMetrics = { grid: 208, slot: 52, gap: 8, width: 294, height: 398 };
    const objects = DEFINITIONS.map(definition => {
      const slot = node('div', 'travel-pack-slot');
      slot.dataset.slot = definition.id;
      slot.append(node('span', 'travel-pack-placeholder', definition.name));
      tray.append(slot);
      const button = node('button', 'travel-pack-item travel-pack-in-tray');
      button.disabled = true;
      button.dataset.item = definition.id;
      const picture = art(definition.id);
      const name = node('span', 'travel-pack-name', definition.name);
      const size = node('span', 'travel-pack-size');
      name.setAttribute('aria-hidden', 'true');
      size.setAttribute('aria-hidden', 'true');
      button.append(picture, name, size);
      slot.append(button);
      return { ...definition, rotation: definition.rotation || 0, position: null, button, picture, size, slot };
    });

    function measure() {
      const rect = grid.getBoundingClientRect();
      return { rect, cell: (rect.width || layoutMetrics.grid) / 4 };
    }
    function fitLayout() {
      if (disposed) return;
      const bounds = session.board.getBoundingClientRect();
      const padding = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(root) : null;
      const horizontalPadding = padding ? (parseFloat(padding.paddingLeft) || 0) + (parseFloat(padding.paddingRight) || 0) : 32;
      const verticalPadding = padding ? (parseFloat(padding.paddingTop) || 0) + (parseFloat(padding.paddingBottom) || 0) : 28;
      const width = Math.floor(bounds.width - horizontalPadding);
      const height = Math.floor(bounds.height - verticalPadding);
      if (width <= 0 || height <= 0) return;
      // Protect the 44px controls first; a short screen reduces the tray and then the board.
      const gap = height < 430 ? 5 : 8;
      const fixed = 44 + 18 + 8 + gap * 2;
      const widthLimit = Math.max(0, Math.min(width - 18, width >= 430 ? 360 : 300));
      const slot = Math.max(44, Math.min(70, Math.floor((height - fixed - widthLimit) / 2)));
      const size = Math.max(0, Math.floor(Math.min(widthLimit, height - fixed - slot * 2)));
      if (size <= 0) return;
      if (size === layoutMetrics.grid && slot === layoutMetrics.slot && gap === layoutMetrics.gap && width === layoutMetrics.width && height === layoutMetrics.height) return;
      resetDrag();
      layoutMetrics = { grid: size, slot, gap, width, height };
      root.style.setProperty('--travel-slot-height', `${slot}px`);
      root.style.setProperty('--travel-layout-gap', `${gap}px`);
      root.style.setProperty('--travel-label-size', slot >= 60 ? '11px' : '10px');
      grid.style.width = `${size}px`;
      grid.style.height = `${size}px`;
      suitcase.style.width = `${size + 18}px`;
      root.dataset.gridSize = String(size);
      root.dataset.slotHeight = String(slot);
      renderAll();
    }
    function packedCount() { return objects.filter(item => item.position !== null).length; }
    function occupied(skip = null) {
      const cells = new Set();
      for (const item of objects) {
        if (item === skip || !item.position) continue;
        const { w, h } = dimensions(item);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.add(`${item.position.row + y}:${item.position.col + x}`);
      }
      return cells;
    }
    function fits(item, row, col) {
      const { w, h } = dimensions(item);
      if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row + h > 4 || col + w > 4) return false;
      const cells = occupied(item);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (cells.has(`${row + y}:${col + x}`)) return false;
      return true;
    }
    function status(note = '') {
      count.textContent = `${packedCount()} / 6 уложено`;
      session.setStatus(note ? `${packedCount()} / 6 · ${note}` : `${packedCount()} / 6 уложено`);
    }
    function fitArt(svg, item, mode, cell) {
      const drawing = ART[item.id];
      let scale;
      if (mode === 'tray') {
        const availableWidth = Math.max(24, Math.min(86, (layoutMetrics.width - 16) / 3 - 14));
        const availableHeight = Math.max(24, layoutMetrics.slot - 18);
        scale = item.rotation % 2 ? Math.min(availableWidth / drawing.height, availableHeight / drawing.width) : Math.min(availableWidth / drawing.width, availableHeight / drawing.height);
      }
      else scale = Math.min((item.w * cell - 10) / drawing.width, (item.h * cell - 10) / drawing.height);
      svg.style.width = `${drawing.width * scale}px`;
      svg.style.height = `${drawing.height * scale}px`;
      svg.style.top = mode === 'tray' ? '42%' : '50%';
      svg.style.transform = `translate(-50%,-50%) rotate(${item.rotation * 90}deg)`;
    }
    function render(item) {
      const { w, h } = dimensions(item);
      const { cell } = measure();
      item.button.classList.toggle('travel-pack-in-tray', !item.position);
      item.button.classList.toggle('travel-pack-in-case', Boolean(item.position));
      item.button.classList.toggle('travel-pack-selected', selected === item.id);
      item.button.dataset.rotation = String(item.rotation);
      item.button.dataset.width = String(w);
      item.button.dataset.height = String(h);
      item.size.textContent = `${w}×${h}`;
      if (item.position) {
        if (item.button.parentNode !== grid) grid.append(item.button);
        item.button.style.left = `${item.position.col * cell + 2}px`;
        item.button.style.top = `${item.position.row * cell + 2}px`;
        item.button.style.right = 'auto';
        item.button.style.bottom = 'auto';
        item.button.style.width = `${w * cell - 4}px`;
        item.button.style.height = `${h * cell - 4}px`;
        item.button.style.backgroundSize = `${cell}px ${cell}px`;
        item.button.dataset.row = String(item.position.row);
        item.button.dataset.col = String(item.position.col);
      } else {
        if (item.button.parentNode !== item.slot) item.slot.append(item.button);
        item.button.style.left = '';
        item.button.style.top = '';
        item.button.style.right = '';
        item.button.style.bottom = '';
        item.button.style.width = '';
        item.button.style.height = '';
        item.button.style.backgroundSize = '';
        delete item.button.dataset.row;
        delete item.button.dataset.col;
      }
      fitArt(item.picture, item, item.position ? 'board' : 'tray', cell);
      const location = item.position ? `В чемодане: ряд ${item.position.row + 1}, столбец ${item.position.col + 1}.` : 'В лотке.';
      item.button.setAttribute('aria-label', `${item.name}, ${w} на ${h} клетки. ${location} Enter кладёт в чемодан; стрелки двигают; Delete возвращает в лоток.`);
    }
    function renderAll() { objects.forEach(render); }
    function select(item) {
      selected = item.id;
      objects.forEach(other => other.button.classList.toggle('travel-pack-selected', other === item));
    }
    function resetDrag() {
      const old = drag;
      drag = null;
      preview.hidden = true;
      if (ghost) { ghost.remove(); ghost = null; }
      if (old) {
        old.item.button.classList.remove('travel-pack-drag-source');
        if (old.item.button.hasPointerCapture && old.item.button.hasPointerCapture(old.pointerId)) old.item.button.releasePointerCapture(old.pointerId);
      }
    }
    function checkWin() {
      status();
      if (started && !complete && session.live && packedCount() === 6 && occupied().size === 16) {
        complete = true;
        root.classList.add('travel-pack-finished');
        reset.disabled = true;
        objects.forEach(item => { item.button.disabled = true; });
        session.complete('Всё влезло. Чемодан можно закрывать.', { packed: 6, cells: 16, moves, invalidDrops, resets });
      }
    }
    function place(item, row, col) {
      if (!session.live || !started || complete) return false;
      if (!fits(item, row, col)) return false;
      item.position = { row, col };
      moves++;
      render(item);
      checkWin();
      return true;
    }
    function returnToTray(item) {
      if (!session.live || !started || complete) return;
      item.position = null;
      moves++;
      render(item);
      status();
    }
    function proposal(point) {
      if (!drag) return null;
      const { rect, cell } = measure();
      if (!inside(point, rect)) return null;
      const row = Math.round((point.y - drag.anchorY - rect.top - 2) / cell);
      const col = Math.round((point.x - drag.anchorX - rect.left - 2) / cell);
      return { row, col, valid: fits(drag.item, row, col) };
    }
    function showGhost(point) {
      if (!drag) return;
      const { cell } = measure();
      const { w, h } = dimensions(drag.item);
      const width = w * cell - 4;
      const height = h * cell - 4;
      if (!ghost) {
        ghost = node('div', 'travel-pack-ghost');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.inert = true;
        ghost.style.width = `${width}px`;
        ghost.style.height = `${height}px`;
        ghost.style.backgroundSize = `${cell}px ${cell}px`;
        const picture = art(drag.item.id);
        fitArt(picture, drag.item, 'board', cell);
        ghost.append(picture);
        document.body.append(ghost);
        drag.item.button.classList.add('travel-pack-drag-source');
      }
      ghost.style.transform = `translate3d(${point.x - drag.anchorX}px,${point.y - drag.anchorY}px,0)`;
      const candidate = proposal(point);
      ghost.classList.toggle('travel-pack-valid', Boolean(candidate && candidate.valid));
      ghost.classList.toggle('travel-pack-invalid', Boolean(candidate && !candidate.valid));
      preview.hidden = !candidate;
      if (candidate) {
        preview.dataset.valid = String(candidate.valid);
        preview.style.left = `${candidate.col * cell + 2}px`;
        preview.style.top = `${candidate.row * cell + 2}px`;
        preview.style.width = `${width}px`;
        preview.style.height = `${height}px`;
      }
    }
    function beginDrag(item, event) {
      if (!session.live || !started || complete || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
      resetDrag();
      select(item);
      item.button.focus({ preventScroll: true });
      event.preventDefault();
      const bounds = item.button.getBoundingClientRect();
      const { cell } = measure();
      const { w, h } = dimensions(item);
      const fractionX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / (bounds.width || 1)));
      const fractionY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / (bounds.height || 1)));
      drag = { item, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moving: false, anchorX: fractionX * (w * cell - 4), anchorY: fractionY * (h * cell - 4) };
      if (item.button.setPointerCapture) item.button.setPointerCapture(event.pointerId);
    }
    function moveDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId || !session.live) return;
      event.preventDefault();
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 5) drag.moving = true;
      if (drag.moving) showGhost({ x: drag.x, y: drag.y });
    }
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const item = drag.item;
      const moving = drag.moving;
      const point = { x: event.clientX, y: event.clientY };
      const candidate = moving ? proposal(point) : null;
      const inTray = moving && inside(point, tray.getBoundingClientRect());
      resetDrag();
      if (!session.live || !started || complete) return;
      if (!moving) { select(item); return; }
      else if (candidate && candidate.valid) place(item, candidate.row, candidate.col);
      else if (inTray) returnToTray(item);
      else { invalidDrops++; status('здесь не помещается'); }
      if (session.live && !complete) item.button.focus({ preventScroll: true });
    }
    function key(item, event) {
      if (!session.live || !started || complete) return;
      const arrows = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
      if (!arrows[event.key] && !['Enter', ' ', 'Delete', 'Backspace', 'Escape'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      select(item);
      if (event.key === 'Escape') { resetDrag(); return; }
      if (drag) resetDrag();
      if ((event.key === 'Enter' || event.key === ' ') && item.position) return;
      if (event.key === 'Delete' || event.key === 'Backspace') { returnToTray(item); item.button.focus({ preventScroll: true }); return; }
      if (!item.position) {
        for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
          if (fits(item, row, col)) { place(item, row, col); if (session.live) item.button.focus({ preventScroll: true }); return; }
        }
        status('освободи место для этой вещи');
      } else {
        const direction = arrows[event.key];
        if (!place(item, item.position.row + direction[0], item.position.col + direction[1])) status('здесь не помещается');
        if (session.live) item.button.focus({ preventScroll: true });
      }
    }

    objects.forEach(item => {
      session.on(item.button, 'focus', () => select(item));
      session.on(item.button, 'pointerdown', event => beginDrag(item, event));
      session.on(item.button, 'pointermove', moveDrag);
      session.on(item.button, 'pointerup', endDrag);
      session.on(item.button, 'pointercancel', resetDrag);
      session.on(item.button, 'lostpointercapture', resetDrag);
      session.on(item.button, 'keydown', event => key(item, event));
      session.on(item.button, 'click', () => select(item));
    });
    session.on(reset, 'click', () => {
      if (!session.live || !started || complete) return;
      resetDrag();
      selected = null;
      moves = 0;
      invalidDrops = 0;
      resets++;
      objects.forEach(item => { item.position = null; });
      renderAll();
      status('все вещи снова снаружи');
    });
    session.on(document, 'visibilitychange', () => { if (document.hidden) resetDrag(); });
    session.on(introStart, 'click', () => {
      if (!session.live || started || complete) return;
      started = true;
      root.inert = false;
      root.removeAttribute('aria-hidden');
      root.classList.remove('travel-pack-awaiting');
      reset.disabled = false;
      objects.forEach(item => { item.button.disabled = false; });
      intro.remove();
      fitLayout();
      session.setStatus('Перетащи все вещи в чемодан');
      objects[0].button.focus({ preventScroll: true });
    });
    session.on(window, 'blur', resetDrag);
    session.on(window, 'resize', fitLayout);
    if (window.visualViewport) session.on(window.visualViewport, 'resize', fitLayout);
    const resizeObserver = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(fitLayout) : null;
    if (resizeObserver) resizeObserver.observe(session.board);
    session.onCleanup(() => {
      disposed = true;
      if (resizeObserver) resizeObserver.disconnect();
      resetDrag();
      intro.remove();
      root.inert = true;
      reset.disabled = true;
      objects.forEach(item => { item.button.disabled = true; });
    });
    renderAll();
    fitLayout();
    session.setStatus('Время собираться в путешествие');
  };
})();
