---
title: PostgreSQL 使用教程：从 SQL 基础到索引、事务、JSONB 和性能分析
date: 2026-05-23
description: 系统讲解 PostgreSQL 的来源、解决的问题、表设计、SQL 查询、约束、索引、事务、锁、JSONB、全文搜索、Node.js 访问、连接池、备份和执行计划。
---

# PostgreSQL 使用教程：从 SQL 基础到索引、事务、JSONB 和性能分析

PostgreSQL 是一个开源关系型数据库。它的核心价值不是“能存数据”这么简单，而是提供了一套成熟的数据管理能力：关系模型、SQL 查询、事务、约束、索引、并发控制、复杂类型、JSONB、全文搜索、扩展机制和稳定的持久化。

如果 Redis 更像高速工作台，消息队列更像异步传送带，那么 PostgreSQL 就是系统的事实账本。它适合存放需要长期保存、可查询、可约束、可事务处理的数据。

```mermaid
flowchart LR
  App["应用服务"] --> Pool["连接池"]
  Pool --> PG["PostgreSQL"]
  PG --> Tables["表和约束"]
  PG --> Indexes["索引"]
  PG --> Tx["事务"]
  PG --> Jsonb["JSONB"]
```

本文用一个“文章发布系统”来讲：用户可以写文章、打标签、发布、评论、搜索。我们会从表结构开始，逐步讲到查询、事务、索引和性能分析。

## 1. PostgreSQL 解决了什么问题

业务系统需要的不只是保存一段 JSON，而是可靠地回答这些问题：

- 用户名不能重复，怎么保证？
- 创建订单时扣库存和写订单要么都成功，要么都失败，怎么保证？
- 查询某用户最近 20 篇文章，怎么加速？
- 多个请求同时更新同一行，怎么避免数据错乱？
- 文章有结构化字段，也有可变配置，怎么兼容？
- 出问题后怎么备份、恢复、审计和排查？

PostgreSQL 用几类能力解决这些问题：

| 能力 | 解决的问题 |
| --- | --- |
| 表、列、类型 | 让数据结构明确 |
| 约束 | 保证数据合法 |
| SQL | 描述查询和变更 |
| 事务 | 保证一组操作的原子性 |
| MVCC | 支持并发读写 |
| 索引 | 加速查询 |
| 扩展类型 | 支持 JSONB、数组、全文搜索、地理信息等 |

## 2. 本地启动和连接

用 Docker 启动：

```bash
docker run --name pg-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=blog \
  -p 5432:5432 \
  -d postgres:16
```

连接：

```bash
psql postgresql://postgres:postgres@localhost:5432/blog
```

常用 psql 命令：

```sql
\l        -- 列出数据库
\dt       -- 列出表
\d users  -- 查看表结构
\x        -- 切换扩展显示
\q        -- 退出
```

## 3. 表设计：先让数据有形状

