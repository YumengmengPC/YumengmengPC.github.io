---
title: CS231n——Lecture 10 视频理解
top: false
cover: images/cover_lecture10.webp
toc: true
mathjax: true
date: 2026-06-11 14:00:38
password:
description: CS231n Lecture 10 笔记，涵盖视频分类的演进路线：从 Single-Frame CNN 基线到 3D 卷积网络，从光流双流网络到时空自注意力（Nonlocal Block），再到 I3D 和 Video Transformer，最后讨论时序动作定位。
tags: [CS231n, 计算机视觉, 视频理解, 3D卷积, 光流, Two-Stream, I3D, Nonlocal Block, 动作识别, 时序定位]
categories: [CS231n学习笔记]
---

视频的数据形式是 `T × 3 × H × W`（或 `3 × T × H × W`），其中 T 是帧数。和静态图像最大的不同在于多出来的时间维度，这带来了几个新挑战：数据量级成倍增长、帧间信息如何有效融合、长时序依赖怎么建模。

---

## 视频理解概述

![视频 = 2D + 时间](/images/lec10_video_2d_time.webp)

图像分类的目标是识别场景与物体（猫、狗、车），视频分类的目标是识别动作（跑步、游泳、跳跃）。两者的核心差异在于：动作是一个时序概念，仅凭单帧很难区分"跑"和"走"——模型需要观察多帧之间的变化模式。

![视频分类任务](/images/lec10_video_classification.webp)

---

## 视频数据的存储与预处理

视频的原始数据量极大：

- SD 分辨率（640×480，30fps）：每分钟约 1.5 GB
- HD 分辨率（1920×1080，30fps）：每分钟约 10 GB

此外，GPU 显存无法容纳完整的未压缩视频。常规解决方案是同时降低帧率和空间分辨率，并在训练时使用短剪辑（clip）：从原始视频中以低帧率采样 T 帧构成一个 clip，模型只对 clip 进行分类。测试阶段用滑动窗口在多个 clip 上推理并取平均预测结果。

![训练时用短剪辑](/images/lec10_training_clips_1.webp)

---

## 单帧卷积神经网络基线 Single-Frame CNN Baseline

最直接的做法：对视频中的每一帧独立运行 2D CNN，将所有帧的预测概率取平均。

![Single-Frame CNN](/images/lec10_single_frame_cnn.webp)

过程分为三步：

1. 从视频中采样 T 帧
2. 每帧各自通过 2D CNN，得到类别预测
3. 对 T 个预测取平均

这种方法虽然简单，但效果出人意料地好，通常作为视频分类的基线（baseline）。后续所有改进本质上都在回答同一个问题：如何比"逐帧独立处理再取平均"做得更好。

---

## 时间信息融合策略

Single-Frame CNN 的缺陷在于帧与帧之间没有交互——每帧的特征提取是孤立的。如何让模型在推理时同时考虑多帧信息，是视频理解的核心问题。按融合发生的阶段不同，可分为三种策略。

### Late Fusion with FC Layers

![Late Fusion (FC)](/images/lec10_late_fusion_fc.webp)

先让 2D CNN 逐帧提取特征，得到 `T × D × H' × W'` 的特征图，然后将所有帧的特征展平并拼接成一个长向量，最后通过 MLP 映射到类别。

主要缺点是参数量过大。若特征维度为 D=4096，T=16 帧，展平拼接后的输入维度可达数十万，第一层全连接的参数量直接爆炸，计算效率也很低。

### Late Fusion with Pooling

![Late Fusion (pooling)](/images/lec10_late_fusion_pooling.webp)

用池化代替拼接：每帧通过 CNN 得到一个 D 维特征向量，对所有帧做平均池化或最大池化，压缩为单个 D 维向量，再接线性层输出类别。

池化不引入额外参数，解决了 Late Fusion with FC 的参数量问题。代价是信息丢失——平均池化假定所有帧重要性相等，但实际情况中关键帧（如起跳的瞬间）显然比静态帧包含更多判别性信息。

### Early Fusion

![Early Fusion](/images/lec10_early_fusion.webp)

在网络的入口处就将所有帧的信息混合：将 T 帧的 RGB 通道沿通道维度堆叠为 `3T × H × W` 的大张量，第一个 2D 卷积层的滤波器也随之变为 `3T × K × K` 的形状，在第一层卷积中直接完成时间维度的融合。之后网络恢复为标准 2D CNN。

这种做法的局限在于时间融合只发生在一层——第一层卷积将 3T 通道映射为 D 通道后，时间维度即消失，后续层不再具备跨帧比较能力，难以捕捉高层的时序模式。

### 3D CNN：时空慢融合

