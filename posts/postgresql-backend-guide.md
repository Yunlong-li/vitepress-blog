---
title: PostgreSQL 后端开发教程：表设计、SQL、索引与事务
date: 2026-06-01
description: 面向后端开发讲解 PostgreSQL 的表设计、SQL 查询、索引、事务、锁、JSONB、全文搜索、连接池和 Python 访问方式。
---

# PostgreSQL 后端开发教程：表设计、SQL、索引与事务

PostgreSQL 是功能非常完整的关系型数据库。它既适合传统业务系统，也能处理 JSON、全文搜索、地理信息、复杂分析等场景。

后端开发使用 PostgreSQL 时，重点不是记住所有 SQL 语法，而是理解表设计、索引、事务、锁、执行计划和应用侧访问方式。

## 1. 数据库、Schema、表

一个 PostgreSQL 实例里可以有多个数据库，一个数据库里可以有多个 schema。

```txt
PostgreSQL Server
  database: shop
    schema: public
      table: users
      table: orders
```

创建表：

```sql
create table users (
  id bigserial primary key,
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
```

字段选择：

1. 金额用整数分或 `numeric`，不要用浮点。
2. 时间优先用 `timestamptz`。
3. 自增主键可用 `bigserial`，分布式场景可用 UUID。
4. 必填字段加 `not null`。

## 2. 约束比代码更可靠

唯一约束：

```sql
alter table users add constraint users_email_key unique (email);
```

检查约束：

```sql
create table products (
  id bigserial primary key,
  name text not null,
  price integer not null check (price > 0),
  stock integer not null check (stock >= 0)
);
```

外键：

```sql
create table orders (
  id bigserial primary key,
  user_id bigint not null references users(id),
  status text not null,
  created_at timestamptz not null default now()
);
```

约束放在数据库层，可以防止不同服务、脚本、后台任务写入脏数据。

## 3. 常用查询

插入：

```sql
insert into users (email, name)
values ('alice@example.com', 'Alice')
returning id, email, name;
```

查询：

```sql
select id, email, name
from users
where email = 'alice@example.com';
```

更新：

```sql
update users
set name = 'Alice Zhang'
where id = 1
returning id, name;
```

删除：

```sql
delete from users
where id = 1;
```

业务系统中建议使用参数化查询，不要拼接 SQL。

```python
cursor.execute(
    "select id, email from users where email = %s",
    (email,)
)
```

## 4. Join

订单查询通常要关联用户。

```sql
select
  o.id as order_id,
  o.status,
  u.email
from orders o
join users u on u.id = o.user_id
where o.id = 1001;
```

左连接用于保留左表数据：

```sql
select
  u.id,
  u.email,
  count(o.id) as order_count
from users u
left join orders o on o.user_id = u.id
group by u.id, u.email;
```

## 5. 索引

索引用来加速查询，但不是越多越好。索引会占用空间，也会让写入变慢。

给用户邮箱建索引：

```sql
create unique index idx_users_email on users(email);
```

给订单列表查询建组合索引：

```sql
create index idx_orders_user_created_at
on orders(user_id, created_at desc);
```

这个索引适合：

```sql
select *
from orders
where user_id = 1
order by created_at desc
limit 20;
```

组合索引要注意顺序。`(user_id, created_at)` 能很好支持 `user_id` 过滤后按时间排序。

## 6. 执行计划

用 `explain` 查看数据库如何执行 SQL。

```sql
explain analyze
select *
from orders
where user_id = 1
order by created_at desc
limit 20;
```

关注几个信息：

1. 是否走索引。
2. 实际扫描了多少行。
3. 排序是否消耗大量时间。
4. 估算行数和实际行数是否差距很大。

如果看到 `Seq Scan`，不一定就是坏事。小表全表扫描可能比走索引更快。要结合数据量和耗时判断。

## 7. 事务

事务保证一组操作要么全部成功，要么全部失败。

转账示例：

```sql
begin;

update accounts
set balance = balance - 100
where id = 1 and balance >= 100;

update accounts
set balance = balance + 100
where id = 2;

commit;
```

如果中间失败：

```sql
rollback;
```

Python 中使用事务：

