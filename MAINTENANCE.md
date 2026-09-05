# 项目维护文档（MAINTENANCE）

本文件记录 ymmblog 项目在开发与维护过程中遇到的环境、工具链、构建相关的非代码缺陷（bug），以及平台机制陷阱与工作流程事故，用于避免重复踩坑、辅助后续 debug。每个 bug 按十六进制编号（0x00000001 起）。

---

## Bug 列表

### 0x00000001 — hexo server 在 Claude Code Bash 工具环境下无法持久运行

**类型**：工具环境限制（非项目代码缺陷）
**状态**：已知限制，有规避方案

#### 现象
在 Claude Code 的 Bash 工具中启动 `hexo server`（长驻预览服务）时，服务无法持久运行：

1. **同步运行** `npx hexo server`：命令挂起，Bash 工具一直等待，直到工具超时后被 SIGTERM 终止，退出码 `144`（= 128 + 16，16 即 SIGTERM）。期间 `hexo server` 实际已正常监听 4000 端口，但 stdout 输出被 SIGTERM 截断未刷新，故肉眼看不到 `Hexo is running` 日志。
2. **后台运行** `run_in_background: true`：hexo server 静默退出，无任何日志输出，端口 4000 不响应（HTTP 000）。
3. **daemon 化尝试**（`setsid` / `nohup` / `disown` + 三流重定向）：仍退出码 `144`，无法脱离。

#### 根本原因（推断）
1. Bash 工具的进程跟踪机制会等待**所有子孙进程**（即便通过 `setsid` 脱离会话）的文件描述符关闭，才认为命令完成并返回。
2. `hexo server` 是长驻服务，持续持有 stdout/stderr 文件描述符不释放，导致 Bash 工具无法判定命令结束而一直挂起，直至超时发 SIGTERM。
3. `run_in_background` 模式下，hexo server 因脱离控制会话收到 SIGHUP 等信号而静默退出，且无日志。

#### 关联子问题
脚本文件名包含 `hexo` 时，脚本内 `pkill -f "hexo"` 会匹配到运行自身的 bash 进程，导致**脚本自杀**（同样退出码 144）。
- 失败：脚本 `verify-hexo.sh`（含 hexo）+ `pkill -f "hexo"` → 自杀。
- 成功：脚本 `diag.sh`（不含 hexo）+ 同样命令 → 正常。

#### 复现
```bash
# 同步运行 -> 挂起后超时 144
npx hexo server
# 后台运行 -> 静默退出,端口不响应
# (在 Claude Code Bash 工具 run_in_background 模式下)
```

#### 规避方案
1. **持久预览（推荐）**：由用户在自己的 shell 运行，而非交给 Bash 工具。在 Claude Code 输入框输入：
   ```
   ! npx hexo s
   ```
   `!` 前缀使命令在用户会话中持续运行，输出进入会话，hexo server 正常常驻。

2. **短时验证（脚本内）**：若需在 Bash 工具中验证 hexo 行为，用脚本启动后**结尾 kill 掉 hexo**，使 Bash 工具看到命令结束而正常返回。参考成功模式：
   ```bash
   node_modules/.bin/hexo server > /tmp/hs.log 2>&1 &
   HPID=$!
   # 等端口就绪 + curl 验证...
   kill $HPID   # 关键：kill 掉让 Bash 工具返回
   ```

3. **脚本内 pkill 规范**：
   - 用精确匹配 `pkill -f "hexo server"`，勿用 `pkill -f "hexo"`。
   - 避免脚本文件名包含 `hexo` 字样（否则 `pkill -f hexo` 会误杀自身）。

#### 结论
此限制源于 Bash 工具与长驻服务的进程模型不兼容，非项目可修复缺陷。所有 hexo 预览一律走「用户 `! npx hexo s`」或「脚本末尾 kill」两种方式。

---

### 0x00000002 — 文章 URL 里的 `+` 号被 Vercel 解码成空格导致 404

