---
title: 虚拟 DOM 讲解：它解决了什么问题
date: 2026-05-23
description: 从 VNode 数据结构、render 函数、patch 流程和真实 DOM 更新成本出发，讲清虚拟 DOM 的工作方式与适用边界。
---

# 虚拟 DOM 讲解：它解决了什么问题

虚拟 DOM 不是为了“比直接操作 DOM 更快”而存在。更准确地说，它提供了一层描述 UI 的中间结构，让框架可以用声明式方式组织界面，并在状态变化时统一计算更新。

一句话概括：

> 虚拟 DOM 是用普通 JavaScript 对象描述真实 DOM 结构，再通过渲染器把对象转换成真实 DOM，并在后续更新时通过比较新旧对象来修改真实 DOM。

## 1. 直接操作 DOM 的问题

看一个计数器：

```html
<button id="btn">count: 0</button>
```

用原生 DOM 写：

```js
let count = 0
const btn = document.querySelector('#btn')

btn.addEventListener('click', () => {
  count++
  btn.textContent = `count: ${count}`
})
```

这个例子很简单。但页面复杂后，问题会变成：

1. 哪些 DOM 要更新？
2. 更新顺序怎么安排？
3. 数据和 DOM 如何保持一致？
4. 多个状态同时变化时如何合并更新？

如果所有地方都直接操作 DOM，代码会逐渐变成“状态逻辑 + DOM 查找 + DOM 修改”混在一起。

虚拟 DOM 的价值在于，让开发者只描述状态对应的 UI：

```js
function render(count) {
  return {
    type: 'button',
    props: {
      id: 'btn'
    },
    children: `count: ${count}`
  }
}
```

状态变成 `1`，重新执行 `render(1)`，框架拿到新的 UI 描述，再决定真实 DOM 怎么改。

## 2. VNode 是什么

VNode 是 Virtual Node 的缩写。它是虚拟 DOM 树上的一个节点。

一个元素节点可以这样表示：

```js
const vnode = {
  type: 'div',
  props: {
    id: 'app',
    class: 'page'
  },
  children: [
    {
      type: 'h1',
      props: null,
      children: 'Hello'
    },
    {
      type: 'p',
      props: null,
      children: '这是一个段落'
    }
  ]
}
```

对应真实 DOM：

```html
<div id="app" class="page">
  <h1>Hello</h1>
  <p>这是一个段落</p>
</div>
```

VNode 可以描述三类常见内容：

1. 原生标签，例如 `div`、`span`。
2. 组件，例如 `UserCard`。
3. 文本、注释、Fragment 等特殊节点。

在 Vue 中，一个组件模板最终也会被编译成返回 VNode 的渲染函数。

## 3. 从模板到 VNode

Vue 模板：

```vue
<template>
  <section class="profile">
    <h2>{{ user.name }}</h2>
    <p>{{ user.bio }}</p>
  </section>
</template>
```

可以粗略理解为这样的渲染函数：

```js
function render(ctx) {
  return h('section', { class: 'profile' }, [
    h('h2', null, ctx.user.name),
    h('p', null, ctx.user.bio)
  ])
}
```

`h` 函数的作用就是创建 VNode：

```js
function h(type, props, children) {
  return {
    type,
    props,
    children
  }
}
```

所以模板并不神秘。模板的目标是让 UI 描述更好写，而底层仍然会进入“生成 VNode -> 挂载或更新”的流程。

## 4. 挂载：把 VNode 变成真实 DOM

首次渲染时没有旧节点，渲染器只需要把 VNode 创建成真实 DOM。

```js
function mountElement(vnode, container) {
  const el = document.createElement(vnode.type)
  vnode.el = el

  if (vnode.props) {
    for (const key in vnode.props) {
      patchProp(el, key, null, vnode.props[key])
    }
  }

  if (typeof vnode.children === 'string') {
    el.textContent = vnode.children
  } else if (Array.isArray(vnode.children)) {
    vnode.children.forEach(child => {
      patch(null, child, el)
    })
  }

  container.appendChild(el)
}
```

这里有两个重点：

1. `document.createElement` 只发生在首次创建或节点类型变化时。
2. `vnode.el = el` 保存了 VNode 和真实 DOM 的关系。

`patchProp` 可以先写得简单一点：

```js
function patchProp(el, key, oldValue, newValue) {
  if (key.startsWith('on')) {
    const eventName = key.slice(2).toLowerCase()

    if (oldValue) {
      el.removeEventListener(eventName, oldValue)
    }

    if (newValue) {
      el.addEventListener(eventName, newValue)
    }

    return
  }

  if (newValue == null || newValue === false) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, newValue)
  }
}
```

真实框架会对 class、style、事件缓存、boolean attribute 做更多优化，但核心思路就是比较旧值和新值，然后修改真实 DOM。

## 5. 更新：同一个 render 函数再次执行

状态变化后，组件的 render 函数会再次执行。

