---
title: CSS 0.5px 边框实现
date: 2026-05-18
description: 整理高清屏下 0.5px 边框的多种实现方案和适用场景。
---

# CSS 0.5px 边框实现

整理高清屏下 0.5px 边框的多种实现方案和适用场景。

> 本文从旧博客笔记归档中按主题拆分整理，保留了原笔记内容和图片引用。
> 来源日期：2025.06.26

## 实现一个0.5px的边框

在实现 **0.5px 边框** 时，由于部分设备（尤其是高清屏如 Retina）的最小物理像素单位为 1px，直接设置 `border: 0.5px` 可能不生效或显示模糊。以下是几种可靠方案：

---

### **方案 1：缩放 `transform: scale`（推荐）**
通过伪元素缩放 1px 边框至 0.5px：
```css
.element {
  position: relative;
}

.element::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 200%;      /* 2倍元素宽度 */
  height: 200%;     /* 2倍元素高度 */
  border: 1px solid #000;
  transform: scale(0.5); /* 缩小到 50% */
  transform-origin: 0 0; /* 从左上角缩放 */
  pointer-events: none;  /* 避免遮挡交互 */
}
```
**优点**：兼容性好，支持圆角边框。  
**缺点**：需调整宽高和定位。

---

### **方案 2：线性渐变 `linear-gradient`（单边边框）**
利用背景渐变模拟细边框：
```css
.element {
  background: linear-gradient(180deg, #000, #000 50%, transparent 50%) top / 100% 0.5px no-repeat;
}
```
**优点**：代码简洁。  
**缺点**：只适合单边边框，不支持圆角。

---

### **方案 3：`box-shadow` 投影模拟**
通过极小的阴影模拟边框：
```css
.element {
  box-shadow: 0 0 0 0.5px #000;
}
```
**优点**：简单，支持圆角。  
**缺点**：部分旧浏览器可能不支持小于 1px 的阴影。

---

### **方案 4：SVG 矢量绘制（精准控制）**
使用 SVG 的 `rect` 绘制 0.5px 边框：
```html
<svg width="100%" height="100%">
  <rect width="100%" height="100%" fill="none" stroke="#000" stroke-width="0.5" />
</svg>
```
**优点**：矢量无损，适配高清屏。  
**缺点**：需额外 DOM 元素。

---

### **方案 5：媒体查询 + 高清屏适配**
针对 Retina 屏单独处理：
```css
.element {
  border: 1px solid #000;
}

@media (-webkit-min-device-pixel-ratio: 2) {
  .element {
    border-width: 0.5px;
  }
}
```
**注意**：仅部分浏览器支持直接设置 `0.5px`。

---

### **对比总结**
| 方案               | 适用场景      | 兼容性         | 优缺点                     |
| ------------------ | ------------- | -------------- | -------------------------- |
| `transform: scale` | 所有边框+圆角 | 所有主流浏览器 | 兼容性好，需额外伪元素     |
| `linear-gradient`  | 单边边框      | 所有浏览器     | 简单，不支持圆角           |
| `box-shadow`       | 简单边框+圆角 | IE10+          | 代码简洁，旧浏览器可能模糊 |
| SVG                | 复杂边框      | 所有浏览器     | 精准但需 SVG 支持          |
| 媒体查询           | Retina 屏适配 | 部分浏览器     | 依赖浏览器支持 `0.5px`     |

---

### **最终推荐**
- **通用场景**：使用 `transform: scale`（方案 1）。  
- **单边边框**：用 `linear-gradient`（方案 2）。  
- **简单需求**：尝试 `box-shadow`（方案 3）。  

**示例代码（方案1）**：  
```html
<div class="thin-border">0.5px 边框</div>

<style>
  .thin-border {
    position: relative;
    width: 100px;
    height: 100px;
  }
  .thin-border::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 200%;
    height: 200%;
    border: 1px solid red;
    transform: scale(0.5);
    transform-origin: 0 0;
  }
</style>
```

---

