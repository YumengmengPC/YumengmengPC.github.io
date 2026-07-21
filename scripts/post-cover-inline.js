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

  // 用背景图而非 <img>：主题的图片查看器抓 ".md img:not(.emoji):not(.vemoji)"，
  // 会把命中的 img 包进三层带内联样式的 div（其中一层是 fit-content），把尺寸拉回
  // 图片原始大小，任何外部 CSS 都要靠 !important 才压得住。背景图它不认，尺寸就完全
  // 由 figure 说了算。顶部 banner 已用同一张图，此处走浏览器缓存，几乎不产生额外开销。
  // role + aria-label 保留无障碍语义。
  data.content =
    `<figure class="post-cover-inline" role="img" aria-label="${alt}"` +
    ` style="background-image:url(&quot;${escapeHtml(src)}&quot;)"></figure>` +
    data.content;
});

// 配套样式。只在页面真的含该元素时注入，避免给列表页等无关页面塞无用 CSS。
hexo.extend.filter.register('after_render:html', function (html) {
  if (!html.includes('post-cover-inline')) return html;

  const css = `<style>
.post-cover-inline {
  margin: 0 0 2em;
  width: 100%;
  height: 420px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
@media (max-width: 767px) {
  .post-cover-inline {
    height: 220px;
    margin-bottom: 1.5em;
    border-radius: 8px;
  }
}
</style>`;

  return html.replace('</head>', css + '</head>');
});
