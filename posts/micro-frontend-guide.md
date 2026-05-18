---
title: 微前端实战与面试复习
date: 2026-05-19
description: 从概念、架构拆分、运行时集成、通信、样式隔离、部署和面试表达系统梳理微前端。
---

# 微前端实战与面试复习

微前端的核心目标是：把一个大型前端应用拆成多个可以独立开发、独立构建、独立部署的子应用，同时在用户侧仍然表现为一个完整产品。

它不是单纯的 iframe，也不是简单地把页面拆成组件。微前端更像是前端侧的“系统集成方案”：主应用负责路由、权限、布局和公共能力，子应用负责各自业务域。

## 什么时候需要微前端

适合使用微前端的场景：

- 一个后台系统越来越大，不同团队维护不同业务模块。
- 老项目技术栈陈旧，但不能一次性重写。
- 多个业务线需要统一登录、统一菜单、统一框架。
- 子应用需要独立上线，减少主应用发版风险。

不适合的场景：

- 项目规模不大，一个团队就能维护。
- 子应用之间强依赖、共享大量内部状态。
- 只是想“用新技术”，但没有组织协作和部署隔离诉求。

面试里可以这样回答：

> 微前端解决的不是组件复用问题，而是大型前端系统的工程治理问题。它通过应用级拆分，让不同业务模块可以独立开发、构建和部署，同时由主应用统一路由、权限、布局和公共能力。

## 常见方案对比

| 方案 | 特点 | 优点 | 风险 |
| --- | --- | --- | --- |
| iframe | 浏览器原生隔离 | JS/CSS 隔离强，实现简单 | 路由、通信、弹窗、体验割裂 |
| single-spa | 生命周期编排 | 灵活，生态成熟 | 需要自己处理资源加载和隔离 |
| qiankun | 基于 single-spa 封装 | 接入成本低，适合国内后台系统 | 对构建产物和全局副作用有要求 |
| Module Federation | 构建时和运行时模块共享 | 适合模块级远程加载 | 版本共享和构建配置复杂 |
| Web Components | 组件级隔离 | 标准化，自带 Shadow DOM | 对应用级路由和状态治理不足 |

实际开发里，后台管理系统常用 `qiankun` 或 `single-spa`；偏组件和模块复用的系统可以考虑 Module Federation。

## 一个典型微前端架构

```txt
main-app
  ├─ 登录态、权限、菜单
  ├─ 顶部导航、侧边栏、全局布局
  ├─ 子应用注册表
  └─ 公共 SDK：请求、埋点、错误上报、消息通信

sub-app-order
  └─ 订单域页面

sub-app-user
  └─ 用户域页面

sub-app-marketing
  └─ 营销域页面
```

主应用只关心“什么时候加载哪个子应用”，不要深入子应用内部业务。

## 主应用注册子应用

下面用 qiankun 风格演示。主应用注册子应用，并根据路由前缀激活。

```ts
// main-app/src/micro/apps.ts
import { registerMicroApps, start } from 'qiankun'

registerMicroApps([
  {
    name: 'order',
    entry: 'https://cdn.example.com/order/',
    container: '#subapp-container',
    activeRule: '/order',
    props: {
      basename: '/order',
      getToken: () => localStorage.getItem('token'),
      emitGlobalEvent: (event: string, payload: unknown) => {
        window.dispatchEvent(new CustomEvent(event, { detail: payload }))
      }
    }
  },
  {
    name: 'user',
    entry: 'https://cdn.example.com/user/',
    container: '#subapp-container',
    activeRule: '/user',
    props: {
      basename: '/user',
      getToken: () => localStorage.getItem('token')
    }
  }
])

start({
  sandbox: {
    strictStyleIsolation: false,
    experimentalStyleIsolation: true
  },
  prefetch: 'all'
})
```

这里有几个关键点：

- `entry` 是子应用部署地址。
- `container` 是子应用挂载容器。
- `activeRule` 决定路由匹配。
- `props` 是主应用传给子应用的公共能力。
- `sandbox` 用来减少全局变量和样式污染。

