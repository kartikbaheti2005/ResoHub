from supabase import Client, create_client

from app.core.config import settings


def get_supabase_client() -> Client:
    key = settings.effective_supabase_key
    if not settings.supabase_url or not key:
        raise RuntimeError(
            "Supabase environment variables are missing. Set SUPABASE_URL and either SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY."
        )
    return create_client(settings.supabase_url, key)
