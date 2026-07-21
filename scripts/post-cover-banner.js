// 让文章页顶部大图显示该文自己的封面，而非全局 fixedCover。
//
// 主题 layout/_partials/layout.pug 的 #imgs 区块：
//     if theme.homeConfig.gradient || enableFixedCover
//         img(src=theme.homeConfig.fixedCover)   // 固定图，压过一切
//     else
//         img(src=covers)                        // covers = _cover_index(page)，即 page.cover
// _config.shokax.yml 配了 homeConfig.fixedCover，于是首页和文章页统统显示 photo1.webp。
//
// 首页仍要保留 fixedCover，所以不能直接删配置。这里只在渲染文章页时给该次渲染一份
// 去掉了 fixedCover 的 theme 副本，让它落进 else 分支用文章自己的封面。
// 主题以 symlink 引入不能改源码，故走 template_locals。
hexo.extend.filter.register('template_locals', function (locals) {
  const page = locals.page;
  if (!page || page.layout !== 'post' || !page.cover) return;

  // 浅拷贝，避免污染全局 theme config 影响后续页面
  locals.theme = {
    ...locals.theme,
    homeConfig: {
      ...locals.theme.homeConfig,
      fixedCover: null
    }
  };
});
