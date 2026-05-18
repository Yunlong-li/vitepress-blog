---
title: 前端性能优化系统梳理
date: 2026-05-19
description: 从加载、渲染、运行时、网络、缓存、图片、代码和监控角度系统梳理前端性能优化，并结合代码示例。
---

# 前端性能优化系统梳理

前端性能优化不是背几个术语，而是围绕用户体验指标做系统治理。

常见目标：

- 更快看到内容：优化 FCP、LCP。
- 更快可以交互：优化 TTI、INP。
- 更稳定：优化 CLS。
- 更省资源：减少 JS、图片、请求和内存。

面试里可以先讲框架：

> 我会从加载性能、渲染性能、运行时性能、网络缓存、资源优化和监控闭环几个方向做。先用指标定位瓶颈，再选择具体优化手段，最后通过数据验证收益。

## 性能指标

| 指标 | 含义 | 优化方向 |
| --- | --- | --- |
| FCP | 首次内容绘制 | 减少阻塞资源，优化 HTML/CSS |
| LCP | 最大内容绘制 | 优化首屏大图、接口、SSR/SSG |
| CLS | 布局偏移 | 给图片和广告位预留尺寸 |
| INP | 交互响应 | 减少长任务，降低主线程压力 |
| TTFB | 首字节时间 | CDN、缓存、服务端优化 |

## 建立性能监控

没有监控就无法证明优化有效。

```ts
// src/monitor/webVitals.ts
type Metric = {
  name: string
  value: number
  rating?: string
  url: string
  timestamp: number
}

function report(metric: Metric) {
  navigator.sendBeacon('/api/monitor/performance', JSON.stringify(metric))
}

export function setupPerformanceMonitor() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

  if (navigation) {
    report({
      name: 'TTFB',
      value: navigation.responseStart - navigation.requestStart,
      url: location.href,
      timestamp: Date.now()
    })
  }

  const paintEntries = performance.getEntriesByType('paint')
  for (const entry of paintEntries) {
    report({
      name: entry.name,
      value: entry.startTime,
      url: location.href,
      timestamp: Date.now()
    })
  }
}
```

真实项目可以接入 `web-vitals` 包，自动采集 LCP、CLS、INP。

```ts
import { onCLS, onINP, onLCP } from 'web-vitals'

onLCP((metric) => reportMetric(metric))
onCLS((metric) => reportMetric(metric))
onINP((metric) => reportMetric(metric))

function reportMetric(metric: { name: string; value: number; rating: string }) {
  navigator.sendBeacon(
    '/api/monitor/web-vitals',
    JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      url: location.href,
      timestamp: Date.now()
    })
  )
}
```

## 加载优化：减少首屏资源

首屏慢通常是资源太多、JS 太大、接口太慢或渲染被阻塞。

### 路由级代码分割

```ts
// router.ts
import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./pages/HomePage.vue')
    },
    {
      path: '/dashboard',
      component: () => import('./pages/DashboardPage.vue')
    },
    {
      path: '/settings',
      component: () => import('./pages/SettingsPage.vue')
    }
  ]
})
```

这样首屏不会一次性加载所有页面代码。

### 组件级懒加载

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
</script>

<template>
  <section>
    <Suspense>
      <HeavyChart />
      <template #fallback>
        <div class="skeleton">图表加载中...</div>
      </template>
    </Suspense>
  </section>
</template>
```

适合首屏不立即需要的图表、编辑器、地图、富文本。

### 依赖按需加载

错误示例：

```ts
import * as echarts from 'echarts'
```

如果只用柱状图，可以按需引入：

```ts
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])
```

优化目标是减少首屏 bundle 体积。

## 网络优化：缓存与请求合并

### 静态资源缓存

构建产物一般带 hash：

```txt
assets/index.8f3a1c.js
assets/style.a91cd.css
```

可以设置长缓存：

```txt
Cache-Control: public, max-age=31536000, immutable
```

HTML 不建议长缓存：

```txt
Cache-Control: no-cache
```

因为 HTML 决定加载哪个 hash 资源，缓存过久会导致用户拿到旧入口。

### 请求去重

同一个接口同时触发多次，可以做请求去重。

```ts
const pendingRequests = new Map<string, Promise<unknown>>()

