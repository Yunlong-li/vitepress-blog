---
title: Babel 讲解：从语法转换到插件机制和 Polyfill
date: 2026-06-03
description: 系统讲解 Babel 的作用、AST 编译流程、preset、plugin、浏览器兼容、polyfill、TypeScript、JSX 转换和插件开发思路。
---

# Babel 讲解：从语法转换到插件机制和 Polyfill

Babel 是前端工程里非常重要的 JavaScript 编译工具。它最常见的作用是把新语法转换成旧环境能理解的代码，但 Babel 的能力不止语法降级，它本质上是一个基于 AST 的代码转换平台。

一句话理解：

> Babel 负责把一份 JavaScript 代码解析成 AST，再通过插件修改 AST，最后重新生成代码。

## 1. Babel 解决什么问题

浏览器和运行环境对 JavaScript 新特性的支持速度不完全一致。比如项目里想使用可选链、空值合并、class fields、JSX 等语法，但目标环境可能还不能直接执行。

源代码：

```js
const name = user?.profile?.name ?? 'anonymous'
```

经过转换后可能变成：

```js
var _user$profile$name, _user$profile

const name =
  (_user$profile$name =
    user === null || user === void 0
      ? void 0
      : (_user$profile = user.profile) === null || _user$profile === void 0
        ? void 0
        : _user$profile.name) !== null && _user$profile$name !== void 0
    ? _user$profile$name
    : 'anonymous'
```

这样旧环境也能执行。

Babel 常见用途：

- 转换新 JavaScript 语法。
- 转换 JSX。
- 转换 TypeScript 语法。
- 按目标浏览器生成兼容代码。
- 注入 polyfill。
- 通过插件做代码增强或编译期优化。

## 2. Babel 的三阶段

Babel 编译通常分为三个阶段：

```mermaid
flowchart LR
  Parse["Parse 解析源码"] --> Transform["Transform 转换 AST"]
  Transform --> Generate["Generate 生成代码"]
```

### 2.1 Parse

把源码字符串解析成 AST。

```js
const sum = (a, b) => a + b
```

会被解析成类似这样的树结构：

```txt
Program
  VariableDeclaration
    VariableDeclarator
      Identifier: sum
      ArrowFunctionExpression
        Identifier: a
        Identifier: b
        BinaryExpression: +
```

AST 是 Babel 能理解和改写代码的基础。

### 2.2 Transform

插件遍历 AST，找到目标节点并替换。

比如把箭头函数：

```js
const sum = (a, b) => a + b
```

转换成普通函数：

```js
const sum = function (a, b) {
  return a + b
}
```

### 2.3 Generate

把修改后的 AST 重新生成代码，并生成 sourcemap。

## 3. Preset 和 Plugin

Babel 的核心概念是 `plugin` 和 `preset`。

| 概念 | 含义 |
| --- | --- |
| plugin | 一个具体转换能力 |
| preset | 一组 plugin 的集合 |

例如：

```json
{
  "presets": ["@babel/preset-env", "@babel/preset-react"],
  "plugins": ["@babel/plugin-transform-runtime"]
}
```

`@babel/preset-env` 会根据目标环境自动决定需要启用哪些语法转换插件。

`@babel/preset-react` 用于转换 JSX。

`@babel/plugin-transform-runtime` 常用于复用 helper，避免每个文件重复注入辅助函数。

## 4. preset-env 和 browserslist

`@babel/preset-env` 的关键是目标环境。目标环境通常来自 `browserslist`。

```json
{
  "browserslist": [
    "> 0.5%",
    "last 2 versions",
    "not dead"
  ]
}
```

或者写在 Babel 配置里：

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "chrome": "90",
          "safari": "13"
        }
      }
    ]
  ]
}
```

目标环境越新，需要转换的语法越少，产物通常也越小。

## 5. 语法转换和 Polyfill 的区别

这是 Babel 面试最常考的点。

语法转换处理的是“写法”：

```js
const add = (a, b) => a + b
```

可以转换成：

```js
var add = function add(a, b) {
  return a + b
}
```

但像 `Promise`、`Array.prototype.includes`、`Map` 这类运行时 API，不能只靠语法转换。

```js
const ok = list.includes(1)
```

如果目标浏览器没有 `includes`，就需要 polyfill。

| 类型 | 示例 | Babel 能否只靠语法转换解决 |
| --- | --- | --- |
| 语法 | 箭头函数、class、可选链 | 可以 |
| API | Promise、Map、includes | 不可以，需要 polyfill |

## 6. core-js 和 useBuiltIns

常见配置：

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": 3
      }
    ]
  ]
}
```

`useBuiltIns` 常见值：

| 值 | 含义 |
| --- | --- |
| false | 不处理 polyfill |
| entry | 根据入口里引入的 polyfill 和目标环境裁剪 |
| usage | 根据代码使用情况按需注入 |

比如代码使用了：

```js
const result = [1, 2, 3].includes(2)
```

