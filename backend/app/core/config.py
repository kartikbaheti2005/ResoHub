from pydantic import AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ResoHub API"
    environment: str = "development"
    debug: bool = False
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_publishable_key: str = ""
    supabase_service_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def effective_supabase_key(self) -> str:
        return self.supabase_anon_key or self.supabase_publishable_key or self.supabase_service_key


settings = Settings()
