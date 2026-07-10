// 跨文档 View Transitions - 阶段 C
// 注:走 after_render 注入 <style> 而非 stylus injects.variable。
// 原因:hexo minify(autoprefixer/cssnano) 按 browserslist targets ">= 0.5%" 删除
// 低支持率的 @view-transition at-rule;stylus 虽正确透传,但产物 CSS 经 minify 后被删。
// after_render 注入的内联 <style> 不经 CSS minify,可完整保留。
hexo.extend.filter.register('after_render:html', function (html, data) {
  const css = `<style>
@view-transition { navigation: auto; }
::view-transition-old(root){ animation: vt-fade-out var(--duration-page) var(--ease-out-expo) both; }
::view-transition-new(root){ animation: vt-fade-in var(--duration-page) var(--ease-out-expo) both; }
@keyframes vt-fade-out { to { opacity: 0; } }
@keyframes vt-fade-in { from { opacity: 0; transform: translateY(12px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce){ @view-transition { navigation: none; } }
</style>`;
  return html.replace('</head>', css + '\n</head>');
});
