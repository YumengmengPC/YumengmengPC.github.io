// 站内链接完整性检查：构建后扫描 public 全部 HTML，
// 校验每个站内引用（href/src）指向的文件真实存在，断链则构建失败。
//
// 覆盖面：文章互链、图片/样式/脚本引用、重定向页的跳转目标（指向 404 的
// 重定向会被抓出）。站内断链是本项目定义的"零容忍硬伤"：搜索引擎与分享
// 链接一旦带伤收录无法自愈。
//
// 已知边界：运行时 JS 动态请求的资源、纯锚点、外链、mailto/tel 不在检查范围。
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SITE_URL = String(
  (yaml.load(fs.readFileSync(path.join(__dirname, '..', '_config.yml'), 'utf8')) || {}).url || ''
).replace(/\/+$/, '');

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

// 归一成一个待查的文件路径；返回 null 表示站外/非检查对象
function toLocalTarget(raw) {
  let url = raw.trim();
  if (!url || url.startsWith('#') || url.startsWith('//')) return null;
  if (/^(mailto:|tel:|data:|javascript:)/i.test(url)) return null;
  if (/^https?:\/\//i.test(url)) {
    if (!SITE_URL || !url.toLowerCase().startsWith(SITE_URL.toLowerCase() + '/')) return null;
    url = url.slice(SITE_URL.length);
  }
  if (!url.startsWith('/')) return null; // 相对路径（本站生成物中不应出现）
  url = url.split('#')[0].split('?')[0];
  if (!url) return null;
  try {
    url = decodeURIComponent(url);
  } catch {
    return null; // 编码异常的 URL 交由人工判断
  }
  return url;
}

function exists(target) {
  const full = path.join(PUBLIC_DIR, target);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return true;
  // trailingSlash: true 下页面 URL 以 / 结尾 → public/<path>/index.html
  if (target.endsWith('/')) return fs.existsSync(path.join(full, 'index.html'));
  // 无尾斜杠的目录式 URL（如 /archives）：Vercel 会 308 到带斜杠版本，视为可达
  return fs.existsSync(path.join(full, 'index.html'));
}

const broken = [];
let checked = 0;

// 已知可接受的断链豁免（如实列出原因，清理时机写在注释里）：
// 隐藏文章（hexo-hide-posts）的标签/分类链接——插件只为可见文章生成标签页，
// 隐藏页面上这些 meta 链接必然 404。仅影响通过直链访问隐藏文章的访客。
// 若对应文章恢复可见，这些页面会真实生成，豁免可随手删除。
const ALLOWED = new Set([
  '/categories/CS224n学习笔记/', // CS224n lecture 1（hidden）
  '/tags/CS224n/',
  '/tags/自然语言处理/',
  '/tags/词向量/',
  '/categories/随笔/', // 随笔——开篇（hidden）
  '/tags/随笔/',
  '/404' // 主题 404 布局注入的自引用链接;Vercel 对任何 404 路径都以 public/404.html 兜底,实际可达
]);

for (const file of walk(PUBLIC_DIR)) {
  const html = fs.readFileSync(file, 'utf8');
  const refs = html.matchAll(/\b(?:href|src)="([^"]*)"/g);
  for (const [, raw] of refs) {
    const target = toLocalTarget(raw);
    if (!target) continue;
    checked++;
    if (ALLOWED.has(target)) continue;
    if (!exists(target)) {
      broken.push(`${path.relative(PUBLIC_DIR, file)}  →  ${raw}`);
    }
  }
}

if (broken.length) {
  console.error(`link-integrity-check: 发现 ${broken.length} 个站内断链，拒绝部署：`);
  console.error(broken.map((s) => '  ' + s).join('\n'));
  process.exit(1);
}

console.log(`link-integrity-check: ${checked} 个站内引用全部通过`);
