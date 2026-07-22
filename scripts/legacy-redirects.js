// 为历史遗留的失效 URL 生成重定向页，并守卫「路径含 + 号」这一类必然 404 的新链接。
//
// 背景（《Python+Pytorch 基础知识整理》一文的 404）：
// permalink 是 :year/:month/:day/:title/，而 :title 取的是文章目录名（slug），不是
// front-matter 的 title。该文原目录名叫 "Python+Pytorch基础知识整理"，于是生成的
// URL 里带一个字面 +。Vercel 对**路径**也套用查询串的解码规则，把裸 + 解成空格 —— 实测
// 用 + 替换 CS231n 文章路径中的空格同样返回 200，可见这是解码而非巧合。
// 结果：请求 .../Python+Pytorch基础知识整理/ 实际去找 "Python Pytorch基础知识整理"
// （空格）这个目录，磁盘上不存在，必然 404。
//
// 目录已改名为 Python-Pytorch...，新链接正常；但旧地址仍散落在浏览器缓存的首页 DOM、
// 历史记录、收藏夹、搜索引擎索引和分享出去的链接里，且不会自愈，所以这里补上重定向。
//
// 两条 alias 对应旧地址被解析出的两种落点：
//   - 空格版：浏览器/CDN 把裸 + 解码成空格后的实际请求路径（旧链接的主要落点）
//   - 加号版：地址栏里 + 被写成 %2B 时解码出的字面加号路径
// 静态托管没有服务端跳转可用，故落成 meta refresh + canonical 的静态页；canonical
// 让搜索引擎把权重归并到新地址。
const REDIRECTS = [
  [
    '2026/07/13/Python Pytorch基础知识整理/index/index.html',
    '/2026/07/13/Python-Pytorch基础知识整理/index/'
  ],
  [
    '2026/07/13/Python+Pytorch基础知识整理/index/index.html',
    '/2026/07/13/Python-Pytorch基础知识整理/index/'
  ]
];

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

hexo.extend.generator.register('legacy-redirects', function () {
  const siteUrl = this.config.url || '';
  return REDIRECTS.map(([path, target]) => ({ path, data: page(target, siteUrl) }));
});

// 防复发：文章目录名带 + 号 → 生成的 URL 必然 404（见顶部说明）。这种链接一旦发出去就
// 只能靠上面的重定向表补救，所以直接让构建失败，在改名阶段就拦下。
hexo.extend.filter.register('before_generate', function () {
  const offenders = this.locals.get('posts').toArray()
    .filter((post) => post.path.includes('+'))
    .map((post) => `  ${post.source} -> /${post.path}`);

  if (offenders.length) {
    throw new Error(
      '文章 URL 含 + 号，线上会被解码成空格而 404。请把文章目录名里的 + 改成 -：\n' +
      offenders.join('\n')
    );
  }
});
