---
title: Vue 2 和 Vue 3 常用全局状态管理工具讲解
date: 2026-05-23
description: 结合代码讲清 Vuex、Pinia、provide/inject、响应式单例和浏览器持久化状态在 Vue 2、Vue 3 项目中的使用方式与适用场景。
---

# Vue 2 和 Vue 3 常用全局状态管理工具讲解

全局状态管理要解决的不是“怎么定义一个全局变量”，而是怎么让多个组件共享同一份状态，并且让修改过程可追踪、可维护、可调试。

常见全局状态包括：

1. 登录用户信息。
2. 权限和菜单。
3. 主题、语言、布局配置。
4. 购物车、播放器、草稿箱。
5. 多页面共享的筛选条件和缓存数据。

本文按 Vue 2 和 Vue 3 中常用方案展开：Vuex、Pinia、provide/inject、响应式单例，以及持久化存储。

## 1. 什么状态需要放到全局

不是所有状态都应该进入全局仓库。

适合放组件内部的状态：

```vue
<script>
export default {
  data() {
    return {
      keyword: '',
      currentTab: 'all'
    }
  }
}
</script>
```

这些状态只影响当前组件，放到全局会增加理解成本。

适合放全局的状态：

```js
const globalState = {
  user: null,
  token: '',
  permissions: [],
  theme: 'light'
}
```

判断标准很简单：如果多个远距离组件都需要读取或修改它，或者页面刷新后还要恢复它，就可以考虑全局管理。

## 2. Vuex：Vue 2 时代最常见的集中式状态管理

Vuex 的核心概念包括：

1. `state`：保存状态。
2. `getters`：派生状态。
3. `mutations`：同步修改状态。
4. `actions`：处理异步逻辑。
5. `modules`：拆分大型 store。

### 基础 store

```js
// store/index.js
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    token: '',
    user: null
  },
  getters: {
    isLogin(state) {
      return Boolean(state.token)
    },
    userName(state) {
      return state.user?.name || '未登录'
    }
  },
  mutations: {
    setToken(state, token) {
      state.token = token
    },
    setUser(state, user) {
      state.user = user
    },
    logout(state) {
      state.token = ''
      state.user = null
    }
  },
  actions: {
    async login({ commit }, form) {
      const res = await apiLogin(form)
      commit('setToken', res.token)
      commit('setUser', res.user)
    }
  }
})
```

挂到 Vue 2 应用：

```js
// main.js
import Vue from 'vue'
import App from './App.vue'
import store from './store'

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')
```

组件中使用：

```vue
<template>
  <header>
    <span>{{ userName }}</span>
    <button v-if="isLogin" @click="logout">退出</button>
  </header>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'

export default {
  computed: {
    ...mapGetters(['isLogin', 'userName'])
  },
  methods: {
    ...mapMutations(['logout'])
  }
}
</script>
```

### 为什么 Vuex 要区分 mutation 和 action

mutation 必须是同步的：

```js
mutations: {
  setUser(state, user) {
    state.user = user
  }
}
```

action 可以异步：

```js
actions: {
  async fetchUser({ commit }) {
    const user = await getUserInfo()
    commit('setUser', user)
  }
}
```

这样做的好处是：状态真正被修改的位置集中在 mutation 中，调试工具可以记录每次 mutation 的名称和前后状态。

### Vuex 模块拆分

项目变大后，可以按领域拆分：

```js
// store/modules/user.js
export default {
  namespaced: true,
  state: () => ({
    token: '',
    profile: null
  }),
  mutations: {
    setProfile(state, profile) {
      state.profile = profile
    }
  },
  actions: {
    async fetchProfile({ commit }) {
      const profile = await getProfile()
      commit('setProfile', profile)
    }
  }
}
```

注册模块：

```js
import Vuex from 'vuex'
import user from './modules/user'
import cart from './modules/cart'

export default new Vuex.Store({
  modules: {
    user,
    cart
  }
})
```

组件调用带命名空间的 action：

```js
this.$store.dispatch('user/fetchProfile')
```

Vuex 适合 Vue 2 项目，也适合已经大量使用 Vuex 的 Vue 3 老项目继续维护。

## 3. Pinia：Vue 3 推荐使用的状态管理

Pinia 的写法更轻，类型推导更好，也没有 mutation 概念。状态可以直接通过 action 修改。

