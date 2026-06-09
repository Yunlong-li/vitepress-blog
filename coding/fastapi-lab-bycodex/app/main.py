from fastapi import FastAPI

from app.api.routers import products, users
from app.core.config import settings

app = FastAPI(title=settings.app_name)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(users.router)
app.include_router(products.router)
