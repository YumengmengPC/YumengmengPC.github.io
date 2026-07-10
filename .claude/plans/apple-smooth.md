# 博客前端「苹果级丝滑」改造计划

## 决策（已与用户确认）
- **动画引擎**：轻量原生 = Lenis 平滑滚动 + 原生 View Transitions API + CSS scroll-driven animations + 复用现有 anime.js。不引入 GSAP/Framer。
- **改造范围**：动效丝滑层 + 视觉设计系统重做（配色/间距/圆角/阴影/字体 token 向苹果极简靠拢）。

## 关键技术前提（硬约束）
1. `themes/shokax` 是 **symlink → node_modules/hexo-theme-shokax**（git mode 120000，已验证）。**禁止直接改主题源码**——`npm install` 会覆盖，Vercel 构建时 `npm install` 重新拉取，改动不会部署生效。
2. 所有改造走 shokax 的注入机制（next-theme 风格，已确认 injects-point）：
   - **Stylus 注入** `injects.style`（StylusInject，push 项目根相对路径，在 `app.styl` 末尾 `@import`）→ 设计 token、配色覆盖。
   - **View 注入点** `head` / `bodyEnd`（`layout/_partials/layout.pug:24`、`:136` 调 `shokax_inject('head'|'bodyEnd')`）→ 注入 Lenis / View Transitions / PJAX 脚本引用。
   - 配置在 `_config.shokax.yml`，注入内容放 `source/_data/*.styl`，注入注册写 `scripts/inject.js`（`hexo.extend.filter.register('theme_inject', injects => {...})`）。
3. 项目已有 `scripts/` 的 `after_render:html` filter 模式（cover-position.js / dark-mode-images.js），可继续用于小段内联 CSS。
4. 改 TS/Styl 后必须 `hexo clean && hexo g`（esbuild 实时打包主题 JS，产物不进 git）。

## 现状基线（已具备，不重复造）
anime.js fork（`library/anime.ts`）· IntersectionObserver 进场动画（`.slide-up-big-in` + `.show`）· 毛玻璃导航 + 滚动方向显隐 · 波浪视差 · 3D 翻转卡片 · 字体异步加载 · 图片 `loading=lazy/decoding=async` · 首屏图 `preload+fetchpriority=high` · PWA · esbuild code-splitting · `content-visibility:auto`。

**主要缺口**：无页面切换过渡（`.pjax` 容器标记在但无任何拦截逻辑，每次全刷新白屏）= 最大短板 · 无惯性滚动 · 无滚动驱动动画 · 无动效 token（`--ease-*`/`--duration-*`/`--space-*`/`--radius-*`/`--shadow-*`）· 无 `prefers-reduced-motion` 降级 · Google Fonts 国内慢 · 图片无 blur-up · Vercel 无 Cache-Control。

---

## 阶段 A — 设计 token 与注入地基
**目标**：建立统一缓动/时长/间距/圆角/阴影 token，为所有动画提供「苹果曲线」；全局无障碍降级。
1. 新增 `source/_data/design-tokens.styl`，定义 `:root`：
   - 缓动：`--ease-apple: cubic-bezier(.4,0,.2,1)`、`--ease-out-expo: cubic-bezier(.16,1,.3,1)`（入场）、`--ease-spring: cubic-bezier(.34,1.56,.64,1)`
   - 时长：`--duration-fast:.15s` `--base:.3s` `--slow:.6s` `--slower:1s`
   - 间距：`--space-1..8`（4px 基数）· 圆角：`--radius-sm/md/lg/xl/pill` · 阴影：`--shadow-sm/md/lg/xl`（多层柔和投影，替换单一 `--box-bg-shadow`）
   - 字号模块化尺度 `--step-0..5`
2. 新增 `scripts/inject.js`：`hexo.extend.filter.register('theme_inject', injects => { injects.style.push('source/_data/design-tokens.styl') })` —— 在 `app.styl` 末尾注入，CSS 自定义属性后定义覆盖先定义，可安全覆盖主题默认。
3. 全局 `prefers-reduced-motion` 降级（design-tokens.styl 内）：`@media (prefers-reduced-motion: reduce){ *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important} }`
4. **验证**：`hexo clean && hexo g && hexo s`，DevTools 检查 `:root` 是否含新 token、`page.css` 是否注入。

## 阶段 B — 平滑惯性滚动（Lenis）
**目标**：桌面端还原 iOS 带惯性、带缓动的丝滑滚动。
1. `npm i -D lenis esbuild`（esbuild 主题已在用，但项目需显式声明）。
2. 新增 `source/js/_smooth/index.ts`：初始化 `new Lenis({ lerp:.1, smoothWheel:true })` + RAF 驱动；`prefers-reduced-motion` 时跳过；移动端（`pointer:coarse` 或 iOS）默认不启用（原生已有惯性）；接管现有 `pageScroll()` 回顶逻辑改走 `lenis.scrollTo(0)`。
3. 打包：`package.json` 的 `build` → `esbuild source/js/_smooth/index.ts --bundle --format=esm --minify --outfile=source/js/smooth.js && hexo generate`；同步把 `vercel.json` 的 `buildCommand` 改为 `npm run build`。
4. 注入：`scripts/inject.js` 经 `bodyEnd` 注入 `<script type="module" src="/js/smooth.js" defer></script>`。
5. **验证**：滚动有惯性、无卡顿；reduced-motion / 移动端恢复正常原生滚动。

