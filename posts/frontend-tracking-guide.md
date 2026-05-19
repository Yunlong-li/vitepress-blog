---
title: 前端埋点实战与面试复习
date: 2026-05-19
description: 系统梳理前端埋点方案，包括 PV、UV、点击、曝光、性能、错误、上报 SDK、数据模型和面试表达。
---

# 前端埋点实战与面试复习

前端埋点的目标是把用户在页面上的关键行为和页面运行状态转成可分析的数据。它服务于产品分析、增长实验、稳定性监控和性能优化。

面试里不要只说“点击时调接口”。更完整的回答应该包括：

- 埋什么：页面、点击、曝光、停留、转化、性能、错误。
- 怎么埋：代码埋点、可视化埋点、无痕埋点。
- 怎么上报：立即上报、批量上报、离开页面兜底。
- 怎么保证质量：统一数据模型、去重、采样、版本、调试工具。
- 怎么保护用户：脱敏、最小化采集、权限合规。

## 常见埋点类型

| 类型 | 说明 | 示例 |
| --- | --- | --- |
| PV | 页面访问 | 用户进入商品详情页 |
| UV | 独立访客 | 按 userId 或匿名设备 ID 统计 |
| 点击 | 用户点击行为 | 点击购买按钮 |
| 曝光 | 元素进入可视区域 | 推荐卡片被用户看到 |
| 停留 | 页面停留时长 | 文章阅读时长 |
| 转化 | 关键业务链路 | 下单、注册、提交表单 |
| 性能 | 页面性能指标 | LCP、INP、接口耗时 |
| 错误 | 运行时异常 | JS error、接口失败 |

实际项目中，埋点最好按“业务事件”设计，而不是按“按钮名字”随意上报。

```txt
不推荐：button_click
推荐：order_submit_click
推荐：product_card_exposure
推荐：checkout_success
```

## 埋点方案对比

### 代码埋点

开发在关键位置手写上报代码。

优点：

- 准确，能带业务字段。
- 适合关键转化链路。

缺点：

- 开发成本高。
- 容易漏埋或字段不一致。

### 可视化埋点

通过平台圈选页面元素，配置点击事件。

优点：

- 产品和运营可以参与配置。
- 简单点击事件成本低。

缺点：

- 对动态 DOM、复杂组件、跨端页面不稳定。
- 很难拿到深层业务字段。

### 无痕埋点

自动收集所有点击、路由、输入等行为。

优点：

- 覆盖面广。
- 适合事后回溯。

缺点：

- 数据噪声大。
- 隐私和性能压力更高。
- 分析成本高。

推荐组合：

```txt
核心业务链路：代码埋点
普通按钮点击：可视化埋点
问题回溯：有限度无痕埋点
性能和错误：SDK 自动采集
```

## 统一事件模型

埋点最大的坑是“大家各埋各的”。必须先定义统一数据模型。

```ts
type TrackEvent = {
  event: string
  timestamp: number
  page: {
    url: string
    path: string
    title: string
    referrer: string
  }
  user: {
    id?: string
    anonymousId: string
  }
  device: {
    userAgent: string
    viewport: string
    language: string
  }
  context?: Record<string, unknown>
}
```

示例事件：

```json
{
  "event": "product_card_click",
  "timestamp": 1779177600000,
  "page": {
    "url": "https://example.com/products",
    "path": "/products",
    "title": "商品列表",
    "referrer": "https://example.com/"
  },
  "user": {
    "id": "u_10001",
    "anonymousId": "anon_abc"
  },
  "device": {
    "userAgent": "Mozilla/5.0 ...",
    "viewport": "390x844",
    "language": "zh-CN"
  },
  "context": {
    "productId": "p_1",
    "position": 3,
    "source": "recommend"
  }
}
```

## 一个基础埋点 SDK

下面实现一个可复用的前端埋点 SDK，支持统一上下文、队列、批量上报和页面关闭兜底。

