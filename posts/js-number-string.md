---
title: JavaScript 数值与字符串
date: 2026-05-18
description: 整理浮点数精度处理、字符串 substring 与 slice 的区别。
---

# JavaScript 数值与字符串

整理浮点数精度处理、字符串 substring 与 slice 的区别。

> 本文从旧博客笔记归档中按主题拆分整理，保留了原笔记内容和图片引用。
> 来源日期：2025.06.21

## 前端浮点数处理
### **前端处理浮点数的完整方案**

JavaScript 使用 IEEE 754 标准的双精度浮点数（64位），这会导致经典的精度问题（如 `0.1 + 0.2 !== 0.3`）。以下是前端处理浮点数的系统性解决方案：

---

### **一、浮点数精度问题的原因**
```javascript
console.log(0.1 + 0.2); // 0.30000000000000004
```
- **根本原因**：二进制无法精确表示某些十进制小数（如 0.1），导致计算误差。
- **影响场景**：加减乘除、比较运算、数据展示。

---

### **二、解决方案**

#### **1. 表示阶段：限制小数位数**
##### （1）`Number.toFixed()` + 转数字
```javascript
const num = 0.1 + 0.2;
console.log(parseFloat(num.toFixed(10))); // 0.3（注意：toFixed 返回字符串）
```
- **问题**：`toFixed` 会四舍五入，可能不符合预期（如 `(1.005).toFixed(2)` 返回 `"1.00"`）。

##### （2）手动四舍五入
```javascript
function round(num, decimalPlaces) {
  const factor = 10 ** decimalPlaces;
  return Math.round(num * factor) / factor;
}
console.log(round(0.1 + 0.2, 10)); // 0.3
```

---

#### **2. 运算阶段：整数化运算**
将浮点数转为整数运算后再还原，避免精度丢失。
##### （1）加减法
```javascript
function add(a, b) {
  const factor = 10 ** Math.max(a.toString().split('.')[1]?.length || 0, b.toString().split('.')[1]?.length || 0);
  return (a * factor + b * factor) / factor;
}
console.log(add(0.1, 0.2)); // 0.3
```

##### （2）乘除法
```javascript
function multiply(a, b) {
  const factor = 10 ** (a.toString().split('.')[1]?.length || 0 + b.toString().split('.')[1]?.length || 0);
  return (a * factor) * (b * factor) / (factor ** 2);
}
console.log(multiply(0.1, 0.2)); // 0.02
```

---

#### **3. 第三方库（推荐）**
##### （1）**decimal.js**
```javascript
import Decimal from 'decimal.js';
const sum = new Decimal(0.1).plus(0.2);
console.log(sum.toNumber()); // 0.3
```
- **特点**：高精度计算，支持链式调用。

##### （2）**big.js**
```javascript
import Big from 'big.js';
const result = new Big(0.1).plus(0.2);
console.log(result.toNumber()); // 0.3
```
- **特点**：轻量级，适合简单场景。

##### （3）**math.js**
```javascript
import { round, add } from 'mathjs';
console.log(add(0.1, 0.2)); // 0.3
```
- **特点**：功能全面，支持符号计算。

---

#### **4. 比较浮点数**
避免直接使用 `===`，改用误差容忍比较：
```javascript
function isEqual(a, b, epsilon = 1e-10) {
  return Math.abs(a - b) < epsilon;
}
console.log(isEqual(0.1 + 0.2, 0.3)); // true
```

---

#### **5. 前端展示优化**
##### （1）显示格式化
```javascript
const num = 0.30000000000000004;
console.log(num.toLocaleString('en-US', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
})); // "0.30"
```

##### （2）输入限制
```html
<input 
  type="number" 
  step="0.01"  <!-- 限制最小步长 -->
  oninput="this.value = parseFloat(this.value).toFixed(2)" 
/>
```

---

### **三、实战场景建议**
| 场景               | 推荐方案                          |
|--------------------|----------------------------------|
| **简单计算**       | 整数化运算或 `toFixed`           |
| **复杂金融计算**   | `decimal.js` 或 `big.js`         |
| **数据展示**       | `toLocaleString()` 或手动格式化  |
| **用户输入**       | `<input type="number" step="0.01">` |

---

### **四、面试回答示例**
**面试官**：前端如何处理浮点数精度问题？  
**回答**：
> 前端处理浮点数精度问题的核心方案包括：
> 1. **表示阶段**：用 `toFixed` 或整数化四舍五入控制显示位数。
> 2. **运算阶段**：将浮点数转为整数运算（如 `(0.1*10 + 0.2*10)/10`），或使用 `decimal.js` 等库。
> 3. **比较阶段**：通过误差容忍值（如 `1e-10`）判断相等性。
> 4. **展示阶段**：用 `toLocaleString()` 格式化或限制输入框的 `step` 属性。  
     > 关键是要理解二进制浮点数的存储限制，并根据场景选择合适方案。

---

通过以上方法，可以系统性地解决前端浮点数精度问题，确保计算和展示的准确性。

> 来源日期：2026.03.29

## JS中字符串的substring方法和slice方法的区别

### 一句话结论
- **substring**：认正数，会自动交换大小，**不支持负数**
- **slice**：支持负数（从末尾算），**不会自动交换**，更灵活、更安全

---

### 1. 参数规则不同
#### substring(start, end)
- 如果 `start > end`，会**自动交换两个值**
- **负数 → 直接当成 0**

#### slice(start, end)
- 如果 `start > end` → **返回空字符串**
- 负数：**从字符串末尾倒数**
    - `-1` 最后一位
    - `-2` 倒数第二位

---

### 2. 举例对比（最直观）
```js
const str = 'abcdefg'
```

#### ① 正常情况：两者一样
```js
str.substring(1, 4) // 'bcd'
str.slice(1, 4)      // 'bcd'
```

#### ② start > end 时
```js
str.substring(4, 1) // 自动交换 → (1,4) → 'bcd'
str.slice(4, 1)    // 不交换 → 返回 ''
```

#### ③ 用负数时
```js
str.substring(-2)   // 负数变0 → 从0开始 → 'abcdefg'
str.slice(-2)       // 倒数2位 → 'fg'
```

```js
str.substring(2, -1) // 负数变0 → (0,2) → 'ab'
str.slice(2, -1)      // 从2到倒数1 → 'cdef'
```

---

