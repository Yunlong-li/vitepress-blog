from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Product, User
from app.schemas.product import ProductCreate, ProductUpdate


def list_products(
    db: Session,
    *,
    keyword: str | None,
    page: int,
    page_size: int,
) -> tuple[int, list[Product]]:
    stmt = select(Product).order_by(Product.id.desc())
    count_stmt = select(func.count()).select_from(Product)

    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(Product.name.like(pattern))
        count_stmt = count_stmt.where(Product.name.like(pattern))

    total = db.scalar(count_stmt) or 0
    items = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return total, list(items)


def get_product(db: Session, product_id: int) -> Product | None:
    return db.get(Product, product_id)


def create_product(db: Session, payload: ProductCreate, owner: User) -> Product:
    product = Product(**payload.model_dump(), owner_id=owner.id)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: Product, payload: ProductUpdate) -> Product:
    changes = payload.model_dump(exclude_unset=True) # exclude_unset=True means 
    # only fields with changes will be updated
    for field, value in changes.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Product) -> None:
    db.delete(product)
    db.commit()
