const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

function linkGrid(args, content) {
  const theme = hexo.theme.config;
  if (!args[0] && !content) {
    return;
  }
  if (args[0]) {
    const filepath = path.join(hexo.source_dir, args[0]);
    if (fs.existsSync(filepath)) {
      content = fs.readFileSync(filepath, { encoding: "utf-8" });
    }
  }
  if (!content) {
    return;
  }
  const list = yaml.load(content);
  let result = "";
  list.forEach((item) => {
    if (!item.url || !item.site) {
      return;
    }
    let item_image = item.image || theme.assets + "/404.png";
    if (!item_image.startsWith("//") && !item_image.startsWith("http")) {
      item_image = theme.statics + item_image;
    }
    item.color = item.color ? ` style="--block-color:${item.color};"` : "";
    result += `<div class="item" title="${item.owner || item.site}"${item.color}>`;
    result += `<a href="${item.url}" class="image" data-background-image="${item_image}"></a>
        <div class="info">
        <a href="${item.url}" class="title">${item.site}</a>`;
    if (item.desc) {
      result += `<p class="desc">${item.desc}</p>`;
    } else {
      result += `<p class="desc">&nbsp;</p>`;
    }
    result += `</div></div>`;
  });
  return `<div class="links">${result}</div>`;
}

// 在 after_init 阶段重新注册，确保覆盖主题的 links tag（主题脚本晚于项目脚本加载）
hexo.extend.filter.register("after_init", function () {
  hexo.extend.tag.register("links", linkGrid, { ends: true });
  hexo.extend.tag.register("linksfile", linkGrid, { ends: false, async: true });
});
