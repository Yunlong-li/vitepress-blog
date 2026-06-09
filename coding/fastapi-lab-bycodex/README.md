# FastAPI Lab By Codex

这是一个按照博客「推荐项目结构」整理出来的小型 FastAPI Demo。它包含用户注册、登录、JWT 鉴权、商品 CRUD、SQLAlchemy 2.0 数据访问、初始化 SQL 和基础测试。

## 项目结构

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
    deps.py
    routers/
      users.py
      products.py
  schemas/
    user.py
    product.py
  services/
    user_service.py
    product_service.py
tests/
  test_products.py
sql/
  init.sql
```

## 接口逻辑流程图

```mermaid
flowchart TD
  client["客户端 / Swagger UI"] --> app["FastAPI app.main:app"]

  app --> health["GET /health"]
  health --> healthEnd["返回 { status: ok }"]

  app --> register["POST /users 注册用户"]
  register --> registerSchema["UserCreate 校验 username/password"]
  registerSchema --> registerDb["依赖 get_db 创建数据库会话"]
  registerDb --> registerService["user_service.create_user"]
  registerService --> hashPwd["core.security.hash_password"]
  hashPwd --> insertUser["INSERT users"]
  insertUser --> registerCommit["db.commit + db.refresh"]
  registerCommit --> registerOut["UserOut 响应"]
  insertUser --> registerConflict["username 唯一索引冲突"]
  registerConflict --> registerRollback["db.rollback"]
  registerRollback --> register409["返回 409 Username already exists"]

  app --> login["POST /users/login 登录"]
  login --> loginSchema["LoginRequest 校验 username/password"]
  loginSchema --> loginDb["依赖 get_db 创建数据库会话"]
  loginDb --> authService["user_service.authenticate_user"]
  authService --> selectUser["SELECT users WHERE username = ?"]
  selectUser --> userMissing{"用户存在且 is_active?"}
  userMissing -- 否 --> login401["返回 401 Incorrect username or password"]
  userMissing -- 是 --> verifyPwd["core.security.verify_password"]
  verifyPwd --> pwdOk{"密码正确?"}
  pwdOk -- 否 --> login401
  pwdOk -- 是 --> createToken["core.security.create_access_token"]
  createToken --> tokenOut["返回 TokenResponse"]

  app --> me["GET /users/me 当前用户"]
  me --> meAuth["依赖 get_current_user"]
  meAuth --> bearer["HTTPBearer 读取 Authorization"]
  bearer --> decodeToken["decode_access_token 解析 JWT"]
  decodeToken --> tokenOk{"Token 有效?"}
  tokenOk -- 否 --> auth401["返回 401 Invalid token"]
  tokenOk -- 是 --> selectMe["SELECT users WHERE id = token.sub"]
  selectMe --> meOk{"用户存在且 is_active?"}
  meOk -- 否 --> inactive401["返回 401 User is inactive or missing"]
  meOk -- 是 --> meOut["返回 UserOut"]

  app --> listProducts["GET /products 商品列表"]
  listProducts --> listQuery["校验 keyword/page/page_size"]
  listQuery --> listDb["依赖 get_db 创建数据库会话"]
  listDb --> listService["product_service.list_products"]
  listService --> countProducts["SELECT COUNT(*) FROM products 可按 keyword 过滤"]
  countProducts --> selectProducts["SELECT products ORDER BY id DESC LIMIT/OFFSET"]
  selectProducts --> listOut["返回 ProductList"]

  app --> getProduct["GET /products/{product_id} 商品详情"]
  getProduct --> detailDb["依赖 get_db 创建数据库会话"]
  detailDb --> detailService["product_service.get_product"]
  detailService --> selectProduct["SELECT products WHERE id = product_id"]
  selectProduct --> detailFound{"商品存在?"}
  detailFound -- 否 --> detail404["返回 404 Not found"]
  detailFound -- 是 --> detailOut["返回 ProductOut"]

  app --> createProduct["POST /products 创建商品"]
  createProduct --> productSchema["ProductCreate 校验 name/price_cents/stock"]
  productSchema --> createDeps["依赖 get_db + get_current_user"]
  createDeps --> createAuth["执行 JWT 鉴权并查询 users"]
  createAuth --> createAuthOk{"鉴权成功?"}
  createAuthOk -- 否 --> auth401
  createAuthOk -- 是 --> createService["product_service.create_product"]
  createService --> insertProduct["INSERT products owner_id = current_user.id"]
  insertProduct --> createCommit["db.commit + db.refresh"]
  createCommit --> createOut["返回 ProductOut"]

  app --> updateProduct["PATCH /products/{product_id} 更新商品"]
  updateProduct --> updateSchema["ProductUpdate 校验可选字段"]
  updateSchema --> updateDeps["依赖 get_db + get_current_user"]
  updateDeps --> updateAuth["执行 JWT 鉴权并查询 users"]
  updateAuth --> updateAuthOk{"鉴权成功?"}
  updateAuthOk -- 否 --> auth401
  updateAuthOk -- 是 --> updateSelect["SELECT products WHERE id = product_id"]
  updateSelect --> updateFound{"商品存在?"}
  updateFound -- 否 --> update404["返回 404 Not found"]
  updateFound -- 是 --> ownerCheck{"owner_id == current_user.id?"}
  ownerCheck -- 否 --> update403["返回 403 Forbidden"]
  ownerCheck -- 是 --> updateService["product_service.update_product"]
  updateService --> applyChanges["仅写入 payload 中传入的字段"]
  applyChanges --> updateCommit["db.commit + db.refresh"]
  updateCommit --> updateOut["返回 ProductOut"]

  app --> deleteProduct["DELETE /products/{product_id} 删除商品"]
  deleteProduct --> deleteDeps["依赖 get_db + get_current_user"]
  deleteDeps --> deleteAuth["执行 JWT 鉴权并查询 users"]
  deleteAuth --> deleteAuthOk{"鉴权成功?"}
  deleteAuthOk -- 否 --> auth401
  deleteAuthOk -- 是 --> deleteSelect["SELECT products WHERE id = product_id"]
  deleteSelect --> deleteFound{"商品存在?"}
  deleteFound -- 否 --> delete404["返回 404 Not found"]
  deleteFound -- 是 --> deleteOwner{"owner_id == current_user.id?"}
  deleteOwner -- 否 --> delete403["返回 403 Forbidden"]
  deleteOwner -- 是 --> deleteService["product_service.delete_product"]
  deleteService --> deleteSql["DELETE FROM products"]
  deleteSql --> deleteCommit["db.commit"]
  deleteCommit --> delete204["返回 204 No Content"]
