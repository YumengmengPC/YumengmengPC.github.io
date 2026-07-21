---
title: CS231n——Lecture 6 卷积神经网络架构
top: false
cover: images/cover_lecture6.webp
toc: true
mathjax: true
date: 2026-06-03 15:39:14
password:
description: CS231n Lecture 6 笔记，涵盖卷积层/池化层/标准化层/Dropout 等 CNN 基础组件、激活函数选型、VGG 与 ResNet 架构设计哲学、权重初始化策略、数据预处理与增强、迁移学习的四种策略，以及超参数调优的实践流程。
tags: [CS231n, 计算机视觉, 深度学习, CNN, 迁移学习, 超参数调优]
categories: [CS231n学习笔记]
---

Lecture 6 围绕两个核心问题展开：**如何搭建 CNN？** 和 **如何训练 CNN？**

---

## CNN 的核心组件

### 卷积层 Convolutional Layer

卷积层是 CNN 区别于普通全连接网络的核心。每个卷积滤波器（filter）跨越输入的全部深度通道，在空间维度上滑动，每滑到一个位置就做一次点积加偏置，生成激活图（activation map）上的一个值。

![ConvNet 中的三维神经元排列](https://cs231n.github.io/assets/cnn/cnn.jpeg)

滤波器的参数有三个维度：宽度 $K_w$、高度 $K_h$、输入通道数 $C_{in}$。一个滤波器产生一个通道的输出激活图。一层有 $C_{out}$ 个滤波器，就产生 $C_{out}$ 个通道。控制滑动行为的两个超参数：

* **步长 stride**：滤波器每次滑动的像素数
* **填充 padding**：输入边缘补零的圈数

![步长与空间排列示意](https://cs231n.github.io/assets/cnn/stride.jpeg)

输出空间尺寸的计算公式：

$$W_{out} = \frac{W_{in} - K + 2P}{S} + 1$$

每一层的滤波器跨越前一层所有激活图的深度，所以多通道卷积自然带来**层次化特征提取**——浅层学边缘和纹理，深层学物体部件和整体结构。

### 池化层 Pooling Layer

池化层对局部空间邻域做聚合，降低空间分辨率的同时保留深度。标准做法是 $2 \times 2$ 窗口、步长 2。最常用的是**最大池化 Max Pooling**：在每个 $2 \times 2$ 窗口内取最大值。

![池化层下采样示意](https://cs231n.github.io/assets/cnn/pool.jpeg)

![最大池化细节](https://cs231n.github.io/assets/cnn/maxpool.jpeg)

池化层的直觉很朴素：一个特征（比如"猫耳朵"）在图片中精确出现在哪个像素位置不太重要，它**大概在某个区域**就够了。池化让网络对微小位移更鲁棒。

### 全连接层 Fully Connected Layer

全连接层的运算和普通神经网络一样：$f(x) = Wx + b$。在 CNN 的最后几层，卷积/池化提取完特征后，接上 FC 层做最终分类。

### 标准化层 Normalization Layer

训练深层网络时，各层激活值的分布会随着权重更新而不断漂移——这就是**内部协变量偏移 Internal Covariate Shift**。标准化层的作用是把激活值重新拉到零均值、单位方差的稳定区间，然后学一个线性变换（缩放 $\gamma$ + 平移 $\beta$）恢复表达能力：

$$\hat{x} = \frac{x - \mu}{\sqrt{\sigma^2 + \epsilon}}, \quad y = \gamma \hat{x} + \beta$$

四种变体只在"对哪些维度算统计量"上有区别：

| 类型 | 统计量计算范围 | 适用场景 |
|------|---------------|----------|
| **Batch Norm** | 对每个通道，跨整个 mini-batch（N, H, W） | 中到大批量，CNN 标配 |
| **Layer Norm** | 对每个样本，跨所有通道和空间位置 | 小批量、Transformer |
| **Instance Norm** | 对每个通道、每个样本独立 | 风格迁移 |
| **Group Norm** | 通道分组后每组独立 | Batch Norm 的批量无关替代 |

Batch Norm 还有一个额外的好处——它自带轻微的正则化效果，有时能减少对 Dropout 的依赖。

### Dropout

Dropout 的思路是：**训练时随机丢，测试时全留着**。每个前向传播中，以概率 $p$ 将某些神经元输出置零。被丢掉的节点在本次反向传播中不会被更新。

![Dropout 示意](https://cs231n.github.io/assets/nn2/dropout.jpeg)

直觉：Dropout 强迫网络学习**冗余的、分布式的特征表示**——不能指望某个神经元单独挑大梁，因为下次它可能就不在了。这相当于每次训练一个不同的子网络，测试时取它们的隐式集成。推荐使用 Inverted Dropout：

```python
# 训练时：丢掉并缩放
mask = (np.random.rand(*H.shape) < p) / p   # 注意除以 p
H *= mask

# 测试时：什么都不做
```

--- 也是因为测试时不存在 Dropout，网络的训练损失通常比验证损失**更高**——这反而是好事，说明正则化在起作用。

---

## 激活函数再审视

前面 Lecture 4 讲过 ReLU 和 Sigmoid。在 CNN 训练中再补充两个重要观点：

**Sigmoid 在深层网络中的问题**：当网络很深时，多层 Sigmoid 叠加会导致梯度越来越小——每一层都压缩一次，反向传播时梯度指数级衰减。

**ReLU 的死亡神经元**：$x < 0$ 时梯度为零，一旦某个神经元的所有输入都落入负区间，它就永远无法恢复。Leaky ReLU（负区给一个小斜率）缓解了这个问题。

**GELU 与 SILU**：两者都在 ReLU 的零点跳跃处做了平滑处理，使负值附近有非零梯度。GELU 的公式为 $f(x) = x \cdot \Phi(x)$（$\Phi$ 是高斯分布的累积分布函数），SILU 为 $f(x) = x \cdot \sigma(x)$。GELU 是当前 Transformer 架构的标配激活函数。

---

## CNN 架构设计

### 架构的框图表示

一个典型的 CNN 由若干 **块 block** 堆叠而成，每个块的模式是：

$$\text{Conv} \rightarrow \text{Norm} \rightarrow \text{Activation} \rightarrow \text{Pool}$$

最后接全局平均池化或全连接层做分类输出。

### VGG：小卷积核堆叠

VGG 的设计哲学非常统一：**全部使用 $3 \times 3$ 卷积，步长 1，填充 1**。当堆叠三层 $3 \times 3$ 卷积时，有效感受野逐步扩大：

$$3 \times 3 \rightarrow 5 \times 5 \rightarrow 7 \times 7$$

三层 $3 \times 3$ 卷积累积出和一层 $7 \times 7$ 相同的感受野，但有两个优势：

* **参数更少**：假设通道数为 $C$，三层 $3 \times 3$ 参数量为 $3 \times (3^2 C^2) = 27C^2$，单层 $7 \times 7$ 为 $49C^2$
* **非线性更多**：每层卷积后都有一个 ReLU，三层带来三个非线性变换，比一层有更强的表达能力

### ResNet：残差连接

一个反直觉的现象：**56 层的网络有时比 20 层的表现更差**——不只在测试集上，训练集上也更差。这不是过拟合，而是优化困难。理论上，56 层网络如果把多余的层设为恒等映射（什么也不做），至少不应该比 20 层差——但 SGD 找不到这样的解。

ResNet 的解决方案是引入**残差连接 skip connection**：

$$\text{Output} = x + \mathcal{F}(x)$$

$\mathcal{F}(x)$ 是残差块学到的函数。当最优解接近恒等映射时，只需要让 $\mathcal{F}(x) \approx 0$，这比直接学 $H(x) = x$ 容易得多。残差连接让极深网络（152 层）的训练成为可能。

ResNet 的典型设计：
* 基本块：Conv → BN → ReLU → Conv → BN，然后加上 skip connection（$x$ 直接跳过这两层加到输出上），再接 ReLU
* 网络按 stage 分组，每进入一个新 stage 空间分辨率减半、通道数翻倍
* 深层版本（50 层以上）使用 bottleneck 块：$1 \times 1 \rightarrow 3 \times 3 \rightarrow 1 \times 1$，大幅减少计算量

![CNN 架构激活可视化](https://cs231n.github.io/assets/cnn/convnet.jpeg)

---

## 权重初始化 Weight Initialization

初始化太小 → 激活值逐层衰减到零，梯度消失。初始化太大 → 激活值逐层放大爆炸，梯度爆炸。

**Kaiming（He）初始化** 专为 ReLU 网络设计，保持各层激活值方差不衰减：

$$W \sim \mathcal{N}\left(0, \frac{2}{\text{fan\_in}}\right)$$

其中 $\text{fan\_in} = K_h \times K_w \times C_{in}$（卷积层）或 $D_{in}$（全连接层）。那个因子 2 是因为 ReLU 将负半轴的方差清零。

**Xavier（Glorot）初始化** 推导自 tanh/sigmoid，公式为 $\text{Var}(W) = \frac{2}{\text{fan\_in} + \text{fan\_out}}$。对 ReLU 网络，Kaiming 效果更好。

![训练良好时的 CNN 第一层滤波器](https://cs231n.github.io/assets/nn3/cnnweights.jpg)

---

## 数据预处理

图像数据最常见的预处理：**逐通道减均值除标准差**。

$$x_{norm} = \frac{x - \mu_{channel}}{\sigma_{channel}}$$

对整个训练集的每个 RGB 通道分别算 $\mu$ 和 $\sigma$，然后所有图片用相同的统计量归一化。如果用 ImageNet 预训练模型，直接使用 ImageNet 的统计量即可（$\mu = [0.485, 0.456, 0.406]$，$\sigma = [0.229, 0.224, 0.225]$）。

![数据预处理前后对比](https://cs231n.github.io/assets/nn2/prepro1.jpeg)

---

## 数据增强 Data Augmentation

数据增强是防止过拟合最有效的手段之一——对训练图像施加随机变换，在不改变标签的前提下让每张图看起来不太一样。这等效于免费扩大了训练集。

常用方法：

* **水平翻转 Horizontal Flip**：左右镜像。对自然图像适用，对文字/数字不适用
* **随机裁剪 Random Resized Crop**：随机缩放后裁固定尺寸，增加平移和尺度鲁棒性
* **颜色抖动 Color Jitter**：随机调整亮度、对比度、饱和度
* **Cutout**：随机遮挡一块方形区域，模拟遮挡场景

这些变换只在训练时随机应用，测试时去掉随机性（或做测试时增强：对同一张图做多种裁剪后取平均预测，通常能额外提升 1-2% 精度）。

数据增强会让训练损失**变高**（因为数据更难了），但验证精度**更好**——这说明模型学到了更鲁棒的特征而不是记忆训练样本。

---

## 迁移学习 Transfer Learning

在数据有限的情况下，从头训练一个 CNN 几乎不可能拿到好结果。迁移学习的核心思路：**拿一个在大数据集上预训练好的模型，改造后用到自己的任务上**。

四种策略，根据数据量和相似度决定：

| 数据量 ↓ / 相似度 → | 与预训练数据相似 | 与预训练数据差异大 |
|---------------------|------------------|-------------------|
| **数据很少** | 冻结全部卷积层，只训练最后的线性分类器 | 同上，但效果可能有限 |
| **数据较多** | 解冻部分层做微调 fine-tuning | 从头训练或用较大学习率微调 |

实际操作中的做法：

1. 下载一个在 ImageNet 上训好的模型（如 ResNet-50）
2. 砍掉最后的全连接分类层
3. 接上自己数据集类别数的分类层
4. 如果数据少 → 只训练新加的分类层，其他层冻结
5. 如果数据多 → 可以解冻最后几层一起微调，用较小的学习率

---

## 超参数选择 Hyperparameter Selection

训练神经网络是一堆旋钮的排列组合。以下是经过验证的实践流程：

**第零步**：检查初始损失。随机初始化后跑一次前向，Softmax 损失应该接近 $\log(C)$（$C$ 为类别数）。差太多说明实现有 bug。

**第一步**：在小样本上过拟合。取训练集的一小部分（比如 5-10 张图），关掉正则化，训练到损失接近零。这一步验证模型和优化器的基本正确性——如果连几张图都拟合不了，后面全白搭。

**第二步**：找到能让损失稳定下降的学习率范围。通常在 $10^{-1}$ 到 $10^{-5}$ 之间，对数尺度搜索。

**第三步**：粗粒度随机搜索。在较大的参数区间内随机采样 1-5 个 epoch，快速筛出不合理的组合。

**第四步**：精细搜索。在表现最好的参数区域附近加密采样，训练更久。

**第五步**：观察 loss 和 accuracy 曲线。

* 训练精度上升 + 验证精度上升 → 正常
* 训练精度上升 + 验证精度下降 → **过拟合**，加正则化/数据增强
* 训练精度不动 + 验证精度不动 → **欠拟合**，加模型容量或调大学习率

![训练与验证精度曲线分析](https://cs231n.github.io/assets/nn3/accuracies.jpeg)

**迭代**：根据曲线反馈调整参数 → 回到第四步继续。

值得注意的是，**随机搜索优于网格搜索**。因为不同超参数对性能的影响不是均匀分布的——网格搜索可能在无关参数上浪费时间，而随机搜索在重要参数维度上覆盖更多不同的值。

![随机搜索 vs 网格搜索](https://cs231n.github.io/assets/nn3/gridsearchbad.jpeg)

---

## 声明
本blog由Yumengmeng基于[2025春季李飞飞斯坦福CS231n计算机视觉课程](https://www.bilibili.com/video/BV1YJ3PzLEiW?spm_id_from=333.788.videopod.episodes&vd_source=9f80ac68a038439c43f542a83ffa7b69&p=3)的视频内容结合Claude Code抓取网上开源笔记进行美化与排版,仅供个人复习使用。
