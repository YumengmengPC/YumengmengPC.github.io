// 视觉重做覆盖 - 阶段 E
// after_render 注入内联 <style>(在 page.css 之后,覆盖主题默认)。
// 向苹果极简靠拢:更干净的背景/文字、柔和多层阴影、统一圆角、hover 苹果缓动。
// 保留粉红强调色作品牌辨识(--color-red);如需苹果蓝强调,改 --primary-color: #0071e3。
hexo.extend.filter.register('after_render:html', function (html, data) {
  const css = `<style>
:root {
  --body-bg-shadow: #f5f5f7;
  --box-bg-shadow: rgba(0,0,0,.06);
  --text-color: #1d1d1f;
}
[data-theme="dark"] :root {
  --body-bg-shadow: #1d1d1f;
  --box-bg-shadow: rgba(0,0,0,.4);
  --text-color: #f5f5f7;
}
/* 卡片:统一大圆角 + 柔和多层阴影 + hover 苹果缓动 */
.segments > .item,
.cards .item {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: box-shadow var(--duration-base) var(--ease-apple),
              transform var(--duration-base) var(--ease-apple);
}
.segments > .item:hover,
.cards .item:hover {
  box-shadow: var(--shadow-lg);
}
/* 按钮:药丸圆角 */
.btn {
  border-radius: var(--radius-pill);
}
</style>`;
  return html.replace('</head>', css + '\n</head>');
});
