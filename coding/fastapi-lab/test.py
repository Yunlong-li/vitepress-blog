from fastapi.testclient import TestClient
from main import app, get_current_user

client = TestClient(app)


"""覆盖依赖, 在测试中绕过真实登录"""


def fake_current_user():
    return {"id": 1, "name": "Test User"}


app.dependency_overrides[get_current_user] = fake_current_user


def test_get_root():
    response = client.get("/me")
    assert response.status_code == 200
    assert response.json() == {"id": 1, "name": "Test User"}


test_get_root()
