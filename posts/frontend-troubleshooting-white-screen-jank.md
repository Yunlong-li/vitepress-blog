---
title: 前端故障排查：白屏与页面卡顿
date: 2026-05-19
description: 以用户页面白屏和卡顿为例，系统梳理前端故障排查思路、监控埋点、代码定位和面试表达。
---

# 前端故障排查：白屏与页面卡顿

前端故障排查的核心不是“猜哪里错了”，而是建立一条证据链：

```txt
用户现象 -> 影响范围 -> 监控数据 -> 复现路径 -> 技术定位 -> 修复验证 -> 复盘预防
```

面试里如果被问“用户反馈页面白屏或卡顿，你怎么排查”，不要只说“看控制台”。更好的回答是从用户、网络、资源、运行时、框架、数据接口、性能指标几个层面逐步收敛。

## 先判断问题类型

白屏和卡顿虽然都表现为“页面不可用”，但方向不同。

| 现象 | 常见原因 | 首要证据 |
| --- | --- | --- |
| 白屏 | JS 报错、资源加载失败、接口阻塞、路由异常、部署路径错误 | console error、资源 404、错误上报 |
| 卡顿 | 长任务、渲染压力大、内存泄漏、频繁重排、接口数据量大 | Performance、Long Task、FPS、内存曲线 |
| 局部不可用 | 组件异常、接口失败、权限数据异常 | 组件错误边界、接口日志 |
| 偶现问题 | 缓存、灰度版本、浏览器兼容、弱网 | 用户环境、版本号、traceId |

## 白屏排查流程

推荐流程：

1. 确认影响范围：全部用户、部分用户、某个浏览器、某个路由。
2. 看资源加载：HTML、JS、CSS 是否 200。
3. 看运行时错误：是否有 JS exception。
4. 看接口依赖：首屏接口是否失败或超时。
5. 看路由和 base：部署路径是否匹配。
6. 看最近发布：是否和某次上线强相关。

## 白屏监控埋点

白屏监控可以在页面加载后检查关键容器是否有内容。

```ts
// src/monitor/blankScreen.ts
type BlankScreenReport = {
  url: string
  emptyPoints: number
  userAgent: string
  timestamp: number
}

function isWrapper(element: Element | null) {
  if (!element) return true

  const wrapperSelectors = ['html', 'body', '#app', '#root']
  const selector = element.id ? `#${element.id}` : element.tagName.toLowerCase()

  return wrapperSelectors.includes(selector)
}

export function detectBlankScreen(report: (data: BlankScreenReport) => void) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const points = [
        [window.innerWidth / 2, window.innerHeight / 2],
        [window.innerWidth / 4, window.innerHeight / 4],
        [(window.innerWidth * 3) / 4, window.innerHeight / 4],
        [window.innerWidth / 4, (window.innerHeight * 3) / 4],
        [(window.innerWidth * 3) / 4, (window.innerHeight * 3) / 4]
      ]

      const emptyPoints = points.reduce((count, [x, y]) => {
        const element = document.elementFromPoint(x, y)
        return isWrapper(element) ? count + 1 : count
      }, 0)

      if (emptyPoints >= 4) {
        report({
          url: location.href,
          emptyPoints,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      }
    }, 3000)
  })
}
```

接入：

```ts
import { detectBlankScreen } from './monitor/blankScreen'

detectBlankScreen((data) => {
  navigator.sendBeacon('/api/monitor/blank-screen', JSON.stringify(data))
})
```

注意：白屏检测只是发现问题，不能直接说明原因。原因还要结合错误、资源、接口和版本。

## 捕获 JS 运行时错误

```ts
// src/monitor/error.ts
type ErrorReport = {
  type: 'js-error' | 'promise-error' | 'resource-error'
  message: string
  filename?: string
  lineno?: number
  colno?: number
  stack?: string
  url: string
  timestamp: number
}

function reportError(data: ErrorReport) {
  navigator.sendBeacon('/api/monitor/error', JSON.stringify(data))
}