**类型**：托管平台行为（Vercel 路径解码）
**状态**：已修复（`scripts/legacy-redirects.js`）

#### 现象
《Python+Pytorch 基础知识整理》一文点进去 404。文件在磁盘上、首页卡片也在，唯独文章页打不开。改名后新链接恢复，但旧链接仍持续 404，表现为「修了又没修好」。

#### 根本原因
`permalink` 是 `:year/:month/:day/:title/`，其中 `:title` 取的是**文章目录名（slug）**，不是 front-matter 的 `title`。该文原目录名为 `Python+Pytorch基础知识整理`，生成的 URL 里带一个字面 `+`。

Vercel 对 **path** 也套用查询串的解码规则，把裸 `+` 解成空格。于是请求 `.../Python+Pytorch基础知识整理/` 实际去找 `Python Pytorch基础知识整理`（空格）这个目录 —— 从来不存在，必然 404。

#### 验证方法
拿一篇路径本来就含空格的文章（如 `CS231n——lecture 10 视频理解`），把空格换成 `+` 请求：

```bash
# 200 —— 证明 + 被解码成了空格
curl -o /dev/null -w "%{http_code}\n" \
  "https://yumengmeng.cn/2026/06/11/CS231n%E2%80%94%E2%80%94lecture+10+%E8%A7%86%E9%A2%91%E7%90%86%E8%A7%A3/index/"
```

#### 易漏的一环
仅把目录改名（117f3d5）只能救新链接。旧 URL 散落在浏览器缓存的首页 DOM、历史记录补全、收藏夹、搜索引擎索引和已分享的链接里，**不会自愈**，所以必须补重定向。

#### 处理方式
`scripts/legacy-redirects.js` 做两件事：

1. 在旧链接的两个落点各生成一张 meta refresh + canonical 的静态跳转页 —— 空格版（裸 `+` 解码后）和字面 `+` 版（地址栏写成 `%2B` 时）。静态托管没有服务端 301 可用，只能落成 HTML。
2. `before_generate` 守卫：任何文章路径含 `+` 直接让构建失败，在改名阶段就拦下，不等链接发出去才发现。

#### 规范
文章目录名不要用 `+`，用 `-`。标题字段随意 —— `title` 不参与 URL 生成。

---

### 0x00000003 — front-matter YAML 解析失败导致文章静默消失

**类型**：Hexo 构建行为（失败被降级为警告）
**状态**：已修复（`scripts/build-guards.js` 第一道防线）

#### 现象
批量编辑 front-matter 后，两篇文章（Python-Pytorch、从 AE 到 VAE）从构建产物中直接消失：首页、归档、标签页全部不见。hexo 过程中只打了一行 `ERROR Process failed: <文件>`，构建退出码仍为 0，Vercel 照常部署。直到人工对账才发现。

#### 根本原因
原 front-matter 中 `categories:` 下挂着子项（`- 基础知识整理`），一次编辑把 `categories:` 行替换成了内联数组，子项成了孤儿行 → YAML 解析失败。hexo 对单篇文章处理失败的处理方式是**记日志后继续构建**，退出码不受影响——「构建成功」与「文章齐全」之间没有任何对账。

#### 处理方式（PR #26）
`scripts/build-guards.js`：
1. `before_generate` 逐个用 js-yaml 解析 `source/_posts/**/*.md` 与 `source/_data/*.yml` 的 front-matter，失败即抛错并指名文件；
2. `after_generate` 对账磁盘文章数 vs 构建产物文章数（走 `all_posts` local，含隐藏文章）——无论什么原因丢文章都会被拦。

#### 验证
演练：把任意一篇文章 front-matter 改坏 → `hexo generate` 以 exit 2 失败并列出文件名；恢复后构建通过。

#### 规范
- 批量改 front-matter 用脚本时，警惕「替换一行、留下子项」的半截编辑
- 依赖构建报错发现问题不可靠：YAML 错误只在 INFO 级日志里

