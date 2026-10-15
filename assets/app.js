const root = document.documentElement;
const themeButton = document.querySelector('#theme-toggle');
function updateTheme(mode, save = false) {
  root.dataset.theme = mode;
  const light = mode === 'light-purple';
  themeButton.setAttribute('aria-pressed', String(light));
  themeButton.setAttribute('aria-label', light ? '切换到暗紫色主题' : '切换到浅色主题');
  document.querySelector('meta[name="theme-color"]').content = light ? '#f7f3fc' : '#090611';
  if (save) { try { localStorage.setItem('inso-signal-theme', mode); } catch (_) {} }
}
updateTheme(root.dataset.theme);
themeButton.addEventListener('click', () => updateTheme(root.dataset.theme === 'purple' ? 'light-purple' : 'purple', true));

const tabs = [...document.querySelectorAll('[data-project]')];
const panels = [...document.querySelectorAll('[data-panel]')];
function selectProject(id, focus = false) {
  const target = tabs.find(tab => tab.dataset.project === id);
  if (!target) return;
  tabs.forEach(tab => {
    const active = tab === target;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach(panel => {
    const active = panel.dataset.panel === id;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  if (focus) {
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectProject(tab.dataset.project));
  tab.addEventListener('keydown', event => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next;
    if (step) next = (index + step + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectProject(tabs[next].dataset.project, true);
  });
});
// Hide inactive content only after controls are installed. Without JS, every project remains readable.
selectProject('qizhu');
root.classList.add('js');

const dialog = document.querySelector('#project-dialog');
const title = document.querySelector('#dialog-title');
const source = document.querySelector('#dialog-source');
let opener;
document.querySelectorAll('[data-detail]').forEach(button => button.addEventListener('click', () => {
  const id = button.dataset.detail;
  const panel = panels.find(item => item.dataset.panel === id);
  if (!panel) return;
  const project = { id, title: panel.querySelector('h3').textContent, index: document.querySelector('#tab-' + id + ' .project-index').textContent, url: panel.querySelector('.project-actions a')?.href };
  opener = button;
  title.textContent = project.title;
  document.querySelector('#dialog-label').textContent = 'PROJECT FILE / ' + project.index;
  document.querySelectorAll('[data-detail-body]').forEach(body => { body.hidden = body.dataset.detailBody !== project.id; });
  source.hidden = !project.url;
  if (project.url) source.href = project.url;
  else source.removeAttribute('href');
  dialog.showModal();
  document.querySelector('.dialog-scroll').scrollTop = 0;
}));
document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));

const toast = document.querySelector('#toast');
let toastTimer;
function notify(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}
document.querySelector('#copy-email').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('fxcasio998@gmail.com'); notify('邮箱已复制'); }
  catch (_) { notify('请选中邮箱地址复制：fxcasio998@gmail.com'); }
});
document.querySelector('#year').textContent = String(new Date().getFullYear());
