---
title: 移动端适配实战与面试复习
date: 2026-05-19
description: 系统梳理移动端适配，包括 viewport、rem、vw、响应式布局、安全区、高清屏、1px 边框和调试方法。
---

# 移动端适配实战与面试复习

移动端适配的目标是：同一套页面在不同屏幕尺寸、不同 DPR、不同系统浏览器、横竖屏和安全区环境下都能保持可用、清晰和稳定。

它不是简单地“用 rem”或者“写媒体查询”。完整方案要同时考虑：

- 布局适配
- 字体适配
- 图片适配
- 高清屏适配
- 安全区适配
- 交互适配
- 调试和兼容性

## 基础概念

### CSS 像素和物理像素

CSS 像素是代码里写的 `px`，物理像素是屏幕真实发光点。

在 DPR 为 2 的设备上：

```txt
1 CSS px = 2 x 2 个物理像素
```

所以普通 `1px` 边框在高清屏上可能显得偏粗。

### viewport

移动端页面必须设置 viewport：

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

含义：

- `width=device-width`：布局视口等于设备宽度。
- `initial-scale=1`：初始缩放为 1。
- `viewport-fit=cover`：允许内容延伸到刘海屏安全区，再由 CSS 控制安全距离。

## 常见适配方案对比

| 方案 | 说明 | 适合场景 |
| --- | --- | --- |
| 固定 px | 不随屏幕变化 | 简单后台、局部组件 |
| 百分比 / flex | 按容器伸缩 | 常规响应式布局 |
| rem | 按根字体缩放 | 设计稿等比缩放 |
| vw/vh | 按视口比例缩放 | 活动页、H5 页面 |
| 媒体查询 | 按断点调整 | 多端响应式网站 |

实际项目常用组合：

```txt
整体布局：flex/grid/百分比
细节尺寸：rem 或 px
活动页：vw
多端响应式：媒体查询
安全区：env(safe-area-inset-*)
```

## rem 适配方案

rem 的核心是动态设置根元素 `font-size`。

假设设计稿宽度是 375，约定：

```txt
1rem = 设计稿宽度 / 10 = 37.5px
```

设置脚本：

```ts
// src/utils/flexible.ts
export function setupFlexible(baseWidth = 375) {
  const doc = document.documentElement

  function setRootFontSize() {
    const width = doc.clientWidth
    const limitedWidth = Math.min(width, 540)
    doc.style.fontSize = `${limitedWidth / (baseWidth / 10)}px`
  }

  setRootFontSize()
  window.addEventListener('resize', setRootFontSize)
  window.addEventListener('orientationchange', setRootFontSize)
}
```

接入：

```ts
import { setupFlexible } from './utils/flexible'

setupFlexible(375)
```

设计稿中 `75px` 转成 rem：

```txt
75 / 37.5 = 2rem
```

CSS：

```css
.card {
  width: 9.2rem;
  padding: 0.32rem;
  border-radius: 0.16rem;
}
```

工程里通常用 PostCSS 自动转换。

```js
// postcss.config.cjs
module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 37.5,
      propList: ['*'],
      exclude: /node_modules/
    }
  }
}
```

## vw 适配方案

vw 不需要 JS，直接按视口宽度计算。

如果设计稿是 375：

```txt
1vw = 3.75px
75px = 20vw
```

CSS：

```css
.banner {
  width: 100vw;
  height: 48vw;
}

.title {
  font-size: 4.8vw;
}
```

也可以用 PostCSS 自动转换：

```js
// postcss.config.cjs
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,
      unitPrecision: 5,
      viewportUnit: 'vw',
      selectorBlackList: ['ignore-'],
      minPixelValue: 1
    }
  }
}
```

vw 适合活动页、营销页。复杂业务系统里，字体完全随宽度缩放可能不够稳定，需要设置最大宽度或配合媒体查询。

## 响应式布局

移动端页面不要所有东西都靠缩放。很多时候应该让布局自然流动。

```css
.product-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (min-width: 768px) {
  .product-list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
```

按钮、卡片、列表建议用弹性布局：

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar__search {
  flex: 1;
  min-width: 0;
}
```

`min-width: 0` 很重要，否则 flex 子元素可能被内容撑开。

## 字体适配

字体不建议无限缩放。常见做法是用 `clamp` 限制范围。

```css
.page-title {
  font-size: clamp(20px, 5vw, 28px);
  line-height: 1.3;
}

.body-text {
  font-size: clamp(14px, 3.7vw, 16px);
  line-height: 1.6;
}
```

这样在小屏上不会太小，大屏上不会过大。

## 图片适配

图片要避免拉伸、模糊和布局抖动。

```html
<img
  src="/cover-750.webp"
  srcset="/cover-375.webp 375w, /cover-750.webp 750w, /cover-1125.webp 1125w"
  sizes="100vw"
  width="750"
  height="420"
  alt="活动封面"
