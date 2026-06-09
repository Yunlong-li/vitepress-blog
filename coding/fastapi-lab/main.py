from fastapi import FastAPI, Query

from fastapi import Depends, Header, HTTPException

from sqlalchemy import create_engine, String, Integer, DateTime, CHAR, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

app = FastAPI()


# @app.get("/")
# def read_root():
#     return {"message": "Hello FastAPI"}

# @app.get("/users/{user_id}")
# def get_user(user_id: int):
#     return {
#         "id": user_id,
#         "name": "Alice"
#     }


#     """Query 参数测试

#     Returns:
#         dict: 查询的产品信息
#     """
# @app.get("/products")
# def list_products(
#     keyword: str | None = None,
#     page: int = Query(default=1, ge=1),
#     page_size: int = Query(default=20, ge=1, le=100),
# ):
#     return {
#         "keyword": keyword,
#         "page": page,
#         "pageSize": page_size,
#         "items": []
#     }


#     """4.Pydantic 请求模型

#     Returns:
#         _type_: _description_
#     """
# from pydantic import BaseModel, Field


# class ProductCreate(BaseModel):
#     name: str = Field(min_length=1, max_length=80)
#     price: int = Field(gt=0, description="价格，单位为分")
#     stock: int = Field(ge=0)

# @app.post("/products", status_code=201)
# def create_product(payload: ProductCreate):
#     return {
#         "id": 1,
#         **payload.model_dump()
#     }


#     """
#     """
# class ProductOut(BaseModel):
#     id: int
#     name: str
#     price: int


# @app.get("/products/{product_id}", response_model=ProductOut)
# def get_product(product_id: int):
#     return {
#         "id": product_id,
#         "name": "Keyboard",
#         "price": 19900,
#         "internal_cost": 12000
#     }


"""6. APIRouter 拆分模块"""

# from fastapi import FastAPI
# from api.products import router as product_router

# app = FastAPI(title="Shop API")
# app.include_router(product_router)

"""7. 依赖注入
FastAPI 的依赖注入可以管理数据库连接、登录用户、权限、配置等。"""


# def get_current_user(authorization: str | None = Header(default=None)):
#     if not authorization:
#         raise HTTPException(status_code=401, detail="未登录")

#     return {"id": 1, "name": "Alice"}


# @app.get("/me")
# def get_me(user=Depends(get_current_user)):
#     return user


"""9. 数据库访问
下面用 SQLAlchemy 2.0 风格演示。"""
# from fastapi import Depends
# from orm import TownMember, get_db


# @app.get("/townMembers/{member_id}")
# def get_townMember(member_id: int, db: Session = Depends(get_db)):
#     member = db.get(TownMember, member_id)

#     if not member:
#         raise HTTPException(status_code=404, detail="用户不存在")

#     # return {
#     #     "member_id": member.member_id,
#     #     "name": member.full_name,
#     #     "phone_number": member.phone_number,
#     # }
#     return member


"""11. 认证示例"""


# JWT 登录接口
from datetime import datetime, timedelta, timezone
import jwt

SECRET = "replace-me"


def create_token(user_id: int):
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=2),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


# 校验
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        print(payload)
        return int(payload["sub"])
    except jwt.PyJWTError:
        return None


# 依赖
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="令牌无效")

    return {"id": user_id}


@app.get("/me")
def get_me(user=Depends(get_current_user)):
    return user


from pydantic import BaseModel


# 1. 定义请求模型
class LoginRequest(BaseModel):
    userid: int


# 2. 添加登录接口
@app.post("/login")
def login(payload: LoginRequest):
    """
    测试用登录接口：
    接收 userid，直接生成 Token 返回，不查库。
    """
    # 调用现有的 create_token 函数
    # 注意：如果 create_token 强制要求 int，请确保 payload.userid 是纯数字
    # 建议修改 create_token 的参数类型为 str 以完全兼容
    token = create_token(int(payload.userid))

    return {
        "code": 200,
        "msg": "登录成功",
        "data": {"access_token": token, "token_type": "bearer"},
    }
