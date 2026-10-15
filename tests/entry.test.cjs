const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'entry.js'), 'utf8');

// The clock and animation promises are explicit: these tests never wait for real time.
function createEntrance({ reduced = false } = {}) {
  let now = 0;
  let nextFrame = 1;
  let requests = 0;
  let latestCallback;
  const frames = new Map();
  const canceledFrames = [];
  const updates = [];
  const animationCalls = [];
  const dispatched = [];

  class EventTarget {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    dispatchEvent(event) {
      for (const listener of [...(this.listeners.get(event.type) || [])]) listener(event);
      return !event.defaultPrevented;
    }
    fire(type) {
      return this.dispatchEvent({ type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });
    }
  }

  class Element extends EventTarget {
    constructor(id) {
      super();
      this.id = id;
      this.dataset = {};
      this.attributes = new Map();
      this.textContent = '';
      this.hidden = false;
      this.disabled = false;
      this.inert = false;
      const classes = new Set();
      this.classList = {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
        toggle(name, force) {
          const add = force === undefined ? !classes.has(name) : force;
          if (add) classes.add(name); else classes.delete(name);
          return add;
        },
      };
      this.style = { setProperty: (name, value) => {
        if (this.id === 'entry-progress') updates.push({ kind: 'style', name, value, time: now });
      } };
    }
    setAttribute(name, value) {
      this.attributes.set(name, value);
      if (this.id === 'entry-progress' && name === 'aria-valuenow') updates.push({ kind: 'progress', value: Number(value), time: now });
    }
    getAttribute(name) { return this.attributes.get(name); }
    focus() { this.focused = true; }
    scrollIntoView() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
    animate(keyframes, options) {
      let resolve;
      let reject;
      const animation = {
        element: this,
        keyframes,
        options,
        time: now,
        progress: Number(elements.progress.getAttribute('aria-valuenow')),
        canceled: false,
        finished: new Promise((yes, no) => { resolve = yes; reject = no; }),
        complete: () => resolve(),
        cancel() { this.canceled = true; reject(new Error('Animation canceled')); },
      };
      animationCalls.push(animation);
      return animation;
    }
  }

  const elements = Object.fromEntries([
    ['root', 'html'], ['gate', 'entry-gate'], ['content', 'site-content'],
    ['enter', 'entry-enter'], ['skip', 'entry-skip'], ['progress', 'entry-progress'],
    ['value', 'entry-progress-value'], ['status', 'entry-progress-status'],
    ['label', 'entry-enter-label'], ['hero', 'hero-title'],
  ].map(([key, id]) => [key, new Element(id)]));
  const panels = Array.from({ length: 4 }, (_, index) => new Element(`panel-${index}`));
  const labels = [new Element('gate-center'), new Element('gate-label')];
  elements.gate.querySelectorAll = selector => {
    if (selector === '.gate-panel') return panels;
    if (selector === '.gate-center, .gate-label') return labels;
    throw new Error(`Unexpected gate selector: ${selector}`);
  };
  const byId = new Map(Object.values(elements).map(element => [element.id, element]));
  const document = new EventTarget();
  document.documentElement = elements.root;
  document.querySelector = selector => {
    assert(selector.startsWith('#'), `Unexpected document selector: ${selector}`);
    return byId.get(selector.slice(1)) || null;
  };
  document.getElementById = id => byId.get(id) || null;
  const dispatch = document.dispatchEvent.bind(document);
  document.dispatchEvent = event => { dispatched.push(event); return dispatch(event); };
  const preference = new EventTarget();
  preference.matches = reduced;

  vm.runInNewContext(source, {
    document,
    location: { hash: '' },
    window: { scrollTo() {} },
    matchMedia: () => preference,
    performance: { now: () => now },
    requestAnimationFrame(callback) {
      requests++;
      latestCallback = callback;
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      if (frames.has(id)) canceledFrames.push(frames.get(id));
      frames.delete(id);
    },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  }, { filename: 'assets/entry.js', timeout: 1000 });

  function stepTo(time) {
    assert(time >= now, 'The fake clock must move forwards');
    now = time;
    // A frame may schedule the next frame, but it cannot run in the same tick.
    for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now);
  }

  return {
    ...elements,
    panels,
    updates,
    animationCalls,
    dispatched,
    canceledFrames,
    preference,
    stepTo,
    clickEnter: () => elements.enter.fire('click'),
    clickSkip: () => elements.skip.fire('click'),
    reduce() { preference.matches = true; preference.fire('change'); },
    pendingFrames: () => frames.size,
    requestCount: () => requests,
    panelAnimations: () => animationCalls.filter(animation => panels.includes(animation.element)),
    progressSamples: () => updates.filter(update => update.kind === 'progress'),
    deliverLateFrame(time) { now = time; latestCallback?.(now); },
    reachOpening() {
      for (let tick = 0; tick <= 5000 && !animationCalls.length; tick += 40) stepTo(tick);
      assert.equal(this.panelAnimations().length, 4, 'The sequence must eventually open all four panels');
    },
  };
}

