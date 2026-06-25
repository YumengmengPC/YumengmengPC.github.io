---
title: CS231n——Lecture 9 目标检测、图像分割与可视化
top: false
cover: images/cover_lecture9.jpg
toc: true
mathjax: true
date: 2026-06-10 16:59:47
password:
description: CS231n Lecture 9 笔记，涵盖 Transformer 架构优化（SwiGLU/MoE/pre-norm）、语义分割（FCN/U-Net/转置卷积）、目标检测（R-CNN→YOLO→DETR）、实例分割（Mask R-CNN）以及神经网络可视化方法（Saliency/CAM/Grad-CAM）。
summary: CS231n Lecture 9 笔记，涵盖 Transformer 架构优化（SwiGLU/MoE/pre-norm）、语义分割（FCN/U-Net/转置卷积）、目标检测（R-CNN→Fast R-CNN→Faster R-CNN→YOLO→DETR）、实例分割（Mask R-CNN）以及神经网络可视化（Saliency Maps/CAM/Grad-CAM）。
tags: [CS231n, 计算机视觉, 目标检测, 语义分割, 实例分割, Transformer, DETR, YOLO, Mask R-CNN, Grad-CAM]
categories: [CS231n学习笔记]
---

这节课先把计算机视觉的几张核心任务牌摊开：分类、语义分割、目标检测、实例分割——从简单到复杂，一关一关过。然后聊聊怎么用 Transformer 来做这些任务，最后看看怎么"看懂"神经网络内部在关注什么。

---

## ViT 回顾与 Transformer 微调 ViT Review and Fine-tuning

先快速回顾一下 ViT（Vision Transformer）的完整流程，因为后续的检测和分割方法很多都建立在它之上。

给定一张图片，切成固定大小的 patch，每个 patch 拉直后通过一个线性层投影成 D 维向量——这就是一个"视觉 token"。切片过程中位置信息丢了，所以需要加上**位置嵌入**（可以是 1D 序列编号，也可以是 2D 的 x/y 坐标编码）。

此外，在整组 token 进入 Transformer 之前，还要在序列最前面拼接一个额外的可学习 token——**class token**。它和其他 token 维度相同，经过 Transformer 之后，class token 的输出会被投影成一个 C 维 softmax 向量，代表分类概率。

### SwiGLU MLP

标准 Transformer block 里的 MLP 是两层全连接 + 一个激活函数。SwiGLU（Swish-Gated Linear Unit）引入了**门控机制**：

$$\text{SwiGLU}(x) = (xW_1 \odot \text{Swish}(xW_2)) W_3$$

多了一个可学习的门控矩阵，本质上是在不显著增加参数的情况下让非线性更丰富。直觉：让小型架构也能获得更好的表达能力。

### MoE（Mixture of Experts）

与其用一个巨大的 MLP 处理所有 token，不如准备多组并行的 MLP（"专家"），让一个路由器（router）决定每个 token 走哪几个专家。每个专家只学一个子领域，整体参数量可以很大但单次推理的激活参数可以很少。

### Pre-Norm：把 LayerNorm 放前面

标准 Transformer 是 Post-Norm：先做自注意力，再加残差，再过 LayerNorm。Pre-Norm 的做法是**先把输入过 LayerNorm，再做自注意力或 MLP，再残差**。公式对比：

- Post-Norm：$y = \text{LayerNorm}(x + F(x))$
- Pre-Norm：$y = x + F(\text{LayerNorm}(x))$

为什么要这么改？残差连接不是"旁路不改变特征"，而是把新信息加到旧特征上——加完之后特征分布变了。RMSNorm 放在前面能让 F(x) 的输入分布更稳定，梯度流动更好。在大模型训练中，Pre-Norm 几乎已经成为默认选择。

---

## 计算机视觉任务全景

![CV 四大核心任务](/images/lec9_cv_tasks_overview.png)

从简单到复杂，CV 任务可以排成一条线：

