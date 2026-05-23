---
title: Vue Diff 算法讲解：从虚拟节点到最少 DOM 操作
date: 2026-05-23
description: 通过代码讲清 Vue 中 Diff 算法的目标、同层比较、key 的作用，以及 Vue 2 双端比较和 Vue 3 最长递增子序列优化。
---

# Vue Diff 算法讲解：从虚拟节点到最少 DOM 操作

Diff 算法要解决的问题很直接：状态变化后，组件会生成一棵新的虚拟 DOM 树，框架需要把旧树更新成新树，但不能粗暴地把整棵真实 DOM 全部删掉重建。

它的核心目标是：

1. 找出哪些节点可以复用。
2. 找出哪些节点需要新增、删除、移动。
3. 把真实 DOM 操作控制在尽量小的范围内。

## 1. 为什么需要 Diff

假设页面上有一个列表：

```html
<ul>
  <li>A</li>
  <li>B</li>
  <li>C</li>
</ul>
```

状态变化后变成：

```html
<ul>
  <li>A</li>
  <li>C</li>
  <li>D</li>
</ul>
```

最简单的做法是删除旧 `ul`，再创建新的 `ul`。这样一定正确，但代价很高：

```js
container.innerHTML = ''
container.appendChild(renderNewTree())
```

问题在于，真实 DOM 操作比普通 JavaScript 对象操作更重。删除重建还会丢失一些浏览器状态，例如输入框光标位置、滚动位置、元素焦点等。

Diff 的做法是先比较两个普通对象，再决定真实 DOM 要怎么改。

```js
const oldChildren = ['A', 'B', 'C']
const newChildren = ['A', 'C', 'D']

// 比较后可以得出：
// A 复用
// B 删除
// C 复用
// D 新增
```

## 2. Diff 比较的不是 DOM，而是 VNode

虚拟 DOM 中的一个节点通常可以用普通对象描述：

```js
const vnode = {
  type: 'li',
  key: 'todo-1',
  props: {
    class: 'active'
  },
  children: '学习 Diff'
}
```

一个真实 DOM 节点可能包含大量浏览器内部信息，而 VNode 只保留渲染需要的结构。Diff 比较的就是这些 VNode。

下面是一个极简的挂载函数：

```js
function mount(vnode, container) {
  const el = document.createElement(vnode.type)
  vnode.el = el

  if (vnode.props) {
    for (const key in vnode.props) {
      el.setAttribute(key, vnode.props[key])
    }
  }

  if (typeof vnode.children === 'string') {
    el.textContent = vnode.children
  } else if (Array.isArray(vnode.children)) {
    vnode.children.forEach(child => mount(child, el))
  }

  container.appendChild(el)
}
```

VNode 的一个关键点是 `vnode.el = el`。旧 VNode 和真实 DOM 建立引用后，后续更新就能通过旧 VNode 找到真实 DOM。

## 3. 两个节点是否可以复用

Diff 的第一层判断是：旧节点和新节点是不是同一种节点。

在 Vue 的思路里，通常要同时看 `type` 和 `key`：

```js
function isSameVNodeType(oldVNode, newVNode) {
  return oldVNode.type === newVNode.type && oldVNode.key === newVNode.key
}
```

如果不同，就直接卸载旧节点，再挂载新节点：

```js
function patch(oldVNode, newVNode, container) {
  if (!isSameVNodeType(oldVNode, newVNode)) {
    container.removeChild(oldVNode.el)
    mount(newVNode, container)
    return
  }

  // 可以复用，继续比较 props 和 children
  const el = newVNode.el = oldVNode.el
  patchProps(el, oldVNode.props || {}, newVNode.props || {})
  patchChildren(oldVNode, newVNode, el)
}
```

这就是 Diff 的重要前提：不同类型的节点不做深度比较。

例如 `div` 变成 `p`，框架不会继续比较它们的子节点，因为真实 DOM 类型已经不同，直接替换更清晰。

## 4. props 如何更新

节点可以复用时，真实 DOM 本身不用重新创建，但属性可能变化。

```js
function patchProps(el, oldProps, newProps) {
  for (const key in newProps) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]

    if (oldValue !== newValue) {
      el.setAttribute(key, newValue)
    }
  }

  for (const key in oldProps) {
    if (!(key in newProps)) {
      el.removeAttribute(key)
    }
  }
}
```

