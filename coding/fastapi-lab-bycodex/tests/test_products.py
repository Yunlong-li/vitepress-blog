from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import Base
from app.db.session import get_db
from app.main import app

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def reset_database() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_create_and_list_products() -> None:
    client = TestClient(app)

    response = client.post(
        "/users",
        json={"username": "alice", "password": "secret123"},
    )
    assert response.status_code == 201

    response = client.post(
        "/users/login",
        json={"username": "alice", "password": "secret123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    response = client.post(
        "/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Test Keyboard",
            "description": "A product created in tests.",
            "price_cents": 19900,
            "stock": 12,
        },
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Keyboard"

    response = client.get("/products?keyword=Keyboard")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["stock"] == 12
