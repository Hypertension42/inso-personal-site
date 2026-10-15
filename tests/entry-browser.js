// Run through tests/run_browser.py in the existing task space.
const assert = (await import('node:assert/strict')).default;
const task = await taskSpace(Number(globalThis.EGO_SPACE_ID));
const page = task.page('p1');
let loadCount = 0;
async function reduced(value) {
  await page.cdp('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value}]});
  await page.waitForFunction(value=>matchMedia('(prefers-reduced-motion: reduce)').matches===(value==='reduce'),value);
}
async function load(hash='') {
  await page.goto(globalThis.SITE_URL+'?entry-test='+Date.now()+'-'+(++loadCount)+hash);
  await page.waitForFunction(()=>document.querySelector('#entry-gate').open && window.insoMotion);
}
async function opened(kind, focus='hero-title') {
  await page.waitForFunction(()=>!document.querySelector('#entry-gate').open);
  assert.deepEqual(await page.evaluate(()=>({
    hidden:document.querySelector('#entry-gate').hidden,
    inert:document.querySelector('#site-content').inert,
    locked:document.documentElement.classList.contains('entry-active') || document.documentElement.classList.contains('entry-pending'),
    kind:document.documentElement.dataset.entryOpened,
    focus:document.activeElement.id,
  })),{hidden:true,inert:false,locked:false,kind,focus});
}
await reduced('no-preference');
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await load();
assert.deepEqual(await page.evaluate(()=>({inert:document.querySelector('#site-content').inert,focus:document.activeElement.id,frames:insoMotion.debug().frames})),{inert:true,focus:'entry-enter',frames:0});
assert.equal(await page.evaluate(()=>document.querySelector('#entry-progress').getAttribute('aria-valuenow')),'0');
await page.press('#entry-enter','Tab');
assert.equal(await page.evaluate(()=>document.activeElement.id),'entry-skip');
await page.keyboard.press('Tab');
assert(await page.evaluate(()=>!document.activeElement.closest('#site-content')),'Tab stays within modal');
await page.focus('#entry-enter');
await page.evaluate(()=>{
  window.progressHistory=[];
  new MutationObserver(()=>window.progressHistory.push(Number(document.querySelector('#entry-progress').getAttribute('aria-valuenow')))).observe(document.querySelector('#entry-progress'),{attributes:true,attributeFilter:['aria-valuenow']});
});
await page.press('#entry-enter','Enter');
await page.waitForFunction(()=>Number(document.querySelector('#entry-progress').getAttribute('aria-valuenow'))>0);
assert(await page.evaluate(()=>document.querySelector('#entry-gate').classList.contains('is-charging') && document.querySelector('#entry-enter').disabled),'Click starts sequence');
assert.equal(await page.evaluate(()=>document.querySelector('.gate-panel').getAnimations().length),0,'Door waits for progress');
await page.waitForFunction(()=>document.querySelector('#entry-gate').classList.contains('is-opening'));
const progressHistory=await page.evaluate(()=>window.progressHistory);
assert(progressHistory.length>1 && progressHistory.at(-1)===100,'Progress completes before opening');
assert(progressHistory.every((value,index)=>value>=0 && value<=100 && (!index || value>=progressHistory[index-1])),'Progress is bounded and monotonic');
await page.evaluate(()=>{
  // Repeated activation must leave exactly one animation per panel.
  document.querySelector('#entry-enter').dispatchEvent(new Event('click'));
  for (const panel of document.querySelectorAll('.gate-panel')) {
    for (const animation of panel.getAnimations()) { animation.pause(); animation.currentTime=750; }
  }
  for (const element of document.querySelectorAll('.gate-center, .gate-label')) element.getAnimations().forEach(animation=>animation.finish());
});
const transforms=await page.evaluate(()=>[...document.querySelectorAll('.gate-panel')].map(panel=>{
  const matrix=new DOMMatrix(getComputedStyle(panel).transform);
  return {x:matrix.m41,y:matrix.m42,count:panel.getAnimations().length};
}));
for(const [index,[x,y]] of [[-1,-1],[1,-1],[-1,1],[1,1]].entries()){
  assert.equal(transforms[index].count,1);
  assert(transforms[index].x*x>0 && transforms[index].y*y>0,'Panel opens toward its corner');
}
assert(Math.abs(Math.abs(transforms[0].x)-Math.abs(transforms[3].x))<1,'Horizontal symmetry');
assert(Math.abs(Math.abs(transforms[0].y)-Math.abs(transforms[3].y))<1,'Vertical symmetry');
await page.screenshot({path:'/tmp/inso-gate-midpoint.png'});
await page.evaluate(()=>document.querySelectorAll('.gate-panel').forEach(panel=>panel.getAnimations().forEach(animation=>animation.play())));
await opened('enter');
await page.waitForFunction(()=>insoMotion.debug().frames>5);
await load();await page.click('#entry-skip');await opened('skip');
assert.equal(await page.evaluate(()=>document.getAnimations().some(animation=>animation.effect?.target?.hasAttribute('data-track') && animation.effect.getTiming().duration===1050)),false,'Skip omits glyph entrance');
await load();await page.press('#entry-enter','Escape');await opened('skip');
await load();await page.click('#entry-enter');await page.click('#entry-skip');await opened('skip');
const skippedProgress=await page.evaluate(()=>document.querySelector('#entry-progress').getAttribute('aria-valuenow'));
await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
assert.equal(await page.evaluate(()=>document.querySelector('#entry-progress').getAttribute('aria-valuenow')),skippedProgress,'Skip cancels progress updates');
await reduced('reduce');await load();await page.click('#entry-enter');await opened('skip');
assert.equal(await page.evaluate(()=>document.querySelector('.gate-panel').getAnimations().length),0);
await reduced('no-preference');await load();await page.click('#entry-enter');
await reduced('reduce');await opened('skip');
await reduced('no-preference');await load();await page.click('#entry-enter');
await page.waitForFunction(()=>document.querySelector('#entry-gate').classList.contains('is-opening'));
await reduced('reduce');await opened('skip');
await reduced('no-preference');await load('#work');await page.click('#entry-skip');await opened('skip','work');
assert(await page.evaluate(()=>Math.abs(document.querySelector('#work').getBoundingClientRect().top)<150),'Deep link is restored');
for(const width of [320,390]){
  await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  await load();
  assert(await page.evaluate(()=>{
    const button=document.querySelector('#entry-enter').getBoundingClientRect();
    return button.left>=0 && button.right<=innerWidth && document.documentElement.scrollWidth<=innerWidth;
  }),'Mobile entrance fits '+width);
  await page.click('#entry-enter');await opened('enter');
}
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
console.log('PASS: monotonic 000→100% progress before opening, cancellation, modal/focus, paused background, symmetric four-panel opening, repeated activation, keyboard entry, skip/Escape, reduced-motion before/during progress and opening, deep link and mobile entrance.');
