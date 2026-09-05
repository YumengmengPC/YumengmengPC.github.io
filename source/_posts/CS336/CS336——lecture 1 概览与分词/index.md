---
title: CS336——Lecture 1 课程概览
top: false
hidden: false
cover: images/cover_cs336_lecture1.webp
toc: true
mathjax: true
date: 2026-09-05 09:22:44
password:
description: CS336 Lecture 1 笔记。
tags: [CS336, 大语言模型, 深度学习, 分词]
categories: [CS336学习笔记]
---

## 引言

整个课程的主要参考学习视频为[【极致中配】2026年最新版 Stanford CS336: 从头构建大语言模型][cs336] [1]，笔记整理也会参考一些博客啥的或者让 claude code 作我认为有必要的补充。

> 只有从头构建一切，才能真正学懂大模型是如何运作的

10 年前（2016年），研究人员自己实现并训练模型；而 8 年前，研究人员趋向于下载如 BERT 这样的预训练模型并做微调；到现在 2026 年，光靠 prompt API models (e.g., GPT/Claude/Gemini)就已经能完成很多事情。

但仅仅靠 prompt engineering 会极大的限制人类思考的角度。所以面向基础研究，需要将整个技术栈推倒重来————即**自行动手构建**。

![为什么开设这门课：研究者正与底层技术脱节，抽象虽然提升生产力但存在泄漏，基础研究需要推倒重来](/images/cs336_l1_why_course.webp)

现存的大模型在细节上的构建并没有公开，在 GPT-4 的论文中有这样一句话：“出于竞争格局与安全方面的考虑，我们不会透露任何关于模型构建的内容。”小模型与大模型的区别在于：1. 优化目标与关键因素与大模型不同 2.模型行为会随规模拓展而出现**涌现**现象。即样本过少时学习各种任务模型并无显著效果，只有当规模到达一个临界点时，性能就会显著改进。

*值得注意的是：不是所有设计决策都有科学的论证，有些设计决策纯粹是靠实验测试出来的，例如SwiGLU函数。所以大部分改进都需要靠实验来验证效果*

![直觉无法跨规模迁移：SwiGLU 论文原文坦承"我们对这些架构为何有效没有解释，只能归结于天佑"](/images/cs336_l1_intuitions.webp)

一个核心问题：在特定的数据和计算预算下，能构建出的最优模型是？

---

## 语言模型

### Pre-neural(before 2010s)
- 1950s Shannon 使用语言模型测算英语的熵
- N-gram language models（在机器翻译及语音识别系统中被使用）

### Neural ingredients(2010s)
- LSTM Hochreiter 1997 
- 前馈神经语言模型 2003
- 序列到序列建模 2014
- Adam 优化器 2014
- 注意力机制 2014
- Transformer架构 2017
- MoE架构 2017
- 模型并行 2019

### Early foundation models (later 2010s)
- ELMo 2018
- BERT 2018
- 谷歌 T5 模型（11B） 2019

### Embracing scaling
- GPT-2（1.5B） 2019
- Scaling laws 扩展定律 2020
- GPT-3（175B） 2020
- 谷歌PaLM（540B） 2022
- DeepMind's Chinchilla（70B）最优计算扩展定律 2022

![语言模型发展的四个阶段：Pre-neural、Neural ingredients、Early foundation models、Embracing scaling，及各阶段代表工作](/images/cs336_l1_lm_history.webp)

开源模型在能力上正逐渐逼近闭源模型，无疑是令人兴奋的。

过去十年里，世界经历了 BERT -> GPT-3 -> ChatGPT -> agents 的迭代过程，模型解决问题的能力显著提升，但最根本的东西并没有太大变化。依托 GPU 与底层内核来构建系统，使用梯度或随机梯度做优化......现在研究重心放在如何处理更长的上下文，如何提升模型推理效率等。

---

## Tokenization

从概念上看，tokenization 相当于在原始输入（字节）与表示 token 的整数序列上进行转换。这对于提升推理效率是有益的。如将1000个字节压缩为250个 token，以及希望模型理解的片段会被分为多个 token，而一些不重要的片段则会被压缩为一个 token。

