const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const initialTheme = html.match(/<html[^>]*data-theme="([^"]+)"/)[1];
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function boot(saved, blocked = false) {
  const document = { documentElement: { dataset: { theme: initialTheme }, classList: { add() {} } } };
  vm.runInNewContext(bootstrap, {document, localStorage: {getItem() {if(blocked) throw new Error('blocked'); return saved;}}});
  return document.documentElement.dataset.theme;
}
assert.equal(boot(null), 'purple', 'First visit defaults to dark-purple');
assert.equal(boot('unknown'), 'purple', 'Invalid preference uses default');
assert.equal(boot(null, true), 'purple', 'Blocked storage uses default');
assert.equal(boot('purple'), 'purple', 'Explicit dark choice is retained');
assert.equal(boot('light-purple'), 'light-purple');
assert.equal(boot('mono-light'), 'purple', 'Unrecognized old theme is not a new preference');
assert(html.includes('<meta name="theme-color" content="#090611">'));
console.log('PASS: default dark theme, stored preferences and blocked storage');
