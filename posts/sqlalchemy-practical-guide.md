---
title: SQLAlchemy 使用教程：Core、ORM、事务与异步
date: 2026-06-01
description: 结合代码讲解 SQLAlchemy 2.0 的 Engine、Session、声明式模型、关系映射、查询、事务、Alembic 迁移和异步用法。
---

# SQLAlchemy 使用教程：Core、ORM、事务与异步

SQLAlchemy 是 Python 生态里非常强大的数据库工具。它不是简单的 ORM，而是一套完整的 SQL 工具箱：既可以用 Core 写接近 SQL 的表达式，也可以用 ORM 映射 Python 对象。

## 1. SQLAlchemy 的两层能力

SQLAlchemy 主要分两层：

```txt
Core
  Engine
  Connection
  SQL Expression Language

ORM
  Declarative Model
  Session
  Relationship
  Unit of Work
```

Core 更接近 SQL，ORM 更接近对象模型。

## 2. 安装和连接

安装：

```bash
pip install sqlalchemy psycopg[binary]
```

创建 Engine：

```python
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql+psycopg://user:pass@localhost:5432/shop",
    echo=True,
    pool_pre_ping=True,
)
```

`engine` 不是一个单独连接，而是数据库连接和连接池的入口。

## 3. Core 查询

定义表：

```python
from sqlalchemy import MetaData, Table, Column, Integer, String

metadata = MetaData()

users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("email", String, unique=True, nullable=False),
    Column("name", String, nullable=False),
)
```

创建表：

```python
metadata.create_all(engine)
```

插入：

```python
from sqlalchemy import insert

stmt = insert(users).values(
    email="alice@example.com",
    name="Alice"
)

with engine.begin() as conn:
    conn.execute(stmt)
```

查询：

```python
from sqlalchemy import select

stmt = select(users).where(users.c.email == "alice@example.com")

with engine.connect() as conn:
    row = conn.execute(stmt).first()
    print(row)
```

Core 的优势是结构化、可组合，又不会失去 SQL 的清晰度。

## 4. ORM 声明式模型

SQLAlchemy 2.0 推荐使用类型注解风格。

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(80))
```

创建表：

```python
Base.metadata.create_all(engine)
```

## 5. Session

Session 是 ORM 的核心。它负责对象状态、事务和数据库交互。

```python
from sqlalchemy.orm import Session

with Session(engine) as session:
    user = User(email="alice@example.com", name="Alice")
    session.add(user)
    session.commit()
```

查询：

```python
from sqlalchemy import select

with Session(engine) as session:
    stmt = select(User).where(User.email == "alice@example.com")
    user = session.scalars(stmt).first()
    print(user.name)
```

`session.scalars()` 适合查询 ORM 对象。

## 6. 事务

推荐用上下文管理事务：

```python
with Session(engine) as session:
    with session.begin():
        user = User(email="bob@example.com", name="Bob")
        session.add(user)
```

如果代码块内抛异常，事务会自动回滚。

也可以：

```python
with Session(engine) as session:
    try:
        session.add(User(email="c@example.com", name="C"))
        session.commit()
    except Exception:
        session.rollback()
        raise
```

Web 项目中通常每个请求一个 Session，请求结束后关闭。

## 7. 关系映射

用户和订单是一对多。

```python
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(30))

    user: Mapped["User"] = relationship(back_populates="orders")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(80))

    orders: Mapped[list["Order"]] = relationship(back_populates="user")
```

创建用户和订单：

```python
with Session(engine) as session:
    user = User(
        email="alice@example.com",
        name="Alice",
        orders=[
            Order(status="pending"),
            Order(status="paid"),
        ],
    )
    session.add(user)
    session.commit()
```

## 8. 避免 N+1 查询

如果直接遍历用户并访问订单：

```python
users = session.scalars(select(User)).all()

for user in users:
    print(user.orders)