| 任务 | 输出 | 粒度 |
|------|------|------|
| **图像分类** | 一个类别标签 | 整张图 |
| **语义分割** | 每个像素一个类别标签 | 像素级（不分实例） |
| **目标检测** | 多个边界框 + 每个框的类别 | 对象级 |
| **实例分割** | 每个像素的类别 + 实例 ID | 像素级 + 区分实例 |

分类前面已经讲透了，这节课重点在后三个。

---

## 语义分割

目标：给图像中的**每一个像素**分配一个类别标签。比如一张街景图，天空、道路、行人、车辆——每个像素都要有归属。

### 全卷积网络（FCN）

直觉做法：滑动窗口——在每个像素周围取一个 patch，跑 CNN 分类。问题是相邻 patch 重叠区域被重复计算，而且感受野受限。

FCN 的思路更直接：整个网络全是卷积层，输入一整张图，输出就是一张逐像素的类别图。网络内部做**下采样**（降低分辨率、增大感受野），然后**上采样**恢复到原图大小。

![全卷积网络 encoder-decoder 结构](/images/lec9_fcn_architecture.png)

**下采样方式**：步幅卷积（strided conv）、池化（max/average pool）

**上采样方式**：
- 非学习的：最近邻插值、"反池化"（记住池化时最大值的位置，上采样时填回去）
- 学习的：**转置卷积**（transposed convolution）——本质上是可学习的上采样核，在低分辨率特征图上滑动并对重叠区域求和

![反池化示意](/images/lec9_unpooling.png)

![转置卷积：可学习的上采样](/images/lec9_transposed_conv.png)

直觉：转置卷积就是普通卷积的"反向操作"——输入小图，输出大图，核的参数通过反向传播学习。

### U-Net

FCN 的问题是下采样过程中丢失了精细的空间信息，上采样时很难恢复锐利的边界。U-Net 的解决方案简单优雅：**跳跃连接**。

![U-Net 架构](/images/lec9_unet_architecture.png)

编码器（下采样路径）和译码器（上采样路径）对称排列，编码器每一层的特征图直接拼接到译码器对应层。这样上采样时可以同时利用全局语义（来自深层）和局部细节（来自浅层跳跃连接）。

U-Net 最早是医学图像分割领域提出的，现在已经是各种分割任务的基础架构。

---

## 目标检测

![目标检测问题定义](/images/lec9_object_detection_intro.png)

任务比分类和分割都复杂：找出图中**所有**感兴趣的对象，给每个对象一个边界框和一个类别标签。

### 单对象场景：分类 + 回归

Detection 可以拆成两个子任务：一个是分类（这是什么），一个是回归（框在哪）。损失函数是两者的加权和：

$$\mathcal{L} = \mathcal{L}_{\text{softmax}} + \lambda \cdot \mathcal{L}_{L2}(\text{bbox})$$

但这只适用于固定数量的对象。实际图片中有几个物体是不确定的——直接让网络输出 4n 个坐标（n 个框）不行，因为 n 不固定。

### R-CNN 家族：从慢到快

**R-CNN**（2014）：先通过传统算法（Selective Search）生成约 2000 个候选区域，每个区域裁出来单独跑一遍 CNN，再用 SVM 分类 + 回归微调边界框。一个问题：每张图跑 2000 次 CNN——慢到不可接受。

**Fast R-CNN**：关键洞察——整张图只跑一次 CNN 得到共享的特征图，然后从特征图上按候选区域裁剪（RoI Pooling），再跑一个小的分类 + 回归头。大幅减少重复计算。

**Faster R-CNN**：进一步——连候选区域也不要手动了。引入**区域建议网络（RPN）**，在特征图上滑动预定义的锚框（anchor boxes），直接预测"这里有没有物体"和"框的偏移量"。训练时 RPN 和检测头联合优化。

### 单阶段检测器：YOLO

R-CNN 家族是"两阶段"方法：先提案、再分类。**YOLO（You Only Look Once）** 把整个过程压缩成一次前向传播：

![YOLO 网格检测](/images/lec9_yolo_grid.png)

- 把图像分成 $S \times S$ 的网格
- 每个格子预测 B 个边界框（坐标 + 是否包含物体的置信度）和 C 个类别的概率
- 所有预测一次性输出

