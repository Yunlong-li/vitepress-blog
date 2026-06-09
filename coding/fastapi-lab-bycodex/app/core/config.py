from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FastAPI Lab By Codex"
    database_url: str = "mysql+pymysql://root:root@127.0.0.1:3306/fastapi_lab_bycodex"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 120

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# @lru_cache 在这里的作用是：“一次加载，全局共享”。
# 它既节省了重复读取配置文件的开销，又确保了整个应用中使用的配置对象是唯一的。这是 Python 配置管理中的最佳实践。
# 文件末尾有对比代码
@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


# from functools import lru_cache


# # --- 情况 1：没有 @lru_cache ---
# def get_settings_no_cache():
#     return Settings()


# s1 = get_settings_no_cache()
# s2 = get_settings_no_cache()
# print(s1)
# print(s1 is s2)  # 输出: False (是两个不同的对象)


# # --- 情况 2：有 @lru_cache ---
# @lru_cache
# def get_settings_with_cache():
#     return Settings()


# s3 = get_settings_with_cache()
# s4 = get_settings_with_cache()
# print(s3 is s4)  # 输出: True (是同一个对象，直接从缓存取)