这段代码做了两件事：

1. 新属性里有的，比较后更新。
2. 旧属性里有、新属性里没有的，删除。

真实框架还会分别处理 `class`、`style`、事件监听、DOM property 等细节，但整体思想是一致的。

## 5. children 的几种情况

子节点比较通常分三类：

1. 新 children 是文本。
2. 新 children 是数组。
3. 新 children 为空。

简化代码如下：

```js
function patchChildren(oldVNode, newVNode, container) {
  const oldChildren = oldVNode.children
  const newChildren = newVNode.children

  if (typeof newChildren === 'string') {
    if (Array.isArray(oldChildren)) {
      oldChildren.forEach(child => container.removeChild(child.el))
    }

    if (oldChildren !== newChildren) {
      container.textContent = newChildren
    }

    return
  }

  if (Array.isArray(newChildren)) {
    if (Array.isArray(oldChildren)) {
      patchKeyedChildren(oldChildren, newChildren, container)
    } else {
      container.textContent = ''
      newChildren.forEach(child => mount(child, container))
    }

    return
  }

  if (Array.isArray(oldChildren)) {
    oldChildren.forEach(child => container.removeChild(child.el))
  } else if (typeof oldChildren === 'string') {
    container.textContent = ''
  }
}
```

真正复杂的地方在 `patchKeyedChildren`，也就是两个数组之间如何比较。

## 6. 为什么列表一定要写稳定的 key

先看一个没有稳定 key 的列表：

```vue
<template>
  <ul>
    <li v-for="(item, index) in users" :key="index">
      <input :value="item.name">
    </li>
  </ul>
</template>
```

当在列表头部插入一个用户时，所有后续节点的 `index` 都变了。旧的第 0 项会被错误地当作新的第 0 项复用。

更合适的写法是使用业务唯一标识：

```vue
<template>
  <ul>
    <li v-for="user in users" :key="user.id">
      <input :value="user.name">
    </li>
  </ul>
</template>
```

`key` 的意义不是“让循环不报错”，而是告诉 Diff：哪个新节点和哪个旧节点是同一个业务对象。

```js
const oldList = [
  { key: 'a', text: 'A' },
  { key: 'b', text: 'B' },
  { key: 'c', text: 'C' }
]

const newList = [
  { key: 'd', text: 'D' },
  { key: 'a', text: 'A' },
  { key: 'b', text: 'B' },
  { key: 'c', text: 'C' }
]
```

有稳定 key 时，Diff 能知道 `a`、`b`、`c` 都是原来的节点，只需要新增 `d` 并插到前面。

## 7. Vue 2 的双端比较思想

Vue 2 对带 key 的子节点采用经典的双端比较。它会维护四个指针：

```txt
oldStart 旧列表头
oldEnd   旧列表尾
newStart 新列表头
newEnd   新列表尾
```

每轮优先比较四种容易命中的情况：

1. 旧头 vs 新头。
2. 旧尾 vs 新尾。
3. 旧头 vs 新尾。
4. 旧尾 vs 新头。

用简化代码表示：

```js
function patchKeyedChildrenVue2(oldChildren, newChildren, container) {
  let oldStartIndex = 0
  let oldEndIndex = oldChildren.length - 1
  let newStartIndex = 0
  let newEndIndex = newChildren.length - 1

  let oldStart = oldChildren[oldStartIndex]
  let oldEnd = oldChildren[oldEndIndex]
  let newStart = newChildren[newStartIndex]
  let newEnd = newChildren[newEndIndex]

  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    if (isSameVNodeType(oldStart, newStart)) {
      patch(oldStart, newStart, container)
      oldStart = oldChildren[++oldStartIndex]
      newStart = newChildren[++newStartIndex]
    } else if (isSameVNodeType(oldEnd, newEnd)) {
      patch(oldEnd, newEnd, container)
      oldEnd = oldChildren[--oldEndIndex]
      newEnd = newChildren[--newEndIndex]
    } else if (isSameVNodeType(oldStart, newEnd)) {
      patch(oldStart, newEnd, container)
      container.insertBefore(oldStart.el, oldEnd.el.nextSibling)
      oldStart = oldChildren[++oldStartIndex]
      newEnd = newChildren[--newEndIndex]
    } else if (isSameVNodeType(oldEnd, newStart)) {
      patch(oldEnd, newStart, container)
      container.insertBefore(oldEnd.el, oldStart.el)
      oldEnd = oldChildren[--oldEndIndex]
      newStart = newChildren[++newStartIndex]
    } else {
      // 复杂情况：用 key 建索引，找到可复用节点再移动
      break
    }
  }
}
```