安装后创建实例：

```js
// main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.mount('#app')
```

### Option Store 写法

```js
// stores/user.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    profile: null
  }),
  getters: {
    isLogin: state => Boolean(state.token),
    userName: state => state.profile?.name || '未登录'
  },
  actions: {
    async login(form) {
      const res = await apiLogin(form)
      this.token = res.token
      this.profile = res.user
    },
    logout() {
      this.token = ''
      this.profile = null
    }
  }
})
```

组件中使用：

```vue
<template>
  <header>
    <span>{{ userStore.userName }}</span>
    <button v-if="userStore.isLogin" @click="userStore.logout">
      退出
    </button>
  </header>
</template>

<script setup>
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
</script>
```

### Setup Store 写法

Pinia 也支持组合式写法：

```js
// stores/cart.js
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  const totalCount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.count, 0)
  })

  const totalPrice = computed(() => {
    return items.value.reduce((sum, item) => {
      return sum + item.price * item.count
    }, 0)
  })

  function addItem(product) {
    const item = items.value.find(item => item.id === product.id)

    if (item) {
      item.count++
    } else {
      items.value.push({
        ...product,
        count: 1
      })
    }
  }

  function clear() {
    items.value = []
  }

  return {
    items,
    totalCount,
    totalPrice,
    addItem,
    clear
  }
})
```

这种写法和普通组合式函数非常接近，适合 Vue 3 项目。

### storeToRefs 避免解构丢失响应式

直接解构 store 里的状态容易出问题：

```js
const userStore = useUserStore()
const { profile } = userStore
```

更推荐：

```vue
<script setup>
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const { profile, userName, isLogin } = storeToRefs(userStore)
const { logout } = userStore
</script>
```

`storeToRefs` 会把 state 和 getter 转成 ref，action 则可以直接解构。

## 4. Vue 2 中使用 Pinia

如果 Vue 2 项目已经升级到 Vue 2.7，或者使用了 `@vue/composition-api`，也可以使用 Pinia。

Vue 2.7 示例：

```js
import Vue from 'vue'
import { createPinia, PiniaVuePlugin } from 'pinia'
import App from './App.vue'

Vue.use(PiniaVuePlugin)

new Vue({
  pinia: createPinia(),
  render: h => h(App)
}).$mount('#app')
```

然后 store 的定义方式和 Vue 3 基本一致：

```js
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'light'
  }),
  actions: {
    toggle() {
      this.mode = this.mode === 'light' ? 'dark' : 'light'
    }
  }
})
```

如果是更早的 Vue 2 项目，Vuex 通常仍然是更稳妥的选择。

## 5. provide/inject：适合局部全局状态

有些状态需要跨多层组件传递，但范围只在某个页面或某棵组件树内。这时不一定要放进 Vuex 或 Pinia。

例如表单页中，父组件提供表单上下文：

```vue
<!-- FormProvider.vue -->
<script setup>
import { provide, reactive } from 'vue'

const formState = reactive({
  values: {},
  errors: {}
})

function setField(name, value) {
  formState.values[name] = value
}

provide('formContext', {
  formState,
  setField
})
</script>

<template>
  <slot />
</template>
```

深层子组件注入：

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

function onInput(event) {
  formContext.setField(props.name, event.target.value)
}
</script>

<template>
  <input
    :value="formContext.formState.values[name] || ''"
    @input="onInput"
  >
</template>
```

这种方式很适合：

1. 表单组件库。
2. Tabs、Menu、Table 等复合组件。
3. 某个页面内部共享状态。

它不适合管理整个应用的登录态、权限、购物车等，因为注入来源和修改路径不如专门的 store 清晰。

## 6. 响应式单例：轻量场景可以直接用

Vue 3 中，模块天然是单例。可以创建一个响应式对象并导出。

```js
// stores/appState.js
import { reactive, readonly } from 'vue'

const state = reactive({
  sidebarOpen: true,
  theme: 'light'
})

function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen
}

function setTheme(theme) {
  state.theme = theme
}

export function useAppState() {
  return {
    state: readonly(state),
    toggleSidebar,
    setTheme
  }
}
```

组件使用：

```vue
<script setup>
import { useAppState } from '@/stores/appState'