---

### 0x00000004 — 本地构建与 Vercel 生产的文章 URL 日期不一致

**类型**：构建环境差异（时区）
**状态**：已修复（`TZ=UTC`，PR #26）

#### 现象
同一份仓库，本地 `hexo generate` 生成 `/2026/05/30/CS231n——lecture 2.../`，线上是 `/2026/05/31/...`——整整差一天，且**不同文章差得不一样**（有的差一天，有的一致）。

#### 根本原因
hexo 解析 naive 日期（如 `date: 2026-05-31 14:27:50`）用站点配置时区（Asia/Shanghai），但 `date()` 输出助手按**构建机器本地时区**格式化。本地 WSL 是 UTC-7，Vercel 是 UTC：上海时间 07:00–21:59 之间发布的文章，在本地会跨日偏移 15 小时掉到前一天，在 Vercel 上偏 8 小时通常不跨日。git 推导的日期同理（首次提交时间的时刻相同、格式化时区不同）。

#### 处理方式
`package.json` 的 `build`/`server` 脚本加 `TZ=UTC`，本地与生产逐字节一致。验证：TZ=UTC 本地构建的 17 篇可见文章 URL 与线上真值逐一相等。

#### 规范
- 本地验证 URL 一律走 `npm run build` / `npm run server`（已带 TZ=UTC），**不要裸跑 `hexo generate`/`hexo server`**
- 外部脚本（如 `post-date-from-git.js`）依赖 `--follow` 追溯历史；Vercel 是浅克隆，文章目录被移动后可能追不到最初提交 → 重要文章的 `date` 显式写死（2026-09-05 已为 CS224n L1 / CS336 L1 / 随笔钉死）

---

### 0x00000005 — immutable 一年缓存 × 固定文件名 → 改动对老访客永不生效

**类型**：缓存策略（vercel.json）
**状态**：部分修复（PR #26）；`/images/*` 遗留

#### 现象（潜在，未被用户报告过）
`vercel.json` 对 `/js/*`、`/css/*`、`/images/*` 下发 `max-age=31536000, immutable`。而：
- `smooth.js` 的缓存指纹是 `?v=主题版本号`（0.5.4，几乎恒定）→ 改 `_smooth/index.ts` 后 URL 不变，老访客**一年内拿旧 JS**
- `app.css` 是无哈希固定文件名 → 样式/design-tokens 迭代对老访客不生效

#### 根本原因
immutable 缓存要求「URL 随内容变」，但这两类产物的 URL 是固定的。主题自己的 JS（`chunk-*.js`）有内容哈希所以没事，自定义产物没有。

#### 处理方式（PR #26）
- `scripts/inject.js`：`smooth.js?v=` 改为构建产物 md5 前 8 位——esbuild 在 build 链中先于 generate 执行，读到的是最新产物
- `vercel.json`：`/css/*` 改为 `public, max-age=0, must-revalidate`

#### 验证
演练：给 `_smooth/index.ts` 加行为性变更 → 指纹变化；仅加注释（minify 后产物不变）→ 指纹不变（正确：无行为变化不应清缓存）。

#### 遗留
`/images/*` 仍是 immutable：同名覆盖封面图（如重新转换同名 webp）会 stale。低频且发生时可感知，暂接受。

---

### 0x00000006 — 构建期裸 fetch 第三方 API，API 故障 = 全站停更

**类型**：构建可靠性
**状态**：已修复（PR #26）

#### 现象（潜在）
`scripts/github-stats.js` 是构建期标签插件：`hexo generate` 时同步 `fetch` 第三方贡献 API，**无超时、无异常捕获**。API 挂掉或网络不通 → generate 抛错 → 部署失败 → 整站无法更新，且问题出在与站点代码毫无关系的第三方服务上。

#### 处理方式
`AbortSignal.timeout(10s)` + try/catch，失败时 `console.warn` 并渲染空占位。贡献图挂了肉眼可见，不属于"静默失败"类，可接受降级。

