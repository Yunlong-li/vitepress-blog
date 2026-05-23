---
title: Vue 2 和 Vue 3 组件通信方式讲解
date: 2026-05-23
description: 结合代码讲清 props、emit、v-model、refs、provide/inject、事件总线、Vuex、Pinia 和插槽在 Vue 2、Vue 3 中的使用边界。
---

# Vue 2 和 Vue 3 组件通信方式讲解

组件通信的本质是数据如何在组件之间流动。先判断组件关系，再选择通信方式，会比记一堆 API 更清楚。

常见关系有四种：

1. 父组件传给子组件。
2. 子组件通知父组件。
3. 多层组件共享上下文。
4. 兄弟组件或远距离组件共享状态。

## 1. 父传子：props

父传子最常用的是 `props`。

Vue 3：

```vue
<!-- Parent.vue -->
<script setup>
import UserCard from './UserCard.vue'

const user = {
  id: 1,
  name: 'Alice',
  role: 'admin'
}
</script>

<template>
  <UserCard :user="user" />
</template>
```

子组件接收：

```vue
<!-- UserCard.vue -->
<script setup>
const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <section>
    <h3>{{ props.user.name }}</h3>
    <p>{{ props.user.role }}</p>
  </section>
</template>
```

Vue 2：

```vue
<script>
export default {
  props: {
    user: {
      type: Object,
      required: true
    }
  }
}
</script>
```

props 应该当作只读输入。子组件不要直接修改父组件传进来的值。

不推荐：

```js
props.user.name = 'Bob'
```

更清晰的做法是让子组件发事件，由父组件决定怎么改。

## 2. 子传父：emit

子组件可以通过自定义事件通知父组件。

Vue 3：

```vue
<!-- UserCard.vue -->
<script setup>
const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['rename'])

function rename() {
  emit('rename', {
    id: props.user.id,
    name: 'Bob'
  })
}
</script>

<template>
  <button @click="rename">改名</button>
</template>
```

父组件监听：

```vue
<script setup>
import { ref } from 'vue'
import UserCard from './UserCard.vue'

const user = ref({
  id: 1,
  name: 'Alice'
})

function handleRename(payload) {
  if (payload.id === user.value.id) {
    user.value.name = payload.name
  }
}
</script>

<template>
  <UserCard :user="user" @rename="handleRename" />
</template>
```

Vue 2：

```js
this.$emit('rename', {
  id: this.user.id,
  name: 'Bob'
})
```

父组件：

```vue
<UserCard :user="user" @rename="handleRename" />
```

这种方式保持了单向数据流：父组件拥有状态，子组件只表达意图。

## 3. 双向绑定：v-model

`v-model` 本质上是 props + emit 的语法糖。

### Vue 2 的 v-model

Vue 2 默认对应：

```vue
<CustomInput v-model="keyword" />
```

等价于：

```vue
<CustomInput
  :value="keyword"
  @input="keyword = $event"
/>
```

子组件写法：

```vue
<template>
  <input :value="value" @input="onInput">
</template>

<script>
export default {
  props: {
    value: String
  },
  methods: {
    onInput(event) {
      this.$emit('input', event.target.value)
    }
  }
}
</script>
```

### Vue 3 的 v-model

Vue 3 默认对应：

```vue
<CustomInput v-model="keyword" />
```

等价于：

```vue
<CustomInput
  :model-value="keyword"
  @update:model-value="keyword = $event"
/>
```

子组件：

```vue
<script setup>
defineProps({
  modelValue: String
})

const emit = defineEmits(['update:modelValue'])

function onInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <input :value="modelValue" @input="onInput">
</template>
```

Vue 3 还支持多个 `v-model`：

```vue
<DateRangePicker
  v-model:start="startDate"
  v-model:end="endDate"
/>
```

子组件：

```vue
<script setup>
defineProps({
  start: String,
  end: String
})

const emit = defineEmits([
  'update:start',
  'update:end'
])
</script>

<template>
  <input :value="start" @input="emit('update:start', $event.target.value)">
  <input :value="end" @input="emit('update:end', $event.target.value)">
</template>
```

多个 `v-model` 很适合日期范围、分页器、筛选器这类有多个受控值的组件。

## 4. 父组件主动调用子组件：ref

有时父组件需要主动调用子组件方法，例如打开弹窗、重置表单。

Vue 3：

```vue
<!-- DialogForm.vue -->
<script setup>
import { ref } from 'vue'

const visible = ref(false)

function open() {
  visible.value = true
}

function close() {
  visible.value = false
}

defineExpose({
  open,
  close
})
</script>

<template>
  <div v-if="visible" class="dialog">
    <slot />
  </div>
</template>
```

父组件调用：

```vue
<script setup>
import { ref } from 'vue'
import DialogForm from './DialogForm.vue'

const dialogRef = ref(null)

function createUser() {
  dialogRef.value.open()
}
</script>

<template>
  <button @click="createUser">新增用户</button>
  <DialogForm ref="dialogRef" />
</template>
```

