# 领域文档

工程类 skill 在探索本代码库时应如何消费领域文档。

## 探索前先读这些

- 仓库根目录的 **`CONTEXT.md`**
- **`docs/adr/`**：阅读与将要改动的领域相关的 ADR

如果这些文件不存在，**静默继续**——不要指出缺失，也不要主动建议创建。`/domain-modeling` skill（经 `/grill-with-docs` 与 `/improve-codebase-architecture` 触达）会在术语或决策实际敲定时惰性创建它们。

## 文件结构

本仓库为单上下文（single-context）：

```
/
├── CONTEXT.md
├── docs/adr/
│   └── 0001-xxx.md
└── source/
```

## 使用词汇表中的术语

当输出涉及领域概念（issue 标题、重构提案、假设、测试名）时，使用 `CONTEXT.md` 中定义的术语，不要漂移到词汇表明确避免的同义词。

如果所需概念尚不在词汇表中，这是一个信号：要么你在发明项目不用的语言（请重新考虑），要么存在真实缺口（记下来交给 `/domain-modeling`）。

## 标记 ADR 冲突

如果输出与现有 ADR 矛盾，显式指出而不是静默覆盖：

> _与 ADR-0007（xxx）矛盾，但值得重新讨论，因为……_
