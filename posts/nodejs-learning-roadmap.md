---
title: Node.js 实战教程：从 JS 基础到可上线 API
date: 2026-05-21
description: 面向已有 JavaScript 基础的 Node.js 实战教程，通过 Todo API 项目讲清运行时、路由、中间件、错误处理、鉴权和部署思路。
---

# Node.js 实战教程：从 JS 基础到可上线 API

如果你已经会 JavaScript，学习 Node.js 不应该停留在“知道 fs、path、http 这些模块”。更有效的方式是直接做一个小型后端服务，把运行时、HTTP、路由、中间件、错误处理、鉴权、日志和部署串起来。

本文用一个 **Todo API** 做主线。你可以把它当成面试项目讲，也可以按代码自己敲一遍。

## 学习路线图

```mermaid
flowchart LR
  A["JS 基础"] --> B["Node.js 运行时"]
  B --> C["HTTP 服务"]
  C --> D["Express 路由"]
  D --> E["中间件与错误处理"]
  E --> F["数据层与业务分层"]
  F --> G["鉴权与权限"]
  G --> H["日志、测试、部署"]
```

面试中可以先说这条主线：

> 我学 Node.js 会先理解它和浏览器 JS 的运行时差异，再通过 HTTP 服务掌握后端请求处理模型，然后用 Express/Fastify 做路由、中间件、错误处理和数据层分层，最后补齐鉴权、日志、测试和部署，让服务具备上线能力。

## 1. Node.js 和浏览器 JS 的区别

浏览器里的 JS 主要操作 DOM、BOM 和 Web API。Node.js 里的 JS 主要操作文件、网络、进程和服务端资源。

| 对比项 | 浏览器 | Node.js |
| --- | --- | --- |
| 全局对象 | `window` | `globalThis` |
| 模块系统 | ESM 为主 | ESM / CommonJS 都常见 |
| 文件系统 | 不能直接访问 | `fs` / `fs/promises` |
| 网络服务 | 发请求为主 | 既能发请求，也能创建服务 |
| 运行场景 | 用户设备 | 服务器、脚本、CLI、构建工具 |

先看一个最小脚本：

```js
// scripts/read-package.mjs
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const filePath = path.resolve('package.json')
const content = await readFile(filePath, 'utf8')
const pkg = JSON.parse(content)

console.log(pkg.name)
```

这里已经用到了 Node.js 的几个特点：

- 可以直接读文件。
- 可以用 `node:` 前缀导入内置模块。
- 可以用顶层 `await`，前提是 ESM。
- `path.resolve` 能处理不同系统下的路径差异。

## 2. 从原生 HTTP 服务开始

不要一上来只会 Express。先用原生 `http` 写一个服务，理解请求和响应。

```js
// server-basic.mjs
import http from 'node:http'

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Not Found' }))
})

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000')
})
```

运行：

```bash
node server-basic.mjs
```

访问：

```bash
curl http://localhost:3000/health
```

你要理解：

- `req` 是请求对象，包含 method、url、headers。
- `res` 是响应对象，负责状态码、响应头和响应体。
- 后端本质就是“接收请求 -> 处理业务 -> 返回响应”。

## 3. 用 Express 搭建 Todo API

真实项目里一般不用原生 `http` 手写路由。我们用 Express 演示。

安装：

```bash
pnpm init
pnpm add express zod
pnpm add -D nodemon
```

`package.json`：

```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon src/app.mjs",
    "start": "node src/app.mjs"
  }
}
```

推荐目录：

```txt
src/
  app.mjs
  routes/
    todo.routes.mjs
  services/
    todo.service.mjs
  middlewares/
    error.middleware.mjs
    auth.middleware.mjs
  utils/
    response.mjs
```

这个结构背后的思想是分层：

- `routes`：只处理 HTTP 入参和出参。
- `services`：处理业务逻辑。
- `middlewares`：处理通用逻辑，如鉴权、错误、日志。
- `utils`：放通用工具。

## 4. 创建应用入口