### Byte-Pair Encoding
BPE 的工作原理如下：
训练阶段：从最细粒度（字节）开始，统计语料中相邻符号对的频率，将最高频的一对合并为新的符号，重复此过程直到达到预设词表大小。
编码阶段：按照训练时学习到的合并规则，从低到高依次合并，将新的文本切分为子词。

e.g. 语料中"low"出现了很多次，且"l"+"o" 是最高频对，则合并为 "lo";若 "lo"+"w" 也高频，则合并为 "low"。最终 "lowest" 可切成 "low"+"est",而非整个词或单个字符。

![BPE 的历史与基本思想：1994 年用于数据压缩，后被 GPT-2 采用；高频字节序列合并为单个 token，稀有序列拆成多个 token](/images/cs336_l1_bpe.webp)

在对输入进行 tokenization 后，需要针对 token 定义一个模型。基于最初的 Transformer 架构，模型定义上已经有了相当多的优化，如激活函数：SwiGLU、位置编码：sinusoidal, RoPE、归一化：LayerNorm, RMSNorm, QK norm, pre-norm versus post-norm、注意力的计算：GQA，多头注意力、MLP层：MoE架构。
*更前沿的方案：状态空间模型、线性注意力机制......*

### Training
- Loss function：multi-token prediction
- Optimizer: AdamW, SOAP, Muon
- Initialization scale: Xavier init, muP
- Learning rate schedule: cosine, WSD
- Regularization: dropout, weight decay
- Batch size: critical batch size
- MoE specific: load balancing(e.g. aux-free)

*以有原则的方式设置超参数能决定实验效果*

## Basics

*以下为 A2 内容*

总浮点数计算次数 $ total_flops = 6 * 70e9 * 1e12 $ for training 70B parameters on 1T tokens = 4.2e23 FLOPs

### Kernels

Kernel 是一个运行在 GPU 上的函数，PyTorch 打包了一些启动好的内置内核，但针对某一些类型的计算可以写自定义内核来加速 GPU 运行。核心原则是**尽量减少数据搬运**。因为读取数据的成本远高于计算数据。

E.g. 计算 A 与 B :
- Naive: 读取 A 计算 写回 读取 B 计算 写回
- 算子融合 Fused: 读取 计算 A and B 写回
- 分块 Strategies: operator fusion(matmul + activation), tilling(FlashAttention)
- Warp divergence, memory coalescing, bank conflicts, occupancy, bulk-async memory transfers

### Parallelism

如何在多个 GPU 上并行计算？ GPU 与 GPU 之间数据运输的成本会更高，为此我们需要将模型参数、激活值、梯度、优化器状态在多个 GPU 上分片，并在正确的时间节点将正确的数据运输到正确的 GPU 上进行计算。

### Inference

推理的目标是实际使用到的模型。推理的过程可以看作两个阶段：预填充与解码。

- 预填充阶段: 输入提示，一次性前向传播所有 token，从而构建出键值对。
- 解码阶段：逐个生成 token。（容易出现内存瓶颈）

有相当多的方法可以加速推理，如剪枝大模型、投机解码（轻量化模型猜 token，再用完整模型并行处理）、系统优化......

如果将推理作为服务，Query 可能在不同的时间到来，需要想办法打包成批；而在训练时，批次已经定好了，一切都是可预测的。

## 后续作业内容
A3: scaling laws
A4: evaluation, curation, transformation, filtering, deduplication
A5: RLHF, RL algorithms, RL systems

整个 CS336 课程其实基本可以按照作业 A1 - A5 去划分每个板块进行学习。每一块作业如果完成了会在后续博客中开源。

![课程作业设置：5 个 assignment（basics/systems/scaling laws/data/alignment），无脚手架代码，提供单元测试与排行榜](/images/cs336_l1_assignments.webp)

## 参考资料

[1]: [【极致中配】2026年最新版 Stanford CS336: 从头构建大语言模型][cs336]

[cs336]: https://www.bilibili.com/video/BV11LEA6eEuj/?spm_id_from=333.337.search-card.all.click&vd_source=9f80ac68a038439c43f542a83ffa7b69
