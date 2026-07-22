# 项目维护文档（MAINTENANCE）

本文件记录 ymmblog 项目在开发与维护过程中遇到的环境、工具链、构建相关的非代码缺陷（bug），用于避免重复踩坑、辅助后续 debug。每个 bug 按十六进制编号（0x00000001 起）。

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