```js
// src/app.mjs
import express from 'express'
import { todoRouter } from './routes/todo.routes.mjs'
import { errorMiddleware } from './middlewares/error.middleware.mjs'

const app = express()

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/todos', todoRouter)
app.use(errorMiddleware)

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`)
})
```

关键点：

- `express.json()` 解析 JSON 请求体。
- `/api/todos` 挂载 Todo 路由。
- 错误处理中间件放在最后。

## 5. 统一响应格式

统一响应格式能让前端更好处理接口。

```js
// src/utils/response.mjs
export function success(res, data, message = 'ok') {
  res.json({
    code: 0,
    message,
    data
  })
}

export function fail(res, code, message, status = 400) {
  res.status(status).json({
    code,
    message,
    data: null
  })
}
```

示例响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": []
}
```

面试中可以说：

> 我会统一接口响应结构，避免不同接口返回格式不一致。前端可以根据 code、message、data 做统一错误提示和数据解析。

## 6. 写 Todo 业务层

为了聚焦 Node.js 主线，先用内存数组模拟数据库。

```js
// src/services/todo.service.mjs
import crypto from 'node:crypto'

const todos = []

export function listTodos() {
  return todos
}

export function createTodo(input) {
  const todo = {
    id: crypto.randomUUID(),
    title: input.title,
    completed: false,
    createdAt: new Date().toISOString()
  }

  todos.unshift(todo)
  return todo
}

export function updateTodo(id, input) {
  const todo = todos.find((item) => item.id === id)
  if (!todo) return null

  if (typeof input.title === 'string') {
    todo.title = input.title
  }

  if (typeof input.completed === 'boolean') {
    todo.completed = input.completed
  }

  return todo
}

export function removeTodo(id) {
  const index = todos.findIndex((item) => item.id === id)
  if (index === -1) return false

  todos.splice(index, 1)
  return true
}
```

这里用到了 `crypto.randomUUID()` 生成 ID。真实项目里会换成数据库自增 ID、UUID 或雪花 ID。

## 7. 用 Zod 做参数校验

后端不能相信前端传来的数据。

```js
// src/routes/todo.routes.mjs
import { Router } from 'express'
import { z } from 'zod'
import { success, fail } from '../utils/response.mjs'
import {
  createTodo,
  listTodos,
  removeTodo,
  updateTodo
} from '../services/todo.service.mjs'

export const todoRouter = Router()

const createTodoSchema = z.object({
  title: z.string().min(1, 'title is required').max(100, 'title too long')
})

const updateTodoSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  completed: z.boolean().optional()
})

todoRouter.get('/', (req, res) => {
  success(res, listTodos())
})

todoRouter.post('/', (req, res) => {
  const parsed = createTodoSchema.safeParse(req.body)

  if (!parsed.success) {
    fail(res, 1001, parsed.error.issues[0].message)
    return
  }

  const todo = createTodo(parsed.data)
  success(res, todo, 'created')
})

todoRouter.patch('/:id', (req, res) => {
  const parsed = updateTodoSchema.safeParse(req.body)

  if (!parsed.success) {
    fail(res, 1002, parsed.error.issues[0].message)
    return
  }

  const todo = updateTodo(req.params.id, parsed.data)

  if (!todo) {
    fail(res, 1003, 'todo not found', 404)
    return
  }

  success(res, todo)
})

todoRouter.delete('/:id', (req, res) => {
  const removed = removeTodo(req.params.id)

  if (!removed) {
    fail(res, 1003, 'todo not found', 404)
    return
  }

  success(res, true)
})
```