Babel 会按需引入相关 polyfill。

注意：polyfill 会修改全局对象或原型，在应用项目里通常可以接受；如果是开发 npm 库，需要更谨慎，避免污染使用方环境。

## 7. transform-runtime

Babel 转换时可能会生成 helper。

例如 class 转换后需要 `_classCallCheck` 之类的函数。如果每个文件都注入一份，产物会变大。

`@babel/plugin-transform-runtime` 可以把 helper 变成模块引用：

```js
import _classCallCheck from '@babel/runtime/helpers/classCallCheck'
```

它的好处：

- 减少重复 helper。
- 更适合库项目。
- 可以避免某些全局污染。

应用项目关注兼容性时，常用 `preset-env + core-js`；库项目关注不污染全局时，常用 `transform-runtime`。

## 8. Babel 和 TypeScript

Babel 可以通过 `@babel/preset-typescript` 移除 TypeScript 类型语法：

```ts
function add(a: number, b: number): number {
  return a + b
}
```

转换后：

```js
function add(a, b) {
  return a + b
}
```

但 Babel 默认不做类型检查。它只是把类型擦掉。

所以很多项目会这样配置：

```json
{
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

Babel 负责转译，TypeScript 编译器负责类型检查。

## 9. Babel 和 JSX

React JSX：

```jsx
const element = <h1 className="title">Hello</h1>
```

可能被转换成：

```js
const element = React.createElement('h1', { className: 'title' }, 'Hello')
```

新的 JSX transform 下，也可能转换成对 `jsx` 函数的调用。

Vue 单文件组件一般由 Vue 编译器处理模板，不主要依赖 Babel 转模板。但 Vue 项目里仍然可能用 Babel 处理 JS 兼容、装饰器等语法。

## 10. Babel 插件长什么样

一个简单插件，把代码里的变量名 `foo` 改成 `bar`：

```js
export default function renameFooPlugin() {
  return {
    visitor: {
      Identifier(path) {
        if (path.node.name === 'foo') {
          path.node.name = 'bar'
        }
      }
    }
  }
}
```

核心是 `visitor`。Babel 遍历 AST 时，遇到对应节点就会调用插件方法。

插件可以做很多事：

- 替换语法节点。
- 删除无用代码。
- 自动注入 import。
- 编译自定义 DSL。
- 做埋点代码注入。
- 做国际化 key 提取。

但生产项目里写 Babel 插件要谨慎，因为它会直接改变代码语义。

## 11. 和构建工具的关系

Babel 不是打包器，它不负责构建依赖图，也不负责输出最终资源目录。

Webpack 或 Vite 负责：

- 找入口。
- 分析模块依赖。
- 处理资源。
- 生成 chunk。
- 输出 dist。

Babel 负责：

- 转换单个文件里的语法。
- 按插件修改 AST。

Webpack 中常见用法：

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  }
}
```

Vite 中很多转换由 esbuild 完成，但如果需要特定 Babel 插件，也可以通过插件接入。

## 12. 常见坑

### 12.1 以为 Babel 能解决所有兼容问题

Babel 能转语法，但运行时 API 需要 polyfill。

### 12.2 目标浏览器配置过旧

如果目标环境过旧，产物会更大，构建也更慢。应该根据真实用户环境配置 browserslist。

### 12.3 Babel 转 TS 后不做类型检查

`@babel/preset-typescript` 不等于完整 TypeScript 编译流程。CI 里仍然要跑 `tsc --noEmit`。

### 12.4 应用和库的 polyfill 策略混用

应用可以按需注入全局 polyfill；库最好避免污染全局，优先考虑 runtime helper 或让使用方决定 polyfill。

## 13. 面试怎么回答

可以这样说：

> Babel 是一个 JavaScript 编译器，核心流程是 parse、transform、generate。它先把源码解析成 AST，再通过插件遍历和修改 AST，最后生成新代码。Babel 常用于把新语法转成目标环境可执行的旧语法，也可以转换 JSX、TypeScript 语法。需要注意语法转换和 polyfill 不一样，箭头函数这类语法可以直接转换，但 Promise、Map、includes 这类运行时 API 需要 core-js 等 polyfill。Babel 本身不是打包器，通常和 Webpack、Vite 这类构建工具配合使用。

进一步可以补充：

- `preset` 是插件集合，`plugin` 是具体转换。
- `preset-env` 会根据 browserslist 决定转换范围。
- Babel 转 TS 不做类型检查。
- `transform-runtime` 可以复用 helper，减少重复代码。

## 14. 总结

Babel 的核心价值是基于 AST 的代码转换。

记住这几组关系：

- Babel 是编译器，不是打包器。
- preset 是插件集合，plugin 是具体转换。
- 语法转换不等于 polyfill。
- Babel 转 TS 不等于类型检查。
- 应用项目和库项目的 polyfill 策略不同。

理解这些关系，就能把 Babel 从“配置黑盒”变成可解释的工程工具。
