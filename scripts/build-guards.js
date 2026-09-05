// 构建防线：让「静默失败」变成「构建失败」。
//
// 背景（2026-09 实际事故）：《Python-Pytorch》等两篇文章的 front-matter 里
// "categories:" 下挂了子项，一次批量编辑后变成非法 YAML。hexo 处理时只打了
// 一行 "ERROR Process failed" 日志就继续构建，两篇文章被静默排除出站点——
// 构建退出码为 0，Vercel 照常部署，直到人工对账才发现。
//
// 本文件两道防线：
//   1. before_generate：逐个解析 source/_posts 与 source/_data 的 YAML，
//      解析失败即抛错并指名文件（把 hexo 的"警告后放过"升级为"失败即停"）。
//   2. after_generate：磁盘文章数 vs 构建产物文章数对账，
//      无论什么原因（YAML、处理异常、插件行为）导致丢文章都会被抓到。
const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*\r?\n?/;

function* walk(dir, exts) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full, exts);
    else if (exts.includes(path.extname(entry.name))) yield full;
  }
}

// 有 front-matter 开头但闭合失败：hexo 会把整篇当正文处理或静默丢弃，一并拦下
function extractFrontMatter(raw) {
  if (!/^---[ \t]*\r?\n/.test(raw)) return { absent: true };
  const m = FM_RE.exec(raw);
  if (!m) return { unclosed: true };
  return { block: m[1] };
}

hexo.extend.filter.register('before_generate', function () {
  const errors = [];

  for (const file of walk(path.join(hexo.source_dir, '_posts'), ['.md'])) {
    const rel = path.relative(hexo.base_dir, file);
    const { absent, unclosed, block } = extractFrontMatter(fs.readFileSync(file, 'utf8'));
    if (absent) continue; // 无 front-matter 的 md hexo 能正常处理，不算错误
    if (unclosed) { errors.push(`${rel}: front-matter 以 --- 开头但未闭合`); continue; }
    try {
      jsYaml.load(block);
    } catch (e) {
      errors.push(`${rel}: front-matter YAML 解析失败 → ${String(e.message).split('\n')[0]}`);
    }
  }

  for (const file of walk(path.join(hexo.source_dir, '_data'), ['.yml', '.yaml'])) {
    const rel = path.relative(hexo.base_dir, file);
    try {
      jsYaml.load(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      errors.push(`${rel}: YAML 解析失败 → ${String(e.message).split('\n')[0]}`);
    }
  }

  if (errors.length) {
    throw new Error(
      'build-guards: 有文件会被静默排除出站点，拒绝构建：\n  ' + errors.join('\n  ')
    );
  }
});

hexo.extend.filter.register('after_generate', function () {
  const onDisk = [...walk(path.join(hexo.source_dir, '_posts'), ['.md'])].length;
  // all_posts 由 hexo-hide-posts 在 before_generate 注入（含隐藏文章）；
  // 插件被移除时回退到标准 posts
  const query = hexo.locals.get('all_posts') || hexo.locals.get('posts');
  const built = query.toArray().length;

  if (onDisk !== built) {
    throw new Error(
      `build-guards: source/_posts 下有 ${onDisk} 篇文章，构建只产出 ${built} 篇 —— 有文章被静默丢弃，拒绝部署`
    );
  }
});
