// 全站技术图表暗色模式反色
// 自动匹配所有 lecture 中的技术图表图片（cs231n 官方笔记、本地提取的图表、论文图等）
// 过滤掉 UI 图片（avatar、favicon、cover 等）
hexo.extend.filter.register('after_render:html', function(html, data) {
  const css = `<style>
@media (prefers-color-scheme: dark) {
  /* cs231n 官方笔记图片（Lecture 2-7） */
  img[src*="cs231n.github.io/assets/"],
  /* 本地 PDF 提取的技术图表 */
  img[src*="/images/attention"],
  img[src*="/images/multihead"],
  img[src*="/images/self_attention"],
  img[src*="/images/transformer_block"],
  img[src*="/images/arxiv"],
  img[src*="/images/lec9_"] {
    filter: invert(0.9) hue-rotate(180deg);
  }
}
</style>`;
  return html.replace('</head>', css + '\n</head>');
});