```js
let oldVNode = render(0)
patch(null, oldVNode, document.querySelector('#app'))

const newVNode = render(1)
patch(oldVNode, newVNode, document.querySelector('#app'))
oldVNode = newVNode
```

`patch` 会根据旧节点是否存在决定挂载还是更新：

```js
function patch(oldVNode, newVNode, container) {
  if (oldVNode == null) {
    mountElement(newVNode, container)
    return
  }

  if (oldVNode.type !== newVNode.type) {
    container.removeChild(oldVNode.el)
    mountElement(newVNode, container)
    return
  }

  patchElement(oldVNode, newVNode)
}
```

同类型节点可以复用真实 DOM：

```js
function patchElement(oldVNode, newVNode) {
  const el = newVNode.el = oldVNode.el

  patchProps(el, oldVNode.props || {}, newVNode.props || {})
  patchChildren(oldVNode, newVNode, el)
}
```

## 6. 更新 props

props 更新分两步：新增或修改新属性，删除旧属性中已经不存在的部分。

```js
function patchProps(el, oldProps, newProps) {
  for (const key in newProps) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]

    if (oldValue !== newValue) {
      patchProp(el, key, oldValue, newValue)
    }
  }

  for (const key in oldProps) {
    if (!(key in newProps)) {
      patchProp(el, key, oldProps[key], null)
    }
  }
}
```

例如：

```js
const oldVNode = h('button', {
  class: 'primary',
  disabled: true
}, '提交中')

const newVNode = h('button', {
  class: 'primary'
}, '提交')
```

更新结果是：

1. `class` 没变，不处理。
2. `disabled` 在新 props 中不存在，移除。
3. 文本从 `提交中` 改成 `提交`。

## 7. 更新 children

children 的类型会影响更新策略。

### 文本变文本

```js
const oldVNode = h('p', null, '旧文本')
const newVNode = h('p', null, '新文本')
```

只需要：

```js
el.textContent = '新文本'
```

### 数组变文本

```js
const oldVNode = h('div', null, [
  h('span', null, 'A'),
  h('span', null, 'B')
])

const newVNode = h('div', null, '加载中')
```

可以直接清空子节点并设置文本：

```js
el.textContent = '加载中'
```

### 文本变数组

```js
const oldVNode = h('div', null, '加载中')

const newVNode = h('div', null, [
  h('span', null, 'A'),
  h('span', null, 'B')
])
```

先清空文本，再挂载子节点：

```js
el.textContent = ''
newChildren.forEach(child => patch(null, child, el))
```

### 数组变数组

这就是 Diff 算法发挥作用的地方。列表节点会根据 key 判断复用、删除、移动和新增。

```vue
<template>
  <li v-for="todo in todos" :key="todo.id">
    {{ todo.title }}
  </li>
</template>
```

`key` 让渲染器知道哪个旧 VNode 和哪个新 VNode 是同一个业务项。

## 8. 虚拟 DOM 和响应式系统的关系

虚拟 DOM 负责描述和更新 UI，响应式系统负责追踪状态变化。两者配合后，页面更新流程可以理解为：

```txt
响应式数据变化
  -> 触发组件更新任务
  -> 重新执行 render
  -> 生成新的 VNode 树
  -> patch 新旧 VNode
  -> 更新真实 DOM
```

用代码模拟：

```js
let activeEffect

function effect(fn) {
  activeEffect = fn
  fn()
  activeEffect = null
}

function ref(value) {
  const effects = new Set()

  return {
    get value() {
      if (activeEffect) effects.add(activeEffect)
      return value
    },
    set value(nextValue) {
      value = nextValue
      effects.forEach(effect => effect())
    }
  }
}
```

组件更新：

```js
const count = ref(0)
let oldVNode

effect(() => {
  const newVNode = h('button', {
    onClick: () => count.value++
  }, `count: ${count.value}`)

  patch(oldVNode, newVNode, document.querySelector('#app'))
  oldVNode = newVNode
})
```

点击按钮后：

1. `count.value++` 触发依赖。
2. `effect` 重新执行。
3. 生成新的 VNode。
4. `patch` 把按钮文本更新掉。

## 9. 虚拟 DOM 的优点

### 声明式 UI

开发者写的是“状态应该渲染成什么样”，而不是“第几个 DOM 节点应该怎么改”。

```vue
<template>
  <button :disabled="loading">
    {{ loading ? '提交中' : '提交' }}
  </button>
</template>
```

这段代码没有手动操作 DOM，但状态和 UI 的关系非常清楚。

### 跨平台渲染

因为 VNode 是普通对象，所以渲染目标不一定是浏览器 DOM。

同一棵 VNode：

```js
{
  type: 'view',
  props: { class: 'card' },
  children: 'Hello'
}
```

不同渲染器可以把它变成：

1. 浏览器 DOM。
2. 小程序节点。
3. Native UI。
4. 服务端渲染字符串。

