from datetime import datetime

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    price_cents: int = Field(gt=0, description="Price in cents")
    stock: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    price_cents: int | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)


class ProductOut(BaseModel):
    id: int
    name: str
    description: str | None
    price_cents: int
    stock: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductList(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[ProductOut]