export function setupErrorMonitor() {
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target as HTMLElement

      if (target && target !== window && ['IMG', 'SCRIPT', 'LINK'].includes(target.tagName)) {
        reportError({
          type: 'resource-error',
          message: `${target.tagName} load failed`,
          filename: (target as HTMLImageElement | HTMLScriptElement).src,
          url: location.href,
          timestamp: Date.now()
        })
        return
      }

      reportError({
        type: 'js-error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        url: location.href,
        timestamp: Date.now()
      })
    },
    true
  )

  window.addEventListener('unhandledrejection', (event) => {
    reportError({
      type: 'promise-error',
      message: String(event.reason?.message ?? event.reason),
      stack: event.reason?.stack,
      url: location.href,
      timestamp: Date.now()
    })
  })
}
```

如果线上代码经过压缩，还需要上传 sourcemap，把堆栈还原到源码位置。

## Vue 错误边界

Vue 项目可以捕获组件错误，避免一个组件把整个页面打崩。

```ts
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  navigator.sendBeacon(
    '/api/monitor/vue-error',
    JSON.stringify({
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : '',
      component: instance?.type?.name,
      info,
      url: location.href,
      timestamp: Date.now()
    })
  )
}

app.mount('#app')
```

组件内部还可以做兜底：

```vue
<template>
  <ErrorFallback v-if="hasError" />
  <RealContent v-else />
</template>

<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const hasError = ref(false)

onErrorCaptured((error) => {
  hasError.value = true
  console.error(error)
  return false
})
</script>
```

## 接口问题排查

首屏接口失败或超时也可能造成白屏。请求层要加 traceId、耗时和状态码。

```ts
// src/request.ts
export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const traceId = crypto.randomUUID()
  const start = performance.now()

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-trace-id': traceId
      }
    })

    const duration = performance.now() - start

    if (!response.ok) {
      reportApiError({ url, traceId, status: response.status, duration })
      throw new Error(`Request failed: ${response.status}`)
    }

    reportApiTiming({ url, traceId, status: response.status, duration })
    return response.json()
  } catch (error) {
    reportApiError({
      url,
      traceId,
      status: 0,
      duration: performance.now() - start,
      message: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

function reportApiTiming(data: unknown) {
  navigator.sendBeacon('/api/monitor/api-timing', JSON.stringify(data))
}

function reportApiError(data: unknown) {
  navigator.sendBeacon('/api/monitor/api-error', JSON.stringify(data))
}
```

排查时要能回答：

- 接口有没有发出去。
- 状态码是多少。
- 是 DNS、TCP、TLS 慢，还是后端响应慢。
- 是否只有某些用户权限或参数失败。
- 前端有没有对失败状态做兜底。

## 页面卡顿排查流程

卡顿要从主线程看。浏览器渲染、JS 执行、事件响应都依赖主线程，主线程被长任务占住，页面就会卡。

排查路径：

1. 用 Performance 录制卡顿过程。
2. 找超过 50ms 的 Long Task。
3. 看是 JS 计算、布局 Layout、绘制 Paint 还是 GC。
4. 定位具体函数和组件。
5. 做分片、缓存、虚拟列表、懒加载或 worker 化。

## Long Task 监控

```ts
// src/monitor/longTask.ts
export function setupLongTaskMonitor() {
  if (!('PerformanceObserver' in window)) return

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      navigator.sendBeacon(
        '/api/monitor/long-task',
        JSON.stringify({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          url: location.href,
          timestamp: Date.now()
        })
      )
    }
  })

  observer.observe({ entryTypes: ['longtask'] })
}
```

如果线上监控显示某个页面 Long Task 很多，再去本地用 Performance 细看调用栈。

## 示例：大列表导致卡顿

问题代码：

```vue
<template>
  <div>
    <div v-for="item in list" :key="item.id" class="row">
      {{ item.name }} - {{ expensiveFormat(item) }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  list: Array<{ id: number; name: string; value: number }>
}>()

