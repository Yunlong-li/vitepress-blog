---
title: Prisma 使用教程：从 Schema、迁移到类型安全查询和事务
date: 2026-06-14
description: 系统讲解 Prisma ORM 的定位、Schema、Prisma Client、数据库迁移、关系建模、CRUD、分页、事务、原始 SQL、错误处理、连接管理、测试和生产实践。
---

# Prisma 使用教程：从 Schema、迁移到类型安全查询和事务

Prisma 是 TypeScript / JavaScript 生态里常用的 ORM。它的核心价值不是“少写 SQL”，而是用 `schema.prisma` 描述数据模型，再生成类型安全的 Prisma Client，让数据库访问和 TypeScript 类型系统连起来。

一句话理解：

> Prisma 用 Schema 作为数据库模型和应用类型的单一来源，再生成类型安全的查询客户端。

本文用一个“团队任务系统”来讲：用户加入团队，团队里有项目和任务，任务可以指派给成员。我们会从建模、迁移、查询、事务一直讲到生产注意事项。

```mermaid
flowchart TD
  Schema["schema.prisma"] --> Migrate["Prisma Migrate"]
  Schema --> Client["Prisma Client"]
  Migrate --> DB["Database"]
  Client --> Query["类型安全查询"]
  Query --> Service["业务服务"]
  Service --> Tx["事务"]
  Service --> Raw["必要时 raw SQL"]
```

## 1. Prisma 解决了什么问题

直接写 SQL 的优点是控制力强，但在 TypeScript 项目里常见问题是：

- SQL 字段改名后，业务代码不一定报错。
- 查询结果类型需要手写。
- 关系查询容易散落在各处。
- 迁移脚本和应用模型容易不同步。
- 新成员需要同时理解数据库结构和代码约定。

Prisma 的方式：

```prisma
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String
}
```

生成客户端后：

```ts
const user = await prisma.user.findUnique({
  where: { email: 'a@example.com' }
})
```

`email` 是否存在、返回值可能为 `null`、可选字段是什么，TypeScript 都能参与检查。

## 2. 安装和初始化

安装：

```bash
pnpm add prisma @prisma/client
pnpm prisma init
```

常见目录：

```txt
prisma
  schema.prisma
  migrations
src
  lib
    prisma.ts
.env
```

`.env`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/task_app"
```

`schema.prisma` 的基本结构：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

新版本 Prisma 也支持把连接和迁移路径放到 `prisma.config.ts` 里。项目里选一种方式即可，不要混着写到难以判断来源。

## 3. 定义数据模型

团队任务系统需要这些模型：

- `User`：用户。
- `Team`：团队。
- `TeamMember`：团队成员关系。
- `Project`：项目。
- `Task`：任务。

```prisma
model User {
  id        String       @id @default(cuid())
  email     String       @unique
  name      String
  createdAt DateTime     @default(now())
  members   TeamMember[]
  tasks     Task[]       @relation("TaskAssignee")
}

model Team {
  id        String       @id @default(cuid())
  name      String
  createdAt DateTime     @default(now())
  members   TeamMember[]
  projects  Project[]
}

model TeamMember {
  teamId   String
  userId   String
  role     TeamRole @default(MEMBER)
  joinedAt DateTime @default(now())

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
  @@index([userId])
}

model Project {
  id        String   @id @default(cuid())
  teamId    String
  name      String
  createdAt DateTime @default(now())
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  tasks     Task[]

  @@index([teamId])
}

model Task {
  id          String     @id @default(cuid())
  projectId   String
  title       String
  description String?
  status      TaskStatus @default(TODO)
  assigneeId  String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User?   @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  @@index([projectId, status])
  @@index([assigneeId])
}

enum TeamRole {
  OWNER
  MEMBER
}

enum TaskStatus {
  TODO
  DOING
  DONE
}
```

几个重点：

- `@id` 表示主键。
- `@unique` 表示唯一约束。
- `@default(now())` 表示默认时间。
- `@updatedAt` 自动维护更新时间。
- `@relation` 描述关系字段和外键。
- `@@id([teamId, userId])` 表示联合主键。
- `@@index` 表示索引。

## 4. 迁移数据库

创建迁移：

```bash
pnpm prisma migrate dev --name init
```

这会做几件事：

- 根据 `schema.prisma` 生成 SQL 迁移文件。
- 把迁移应用到开发数据库。
- 重新生成 Prisma Client。

生产环境通常使用：

```bash
pnpm prisma migrate deploy
```

不要在生产环境随手执行 `migrate dev`。开发环境可以交互式修正，生产环境需要只应用已经提交过的迁移文件。

常见流程：

```mermaid
sequenceDiagram
  participant Dev as 开发者
  participant Schema as schema.prisma
  participant Migrate as Prisma Migrate
  participant DB as 数据库

  Dev->>Schema: 修改模型
  Dev->>Migrate: migrate dev --name add_task_status
  Migrate->>DB: 应用迁移
  Migrate->>Dev: 生成 Prisma Client
  Dev->>Git: 提交 schema 和 migrations
