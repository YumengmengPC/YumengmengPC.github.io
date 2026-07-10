// 通过 shokax 的 theme_inject filter 注入自定义 Stylus 资源
// 主题在 generateBefore 事件调 execFilterSync("theme_inject", injects)(见 theme/scripts/plugin/lib/injects.js)
// injects.variable(StylusInject) 的文件会在 app.styl 中
//   `for $v in hexo-config('injects.variable') @import $v` 处被 @import,进入 CSS 编译
// (注意:app.styl 不读 injects.style,style 走 style.custom 单文件;多文件请用 injects.variable)
const themeVersion = require('hexo-theme-shokax/package.json').version;

hexo.extend.filter.register('theme_inject', function (injects) {
  // 设计 token + 全局无障碍降级(阶段 A)
  injects.variable.push('source/_data/design-tokens.styl');

  // 平滑滚动脚本注入(阶段 B) - 带版本号配合 vercel immutable 长缓存
  injects.bodyEnd.raw('smooth-script', `script(type="module" src="/js/smooth.js?v=${themeVersion}" defer)`);

  // 跨文档 View Transitions(阶段 C) 改用 scripts/view-transitions.js 的 after_render 注入
  // (stylus injects.variable 的 @view-transition 会被 css minify 按 browserslist 删除)
});
