/* Shared, gesture-unlocked chiptune audio. Effects are on; ambient is opt-in. */
(() => {
  'use strict';
  if (window.MamaAudio) return;

  const MAX_VOICES = 40, MAX_PENDING = 8;
  const limits = { start: 250, catch: 120, miss: 250, swipe: 150, slice: 80, combo: 180, pickup: 90, drop: 100, return: 160, complete: 500 };
  let enabled = true, ambient = false, interacted = false;
  let audio = null, master = null, resumePending = null;
  let scene = 0, musicMode = null, victoryDone = false, phrase = 0, epoch = 0;
  let loopTimer = null, victoryTimer = null, pendingEffects = [];
  const voices = new Set(), rates = new Map(), subscribers = new Set();
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  const state = () => ({ enabled, ambient, unlocked: interacted, playing: musicMode, available: Boolean(window.AudioContext || window.webkitAudioContext) });
  function notify() { subscribers.forEach(fn => { try { fn(state()); } catch (_) {} }); }

  function retire(voice, stop = false) {
    if (!voices.has(voice)) return;
    voices.delete(voice);
    voice.oscillator.onended = null;
    if (stop) {
      try { voice.envelope.gain.cancelScheduledValues(0); voice.oscillator.stop(audio.currentTime); } catch (_) {}
    }
    voice.oscillator.disconnect(); voice.envelope.disconnect();
  }
  function stopEffects(keepRates = false) {
    pendingEffects = []; if (!keepRates) rates.clear();
    voices.forEach(voice => { if (voice.category === 'effect') retire(voice, true); });
  }
  function stopMusic() {
    if (loopTimer !== null) clearInterval(loopTimer);
    if (victoryTimer !== null) clearTimeout(victoryTimer);
    loopTimer = null; victoryTimer = null; musicMode = null;
    voices.forEach(voice => { if (voice.category === 'music') retire(voice, true); });
  }
  function stopAll() {
    epoch++; stopMusic(); stopEffects();
  }

  function tone(frequency, duration = .12, delay = 0, volume = .016, type = 'triangle', endFrequency = null, category = 'effect') {
    if (!enabled || !interacted || !audio || audio.state !== 'running' || document.hidden || voices.size >= MAX_VOICES) return;
    const time = audio.currentTime + delay;
    const oscillator = audio.createOscillator(), envelope = audio.createGain();
    const voice = { oscillator, envelope, category }; voices.add(voice);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration + .035);
    oscillator.connect(envelope); envelope.connect(master);
    oscillator.onended = () => retire(voice);
    oscillator.start(time); oscillator.stop(time + duration + .07);
  }

  function playEffect(kind, detail = {}) {
    if (kind === 'complete') stopEffects(true);
    switch (kind) {
      case 'start':
        tone(523.25, .065, 0, .010); tone(659.25, .10, .065, .012); break;
      case 'catch':
        tone(783.99, .10, 0, .018); tone(1046.5, .15, .085, .014, 'square'); break;
      case 'miss':
        tone(329.63, .12, 0, .008, 'triangle', 261.63); break;
      case 'swipe':
        tone(740, .08, 0, .007, 'triangle', 220); break;
      case 'slice':
        tone(1174.66, .055, 0, .015, 'triangle', 1567.98);
        tone(880, .085, .035, .008, 'sine'); break;
      case 'combo': {
        const lift = Math.min(2, Math.max(0, (Number(detail.count) || 3) - 3));
        [783.99, 987.77, 1318.51].forEach((pitch, i) => tone(pitch * Math.pow(2, lift / 12), .095, i * .065, .014, i === 2 ? 'square' : 'triangle'));
        break;
      }
      case 'pickup':
        tone(659.25, .065, 0, .011, 'triangle', 880); break;
      case 'drop':
        tone(523.25, .085, 0, .016); tone(783.99, .12, .055, .012); break;
      case 'return':
        tone(392, .075, 0, .010); tone(329.63, .095, .065, .008); break;
      case 'complete':
        [523.25, 659.25, 783.99, 1046.5].forEach((pitch, i) => tone(pitch, i === 3 ? .35 : .22, i * .12, i === 3 ? .010 : .017, i === 3 ? 'square' : 'triangle'));
        break;
    }
  }

  function sfx(kind, detail = {}) {
    if (!Object.prototype.hasOwnProperty.call(limits, kind) || !enabled || !interacted || document.hidden) return false;
    const time = now();
    if (time - (rates.get(kind) ?? -Infinity) < limits[kind]) return false;
    rates.set(kind, time);
    if (audio && audio.state === 'running') { playEffect(kind, detail); return true; }
    // Only hold a few fresh events while a gesture-triggered resume is pending.
    if (resumePending) {
      pendingEffects.push({ kind, detail, time, epoch });
      if (pendingEffects.length > MAX_PENDING) pendingEffects.shift();
    }
    return false;
  }

  function ambientPhrase() {
    if (musicMode !== 'ambient' || !enabled || document.hidden) return;
    const melodies = [[523.25, 659.25, 783.99, 659.25], [440, 523.25, 659.25, 523.25], [349.23, 440, 523.25, 659.25], [392, 493.88, 587.33, 783.99]];
    const melody = melodies[phrase++ % melodies.length];
    melody.forEach((frequency, i) => tone(frequency, .38, i * .46, .011, 'triangle', null, 'music'));
    tone(melody[0] / 2, 1.8, 0, .015, 'triangle', null, 'music');
  }
  function victoryPhrase() {
    const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);
    const melody = [[0, 72, .16], [.20, 76, .16], [.40, 79, .18], [.62, 84, .38], [1.08, 83, .18], [1.30, 79, .18], [1.52, 81, .32], [1.96, 88, .34], [2.40, 86, .18], [2.62, 84, .18], [2.84, 79, .28], [3.26, 81, .18], [3.48, 83, .18], [3.70, 84, .36], [4.20, 88, .18], [4.42, 91, .24], [4.80, 84, .95]];
    melody.forEach(([at, midi, length]) => tone(frequency(midi), length, at, .012, 'square', null, 'music'));
    [[0, 48], [1.08, 55], [1.96, 53], [2.84, 55], [3.70, 48], [4.80, 48]].forEach(([at, midi]) => tone(frequency(midi), .65, at, .018, 'triangle', null, 'music'));
    [60, 64, 67].forEach((midi, i) => tone(frequency(midi), .83, 4.80 + i * .035, .008, 'triangle', null, 'music'));
  }
  function syncMusic() {
    if (!enabled || !interacted || document.hidden || !audio || audio.state !== 'running') return;
    const desired = scene === 4 && !victoryDone ? 'victory' : ambient ? 'ambient' : null;
    if (musicMode === desired) return;
    stopMusic(); musicMode = desired;
    if (desired === 'victory') {
      stopEffects(); victoryPhrase();
      const token = epoch;
      victoryTimer = setTimeout(() => {
        victoryTimer = null;
        if (token !== epoch || !enabled || scene !== 4 || document.hidden) return;
        victoryDone = true; stopMusic(); syncMusic(); notify();
      }, 6100);
    } else if (desired === 'ambient') {
      ambientPhrase(); loopTimer = setInterval(ambientPhrase, 2600);
    }
    notify();
  }

  function unlock() {
    interacted = true;
    if (!enabled || document.hidden) return Promise.resolve(false);
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return Promise.resolve(false);
      if (!audio) {
        audio = new Audio(); master = audio.createGain();
        master.gain.value = .65; master.connect(audio.destination);
      }
      if (audio.state === 'running') { syncMusic(); return Promise.resolve(true); }
      if (resumePending) return resumePending;
      // This call happens immediately in the pointer/click/keyboard handler.
      const resume = audio.resume();
      resumePending = Promise.resolve(resume).then(() => {
        resumePending = null;
        if (!enabled || document.hidden || audio.state !== 'running') { pendingEffects = []; return false; }
        syncMusic();
        const queued = pendingEffects; pendingEffects = [];
        queued.forEach(event => { if (event.epoch === epoch && now() - event.time < 350) playEffect(event.kind, event.detail); });
        notify(); return true;
      }).catch(() => { resumePending = null; pendingEffects = []; return false; });
      return resumePending;
    } catch (_) { resumePending = null; pendingEffects = []; return Promise.resolve(false); }
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) stopAll(); else syncMusic();
    notify(); return enabled;
  }
  function setAmbient(value) {
    ambient = Boolean(value); syncMusic(); notify();
  }
  function setScreen(value) {
    stopAll(); scene = Number(value); victoryDone = false;
    syncMusic(); notify();
  }
  function subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    subscribers.add(fn); fn(state()); return () => subscribers.delete(fn);
  }

  // A single set of page-lifetime listeners also covers touch-generated clicks.
  document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  document.addEventListener('click', unlock, { capture: true, passive: true });
  document.addEventListener('keydown', event => { if (!event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) unlock(); }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAll();
      if (audio) audio.suspend().catch(() => {});
    } else if (interacted && enabled) unlock();
  });
  window.addEventListener('pagehide', () => { stopAll(); if (audio) audio.suspend().catch(() => {}); });
  window.addEventListener('pageshow', () => { if (interacted && enabled && !document.hidden) unlock(); });

  window.MamaAudio = Object.freeze({ unlock, sfx, setEnabled, setAmbient, setScreen, stopEffects, subscribe, get enabled() { return enabled; }, get state() { return state(); } });
})();