function expensiveFormat(item: { value: number }) {
  let result = 0
  for (let i = 0; i < 10000; i++) {
    result += Math.sqrt(item.value + i)
  }
  return result.toFixed(2)
}
</script>
```

问题：

- 一次渲染大量 DOM。
- 模板里直接调用重计算函数。
- 响应式更新时可能重复计算。

优化方向一：预计算。

```ts
import { computed } from 'vue'

const props = defineProps<{
  list: Array<{ id: number; name: string; value: number }>
}>()

const displayList = computed(() =>
  props.list.map((item) => ({
    ...item,
    formattedValue: expensiveFormat(item.value)
  }))
)

function expensiveFormat(value: number) {
  let result = 0
  for (let i = 0; i < 10000; i++) {
    result += Math.sqrt(value + i)
  }
  return result.toFixed(2)
}
```

优化方向二：虚拟列表。

```vue
<template>
  <div ref="containerRef" class="list" @scroll="onScroll">
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div
        v-for="item in visibleList"
        :key="item.id"
        class="row"
        :style="{ transform: `translateY(${item.top}px)` }"
      >
        {{ item.name }} - {{ item.formattedValue }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const rowHeight = 40
const viewportHeight = 600
const scrollTop = ref(0)

const props = defineProps<{
  list: Array<{ id: number; name: string; formattedValue: string }>
}>()

const totalHeight = computed(() => props.list.length * rowHeight)
const start = computed(() => Math.floor(scrollTop.value / rowHeight))
const end = computed(() => start.value + Math.ceil(viewportHeight / rowHeight) + 5)

const visibleList = computed(() =>
  props.list.slice(start.value, end.value).map((item, index) => ({
    ...item,
    top: (start.value + index) * rowHeight
  }))
)

function onScroll(event: Event) {
  scrollTop.value = (event.target as HTMLElement).scrollTop
}
</script>

<style scoped>
.list {
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

## 示例：死循环或频繁 setState

React 中常见的卡顿：

```tsx
function SearchPanel({ keyword }: { keyword: string }) {
  const [result, setResult] = useState<string[]>([])

  useEffect(() => {
    setResult(expensiveSearch(keyword))
  })

  return <ResultList list={result} />
}
```

问题是 `useEffect` 没写依赖，每次 render 都会执行，又触发 setState。

修复：

```tsx
function SearchPanel({ keyword }: { keyword: string }) {
  const result = useMemo(() => expensiveSearch(keyword), [keyword])

  return <ResultList list={result} />
}
```

排查时看 Performance 里的重复函数调用，或者 React DevTools Profiler 里的频繁 render。

## 灰度和回滚

前端故障处理还要关注止血。

常见止血手段：

- 回滚到上一个版本。
- 关闭功能开关。
- CDN 刷新缓存。
- 降级非核心模块。
- 接口失败时展示兜底页面。

示例：功能开关。

```ts
const flags = await fetch('/feature-flags.json', { cache: 'no-cache' }).then((res) => res.json())

if (flags.enableNewDashboard) {
  mountNewDashboard()
} else {
  mountStableDashboard()
}
```

## 面试回答模板

白屏问题：

> 我会先判断影响范围和最近发布，再从资源加载、JS 运行时错误、接口失败、路由 base 和缓存几个方向排查。线上要有错误监控、资源加载失败监控、白屏检测和接口 traceId。定位后先止血，比如回滚或关闭功能开关，再修复根因并补监控。

卡顿问题：

> 卡顿一般是主线程被占用。我会用 Performance 录制，找 Long Task，看是 JS 计算、Layout、Paint 还是 GC。常见优化包括减少同步计算、缓存结果、虚拟列表、拆分长任务、Web Worker、减少重排重绘和控制组件重复渲染。

## 排查清单

- 是否只有某个版本出问题。
- 是否只有某个路由出问题。
- JS、CSS、图片资源是否 404。
- console 是否有 error。
- Promise rejection 是否被捕获。
- 首屏接口是否失败或超时。
- 是否有 sourcemap 可还原源码。
- 是否有 Long Task。
- 是否有内存持续上涨。
- 是否可以通过回滚或功能开关止血。
