// 滚动驱动入场动画 - 阶段 D
// CSS scroll-driven animations: 元素随滚动进入视口时淡入+上移(苹果式)。
// 走 after_render 注入 <style>,因 css minify 会按 browserslist 删除 animation-timeline。
// @supports 守卫:不支持(scroll-driven)的浏览器降级为元素直接显示(默认 opacity:1),绝不卡 opacity:0。
// 仅作用于文章正文标题(.post .body h2/h3/figure);首页卡片已有 IO 进场,不碰避免冲突。
hexo.extend.filter.register('after_render:html', function (html, data) {
  const css = `<style>
@supports (animation-timeline: view()) {
  .post .body h2,
  .post .body h3,
  .post .body figure {
    animation: sd-fade-up var(--duration-slow) var(--ease-out-expo) both;
    animation-timeline: view();
    animation-range: entry 0% cover 40%;
  }
}
@keyframes sd-fade-up {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>`;
  return html.replace('</head>', css + '\n</head>');
});