## 子应用暴露生命周期

子应用需要暴露 `bootstrap`、`mount`、`unmount` 这类生命周期，让主应用可以控制它什么时候初始化、挂载和卸载。

```ts
// sub-app-order/src/main.ts
import { createApp, type App } from 'vue'
import AppRoot from './App.vue'
import router from './router'

let app: App<Element> | null = null

function render(props: { container?: Element; basename?: string } = {}) {
  const container = props.container?.querySelector('#app') ?? document.querySelector('#app')

  app = createApp(AppRoot)
  app.provide('basename', props.basename ?? '/')
  app.use(router)
  app.mount(container!)
}

if (!(window as any).__POWERED_BY_QIANKUN__) {
  render()
}

export async function bootstrap() {
  console.log('[order] bootstrap')
}

export async function mount(props: { container?: Element; basename?: string }) {
  render(props)
}

export async function unmount() {
  app?.unmount()
  app = null
}
```

开发时要注意：子应用必须能独立运行，也必须能被主应用挂载运行。

## 子应用路由配置

子应用被挂载到 `/order` 下时，内部路由要感知 base。

```ts
// sub-app-order/src/router.ts
import { createRouter, createWebHistory } from 'vue-router'
import OrderList from './pages/OrderList.vue'
import OrderDetail from './pages/OrderDetail.vue'

const basename = (window as any).__POWERED_BY_QIANKUN__ ? '/order' : '/'

export default createRouter({
  history: createWebHistory(basename),
  routes: [
    { path: '/', component: OrderList },
    { path: '/detail/:id', component: OrderDetail }
  ]
})
```

如果 base 没处理好，常见问题是：刷新 404、子应用内部跳转路径错、资源路径错。

## 子应用构建配置

子应用需要以可被主应用加载的形式输出。

```ts
// sub-app-order/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: process.env.NODE_ENV === 'production' ? 'https://cdn.example.com/order/' : '/',
  server: {
    port: 7101,
    cors: true
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'umd',
        entryFileNames: 'assets/order.js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
```

真实项目里，不同框架和微前端方案对构建配置要求不同，但核心关注点一致：

- 资源路径是否稳定。
- 跨域是否允许主应用加载。
- 子应用全局变量是否冲突。
- 子应用卸载后是否清理副作用。

## 应用间通信

微前端通信不要滥用全局状态。优先按复杂度选择：

1. 简单通知：`CustomEvent`
2. 主子传参：`props`
3. 共享状态：独立 store 或 event bus
4. 跨标签页：`BroadcastChannel`

简单事件通信示例：

```ts
// main-app/src/events.ts
export function emit(event: string, payload: unknown) {
  window.dispatchEvent(new CustomEvent(event, { detail: payload }))
}

export function on<T>(event: string, handler: (payload: T) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<T>).detail)
  window.addEventListener(event, listener)
  return () => window.removeEventListener(event, listener)
}
```

子应用监听登录态变化：

```ts
import { onUnmounted } from 'vue'

const removeListener = window.addEventListener('auth:expired', () => {
  // 清理当前页面状态，跳转登录或展示弹窗
})

onUnmounted(() => {
  window.removeEventListener('auth:expired', removeListener as any)
})
```

更推荐封装成 SDK，不要让所有子应用直接操作 `window`。

```ts
// shared-sdk/eventBus.ts
type Handler<T = unknown> = (payload: T) => void

const handlers = new Map<string, Set<Handler>>()

export function publish<T>(event: string, payload: T) {
  handlers.get(event)?.forEach((handler) => handler(payload))
}

export function subscribe<T>(event: string, handler: Handler<T>) {
  if (!handlers.has(event)) handlers.set(event, new Set())
  handlers.get(event)!.add(handler as Handler)

  return () => {
    handlers.get(event)?.delete(handler as Handler)
  }
}
```

## 样式隔离

