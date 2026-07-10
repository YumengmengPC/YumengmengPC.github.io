// ============================================================
// 平滑惯性滚动 (Lenis) - 阶段 B
// 桌面端还原 iOS 带惯性、带缓动的丝滑滚动。
// 移动端原生已有惯性,Lenis 默认不接管 touch (syncTouch 关),故移动端零影响。
// 尊重 prefers-reduced-motion: 关闭时不初始化。
// 暴露 window.__lenis 供回顶/导航等复用。
// 由 scripts/inject.js 经 bodyEnd 注入 <script type=module> 引用。
// 用 esbuild 打包为 source/js/smooth.js (见 package.json build)。
// ============================================================
import Lenis from 'lenis'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!prefersReducedMotion) {
  const lenis = new Lenis({
    lerp: 0.12,           // 摩擦旋钮:越大停得越干脆(0.1柔和惯性/0.12适中/0.15偏灵敏)
    smoothWheel: true,    // 平滑鼠标滚轮
    wheelMultiplier: 1,   // 滚轮每格滚动距离倍率
    touchMultiplier: 1.5,
  })

  // requestAnimationFrame 驱动 Lenis 滚动循环
  const raf = (time: number) => {
    lenis.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)

  // 暴露给全局,供主题回顶 pageScroll / 导航显隐等复用
  ;(window as any).__lenis = lenis
}
