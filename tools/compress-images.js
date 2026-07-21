// 一次性图片压缩脚本：source/images 下的 png/jpg -> webp
// 用法: npm i -D sharp && node tools/compress-images.js [--apply]  (用完可卸载 sharp)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const APPLY = process.argv.includes('--apply');
const SRC = path.join(__dirname, '../source/images');
const BACKUP = path.join(__dirname, '../../ymmblog-images-backup');
const MAX_WIDTH = 1600;
const QUALITY = 82;

(async () => {
  const files = fs.readdirSync(SRC).filter(f => /\.(png|jpe?g)$/i.test(f));
  let before = 0, after = 0;
  const rename = {};

  for (const f of files) {
    const src = path.join(SRC, f);
    const origSize = fs.statSync(src).size;
    before += origSize;

    const img = sharp(src);
    const meta = await img.metadata();
    const pipeline = meta.width > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img;
    const buf = await pipeline.webp({ quality: QUALITY }).toBuffer();

    // 压不动就保留原图（极少数已高度优化的小图）
    if (buf.length >= origSize) {
      after += origSize;
      console.log(`跳过  ${f}  (webp 更大)`);
      continue;
    }
    after += buf.length;

    const outName = f.replace(/\.(png|jpe?g)$/i, '.webp');
    rename[f] = outName;
    console.log(
      `${(origSize / 1024).toFixed(0)}KB -> ${(buf.length / 1024).toFixed(0)}KB ` +
      `(${(100 - buf.length / origSize * 100).toFixed(0)}%↓)  ${f}`
    );

    if (APPLY) {
      fs.mkdirSync(BACKUP, { recursive: true });
      fs.copyFileSync(src, path.join(BACKUP, f));
      fs.writeFileSync(path.join(SRC, outName), buf);
      fs.unlinkSync(src);
    }
  }

  console.log(`\n合计: ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB ` +
    `(${(100 - after / before * 100).toFixed(0)}%↓), ${Object.keys(rename).length} 张转换`);

  if (APPLY) {
    // 同步更新引用
    const targets = [
      ...fs.readdirSync(path.join(__dirname, '../source/_posts'), { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => path.join(__dirname, 'source/_posts', d.name, 'index.md'))
        .filter(fs.existsSync),
      path.join(__dirname, '../_config.shokax.yml'),
    ];
    let edits = 0;
    for (const t of targets) {
      let text = fs.readFileSync(t, 'utf8');
      const orig = text;
      for (const [from, to] of Object.entries(rename)) {
        text = text.split(from).join(to);
      }
      if (text !== orig) { fs.writeFileSync(t, text); edits++; }
    }
    console.log(`已更新 ${edits} 个文件的引用，原图备份至 ${BACKUP}`);
  } else {
    console.log('\n(预演模式，未改动任何文件。加 --apply 执行)');
  }
})();