function assertReleased(entrance, expected = 'skip') {
  assert.equal(entrance.content.inert, false, 'The page must become interactive');
  assert.equal(entrance.gate.open, false, 'The modal entrance must close');
  assert.equal(entrance.gate.hidden, true);
  assert.equal(entrance.root.dataset.entryOpened, expected);
  assert.equal(entrance.root.classList.contains('entry-active'), false);
  assert.equal(entrance.pendingFrames(), 0, 'No progress frame may remain scheduled');
  assert.equal(entrance.dispatched.filter(event => event.type === 'inso:entry-open').length, 1);
}

test('progress stays bounded and monotonic, reaches 100 before the four doors open, then releases content', async () => {
  const entrance = createEntrance();
  assert.equal(entrance.content.inert, true);
  assert.equal(entrance.gate.open, true);
  entrance.clickEnter();
  entrance.reachOpening();

  const samples = entrance.progressSamples();
  assert(samples.length > 2, 'Charging must produce observable intermediate progress');
  assert(samples.some(sample => sample.value > 0 && sample.value < 100));
  for (let index = 0; index < samples.length; index++) {
    assert(Number.isFinite(samples[index].value));
    assert(samples[index].value >= 0 && samples[index].value <= 100);
    if (index) assert(samples[index].value >= samples[index - 1].value, 'Progress must never move backwards');
  }
  for (const update of entrance.updates.filter(update => update.kind === 'style')) {
    assert.equal(update.name, '--entry-progress');
    assert(Number.isFinite(Number(update.value)) && Number(update.value) >= 0 && Number(update.value) <= 1);
  }
  const ready = samples.find(sample => sample.value === 100);
  assert(ready, 'Progress must report 100');
  const doors = entrance.panelAnimations();
  assert.equal(doors.length, 4);
  assert(doors.every(animation => animation.progress === 100 && animation.time > ready.time), 'Door movement follows the completed progress display');
  assert.equal(entrance.value.textContent, '100');
  assert.equal(entrance.status.textContent, '序列就绪');
  assert.equal(entrance.content.inert, true, 'Content stays inert until opening animations finish');

  entrance.animationCalls.forEach(animation => animation.complete());
  await new Promise(resolve => setImmediate(resolve));
  assertReleased(entrance, 'enter');
  assert.equal(entrance.hero.focused, true);
});

test('repeated clicks cannot start another progress loop or another set of doors', () => {
  const entrance = createEntrance();
  entrance.clickEnter();
  for (let count = 0; count < 6; count++) entrance.clickEnter();
  assert.equal(entrance.requestCount(), 1);
  assert.equal(entrance.pendingFrames(), 1);
  entrance.stepTo(100);
  const requests = entrance.requestCount();
  entrance.clickEnter();
  assert.equal(entrance.requestCount(), requests);
  assert.equal(entrance.pendingFrames(), 1);
  // Continue from the current time; the test does not reproduce the easing formula.
  for (let time = 140; time <= 5000 && !entrance.animationCalls.length; time += 40) entrance.stepTo(time);
  assert.equal(entrance.panelAnimations().length, 4);
  entrance.clickEnter();
  entrance.clickEnter();
  assert.equal(entrance.panelAnimations().length, 4);
  assert.equal(entrance.pendingFrames(), 0);
  entrance.clickSkip();
});

for (const phase of ['charging', 'opening']) {
  for (const action of ['skip', 'reduced-motion']) {
    test(`${action} during ${phase} releases inert and prevents all later frame updates`, async () => {
      const entrance = createEntrance();
      entrance.clickEnter();
      if (phase === 'charging') entrance.stepTo(180);
      else entrance.reachOpening();
      if (action === 'skip') entrance.clickSkip();
      else entrance.reduce();
      assertReleased(entrance);
      if (phase === 'charging') assert(entrance.canceledFrames.length > 0, 'The charging frame must be canceled');
      assert(entrance.animationCalls.every(animation => animation.canceled), 'Opening animations must be canceled');
      const updateCount = entrance.updates.length;
      const animationCount = entrance.animationCalls.length;
      const requestCount = entrance.requestCount();
      entrance.stepTo(6000);
      // Simulate an already-delivered RAF callback arriving after cancellation.
      entrance.deliverLateFrame(6100);
      entrance.clickEnter();
      entrance.clickSkip();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(entrance.updates.length, updateCount, 'No post-cancel progress writes');
      assert.equal(entrance.animationCalls.length, animationCount, 'No post-cancel door animations');
      assert.equal(entrance.requestCount(), requestCount, 'No post-cancel RAF requests');
      assertReleased(entrance);
    });
  }
}

test('initial reduced-motion keeps the static entrance and enters immediately when clicked', () => {
  const entrance = createEntrance({ reduced: true });
  assert.equal(entrance.gate.open, true, 'The static entrance remains available');
  assert.equal(entrance.content.inert, true);
  assert.equal(entrance.pendingFrames(), 0);
  entrance.clickEnter();
  assertReleased(entrance);
  assert.equal(entrance.requestCount(), 0);
  assert.equal(entrance.progressSamples().length, 0);
  assert.equal(entrance.animationCalls.length, 0);
});
