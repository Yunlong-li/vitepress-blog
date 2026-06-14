---
title: Next.js 使用教程：从 App Router 到服务端组件、数据获取和部署
date: 2026-06-14
description: 系统讲解 Next.js 的定位、App Router、布局和页面、服务端组件与客户端组件、数据获取、缓存、Server Actions、Route Handlers、Metadata、图片优化、认证边界和部署。
---

# Next.js 使用教程：从 App Router 到服务端组件、数据获取和部署

Next.js 是建立在 React 之上的全栈 Web 框架。它不是简单地“帮 React 加一个路由”，而是把路由、渲染、数据获取、缓存、接口、图片、字体、SEO、部署等常见能力组合成一套约定明确的工程体系。

一句话理解：

> React 负责描述 UI，Next.js 负责把 UI 放进一个可路由、可渲染、可缓存、可部署的 Web 应用里。

本文以当前主流的 App Router 为主线，做一个“文章管理后台”：用户可以查看文章列表、打开详情、提交编辑、调用接口并部署上线。

```mermaid
flowchart TD
  Start["Next.js 项目"] --> Router["App Router"]
  Router --> Layout["layout.tsx 共享布局"]
  Router --> Page["page.tsx 页面"]
  Page --> Server["Server Components"]
  Page --> Client["Client Components"]
  Server --> Data["数据获取和缓存"]
  Client --> Action["交互和表单"]
  Action --> Mutate["Server Actions / Route Handlers"]
  Data --> Deploy["构建和部署"]
```

## 1. Next.js 解决了什么问题

纯 React 项目通常需要自己组合很多东西：

- 路由：React Router。
- 构建：Vite 或 Webpack。
- SSR / SSG：自己接入服务端渲染。
- SEO：自己维护 HTML 头信息。
- 接口：单独写后端或 BFF。
- 图片优化：自己处理尺寸、格式和懒加载。
- 缓存和重新验证：自己设计策略。

Next.js 把这些能力收进框架层：

| 能力 | Next.js 提供的方式 |
| --- | --- |
| 文件路由 | `app` 目录映射 URL |
| 共享布局 | `layout.tsx` |
| 服务端渲染 | Server Components 和服务端执行 |
| 客户端交互 | `"use client"` 组件 |
| 数据获取 | 服务端组件里直接 `fetch` 或访问数据库 |
| 数据变更 | Server Actions、Route Handlers |
| SEO | `metadata`、`generateMetadata` |
| 静态和动态 | 缓存、重新验证、动态渲染 |
| 静态资源 | `public`、`next/image`、`next/font` |

要注意：Next.js 不会让复杂业务自动变简单。它真正的价值是把 Web 应用的默认架构边界定清楚。

## 2. 创建项目

使用官方脚手架：

```bash
pnpm create next-app@latest article-admin
cd article-admin
pnpm dev
```

常见选项可以这样选：

```txt
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src directory: Yes
App Router: Yes
Turbopack: Yes
Import alias: @/*
```

启动后访问：

```txt
http://localhost:3000
```

典型目录：

```txt
article-admin
  src
    app
      layout.tsx
      page.tsx
      globals.css
    components
    lib
  public
  next.config.ts
  package.json
```

## 3. App Router 的核心约定

App Router 通过 `app` 目录组织页面。每个目录段对应一段 URL。

```txt
src/app
  page.tsx                 -> /
  articles
    page.tsx               -> /articles
    [id]
      page.tsx             -> /articles/:id
  settings
    page.tsx               -> /settings
```

几个特殊文件：

| 文件 | 作用 |
| --- | --- |
| `page.tsx` | 当前路由的页面 |
| `layout.tsx` | 当前路由及子路由共享布局 |
| `loading.tsx` | 加载状态 |
| `error.tsx` | 错误边界，必须是客户端组件 |
| `not-found.tsx` | 404 页面 |
| `route.ts` | API 路由处理函数 |

一个最小页面：

```tsx
// src/app/articles/page.tsx
export default function ArticlesPage() {
  return (
    <main>
      <h1>文章列表</h1>
    </main>
  )
}
```

访问 `/articles` 时，Next.js 会渲染这个 `page.tsx`。

