# INSO / Purple Signal

陈振邦（因索）的个人主页。暗紫色、平面赛博风格，超大字排版、原创 SVG 线稿与编号项目目录。HTML + CSS + 原生 JavaScript，无运行时框架、3D 库或外部字体请求。

网站：https://hypertension42.github.io/inso-personal-site/

## 预览与更新

直接打开 `index.html`，或运行 `python3 -m http.server 8000` 后访问 http://localhost:8000。

- `index.html`：静态项目、个人介绍、详细记录。无 JavaScript 也可以阅读核心内容。
- `assets/site.css`：排版、暗紫/浅紫主题、响应式与 reduced-motion。
- `assets/app.js`：项目切换、键盘导航、详情弹窗、主题和复制邮箱。
- `assets/signal.svg`：独立绘制的生成式线稿，不含外部素材。
- `assets/content.mjs`：本轮整理的事实资料参考；发布页面以 `index.html` 为准，编辑内容时同步维护。

## 验证

```sh
python3 -m unittest discover -s tests -v
node tests/theme.test.cjs
```

使用 ego-browser 时，先创建一个任务空间，再运行 `EGO_SPACE_ID=<spaceId> ego-browser nodejs < tests/browser.js`。

浏览器检查：五个项目切换，方向键/Home/End，详情关闭与焦点恢复，邮箱复制，主题记忆，390/768/1440px 布局，reduced-motion。

GitHub Pages 从 `main` 根目录发布，推送后自动部署。

## 设计参照

参考 Antoine Wodniack 的 [主页](https://wodniack.dev/) 中的大字、平面生成艺术和编号项目索引。该作品获得 [2025 Webby Best Home Page](https://winners.webbyawards.com/2025/websites-and-mobile-sites/features-design/best-home-page/332383/aw-portfolio)。本项目独立实现，不使用其代码、字体或素材；配色和内容属于因索。
