// 生成 .nojekyll 防止 GitHub Pages 用 Jekyll 构建 Hexo 源码
const fs = require('fs');
const path = require('path');

hexo.extend.filter.register('after_generate', function() {
  const nojekyll = path.join(hexo.public_dir, '.nojekyll');
  if (!fs.existsSync(hexo.public_dir)) {
    fs.mkdirSync(hexo.public_dir, { recursive: true });
  }
  if (!fs.existsSync(nojekyll)) {
    fs.writeFileSync(nojekyll, '');
  }
});
