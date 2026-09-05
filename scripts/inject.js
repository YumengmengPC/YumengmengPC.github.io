// 通过 shokax 的 theme_inject filter 注入自定义 Stylus 资源
// 主题在 generateBefore 事件调 execFilterSync("theme_inject", injects)(见 theme/scripts/plugin/lib/injects.js)
// injects.variable(StylusInject) 的文件会在 app.styl 中
//   `for $v in hexo-config('injects.variable') @import $v` 处被 @import,进入 CSS 编译
// (注意:app.styl 不读 injects.style,style 走 style.custom 单文件;多文件请用 injects.variable)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// smooth.js 的缓存指纹:vercel 对 /js/* 下发一年 immutable 缓存,若 ?v= 用主题
// 版本号(几乎不变),改 _smooth 源码后 URL 不变,老访客一年内拿旧文件。
// 改用构建产物内容哈希——esbuild 在本 build 链里先于 hexo generate 执行,
// 此处读到的 smooth.js 已是最新产物;内容变 → URL 变 → 缓存天然失效。
let smoothV = 'dev';
try {
  smoothV = crypto
    .createHash('md5')
    .update(fs.readFileSync(path.join(__dirname, '../source/js/smooth.js')))
    .digest('hex')
    .slice(0, 8);
} catch (e) {
  console.warn(`inject.js: 读取 smooth.js 失败(${e.message}),指纹回退为占位值`);
}

hexo.extend.filter.register('theme_inject', function (injects) {
  // 设计 token + 全局无障碍降级(阶段 A)
  injects.variable.push('source/_data/design-tokens.styl');

  // 平滑滚动脚本注入(阶段 B) - 内容指纹配合 vercel immutable 长缓存
  injects.bodyEnd.raw('smooth-script', `script(type="module" src="/js/smooth.js?v=${smoothV}" defer)`);

  // 跨文档 View Transitions(阶段 C) 改用 scripts/view-transitions.js 的 after_render 注入
  // (stylus injects.variable 的 @view-transition 会被 css minify 按 browserslist 删除)
});
