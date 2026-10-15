// Run with ego-browser nodejs; reuses this task's browser space.
const assert = (await import('node:assert/strict')).default;
const spaceId = Number(globalThis.EGO_SPACE_ID);
assert(Number.isInteger(spaceId) && spaceId > 0, 'Set EGO_SPACE_ID to an active ego-browser task space');
const task = await taskSpace(spaceId);
const { pathToFileURL } = await import('node:url');
const pageUrl = globalThis.SITE_URL;
const page = task.page('p1');
async function dismissEntry() {
  await page.waitForFunction(()=>document.querySelector('#entry-gate').open);
  await page.click('#entry-skip');
  await page.waitForFunction(()=>!document.querySelector('#entry-gate').open);
}
await page.goto(pageUrl);
await page.waitForFunction(()=>document.documentElement.classList.contains('js'));
await dismissEntry();
await page.evaluate(()=>{ window.testErrors=[]; addEventListener('error',event=>window.testErrors.push(event.message)); });
for (const id of ['qizhu','keybank','posecare','education','wuhan']) {
  await page.click('#tab-'+id);
  assert.equal(await page.evaluate(()=>document.querySelector('[data-panel]:not([hidden])').dataset.panel),id);
  assert.equal(await page.evaluate(()=>document.querySelectorAll('[role="tab"][aria-selected="true"]').length),1);
  await page.click('[data-detail="'+id+'"]');
  assert.equal(await page.evaluate(()=>document.querySelector('#project-dialog').open),true);
  const source=await page.evaluate(()=>({hidden:document.querySelector('#dialog-source').hidden,href:document.querySelector('#dialog-source').getAttribute('href')}));
  const noSource=['qizhu','wuhan'].includes(id);
  assert.equal(source.hidden,noSource);
  assert.equal(source.href===null,noSource);
  await page.press('#dialog-close','Escape');
  assert.equal(await page.evaluate(()=>document.querySelector('#project-dialog').open),false);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.detail),id);
}
await page.focus('#tab-wuhan');await page.press('#tab-wuhan','ArrowDown');
assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-qizhu');
await page.press('#tab-qizhu','End');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-wuhan');
await page.press('#tab-wuhan','Home');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-qizhu');
for(const theme of ['purple','light-purple']) {
  if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme) await page.click('#theme-toggle');
  for(const width of [320,390,768,900,1440]) {
    await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<800});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),theme+' '+width+' overflow');
    await page.click('#tab-education');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-panel]:not([hidden])').length),1);
  }
}
await page.reload();await page.waitForFunction(()=>document.documentElement.classList.contains('js'));
await dismissEntry();
assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light-purple','Theme preference persists');
await page.click('#copy-email');assert(await page.evaluate(()=>document.querySelector('#toast').classList.contains('show')));
assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#toast')).color),'rgb(255, 255, 255)','Light toast has readable text');
await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.signal-art')).animationName),'none');
await page.cdp('Emulation.setScriptExecutionDisabled',{value:true});await page.reload();
// CSS without .js shows all five summaries; inspect via the accessibility snapshot because JS is disabled.
const snapshot=await page.snapshot({scope:'full_page'});
for(const name of ['AI 投标合规审查','Key Bank','PoseCare','T2 Education','StartLux']) assert(snapshot.includes(name),'No-JS content '+name);
await page.cdp('Emulation.setScriptExecutionDisabled',{value:false});await page.reload();
await page.waitForFunction(()=>document.documentElement.classList.contains('js'));
await dismissEntry();
if(await page.evaluate(()=>document.documentElement.dataset.theme)!=='purple') await page.click('#theme-toggle');
console.log('PASS: all projects, dialog sources, Escape/focus, keyboard wrapping, 10 theme/viewport combinations, theme persistence, clipboard feedback, reduced motion, no-JS content.');
