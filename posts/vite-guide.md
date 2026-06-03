---
title: Vite 讲解：从原生 ESM 到极速开发和生产构建
date: 2026-06-03
description: 系统讲解 Vite 的开发服务器原理、原生 ESM、依赖预构建、HMR、生产构建、插件机制、环境变量、代理、性能优化和与 Webpack 的区别。
---

# Vite 讲解：从原生 ESM 到极速开发和生产构建

Vite 是现代前端项目里非常常用的构建工具。它最直观的特点是开发启动快、热更新快、配置相对简单。Vite 的关键思路是：开发阶段尽量不打包源码，而是利用浏览器原生 ESM 按需加载模块。

一句话理解：

> Vite 开发时使用原生 ESM 和按需转换，生产时使用 Rollup 打包优化。

## 1. 为什么 Vite 快

传统打包工具在开发启动时，往往需要先从入口开始构建完整依赖图，再把 bundle 提供给浏览器。项目越大，冷启动越慢。

Vite 的开发模式不同：

```mermaid
flowchart LR
  Browser["浏览器请求模块"] --> DevServer["Vite Dev Server"]
  DevServer --> Transform["按需转换源码"]
  Transform --> Browser
```

浏览器访问页面时，看到：

```html
<script type="module" src="/src/main.ts"></script>
```

浏览器会按 ESM 规则继续请求 `main.ts` 里 import 的模块。Vite 只在模块被请求时转换它。

这就是“按需编译”。

## 2. 开发阶段和生产阶段

Vite 的两个阶段不完全一样。

| 阶段 | 方式 | 核心目标 |
| --- | --- | --- |
| 开发 | 原生 ESM + esbuild + 按需转换 | 快速启动、快速 HMR |
| 生产 | Rollup 打包 | 代码分割、压缩、缓存、兼容部署 |

开发阶段不打完整 bundle，是为了快。

生产阶段仍然需要打包，因为线上要考虑：

- 资源压缩。
- 代码分割。
- 浏览器缓存。
- 兼容性。
- 请求数量控制。
- Tree shaking。

## 3. 基础项目结构

典型 Vite 项目：

```txt
index.html
package.json
vite.config.ts
src
  main.ts
  App.vue
  assets
  components
```

和很多构建工具不同，Vite 把 `index.html` 当成入口的一部分。

```html
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

这样入口关系更贴近浏览器实际加载方式。

## 4. 基础配置

Vue 项目：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173
  }
})
```

React 项目：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})
```

常见配置：

| 字段 | 作用 |
| --- | --- |
| plugins | 插件 |
| server | 开发服务器 |
| build | 生产构建 |
| resolve.alias | 路径别名 |
| css | CSS 处理 |
| define | 编译期常量 |
| optimizeDeps | 依赖预构建 |

## 5. 依赖预构建

Vite 开发阶段会把第三方依赖预构建，主要原因有两个：

1. 把 CommonJS 或 UMD 依赖转换成 ESM。
2. 把有很多内部模块的依赖合并，减少浏览器请求数量。

例如：

```js
import { debounce } from 'lodash-es'
```

或者：

```js
import React from 'react'
```

Vite 会用 esbuild 做预构建，速度很快。

可以手动配置：

```ts
export default defineConfig({
  optimizeDeps: {
    include: ['lodash-es'],
    exclude: ['some-local-package']
  }
})
```

如果遇到依赖解析异常，可以从 `optimizeDeps` 入手排查。

## 6. HMR

HMR 是热模块替换。它的目标是修改代码后局部更新页面，同时尽量保留应用状态。

例如改一个 Vue 组件模板，Vite 不需要刷新整个页面，只更新这个组件。

HMR 快的原因：

- Vite 不需要重新打完整 bundle。
- 文件变更后只处理受影响模块。
- 浏览器通过 ESM 重新请求更新模块。

开发体验上的差距，在大型项目里会非常明显。

## 7. 路径别名

常见配置：

```ts
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
```

使用：

```ts
import UserCard from '@/components/UserCard.vue'
```

TypeScript 也要同步配置：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

否则编辑器和 TS 类型检查可能不认识别名。

## 8. 环境变量

Vite 支持 `.env` 文件：

```txt
.env
.env.development
.env.production
```

变量必须以 `VITE_` 开头才会暴露给客户端：

```bash
VITE_API_BASE_URL=https://api.example.com
```

使用：

```ts
const baseURL = import.meta.env.VITE_API_BASE_URL
```

注意：暴露给前端的变量不安全。不要把数据库密码、后端密钥、支付私钥放在 `VITE_` 变量里。

## 9. 开发代理

本地开发常用代理解决跨域：

```ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

前端请求：

