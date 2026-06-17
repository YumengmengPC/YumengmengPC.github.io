// 自定义封面图片显示位置
// 在 head 中注入 CSS，覆盖默认的 object-position
hexo.extend.filter.register('after_render:html', function(html, data) {
  const css = `<style>
/* 封面图片默认显示上方区域 */
.segments .cover img {
  object-position: 50% 15%;
}

/* lecture 2-7 保持居中 */
.segments .cover img[src*="cover_lecture2"],
.segments .cover img[src*="cover_lecture3"],
.segments .cover img[src*="cover_lecture4"],
.segments .cover img[src*="cover_lecture5"],
.segments .cover img[src*="cover_lecture6"],
.segments .cover img[src*="cover_lecture7"] {
  object-position: center;
}

/* lecture 17 往下调整 */
.segments .cover img[src*="cover_lecture17"] {
  object-position: 50% 40%;
}

/* lecture 11 下调 5% */
.segments .cover img[src*="cover_lecture11"] {
  object-position: 50% 25%;
}
</style>`;
  return html.replace('</head>', css + '\n</head>');
});