创建用户、文章、标签、评论：

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table post_tags (
  post_id uuid not null references posts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
```

几个设计点：

- 主键用 `uuid`，方便分布式创建和外部暴露。
- 邮箱、slug 用 `unique` 保证唯一。
- `status` 用 `check` 限制合法值。
- 外键用 `references` 保证关联存在。
- `on delete cascade` 表示删除用户时删除其文章，删除文章时删除评论和标签关联。
- `metadata jsonb` 存可变扩展字段，但核心查询字段仍应拆成普通列。

## 4. 基础 CRUD

插入用户：

```sql
insert into users (email, name)
values ('alice@example.com', 'Alice')
returning id, email, name;
```

插入文章：

```sql
insert into posts (author_id, title, slug, content, status, published_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'PostgreSQL 入门',
  'postgresql-guide',
  '正文内容',
  'published',
  now()
)
returning *;
```

查询列表：

```sql
select id, title, slug, published_at
from posts
where status = 'published'
order by published_at desc
limit 20;
```

更新：

```sql
update posts
set title = 'PostgreSQL 使用教程',
    updated_at = now()
where slug = 'postgresql-guide'
returning id, title, updated_at;
```

删除：

```sql
delete from posts
where id = '00000000-0000-0000-0000-000000000001';
```

## 5. JOIN：关系数据库的核心能力

查询文章及作者：

```sql
select
  p.id,
  p.title,
  p.slug,
  u.name as author_name
from posts p
join users u on u.id = p.author_id
where p.status = 'published'
order by p.published_at desc
limit 20;
```

查询文章标签：

```sql
select
  p.title,
  array_agg(t.name order by t.name) as tags
from posts p
join post_tags pt on pt.post_id = p.id
join tags t on t.id = pt.tag_id
where p.id = '00000000-0000-0000-0000-000000000001'
group by p.id, p.title;
```

查询评论数量：

```sql
select
  p.id,
  p.title,
  count(c.id) as comment_count
from posts p
left join comments c on c.post_id = p.id
where p.status = 'published'
group by p.id, p.title
order by p.published_at desc;
```

`left join` 会保留没有评论的文章，`count(c.id)` 对没有评论的文章返回 0。

## 6. 约束：把业务规则放进数据库

应用层校验很重要，但数据库约束是最后防线。

邮箱唯一：

```sql
alter table users add constraint users_email_unique unique (email);
```

状态合法：

```sql
alter table posts add constraint posts_status_check
check (status in ('draft', 'published', 'archived'));
```

发布时间规则：

```sql
alter table posts add constraint posts_published_at_check
check (
  (status = 'published' and published_at is not null)
  or
  (status <> 'published')
);
```

如果业务规则非常关键，不要只写在前端表单里。数据库约束可以避免脚本、后台任务、并发请求绕过应用校验。

## 7. 索引：为什么查询会变快

没有索引时，数据库可能需要扫描整张表。索引类似一本书的目录，可以快速定位满足条件的行。

常见索引：

```sql
create index posts_author_id_idx on posts (author_id);
create index posts_status_published_at_idx on posts (status, published_at desc);
create index comments_post_id_created_at_idx on comments (post_id, created_at desc);
```

复合索引顺序很重要。比如：

```sql
create index posts_status_published_at_idx on posts (status, published_at desc);
```

适合：

```sql
select *
from posts
where status = 'published'
order by published_at desc
limit 20;
```

因为查询先按 `status` 过滤，再按 `published_at` 排序。

### 部分索引

如果大多数文章都是草稿，但用户只查已发布文章：

```sql
create index posts_published_idx
on posts (published_at desc)
where status = 'published';
```

部分索引更小，维护成本更低，但只对满足条件的查询有效。

### 唯一索引

`unique` 约束背后会创建唯一索引：

```sql
create unique index users_lower_email_idx on users (lower(email));
```

这样可以避免 `Alice@example.com` 和 `alice@example.com` 被当成两个邮箱。

## 8. EXPLAIN：看懂执行计划

查询慢时不要猜，先看执行计划：

```sql
explain analyze
select id, title, published_at
from posts
where status = 'published'
order by published_at desc
limit 20;
```

你会看到数据库实际用了什么方式：

- `Seq Scan`：顺序扫描整表。
- `Index Scan`：通过索引扫描。
- `Bitmap Index Scan`：先用索引找候选，再回表。
- `Sort`：需要额外排序。
- `Nested Loop` / `Hash Join` / `Merge Join`：不同 join 策略。

如果发现大表上频繁 `Seq Scan`，通常要检查：

- WHERE 条件字段是否有索引。
- 索引列顺序是否匹配查询。
- 是否对列做了函数计算导致索引用不上。
- 返回行数是否太多，索引反而不划算。

## 9. 事务：一组操作要么都成功，要么都失败

发布文章时要做几件事：

1. 更新文章状态。
2. 写入标签。
3. 记录发布日志。

这些必须在一个事务里：

```sql
begin;

update posts
set status = 'published',
    published_at = now(),
    updated_at = now()
where id = '00000000-0000-0000-0000-000000000001';

insert into post_publish_logs (post_id, published_at)
values ('00000000-0000-0000-0000-000000000001', now());

commit;
```

如果中途失败：

```sql
rollback;
```

在 Node.js 中使用事务：

```js
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

export async function publishPost(postId) {
  const client = await pool.connect()

  try {
    await client.query('begin')

    const result = await client.query(
      `
      update posts
      set status = 'published',
          published_at = now(),
          updated_at = now()
      where id = $1 and status = 'draft'
      returning id, title
      `,
      [postId]
    )

    if (result.rowCount === 0) {
      throw new Error('post not found or already published')
    }

    await client.query(
      `
      insert into post_publish_logs (post_id, published_at)
      values ($1, now())
      `,
      [postId]
    )

    await client.query('commit')
    return result.rows[0]
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
```

不要在事务里做慢网络调用，例如发邮件、调用第三方 API。事务持有时间越长，锁冲突和连接占用越严重。

## 10. 并发和锁

两个请求同时给文章点赞，错误写法：

```js
const post = await db.query('select like_count from posts where id = $1', [postId])
const next = post.rows[0].like_count + 1
await db.query('update posts set like_count = $1 where id = $2', [next, postId])
```

并发下可能丢更新。正确写法是让数据库原子更新：

```sql
update posts
set like_count = like_count + 1
where id = $1
returning like_count;
```

如果必须先读再基于当前值做复杂判断，可以加行锁：

```sql
begin;

select *
from posts
where id = $1
for update;

update posts
set status = 'archived'
where id = $1;

commit;
```

`for update` 会锁住选中的行，其他事务如果也想修改这行，需要等待。

## 11. JSONB：结构化和灵活性的折中

JSONB 适合存可变扩展字段，例如文章 SEO 配置：

```sql
update posts
set metadata = jsonb_build_object(
  'seoTitle', 'PostgreSQL 使用教程',
  'keywords', jsonb_build_array('postgresql', 'sql', 'database'),
  'readingMinutes', 12
)
where slug = 'postgresql-guide';
```

查询 JSONB 字段：

```sql
select title, metadata ->> 'seoTitle' as seo_title
from posts
where metadata ->> 'seoTitle' is not null;
```

查询数组中包含关键词：

```sql
select title
from posts
where metadata -> 'keywords' ? 'postgresql';
```

给 JSONB 建 GIN 索引：

```sql
create index posts_metadata_gin_idx on posts using gin (metadata);
```

使用建议：

- 经常过滤、排序、关联的字段应该是普通列。
- 不稳定、可选、展示型配置可以放 JSONB。
- JSONB 很强，但不要把关系模型全部塞成一个大 JSON。

## 12. 全文搜索

PostgreSQL 内置全文搜索能力。创建生成列：

```sql
alter table posts
add column search_vector tsvector
generated always as (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
) stored;

create index posts_search_vector_idx
on posts using gin (search_vector);
```

搜索：

```sql
select id, title
from posts
where search_vector @@ plainto_tsquery('simple', 'postgresql index')
order by ts_rank(search_vector, plainto_tsquery('simple', 'postgresql index')) desc;
```

如果只是站内简单搜索，PostgreSQL 全文搜索足够用。如果需要复杂中文分词、相关性调优、搜索建议和聚合，可以再考虑专业搜索引擎。

## 13. 分页：避免深度 offset

普通分页：

```sql
select id, title, published_at
from posts
where status = 'published'
order by published_at desc
limit 20 offset 10000;
```

`offset` 很大时，数据库仍然要跳过前面很多行。更适合信息流的是游标分页：

```sql
select id, title, published_at
from posts
where status = 'published'
  and published_at < $1
order by published_at desc
limit 20;
```

第一次请求不传游标，下一页用上一页最后一条的 `published_at`。如果时间可能重复，可以用二元游标：

```sql
where (published_at, id) < ($1, $2)
order by published_at desc, id desc
```

对应索引：

```sql
create index posts_feed_idx
on posts (status, published_at desc, id desc);
```

## 14. Node.js 访问 PostgreSQL

安装：

```bash
pnpm add pg
```

连接池：

```js
// db.mjs
import pg from 'pg'

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
})
```

参数化查询：

```js
export async function findPostBySlug(slug) {
  const result = await pool.query(
    `
    select p.id, p.title, p.content, p.published_at, u.name as author_name
    from posts p
    join users u on u.id = p.author_id
    where p.slug = $1 and p.status = 'published'
    `,
    [slug]
  )

  return result.rows[0] ?? null
}
```

不要拼接用户输入：

```js
// 错误：容易 SQL 注入
await pool.query(`select * from posts where slug = '${slug}'`)
```

应该始终用参数：

```js
await pool.query('select * from posts where slug = $1', [slug])
```

## 15. 连接池为什么重要

PostgreSQL 每个连接都有成本。Web 服务如果每个请求都新建连接，会导致：

- 握手开销高。
- 数据库连接数被打满。
- 突发流量下排队严重。

连接池复用连接：

```txt
请求 1 -> pool -> connection A
请求 2 -> pool -> connection B
请求 3 -> 等待可用连接
```

池大小不是越大越好。常见做法：

- 单个应用实例设置适中的 `max`，例如 10 到 20。
- 多实例部署时计算总连接数。
- Serverless 场景考虑连接池代理。
- 慢查询要优化，不要靠无限加连接硬扛。

## 16. 迁移：让数据库结构可版本管理

不要只在数据库控制台手工改表。推荐每次结构变化都有迁移文件：

```txt
migrations/
  001_create_users.sql
  002_create_posts.sql
  003_add_post_search_vector.sql
```

迁移文件应该：

- 可重复在新环境执行。
- 进入 Git 管理。
- 和应用代码一起评审。
- 在发布前先跑测试环境。

字段变更要小心，例如给大表新增 `not null` 字段，应该分阶段：

1. 新增可空字段。
2. 后台回填数据。
3. 添加默认值。
4. 再加 `not null` 约束。

## 17. 备份和恢复

逻辑备份：

```bash
pg_dump postgresql://user:pass@localhost:5432/blog > blog.sql
```

恢复：

```bash
psql postgresql://user:pass@localhost:5432/blog < blog.sql
```

只备份某张表：

```bash
pg_dump -t posts postgresql://user:pass@localhost:5432/blog > posts.sql
```

生产环境要有：

- 定期自动备份。
- 异地备份。
- 恢复演练。
- 重要操作前的临时备份。

没有验证过恢复流程的备份，只能算“看起来有备份”。

## 18. 常见性能问题

### 查询返回太多列

不要 `select *` 给列表页：

```sql
select id, title, slug, published_at
from posts
where status = 'published'
order by published_at desc
limit 20;
```

列表页只取列表需要的字段，详情页再取正文。

### 缺索引

高频条件字段和排序字段要按查询模式建索引：

```sql
create index posts_author_status_created_idx
on posts (author_id, status, created_at desc);
```

### N+1 查询

错误做法：先查 20 篇文章，再循环查作者。

正确做法：一次 join：

```sql
select p.id, p.title, u.name
from posts p
join users u on u.id = p.author_id
where p.status = 'published'
limit 20;
```

### 事务太长

长事务会持有锁，影响 vacuum，增加膨胀风险。事务里只放数据库操作，不放用户交互和慢网络请求。

## 19. 使用路线

学习 PostgreSQL 可以按这条路线：

1. 表、类型、主键、外键、唯一约束、检查约束。
2. `select`、`insert`、`update`、`delete`。
3. `join`、聚合、分组、子查询。
4. 事务、隔离级别、行锁。
5. B-tree、GIN、部分索引、复合索引。
6. `explain analyze` 看执行计划。
7. JSONB、全文搜索、数组等扩展能力。
8. Node.js 连接池、参数化查询、迁移、备份恢复。

PostgreSQL 的关键不是记住所有 SQL 语法，而是建立“数据结构 + 约束 + 查询模式 + 事务边界 + 执行计划”的思维。只要这条链路清楚，数据库设计和性能优化就会变得可推导。

## 参考资料

- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [PostgreSQL JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
