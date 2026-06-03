---
title: React 使用教程：从组件、Hooks 到状态管理和性能优化
date: 2026-06-03
description: 系统讲解 React 的组件模型、JSX、props、state、Hooks、useEffect、表单、列表、Context、状态管理、性能优化、错误边界和面试表达。
---

# React 使用教程：从组件、Hooks 到状态管理和性能优化

React 是一个用于构建用户界面的 JavaScript 库。它的核心思想是把 UI 拆成组件，用状态描述界面，再由 React 根据状态变化更新视图。

一句话理解：

> React 让你用组件和状态来描述 UI，当状态变化时，React 负责计算并更新界面。

## 1. React 解决什么问题

没有框架时，页面状态和 DOM 操作容易混在一起：

```js
button.addEventListener('click', () => {
  count++
  countText.innerText = count
  if (count > 10) {
    warning.style.display = 'block'
  }
})
```

业务变复杂后，手动操作 DOM 很容易失控。

React 的方式是声明式 UI：

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <section>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <p>{count}</p>
      {count > 10 && <p>数量已经超过 10</p>}
    </section>
  )
}
```

开发者关注状态和 UI 关系，DOM 更新交给 React。

## 2. JSX

JSX 是 JavaScript 的语法扩展，让你可以在 JS 里写类似 HTML 的结构。

```jsx
const title = <h1 className="title">Hello React</h1>
```

注意几个差异：

| HTML | JSX |
| --- | --- |
| class | className |
| for | htmlFor |
| onclick | onClick |
| style 字符串 | style 对象 |

示例：

```jsx
function Button() {
  return (
    <button
      className="primary"
      style={{ height: 40 }}
      onClick={() => console.log('clicked')}
    >
      保存
    </button>
  )
}
```

JSX 最终会被编译成 JavaScript 函数调用。

## 3. 组件

React 组件本质上是返回 UI 的函数。

```jsx
function UserCard(props) {
  return (
    <article>
      <h2>{props.name}</h2>
      <p>{props.role}</p>
    </article>
  )
}
```

使用：

```jsx
<UserCard name="Yunlong" role="Frontend Engineer" />
```

组件应该尽量保持职责单一：

- 页面组件负责组织业务流程。
- 展示组件负责渲染 UI。
- 表单组件负责局部输入。
- Hook 负责复用状态逻辑。

## 4. Props

props 是父组件传给子组件的数据。

```jsx
function ProductItem({ product, onAdd }) {
  return (
    <li>
      <span>{product.name}</span>
      <button onClick={() => onAdd(product.id)}>加入购物车</button>
    </li>
  )
}
```

props 是只读的。子组件不应该直接修改 props，而是通过回调通知父组件。

```jsx
function ProductList() {
  const addToCart = (productId) => {
    console.log(productId)
  }

  return <ProductItem product={product} onAdd={addToCart} />
}
```

这体现了 React 的单向数据流。

## 5. State

state 是组件内部状态。

```jsx
function SearchBox() {
  const [keyword, setKeyword] = useState('')

  return (
    <input
      value={keyword}
      onChange={(event) => setKeyword(event.target.value)}
    />
  )
}
```

更新 state 后，React 会重新渲染组件。

如果新状态依赖旧状态，推荐使用函数式更新：

```jsx
setCount((prev) => prev + 1)
```

避免在同一轮更新里读到旧值导致错误。

## 6. 条件渲染和列表渲染

条件渲染：

```jsx
function UserPanel({ user }) {
  if (!user) {
    return <p>未登录</p>
  }

  return <p>你好，{user.name}</p>
}
```

列表渲染：

```jsx
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  )
}
```

`key` 用于帮助 React 识别列表项。不要在可变列表里随便用数组下标作为 key，否则插入、删除、排序时可能出现状态错位。

## 7. 受控组件

表单输入值由 React state 控制，叫受控组件。

```jsx
function LoginForm() {
  const [form, setForm] = useState({
    username: '',
    password: ''
  })

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <form>
      <input
        value={form.username}
        onChange={(event) => updateField('username', event.target.value)}
      />
      <input
        type="password"
        value={form.password}
        onChange={(event) => updateField('password', event.target.value)}
      />
    </form>
  )
}
```

优点：

- 状态可控。
- 校验方便。
- 可以联动其他 UI。

缺点：

- 大表单频繁更新可能需要优化。

## 8. useEffect

`useEffect` 用于处理渲染后的副作用。

常见副作用：

- 请求数据。
- 订阅事件。
- 操作浏览器 API。
- 设置定时器。
- 手动同步外部状态。

示例：

```jsx
function UserDetail({ userId }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadUser() {
      const response = await fetch(`/api/users/${userId}`)
      const data = await response.json()
      if (!ignore) {
        setUser(data)
      }
    }

    loadUser()

    return () => {
      ignore = true
    }
  }, [userId])

  return <div>{user?.name}</div>
}
```

依赖数组表示 effect 依赖哪些值。依赖不完整会导致闭包读到旧值。

## 9. Hooks 规则

Hooks 有两个核心规则：

1. 只在 React 函数组件或自定义 Hook 中调用。
2. 不要在条件、循环、嵌套函数中调用。

错误写法：

```jsx
function UserPanel({ visible }) {
  if (!visible) {
    return null
  }

  const [count, setCount] = useState(0)
  return <p>{count}</p>
}
```

正确写法：

```jsx
function UserPanel({ visible }) {
  const [count, setCount] = useState(0)

  if (!visible) {
    return null
  }

  return <p>{count}</p>
}
```

React 依赖 Hooks 调用顺序来对应内部状态，所以顺序必须稳定。

## 10. 自定义 Hook

自定义 Hook 用于复用状态逻辑。

```jsx
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  useEffect(() => {
    const onResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return size
}
```

使用：

```jsx
function Layout() {
  const size = useWindowSize()
  return <p>{size.width}</p>
}
```

自定义 Hook 不是共享状态本身，而是复用状态逻辑。每个组件调用都会有自己独立的状态。

## 11. Context

Context 用于跨层级传递数据。

```jsx
const ThemeContext = createContext('light')

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Page />
    </ThemeContext.Provider>
  )
}