```ts
fetch('/api/users')
```

实际代理到：

```txt
http://localhost:8080/users
```

代理只影响本地开发。生产环境要由 Nginx、网关或后端 CORS 配置解决。

## 10. CSS 和静态资源

Vite 原生支持 CSS：

```ts
import './style.css'
```

支持 CSS Modules：

```ts
import styles from './Button.module.css'

button.className = styles.primary
```

支持 Sass、Less 等预处理器，但需要安装对应依赖。

静态资源：

```ts
import logoUrl from './logo.svg'

const img = new Image()
img.src = logoUrl
```

生产构建后，资源会带上 hash，便于缓存。

## 11. 生产构建

执行：

```bash
vite build
```

Vite 会使用 Rollup 输出生产产物。

常见配置：

```ts
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue']
        }
      }
    }
  }
})
```

`manualChunks` 可以把较大的第三方依赖拆出来，但不要过度拆分。拆得太碎会增加请求管理成本。

## 12. 插件机制

Vite 插件基于 Rollup 插件机制，并增加了一些 Vite 专属钩子。

一个简单插件：

```ts
export default function demoPlugin() {
  return {
    name: 'demo-plugin',
    transform(code, id) {
      if (id.endsWith('.demo')) {
        return {
          code: `export default ${JSON.stringify(code)}`,
          map: null
        }
      }
    }
  }
}
```

插件可以做：

- 处理特殊文件类型。
- 注入虚拟模块。
- 修改 HTML。
- 编译框架文件。
- 集成 Mock、路由、国际化等能力。

## 13. SSR

Vite 支持 SSR 开发模式。它可以同时服务客户端代码和服务端渲染入口。

SSR 项目要考虑：

- 代码不能随便访问 `window`、`document`。
- 路由要能在服务端匹配。
- 数据预取要区分服务端和客户端。
- 状态要从服务端安全注入客户端。
- 构建通常分客户端和服务端两份。

如果只是普通后台管理系统，不一定需要 SSR；如果关注首屏、SEO、内容站点，可以考虑 Nuxt、Next、SvelteKit 这类框架。

## 14. Vite 和 Webpack 对比

| 对比项 | Vite | Webpack |
| --- | --- | --- |
| 开发启动 | 原生 ESM，按需转换，通常更快 | 通常先构建依赖图 |
| 生产构建 | Rollup | Webpack 自身 |
| 配置复杂度 | 相对简洁 | 可配置能力强 |
| 生态 | 现代框架支持好 | 历史生态非常成熟 |
| 复杂定制 | 能做，但某些场景不如 Webpack 历史方案多 | 更适合深度定制 |
| 老项目迁移 | 需要评估插件和依赖兼容 | 很多老项目已经沉淀 |

选择时不要只看“谁快”。要看项目依赖、团队经验、构建定制、插件生态和迁移成本。

## 15. 常见坑

### 15.1 开发能跑，生产构建失败

开发和生产机制不同。开发时原生 ESM 按需转换，生产时 Rollup 打包，某些动态导入、CommonJS 依赖、Node API 可能在生产暴露问题。

### 15.2 环境变量没加 VITE 前缀

只有 `VITE_` 前缀变量会暴露给客户端。

### 15.3 别名只配 Vite，没配 TS

Vite 能跑，但编辑器和类型检查报错。要同步配置 `tsconfig.json`。

### 15.4 过度 manualChunks

拆包不是越多越好。要结合缓存、首屏请求数量和实际体积分析。

## 16. 面试怎么回答

可以这样回答：

> Vite 开发阶段利用浏览器原生 ESM，不需要一开始把整个项目打成 bundle，而是浏览器请求哪个模块，开发服务器就按需转换哪个模块，所以冷启动和 HMR 都很快。第三方依赖会用 esbuild 做预构建，把 CommonJS 转成 ESM，也减少浏览器请求数量。生产阶段 Vite 使用 Rollup 打包，生成压缩、分包、带 hash 的静态资源。所以 Vite 的核心特点是开发时快，生产构建仍然是标准打包优化。

进一步可以补充：

- `index.html` 是入口的一部分。
- env 变量要用 `VITE_` 前缀。
- dev server proxy 只影响本地开发。
- Vite 和 Webpack 最大差异在开发阶段机制。

## 17. 总结

Vite 的核心不是“新工具”，而是开发阶段换了一种思路。

记住这些点：

- 开发时原生 ESM 按需转换。
- 第三方依赖通过 esbuild 预构建。
- 生产构建使用 Rollup。
- HMR 只更新受影响模块。
- 环境变量、代理、别名都要区分开发和生产。

理解这些，Vite 配置和排错就会清晰很多。
