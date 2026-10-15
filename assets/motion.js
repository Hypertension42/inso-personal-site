/* Native, two-dimensional motion. Content and navigation work without this file. */
(() => {
  'use strict';

  const page = document.documentElement;
  const stage = document.querySelector('.hero-stage');
  const field = stage?.querySelector('.wave-field');
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('#motion-toggle');
  const replayButton = document.querySelector('#replay-intro');
  const caret = stage?.querySelector('.hero-underscore');
  const contact = document.querySelector('.contact-section');
  const contactArrow = contact?.querySelector('.contact-arrow');
  const workbench = document.querySelector('.workbench');
  const reels = [...document.querySelectorAll('.glyph-reel [data-track]')];
  const binaries = [...document.querySelectorAll('[data-binary]')].map(element => ({
    element,
    original: element.textContent,
    characters: [...element.textContent],
    positions: [...element.textContent].flatMap((letter, index) => /[01]/.test(letter) ? [index] : []),
  }));
  const supported = Boolean(stage && field && window.ResizeObserver && window.IntersectionObserver && Element.prototype.animate);
  const visible = new Set();
  const revealed = new WeakSet();
  const animations = new Set();
  const glyphAnimations = new Map();
  const revealTargets = new Set(document.querySelectorAll('.section-heading, .about-copy > p, .skill-sheet, .contact-heading, .workbench'));
  const lines = [];
  const pointer = { active: false, x: 0, y: 0, vx: 0, vy: 0, time: 0 };
  let userEnabled = true;
  let enabled = false;
  let initialized = false;
  let heroVisible = false;
  let introPending = true;
  let width = 0;
  let height = 0;
  let stageBounds;
  let frame = 0;
  let frames = 0;
  let previousTime = 0;
  let waveTime = 0;
  let nextGlyph = 3;
  let glyphIndex = 0;
  let binaryTimer = 0;
  let contactHovered = false;
  let contactFocused = false;

  const clamp = (number, low, high) => Math.min(high, Math.max(low, number));
  const activePage = () => enabled && !document.hidden;
  const heroRunning = () => activePage() && heroVisible;

  function releasePointer() {
    pointer.active = false;
    pointer.vx = pointer.vy = 0;
    pointer.time = 0;
  }

  function finishRecord(record) {
    if (!animations.delete(record)) return;
    if (record.track && glyphAnimations.get(record.track) === record.animation) glyphAnimations.delete(record.track);
  }

  function syncAnimation(record) {
    const shouldPlay = activePage() && visible.has(record.owner);
    if (!shouldPlay && record.animation.playState === 'running') record.animation.pause();
    else if (shouldPlay && record.animation.playState === 'paused') record.animation.play();
  }

  function animate(element, keyframes, options, owner = element, group = 'reveal', track = null) {
    if (!element || !enabled) return null;
    const animation = element.animate(keyframes, { fill: 'backwards', ...options });
    const record = { animation, owner, group, track };
    animations.add(record);
    if (track) glyphAnimations.set(track, animation);
    animation.onfinish = () => {
      finishRecord(record);
      // Every last keyframe matches the static stylesheet, so no filled effects linger.
      animation.cancel();
    };
    animation.oncancel = () => finishRecord(record);
    syncAnimation(record);
    return animation;
  }

  function cancelGroup(group) {
    for (const record of [...animations]) if (!group || record.group === group) {
      finishRecord(record);
      record.animation.cancel();
    }
  }

  function cycleGlyph(track, intro = false, delay = 0) {
    if (!track || glyphAnimations.has(track) || !heroRunning()) return;
    const from = intro ? '-66.666667%' : '-33.333333%';
    const to = intro ? '-33.333333%' : '0%';
    animate(track, [
      { transform: `translateY(${from})` },
      { transform: `translateY(${to})` },
    ], { duration: intro ? 1050 : 520, delay, easing: 'cubic-bezier(.22,1,.36,1)' }, stage, intro ? 'intro' : 'glyph', track);
  }

  function playIntro() {
    if (!heroRunning() || !initialized) return false;
    introPending = false;
    cancelGroup('intro');
    cancelGroup('glyph');
    releasePointer();
    nextGlyph = waveTime + 3.2;
    for (const [index, line] of lines.entries()) {
      // Geometry is measured at intro/resize time, never inside the drawing loop.
      const length = line.path.getTotalLength();
      animate(line.path, [
        { strokeDasharray: `${length} ${length}`, strokeDashoffset: String(length), opacity: 0 },
        { strokeDasharray: `${length} ${length}`, strokeDashoffset: '0', opacity: 1 },
      ], { duration: 2000, delay: index * 5, easing: 'cubic-bezier(.3,.1,.2,1)' }, stage, 'intro');
    }
    reels.forEach((track, index) => cycleGlyph(track, true, 90 + index * 60));
    for (const selector of ['.hero-top', '.identity-line']) animate(document.querySelector(selector), [
      { opacity: 0.55, transform: 'translateY(9px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' }, stage, 'intro');
    animate(document.querySelector('.hero-bottom'), [
      { opacity: 0, transform: 'translateY(19px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 800, delay: 500, easing: 'cubic-bezier(.22,1,.36,1)' }, stage, 'intro');
    return true;
  }

  function replay() {
    if (!enabled) return false;
    introPending = true;
    return heroRunning() ? playIntro() : true;
  }

  function makePath(points) {
    let result = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
    for (let index = 1; index < points.length - 1; index++) {
      const here = points[index];
      const next = points[index + 1];
      result += ` Q${here.x.toFixed(2)},${here.y.toFixed(2)} ${((here.x + next.x) / 2).toFixed(2)},${((here.y + next.y) / 2).toFixed(2)}`;
    }
    const end = points[points.length - 1];
    return result + ` L${end.x.toFixed(2)},${end.y.toFixed(2)}`;
  }

  function drawField(time, step) {
    const radius = width < 700 ? 115 : 185;
    for (const line of lines) {
      for (const point of line.points) {
        const envelope = Math.pow(Math.sin(point.ratio * Math.PI), 0.8);
        const wave = (Math.sin(point.baseY * 0.009 + time * 0.49 + line.phase) * line.amplitude
          + Math.sin(point.baseY * 0.018 - time * 0.32 + line.phase * 1.7) * 11) * envelope;
        const x = line.x + wave;
        let targetX = 0;
        let targetY = 0;
        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = point.baseY - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < radius) {
            const influence = Math.pow(1 - distance / radius, 2);
            const divisor = Math.max(distance, 1);
            targetX = clamp((pointer.vx * 5 + dx / divisor * 24) * influence, -52, 52);
            targetY = clamp((pointer.vy * 4 + dy / divisor * 16) * influence, -32, 32);
          }
        }
        point.vx = (point.vx + (targetX - point.offsetX) * 0.065 * step) * Math.pow(0.82, step);
        point.vy = (point.vy + (targetY - point.offsetY) * 0.065 * step) * Math.pow(0.82, step);
        point.offsetX = clamp(point.offsetX + point.vx * step, -60, 60);
        point.offsetY = clamp(point.offsetY + point.vy * step, -38, 38);
        point.x = clamp(x + point.offsetX, -80, width + 80);
        point.y = point.baseY + point.offsetY;
      }
      line.path.setAttribute('d', makePath(line.points));
    }
    pointer.vx *= Math.pow(0.88, step);
    pointer.vy *= Math.pow(0.88, step);
  }

  function tick(now) {
    frame = 0;
    if (!heroRunning()) return;
    const elapsed = previousTime ? clamp((now - previousTime) / 1000, 0.001, 0.05) : 1 / 60;
    previousTime = now;
    waveTime += elapsed;
    frames++;
    drawField(waveTime, elapsed * 60);
    if (waveTime >= nextGlyph) {
      cycleGlyph(reels[glyphIndex++ % Math.max(1, reels.length)]);
      nextGlyph = waveTime + 3.1;
    }
    frame = requestAnimationFrame(tick);
  }

  function mutateBinaries() {
    for (const binary of binaries) {
      if (!visible.has(binary.element) || !binary.positions.length) continue;
      const count = Math.min(binary.positions.length, Math.random() < 0.5 ? 2 : 3);
      const positions = new Set();
      while (positions.size < count) positions.add(binary.positions[Math.floor(Math.random() * binary.positions.length)]);
      for (const index of positions) binary.characters[index] = binary.characters[index] === '0' ? '1' : '0';
      binary.element.textContent = binary.characters.join('');
    }
  }

  function syncContact() {
    contact?.classList.toggle('is-pulsing', activePage() && visible.has(contact) && (contactHovered || contactFocused));
  }

  function syncActivity() {
    if (heroRunning()) {
      if (introPending) playIntro();
      if (!frame) { previousTime = 0; frame = requestAnimationFrame(tick); }
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      releasePointer();
    }
    if (caret) caret.style.animationPlayState = heroRunning() ? 'running' : 'paused';
    const binaryActive = activePage() && binaries.some(binary => visible.has(binary.element));
    if (binaryActive && !binaryTimer) binaryTimer = window.setInterval(mutateBinaries, 125);
    else if (!binaryActive && binaryTimer) { clearInterval(binaryTimer); binaryTimer = 0; }
    for (const record of animations) syncAnimation(record);
    syncContact();
  }

  function syncEnabled() {
    const next = supported && initialized && userEnabled && !media.matches;
    const becameEnabled = next && !enabled;
    enabled = next;
    page.classList.toggle('motion-active', enabled);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.setAttribute('aria-label', media.matches ? '系统已选择减少动态效果' : enabled ? '关闭动态效果' : '开启动态效果');
      const label = toggle.querySelector('span');
      if (label) label.textContent = enabled ? 'ON' : 'OFF';
    }
    if (replayButton) replayButton.disabled = !enabled;
    if (!enabled) {
      cancelGroup();
      releasePointer();
      for (const binary of binaries) {
        binary.element.textContent = binary.original;
        binary.characters = [...binary.original];
      }
    } else if (becameEnabled) introPending = true;
    syncActivity();
  }

  function setEnabled(value) {
    userEnabled = Boolean(value);
    syncEnabled();
    return enabled;
  }

  window.insoMotion = {
    replay,
    setEnabled,
    isRunning: () => Boolean(frame && heroRunning()),
    debug: () => ({ enabled, frames, visible: heroVisible && !document.hidden, pathCount: lines.length }),
  };

  // The supplied static illustration is the motion-off presentation as well.
  const staticArt = stage?.querySelector('.signal-art');
  if (staticArt) staticArt.style.animationPlayState = 'paused';
  if (caret) caret.style.animationPlayState = 'paused';
  toggle?.addEventListener('click', () => setEnabled(!userEnabled));
  replayButton?.addEventListener('click', replay);
  media.addEventListener('change', syncEnabled);
  if (!supported) { syncEnabled(); return; }

  function resize(newWidth, newHeight) {
    if (newWidth < 1 || newHeight < 1 || (Math.abs(width - newWidth) < 0.5 && Math.abs(height - newHeight) < 0.5)) return;
    width = newWidth;
    height = newHeight;
    stageBounds = stage.getBoundingClientRect();
    releasePointer();
    cancelGroup('intro');
    field.setAttribute('viewBox', `0 0 ${width} ${height}`);
    field.setAttribute('preserveAspectRatio', 'none');
    field.setAttribute('fill', 'none');
    field.setAttribute('aria-hidden', 'true');
    lines.length = 0;
    const pathCount = clamp(Math.ceil(width / (width < 700 ? 22 : 20)) + 1, 8, width < 700 ? 28 : 60);
    const pointCount = clamp(Math.ceil(height / 35) + 1, 4, width < 700 ? 13 : 18);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < pathCount; index++) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-opacity', String(0.32 + 0.3 * Math.pow(Math.sin(index * 0.21), 2)));
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      const points = Array.from({ length: pointCount }, (_, point) => ({
        baseY: point / (pointCount - 1) * height,
        ratio: point / (pointCount - 1),
        offsetX: 0, offsetY: 0, vx: 0, vy: 0, x: 0, y: 0,
      }));
      lines.push({ path, points, x: index / (pathCount - 1) * (width + 36) - 18,
        phase: index * 0.14 + Math.sin(index * 0.37) * 0.4,
        amplitude: 22 + 19 * Math.pow(Math.sin(index * 0.18), 2) });
      fragment.append(path);
    }
    field.replaceChildren(fragment);
    drawField(waveTime, 1);
    const firstSize = !initialized;
    initialized = true;
    if (firstSize) syncEnabled();
    else syncActivity();
  }

  const resizeObserver = new ResizeObserver(entries => {
    const entry = entries.find(item => item.target === stage);
    if (entry) resize(entry.contentRect.width, entry.contentRect.height);
  });
  resizeObserver.observe(stage);

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
      if (entry.target === stage) heroVisible = entry.isIntersecting;
      if (entry.isIntersecting && revealTargets.has(entry.target) && !revealed.has(entry.target)) {
        revealed.add(entry.target);
        if (enabled) animate(entry.target, [
          { opacity: 0, transform: 'translateY(22px)', clipPath: 'inset(0 0 18% 0)' },
          { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0% 0)' },
        ], { duration: 750, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
    syncActivity();
  }, { threshold: 0.01 });
  const observed = new Set([stage, contact, workbench, ...revealTargets, ...binaries.map(binary => binary.element)].filter(Boolean));
  observed.forEach(element => observer.observe(element));
  binaries.forEach(binary => binary.element.setAttribute('aria-hidden', 'true'));

  stage.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch' || !heroRunning()) return;
    stageBounds = stage.getBoundingClientRect();
    pointer.time = 0;
  }, { passive: true });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !heroRunning() || !stageBounds) return;
    const now = performance.now();
    const x = event.clientX - stageBounds.left;
    const y = event.clientY - stageBounds.top;
    const delta = pointer.time ? Math.max(8, now - pointer.time) / 16.667 : 1;
    pointer.vx = pointer.active ? clamp((x - pointer.x) / delta, -12, 12) : 0;
    pointer.vy = pointer.active ? clamp((y - pointer.y) / delta, -12, 12) : 0;
    pointer.x = clamp(x, 0, width);
    pointer.y = clamp(y, 0, height);
    pointer.time = now;
    pointer.active = true;
  }, { passive: true });
  for (const name of ['pointerleave', 'pointercancel', 'pointerup']) stage.addEventListener(name, releasePointer, { passive: true });
  window.addEventListener('scroll', () => {
    releasePointer();
    if (heroVisible) stageBounds = stage.getBoundingClientRect();
  }, { passive: true });
  window.addEventListener('blur', () => {
    releasePointer();
    contactHovered = contactFocused = false;
    syncContact();
  });
  reels.forEach(track => track.closest('.glyph-reel').addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') cycleGlyph(track);
  }, { passive: true }));

  document.addEventListener('inso:project-change', event => {
    cancelGroup('project');
    if (!activePage()) return;
    const panel = [...document.querySelectorAll('.project-panel')].find(item => item.dataset.panel === event.detail?.id && !item.hidden);
    if (!panel) return;
    const owner = workbench || panel;
    animate(panel.querySelector('.project-info h3'), [
      { opacity: 0, transform: 'translateY(28px)', clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0% 0)' },
    ], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' }, owner, 'project');
    animate(panel.querySelector('.project-art svg'), [
      { opacity: 0, transform: 'translateY(18px) scale(.97)', clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, transform: 'translateY(0) scale(1)', clipPath: 'inset(0 0 0% 0)' },
    ], { duration: 500, delay: 60, easing: 'cubic-bezier(.22,1,.36,1)' }, owner, 'project');
  });

  contactArrow?.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { contactHovered = true; syncContact(); } });
  for (const name of ['pointerleave', 'pointercancel', 'pointerup']) contactArrow?.addEventListener(name, () => { contactHovered = false; syncContact(); });
  contactArrow?.addEventListener('focus', () => { contactFocused = true; syncContact(); });
  contactArrow?.addEventListener('blur', () => { contactFocused = false; syncContact(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { releasePointer(); contactHovered = contactFocused = false; }
    syncActivity();
  });
  syncEnabled();
})();
