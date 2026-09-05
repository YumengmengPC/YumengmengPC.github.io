// 为「按分类归档子文件夹」前的旧 URL 生成重定向页。
//
// 背景：_posts 按分类整理成二级目录（_posts/CS231n/<文章>/index.md）后，Hexo 会把
// 子目录名拼进 permalink（:title 取的是相对 _posts 的完整路径，不只是文章目录名），
// 全站 URL 从 /2026/06/16/<文章>/ 变成 /2026/06/16/CS231n/<文章>/。旧地址散落在
// 搜索引擎索引、收藏夹、站内互链（文章里引用其他文章的绝对链接）中，不会自愈。
//
// 与 legacy-redirects.js 的手工表不同，这里的映射是纯机械的：新旧路径只差「日期后
// 面多出的分类目录段」，直接从 post.source 推导，新增文章自动覆盖，无需登记。
// 静态托管没有服务端跳转，沿用 meta refresh + canonical 的静态页方案。
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

const page = (target, siteUrl) => {
  const abs = siteUrl.replace(/\/+$/, '') + target;
  const attr = escapeHtml(encodeURI(abs));
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>页面已迁移</title>
<link rel="canonical" href="${attr}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${attr}">
<script>location.replace(${JSON.stringify(encodeURI(abs))});</script>
</head>
<body><p>本页已迁移至 <a href="${attr}">${attr}</a></p></body>
</html>
`;
};

hexo.extend.generator.register('category-dir-redirects', function () {
  const siteUrl = this.config.url || '';
  const out = [];

  // 走 all_posts 而不是 posts：hexo-hide-posts 会把 hidden 文章从 locals.posts
  // 里剔掉，而它们同样存在需要重定向的旧地址（如 CS224n lecture 1）
  for (const post of this.locals.get('all_posts').toArray()) {
    // 只处理归了分类子目录的文章：_posts/<分类>/<文章>/index.md
    const m = /^_posts\/([^/]+)\/[^/]+\/index\.md$/.exec(post.source);
    if (!m) continue;

    // post.path 形如 "2026/06/16/<分类>/<文章>/index/"，删掉分类段即旧地址
    const segs = post.path.split('/');
    const i = segs.indexOf(m[1]);
    if (i === -1) continue;
    const oldPath = segs.slice(0, i).concat(segs.slice(i + 1)).join('/');

    out.push({ path: oldPath, data: page('/' + post.path, siteUrl) });
  }

  if (out.length) {
    this.log.info(`category-dir-redirects: ${out.length} 旧地址重定向页已生成`);
  }
  return out;
});
