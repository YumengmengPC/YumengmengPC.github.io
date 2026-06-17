#set page(width: auto, height: auto, margin: 1.5cm)
#set text(font: ("Noto Serif CJK SC", "Source Han Serif SC", "SimSun"), size: 12pt, lang: "zh")

= CS231n 本周小结（Lecture 9–12）

- Lecture 9：涵盖 Transformer 架构优化（SwiGLU/MoE/pre-norm）、语义分割（FCN/U-Net/转置卷积）、目标检测（R-CNN $→$ YOLO $→$ DETR）、实例分割（Mask R-CNN）以及神经网络可视化方法（Saliency/CAM/Grad-CAM）。
- Lecture 10：涵盖视频分类的演进路线——从 Single-Frame CNN 基线到 3D 卷积网络，从光流双流网络到时空自注意力（Nonlocal Block），再到 I3D 和 Video Transformer，最后讨论时序动作定位。
- Lecture 11：从 H100 GPU 内部结构出发，深入 Llama 3-405B 的训练基础设施——数据并行 (DP)、全分片数据并行 (FSDP)、混合分片 (HSDP)、激活检查点、上下文并行 (CP)、流水线并行 (PP)、张量并行 (TP)，以及如何用 MFU 衡量分布式训练效率。
- Lecture 12：深入自监督学习——从旋转预测、拼图、修复、着色等变换类 pretext 任务，到 MAE 掩码自编码器的大比例重建，再到 SimCLR、MoCo 等对比学习框架，探讨如何在海量无标签数据上预训练出高质量视觉表征。