这就是为什么虚拟 DOM 常常和“渲染器”一起出现。VNode 是描述，渲染器负责把描述落到具体平台。

### 统一更新入口

状态变化后，框架可以把多次更新合并到一次任务里，而不是每次数据变化都立刻操作 DOM。

```js
state.count++
state.name = 'Alice'
state.visible = true

// 框架可以在微任务中统一刷新组件
```

统一调度能减少重复渲染，也让组件更新顺序更可控。

## 10. 虚拟 DOM 的成本

虚拟 DOM 也不是没有代价。

每次更新至少会产生这些成本：

1. 执行 render 函数。
2. 创建新的 VNode 对象。
3. 比较新旧 VNode。
4. 最后才是真实 DOM 更新。

如果一个页面只有很少的 DOM，并且更新逻辑非常固定，手写 DOM 操作可能更直接。

例如：

```js
progressBar.style.width = `${percent}%`
```

这种明确的单点更新不需要虚拟 DOM 才能高效。

虚拟 DOM 的优势更多体现在复杂 UI 中：状态来源多、分支多、列表多、组件嵌套深时，它能保持代码组织和更新流程的稳定。

## 11. Vue 3 为什么还要编译优化

如果每次更新都完整比较整棵 VNode 树，仍然会有浪费。Vue 3 的模板编译器会提前分析哪些地方是动态的。

模板：

```vue
<template>
  <div class="user-card">
    <h2>{{ user.name }}</h2>
    <p>固定文案</p>
  </div>
</template>
```

`class="user-card"` 和 `固定文案` 是静态内容，`user.name` 是动态内容。

编译器可以给动态节点打标记，让运行时更快定位变化位置。可以粗略理解为：

```js
createElementVNode('h2', null, user.name, PatchFlags.TEXT)
```

这样更新时，渲染器知道这个节点主要需要比较文本，不必做完整的 props 和 children 推断。

也就是说，Vue 3 的性能不是只靠虚拟 DOM，还靠编译器提供的静态提升、补丁标记、缓存事件处理函数等优化。

## 12. 一个完整的极简渲染器

把前面的内容拼起来，可以得到一个非常小的渲染器：

```js
function h(type, props, children) {
  return { type, props, children }
}

function render(vnode, container) {
  patch(container._vnode || null, vnode, container)
  container._vnode = vnode
}

function patch(oldVNode, newVNode, container) {
  if (oldVNode && oldVNode.type !== newVNode.type) {
    container.removeChild(oldVNode.el)
    oldVNode = null
  }

  if (!oldVNode) {
    mountElement(newVNode, container)
  } else {
    patchElement(oldVNode, newVNode)
  }
}

function mountElement(vnode, container) {
  const el = vnode.el = document.createElement(vnode.type)

  for (const key in vnode.props || {}) {
    patchProp(el, key, null, vnode.props[key])
  }

  if (typeof vnode.children === 'string') {
    el.textContent = vnode.children
  } else if (Array.isArray(vnode.children)) {
    vnode.children.forEach(child => patch(null, child, el))
  }

  container.appendChild(el)
}

function patchElement(oldVNode, newVNode) {
  const el = newVNode.el = oldVNode.el
  patchProps(el, oldVNode.props || {}, newVNode.props || {})
  patchChildren(oldVNode, newVNode, el)
}

function patchProps(el, oldProps, newProps) {
  for (const key in newProps) {
    if (newProps[key] !== oldProps[key]) {
      patchProp(el, key, oldProps[key], newProps[key])
    }
  }

  for (const key in oldProps) {
    if (!(key in newProps)) {
      patchProp(el, key, oldProps[key], null)
    }
  }
}

function patchChildren(oldVNode, newVNode, container) {
  const oldChildren = oldVNode.children
  const newChildren = newVNode.children

  if (typeof newChildren === 'string') {
    if (oldChildren !== newChildren) {
      container.textContent = newChildren
    }
  } else if (Array.isArray(newChildren)) {
    container.textContent = ''
    newChildren.forEach(child => patch(null, child, container))
  } else {
    container.textContent = ''
  }
}
```

这个版本没有实现完整的列表 Diff，但已经包含虚拟 DOM 的主流程：

1. `h` 创建 VNode。
2. `render` 保存旧 VNode。
3. `patch` 区分挂载和更新。
4. `mountElement` 创建真实 DOM。
5. `patchElement` 复用真实 DOM 并更新属性和子节点。

## 总结

虚拟 DOM 的重点不是单次 DOM 操作性能，而是它把 UI 更新抽象成了一套稳定流程：

1. 用 VNode 描述界面。
2. 用 render 函数把状态映射成 VNode。
3. 用 patch 比较新旧 VNode。
4. 用渲染器把差异更新到真实平台。

它让复杂 UI 可以用声明式方式表达，也让组件化、跨平台、服务端渲染、更新调度和编译优化有了共同基础。