```python
with conn.transaction():
    conn.execute(
        "update accounts set balance = balance - %s where id = %s",
        (100, 1)
    )
    conn.execute(
        "update accounts set balance = balance + %s where id = %s",
        (100, 2)
    )
```

## 8. 锁和并发更新

库存扣减要避免超卖。

```sql
update products
set stock = stock - 1
where id = 100 and stock > 0
returning id, stock;
```

这条 SQL 是原子操作。只有成功返回行时才说明扣减成功。

如果要读取后再修改，可以加行锁：

```sql
begin;

select *
from products
where id = 100
for update;

update products
set stock = stock - 1
where id = 100;

commit;
```

`for update` 会锁住选中的行，其他事务更新同一行时要等待。

## 9. JSONB

PostgreSQL 支持 `jsonb`，适合存储扩展属性。

```sql
create table events (
  id bigserial primary key,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
```

插入：

```sql
insert into events (type, payload)
values (
  'user_login',
  '{"userId": 1, "ip": "127.0.0.1"}'
);
```

查询 JSON 字段：

```sql
select *
from events
where payload->>'userId' = '1';
```

GIN 索引：

```sql
create index idx_events_payload
on events using gin (payload);
```

适合查询：

```sql
select *
from events
where payload @> '{"userId": 1}';
```

不要把所有结构化业务数据都放进 JSONB。核心字段仍然应该建成明确列，便于约束、索引和关联查询。

## 10. 全文搜索

创建搜索向量：

```sql
select to_tsvector('simple', 'PostgreSQL full text search');
```

查询：

```sql
select *
from articles
where to_tsvector('simple', title || ' ' || content)
      @@ plainto_tsquery('simple', 'postgresql search');
```

可以建表达式索引：

```sql
create index idx_articles_search
on articles using gin (
  to_tsvector('simple', title || ' ' || content)
);
```

复杂搜索场景可以用专门搜索引擎，但 PostgreSQL 内置全文搜索足以覆盖很多后台系统。

## 11. 连接池

数据库连接是昂贵资源。Web 服务不要每个请求都新建连接。

SQLAlchemy 会维护连接池：

```python
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql+psycopg://user:pass@localhost:5432/shop",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)
```

参数含义：

1. `pool_size`：常驻连接数。
2. `max_overflow`：高峰临时连接数。
3. `pool_pre_ping`：连接取出前探活。

连接池不要无限开大，否则会压垮数据库。

## 12. Python 访问 PostgreSQL

使用 `psycopg`：

```bash
pip install psycopg[binary]
```

查询：

```python
import psycopg

with psycopg.connect("postgresql://user:pass@localhost:5432/shop") as conn:
    with conn.cursor() as cur:
        cur.execute(
            "select id, email from users where id = %s",
            (1,)
        )
        user = cur.fetchone()
        print(user)
```

字典行：

```python
from psycopg.rows import dict_row

with psycopg.connect(dsn, row_factory=dict_row) as conn:
    with conn.cursor() as cur:
        cur.execute("select id, email from users")
        print(cur.fetchall())
```

业务项目中更常见的是用 SQLAlchemy 统一管理模型、连接池和事务。

## 13. 常见表设计模式

软删除：

```sql
alter table users add column deleted_at timestamptz;

create index idx_users_active
on users(id)
where deleted_at is null;
```

审计字段：

```sql
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
created_by bigint,
updated_by bigint
```

状态字段：

```sql
status text not null check (status in ('pending', 'paid', 'cancelled'))
```

如果状态非常复杂，应该把状态流转规则放到业务层，并配合数据库约束防止非法值。

## 14. PostgreSQL 在后端中的位置

```mermaid
flowchart LR
  Client["客户端"] --> API["后端 API"]
  API --> ORM["SQLAlchemy / Django ORM"]
  ORM --> Pool["连接池"]
  Pool --> PG["PostgreSQL"]
  PG --> WAL["WAL 日志"]
  PG --> Index["索引"]
  PG --> Table["业务表"]
```

## 总结

PostgreSQL 不只是一个数据存储。它提供约束、事务、索引、JSONB、全文搜索、执行计划和并发控制。后端开发要把数据一致性尽量下沉到数据库层，同时在应用层管理连接池、事务边界和 SQL 性能。