测试：

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Learn Node.js\"}"
```

```bash
curl http://localhost:3000/api/todos
```

## 8. 错误处理中间件

不要在每个接口里重复 try/catch。通用错误可以交给中间件处理。

```js
// src/middlewares/error.middleware.mjs
export function errorMiddleware(err, req, res, next) {
  console.error('[request error]', {
    method: req.method,
    url: req.url,
    message: err.message,
    stack: err.stack
  })

  res.status(500).json({
    code: 500,
    message: 'Internal Server Error',
    data: null
  })
}
```

异步路由可以包一层：

```js
// src/utils/asyncHandler.mjs
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
```

使用：

```js
todoRouter.get(
  '/remote',
  asyncHandler(async (req, res) => {
    const response = await fetch('https://example.com/api')
    const data = await response.json()
    success(res, data)
  })
)
```

面试中可以说：

> 我会把预期内业务错误用明确错误码返回，把非预期异常交给统一错误中间件记录日志并返回 500，避免接口无响应或泄露堆栈。

## 9. 鉴权中间件

简单演示 token 鉴权。真实项目可以换成 JWT。

```js
// src/middlewares/auth.middleware.mjs
export function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization
  const token = authorization?.replace('Bearer ', '')

  if (!token) {
    res.status(401).json({
      code: 401,
      message: 'Unauthorized',
      data: null
    })
    return
  }

  if (token !== process.env.API_TOKEN) {
    res.status(403).json({
      code: 403,
      message: 'Forbidden',
      data: null
    })
    return
  }

  req.user = {
    id: 'u_1',
    role: 'admin'
  }

  next()
}
```

保护 Todo 路由：

```js
import { authMiddleware } from '../middlewares/auth.middleware.mjs'

todoRouter.post('/', authMiddleware, (req, res) => {
  // create todo
})
```

如果用 TypeScript 写 Node 服务，还需要给 `req.user` 扩展类型；这就是 TS 在后端工程里的价值之一。

## 10. 日志中间件

上线服务必须知道每个请求耗时。

```js
// src/middlewares/logger.middleware.mjs
export function loggerMiddleware(req, res, next) {
  const start = performance.now()

  res.on('finish', () => {
    const duration = performance.now() - start

    console.log('[access]', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration.toFixed(2)}ms`
    })
  })

  next()
}
```

接入：

```js
import { loggerMiddleware } from './middlewares/logger.middleware.mjs'

app.use(loggerMiddleware)
```

日志的作用：

- 定位慢接口。
- 排查线上错误。
- 和网关、后端日志通过 traceId 串起来。

## 11. 从内存数据换成数据库

内存数组重启就丢。真实项目要接数据库。

以 Prisma 为例，模型可以这样设计：

```prisma
model Todo {
  id        String   @id @default(uuid())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Service 层改成：

```js
// src/services/todo.service.mjs
import { prisma } from '../utils/prisma.mjs'

export function listTodos() {
  return prisma.todo.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export function createTodo(input) {
  return prisma.todo.create({
    data: {
      title: input.title
    }
  })
}
```

重点是：路由层不用大改，因为业务逻辑被封装在 service 层。

## 12. 部署前检查

上线 Node.js 服务至少检查：

- 环境变量是否齐全。
- 日志是否能查。
- 接口是否有限流。
- 错误是否统一处理。
- 数据库连接是否能复用。
- 是否有健康检查 `/health`。
- 是否有进程管理，如 PM2、Docker、平台托管。

Dockerfile 示例：

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["node", "src/app.mjs"]
```

## 13. 面试回答模板

如果面试官问“你怎么学习或使用 Node.js”，可以这样回答：

> 我会用一个完整 API 项目串起来。先用原生 http 理解请求响应模型，再用 Express 做路由和中间件。项目里我会分 routes、services、middlewares，统一响应结构和错误处理，用 Zod 做参数校验，用鉴权中间件保护接口，用日志中间件记录请求耗时。数据层先用内存模拟，再替换成 Prisma 或数据库。这样不仅能写接口，还能说明服务如何上线、如何排查问题、如何维护。

如果问“Node.js 后端项目最重要的工程点是什么”，可以答：

> 我认为是分层、错误处理、参数校验、鉴权、日志和可观测性。因为能跑的接口不难，难的是接口出错时能定位、数据不可信时能防住、上线后能维护。

## 14. 复习清单

- 能不能用原生 `http` 写一个 `/health` 接口。
- 能不能解释 Express 中间件顺序。
- 能不能写统一错误处理中间件。
- 能不能用 Zod 校验请求体。
- 能不能把 routes 和 services 分开。
- 能不能说明 401 和 403 的区别。
- 能不能说明为什么需要日志和 traceId。
- 能不能把内存数据替换成数据库。
