---
title: Vue 3 面试复习
date: 2026-05-18
description: 整理 Vue3 与 Vue2 对比、组合式 API、Hook、TypeScript 支持和生命周期。
---

# Vue 3 面试复习

整理 Vue3 与 Vue2 对比、组合式 API、Hook、TypeScript 支持和生命周期。

> 本文从旧博客笔记归档中按主题拆分整理，保留了原笔记内容和图片引用。
> 来源日期：2025.06.22

## Vue3的组合式api和Vue2的选项式区别

### 🎤 **面试官，我的回答可以这样收尾（口头精简版）**  

**“简单来说，Vue3 的组合式 API 最大的优势是让代码按逻辑功能组织，而不是分散在选项里。比如一个‘用户管理’功能，相关的数据、方法可以写在一起，而不是拆到 data、methods 里。这样既方便复用（比如抽成自定义 Hook），也更容易维护，尤其适合复杂项目。另外，它对 TypeScript 的支持也更友好。当然，如果是简单场景，选项式 API 写起来会更直观。”**  

（如果面试官追问细节，再展开说代码示例或对比 TypeScript 支持～）  

---
### 🚀 **Vue3 组合式 API vs Vue2 选项式 API：核心区别**  

1. **代码组织方式不同**  
   - **选项式 (Options API)**：通过 `data`、`methods`、`computed` 等**固定选项**组织代码，功能分散在不同区块。  
     ```javascript
     export default {
       data() { return { count: 0 } },
       methods: { increment() { this.count++ } }
     }
     ```
   - **组合式 (Composition API)**：通过 `setup()` **按逻辑功能**组织代码，相关代码集中在一起。  
     ```javascript
     import { ref } from 'vue';
     export default {
       setup() {
         const count = ref(0);
         const increment = () => count.value++;
         return { count, increment };
       }
     }
     ```

2. **逻辑复用能力**  
   - **选项式**：通过 **mixins** 复用逻辑，但容易命名冲突，来源不清晰。  
   - **组合式**：通过 **自定义 Hook**（如 `useCounter()`）复用逻辑，更灵活、可追溯。  

3. **TypeScript 支持**  
   - 组合式 API 天然支持 **类型推断**，选项式 API 需要额外适配。  

---

### 🌟 **组合式 API 的优点**  

1. **更好的代码组织**  
   - 相关逻辑集中管理（比如用户认证、表单验证），避免在 `data`、`methods` 间反复跳转。  

2. **更强的逻辑复用**  
   - 自定义 Hook 类似 React 的 Hooks，可跨组件复用（如 `useFetch`、`useLocalStorage`）。  

3. **更灵活的响应式控制**  
   - 使用 `ref`、`reactive` 显式声明响应式数据，配合 `computed`、`watch` 更精准控制依赖。  

4. **更好的 TypeScript 集成**  
   - 减少 `this` 的使用，类型推导更友好，适合大型项目。  

5. **更低的耦合度**  
   - 逻辑块可独立拆分，便于维护和测试。  

---

### 💡 **适用场景建议**  
- **选项式**：适合简单项目或 Vue2 迁移过渡，学习成本低。  
- **组合式**：适合复杂逻辑、大型项目或需要 TypeScript 的场景。  

> 📌 **面试加分点**：提到 `<script setup>` 语法糖（更简洁的组合式写法）和 `Vue2.7` 支持组合式 API 的兼容性。  

**示例对比**：  
```javascript
// 选项式：功能分散
export default {
  data() { return { user: null } },
  mounted() { this.fetchUser() },
  methods: { fetchUser() { /*...*/ } }
}

// 组合式：逻辑聚合
export default {
  setup() {
    const user = ref(null);
    const fetchUser = async () => { /*...*/ };
    onMounted(fetchUser);
    return { user };
  }
}
```

> 来源日期：2025.06.22

## Vue3中Hook？自定义Hook？

### 🎤 **面试官，我的回答可以这样组织（口头精简版）**  