双端比较对常见场景很有效：

```txt
旧: A B C D
新: D A B C
```

第一轮命中“旧尾 vs 新头”，说明 `D` 被移动到开头，于是把旧尾真实 DOM 移到旧头前面。

## 8. Vue 3 的前后预处理

Vue 3 的数组 Diff 先从两端处理相同节点。

例如：

```txt
旧: A B C D E
新: A B D C E
```

头部 `A B` 相同，尾部 `E` 相同，真正需要处理的是中间：

```txt
旧中间: C D
新中间: D C
```

代码可以这样理解：

```js
function patchKeyedChildren(oldChildren, newChildren, container) {
  let i = 0
  let oldEnd = oldChildren.length - 1
  let newEnd = newChildren.length - 1

  while (i <= oldEnd && i <= newEnd) {
    if (isSameVNodeType(oldChildren[i], newChildren[i])) {
      patch(oldChildren[i], newChildren[i], container)
      i++
    } else {
      break
    }
  }

  while (i <= oldEnd && i <= newEnd) {
    if (isSameVNodeType(oldChildren[oldEnd], newChildren[newEnd])) {
      patch(oldChildren[oldEnd], newChildren[newEnd], container)
      oldEnd--
      newEnd--
    } else {
      break
    }
  }

  // 剩余中间部分再做新增、删除、移动判断
}
```

这样可以快速跳过两端稳定区域，把复杂比较限制在变化最集中的部分。

## 9. 新增和删除的简单区间

前后预处理后，如果旧节点已经处理完，但新节点还有剩余，说明剩下的都是新增。

```txt
旧: A B
新: A B C D
```

头部比较完 `A B` 后，旧列表结束，新列表剩下 `C D`，直接挂载即可。

```js
if (i > oldEnd && i <= newEnd) {
  while (i <= newEnd) {
    const anchor = newChildren[newEnd + 1]?.el || null
    mount(newChildren[i], container, anchor)
    i++
  }
}
```

反过来，如果新节点已经处理完，旧节点还有剩余，说明剩下的都要删除。

```txt
旧: A B C D
新: A B
```

```js
if (i > newEnd && i <= oldEnd) {
  while (i <= oldEnd) {
    container.removeChild(oldChildren[i].el)
    i++
  }
}
```

## 10. 复杂区间：建立 key 到新索引的映射

真正复杂的是这种情况：

```txt
旧: A B C D E
新: A C B F E
```

两端的 `A` 和 `E` 可以先跳过，中间变成：

```txt
旧中间: B C D
新中间: C B F
```

Vue 3 会先根据新 children 建立一个 `key -> newIndex` 的映射：

```js
const keyToNewIndexMap = new Map()

for (let index = newStart; index <= newEnd; index++) {
  const child = newChildren[index]
  keyToNewIndexMap.set(child.key, index)
}
```

然后遍历旧 children：

```js
const toBePatched = newEnd - newStart + 1
const newIndexToOldIndexMap = new Array(toBePatched).fill(0)

for (let oldIndex = oldStart; oldIndex <= oldEnd; oldIndex++) {
  const oldVNode = oldChildren[oldIndex]
  const newIndex = keyToNewIndexMap.get(oldVNode.key)

  if (newIndex === undefined) {
    container.removeChild(oldVNode.el)
  } else {
    newIndexToOldIndexMap[newIndex - newStart] = oldIndex + 1
    patch(oldVNode, newChildren[newIndex], container)
  }
}
```

这里的 `newIndexToOldIndexMap` 很关键。它表示新列表中每个位置对应旧列表的哪个位置。

对于：

```txt
旧中间: B C D
新中间: C B F
```

会得到：

```js
// C 来自旧索引 1，B 来自旧索引 0，F 是新增
newIndexToOldIndexMap = [2, 1, 0]
```

数组中的 `0` 表示新节点没有旧节点可复用，需要新增。

## 11. 为什么 Vue 3 要用最长递增子序列

如果一个节点在新列表中的相对顺序没有变，就不需要移动。