export function dedupeRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>
  }

  const promise = request().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, promise)
  return promise
}
```

使用：

```ts
const user = await dedupeRequest('user-profile', () => fetch('/api/user').then((res) => res.json()))
```

### 接口缓存

对不频繁变化的数据，可以加内存缓存。

```ts
type CacheItem<T> = {
  value: T
  expireAt: number
}

const cache = new Map<string, CacheItem<unknown>>()

export async function cachedRequest<T>(key: string, ttl: number, request: () => Promise<T>) {
  const cached = cache.get(key) as CacheItem<T> | undefined

  if (cached && cached.expireAt > Date.now()) {
    return cached.value
  }

  const value = await request()
  cache.set(key, {
    value,
    expireAt: Date.now() + ttl
  })

  return value
}
```

## 图片优化

图片经常是 LCP 的关键。

### 使用现代格式和响应式图片

```html
<picture>
  <source srcset="/hero.avif" type="image/avif" />
  <source srcset="/hero.webp" type="image/webp" />
  <img
    src="/hero.jpg"
    width="1200"
    height="630"
    alt="首页主视觉"
    loading="eager"
    fetchpriority="high"
  />
</picture>
```

要点：

- 首屏 LCP 图片不要懒加载。
- 明确 `width` 和 `height`，减少 CLS。
- 非首屏图片使用 `loading="lazy"`。

```html
<img src="/gallery-1.webp" width="640" height="360" loading="lazy" alt="案例截图" />
```

## 渲染优化：减少重排重绘

会触发布局计算的属性包括：

- `width`
- `height`
- `top`
- `left`
- `margin`
- `padding`

动画优先使用：

- `transform`
- `opacity`

错误示例：

```ts
function move(element: HTMLElement, x: number) {
  element.style.left = `${x}px`
}
```

更好：

```ts
function move(element: HTMLElement, x: number) {
  element.style.transform = `translateX(${x}px)`
}
```

### 批量读写 DOM

错误示例：

```ts
for (const item of items) {
  const height = item.offsetHeight
  item.style.height = `${height + 10}px`
}
```

这会交替读写，容易触发多次 layout。

优化：

```ts
const heights = items.map((item) => item.offsetHeight)

items.forEach((item, index) => {
  item.style.height = `${heights[index] + 10}px`
})
```

## 运行时优化：拆分长任务

如果一段计算超过 50ms，会影响交互响应。

错误示例：

```ts
function processLargeList(list: number[]) {
  return list.map((item) => heavyCompute(item))
}
```

分片执行：

```ts
export function processInChunks<T, R>(
  list: T[],
  worker: (item: T) => R,
  onProgress: (results: R[]) => void,
  chunkSize = 100
) {
  let index = 0
  const results: R[] = []

  function runChunk() {
    const end = Math.min(index + chunkSize, list.length)

    while (index < end) {
      results.push(worker(list[index]))
      index++
    }

    onProgress(results)

    if (index < list.length) {
      requestIdleCallback(runChunk)
    }
  }

  requestIdleCallback(runChunk)
}
```

如果计算非常重，可以使用 Web Worker。

```ts
// worker.ts
self.onmessage = (event) => {
  const result = event.data.list.map((item: number) => heavyCompute(item))
  self.postMessage(result)
}

function heavyCompute(value: number) {
  let result = 0
  for (let i = 0; i < 100000; i++) {
    result += Math.sqrt(value + i)
  }
  return result
}
```

主线程：

```ts
const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module'
})