**"在 Vue3 中，Hook 是一种利用组合式 API（Composition API）来封装和复用逻辑的方式。自定义 Hook 就是开发者自己写的 Hook，它把一些可复用的逻辑抽离出来，变成一个独立的函数，方便在多个组件中调用。比如可以把‘计数器逻辑’、‘数据请求逻辑’封装成自定义 Hook，然后在不同组件里直接使用。"**  

---

### 🧠 **详细解释（供复习使用）**  

#### **1. 什么是 Hook？**  
在 Vue3 中，**Hook 是指利用 `ref`、`reactive`、`computed`、`watch` 等组合式 API 来管理组件逻辑的方式**。它让代码更灵活、更易复用。  

- **Vue 内置的 Hook**（生命周期钩子）：  
  - `onMounted`、`onUpdated`、`onUnmounted` 等，用于替代 Vue2 的 `mounted`、`updated`、`destroyed`。  
  ```javascript
  import { onMounted } from 'vue';
  
  export default {
    setup() {
      onMounted(() => {
        console.log('组件挂载完成！');
      });
    }
  }
  ```

#### **2. 什么是自定义 Hook？**  
**自定义 Hook 就是把一些可复用的逻辑封装成一个函数，方便在多个组件里调用**，类似于 React 的自定义 Hook。  

- **示例：封装一个 `useCounter` Hook**  
  ```javascript
  // useCounter.js
  import { ref } from 'vue';
  
  export function useCounter(initialValue = 0) {
    const count = ref(initialValue);
    const increment = () => count.value++;
    const decrement = () => count.value--;
    
    return { count, increment, decrement };
  }
  ```
- **在组件中使用**  
  ```javascript
  import { useCounter } from './useCounter';
  
  export default {
    setup() {
      const { count, increment } = useCounter(0);
      return { count, increment };
    }
  }
  ```

#### **3. 自定义 Hook 的优点**  
✅ **逻辑复用**：避免重复代码，比如 `useFetch`、`useLocalStorage`。  
✅ **代码更清晰**：把复杂逻辑抽离成独立函数，组件更简洁。  
✅ **易于测试**：Hook 可以单独测试，不依赖组件。  

#### **4. 常见自定义 Hook 示例**  
- **`useFetch`**：封装数据请求逻辑  
- **`useDarkMode`**：封装暗黑模式切换逻辑  
- **`useMousePosition`**：封装鼠标位置跟踪逻辑  

---

### 📌 **面试加分点**  
- **对比 React Hooks**：Vue 的自定义 Hook 和 React Hooks 类似，但 Vue 的 `ref`/`reactive` 让响应式管理更灵活。  
- **结合 `<script setup>`**：自定义 Hook 在 `<script setup>` 里使用更简洁。  
- **实际项目经验**：如果用过自定义 Hook，可以举例说明（比如封装过权限校验、表单验证等）。  

**示例回答进阶版（如果面试官深入问）**：  
**“我们项目里封装了一个 `usePagination` Hook，处理分页逻辑，包括当前页、每页条数、总数计算等，这样所有需要分页的组件都能直接复用，减少重复代码。”**  

---

### 🔥 **一句话总结**  
**“Hook 是组合式 API 的用法，自定义 Hook 就是把逻辑封装成函数，让代码更干净、更易复用！”** 🚀

> 来源日期：2025.06.22

## 为什么Vue3对TypeScript的支持更友好？

### 🎤 **面试官，我的回答可以这样组织（口头精简版）**  

**"Vue3 对 TypeScript 的支持更友好，主要体现在三个方面：  
1. **组合式 API 减少 `this` 使用**，类型推断更准确；  
2. **所有核心 API 都内置类型定义**（如 `ref`、`reactive`）；  
3. **`<script setup>` 语法** 能自动推导 props 和 emits 的类型，开发体验更流畅。  
像我们项目用 Vue3 + TS 开发时，组件 props、自定义 Hook 都能完美享受类型检查，减少低级错误。"**  

---

### 🧠 **详细解释（供复习使用）**  

