const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const initialTheme = html.match(/<html[^>]*data-theme="([^"]+)"/)[1];
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function boot(saved, blocked = false) {
  const document = { documentElement: { dataset: { theme: initialTheme } } };
  vm.runInNewContext(bootstrap, {document, localStorage: {getItem() {if(blocked) throw new Error('blocked'); return saved;}}});
  return document.documentElement.dataset.theme;
}
assert.equal(boot(null), 'light-purple', 'First visit defaults to white-purple');
assert.equal(boot('unknown'), 'light-purple', 'Invalid preference uses default');
assert.equal(boot(null, true), 'light-purple', 'Blocked storage uses default');
assert.equal(boot('purple'), 'purple', 'Explicit dark choice is retained');
assert.equal(boot('light-purple'), 'light-purple');
assert.equal(boot('mono-dark'), 'purple');
assert.equal(boot('mono-light'), 'light-purple');
assert(html.includes('<meta name="theme-color" content="#fffefc">'));
console.log('PASS: default light theme, stored preferences and blocked storage');