```ts
// src/tracker/createTracker.ts
type TrackerOptions = {
  endpoint: string
  appId: string
  userId?: string
  batchSize?: number
  flushInterval?: number
}

type TrackPayload = {
  event: string
  context?: Record<string, unknown>
}

type TrackEvent = TrackPayload & {
  appId: string
  timestamp: number
  page: {
    url: string
    path: string
    title: string
    referrer: string
  }
  user: {
    id?: string
    anonymousId: string
  }
  device: {
    userAgent: string
    viewport: string
    language: string
  }
}

export function createTracker(options: TrackerOptions) {
  const queue: TrackEvent[] = []
  const batchSize = options.batchSize ?? 10
  const flushInterval = options.flushInterval ?? 5000
  const anonymousId = getAnonymousId()

  function track(payload: TrackPayload) {
    queue.push(buildEvent(payload))

    if (queue.length >= batchSize) {
      flush()
    }
  }

  function buildEvent(payload: TrackPayload): TrackEvent {
    return {
      ...payload,
      appId: options.appId,
      timestamp: Date.now(),
      page: {
        url: location.href,
        path: location.pathname,
        title: document.title,
        referrer: document.referrer
      },
      user: {
        id: options.userId,
        anonymousId
      },
      device: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language
      }
    }
  }

  function flush() {
    if (queue.length === 0) return

    const events = queue.splice(0, queue.length)

    fetch(options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(events),
      keepalive: true
    }).catch(() => {
      queue.unshift(...events)
    })
  }

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushByBeacon(options.endpoint, queue.splice(0, queue.length))
    }
  })

  window.setInterval(flush, flushInterval)

  return {
    track,
    flush
  }
}

function getAnonymousId() {
  const key = 'anonymous_id'
  const existing = localStorage.getItem(key)
  if (existing) return existing

  const value = crypto.randomUUID()
  localStorage.setItem(key, value)
  return value
}

function flushByBeacon(endpoint: string, events: TrackEvent[]) {
  if (events.length === 0) return

  const blob = new Blob([JSON.stringify(events)], {
    type: 'application/json'
  })

  navigator.sendBeacon(endpoint, blob)
}
```

## PV 埋点

SPA 项目路由切换不会重新加载页面，需要在路由变化时手动上报 PV。

```ts
// src/tracker/pageView.ts
import type { Router } from 'vue-router'

export function setupPageViewTracking(router: Router, tracker: { track: Function }) {
  router.afterEach((to, from) => {
    tracker.track({
      event: 'page_view',
      context: {
        path: to.fullPath,
        from: from.fullPath || '',
        routeName: String(to.name ?? '')
      }
    })
  })
}
```

接入：

```ts
import { createTracker } from './tracker/createTracker'
import { setupPageViewTracking } from './tracker/pageView'
import { router } from './router'

const tracker = createTracker({
  endpoint: '/api/tracking',
  appId: 'web-store',
  userId: window.__USER__?.id
})

setupPageViewTracking(router, tracker)
```

## 点击埋点

关键业务按钮建议手写埋点。

```vue
<template>
  <button @click="submitOrder">提交订单</button>
</template>

<script setup lang="ts">
import { tracker } from '@/tracker'

async function submitOrder() {
  tracker.track({
    event: 'order_submit_click',
    context: {
      source: 'checkout',
      paymentMethod: 'wechat'
    }
  })

  await createOrder()
}
</script>
```

普通元素可以用指令减少重复代码。

```ts
// src/directives/trackClick.ts
import type { Directive } from 'vue'
import { tracker } from '@/tracker'

export const trackClick: Directive<HTMLElement, { event: string; context?: Record<string, unknown> }> = {
  mounted(el, binding) {
    const handler = () => {
      tracker.track({
        event: binding.value.event,
        context: binding.value.context
      })
    }

    el.dataset.trackClick = 'true'
    el.addEventListener('click', handler)
    ;(el as any).__trackClickHandler__ = handler
  },
  unmounted(el) {
    const handler = (el as any).__trackClickHandler__
    if (handler) el.removeEventListener('click', handler)
  }
}
```

使用：

```vue
<button
  v-track-click="{
    event: 'coupon_receive_click',
    context: { couponId: coupon.id }
  }"
>
  领取优惠券
</button>
```

## 曝光埋点

曝光要判断元素是否进入视口，推荐 `IntersectionObserver`。

```ts
// src/directives/trackExposure.ts
import type { Directive } from 'vue'
import { tracker } from '@/tracker'

export const trackExposure: Directive<HTMLElement, { event: string; context?: Record<string, unknown> }> = {
  mounted(el, binding) {
    let reported = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reported) {
          reported = true
          tracker.track({
            event: binding.value.event,
            context: binding.value.context
          })
          observer.disconnect()
        }
      },
      {
        threshold: 0.5
      }
    )

    observer.observe(el)
    ;(el as any).__trackExposureObserver__ = observer
  },
  unmounted(el) {
    ;(el as any).__trackExposureObserver__?.disconnect()
  }
}
```

使用：

