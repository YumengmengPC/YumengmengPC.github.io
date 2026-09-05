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

  // 站点总访问量/访客数(不蒜子),注入页脚 status 区(footer.pug 的 shokax_inject('status'))。
  // 每篇文章的访问量走 Waline(waline.pageview),不蒜子只补全站聚合 PV/UV。
  // 容器初始 display:none,由不蒜子脚本取到数据后自动显示;取不到就保持隐藏,不阻塞页面。
  if (hexo.theme.config.busuanzi?.enable) {
    injects.status.raw('busuanzi-status', `
span(id="busuanzi_container_site_pv" class="post-meta-item" style="display:none")
    span(class="post-meta-item-icon")
        i(class="ic i-eye")
    != "总访问量 "
    span(id="busuanzi_value_site_pv")
span(id="busuanzi_container_site_uv" class="post-meta-item" style="display:none")
    span(class="post-meta-item-icon")
        i(class="ic i-user")
    != "访客数 "
    span(id="busuanzi_value_site_uv")
script(async src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js")
`);
  }
});