![3D CNN](/images/lec10_3d_cnn.webp)

Early Fusion 和 Late Fusion 的共性问题在于时间融合要么只在一层完成，要么最后才做。3D CNN 的思想是让整个网络始终保留时间维度，在每一层逐步融合时空信息。

![3D 卷积](/images/lec10_3d_convolution.webp)

回顾 2D 卷积：输入 `C × H × W`，卷积核 `C × K_h × K_w`，在 H 和 W 两个方向滑动。3D 卷积在时间维度上额外滑动：输入 `C × T × H × W`，卷积核 `C × K_t × K_h × K_w`，输出为 `T' × H' × W'` 的 3D 特征块。3D 池化同理，在 T、H、W 三个方向上做降采样。

整个网络维持 4D 张量形式（C × T × H × W），通过 3D 卷积与 3D 池化的交替，逐渐扩大空间感受野和时间感受野，最终以全局平均池化汇总为类别预测。

---

## 时间融合策略对比 Comparison of Temporal Fusion Strategies

![融合方式对比](/images/lec10_fusion_comparison.webp)

三种方法的本质差异在于时间融合在网络的哪个阶段完成：

| 方法 | 空间融合 | 时间融合 |
|------|---------|---------|
| **Late Fusion** | 逐步（2D Conv → 2D Pool → 2D Conv） | 最终 GlobalAvgPool 一步完成 |
| **Early Fusion** | 逐步 | 第一层就完成 |
| **3D CNN** | 逐步 | **逐步**（3D Conv → 3D Pool → 3D Conv） |

从每层的感受野大小（输入 20 帧 64×64）可以更具体地看到差异：

| 层级 | Early Fusion | Late Fusion | 3D CNN |
|------|-------------|-------------|--------|
| 第一层 Conv | T=1, H/W=3 | T=1, H/W=3 | T=3, H=3, W=3 |
| 第一层 Pool 后 | T=1, H/W=6 | T=1, H/W=6 | T=5, H=4, W=4 |
| 第二层 Conv 后 | T=1, H/W=14 | T=1, H/W=14 | T=9, H=8, W=8 |
| GlobalAvgPool 后 | T=1 | T=全帧 | T=17 |

2D 卷积核是矩形，3D 卷积核是正方体。矩形只能在平面上滑动，正方体可以在三维空间中滑动并持续保留时间维度。Late Fusion 的 T 感受野最初为 1，最后才通过全局池化覆盖全部帧，中间缺少时序细节；3D CNN 的 T 感受野逐层从 3 → 5 → 9 → 17 递增，每层学习不同时间尺度的运动模式。Early Fusion 最弱——时间感受野始终为 1，第一层便将 T 维度消除。

---

## C3D 与 Sports-1M 实验结果 C3D and Sports-1M Results

3D CNN 的计算代价明显更高。C3D（可理解为 3D 版本的 VGG）的计算量约为原始 VGG 的 2.9 倍。

![C3D 架构](/images/lec10_c3d_arch.webp)

C3D 的设计遵循 VGG 风格：使用 `3×3×3` 的小卷积核，每隔几层做一次 3D 池化降维。

在 Sports-1M 数据集（100 万个 YouTube 运动视频，487 个类别）的 Top-5 准确率对比：

![Sports-1M 结果](/images/lec10_sports1m_results.webp)

- Single-Frame CNN：77.7%
- Early Fusion：76.8%
- Late Fusion：78.7%
- C3D：84.4%

Early Fusion 和 Late Fusion 相比 Single-Frame 没有显著提升，说明仅改变融合策略而不改变卷积结构收益有限。3D CNN 的逐层慢融合策略带来了实质性的提升。

---

## 运动信息建模

前面的方法都在 RGB 像素空间上操作。换个思路：人类仅凭几个关节光点的运动轨迹就能判断动作类型（Johansson, 1973），这说明运动信息本身就包含充足的判别线索，未必需要完整的外观信息。

![从运动识别动作](/images/lec10_motion_recognition.webp)

### 光流 Optical Flow

光流描述相邻两帧之间每个像素的位移场。给定帧 $I_t$ 和 $I_{t+1}$，光流 $F(x, y) = (dx, dy)$ 满足：

$$I_{t+1}(x + dx, y + dy) = I_t(x, y)$$

位移有水平和垂直两个方向，因此光流可拆分为水平光流和垂直光流两幅图（类似于 2 通道图像）。

![光流示意 1](/images/lec10_optical_flow_1.webp)

![光流示意 2](/images/lec10_optical_flow_2.webp)

光流捕捉的是像素级别的运动模式——肢体的摆动方向、速度大小等低级运动线索，这些恰恰是动作判别的重要依据。

### Two-Stream Networks