#### **1. 组合式 API 的天然 TS 友好性**  
Vue2 的选项式 API 严重依赖 `this`，而 TS 很难推断 `this` 的类型：  
```typescript
export default {
  data() {
    return { count: 0 }; // ❌ this.count 的类型可能被误判
  },
  methods: {
    increment() {
      this.count++; // TS 难以确定 this.count 是 number
    }
  }
}
```
Vue3 的组合式 API 通过 `ref`/`reactive` 显式声明类型：  
```typescript
import { ref } from 'vue';

const count = ref<number>(0); // ✅ 明确类型为 number
count.value = 'hello'; // ❌ TS 直接报错！
```

#### **2. 核心 API 的内置类型支持**  
Vue3 的响应式 API（`ref`、`reactive`）、生命周期钩子等**全部用 TS 重写**，自动提供类型提示：  
```typescript
import { ref, onMounted } from 'vue';

const user = ref<{ name: string }>({ name: 'Alice' });  
onMounted(() => { /* 类型安全 */ }); // ✅ 鼠标悬停可看到完整类型定义
```

#### **3. `<script setup>` 的极致类型推导**  
Vue3 的 `<script setup>` 语法能自动推导 **props** 和 **emits** 类型：  
```typescript
<script setup lang="ts">
// ✅ 定义 props 类型（运行时 + TS 双重检查）
const props = defineProps<{ id: number; title: string }>();

// ✅ 定义 emits 类型
const emit = defineEmits<{ (e: 'submit', payload: string): void }>();
</script>
```

#### **4. 对比 Vue2 的 TS 痛点**  
| 特性           | Vue2 + TS                     | Vue3 + TS           |
| -------------- | ----------------------------- | ------------------- |
| `this` 类型    | 需手动扩展 `ComponentOptions` | 几乎无需操作        |
| Props 类型检查 | 依赖 `vue-property-decorator` | 原生支持            |
| 响应式数据类型 | 需要额外类型断言              | `ref<T>()` 直接声明 |

#### **5. 实际开发优势**  
- **组件 Props 智能提示**：  
  ```typescript
  // 父组件传递 props 时，TS 会检查是否缺少必填字段或类型错误
  <ChildComponent :id="123" title="Vue3" />  
  ```
- **自定义 Hook 类型安全**：  
  ```typescript
  // useFetch.ts
  export function useFetch<T>(url: string) {
    const data = ref<T | null>(null);
    // ... 自动推导 data.value 类型为 T | null
    return { data };
  }
  
  // 使用时
  const { data } = useFetch<{ name: string }>('/api/user');
  data.value?.name; // ✅ 正确推断为 string | undefined
  ```

---

### 📌 **面试加分点**  
- **提到 `defineComponent`**：Vue3 的 `defineComponent`  helper 函数提供了更好的 TS 支持。  
- **Volar 插件**：推荐使用 Volar（替代 Vetur）获得更完美的 TS 支持。  
- **举例遇到的坑**：比如 Vue2 中 `this.$store` 的类型扩展问题，Vue3 如何解决。  

**示例回答进阶版**：  
**“我们项目迁移到 Vue3 后，之前用 `@Component` 装饰器定义的组件，全部换成了 `<script setup>` + TS，不仅代码量减少 30%，而且类型检查能在编码阶段就拦截 `props` 传错类型的问题，比如后端返回的 `id` 本来是 `number`，但前端误传了 `string`，TS 会直接报错。”**  

---

### 🔥 **一句话总结**  
**“Vue3 从源码到 API 设计都为 TS 优化，组合式 API + `<script setup>` 让类型安全变得简单又强大！”** 🚀

> 来源日期：2025.06.22

## Vue3的生命周期钩子，对比Vue2

### 🎤 **面试官，我的回答可以这样组织（口头精简版）**  

**"Vue3 的生命周期钩子整体和 Vue2 类似，但有两个主要变化：**  
1. **部分钩子改名**：比如 `beforeDestroy` 改为 `beforeUnmount`，`destroyed` 改为 `unmounted`，命名更语义化；  
2. **组合式 API 的钩子用法**：Vue3 在 `setup()` 中通过函数形式调用钩子（如 `onMounted`），而 Vue2 是直接在选项里定义（如 `mounted`）。  
此外，Vue3 新增了调试钩子（如 `onRenderTracked`），并取消了 `beforeCreate` 和 `created`，改用 `setup()` 替代。"**  

（如果面试官追问细节，再展开说执行顺序或代码示例～）  