原始输出包含大量重叠框，需要一个过滤步骤——**非极大值抑制（NMS）**：按置信度排序，保留最高分的框，抑制和它重叠度过高的其他框，重复直到干净。

YOLO 的核心优势：快。适合实时检测场景。代价是对小物体和密集场景不如两阶段方法精细。

### DETR：用 Transformer 做检测

DETR（Detection Transformer）把目标检测重新定义为一个**集合预测问题**。

![DETR 架构](/images/lec9_detr_architecture.png)

流程：
1. 用 CNN backbone 提取图像特征 → 得到一组特征 token
2. 加上位置编码 → 送入 Transformer 编码器
3. 定义 N 个**可学习的查询向量**（object queries）——每个查询代表"图里可能有一个对象，告诉我是啥"
4. 查询向量 + 编码器输出 → Transformer 解码器（交叉注意力让查询"看到"图像特征）
5. 每个查询的输出 → 小的 FFN 头 → 预测类别标签 + 边界框坐标（"no object" 也是一个合法输出）

DETR 的损失函数需要**二分图匹配**（Hungarian 算法）：先把预测框和真实框一对一配对（找最优匹配），再对每一对计算分类损失 + 框回归损失。

和 YOLO 不同，DETR **不需要 NMS**——每个查询本身就对应一个唯一对象。但它不能识别"没见过的类别"，是完全监督算法，训练时需要知道有哪些类。

---

## 实例分割与 Mask R-CNN Instance Segmentation and Mask R-CNN

![Mask R-CNN 架构](/images/lec9_mask_rcnn.png)

语义分割只管"这个像素是什么类别"，不管"这两个像素是不是同一个物体"。实例分割在语义分割的基础上给同一类别的不同个体画轮廓。

Mask R-CNN 在 Faster R-CNN 的基础上加了一个并行的**掩码预测头**（mask head）——一个小型 FCN，为每个检测到的 ROI 预测一个二值掩码（像素级别的"属于这个对象" / "不属于"）。

训练时三个任务一起优化：分类损失 + 边界框回归损失 + 像素级二值交叉熵损失。

---

## 神经网络可视化方法 Neural Network Visualization

模型到底在看什么？哪种像素对分类结果影响最大？这是可解释性的核心问题。

### Saliency Maps：梯度反向传播

最直接的方法：计算分类分数对输入像素的梯度。

$$S(x) = \left|\frac{\partial \text{score}_c}{\partial x}\right|$$

梯度大的像素就是"稍微改变一下就会明显影响分类结果"的区域。把这个梯度图可视化，就能看到模型重点关注哪里。

![Saliency Maps 示意](/images/lec9_saliency_maps.png)

### CAM（Class Activation Mapping）

对于最后有全局平均池化的 CNN，CAM 的做法很巧妙：把分类器的权重直接乘以对应特征图，求和就能得到一张"类别激活图"。

$$\text{CAM}_c = \sum_k w_k^c \cdot F_k$$

局限：只能用全局平均池化架构，而且只看最后一层。

### Grad-CAM

Grad-CAM 解除了 CAM 的架构限制：对任意卷积层的输出，把梯度在这个层的空间维度上做平均作为权重，再和特征图线性组合。

![Grad-CAM 示意](/images/lec9_grad_cam.png)

$$\alpha_k^c = \frac{1}{Z} \sum_i \sum_j \frac{\partial y^c}{\partial A_{ij}^k}$$

$$L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$$

直观理解：$\alpha_k^c$ 衡量的是"第 k 个特征图对类别 c 的贡献有多大"——梯度越大说明越重要。ReLU 只保留对分类有正向贡献的区域。最终输出的热力图可以叠加在原图上，清晰展示模型"看到"了什么。

---

## 声明

本blog由Yumengmeng基于[2025春季李飞飞斯坦福CS231n计算机视觉课程](https://www.bilibili.com/video/BV1YJ3PzLEiW?spm_id_from=333.788.videopod.episodes&vd_source=9f80ac68a038439c43f542a83ffa7b69&p=3)的视频内容结合Claude Code抓取网上开源笔记进行美化与排版，仅供个人复习使用。
