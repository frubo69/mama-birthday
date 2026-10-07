/* Keep iOS rubber-banding from taking over a game gesture. */
(() => {
  'use strict';
  const story = document.getElementById('story');
  if (!story) return;
  let gameGesture = false;
  story.addEventListener('touchstart', () => {
    gameGesture = story.dataset.screen === 'game';
  }, { passive: true, capture: true });
  document.addEventListener('touchmove', event => {
    if (gameGesture && story.dataset.screen === 'game' && event.cancelable) {
      event.preventDefault();
    }
  }, { passive: false, capture: true });
  const endGesture = event => {
    if (!event.touches.length) gameGesture = false;
  };
  document.addEventListener('touchend', endGesture, { passive: true });
  document.addEventListener('touchcancel', endGesture, { passive: true });
  window.addEventListener('pagehide', () => { gameGesture = false; });
})();