function Toolbar() {
  const theme = useContext(ThemeContext)
  return <button className={theme}>保存</button>
}
```

适合：

- 主题。
- 语言。
- 当前用户。
- 权限。
- 一些全局配置。

不适合把所有业务状态都塞进 Context。频繁变化的大状态可能导致较多组件重渲染。

## 12. 状态管理

状态可以分层：

| 类型 | 示例 | 常见方案 |
| --- | --- | --- |
| 局部状态 | 弹窗开关、输入框值 | useState |
| 派生状态 | 根据列表计算总价 | useMemo 或直接计算 |
| 跨组件状态 | 用户信息、主题 | Context |
| 客户端全局状态 | 购物车、筛选条件 | Zustand、Redux |
| 服务端状态 | 列表、详情、缓存 | React Query、SWR |

不要一上来就把所有状态放进全局 store。状态离使用它的地方越近，通常越容易维护。

## 13. 性能优化

React 常见性能优化：

- 使用 `React.memo` 避免 props 不变时重渲染。
- 使用 `useMemo` 缓存昂贵计算。
- 使用 `useCallback` 稳定函数引用。
- 列表使用稳定 key。
- 大列表使用虚拟滚动。
- 路由级代码分割。
- 避免把频繁变化状态放在过高层级。

示例：

```jsx
const UserItem = React.memo(function UserItem({ user, onSelect }) {
  return <button onClick={() => onSelect(user.id)}>{user.name}</button>
})
```

但不要滥用 memo。性能优化要结合实际瓶颈，不要为每个函数都包 `useCallback`。

## 14. 错误边界

错误边界用于捕获子组件渲染阶段错误，避免整个应用白屏。

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    reportError(error, info)
  }

  render() {
    if (this.state.hasError) {
      return <p>页面出现异常</p>
    }

    return this.props.children
  }
}
```

使用：

```jsx
<ErrorBoundary>
  <UserPage />
</ErrorBoundary>
```

它不能捕获所有错误，比如事件处理器里的异步错误仍然需要自己处理。

## 15. React 面试常问

### 15.1 为什么 state 更新后不是立刻拿到新值

React 会批量处理状态更新。状态更新触发重新渲染，新值会在下一次渲染中体现。

### 15.2 key 有什么作用

key 帮助 React 在列表 diff 时识别节点身份。稳定 key 可以减少错误复用，避免列表状态错乱。

### 15.3 useEffect 和 useLayoutEffect 区别

`useEffect` 在浏览器绘制后执行，适合请求、订阅等副作用。

`useLayoutEffect` 在 DOM 更新后、浏览器绘制前执行，适合测量布局和同步修改布局，但可能阻塞绘制。

### 15.4 React.memo、useMemo、useCallback 区别

| API | 作用 |
| --- | --- |
| React.memo | 缓存组件渲染结果 |
| useMemo | 缓存计算结果 |
| useCallback | 缓存函数引用 |

## 16. 面试怎么回答

可以这样回答：

> React 是声明式 UI 库，核心是组件、props、state 和单向数据流。组件根据 props 和 state 返回 UI，状态变化后 React 重新渲染组件并更新 DOM。Hooks 让函数组件可以使用状态和副作用，但 Hooks 必须保证调用顺序稳定，不能写在条件或循环里。复杂项目里，局部状态用 useState，跨层级配置用 Context，客户端全局状态可以用 Redux 或 Zustand，服务端数据缓存可以用 React Query。性能优化上要关注 key、memo、useMemo、useCallback、代码分割和虚拟列表，但要基于实际瓶颈使用。

## 17. 总结

React 的核心是声明式组件和状态驱动视图。

记住这些点：

- props 从父到子，只读。
- state 变化触发重新渲染。
- Hooks 调用顺序必须稳定。
- useEffect 处理副作用。
- Context 适合跨层级配置，不适合承载所有状态。
- 性能优化要基于真实问题。

理解这些，再学习路由、状态库、服务端渲染和工程化工具都会顺很多。