## 4. Layout：让公共结构稳定存在

根布局必须存在：

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Article Admin',
  description: '文章管理后台'
}

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

业务布局：

```tsx
// src/app/articles/layout.tsx
import Link from 'next/link'

export default function ArticlesLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <aside>
        <Link href="/articles">文章</Link>
        <Link href="/settings">设置</Link>
      </aside>
      <section>{children}</section>
    </div>
  )
}
```

`layout.tsx` 的特点是子路由切换时可以保持不卸载，所以适合放导航、侧边栏、用户信息、外层状态等公共结构。

## 5. Server Components 和 Client Components

App Router 默认组件是 Server Component。也就是说，下面这个组件会在服务端执行：

```tsx
// src/app/articles/page.tsx
async function getArticles() {
  const res = await fetch('https://example.com/api/articles')
  return res.json()
}

export default async function ArticlesPage() {
  const articles = await getArticles()

  return (
    <main>
      <h1>文章列表</h1>
      <ul>
        {articles.map((article: { id: string; title: string }) => (
          <li key={article.id}>{article.title}</li>
        ))}
      </ul>
    </main>
  )
}
```

Server Component 适合：

- 读数据库。
- 调用内部服务。
- 读取文件。
- 拼装首屏数据。
- 减少发送到浏览器的 JavaScript。

如果组件需要浏览器交互，就要加 `"use client"`：

```tsx
// src/components/search-box.tsx
'use client'

import { useState } from 'react'

export function SearchBox() {
  const [keyword, setKeyword] = useState('')

  return (
    <input
      value={keyword}
      onChange={(event) => setKeyword(event.target.value)}
      placeholder="搜索文章"
    />
  )
}
```

Client Component 适合：

- `useState`、`useEffect`。
- 点击、输入、拖拽等浏览器事件。
- 依赖 `window`、`localStorage`。
- 第三方交互组件。

不要为了省事把整个页面都写成客户端组件。更好的拆法是：页面主体在服务端拿数据，局部交互组件在客户端运行。

## 6. 数据获取和缓存

在服务端组件里可以直接写异步逻辑：

```tsx
type Article = {
  id: string
  title: string
  summary: string
}

async function getArticles(): Promise<Article[]> {
  const res = await fetch('https://api.example.com/articles', {
    next: { revalidate: 60 }
  })

  if (!res.ok) {
    throw new Error('Failed to fetch articles')
  }

  return res.json()
}
```

`next.revalidate: 60` 表示缓存结果最多保留 60 秒。适合文章列表、商品详情、配置项等“允许短时间不一致”的数据。

几种常见策略：

| 场景 | 推荐策略 |
| --- | --- |
| 营销页、文档页 | 静态渲染或定时重新验证 |
| 文章详情 | `revalidate` 或按标签重新验证 |
| 用户后台 | 动态渲染，不共享缓存 |
| 实时价格、库存 | 动态读取或短缓存 |
| 登录用户信息 | 不放公共缓存 |

动态读取可以这样写：

```tsx
await fetch('https://api.example.com/me', {
  cache: 'no-store'
})
```

缓存不是越多越好。缓存的前提是你能清楚回答：这份数据能不能被其他用户看到、多久后过期、变更后如何失效。

## 7. 动态路由和详情页

目录：

```txt
src/app/articles/[id]/page.tsx
```

页面：

```tsx
// src/app/articles/[id]/page.tsx
import { notFound } from 'next/navigation'

async function getArticle(id: string) {
  const res = await fetch(`https://api.example.com/articles/${id}`)

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error('Failed to fetch article')
  }

  return res.json()
}

export default async function ArticleDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const article = await getArticle(id)

  if (!article) {
    notFound()
  }

  return (
    <article>
      <h1>{article.title}</h1>
      <p>{article.content}</p>
    </article>
  )
}
```

动态路由目录名用方括号。`notFound()` 会进入最近的 `not-found.tsx`。

## 8. Link 和路由跳转

页面之间跳转使用 `next/link`：

```tsx
import Link from 'next/link'

export function ArticleLink({ id, title }: { id: string; title: string }) {
  return <Link href={`/articles/${id}`}>{title}</Link>
}
```

客户端事件里跳转使用 `useRouter`：

```tsx
'use client'