Vue 2：

```vue
<template>
  <DialogForm ref="dialog" />
</template>

<script>
export default {
  methods: {
    createUser() {
      this.$refs.dialog.open()
    }
  }
}
</script>
```

`ref` 适合命令式场景，但不要滥用。如果只是数据传递，优先 props 和 emit。

## 5. 多层传递：provide/inject

当组件层级很深时，逐层传 props 会让中间组件背负很多无关参数。

例如：

```txt
Page
  Form
    FormSection
      FormItem
        Input
```

`Input` 需要访问表单上下文，但 `FormSection` 和 `FormItem` 可能只是结构组件。此时可以用 provide/inject。

Vue 3：

```vue
<!-- FormRoot.vue -->
<script setup>
import { provide, reactive } from 'vue'

const form = reactive({
  values: {},
  errors: {}
})

function setValue(name, value) {
  form.values[name] = value
}

provide('formContext', {
  form,
  setValue
})
</script>

<template>
  <form>
    <slot />
  </form>
</template>
```

深层组件：

```vue
<!-- FormInput.vue -->
<script setup>
import { inject } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  }
})

const formContext = inject('formContext')
</script>

<template>
  <input
    :value="formContext.form.values[name] || ''"
    @input="formContext.setValue(name, $event.target.value)"
  >
</template>
```

Vue 2：

```js
export default {
  provide() {
    return {
      formContext: this.formContext
    }
  },
  data() {
    return {
      formContext: {
        values: {},
        setValue: this.setValue
      }
    }
  },
  methods: {
    setValue(name, value) {
      this.$set(this.formContext.values, name, value)
    }
  }
}
```

Vue 2 中如果给对象新增属性，要注意响应式限制，通常需要 `this.$set`。

## 6. 兄弟组件通信：提升状态

兄弟组件之间如果关系很近，最清晰的方式通常是把状态提升到共同父组件。

```txt
SearchPanel
  SearchInput
  SearchResult
```

父组件保存状态：

```vue
<script setup>
import { ref } from 'vue'
import SearchInput from './SearchInput.vue'
import SearchResult from './SearchResult.vue'

const keyword = ref('')
</script>

<template>
  <SearchInput v-model="keyword" />
  <SearchResult :keyword="keyword" />
</template>
```

输入组件只负责修改 keyword：

```vue
<script setup>
defineProps({
  modelValue: String
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <input
    :value="modelValue"
    @input="emit('update:modelValue', $event.target.value)"
  >
</template>
```

结果组件只负责消费 keyword：

```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  keyword: String
})

const resultText = computed(() => {
  return props.keyword ? `搜索：${props.keyword}` : '请输入关键词'
})
</script>

<template>
  <p>{{ resultText }}</p>
</template>
```

这种方式数据流最直观：兄弟不直接互相依赖，而是通过共同父组件协调。

## 7. 远距离组件通信：Vuex 或 Pinia

当组件距离很远，或者多个页面都要共享同一份状态，应该使用全局状态管理。

Pinia 示例：

```js
// stores/player.js
import { defineStore } from 'pinia'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentSong: null,
    playing: false
  }),
  actions: {
    play(song) {
      this.currentSong = song
      this.playing = true
    },
    pause() {
      this.playing = false
    }
  }
})
```

歌曲列表组件：

```vue
<script setup>
import { usePlayerStore } from '@/stores/player'

const playerStore = usePlayerStore()

function handlePlay(song) {
  playerStore.play(song)
}
</script>
```

底部播放器组件：

```vue
<script setup>
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'

const playerStore = usePlayerStore()
const { currentSong, playing } = storeToRefs(playerStore)
</script>

<template>
  <footer v-if="currentSong">
    <span>{{ currentSong.name }}</span>
    <button @click="playerStore.pause" v-if="playing">暂停</button>
  </footer>
</template>
```

这两个组件可以不在同一棵局部结构里，但它们共享同一个 player store。

## 8. 事件总线：Vue 2 常见，Vue 3 中谨慎使用

Vue 2 中常见写法：

```js
// event-bus.js
import Vue from 'vue'

export const eventBus = new Vue()
```

发送事件：

```js
import { eventBus } from './event-bus'

eventBus.$emit('refresh-user-list')
```

监听事件：

```js
import { eventBus } from './event-bus'

export default {
  created() {
    eventBus.$on('refresh-user-list', this.fetchList)
  },
  beforeDestroy() {
    eventBus.$off('refresh-user-list', this.fetchList)
  },
  methods: {
    fetchList() {
      // 重新加载列表
    }
  }
}
```

事件总线的问题是来源和去向不明显。项目变大后，很难追踪是谁发的事件、谁在监听、什么时候解绑。

Vue 3 中没有组件实例事件 API 的同样用法，可以使用 `mitt`：

```js
// emitter.js
import mitt from 'mitt'

export const emitter = mitt()
```

```js
emitter.emit('refresh-user-list')
emitter.on('refresh-user-list', fetchList)
emitter.off('refresh-user-list', fetchList)
```