```

可能触发 N+1 查询。

使用 `selectinload`：

```python
from sqlalchemy.orm import selectinload

stmt = select(User).options(selectinload(User.orders))
users = session.scalars(stmt).all()
```

使用 `joinedload`：

```python
from sqlalchemy.orm import joinedload

stmt = select(Order).options(joinedload(Order.user))
orders = session.scalars(stmt).all()
```

选择：

1. 多对一常用 `joinedload`。
2. 一对多常用 `selectinload`。

## 9. CRUD 示例

创建：

```python
def create_user(session: Session, email: str, name: str) -> User:
    user = User(email=email, name=name)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
```

读取：

```python
def get_user(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)
```

更新：

```python
def rename_user(session: Session, user_id: int, name: str) -> User:
    user = session.get(User, user_id)

    if user is None:
        raise ValueError("用户不存在")

    user.name = name
    session.commit()
    session.refresh(user)
    return user
```

删除：

```python
def delete_user(session: Session, user_id: int) -> None:
    user = session.get(User, user_id)

    if user:
        session.delete(user)
        session.commit()
```

## 10. 和 FastAPI 集成

```python
from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

app = FastAPI()


def get_db():
    with Session(engine) as session:
        yield session


@app.get("/users/{user_id}")
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)

    if user is None:
        return {"message": "用户不存在"}

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name
    }
```

每个请求获得一个 Session，请求结束后关闭。

## 11. Alembic 迁移

SQLAlchemy 负责模型，Alembic 负责迁移。

安装：

```bash
pip install alembic
```

初始化：

```bash
alembic init migrations
```

生成迁移：

```bash
alembic revision --autogenerate -m "create users table"
```

执行迁移：

```bash
alembic upgrade head
```

生产环境不要依赖 `Base.metadata.create_all()` 管理表结构。它适合本地开发和测试，正式项目应使用 Alembic。

## 12. 异步 SQLAlchemy

安装异步驱动：

```bash
pip install asyncpg
```

创建异步 Engine：

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

async_engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost:5432/shop",
    echo=True,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    expire_on_commit=False,
)
```

查询：

```python
from sqlalchemy.ext.asyncio import AsyncSession


async def get_user(session: AsyncSession, user_id: int):
    return await session.get(User, user_id)
```

FastAPI 依赖：

```python
async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session
```

接口：

```python
@app.get("/users/{user_id}")
async def read_user(user_id: int, db: AsyncSession = Depends(get_async_db)):
    user = await db.get(User, user_id)
    return user
```

异步 SQLAlchemy 适合全链路异步项目。如果数据库驱动、缓存、HTTP 客户端都是异步，整体收益更明显。

## 13. 常见坑

### Session 生命周期过长

不要把全局 Session 当单例：

```python
# 不推荐
session = Session(engine)
```

应该每个请求创建和关闭。

### 查询后对象失效

默认提交后对象可能过期。可以用：

```python
session.refresh(user)
```

或在 sessionmaker 中配置：

```python
sessionmaker(engine, expire_on_commit=False)
```

### 不看 SQL

开发阶段可以打开：

```python
create_engine(url, echo=True)
```

复杂查询要配合 PostgreSQL 的 `explain analyze`。

## 14. SQLAlchemy 工作流

```mermaid
flowchart TD
  A["定义模型"] --> B["生成 Alembic 迁移"]
  B --> C["执行数据库迁移"]
  C --> D["创建 Engine 和 Session"]
  D --> E["在服务层执行查询和事务"]
  E --> F["API 层序列化响应"]
  F --> G["测试覆盖 CRUD 和事务边界"]
```

## 总结

SQLAlchemy 的关键是理解 Engine、Session、模型、查询、事务和迁移之间的边界。Core 适合构造 SQL，ORM 适合业务对象建模，Alembic 负责表结构演进。

在真实项目里，最重要的不是把 ORM 用得很“对象化”，而是保证事务边界清晰、查询可控、连接池合理、迁移可追踪。
