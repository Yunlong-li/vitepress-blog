---
title: FastAPI 使用教程：从接口到工程化
date: 2026-06-01
description: 结合代码讲解 FastAPI 的路由、Pydantic、依赖注入、异常处理、数据库访问、认证、测试和项目结构。
---

# FastAPI 使用教程：从接口到工程化

FastAPI 是一个现代 Python Web 框架，适合构建 API 服务。它的核心优势是类型提示、Pydantic 数据校验、自动 OpenAPI 文档、依赖注入，以及对异步请求的良好支持。

## 1. 最小应用

安装：

```bash
pip install fastapi uvicorn
```

创建 `main.py`：

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Hello FastAPI"}
```

启动：

```bash
uvicorn main:app --reload
```

访问：

```txt
http://127.0.0.1:8000/
http://127.0.0.1:8000/docs
```

`/docs` 是自动生成的 Swagger UI。

## 2. 路由和路径参数

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/users/{user_id}")
def get_user(user_id: int):
    return {
        "id": user_id,
        "name": "Alice"
    }
```

`user_id: int` 不只是注释。FastAPI 会根据类型自动转换和校验。

请求：

```http
GET /users/1
```

如果访问：

```http
GET /users/abc
```

FastAPI 会返回参数校验错误。

## 3. Query 参数

```python
from fastapi import Query


@app.get("/products")
def list_products(
    keyword: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    return {
        "keyword": keyword,
        "page": page,
        "pageSize": page_size,
        "items": []
    }
```

`Query` 可以定义默认值、最小值、最大值、描述信息。

## 4. Pydantic 请求模型

FastAPI 和 Pydantic 结合非常紧密。

```python
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    price: int = Field(gt=0, description="价格，单位为分")
    stock: int = Field(ge=0)


@app.post("/products", status_code=201)
def create_product(payload: ProductCreate):
    return {
        "id": 1,
        **payload.model_dump()
    }
```

请求：

```json
{
  "name": "Keyboard",
  "price": 19900,
  "stock": 50
}
```

如果 `price` 小于等于 0，FastAPI 会自动返回校验错误。

## 5. 响应模型

请求模型用于校验输入，响应模型用于约束输出。

```python
class ProductOut(BaseModel):
    id: int
    name: str
    price: int


@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int):
    return {
        "id": product_id,
        "name": "Keyboard",
        "price": 19900,
        "internal_cost": 12000
    }
```

响应里不会输出 `internal_cost`，因为它不在 `ProductOut` 中。

这能避免把内部字段意外暴露给前端。

## 6. APIRouter 拆分模块

项目变大后，不要把所有接口都写在 `main.py`。

目录结构：

```txt
app/
  main.py
  api/
    products.py
    users.py
```

`api/products.py`：

```python
from fastapi import APIRouter

router = APIRouter(prefix="/products", tags=["products"])


@router.get("")
def list_products():
    return []


@router.post("", status_code=201)
def create_product():
    return {"id": 1}
```

`main.py`：

```python
from fastapi import FastAPI
from app.api.products import router as product_router

app = FastAPI(title="Shop API")
app.include_router(product_router)
```

## 7. 依赖注入

FastAPI 的依赖注入可以管理数据库连接、登录用户、权限、配置等。

```python
from fastapi import Depends, Header, HTTPException


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="未登录")

    return {
        "id": 1,
        "name": "Alice"
    }


@app.get("/me")
def get_me(user=Depends(get_current_user)):
    return user
```

依赖可以继续依赖其他依赖：

```python
def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="无权限")
    return user
```

## 8. 异步接口

FastAPI 支持同步和异步。

```python
@app.get("/sync")
def sync_api():
    return {"type": "sync"}


@app.get("/async")
async def async_api():
    return {"type": "async"}
```

异步适合网络 IO 密集场景，例如调用其他 HTTP 服务、异步数据库驱动、消息队列等。

```python
import httpx


@app.get("/github-user/{username}")
async def get_github_user(username: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.github.com/users/{username}")
        return response.json()
```

如果内部调用的是阻塞式数据库驱动，盲目写 `async def` 并不会让它自动变快。

## 9. 数据库访问

下面用 SQLAlchemy 2.0 风格演示。

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

engine = create_engine("postgresql+psycopg://user:pass@localhost:5432/shop")


class Base(DeclarativeBase):
    pass


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    price: Mapped[int]


def get_db():
    with Session(engine) as session:
        yield session
```

接口中使用：

```python
from fastapi import Depends


@app.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)

    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    return {
        "id": product.id,
        "name": product.name,
        "price": product.price
    }
```

## 10. 异常处理

统一异常结构：

```python
from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message
        }
    )
```

业务代码：

```python
raise ApiError(404, "PRODUCT_NOT_FOUND", "商品不存在")
```

## 11. 认证示例

JWT 登录接口：

```python
from datetime import datetime, timedelta, timezone
import jwt

SECRET = "replace-me"


def create_token(user_id: int):
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=2)
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")
```

校验：

```python
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        return int(payload["sub"])
    except jwt.PyJWTError:
        return None
```

依赖：

```python
def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录")

    token = authorization.removeprefix("Bearer ").strip()
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="令牌无效")

    return {"id": user_id}
```

生产环境不要把密钥写死在代码里，要使用环境变量或密钥管理服务。

## 12. 测试

FastAPI 的接口测试很直接。

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello FastAPI"}
```

覆盖依赖：

```python
def fake_current_user():
    return {"id": 1, "name": "Test User"}


app.dependency_overrides[get_current_user] = fake_current_user
```

这样可以在测试中绕过真实登录。

## 13. 推荐项目结构

```txt
app/
  main.py
  core/
    config.py
    security.py
  db/
    session.py
    models.py
  api/
    routers/
      users.py
      products.py
  schemas/
    user.py
    product.py
  services/
    product_service.py
tests/
  test_products.py
```

职责分层：

1. `api` 负责 HTTP 输入输出。
2. `schemas` 负责请求和响应模型。
3. `services` 负责业务逻辑。
4. `db` 负责数据库连接和模型。
5. `core` 放配置和安全工具。

本文相关代码可以在仓库的 `coding/fastapi-lab` 和 `coding/fastapi-lab-bycodex` 目录中查看。前者保留学习过程中的零散练习，后者按照上面的推荐项目结构整理成了一个可运行的小型 Demo，并包含初始化 SQL、README 和基础测试。

## 14. 请求生命周期

```mermaid
sequenceDiagram
  participant Client as 客户端
  participant Router as FastAPI 路由
  participant Dep as 依赖注入
  participant Service as 业务服务
  participant DB as 数据库

  Client->>Router: HTTP 请求
  Router->>Dep: 参数校验和依赖解析
  Dep-->>Router: 当前用户、数据库会话等
  Router->>Service: 调用业务逻辑
  Service->>DB: 查询或写入数据
  DB-->>Service: 返回结果
  Service-->>Router: 返回领域对象
  Router-->>Client: Pydantic 序列化响应
```

## 总结

FastAPI 适合构建类型清晰、文档自动化、测试友好的 API 服务。真正落地时，不要只停留在几个路由函数上，要把请求模型、响应模型、依赖注入、数据库会话、异常结构、认证授权和测试一起设计好。