import { useRouter } from 'next/navigation'

export function CreateButton() {
  const router = useRouter()

  return (
    <button onClick={() => router.push('/articles/new')}>
      新建文章
    </button>
  )
}
```

`Link` 更适合声明式导航，`router.push` 更适合表单提交成功、权限判断后的命令式跳转。

## 9. Server Actions：表单直接调用服务端逻辑

Server Actions 可以把表单提交交给服务端函数处理。

```tsx
// src/app/articles/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createArticle(formData: FormData) {
  const title = String(formData.get('title') || '')
  const content = String(formData.get('content') || '')

  if (!title.trim()) {
    throw new Error('标题不能为空')
  }

  await fetch('https://api.example.com/articles', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
    headers: {
      'Content-Type': 'application/json'
    }
  })

  revalidatePath('/articles')
  redirect('/articles')
}
```

表单使用：

```tsx
// src/app/articles/new/page.tsx
import { createArticle } from '../actions'

export default function NewArticlePage() {
  return (
    <form action={createArticle}>
      <input name="title" placeholder="标题" />
      <textarea name="content" placeholder="正文" />
      <button type="submit">保存</button>
    </form>
  )
}
```

Server Actions 的边界要清楚：

- 校验必须在服务端再做一遍。
- 不要信任浏览器传来的用户 ID、价格、权限字段。
- 需要结合登录态判断当前用户能否操作资源。
- 数据变更后要考虑 `revalidatePath` 或 `revalidateTag`。

## 10. Route Handlers：在 Next.js 里写 API

如果你需要给前端、Webhook 或第三方系统暴露 HTTP 接口，可以写 `route.ts`。

目录：

```txt
src/app/api/articles/route.ts
```

代码：

```ts
// src/app/api/articles/route.ts
import { NextResponse } from 'next/server'

const articles = [
  { id: '1', title: 'Next.js 入门' },
  { id: '2', title: '缓存策略设计' }
]

export async function GET() {
  return NextResponse.json({ data: articles })
}

export async function POST(request: Request) {
  const body = await request.json()

  return NextResponse.json(
    {
      data: {
        id: crypto.randomUUID(),
        title: body.title
      }
    },
    { status: 201 }
  )
}
```

Route Handlers 适合：

- BFF 接口。
- Webhook。
- 文件上传签名。
- 聚合多个后端服务。
- 隐藏服务端密钥。

如果业务后端已经很重，Next.js 不一定要承载全部 API。它更适合做贴近前端体验的 BFF 层。

## 11. Metadata 和 SEO

静态 metadata：

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '文章列表',
  description: '查看和管理文章'
}
```

动态详情页：

```tsx
import type { Metadata } from 'next'

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const article = await getArticle(id)

  return {
    title: article ? article.title : '文章不存在',
    description: article?.summary
  }
}
```

SEO 不只是标题和描述，还包括：

- URL 是否稳定。
- 页面是否能被服务端渲染出关键内容。
- Open Graph 图片是否正确。
- canonical 是否清晰。
- 结构化数据是否准确。

## 12. 图片和字体优化

图片使用 `next/image`：

```tsx
import Image from 'next/image'

export function CoverImage() {
  return (
    <Image
      src="/article-cover.png"
      alt="文章封面"
      width={1200}
      height={630}
      priority
    />
  )
}
```

远程图片需要在 `next.config.ts` 里配置允许的来源：

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com'
      }
    ]
  }
}

export default nextConfig
```

字体使用 `next/font` 可以减少布局偏移：

```tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap'
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

## 13. 环境变量

服务端环境变量：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/app
JWT_SECRET=secret
```

浏览器可见环境变量必须以 `NEXT_PUBLIC_` 开头：

```env
NEXT_PUBLIC_SITE_URL=https://example.com
```

原则：

- 数据库连接串、服务端密钥、支付密钥不能加 `NEXT_PUBLIC_`。
- 浏览器可见变量只能放公开信息。
- 本地用 `.env.local`，不要提交真实密钥。

## 14. 错误、加载和空状态

加载状态：

```tsx
// src/app/articles/loading.tsx
export default function Loading() {
  return <p>文章加载中...</p>
}
```

错误边界：

```tsx
// src/app/articles/error.tsx
'use client'

