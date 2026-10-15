/* Four-panel entrance; normal HTML remains accessible when JavaScript is off. */
(() => {
  'use strict';
  const root = document.documentElement;
  const gate = document.querySelector('#entry-gate');
  const content = document.querySelector('#site-content');
  const enter = document.querySelector('#entry-enter');
  const skip = document.querySelector('#entry-skip');
  const progress = document.querySelector('#entry-progress');
  const progressValue = document.querySelector('#entry-progress-value');
  const progressStatus = document.querySelector('#entry-progress-status');
  const enterLabel = document.querySelector('#entry-enter-label');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const panels = [...gate.querySelectorAll('.gate-panel')];
  const animations = [];
  let state = 'waiting';
  let progressFrame = 0;

  function showProgress(value) {
    const amount = Math.min(100, Math.max(0, value));
    const whole = Math.floor(amount);
    progress.style.setProperty('--entry-progress', String(amount / 100));
    progress.setAttribute('aria-valuenow', String(whole));
    progressValue.textContent = String(whole).padStart(3, '0');
    progressStatus.textContent = whole === 100 ? '序列就绪' : '正在开启';
    gate.classList.toggle('is-ready', whole === 100);
  }

  function startSequence() {
    if (state !== 'waiting') return;
    if (reduced.matches) { finish(true); return; }
    state = 'charging';
    gate.classList.add('is-charging');
    enter.disabled = true;
    enterLabel.textContent = '正在开启';
    const started = performance.now();
    // This measures entrance choreography, not network or asset downloads.
    function advance(now) {
      if (state !== 'charging') return;
      const elapsed = now - started;
      const fraction = Math.min(1, elapsed / 860);
      showProgress((1 - Math.pow(1 - fraction, 2.2)) * 100);
      if (elapsed >= 1020) {
        progressFrame = 0;
        openDoor();
      } else progressFrame = requestAnimationFrame(advance);
    }
    progressFrame = requestAnimationFrame(advance);
  }

  function finish(skipped) {
    if (state === 'open') return;
    state = 'open';
    cancelAnimationFrame(progressFrame);
    progressFrame = 0;
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
    reduced.removeEventListener('change', reduceDuringEntry);
    document.dispatchEvent(new CustomEvent('inso:entry-open', { detail: { skip: skipped } }));
  }

  function openDoor() {
    if (state !== 'charging') return;
    if (reduced.matches) { finish(true); return; }
    state = 'opening';
    gate.classList.add('is-opening');
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

  function reduceDuringEntry() {
    if (reduced.matches && (state === 'charging' || state === 'opening')) finish(true);
  }

  enter.addEventListener('click', startSequence);
  skip.addEventListener('click', () => finish(true));
  gate.addEventListener('cancel', event => { event.preventDefault(); finish(true); });
  reduced.addEventListener('change', reduceDuringEntry);
  content.inert = true;
  root.classList.add('entry-active');
  gate.hidden = false;
  gate.showModal();
  root.classList.remove('entry-pending');
  enter.focus({ preventScroll: true });
})();
