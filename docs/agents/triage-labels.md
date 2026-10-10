# 分诊标签

各 skill 以五个规范分诊角色沟通。本文件把这些角色映射到本仓库追踪器实际使用的标签字符串。

| mattpocock/skills 中的角色 | 本追踪器中的标签 | 含义 |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | 维护者需要评估该 issue |
| `needs-info` | `needs-info` | 等待报告者补充信息 |
| `ready-for-agent` | `ready-for-agent` | 规格完整，可交给 AFK agent |
| `ready-for-human` | `ready-for-human` | 需要人工实现 |
| `wontfix` | `wontfix` | 不予处理 |

当 skill 提到某个角色（如 "apply the AFK-ready triage label"）时，使用上表对应的标签字符串。

右列可随时改为实际使用的词汇；改完后各 skill 会按新字符串应用标签。