/>
```

CSS：

```css
.cover {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 750 / 420;
  object-fit: cover;
}
```

要点：

- 使用 `srcset` 提供不同尺寸。
- 设置 `width` 和 `height` 或 `aspect-ratio`。
- 图标优先用 SVG。
- 非首屏图片使用懒加载。

```html
<img src="/detail.webp" loading="lazy" width="750" height="420" alt="详情图" />
```

## 1px 边框和高清屏

在 DPR 为 2 或 3 的设备上，设计稿里的 1px 可能希望展示成更细的物理线。

伪元素缩放方案：

```css
.hairline {
  position: relative;
}

.hairline::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid #ddd;
  transform: scale(0.5);
  transform-origin: 0 0;
  width: 200%;
  height: 200%;
  pointer-events: none;
}
```

单边线：

```css
.hairline-bottom {
  background-image: linear-gradient(to bottom, transparent 50%, #ddd 50%);
  background-size: 100% 1px;
  background-repeat: no-repeat;
  background-position: bottom;
}
```

## 安全区适配

iPhone 刘海屏、底部 Home Indicator 会影响固定头部和底部按钮。

HTML 需要：

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

CSS：

```css
.page {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}
```

兼容写法：

```css
.bottom-bar {
  padding-bottom: calc(12px + constant(safe-area-inset-bottom));
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}
```

## 横竖屏适配

可以监听方向变化：

```ts
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    // 重新计算布局，比如图表尺寸、根字体、虚拟列表高度
    resizeCharts()
  }, 300)
})
```

CSS 也可以直接区分：

```css
@media (orientation: landscape) {
  .hero {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

## 移动端交互适配

### 点击热区

移动端按钮热区建议不小于 44px。

```css
.icon-button {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### 滚动体验

```css
.scroll-panel {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

### 输入框聚焦

iOS 上输入框聚焦可能导致页面被顶起。固定底部按钮要测试键盘弹起状态。

```ts
const initialHeight = window.innerHeight

window.addEventListener('resize', () => {
  const keyboardVisible = window.innerHeight < initialHeight * 0.75
  document.body.classList.toggle('keyboard-visible', keyboardVisible)
})
```

```css
.keyboard-visible .bottom-bar {
  display: none;
}
```

## Vite 项目中的推荐配置

如果项目选择 vw：

```bash
pnpm add -D postcss-px-to-viewport
```

```js
// postcss.config.cjs
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,
      unitPrecision: 5,
      viewportUnit: 'vw',
      propList: ['*'],
      minPixelValue: 1,
      exclude: [/node_modules/]
    }
  }
}
```

如果项目选择 rem：

```bash
pnpm add -D postcss-pxtorem
```

```js
// postcss.config.cjs
module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 37.5,
      propList: ['*'],
      minPixelValue: 2
    }
  }
}
```

## 常见问题

### 为什么不建议所有内容都等比缩放

因为移动端屏幕不只是宽度不同，可读性也重要。比如字体在大屏上无限变大，会显得粗糙；在小屏上太小会影响阅读。

更合理的是：

- 容器宽度弹性。
- 字体设置上下限。
- 图片按比例缩放。
- 复杂布局用媒体查询调整结构。

### rem 和 vw 怎么选

可以这样回答：

> 如果是强设计稿还原的 H5 页面，我更倾向 vw 或 rem 自动转换；如果是长期维护的业务系统，我会优先用 flex/grid/百分比做响应式布局，局部配合 rem 或 clamp，避免所有元素无脑等比缩放。

### 为什么会出现 1px 边框变粗

因为 CSS 像素和物理像素不是一回事。DPR 为 2 时，`1px` CSS 边框会占用多个物理像素。要实现视觉更细的线，可以用伪元素缩放或渐变背景。

## 面试回答模板

可以这样回答：

> 移动端适配我会从 viewport、布局、字体、图片、高清屏、安全区和交互几个方面考虑。布局上优先使用 flex、grid、百分比和媒体查询，活动页可以用 rem 或 vw 做设计稿还原；字体用 clamp 限制缩放范围；图片用 srcset、aspect-ratio 和懒加载；高清屏处理 1px 边框；刘海屏用 safe-area；最后在真机和 Chrome DevTools 里测试不同 DPR、横竖屏、键盘弹起和滚动场景。

## 实战清单

- 是否设置 viewport。
- 是否考虑最大内容宽度。
- 字体是否有最小值和最大值。
- 图片是否设置尺寸，避免 CLS。
- 是否支持不同 DPR 图片。
- 1px 边框是否符合设计。
- 底部固定按钮是否避开安全区。
- 横屏是否可用。
- 键盘弹起是否遮挡输入框。
- 是否在真机上测试。