利用光流作为运动信息源，二流网络（Two-Stream Networks）将外观与运动分离建模：

![双流网络](/images/lec10_two_stream.webp)

- **空间流（Spatial Stream）**：输入单帧 RGB 图像，提取外观特征（场景、人物、背景）
- **时间流（Temporal Stream）**：输入堆叠的多帧光流（水平 + 垂直，形状为 `2(T-1) × H × W`），提取运动特征

两个流各有一个 CNN，最终融合预测结果（可直接取平均 softmax，也可将 softmax 分数作为特征训练 SVM）。

运动模式相比外观模式更不易过拟合——因为运动与场景外观无关，同样的"跑步"动作在不同背景下具有相似的位移模式。

![双流网络结果](/images/lec10_two_stream_results.webp)

在 UCF-101 数据集上，3D CNN 准确率仅 65.4%，而双流网络（SVM 融合）达到 88.0%。单独的空间流（73.0%）和时间流（83.7%）也有明显贡献，验证了外观和运动信息的互补性。

---

## 长时序结构建模

前述 3D CNN 只能处理约 2–5 秒的短 clip，时间感受野受限于卷积核大小，仅捕捉局部运动。真实视频中的动作可能持续数十秒，前后事件之间存在长距离依赖。

### CNN + RNN

![CNN+RNN 流水线](/images/lec10_cnn_rnn_pipeline.webp)

一种自然的扩展是结合 CNN 和 RNN：用 2D 或 3D CNN 逐段提取特征，将特征序列输入 RNN（LSTM）。CNN 负责局部时间窗口内的特征提取，RNN 利用隐藏状态建模全局时序依赖。

可以是 many-to-one（整段视频一个分类标签）或 many-to-many（逐帧分类）。实践中为节省显存，CNN 部分常被冻结（使用预训练权重作为固定特征提取器），只训练 RNN 部分。

### Recurrent Convolutional Network

![Recurrent CNN](/images/lec10_recurrent_cnn.webp)

普通 CNN + RNN 中，CNN 输出的 `C × H × W` 特征图在被送入 RNN 前必须展平为 1D 向量——空间结构在此丢失。Recurrent Convolutional Network 的改进是将 RNN 内部的矩阵乘法替换为卷积操作。

标准 RNN 隐状态更新：

$$h_t = \tanh(W_{hh}h_{t-1} + W_{xh}x_t)$$

在 Recurrent ConvNet 中，$h_{t-1}$ 和 $x_t$ 保持 `C × H × W` 的特征图形状，$W_{hh}$ 和 $W_{xh}$ 变为卷积核。隐状态在整个网络中以三维形式流动，保留了空间位置信息。代价是计算速度进一步降低——RNN 本身无法并行，卷积操作又加重了计算负担。

### Nonlocal Block：时空自注意力

RNN 的根本瓶颈在于顺序计算导致的无法并行化。Lecture 8 介绍的自注意力机制恰好解决了这个问题。

![自注意力回顾](/images/lec10_self_attention.webp)

自注意力的核心公式为：

$$y = \text{softmax}\left(\frac{QK^T}{\sqrt{d}}\right)V$$

每个输出位置是所有输入位置的加权组合，任意两个位置之间可以直接交互，不受距离限制。

**Spatio-Temporal Self-Attention（Nonlocal Block）** 将这一机制引入视频的 3D 特征空间：

![Nonlocal Block](/images/lec10_nonlocal_block.webp)

流程分解：

1. 输入：3D CNN 提取的 4D 特征图 `C × T × H × W`
2. 通过三个 `1×1×1` 的 3D 卷积分别生成 Query（Q）、Key（K）、Value（V），形状均为 `C' × T × H × W`
3. 将 Q 和 K 展平为 `C' × (THW)` → Q 转置后与 K 相乘 → Softmax → 得到 `(THW) × (THW)` 的注意力权重矩阵
4. 注意力权重与 V 相乘 → 经 `1×1×1` 卷积映射回原始通道数 C
5. 残差连接：与原始输入相加

$$Output = Conv(Softmax(Q \otimes K^T) \otimes V) + Input$$

常规 3D 卷积的感受野受核大小限制（局部），Nonlocal Block 的感受野是全局的——第 1 帧的任意像素可以直接关注到第 T 帧的任意像素。且与 RNN 不同，Nonlocal Block 不存在顺序依赖，完全可并行计算。

典型架构：3D CNN → Nonlocal Block → 3D CNN → Nonlocal Block → 3D CNN → 分类头，Nonlocal Block 以插件形式嵌入 3D CNN 之间。

---

## 2D 网络的 3D 膨胀 I3D