```

## 5. 创建 Prisma Client 单例

Node.js 长连接服务：

```ts
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

Next.js 开发环境热更新时，可能反复创建客户端。可以用全局缓存：

```ts
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn']
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

原则：

- 不要在每个请求里 `new PrismaClient()`。
- serverless 环境要关注连接池。
- 日志级别生产环境要克制，避免泄露敏感数据。

## 6. 基础 CRUD

创建用户：

```ts
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice'
  }
})
```

查询用户：

```ts
const user = await prisma.user.findUnique({
  where: {
    email: 'alice@example.com'
  }
})
```

更新：

```ts
await prisma.user.update({
  where: { id: userId },
  data: { name: 'Alice Chen' }
})
```

删除：

```ts
await prisma.user.delete({
  where: { id: userId }
})
```

列表查询：

```ts
const users = await prisma.user.findMany({
  where: {
    email: {
      contains: '@example.com'
    }
  },
  orderBy: {
    createdAt: 'desc'
  },
  take: 20
})
```

## 7. 关系查询

查询团队和成员：

```ts
const team = await prisma.team.findUnique({
  where: { id: teamId },
  include: {
    members: {
      include: {
        user: true
      }
    }
  }
})
```

只选择需要字段：

```ts
const tasks = await prisma.task.findMany({
  where: {
    projectId
  },
  select: {
    id: true,
    title: true,
    status: true,
    assignee: {
      select: {
        id: true,
        name: true
      }
    }
  }
})
```

`include` 会带上关系对象，`select` 精确控制返回字段。业务接口里推荐尽量用 `select`，避免把不需要的数据传出去。

## 8. 嵌套写入

创建团队时同时创建成员：

```ts
const team = await prisma.team.create({
  data: {
    name: '增长团队',
    members: {
      create: {
        userId: ownerId,
        role: 'OWNER'
      }
    }
  },
  include: {
    members: true
  }
})
```

创建项目和初始任务：

```ts
const project = await prisma.project.create({
  data: {
    teamId,
    name: '官网改版',
    tasks: {
      create: [
        { title: '梳理页面结构' },
        { title: '设计首屏布局' }
      ]
    }
  }
})
```

嵌套写入适合小范围聚合创建。如果流程里有复杂校验、外部调用、状态机，建议拆到服务层并显式使用事务。

## 9. 分页

偏移分页：

```ts
const page = 2
const pageSize = 20

const tasks = await prisma.task.findMany({
  where: { projectId },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * pageSize,
  take: pageSize
})
```

优点是简单，缺点是深分页性能可能变差。

游标分页：

```ts
const tasks = await prisma.task.findMany({
  where: { projectId },
  orderBy: { createdAt: 'desc' },
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,
  take: 20
})
```

游标分页适合无限滚动、消息流、任务流等场景。

## 10. 事务

数组事务：

```ts
await prisma.$transaction([
  prisma.task.update({
    where: { id: taskId },
    data: { status: 'DONE' }
  }),
  prisma.project.update({
    where: { id: projectId },
    data: { updatedAt: new Date() }
  })
])
```

交互式事务：

```ts
await prisma.$transaction(async (tx) => {
  const member = await tx.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId
      }
    }
  })

  if (!member) {
    throw new Error('不是团队成员')
  }

  await tx.task.create({
    data: {
      projectId,
      title,
      assigneeId: userId
    }
  })
})
```

事务里要避免：

- 长时间调用外部 HTTP 服务。
- 等待用户输入。
- 做大量 CPU 计算。
- 包住不必要的查询。

事务应该尽量短，只覆盖必须原子提交的数据库操作。

## 11. 唯一约束和错误处理

如果邮箱重复，数据库会拒绝写入。Prisma 会抛出错误。

```ts
import { Prisma } from '@prisma/client'

export async function createUser(input: { email: string; name: string }) {
  try {
    return await prisma.user.create({
      data: input
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new Error('邮箱已被使用')
    }

    throw error
  }
}
```

不要只在前端检查唯一性。前端检查只能改善体验，真正防重复必须靠数据库唯一约束。

## 12. 原始 SQL

Prisma 不是所有 SQL 场景的最佳表达方式。复杂报表、窗口函数、数据库特有能力，可以使用 raw SQL。

```ts
const rows = await prisma.$queryRaw<
  { status: string; count: bigint }[]
>`select status, count(*) as count
  from "Task"
  where "projectId" = ${projectId}
  group by status`
```

注意：

- 使用模板参数，不要手动拼接用户输入。
- raw SQL 返回类型需要自己声明。
- 复杂 SQL 最好写测试覆盖。

不要因为用了 ORM 就完全排斥 SQL。成熟项目里，ORM 和 SQL 经常并存。

## 13. Repository 和 Service 分层

小项目可以直接在路由里调用 Prisma。项目变大后建议分层。

```txt
src
  modules
    tasks
      task.repository.ts
      task.service.ts
      task.schema.ts
      task.router.ts
```

Repository 只处理数据访问：

```ts
export function findProjectTasks(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  })
}
```

Service 处理业务规则：

```ts
export async function createTask(input: {
  projectId: string
  title: string
  userId: string
}) {
  await assertProjectMember(input.projectId, input.userId)

  return prisma.task.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      assigneeId: input.userId
    }
  })
}
```

这样做的目的不是套模板，而是让“查询细节”和“业务规则”不要混在一起。

## 14. 和 Zod 配合校验

Prisma 保证数据库模型类型，不负责校验用户输入。

```ts
import { z } from 'zod'