---

### 🧠 **详细对比与示例（供复习使用）**  

#### **1. 钩子函数名称变化**  
| Vue2 选项式 API | Vue3 组合式 API         | 变化说明                        |
| --------------- | ----------------------- | ------------------------------- |
| `beforeCreate`  | 无（由 `setup()` 替代） | 逻辑直接写在 `setup()` 中       |
| `created`       | 无（由 `setup()` 替代） | 同上                            |
| `beforeMount`   | `onBeforeMount`         | 功能一致，命名更直观            |
| `mounted`       | `onMounted`             | 功能一致                        |
| `beforeUpdate`  | `onBeforeUpdate`        | 功能一致                        |
| `updated`       | `onUpdated`             | 功能一致                        |
| `beforeDestroy` | `onBeforeUnmount`       | 改名，强调“卸载”语义            |
| `destroyed`     | `onUnmounted`           | 改名，强调“卸载”语义            |
| `errorCaptured` | `onErrorCaptured`       | 功能一致                        |
| 无              | `onRenderTracked`       | Vue3 新增，用于调试响应式依赖   |
| 无              | `onRenderTriggered`     | Vue3 新增，用于调试重新渲染触发 |

#### **2. 执行顺序对比**  
- **Vue2**：父组件的 `beforeCreate` → 子组件的 `beforeCreate` → 父组件的 `created` → 子组件的 `created` → ...  
- **Vue3**：父组件的 `setup()` → 子组件的 `setup()` → 父组件的 `onBeforeMount` → 子组件的 `onBeforeMount` → ...   

#### **3. 代码示例**  
**Vue2 选项式 API**：  
```javascript
export default {
  data() { return { count: 0 }; },
  created() { console.log("数据已初始化"); },
  mounted() { console.log("DOM 已挂载"); },
  beforeDestroy() { console.log("组件即将销毁"); }
}
```

**Vue3 组合式 API**：  
```javascript
import { onMounted, onUnmounted } from 'vue';

export default {
  setup() {
    onMounted(() => { console.log("DOM 已挂载"); });
    onUnmounted(() => { console.log("组件已卸载"); });
    return {};
  }
}
```

#### **4. 核心差异总结**  
1. **组合式 API 的灵活性**：Vue3 的钩子可多次调用，逻辑更聚合（如拆分多个 `onMounted`）；  
2. **TypeScript 支持**：Vue3 的钩子函数有完整的类型推导；  
3. **调试能力增强**：新增 `onRenderTracked` 和 `onRenderTriggered` 用于分析渲染性能。  

---

### 📌 **面试加分点**  
- **提到 `<script setup>`**：在单文件组件中，`<script setup>` 语法糖会自动推导钩子类型，代码更简洁。  
- **异步组件与 Suspense**：Vue3 的 `onMounted` 对异步组件更友好，结合 `<Suspense>` 可优化加载体验。  
- **实际场景举例**：  
  ```javascript
  // 清理定时器的场景
  onUnmounted(() => clearInterval(timer));
  ```

**示例回答进阶版**：  
**“我们在项目中用 `onMounted` 加载数据，用 `onUnmounted` 清理事件监听器。Vue3 的钩子函数可以按逻辑拆分，比如把数据请求和 DOM 操作分开到两个 `onMounted` 中，代码更清晰。”**  

---

### 🔥 **一句话总结**  
**“Vue3 生命周期钩子更语义化、更灵活，配合组合式 API 能更好地组织代码，尤其适合复杂项目！”** 🚀

> 来源日期：2025.06.22

## Vue3与Vue2不同

### 🎤 **面试官，我的回答可以这样组织（口头精简版）**  

**"Vue3 相比 Vue2 有五大核心变化：**  
1. **响应式系统**：Vue3 用 `Proxy` 替代 `Object.defineProperty`，支持动态属性增删和数组索引修改，性能更好。  
2. **组合式 API**：引入 `setup()` 和 `ref`/`reactive`，逻辑复用更灵活，替代 Vue2 的 `data`/`methods` 选项式 API。  
3. **性能优化**：虚拟 DOM 重构、Tree-shaking 支持，打包体积更小，渲染速度更快。  
4. **新特性**：支持多根节点（Fragment）、`Teleport`（跨 DOM 渲染）、`Suspense`（异步组件加载）。  
5. **TypeScript 支持**：Vue3 源码用 TS 重写，类型推断更完善，开发体验更友好。"  