事件总线适合少量、短链路的通知，例如“刷新某个局部列表”。如果事件承载的是业务状态，就应该考虑 Pinia 或 Vuex。

## 9. 插槽也是一种通信方式

插槽解决的是父组件向子组件传结构。

普通插槽：

```vue
<!-- Card.vue -->
<template>
  <section class="card">
    <header>
      <slot name="title" />
    </header>
    <main>
      <slot />
    </main>
  </section>
</template>
```

使用：

```vue
<Card>
  <template #title>
    用户信息
  </template>

  <UserProfile :user="user" />
</Card>
```

作用域插槽可以让子组件把内部数据暴露给父组件决定如何渲染。

```vue
<!-- DataList.vue -->
<script setup>
defineProps({
  list: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <ul>
    <li v-for="item in list" :key="item.id">
      <slot :item="item" />
    </li>
  </ul>
</template>
```

父组件：

```vue
<DataList :list="users">
  <template #default="{ item }">
    <strong>{{ item.name }}</strong>
    <span>{{ item.email }}</span>
  </template>
</DataList>
```

这里 `DataList` 控制列表结构，父组件控制每一项怎么展示。

## 10. attrs 和 listeners：透传属性与事件

封装基础组件时，经常需要把外部传入的属性透传给内部元素。

Vue 3：

```vue
<script setup>
defineOptions({
  inheritAttrs: false
})
</script>

<template>
  <label class="field">
    <span class="field-label">
      <slot name="label" />
    </span>
    <input class="field-input" v-bind="$attrs">
  </label>
</template>
```

使用：

```vue
<BaseInput
  placeholder="请输入名称"
  maxlength="20"
  @focus="handleFocus"
/>
```

`placeholder`、`maxlength`、`focus` 监听都会透传到内部 `input`。

Vue 2 中事件监听和属性分开：

```vue
<template>
  <input v-bind="$attrs" v-on="$listeners">
</template>

<script>
export default {
  inheritAttrs: false
}
</script>
```

Vue 3 中 `$listeners` 合并进了 `$attrs`。

## 11. .sync：Vue 2 的双向更新语法

Vue 2 中还有 `.sync`：

```vue
<UserDialog :visible.sync="dialogVisible" />
```

等价于：

```vue
<UserDialog
  :visible="dialogVisible"
  @update:visible="dialogVisible = $event"
/>
```

子组件：

```js
this.$emit('update:visible', false)
```

Vue 3 中统一使用 `v-model:visible`：

```vue
<UserDialog v-model:visible="dialogVisible" />
```

子组件：

```js
emit('update:visible', false)
```

## 12. 如何选择通信方式

可以按距离和数据归属来判断：

```txt
父 -> 子
  props

子 -> 父
  emit

父子双向受控值
  v-model

父组件调用子组件能力
  ref + defineExpose

多层组件共享上下文
  provide/inject

兄弟组件共享状态
  状态提升到共同父组件

远距离或跨页面共享状态
  Pinia / Vuex

传递结构和渲染方式
  slot / scoped slot

基础组件透传属性和事件
  attrs
```

## 13. 一个组合示例：可复用搜索区域

父组件管理搜索条件：

```vue
<script setup>
import { reactive } from 'vue'
import SearchPanel from './SearchPanel.vue'
import ProductList from './ProductList.vue'

const filters = reactive({
  keyword: '',
  category: 'all'
})

function updateFilters(nextFilters) {
  Object.assign(filters, nextFilters)
}
</script>

<template>
  <SearchPanel
    :filters="filters"
    @update="updateFilters"
  />

  <ProductList :filters="filters" />
</template>
```

搜索组件接收 props，并通过 emit 通知修改：

```vue
<script setup>
const props = defineProps({
  filters: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])

function setKeyword(keyword) {
  emit('update', {
    ...props.filters,
    keyword
  })
}

function setCategory(category) {
  emit('update', {
    ...props.filters,
    category
  })
}
</script>

<template>
  <input
    :value="filters.keyword"
    @input="setKeyword($event.target.value)"
  >

  <select
    :value="filters.category"
    @change="setCategory($event.target.value)"
  >
    <option value="all">全部</option>
    <option value="book">图书</option>
    <option value="device">设备</option>
  </select>
</template>
```

列表组件只消费筛选条件：

```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  }
})

const query = computed(() => ({
  keyword: props.filters.keyword.trim(),
  category: props.filters.category
}))
</script>

<template>
  <pre>{{ query }}</pre>
</template>
```

这个例子里不需要全局状态，因为状态只属于当前页面。父组件统一管理，两个子组件各司其职。

## 总结

组件通信没有固定答案，关键是让数据流清晰。

父子关系优先 props 和 emit；表单类受控组件用 v-model；命令式能力用 ref；深层上下文用 provide/inject；兄弟组件优先状态提升；跨页面共享状态使用 Vuex 或 Pinia；组件结构扩展用插槽。

只要先判断“状态属于谁、谁需要读、谁可以改”，通信方式自然就会清楚。