const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(100),
  assigneeId: z.string().optional()
})

export async function createTaskAction(rawInput: unknown) {
  const input = createTaskSchema.parse(rawInput)

  return prisma.task.create({
    data: input
  })
}
```

边界规则：

- 请求参数用 Zod 或类似工具校验。
- 业务权限在 Service 校验。
- 数据完整性靠数据库约束兜底。
- Prisma 类型不能替代运行时校验。

## 15. 性能和索引

Prisma 写起来很顺，但底层仍然是数据库查询。要关注：

- `where` 条件是否有索引。
- `orderBy` 是否能利用索引。
- `include` 是否拉了过多关系。
- 列表是否限制 `take`。
- 是否出现 N+1 查询。
- 慢查询是否能用 `EXPLAIN` 分析。

例如任务列表常用：

```prisma
@@index([projectId, status])
@@index([assigneeId])
```

查询：

```ts
await prisma.task.findMany({
  where: {
    projectId,
    status: 'DOING'
  },
  orderBy: {
    updatedAt: 'desc'
  },
  take: 50
})
```

如果还经常按 `updatedAt` 排序，可以考虑组合索引：

```prisma
@@index([projectId, status, updatedAt])
```

索引不是越多越好。索引会加速查询，也会增加写入成本和存储成本。

## 16. 测试策略

数据访问代码建议至少覆盖：

- 创建成功。
- 唯一约束冲突。
- 权限失败。
- 事务回滚。
- 分页顺序。
- 关系查询字段。

测试可以使用独立测试数据库：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/task_app_test"
```

每次测试前清理数据：

```ts
beforeEach(async () => {
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.user.deleteMany()
})
```

清理顺序要符合外键依赖。或者使用事务回滚、schema 隔离、测试容器等更完整方案。

## 17. 生产实践

生产环境注意事项：

- 迁移文件必须提交到 Git。
- 发布时使用 `prisma migrate deploy`。
- 不要在生产运行会重置数据的命令。
- serverless 场景关注连接池或连接代理。
- 日志不要暴露完整 SQL 参数里的敏感信息。
- 关键写操作依赖数据库约束和事务。
- 慢查询要回到数据库执行计划分析。

典型发布流程：

```txt
代码合并
  -> CI 安装依赖
  -> prisma generate
  -> 单元测试
  -> 构建应用
  -> prisma migrate deploy
  -> 启动服务
```

如果数据库迁移有破坏性变更，比如删除列、改类型、拆表，要采用兼容发布：

1. 先加新字段或新表。
2. 双写或回填数据。
3. 应用切到新字段。
4. 确认稳定后再删除旧字段。

## 18. 常见坑

### 18.1 把 Prisma 类型当成输入校验

TypeScript 类型只在编译期有效。HTTP 请求进来仍然需要运行时校验。

### 18.2 随意 `include: true`

关系一多，返回数据会变大，查询也会变重。接口层尽量用 `select` 控制字段。

### 18.3 每次请求创建 PrismaClient

这会制造大量数据库连接。应复用客户端，并根据部署形态设计连接池。

### 18.4 生产环境执行危险命令

`db push`、`migrate reset` 这类命令不适合生产环境随手执行。生产迁移应该基于迁移文件。

### 18.5 完全不看 SQL

Prisma 让查询更类型安全，但数据库性能问题仍然要靠 SQL、索引和执行计划解决。

## 19. 面试表达

可以这样描述 Prisma：

> Prisma 是 TypeScript 生态的 ORM。它通过 `schema.prisma` 声明数据模型、关系和约束，再生成类型安全的 Prisma Client。开发时用 Prisma Migrate 管理数据库变更，用 Client 做 CRUD、关系查询、分页和事务。实际项目里要注意运行时输入校验、数据库约束、连接池、迁移发布流程和复杂查询的 SQL 分析。

## 20. 总结

Prisma 的学习主线：

- 用 Schema 描述模型、关系和约束。
- 用 Migrate 管理数据库结构变化。
- 用 Prisma Client 获得类型安全查询。
- 用事务保证关键业务原子性。
- 必要时用 raw SQL 处理复杂查询。
- 生产环境关注连接、迁移、日志和性能。

Prisma 不是 SQL 的替代品，而是 TypeScript 应用和数据库之间的一层类型安全工作流。理解这一点，才能既享受开发效率，也不丢掉数据库基本功。