看这个例子：

```txt
旧: A B C D E
新: A C D B E
```

去掉两端相同的 `A E` 后：

```txt
旧中间: B C D
新中间: C D B
```

新中间对应旧位置：

```js
[2, 3, 1]
```

其中 `[2, 3]` 是递增的，说明 `C D` 在旧列表和新列表中的相对顺序没变。只要把 `B` 移到后面，就能得到新顺序。

最长递增子序列的作用就是找到最多可以不移动的节点。

简化实现：

```js
function getSequence(arr) {
  const result = []
  const positions = arr.slice()

  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]
    if (value === 0) continue

    const lastIndex = result[result.length - 1]
    if (lastIndex === undefined || arr[lastIndex] < value) {
      positions[i] = lastIndex
      result.push(i)
      continue
    }

    let start = 0
    let end = result.length - 1

    while (start < end) {
      const middle = (start + end) >> 1
      if (arr[result[middle]] < value) {
        start = middle + 1
      } else {
        end = middle
      }
    }

    if (value < arr[result[start]]) {
      if (start > 0) positions[i] = result[start - 1]
      result[start] = i
    }
  }

  let length = result.length
  let prev = result[length - 1]

  while (length-- > 0) {
    result[length] = prev
    prev = positions[prev]
  }

  return result
}
```

使用：

```js
getSequence([2, 3, 1]) // [0, 1]
```

返回的是索引 `[0, 1]`，代表新列表中 `C D` 这两个位置可以保留不动。

## 12. 从右往左移动和新增

知道哪些节点不用动之后，Vue 3 会从右往左处理新列表。

为什么从右往左？因为插入 DOM 时需要 anchor，也就是“插到谁前面”。从右往左可以天然拿到下一个节点的真实 DOM。

```js
const increasingSequence = getSequence(newIndexToOldIndexMap)
let sequenceIndex = increasingSequence.length - 1

for (let index = toBePatched - 1; index >= 0; index--) {
  const newIndex = newStart + index
  const newVNode = newChildren[newIndex]
  const anchor = newChildren[newIndex + 1]?.el || null

  if (newIndexToOldIndexMap[index] === 0) {
    mount(newVNode, container, anchor)
  } else {
    if (index !== increasingSequence[sequenceIndex]) {
      container.insertBefore(newVNode.el, anchor)
    } else {
      sequenceIndex--
    }
  }
}
```

这段逻辑可以概括为：

1. `0` 表示新增，挂载到 anchor 前。
2. 不在最长递增子序列里的旧节点，需要移动。
3. 在最长递增子序列里的旧节点，保持原位。

## 13. Diff 的几个边界认知

Diff 不是找出理论上绝对最优的所有修改路径，而是在常见 UI 更新场景下，用可控复杂度找出足够好的 DOM 操作方案。

Vue 的 Diff 有几个重要约束：

1. 只做同层比较，不跨层寻找可复用节点。
2. `type` 不同直接替换。
3. `key` 决定列表节点的身份。
4. Vue 3 通过最长递增子序列减少移动次数。

跨层复用看似更聪明，但会带来复杂度爆炸。UI 更新中，大部分变化来自同一层列表的增删改移，同层策略更适合工程落地。

## 14. 写列表时的实践建议

稳定的写法：

```vue
<template>
  <TodoItem
    v-for="todo in todos"
    :key="todo.id"
    :todo="todo"
  />
</template>
```

需要避免的写法：

```vue
<template>
  <TodoItem
    v-for="(todo, index) in todos"
    :key="index"
    :todo="todo"
  />
</template>
```

只有在列表不会插入、删除、排序，并且节点没有本地状态时，`index` 才相对安全。实际业务列表通常会变化，所以优先使用业务 id。

## 总结

Diff 的主线可以这样理解：

1. 状态变化生成新 VNode。
2. 新旧 VNode 从根节点开始比较。
3. 类型不同就替换，类型相同就复用 DOM。
4. 复用时更新 props，再比较 children。
5. 列表通过 key 判断身份。
6. Vue 2 偏向双端比较。
7. Vue 3 先处理前后稳定区间，再用 key 映射和最长递增子序列减少移动。

掌握这些步骤后，再看框架源码中的 `patch`、`patchChildren`、`patchKeyedChildren`，就不会只是看到一堆分支，而能看到它们背后的更新策略。