```vue
<ProductCard
  v-for="(product, index) in products"
  :key="product.id"
  v-track-exposure="{
    event: 'product_card_exposure',
    context: {
      productId: product.id,
      position: index + 1
    }
  }"
  :product="product"
/>
```

曝光埋点要注意去重，否则用户来回滚动会重复上报。

## 停留时长

文章页、商品详情页、活动页通常需要统计停留时长。

```ts
export function trackStayDuration(tracker: { track: Function }) {
  const start = Date.now()

  function report() {
    tracker.track({
      event: 'page_stay',
      context: {
        duration: Date.now() - start,
        path: location.pathname
      }
    })
  }

  window.addEventListener('pagehide', report, { once: true })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      report()
    }
  })
}
```

## 性能和错误也属于埋点

业务埋点回答“用户做了什么”，性能和错误埋点回答“页面运行得怎么样”。

```ts
export function trackResourceTiming(tracker: { track: Function }) {
  window.addEventListener('load', () => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

    for (const resource of resources) {
      if (resource.duration > 1000) {
        tracker.track({
          event: 'slow_resource',
          context: {
            name: resource.name,
            type: resource.initiatorType,
            duration: resource.duration
          }
        })
      }
    }
  })
}
```

错误上报示例：

```ts
window.addEventListener('error', (event) => {
  tracker.track({
    event: 'js_error',
    context: {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    }
  })
})
```

## 上报策略

上报不能影响用户操作。

推荐策略：

- 普通事件进入队列批量上报。
- 页面隐藏时使用 `sendBeacon`。
- 关键转化事件可以立即上报。
- 弱网情况下失败重试，但要限制次数。
- 高频事件要节流或采样。

```ts
function shouldSample(rate: number) {
  return Math.random() < rate
}

if (shouldSample(0.1)) {
  tracker.track({
    event: 'mousemove_sample',
    context: {
      x: event.clientX,
      y: event.clientY
    }
  })
}
```

## 埋点质量治理

埋点最难的不是写 SDK，而是治理数据质量。

必须明确：

- 事件命名规范。
- 字段类型规范。
- 哪些字段必填。
- 事件属于哪个业务域。
- 什么时候触发。
- 是否允许重复触发。
- 是否涉及隐私字段。

可以维护一份事件字典：

```ts
export const TrackEvents = {
  PageView: 'page_view',
  ProductCardClick: 'product_card_click',
  ProductCardExposure: 'product_card_exposure',
  OrderSubmitClick: 'order_submit_click',
  CheckoutSuccess: 'checkout_success'
} as const
```

业务使用：

```ts
tracker.track({
  event: TrackEvents.OrderSubmitClick,
  context: {
    orderAmount: 19900,
    skuCount: 3
  }
})
```

## 隐私和合规

不要采集不必要的敏感信息。

注意：

- 手机号、身份证、邮箱需要脱敏或不采集。
- 输入框内容不要无脑采集。
- 用户标识尽量使用内部 ID 或匿名 ID。
- 上报前过滤 token、cookie、密码。
- 对采样和用途保持透明。

```ts
function sanitizeContext(context: Record<string, unknown>) {
  const blockedKeys = ['password', 'token', 'cookie', 'idCard', 'phone']

  return Object.fromEntries(
    Object.entries(context).filter(([key]) => !blockedKeys.includes(key))
  )
}
```

## 面试回答模板

可以这样回答：

> 前端埋点我会先明确目标，是业务分析、转化漏斗、性能监控还是错误排查。落地时先设计统一事件模型和事件字典，再封装 SDK，支持 PV、点击、曝光、停留时长、性能和错误上报。上报层面做队列、批量、sendBeacon、失败重试和采样。质量上通过命名规范、字段校验、调试工具和数据验收保证准确性，同时注意隐私脱敏和最小化采集。

如果追问“点击和曝光怎么做”，可以答：

> 点击埋点关键事件手写，普通事件可以用 Vue 指令封装。曝光埋点用 IntersectionObserver 判断元素进入视口，并做单次曝光去重。

## 实战清单

- 是否有统一事件命名。
- 是否有统一字段模型。
- PV 是否覆盖 SPA 路由切换。
- 点击和曝光是否区分清楚。
- 曝光是否去重。
- 页面关闭时是否用 `sendBeacon` 兜底。
- 高频事件是否采样。
- 错误和性能是否接入同一套上报链路。
- 是否过滤隐私字段。
- 是否能通过调试工具验证埋点是否正确。