图像领域积累了大量成熟的 2D 架构（VGG、ResNet、Inception），I3D（Inflated 3D ConvNet）的目标是直接复用这些架构到视频任务。

![I3D 设计思路](/images/lec10_i3d_inflating.webp)

核心操作：将 2D CNN 架构中的每个 2D 卷积与池化层替换为对应的 3D 版本。

- 2D 卷积 `K_h × K_w` → 3D 卷积 `K_t × K_h × K_w`
- 2D 池化 `P_h × P_w` → 3D 池化 `P_t × P_h × P_w`

![Inception 2D](/images/lec10_inception_2d.webp)

![Inception 3D 膨胀后](/images/lec10_inception_3d.webp)

以 Inception 模块为例：`3×3 Conv` 变为 `3×3×3 Conv`，`5×5 Conv` 变为 `5×5×5 Conv`，池化和拼接操作也升级到 3D。架构拓扑完全不变，仅维度升了一级。

此外，权重可从 2D 预训练模型迁移：将 2D 卷积核在时间维度上复制 N 次后除以 N，等价于同一个滤波器沿时间轴均匀初始化，加速训练收敛。

![I3D 结果](/images/lec10_i3d_results.webp)

在 Kinetics-400 数据集上，Inception-v1 的 I3D（RGB 流）Top-1 准确率为 71.1%，RGB + 光流两流版本达到 74.2%，显著优于单帧 CNN（62.2%）和 CNN+LSTM（63.3%）。

---

## 视频模型全景 Video Model Landscape

![视频模型基准](/images/lec10_video_benchmarks.webp)

2014 至 2025 年视频模型在 Kinetics-400 上的演进：

| 模型 | 核心思想 | Top-1 (Kinetics-400) |
|------|---------|---------------------|
| Per-frame CNN | 逐帧分类取平均 | 62.2% |
| CNN + LSTM | CNN 特征 + LSTM 序列建模 | 63.3% |
| Two-Stream CNN | 空间流 + 光流时间流 | 65.6% |
| I3D | 2D Inception 膨胀为 3D | 71.1% |
| I3D (two-stream) | I3D + 光流 | 74.2% |
| SlowFast + Nonlocal | 双路径 + 时空自注意力 | 79.8% |
| MViTv2-L | 多尺度 Video Transformer | 86.1% |
| **VideoMAE V2-g** | 视频掩码自编码器 | **90.0%** |

Vision Transformer 迁移到视频领域（VideoMAE、MViT 等）将 Top-1 推至 90%，达到图像分类的水准。基本思路类似——将视频帧划分为时空 patch，用自注意力学习全局依赖，配合掩码预训练（masked autoencoding）利用大规模无标注视频数据。

---

## 视频模型可视化

Lecture 9 介绍的 Saliency Maps 和 Grad-CAM 方法可直接应用于视频模型。

![可视化](/images/lec10_visualization.webp)

对双流网络的 RGB 流与光流流分别计算梯度反向传播，可视化结果展示了不同通道关注的不同信息维度：

- **外观流（Appearance）**：关注物体和人的静态形态（人物轮廓、器械形状）
- **运动流—快速通道（Fast motion）**：关注高频变化的区域（杠铃被推过头顶的瞬时动作）
- **运动流—慢速通道（Slow motion）**：关注低频持续的运动（杠铃摇晃的持续性摆动）

模型实际上将"举重"这一动作分解为"杠铃摇晃"和"推举过头"两个子模式，由不同通道分别建模，这与人类的认知分解方式一致。

---

## 时序动作定位

前面的方法仅对短视频剪辑做出单一分类——假设 clip 中只包含一种动作。真实场景中一段长视频可能依次包含多种动作。

![时序动作定位](/images/lec10_temporal_localization.webp)

**时序动作定位（Temporal Action Localization）** 的任务是：给定一段未裁剪的长视频，找出每个动作的起始时间、结束时间和类别标签。

这本质上是 1D 版的目标检测：在一维时间轴上生成不同长度和位置的候选时间段（类似 RPN 的 anchor），对每个候选段做分类（是什么动作）和回归（调整起止边界）。更进一步的时空动作检测（Spatio-Temporal Detection）同时在时间和空间维度上进行定位——不仅标出动作的时间区间，还在每一帧中用边界框标出执行该动作的人物。

---

## 声明

本blog由Yumengmeng基于[2025春季李飞飞斯坦福CS231n计算机视觉课程](https://www.bilibili.com/video/BV1YJ3PzLEiW?spm_id_from=333.788.videopod.episodes&vd_source=9f80ac68a038439c43f542a83ffa7b69&p=3)的视频内容结合Claude Code抓取网上开源笔记进行美化与排版，仅供个人复习使用。
