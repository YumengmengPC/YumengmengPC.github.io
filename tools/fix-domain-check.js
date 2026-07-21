// 修正 ShokaX 的防镜像检查，使其把 www 子域视作主域本身。
//
// 主题 siteInit.ts / refresh.ts 里的判断是严格相等：
//     if (window.location.origin !== CONFIG.hostname && ...) {
//       location.href = CONFIG.hostname; alert('检测到非法仿冒网站…')
//     }
// CONFIG.hostname 取自 _config.yml 的 url（https://yumengmeng.cn）。访问
// www.yumengmeng.cn 时两者不等，于是弹窗并跳向裸域；若服务端又把裸域重定向回 www，
// 就形成"弹窗—跳转—被弹回"的死循环，表现为点掉弹窗后页面纹丝不动。
//
// 这里把比较双方的 "://www." 归一成 "://"，令 www 与裸域互认；其余域名依旧会被拦下，
// 防镜像功能本身保留。
//
// 主题以 symlink 引入，不能改源码，因此在构建产物上打补丁。之所以不做成 hexo 的
// after_generate filter：hexo clean 后的首次构建存在竞态，该 filter 触发时文件尚未
// 落盘，补丁会静默失效——而 Vercel 恰好每次都是干净构建。放进 build 链才是确定的。
const fs = require('fs');
const path = require('path');

const JS_DIR = path.join(__dirname, '../public/js');
const STRIP = ".replace(/:\\/\\/www\\./,'://')";
// 压缩后变量名不固定（CONFIG 会被改写成 n 之类），故按结构匹配
const PATTERN = /window\.location\.origin!==(\w+)\.hostname/g;

if (!fs.existsSync(JS_DIR)) {
  console.error(`fix-domain-check: 找不到 ${JS_DIR}，跳过`);
  process.exit(0);
}

let patchedFiles = 0;
let patchedSites = 0;

for (const file of fs.readdirSync(JS_DIR)) {
  if (!file.endsWith('.js')) continue;
  const filePath = path.join(JS_DIR, file);
  const code = fs.readFileSync(filePath, 'utf8');

  const hits = code.match(PATTERN);
  if (!hits) continue;

  const fixed = code.replace(
    PATTERN,
    (_, cfg) => `window.location.origin${STRIP}!==${cfg}.hostname${STRIP}`
  );
  fs.writeFileSync(filePath, fixed);
  patchedFiles++;
  patchedSites += hits.length;
}

if (patchedFiles === 0) {
  // 主题升级后代码结构若变化，这里会静默失去保护，所以报错而非放过
  console.error('fix-domain-check: 未找到防镜像检查代码，主题结构可能已变，请复查');
  process.exit(1);
}

console.log(`fix-domain-check: 已放行 www 子域（${patchedFiles} 个文件，${patchedSites} 处）`);