（如果面试官追问细节，再展开说代码示例或迁移策略～）  

---

### 🧠 **详细对比与示例（供复习使用）**  

#### **1. 响应式系统**  
| **特性**         | **Vue2**                      | **Vue3**           |
| ---------------- | ----------------------------- | ------------------ |
| **实现方式**     | `Object.defineProperty`       | `Proxy`            |
| **动态属性监听** | 需手动 `Vue.set`/`Vue.delete` | 自动监听增删改     |
| **数组监听**     | 部分方法需重写（如 `push`）   | 直接支持索引修改   |
| **性能**         | 递归遍历属性，性能较低        | 惰性监听，性能更高 |

**示例**：  
```javascript
// Vue2：动态属性需手动处理
this.$set(this.obj, 'newProp', 123);  

// Vue3：自动响应
const obj = reactive({});
obj.newProp = 123;  // 自动触发更新
```

#### **2. 组合式 API vs 选项式 API**  
| **对比项**   | **Vue2 (选项式)**                  | **Vue3 (组合式)**             |
| ------------ | ---------------------------------- | ----------------------------- |
| **代码组织** | 逻辑分散在 `data`/`methods` 等选项 | 逻辑按功能聚合在 `setup()` 中 |
| **复用性**   | Mixins 易命名冲突                  | 自定义 Hook（如 `useFetch`）  |
| **TS 支持**  | 需额外适配                         | 原生支持类型推导              |

**示例**：  
```javascript
// Vue2：选项式
export default {
  data() { return { count: 0 }; },
  methods: { increment() { this.count++; } }
};

// Vue3：组合式
import { ref } from 'vue';
export default {
  setup() {
    const count = ref(0);
    const increment = () => count.value++;
    return { count, increment };
  }
}
```

#### **3. 生命周期钩子变化**  
| **Vue2**        | **Vue3**                | **说明**                  |
| --------------- | ----------------------- | ------------------------- |
| `beforeCreate`  | 无（由 `setup()` 替代） | 逻辑直接写在 `setup()` 中 |
| `created`       | 无（由 `setup()` 替代） | 同上                      |
| `beforeDestroy` | `onBeforeUnmount`       | 更名，语义更清晰          |
| `destroyed`     | `onUnmounted`           | 更名，语义更清晰          |

**示例**：  
```javascript
import { onMounted } from 'vue';
export default {
  setup() {
    onMounted(() => console.log("组件挂载完成"));
  }
}
```

#### **4. 新特性**  
- **Fragment**：支持多根节点模板，减少冗余 DOM 层级。  
- **Teleport**：将组件渲染到任意 DOM 位置（如全局弹窗）。  
- **Suspense**：优雅处理异步组件加载状态。  

**示例**：  
```html
<!-- Teleport 示例 -->
<teleport to="body">
  <div class="modal">内容</div>
</teleport>
```

#### **5. 其他差异**  
- **v-model**：Vue3 支持多个 `v-model` 绑定（如 `v-model:title`）。  
- **Tree-shaking**：Vue3 默认支持，未使用的 API 不会打包。  
- **全局 API**：Vue3 使用 `createApp()` 替代 `new Vue()`，避免全局污染。  

---

### 📌 **面试加分点**  
- **迁移策略**：Vue3 提供 `@vue/compat` 兼容层，支持渐进式迁移。  
- **性能数据**：Vue3 初始渲染快 55%，更新快 133%，内存占用减少 50%。  
- **实际案例**：  
  **"我们项目用 Vue3 的 `Composition API` 封装了分页逻辑，代码复用率提升 40%。"**  

---

### 🔥 **一句话总结**  
**“Vue3 通过 Proxy 响应式、Composition API 和编译优化，实现了性能飞跃和开发体验升级，同时引入 Fragment、Teleport 等新特性，更适合现代前端开发！”** 🚀  

---

---

