---
title: ESLint 讲解：从代码规范到静态检查和团队协作
date: 2026-06-03
description: 系统讲解 ESLint 的作用、规则、parser、plugin、config、Prettier 配合、TypeScript、React、Vue、CI 集成和自定义规则。
---

# ESLint 讲解：从代码规范到静态检查和团队协作

ESLint 是前端项目里最常用的静态检查工具。它的价值不是“让代码看起来更整齐”这么简单，而是尽早发现潜在 bug、统一团队风格、减少代码评审里的低价值争论。

一句话理解：

> ESLint 会把代码解析成 AST，然后根据规则检查代码结构，发现不符合约定或可能出错的地方。

## 1. ESLint 解决什么问题

没有 ESLint 的项目里，常见问题很多：

- 变量声明了但没使用。
- `==` 和 `===` 混用。
- Promise 没有处理错误。
- React hooks 调用顺序错误。
- Vue 组件属性写法不统一。
- TypeScript 里滥用 `any`。
- 团队成员格式和风格不一致。
- 代码评审花大量时间讨论缩进、空格、分号。

ESLint 通过规则把这些问题自动化检查出来。

示例：

```js
function getUserName(user) {
  const prefix = 'user'

  if (user.name == null) {
    return 'anonymous'
  }

  return user.name
}
```

可能会提示：

- `prefix` 声明了但未使用。
- 建议使用 `===`。
- 某些项目中要求函数返回类型更明确。

## 2. ESLint 的工作流程

```mermaid
flowchart LR
  Code["源码"] --> Parser["Parser 解析 AST"]
  Parser --> Rules["Rules 检查规则"]
  Rules --> Report["报告问题"]
  Report --> Fix["自动修复"]
```

ESLint 不是简单字符串匹配，而是分析代码结构。

例如：

```js
const count = 1
```

会被解析成类似：

```txt
VariableDeclaration
  VariableDeclarator
    Identifier: count
    Literal: 1
```

规则可以检查变量是否被使用、声明方式是否符合规范、表达式是否安全。

## 3. Rule

rule 是 ESLint 的最小检查单位。

例如：

```js
export default [
  {
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'eqeqeq': 'error'
    }
  }
]
```

规则等级：

| 值 | 含义 |
| --- | --- |
| off 或 0 | 关闭 |
| warn 或 1 | 警告，不一定阻断流程 |
| error 或 2 | 错误，通常阻断 CI |

规则也可以带参数：

```js
export default [
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
]
```

表示允许 `console.warn` 和 `console.error`，但提示普通 `console.log`。

## 4. Parser

ESLint 默认 parser 能解析标准 JavaScript。如果要解析 TypeScript、Vue SFC、某些实验语法，就需要额外 parser。

常见 parser：

| Parser | 场景 |
| --- | --- |
| Espree | ESLint 默认 JavaScript parser |
| @typescript-eslint/parser | TypeScript |
| vue-eslint-parser | Vue 单文件组件 |
| @babel/eslint-parser | Babel 实验语法 |

TypeScript 项目常见配置：

```js
import tsParser from '@typescript-eslint/parser'

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser
    }
  }
]
```

parser 的作用是让 ESLint “看懂”你的代码语法。

## 5. Plugin

plugin 提供额外规则。

常见插件：

| 插件 | 用途 |
| --- | --- |
| @typescript-eslint/eslint-plugin | TypeScript 规则 |
| eslint-plugin-react | React 规则 |
| eslint-plugin-react-hooks | React Hooks 规则 |
| eslint-plugin-vue | Vue 规则 |
| eslint-plugin-import | import/export 规则 |
| eslint-plugin-jsx-a11y | JSX 可访问性规则 |

React hooks 规则非常典型：

```js
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
]
```

它能检查 Hooks 是否只在组件顶层调用，以及依赖数组是否完整。

## 6. Config

配置可以理解为规则组合。

一个基础 flat config 示例：

```js
import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,ts,tsx,vue}'],
    rules: {
      'no-console': 'warn',
      'eqeqeq': 'error'
    }
  }
]
```

配置里通常会定义：

- 检查哪些文件。
- 忽略哪些文件。
- 使用什么 parser。
- 启用哪些 plugin。
- 开启哪些规则。
- 不同目录是否有不同规则。

例如测试文件可以放宽某些规则：

```js
export default [
  {
    files: ['**/*.test.ts'],
    rules: {
      'no-magic-numbers': 'off'
    }
  }
]
```

## 7. ESLint 和 Prettier 的区别

这是高频问题。

| 工具 | 核心职责 |
| --- | --- |
| ESLint | 代码质量、潜在问题、部分风格规则 |
| Prettier | 代码格式化 |

ESLint 关注：

- 变量是否未使用。
- Hooks 是否违规。
- Promise 是否错误处理。
- 是否使用危险 API。

Prettier 关注：

- 换行。
- 缩进。
- 空格。
- 代码排版。

