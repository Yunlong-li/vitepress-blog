from fastapi import APIRouter

router = APIRouter(prefix="/products", tags=["products"])


@router.get("")
def list_products():
    return []


@router.post("", status_code=201)
def create_product():
    return {"id": 1}