#### 规范
构建期任何外部请求必须带超时与降级路径；除非是站点数据本体，否则不允许第三方故障阻塞部署。

---

### 0x00000007 — 堆叠 PR 合并进了 base 分支而非 main，内容悬空

**类型**：工作流程（GitHub PR 机制误解）
**状态**：已修复（PR #24 救回）；留下流程规范

#### 现象
PR #21、#23 在 GitHub 上显示 MERGED，但 main 上没有它们的内容（CS336 文章、随笔、图片全部缺失）。随后功能分支被删除，看似内容丢失。

#### 根本原因
GitHub 合并 PR 的目标是 **base 分支**。堆叠 PR（#20 → #21 → #23 逐层基于前一个功能分支）的 base 不是 main：#21 被合进了 `feat/sync-hidden-field`、#23 被合进了 `feat/cs336-l1-post-and-essay`——都是已合并待删的中间分支。内容进了中间分支后就停在半空，之后分支删除即悬空。

#### 恢复方法
GitHub 会保留已删分支的 PR head 提交：`gh pr view <N> --json headRefOid` 拿到 SHA → `git fetch origin <SHA>` 按哈希取回完整提交链（无需分支名）→ 与 main 合并（PR #24）。

#### 规范
- 堆叠链**自下而上**合并：每合一个，确认 GitHub 已自动把上层 PR 的 base 重定向到 main（删除 base 分支会触发），再合下一个
- 更稳妥：合并前把堆叠链「压平」——上层 PR 的 base 直接改为 main
- 删任何功能分支前，确认它上面没有未进 main 的内容

---

### 0x00000008 — `_posts` 子目录名会拼进 permalink

**类型**：Hexo permalink 机制（易误解）
**状态**：已知行为，已配自动重定向（PR #25）

#### 现象
把文章按分类归入二级目录（`_posts/CS231n/<文章>/`）后，URL 从 `/2026/06/16/<文章>/` 变成 `/2026/06/16/CS231n/<文章>/`——子目录名被拼进链接，旧地址全部失效。

#### 根本原因
permalink 的 `:title` 取的是相对 `_posts` 的**完整路径**，不只是文章目录名。（`+` 号事故 0x00000002 的同一机制：slug 由路径决定。）

#### 教训（验证方法论）
本项目曾据此误判「子目录不影响 URL」：验证时用 `cp` 复制了一份到子目录，原帖仍在根目录，Hexo 去重后只生成一份，恰好掩盖了路径差异。**验证 URL 行为必须在"只移动不复制"的干净状态下做，并以产物目录树对账。**

#### 处理方式
`scripts/category-dir-redirects.js`（PR #25）：从 `post.source` 机械推导旧地址（日期段不变、去掉分类段），为每个旧 URL 生成 meta refresh 跳转页。新文章自动覆盖，无需登记。

#### 规范
移动/重命名任何文章目录 = 改 URL = 必须有重定向（或确认旧链接从未对外暴露）。

---

### 0x00000009 — 隐藏文章的标签/分类页面不会生成，页内 meta 链接 404

**类型**：插件行为限制（hexo-hide-posts）
**状态**：已知限制，链接检查器豁免清单记录

#### 现象
文章设 `hidden: true` 后，插件会把它的标签/分类从 locals 中剔除（`applyPatch.js` 补丁 `tags`/`categories`），于是**只被隐藏文章使用**的标签/分类不会生成页面。隐藏文章本身仍可通过直链访问，其页面上的标签/分类链接却指向 404。

#### 处理方式
`tools/link-integrity-check.js` 的 `ALLOWED` 豁免清单逐条记录这些链接（PR #26）。文章恢复可见时对应页面会真实生成，届时应随手删除豁免项。

#### 关联
这也是为什么 `scripts/category-dir-redirects.js` 取文章要走 `all_posts` 而非 `posts`——隐藏文章同样存在需要重定向的旧地址。

---