样式污染是微前端最常见的问题之一。比如 A 子应用写了：

```css
button {
  color: red;
}
```

它可能影响主应用和其他子应用。解决思路：

- 约定 CSS 命名空间。
- 使用 CSS Modules。
- 使用 Shadow DOM 或样式沙箱。
- 禁止写全局标签选择器。

推荐写法：

```vue
<template>
  <section class="order-page">
    <button class="order-page__submit">提交订单</button>
  </section>
</template>

<style scoped>
.order-page__submit {
  color: #2563eb;
}
</style>
```

团队层面还应该加 lint 规则，禁止子应用写全局样式。

## 全局副作用清理

子应用卸载时必须清理定时器、事件监听、全局变量和未完成请求。

```ts
let timer: number | null = null
let abortController: AbortController | null = null

export async function mount() {
  timer = window.setInterval(() => {
    console.log('polling')
  }, 5000)

  abortController = new AbortController()
  fetch('/api/order/list', {
    signal: abortController.signal
  })
}

export async function unmount() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }

  abortController?.abort()
  abortController = null
}
```

如果不清理，用户在多个子应用之间切换后，可能出现重复请求、内存泄漏、事件重复触发。

## 权限和登录态设计

推荐由主应用统一处理登录态：

- 主应用负责登录、刷新 token、退出登录。
- 子应用通过 props 或 SDK 获取 token。
- 子应用不要自己维护一套登录流程。
- 请求库统一处理 401。

```ts
// shared-sdk/request.ts
export function createRequest(getToken: () => string | null) {
  return async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${getToken() ?? ''}`
      }
    })

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
      throw new Error('Unauthorized')
    }

    return response.json() as Promise<T>
  }
}
```

## 部署策略

微前端部署要重点保证“主应用和子应用版本兼容”。

常见方案：

- 主应用维护子应用 entry 清单。
- 每个子应用独立部署到 CDN。
- 灰度时只切换某个子应用地址。
- 公共 SDK 做版本约束。

示例：

```json
{
  "apps": [
    {
      "name": "order",
      "entry": "https://cdn.example.com/order/1.8.2/",
      "activeRule": "/order"
    },
    {
      "name": "user",
      "entry": "https://cdn.example.com/user/2.1.0/",
      "activeRule": "/user"
    }
  ]
}
```

主应用启动时拉取清单：

```ts
async function loadMicroAppsManifest() {
  const response = await fetch('/micro-apps.json', { cache: 'no-cache' })
  return response.json()
}
```

这样可以在不重新发布主应用的情况下调整子应用版本。

## 常见问题排查

子应用加载失败：

- 检查 `entry` 地址是否能访问。
- 检查 CORS。
- 检查构建产物路径。
- 检查 GitHub Pages / CDN base 路径。

样式错乱：

- 搜索全局 CSS。
- 检查 reset 样式是否污染。
- 打开样式隔离。

页面切换后重复请求：

- 检查 `unmount` 是否清理定时器和监听器。
- 检查组件卸载时是否取消请求。

刷新 404：

- 检查主应用服务器是否把子路由回退到 `index.html`。
- 检查子应用 router base。

## 面试回答模板

可以按这个顺序回答：

1. 微前端解决大型前端应用的独立开发、独立部署和渐进迁移问题。
2. 主应用负责路由、权限、布局、公共 SDK，子应用负责独立业务域。
3. 子应用通过生命周期接入主应用，挂载时初始化，卸载时清理副作用。
4. 通信优先用 props 和事件，复杂场景再上共享 store。
5. 难点主要是路由 base、资源路径、样式隔离、全局变量污染、版本兼容和部署治理。

简洁版：

> 我理解微前端不是为了拆组件，而是为了拆团队和业务边界。落地时我会先设计主应用和子应用职责，再处理注册加载、路由 base、样式隔离、通信、权限、部署清单和卸载清理。真正上线后，最需要关注的是子应用版本兼容、全局副作用和故障隔离。