## 阶段 C — 页面无白屏切换（View Transitions + 轻量 PJAX）★丝滑核心
**目标**：点击文章链接不再白屏全刷新，而是平滑过渡，还原苹果 SPA 体验。
1. 新增 `source/js/_smooth/transition.ts`（并入 smooth.js bundle）：
   - 拦截同源 `<a>`（排除外链 / `target=_blank` / 带修饰键 / 带 hash）。
   - `document.startViewTransition(() => swap())`：fetch 目标页 → 解析 → 替换 `#main`、`#imgs`、`<title>`、`#sidebar`、`body` class、`<head>` 关键 meta。
   - 浏览器不支持 VT API 时降级为普通导航（渐进增强，零破坏）。
2. PJAX 后需重新初始化主题的图片查看器/代码高亮/懒加载——读 `siteInit.ts`/`refresh.ts` 导出确认可调用的刷新钩子（阶段实现时定位），或 dispatch 模拟 `DOMContentLoaded`。**这是本阶段最需小心的点**。
3. CSS（design-tokens.styl）：`::view-transition-old/new` 配 fade + 微位移，用 `--ease-out-expo` / `--duration-slow`。
4. **验证**：首页点文章无白屏、平滑过渡；返回正常；评论/代码高亮/图片查看在新页正常；控制台无报错。

## 阶段 D — 滚动驱动入场动画
**目标**：元素随滚动优雅进场（fade+上移+stagger），而非一次性全显。
1. 用 CSS scroll-driven animations 渐进增强：对 `.segments .item`、文章 `h2/h3`、`figure` 加 `animation: fade-up linear both; animation-timeline: view(); animation-range: entry 0% cover 30%`。
2. **降级关键**：scroll-driven 不支持的浏览器，元素必须默认可见——用 `@supports (animation-timeline: view())` 守卫，仅支持的才设初始 `opacity:0`；其余走现有 IntersectionObserver `.slide-up-big-in`，绝不能卡在 `opacity:0`。
3. stagger：卡片列表 `:nth-child(n)` 递增 `animation-delay`。
4. 写入 `source/_data/scroll-anim.styl`（走 `injects.style`）。
5. **验证**：滚动元素渐次浮现；旧浏览器仍正常显示；reduced-motion 下直接显示。

## 阶段 E — 视觉重做（向苹果极简靠拢）
**目标**：保留内容结构，重做配色/间距/圆角/阴影/字体 token。
1. 在 `design-tokens.styl` 覆盖 `:root` 颜色（后定义覆盖 `_colors.styl`）：
   - 主题色从粉红 `--color-red:#e9546b` 调整为更克制的苹果蓝/中性色（可选保留粉青作 hover accent）。
   - 背景纯白/近黑、文字高对比、阴影改多层柔和。
2. 圆角统一 `--radius-*`、间距统一 `--space-*`，覆盖高频组件（卡片、按钮、nav、文章容器）的散落字面量。
3. 字体：`_config.shokax.yml` 关闭重 Google Fonts 依赖（`font.loadFromGoogle` 精简或设 false），首屏用系统字体栈（已是 `-apple-system/PingFang SC`），消除 FOUT 与国内慢；装饰字体 Fredericka 仅保留 logo 或替换。
4. 暗色模式：同步重写 `[data-theme="dark"]` token。
5. **验证**：视觉更克制精致；明暗切换正常；无旧色残留。

## 阶段 F — 性能与收尾
1. `vercel.json`：为 `/js/*` `/css/*` `/images/*` `/assets/*` 加 `Cache-Control: public, max-age=31536000, immutable`（产物带 `?v=` 哈希，可 immutable）。
2. 图片 blur-up 渐进加载（可选）：封面图加低质量占位 / CSS blur 过渡；WebP 构建期转换（可选，列后续）。
3. 复查 Lenis/PJAX/scroll-anim 均有 `prefers-reduced-motion` 降级（阶段 A 全局兜底 + 各处局部判断）。
4. Lighthouse 跑分复查（性能/可访问性）；移动端真机验证。

---

## 实施顺序与里程碑
A → B → C → D → E → F。每阶段独立可验证、**全部可回滚**（均在注入层，删 `source/_data/design-tokens.styl` + `scroll-anim.styl` + `scripts/inject.js` + `source/js/_smooth/` + 还原 `package.json`/`vercel.json` 即恢复原状）。

**建议分批交付**：先 A+B 让你感受滚动与 token，再 C 验收页面切换，再 D/E/F。每个阶段完成后本地 `hexo s` 验收，确认满意再进下一阶段，避免一次性大改难定位问题。

## 不做什么（边界）
- 不改 `themes/shokax` 源码（symlink，会被 npm 覆盖）。
- 不引入 GSAP/Framer（用户已选轻量原生）。
- 不重构 Hexo 生成管线与文章内容。
- 视觉重做只动 token/覆盖层，不重写主题组件结构。

## 风险点
- **PJAX 重新初始化主题 JS**（阶段 C）：主题 `siteInit.ts` 仅 DOMContentLoaded 跑一次，PJAX 后需手动触发图片查看器/代码高亮/懒加载/评论的重初始化。需读源码定位钩子，可能需调整接入方式。若过复杂，可退化为「仅 View Transitions 跨文档 API（`@view-transition`）」不做 PJAX，先拿过渡效果。
- **CSS scroll-driven 兼容性**（阶段 D）：Chrome/Edge 支持，Safari/Firefox 较新版本才支持。靠 `@supports` 守卫降级，不影响可用性。
- **Lenis 与主题现有 `pageScroll`/滚动监听冲突**（阶段 B）：需确认 Lenis 不破坏 nav 显隐/波浪视差/回到顶部的滚动判断，必要时对接其 `scroll` 事件。