```

## 准备数据库

本项目不使用原来的 `ghjf` 数据库，默认使用新库 `fastapi_lab_bycodex`。

先在 MySQL 中执行：

```sql
source sql/init.sql;
```

如果你的 MySQL 账号密码不是 `root/root`，复制环境变量模板并修改连接串：

```bash
cp .env.example .env
```

Windows PowerShell 可以执行：

```powershell
Copy-Item .env.example .env
```

然后把 `.env` 中的 `DATABASE_URL` 改成你的 MySQL 地址。

## 启动项目

建议在当前目录创建虚拟环境：

```bash
python -m venv .venv
```

Windows PowerShell 激活：

```powershell
.\.venv\Scripts\Activate.ps1
```

安装依赖：

```bash
pip install -r requirements.txt
```

启动服务：

```bash
uvicorn app.main:app --reload --port 8001
```

打开接口文档：

```txt
http://127.0.0.1:8001/docs
```

## 试用账号

初始化 SQL 会创建一个测试账号：

```txt
username: admin
password: admin123
```

在 `/users/login` 登录后，把返回的 `access_token` 填入 Swagger 右上角的 Authorize，格式为：

```txt
Bearer <access_token>
```

之后可以调用需要登录的商品创建、更新、删除接口。

## 运行测试

测试会使用 SQLite 内存库，不依赖你的 MySQL：

```bash
pytest
```
