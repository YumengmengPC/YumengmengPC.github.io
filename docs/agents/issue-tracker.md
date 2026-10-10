# Issue 追踪器：本地 Markdown

本仓库的 issue 与 spec 以 markdown 文件形式存放在 `.scratch/` 下。

## 约定

- 一个功能一个目录：`.scratch/<feature-slug>/`
- Spec 为 `.scratch/<feature-slug>/spec.md`
- 实现 issue 一个工单一个文件，位于 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 起编号；不允许合并成单个 tickets 文件
- 分诊状态记录在每个 issue 文件顶部附近的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 评论与讨论历史追加到文件底部 `## Comments` 标题下

## 当 skill 说 "publish to the issue tracker"

在 `.scratch/<feature-slug>/` 下新建文件（目录不存在则创建）。

## 当 skill 说 "fetch the relevant ticket"

读取所引用路径的文件。用户通常会直接给出路径或 issue 编号。

## Wayfinding 操作

供 `/wayfinder` 使用。**map** 是一个文件，每个工单一个 **child** 文件。

- **Map**：`.scratch/<effort>/map.md`（Notes / Decisions-so-far / Fog 正文）。
- **Child 工单**：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 起编号，正文为问题。`Type:` 行记录工单类型（`research`/`prototype`/`grilling`/`task`）；`Status:` 行记录 `claimed`/`resolved`。
- **Blocking**：顶部附近一行 `Blocked by: NN, NN`。其列出的每个文件均为 `resolved` 时解除阻塞。
- **Frontier**：扫描 `.scratch/<effort>/issues/` 中 open、未阻塞、未认领的文件；编号最小者优先。
- **Claim**：先置 `Status: claimed` 并保存，再开始任何工作。
- **Resolve**：在 `## Answer` 标题下追加答案，置 `Status: resolved`，再把上下文指针（要点 + 链接）追加到 `map.md` 的 Decisions-so-far。