const { state, toggleSidebar, setTheme } = useAppState()
</script>

<template>
  <button @click="toggleSidebar">
    {{ state.sidebarOpen ? '收起' : '展开' }}
  </button>

  <button @click="setTheme('dark')">
    深色模式
  </button>
</template>
```

这种方案代码很少，但缺少 DevTools、插件、时间旅行调试、统一约束等能力。适合轻量配置，不适合复杂业务状态。

## 7. 持久化：刷新后恢复状态

全局状态默认存在内存里，刷新页面就没了。登录 token、主题、语言等通常需要持久化。

### Pinia 持久化示例

可以手写订阅：

```js
const userStore = useUserStore()

const cached = localStorage.getItem('user-store')
if (cached) {
  userStore.$patch(JSON.parse(cached))
}

userStore.$subscribe((mutation, state) => {
  localStorage.setItem('user-store', JSON.stringify({
    token: state.token,
    profile: state.profile
  }))
})
```

也可以封装成 Pinia 插件：

```js
export function persistPlugin({ store }) {
  const key = `pinia:${store.$id}`
  const cached = localStorage.getItem(key)

  if (cached) {
    store.$patch(JSON.parse(cached))
  }

  store.$subscribe((mutation, state) => {
    localStorage.setItem(key, JSON.stringify(state))
  })
}
```

注册插件：

```js
const pinia = createPinia()
pinia.use(persistPlugin)

app.use(pinia)
```

注意：不要把敏感信息长期明文放在 `localStorage`。如果 token 必须放前端，需要配合过期时间、刷新机制和后端安全策略。

## 8. 请求数据是否都要进全局状态

很多接口数据只属于某个页面，例如列表页数据：

```js
const list = ref([])
const loading = ref(false)

async function fetchList() {
  loading.value = true
  try {
    list.value = await getProductList()
  } finally {
    loading.value = false
  }
}
```

这种数据没有必要默认放进全局 store。

更适合进入 store 的请求数据通常有两个特征：

1. 多个页面都会用。
2. 需要跨页面保持一致。

例如用户信息：

```js
export const useUserStore = defineStore('user', {
  state: () => ({
    profile: null,
    loaded: false
  }),
  actions: {
    async ensureProfile() {
      if (this.loaded) return

      this.profile = await getProfile()
      this.loaded = true
    }
  }
})
```

路由守卫中可以复用：

```js
router.beforeEach(async () => {
  const userStore = useUserStore()
  await userStore.ensureProfile()
})
```

页面组件中也可以复用：

```js
const userStore = useUserStore()
await userStore.ensureProfile()
```

## 9. Vuex 与 Pinia 如何选择

Vue 2 项目：

1. 已经使用 Vuex：继续维护 Vuex 通常成本最低。
2. Vue 2.7 新项目：可以考虑 Pinia。
3. 非常轻量的共享状态：可以用 provide/inject 或响应式单例。

Vue 3 项目：

1. 复杂业务状态：优先 Pinia。
2. 局部组件树状态：provide/inject。
3. 少量全局 UI 配置：响应式单例也可以。
4. 已迁移项目仍有 Vuex：可以逐步迁到 Pinia，不必一次性重写。

## 10. 一个清晰的状态分层

实际项目可以这样分层：

```txt
组件内部状态
  keyword、弹窗开关、当前 tab

页面级组合式函数
  useProductList、useSearchForm

局部上下文
  FormContext、TableContext、MenuContext

全局状态仓库
  user、permission、cart、theme

持久化存储
  token、语言、主题、部分草稿
```

对应代码组织：

```txt
src/
  stores/
    user.js
    permission.js
    cart.js
    theme.js
  composables/
    useProductList.js
    useSearchForm.js
  components/
    Form/
      FormProvider.vue
      FormItem.vue
```

这样能避免所有状态都堆进 store，也能避免跨层传参越来越混乱。

## 总结

全局状态管理的关键不是工具名称，而是状态边界。

Vuex 强调集中式修改和清晰记录，适合大量 Vue 2 项目。Pinia 写法更轻、类型体验更好，是 Vue 3 项目的主流选择。provide/inject 适合组件树内部共享上下文，响应式单例适合很轻的应用级配置。再配合合理的持久化策略，就能把“哪里读状态、哪里改状态、刷新后如何恢复”讲清楚。
