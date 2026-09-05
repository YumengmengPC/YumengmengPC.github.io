---
title: CS231n——Lecture 7 循环神经网络
top: false
hidden: false
cover: images/cover_lecture7.webp
toc: true
mathjax: true
date: 2026-06-08 14:19:31
password:
description: CS231n Lecture 7 笔记，涵盖 RNN 的序列建模思想、Vanilla RNN 公式推导与 BPTT 训练、字符级语言模型实例、梯度消失/爆炸的数学直觉、LSTM 门控机制与细胞状态高速公路，以及 Mamba 等现代状态空间模型的动机。
tags: [CS231n, 计算机视觉, 深度学习, RNN, LSTM, 序列建模, Mamba]
categories: [CS231n学习笔记]
---

现实中很多问题不是固定尺寸输入能解决的：视频是一串帧、句子是一串词、语音是一串采样点。Lecture 7 讨论的就是**可变长度序列**怎么建模。

---

## 序列建模范式 Sequence Modeling Paradigms

回顾一下普通神经网络（"Vanilla" Neural Network）的工作方式：输入一个固定大小的向量，输出一个固定大小的向量——**one to one**。

循环神经网络（RNN）把这套玩法扩展成了好几种模式：

![RNN 的四种输入输出模式](https://cs231n.github.io/assets/rnn/types.png)

- **One to many**：输入一张图片，输出一串单词（图像字幕）。固定输入 → 变长输出
- **Many to one**：输入一段视频的所有帧，输出一个分类标签（情感分析也是这类）。变长输入 → 固定输出
- **Many to many（异步）**：机器翻译，输入一句英文，输出一句法文。输入和输出长度可以不相等
- **Many to many（同步）**：视频的逐帧分类，每一帧都对应一个标签。输入和输出长度相同

直觉：CNN 要求输入尺寸固定，是因为卷积和全连接层的参数形状是固定的。RNN 通过**在每个时间步重复使用同一套参数**，摆脱了输入长度的限制。

---

## 循环神经网络隐藏状态 RNN Hidden State

RNN 区别于普通网络的关键，是它维护了一个**内部状态**（hidden state），随着序列的推进不断更新。

![RNN 黑盒视角](https://cs231n.github.io/assets/rnn/rnn_blackbox.png)

用一句话概括 RNN 的计算：

$$h_t = f_W(h_{t-1}, x_t)$$

新状态 = 某个带参数的函数（旧状态，当前输入）。这个函数 $f_W$ 在**每一个时间步都是同一个函数、同一套参数**——这是 RNN 的核心设计。

当前时间步的输出也从隐藏状态派生：

$$y_t = f_{W_{hy}}(h_t)$$

把 RNN 按时间展开，看得更清楚：

![RNN 按时间展开](https://cs231n.github.io/assets/rnn/unrolledRNN.png)

同一个计算块（共享权重）在每个时间步接收不同的输入 $x_t$ 和不同的历史状态 $h_{t-1}$，产生新的 $h_t$ 和输出 $y_t$。

初始隐藏状态 $h_0$ 通常初始化为全零向量，也可以作为可学习参数。

---

## 基础 RNN 数学公式 Vanilla RNN Formulation

最简单的 RNN——被称为 Vanilla RNN——长这样：

**隐藏状态更新：**

$$h_t = \tanh(W_{hh} h_{t-1} + W_{xh} x_t)$$

![Vanilla RNN 隐藏状态公式](https://cs231n.github.io/assets/rnn/vanilla_rnn_mformula_1.png)

**输出计算：**

$$y_t = W_{hy} h_t$$

![Vanilla RNN 输出公式](https://cs231n.github.io/assets/rnn/vanilla_rnn_mformula_2.png)

两个权重矩阵各有分工：

- $W_{hh}$：把上一个隐藏状态做线性变换，负责"记忆传递"
- $W_{xh}$：把当前输入做线性变换，负责"新信息注入"
- $\tanh$：把两者之和压缩到 $[-1, 1]$，引入非线性
- $W_{hy}$：把隐藏状态映射到输出空间

直觉：$W_{xh}$ 决定了"当前看到了什么"，$W_{hh}$ 决定了"之前记住的东西怎么影响现在"，$\tanh$ 负责把数值稳在一个可控范围内。三样东西每个时间步都用同一套，序列多长参数都不变。

---

## 字符级语言模型 Character-Level Language Model

以字符串 "hello" 为例，假设词表只有四个字母：`V = {h, e, l, o}`。每个字符用 one-hot 编码：

- h → $[1,0,0,0]^\top$
- e → $[0,1,0,0]^\top$
- l → $[0,0,1,0]^\top$
- o → $[0,0,0,1]^\top$

![字符级语言模型展开图](https://cs231n.github.io/assets/rnn/char_level_language_model.png)

每一步的过程：

1. 输入当前字符（one-hot 向量），RNN 更新隐藏状态
2. 从隐藏状态投射出一个 4 维 logits 向量，做 softmax
3. 预测下一个字符的概率分布
4. 用真实的下一个字符作为标签，算 softmax 损失

训练的时候，每个时间步都在预测下一个 token（这叫做**自回归**），不需要单独的标签。这就是语言模型的核心思路：给定前面的内容，猜接下来是什么。

### 嵌入层

One-hot 向量非常稀疏，所以通常先过一层**嵌入层**（embedding layer）——用一个 $d \times |V|$ 的矩阵把稀疏的 one-hot 映射成稠密的 $d$ 维向量，再送入 RNN。嵌入矩阵和其他参数一起用梯度下降训练。

### 解码策略

推理时怎么生成文本？最简单的做法是每步取概率最大的那个 token——这叫**贪婪解码**。但问题是：同样的输入总是得到同样的输出，文本一成不变。

更好的做法是按概率分布**采样**：概率高的 token 更可能被选中，但不一定总是它。这样生成的内容有变化，也更自然。

---

## 随时间反向传播 Backpropagation Through Time

RNN 的训练用**时间反向传播**（Backpropagation Through Time, BPTT）。思路很简单：把 RNN 沿时间轴展开成一个"深层"前馈网络，然后用链式法则往回传梯度。

同一个参数（比如 $W_{hh}$）在多个时间步被重复使用，所以它的梯度是**各时间步梯度的累加**：

$$\frac{\partial L}{\partial W_{hh}} = \sum_t \frac{\partial L_t}{\partial W_{hh}}$$

问题来了：如果序列长度是 10000，展开的图就有 10000 层深，内存直接爆炸。

### 截断 BPTT

实际做法是**截断 BPTT**（Truncated BPTT）：划定一个固定大小的时间窗口（比如 100 步），每次只在这段窗口内前向+反向传播。前一段的最终隐藏状态传给下一段作为初始状态，但梯度不跨段传播。

本质就是用近似梯度换内存和时间，代价是超长距离的依赖关系学不到。

---

## 隐藏状态可解释性 Hidden State Interpretability

一个有趣的现象：训练好的字符级 RNN，如果去检查各个隐藏神经元的激活模式，会发现它们自动学会了**可解释的功能**：

- **引号检测神经元**：在引号内的文本段落激活
- **行长度追踪神经元**：记住当前行已经输出了多少个字符
- **if 语句检测神经元**：进入 if 代码块时激活
- **代码缩进深度神经元**：追踪嵌套层级

没人告诉它们要学这些——纯粹是为了更好地预测下一个字符而涌现出来的。这说明 RNN 的隐藏状态确实在"理解"序列的结构，而不只是死记硬背。

---

## 循环神经网络优缺点 RNN Pros and Cons

**优势：**

| 特点 | 含义 |
|------|------|
| 任意长度输入 | 不像 CNN 必须固定尺寸 |
| 参数共享 | 序列再长，参数量不变 |
| 理论无限记忆 | 每一步都能用到之前全部信息 |
| 模型大小与输入长度无关 | 这跟 Transformer 的自注意力形成对比 |

**劣势：**

| 问题 | 后果 |
|------|------|
| 串行计算 | 算 $h_t$ 必须等 $h_{t-1}$，没法并行 |
| 隐藏状态容量有限 | 固定大小的向量塞不下太长的历史 |
| 梯度消失 | 早期时间步的信号传不过去 |

---

## 循环神经网络应用 RNN Applications

### 图像字幕 Image Captioning

经典做法是 **CNN 编码器 + RNN 解码器**：

1. CNN（比如在 ImageNet 上预训练的 VGG）处理图片，取倒数第二层（分类层之前那层）的输出作为"图像表示向量"
2. 这个向量作为 RNN 的初始输入或初始隐藏状态
3. RNN 逐词生成字幕，直到输出 `<END>` 标记

公式大致是：

$$h_t = \tanh(W_{xh} x_t + W_{hh} h_{t-1} + W_{ih} v)$$

其中 $v$ 是从 CNN 提取的图像特征向量，每个时间步都参与计算，提醒模型"别忘了你在描述什么图"。

这种模型的毛病是**幻觉**：如果训练数据里"草地"经常和"狗"一起出现，给它一张草地上有猫的图，它可能说成"草地上有一只狗"。模型学的是共现统计，不是真正的理解。

### 视觉问答 VQA

给一张图和一个问题，输出答案。两种常见做法：

- **生成式**：把问题和图像一起编码，用 RNN 生成答案文本
- **判别式**：准备一堆候选答案，模型输出每个答案的概率，选最高的

沿着这条路还有视觉对话（Visual Dialogue）、视觉导航等，RNN 的隐藏状态充当了"看到过什么 + 对话过什么"的记忆。

---

## 多层 RNN

和 CNN 一样，RNN 也能堆深：

![多层 RNN](https://cs231n.github.io/assets/rnn/multilayer_rnn.png)

每一层有自己的隐藏状态和权重。下层同一个时间步的隐藏状态传给上层作为输入，同一层上一个时间步的隐藏状态传给下一个时间步。整个结构形成一个二维的网格（时间 × 深度），所有层联合训练。

实践中更深的 RNN 往往效果更好，但代价是计算量和内存的显著增加——每个节点都要存激活值供反向传播。

---

## 梯度消失与梯度爆炸

这是 RNN 最头疼的问题。来看梯度怎么在时间上传播。

隐藏状态对前一个隐藏状态的偏导数：

$$\frac{\partial h_t}{\partial h_{t-1}} = \tanh'(W_{hh}h_{t-1} + W_{xh}x_t) \cdot W_{hh}$$

要从 $t=T$ 传回 $t=1$，中间要乘上 $T-1$ 个这样的雅可比矩阵：

$$\frac{\partial L_T}{\partial h_1} \propto \prod_{t=2}^{T} \tanh'(\cdots) \cdot W_{hh}$$

关键洞察：$\tanh$ 的导数在 $(0, 1]$ 之间（大部分时候远小于 1）。所以：

- 如果 $W_{hh}$ 的最大奇异值 $< 1$：连乘 → 梯度**指数级衰减** → 梯度消失。远处的信号根本到不了
- 如果最大奇异值 $> 1$：连乘 → 梯度**指数级增长** → 梯度爆炸，出现 NaN

梯度爆炸还好办——**梯度裁剪**（gradient clipping）：如果梯度的 L2 范数超过阈值，就缩放回去。但梯度消失难搞——它不是你裁一下就能变大的。

这就是为什么 vanilla RNN 很难学到长距离依赖，也就引出了 LSTM。

---

## 长短期记忆网络 LSTM

LSTM 的设计动机很明确：让信息能跨越很长的距离，不被 $\tanh$ 反复压缩。

### 双状态设计

LSTM 维护**两个**状态向量（都是 $n$ 维）：

- **隐藏状态** $h_t$：和 vanilla RNN 一样，是"对外输出"的状态
- **细胞状态** $c_t$：LSTM 特有的"内部记忆"，专门负责**长距离信息传递**

直觉：$c_t$ 就像一条高速公路，信息可以在上面畅通无阻地跑很远。$h_t$ 则是这条高速的"出口匝道"，决定现在对外暴露什么信息。

### 三个门

LSTM 用三个门来控制信息流动，每个门都是一个 sigmoid 激活（输出 0~1 之间）的向量：

![LSTM 门控公式](https://cs231n.github.io/assets/rnn/lstm_mformula_1.png)

**遗忘门（forget gate）$f_t$**：

$$f_t = \sigma(W_{hf}h_{t-1} + W_{xf}x_t)$$

决定旧细胞状态里哪些信息要丢掉。接近 1 = 保留，接近 0 = 丢弃。

**输入门（input gate）$i_t$** 和 **候选值 $g_t$**：

$$i_t = \sigma(W_{hi}h_{t-1} + W_{xi}x_t)$$
$$g_t = \tanh(W_{hg}h_{t-1} + W_{xg}x_t)$$

$g_t$ 是"候选新信息"（和 vanilla RNN 的隐藏状态计算一样），$i_t$ 决定哪些候选值真正写入细胞状态。sigmoid 充当开关——接近 1 就是"写入"，接近 0 就是"忽略"。

**输出门（output gate）$o_t$**：

$$o_t = \sigma(W_{ho}h_{t-1} + W_{xo}x_t)$$

决定细胞状态的哪些部分要暴露给隐藏状态（也就是对外可见）。

### 状态更新

![LSTM 状态更新公式](https://cs231n.github.io/assets/rnn/lstm_mformula_2.png)

**细胞状态更新：**

$$c_t = f_t \odot c_{t-1} + i_t \odot g_t$$

$\odot$ 表示逐元素相乘。这一步就是"选择性遗忘 + 选择性写入"——先丢掉不想记的，再加进新东西。

**隐藏状态更新：**

$$h_t = o_t \odot \tanh(c_t)$$

细胞状态先过 $\tanh$ 压缩到 $[-1,1]$，输出门控制哪些维度对外可见。

### 细胞状态高速公路

![LSTM 细胞状态高速公路](https://cs231n.github.io/assets/rnn/lstm_highway.png)

细胞状态 $c_t$ 的更新只有**逐元素乘法和加法**——没有矩阵乘法，也没有 $\tanh$ 套 $\tanh$。梯度沿着 $c_t$ 往回传时，不会被反复乘上激活函数导数，所以能保留得更远。

这和 ResNet 的残差连接是一个思路：ResNet 在**深度**方向上修高速公路，LSTM 在**时间**方向上修高速公路。

LSTM 解决梯度消失了吗？没有**完全**解决。如果遗忘门学成了 1、输入门学成了 0，信息可以无限保留——但实际上这是理想情况。LSTM **更容易学到长距离依赖**，但不保证一定学到，它只是在梯度高速公路上给了模型一个更好的机会。

### 历史注脚

LSTM 在 Transformer 出现之前，是序列任务的绝对主力——机器翻译、语音识别、语言模型，LSTM 统治了差不多十年。即使现在 Transformer 遍地都是，LSTM 那种"用门控机制修信息高速公路"的思路，仍然深刻影响着后续的架构设计。

---

## 现代视角：状态空间模型与 Mamba

Transformer 虽然强，但有个硬伤：自注意力的计算量随序列长度**二次增长**。序列一旦变长（比如 DNA 序列、长文档），Transformer 就很吃力。

这催生了一波回归 RNN 式思路的新模型：

**RWKV**：把注意力机制改写成 RNN 式的递推形式，实现线性时间复杂度的序列处理。

**Mamba（状态空间模型）**：核心是重新诠释状态空间方程——传统 SSM 的 A、B、C 矩阵是固定的，Mamba 让它们变成**输入相关的**（input-dependent），相当于给 SSM 加上了"选择性"能力。结果是在保持线性时间复杂度、理论无限上下文的条件下，逼近 Transformer 的表示能力。

这些新工作的共同目标：**取 RNN 的效率（线性时间、无限上下文）和 Transformer 的表达力（全局注意力），把两者融在一起。**

Lecture 7 关于 Mamba 的讲解比较简短，主要介绍了动机和方向。如果你对这方向感兴趣，Mamba 的原始论文 *"Mamba: Linear-Time Sequence Modeling with Selective State Spaces"* 是很值得读的。

---

## 总结

这一讲的信息量不小。核心脉络：

1. **RNN 通过共享参数处理变长序列**——隐藏状态是序列记忆的载体
2. **Vanilla RNN 用 $\tanh$ 做激活**，简洁但受困于梯度消失
3. **BPTT + 截断**是实际训练的标准做法
4. **LSTM 用三个门 + 细胞状态高速公路**大幅缓解了长距离依赖问题
5. **状态空间模型/Mamba**代表了后 Transformer 时代对 RNN 思路的回归

一句话记住这一讲：**RNN = 把时间变成深度，LSTM = 在时间里修了一条残差连接。**

---

## 拓展阅读

- Andrej Karpathy 的 [min-char-rnn](https://gist.github.com/karpathy/d4dee66867f8291f086) —— 100 多行 Python 实现的字符级 RNN，很适合动手理解
- [The Unreasonable Effectiveness of Recurrent Neural Networks](http://karpathy.github.io/2015/05/21/rnn-effectiveness/) —— Karpathy 的经典博文，展示了 RNN 生成莎士比亚、LaTeX、Linux 代码等有趣例子
- [Understanding LSTM Networks](https://colah.github.io/posts/2015-08-Understanding-LSTMs/) —— Christopher Olah 的 LSTM 图解，公认最好的 LSTM 入门文章

---

## 声明
本blog由Yumengmeng基于[2025春季李飞飞斯坦福CS231n计算机视觉课程](https://www.bilibili.com/video/BV1YJ3PzLEiW?spm_id_from=333.788.videopod.episodes&vd_source=9f80ac68a038439c43f542a83ffa7b69&p=3)的视频内容结合Claude Code抓取网上开源笔记进行美化与排版,仅供个人复习使用。
