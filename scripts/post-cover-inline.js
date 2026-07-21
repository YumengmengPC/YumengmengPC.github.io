// 在文章正文开头插入一张封面图（顶部 banner 的封面由 post-cover-banner.js 负责，两者并存）。
//
// 走 after_post_render 改写 post.content，图片因此落在
// layout/_partials/post/post.pug 的 div.body.md[itemprop=articleBody] 内、正文最前面。
//
// cover 取自 front-matter，值形如 "images/cover_lecture17.webp"。主题的 _image_url
// helper 是 url_for(statics + img)，statics 为 "/"、post_asset_folder 为 false，
// 所以这里补一个前导斜杠即可，外链（http/协议相对）原样保留。
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

hexo.extend.filter.register('after_post_render', function (data) {
  if (data.layout !== 'post' || !data.cover) return;

  const cover = String(data.cover);
  const src = /^(https?:)?\/\//.test(cover) ? cover : '/' + cover.replace(/^\/+/, '');
  const alt = escapeHtml(data.title || '') + ' 封面';

  // 用 <img> 而非背景图：封面要按原图比例完整显示、不裁切，高度得随宽度自适应，
  // 背景图做不到这点（contain 会留白，cover 会裁）。代价是主题的图片查看器会接管它，
  // 见下方 CSS 里的说明。顶部 banner 已用同一张图，此处走浏览器缓存。
  data.content =
    `<figure class="post-cover-inline">` +
    `<img src="${escapeHtml(src)}" alt="${alt}" loading="eager" decoding="async" fetchpriority="high">` +
    `</figure>` +
    data.content;
});

// 配套样式。只在页面真的含该元素时注入，避免给列表页等无关页面塞无用 CSS。
hexo.extend.filter.register('after_render:html', function (html) {
  if (!html.includes('post-cover-inline')) return html;

  const css = `<style>
.post-cover-inline {
  margin: 0 0 2em;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  line-height: 0;
}
/* 主题的图片查看器匹配 ".md img:not(.emoji):not(.vemoji)"，会把命中的图包进三层
   带内联样式的 div，其中一层是 width:fit-content，把尺寸钉回图片原始大小。内联样式
   压过任何选择器，只有作者 !important 能盖过它——所以这里的 !important 是必需的，
   不是保险起见。作用范围限定在本 figure 内，不影响正文其他配图。 */
.post-cover-inline div {
  width: 100% !important;
  height: auto !important;
}
.post-cover-inline img {
  display: block;
  width: 100% !important;
  height: auto !important;
  object-fit: unset !important;
}
@media (max-width: 767px) {
  .post-cover-inline {
    margin-bottom: 1.5em;
    border-radius: 8px;
  }
}
</style>`;

  return html.replace('</head>', css + '</head>');
});