export default function Error({
  error,
  reset
}: {
  error: Error
  reset: () => void
}) {
  return (
    <section>
      <h2>加载失败</h2>
      <p>{error.message}</p>
      <button onClick={reset}>重试</button>
    </section>
  )
}
```

404：

```tsx
// src/app/articles/[id]/not-found.tsx
export default function ArticleNotFound() {
  return <p>文章不存在或已被删除。</p>
}
```

这些文件不是装饰，它们决定了真实网络环境下页面是否可用。

## 15. 权限边界

Next.js 项目里常见的权限检查位置：

```mermaid
flowchart LR
  Middleware["Middleware / Proxy"] --> Page["页面访问控制"]
  Page --> Server["Server Component 读取用户"]
  Server --> Action["Server Action 校验权限"]
  Action --> DB["数据库约束和审计"]
```

几条基本规则：

- 页面能不能看，在服务端判断。
- 按钮能不能点，只是体验优化，不能当权限。
- Server Action 和 Route Handler 必须重新校验登录态。
- 关键数据还要靠数据库约束兜底。

示例：

```ts
export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}
```

在服务端逻辑里调用：

```ts
export async function deleteArticle(id: string) {
  const user = await requireUser()
  await assertCanDeleteArticle(user.id, id)
  await db.article.delete({ where: { id } })
}
```

## 16. 部署和构建

构建：

```bash
pnpm build
pnpm start
```

部署前检查：

- 所有环境变量是否配置。
- 图片远程域名是否允许。
- API 请求地址是否区分本地和生产。
- 动态路由是否有 404 处理。
- 数据库连接池是否适合 serverless。
- 日志和错误监控是否接入。

Next.js 可以部署到 Vercel，也可以自托管到 Node.js 服务、Docker 或其他支持 Node 的平台。关键不是平台名称，而是要理解你的页面是静态、动态、边缘运行还是 Node.js 运行。

## 17. 常见坑

### 17.1 过度使用客户端组件

如果在顶层加 `"use client"`，整棵子树都会进入客户端边界。结果是首屏 JavaScript 变大，服务端组件优势消失。

更好的方式是：

```tsx
export default async function Page() {
  const data = await getData()

  return (
    <>
      <ServerRenderedList data={data} />
      <ClientFilter />
    </>
  )
}
```

### 17.2 缓存导致数据看起来不更新

如果接口默认缓存，而你做了数据变更，就可能看到旧数据。处理方式：

```ts
import { revalidatePath } from 'next/cache'

revalidatePath('/articles')
```

或者为 `fetch` 配置：

```ts
await fetch(url, { cache: 'no-store' })
```

### 17.3 在浏览器暴露服务端密钥

凡是带 `NEXT_PUBLIC_` 的变量都会进入浏览器包。不要把数据库、支付、对象存储密钥放进去。

### 17.4 用 Route Handler 代替所有后端

Next.js 可以写 API，但不等于所有业务后端都应该塞进 Next.js。支付、订单、复杂异步任务、报表计算等重逻辑，很多时候独立后端更清晰。

## 18. 面试表达

可以这样描述 Next.js：

> Next.js 是 React 的全栈框架。App Router 用文件系统组织路由，通过 Server Components 默认把数据读取和首屏渲染放到服务端，需要交互时再用 Client Components。它还提供缓存、重新验证、Server Actions、Route Handlers、Metadata、图片和字体优化等能力。实际项目里要重点控制服务端和客户端边界、缓存策略、权限校验和部署运行时。

## 19. 总结

Next.js 的学习主线不是“记住所有 API”，而是理解几个边界：

- 路由边界：`app` 目录如何映射 URL。
- 渲染边界：服务端组件和客户端组件怎么拆。
- 数据边界：哪些数据可以缓存，哪些必须动态读取。
- 变更边界：Server Actions 和 Route Handlers 处理什么。
- 安全边界：权限和密钥不能只靠前端。
- 部署边界：静态、动态、Node、Edge 的运行方式不同。

掌握这些边界后，再看具体 API 就会顺很多。
