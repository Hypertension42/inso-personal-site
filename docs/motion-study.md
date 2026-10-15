# Motion study — 2026-10-15

用户要求：在上一轮暗紫色平面主页基础上，研究官方获奖作品源码，补足动画和交互，还保持轻量、可读和手机可用。

参考：[Antoine Wodniack / AW-2025-Portfolio](https://github.com/AntoineW/AW-2025-Portfolio)。官方源码单独保存在 `/Users/miyakostella/Downloads/aw-portfolio-reference`，依赖安装使用 `npm ci --ignore-scripts`，Astro 本地开发服务和静态构建均已启动/通过。

研究了 SHero、AWaves、ASeparator、SWork、SCTA：原作通过错时字形揭示、SVG 弹簧波纹、二进制翻动、滚动遮罩和圆形 CTA 扩张形成节奏。当前实现独立编写原生 JS/WAAPI/SVG，不复制原作品牌、字体、图片、项目或视频，不添加 Astro、GSAP 或 Lenis 到因索的网站。

实现目标：
- INSO 字形以裁切窗口逐字滑入，可重播；桌面悬停触发单字轮换。
- 全宽线场随指针速度局部弯曲并回弹；线场进场描边。
- 编码分隔带局部翻动，区块滚动揭示，项目切换标题和示意图错时入场。
- 联系入口圆形扩张和涟漪，邮箱始终可直接点击。
- 提供动画开关；prefers-reduced-motion 下使用静态完成态；离屏和后台停止持续更新。
- 原有主题、项目详情、键盘切换、链接与事实保持。

验证：原有 Python/Node 测试；浏览器验证指针改变路径、关闭动画/减少动态后持续帧停止、重播、快速切换项目、手机无溢出，以及公共部署的资源一致性。

本地验收：官方参考 Astro 构建成功，production preview 实际渲染；独立审查未发现需修复问题。6 项 Python 检查、Node 主题测试、原有浏览器回归与动效专项通过。动效专项检查了路径变化、暂停帧冻结、离屏停止、项目快速切换、联系区键盘焦点、系统减少动态偏好和五档宽度。
