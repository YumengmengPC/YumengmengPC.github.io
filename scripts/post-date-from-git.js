// front-matter 没写 date 的文章，发布日期取该文件首次进入 git 的时间。
//
// 动机：在 Obsidian 里新建文件的时间往往远早于真正写完推送的时间，手填 date 要么忘、
// 要么填的是开写那天。不填 date 就让构建期自动补上「上线那天」。
//
// 为什么只补缺失的、不覆盖已有的：permalink 是 :year/:month/:day/:title/，date 就是
// URL 的一部分。现有 18 篇文章的 front-matter 日期和 git 首次提交时间普遍差几天
// （如 CS231n lecture 2：5-31 vs 6-03），一旦无条件用 git 时间覆盖，全站 URL 集体位移，
// 所有既有链接失效 —— 正是 scripts/legacy-redirects.js 在收拾的那类事故。
// 老文章都写了 date，因此走不到这里，URL 纹丝不动。
//
// Vercel 的浅克隆不影响本脚本：会走到这条路径的只有新文章，而新文章的提交必然落在
// 克隆深度之内。真取不到（未提交、构建环境无 .git）就静默让回 Hexo 默认的文件 mtime，
// 本地预览时即当前时间，符合直觉。
const { execFileSync } = require('child_process');
const fs = require('fs');
const moment = require('moment');

// front-matter 里是否显式写了 date。空值的 `date:` 视同没写，方便留着占位。
const hasExplicitDate = (file) => {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return true; // 读不到就别自作主张
  }
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!block) return true;
  return /^date[ \t]*:[ \t]*\S/m.test(block[1]);
};

// 文件首次被添加进 git 的时间。--follow 让改过名的文章仍能追到最初那次提交。
const firstCommitTime = (baseDir, file) => {
  let out;
  try {
    out = execFileSync(
      'git',
      ['log', '--follow', '--diff-filter=A', '--format=%cI', '--', file],
      { cwd: baseDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
  } catch {
    return null; // 没有 git、或不在仓库里
  }
  const lines = out.trim().split('\n').filter(Boolean);
  return lines.length ? lines[lines.length - 1] : null; // 最后一行 = 最早那次
};

// 必须写回数据库而不是改内存对象：warehouse 的 find() 每次由索引重新构造文档副本，
// 直接 post.date = ... 会被后续查询丢弃，permalink 仍按旧日期生成（实测踩过）。
// 改完再 invalidate 一次 locals，否则 generator 命中的是本 filter 里已缓存的旧 Query。
hexo.extend.filter.register('before_generate', async function () {
  const pending = [];

  for (const post of this.locals.get('posts').toArray()) {
    if (hasExplicitDate(post.full_source)) continue;

    const iso = firstCommitTime(this.base_dir, post.full_source);
    if (!iso) continue;

    pending.push([post, iso]);
  }

  if (!pending.length) return;

  for (const [post, iso] of pending) {
    await post.update({ date: moment(iso) });
    this.log.info(`post-date-from-git: ${post.source} -> ${moment(iso).format('YYYY-MM-DD HH:mm:ss')}`);
  }

  this.locals.invalidate();
});