worker.postMessage({ list: largeList })
worker.onmessage = (event) => {
  renderResult(event.data)
}
```

## 列表优化：虚拟列表

大列表不要一次性渲染全部 DOM。

```vue
<template>
  <div class="viewport" @scroll="onScroll">
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div
        v-for="row in visibleRows"
        :key="row.id"
        class="row"
        :style="{ transform: `translateY(${row.top}px)` }"
      >
        {{ row.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  list: Array<{ id: number; name: string }>
}>()

const rowHeight = 40
const viewportHeight = 600
const scrollTop = ref(0)

const startIndex = computed(() => Math.floor(scrollTop.value / rowHeight))
const endIndex = computed(() => startIndex.value + Math.ceil(viewportHeight / rowHeight) + 8)
const totalHeight = computed(() => props.list.length * rowHeight)

const visibleRows = computed(() =>
  props.list.slice(startIndex.value, endIndex.value).map((row, index) => ({
    ...row,
    top: (startIndex.value + index) * rowHeight
  }))
)

function onScroll(event: Event) {
  scrollTop.value = (event.target as HTMLElement).scrollTop
}
</script>

<style scoped>
.viewport {
  height: 600px;
  overflow: auto;
}

.row {
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
}
</style>
```

虚拟列表适合表格、日志、消息、搜索结果这类大数据渲染。

## 框架层优化

Vue 中常见优化：

- `computed` 缓存派生数据。
- `v-memo` 跳过不必要更新。
- `v-once` 渲染静态内容。
- 大组件拆小，控制响应式范围。
- 列表 key 稳定，不用 index。

```vue
<template>
  <div v-for="item in list" :key="item.id" v-memo="[item.id, item.updatedAt]">
    <UserCard :user="item" />
  </div>
</template>
```

React 中常见优化：

- `useMemo` 缓存计算。
- `useCallback` 稳定函数引用。
- `React.memo` 减少子组件重复渲染。
- 避免把新对象直接传给 memo 组件。

```tsx
const columns = useMemo(() => createColumns(userRole), [userRole])
const handleSelect = useCallback((id: string) => setSelectedId(id), [])

return <DataTable columns={columns} onSelect={handleSelect} />
```

## 构建优化

构建优化的目标是减少产物体积和提升构建速度。

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router'],
          charts: ['echarts']
        }
      }
    }
  }
})
```

同时要配合 bundle analyzer 看真实体积。

```bash
pnpm add -D rollup-plugin-visualizer
```

```ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ]
})
```

## SSR、SSG 和预渲染

如果首屏依赖大量 JS 才能出现内容，可以考虑：

- 文档和博客：SSG。
- 营销页、SEO 页面：SSG 或预渲染。
- 强动态内容：SSR。
- 后台系统：通常先做代码分割和接口优化，不一定需要 SSR。

VitePress 本身就是 SSG，所以博客类内容天然适合静态生成。

## 优化闭环

性能优化要闭环：

1. 采集指标：LCP、CLS、INP、资源体积、接口耗时。
2. 定位瓶颈：Performance、Network、Coverage、Lighthouse。
3. 做针对性优化。
4. 灰度发布。
5. 对比优化前后数据。

不要只说“我做了懒加载”，要能说明优化了哪个指标。

## 面试回答模板

可以这样回答：

> 我会先通过监控和工具确认瓶颈，比如 LCP 慢、JS 包大、接口慢、长任务多还是 CLS 高。加载层面做代码分割、按需加载、缓存和图片优化；渲染层面减少重排重绘、使用虚拟列表；运行时层面缓存计算、拆分长任务、必要时用 Web Worker；工程层面做 bundle 分析、CDN 缓存和性能监控。最后用数据对比优化前后的 LCP、INP、资源体积和接口耗时。

## 实战清单

- 首屏 JS 是否过大。
- 路由和重组件是否懒加载。
- 图片是否压缩、懒加载、设置尺寸。
- LCP 图片是否优先加载。
- 静态资源是否使用长缓存。
- HTML 是否避免长缓存。
- 接口是否去重、缓存、并发控制。
- 大列表是否虚拟滚动。
- 长任务是否拆分或 worker 化。
- 是否有性能监控证明收益。
