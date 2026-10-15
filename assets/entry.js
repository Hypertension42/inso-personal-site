/* Four-panel entrance; normal HTML remains accessible when JavaScript is off. */
(() => {
  'use strict';
  const root = document.documentElement;
  const gate = document.querySelector('#entry-gate');
  const content = document.querySelector('#site-content');
  const enter = document.querySelector('#entry-enter');
  const skip = document.querySelector('#entry-skip');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const panels = [...gate.querySelectorAll('.gate-panel')];
  const animations = [];
  let state = 'waiting';

  function finish(skipped) {
    if (state === 'open') return;
    state = 'open';
    animations.forEach(animation => animation.cancel());
    gate.close();
    gate.hidden = true;
    content.inert = false;
    root.dataset.entryOpened = skipped ? 'skip' : 'enter';
    root.classList.remove('entry-active', 'entry-pending');
    const target = document.getElementById(location.hash.slice(1)) || document.querySelector('#hero-title');
    if (location.hash && target) target.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    reduced.removeEventListener('change', reduceDuringOpening);
    document.dispatchEvent(new CustomEvent('inso:entry-open', { detail: { skip: skipped } }));
  }

  function openDoor() {
    if (state !== 'waiting') return;
    if (reduced.matches) { finish(true); return; }
    state = 'opening';
    gate.classList.add('is-opening');
    enter.disabled = true;
    // Opposite corners move together, keeping the opening symmetrical.
    const vectors = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    panels.forEach((panel, index) => {
      const [x, y] = vectors[index];
      animations.push(panel.animate([
        { transform: 'translate(0,0)' },
        { transform: `translate(${x * 104}%,${y * 104}%)` },
      ], { duration: 1200, delay: 150, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }));
    });
    gate.querySelectorAll('.gate-center, .gate-label').forEach(element => {
      animations.push(element.animate([
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(.95)' },
      ], { duration: 190, fill: 'forwards' }));
    });
    Promise.all(animations.map(animation => animation.finished)).then(() => finish(false), () => {});
  }

  function reduceDuringOpening() {
    if (reduced.matches && state === 'opening') finish(true);
  }

  enter.addEventListener('click', openDoor);
  skip.addEventListener('click', () => finish(true));
  gate.addEventListener('cancel', event => { event.preventDefault(); finish(true); });
  reduced.addEventListener('change', reduceDuringOpening);
  content.inert = true;
  root.classList.add('entry-active');
  gate.hidden = false;
  gate.showModal();
  root.classList.remove('entry-pending');
  enter.focus({ preventScroll: true });
})();