实践建议：

- 让 Prettier 负责格式。
- 让 ESLint 负责质量和语义规则。
- 避免 ESLint 和 Prettier 同时争抢格式规则。

常见脚本：

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

## 8. TypeScript 项目怎么配

TypeScript 项目需要 `@typescript-eslint`。

关注点：

- 禁止无意义的 `any`。
- 检查 Promise 使用。
- 检查类型导入。
- 避免不安全赋值。
- 配合 `tsc --noEmit` 做完整类型检查。

示例规则：

```js
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error'
    }
  }
]
```

注意：ESLint 不能完全替代 TypeScript 编译器。类型检查仍然应该跑：

```bash
tsc --noEmit
```

## 9. React 项目关注哪些规则

React 项目最重要的是 hooks 规则：

```js
function UserPanel({ userId }) {
  if (!userId) {
    return null
  }

  const [user, setUser] = useState(null)

  return <div>{user?.name}</div>
}
```

这段代码有问题：Hook 不能在条件返回之后调用，因为每次渲染 Hook 调用顺序必须一致。

正确写法：

```js
function UserPanel({ userId }) {
  const [user, setUser] = useState(null)

  if (!userId) {
    return null
  }

  return <div>{user?.name}</div>
}
```

`eslint-plugin-react-hooks` 可以检查这类问题。

## 10. Vue 项目关注哪些规则

Vue 项目常见规则：

- 组件名格式。
- props 是否定义类型。
- 模板里是否使用未定义变量。
- `v-for` 是否设置 key。
- `v-if` 和 `v-for` 是否混用。
- 自定义事件命名。

示例：

```vue
<template>
  <UserItem
    v-for="user in users"
    :key="user.id"
    :user="user"
  />
</template>
```

没有 `key` 时，Vue 列表更新可能出现状态复用问题，ESLint 可以提前提示。

## 11. 提交前检查

只在本地手动跑 lint 不可靠，最好接入 Git hooks。

常见组合：

```json
{
  "lint-staged": {
    "*.{js,ts,tsx,vue}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

这样每次提交前只检查本次变更的文件，速度比全量检查更快。

但注意：本地 hooks 可以被跳过，所以 CI 里仍然要全量检查。

## 12. CI 里的 ESLint

CI 中一般会跑：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

建议：

- 本地提交前可以自动修复。
- CI 里不要自动修复，只报告错误。
- `error` 级别问题阻断合并。
- `warn` 可以先不阻断，但要定期治理。

## 13. 自定义规则

当团队有特殊约束时，可以写自定义规则。

例如禁止直接从某个底层模块导入：

```js
export default {
  meta: {
    type: 'problem',
    messages: {
      noDirectImport: '不要直接从 internal 模块导入，请使用公共入口。'
    }
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value.includes('/internal/')) {
          context.report({
            node,
            messageId: 'noDirectImport'
          })
        }
      }
    }
  }
}
```

自定义规则适合治理架构边界，比如：

- 禁止跨业务模块直接引用。
- 禁止页面层调用底层私有工具。
- 禁止使用废弃组件。
- 强制接口请求从统一 SDK 发出。

## 14. 常见坑

### 14.1 规则开太严

规则太严会让团队抵触，尤其是老项目。更好的做法是先覆盖核心风险，再逐步提高标准。

### 14.2 ESLint 和 Prettier 冲突

如果两个工具都管格式，会出现来回修改。要明确 Prettier 管格式，ESLint 管质量。

### 14.3 只在本地跑

本地检查可以被跳过。关键项目必须在 CI 跑 lint。

### 14.4 忽略文件配置过宽

如果 `.eslintignore` 或 config ignores 过宽，可能把核心代码排除掉。忽略范围要定期检查。

## 15. 面试怎么回答

可以这样回答：

> ESLint 是静态代码检查工具，它会把代码解析成 AST，然后根据配置的规则检查潜在问题和团队规范。它的核心概念包括 parser、plugin、rule 和 config。parser 负责解析语法，plugin 提供额外规则，rule 是具体检查项，config 组合这些规则。ESLint 和 Prettier 的区别是，ESLint 更关注代码质量和语义问题，Prettier 更关注格式化。项目里通常会把 ESLint 接入提交前检查和 CI，保证代码在合并前通过 lint、类型检查和构建。

进一步可以补充：

- TypeScript 需要 `@typescript-eslint`。
- React hooks 依赖专门规则检查调用顺序。
- Vue SFC 需要 Vue parser 和 plugin。
- ESLint 不能完全替代 TypeScript 类型检查。

## 16. 总结

ESLint 的本质是自动化代码治理。

记住这些点：

- parser 让 ESLint 看懂语法。
- plugin 提供更多规则。
- rule 定义具体检查。
- Prettier 管格式，ESLint 管质量。
- 本地 hooks 提升体验，CI 才是最终保证。

用好 ESLint，可以把团队协作里的很多小摩擦提前消掉。
