from __future__ import annotations

import sys
from pathlib import Path
from urllib.parse import urlparse

import psycopg

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings


def create_database_if_missing() -> None:
    settings = get_settings()
    parsed = urlparse(settings.database_url.replace("postgresql+psycopg://", "postgresql://"))
    database = parsed.path.lstrip("/")
    maintenance_url = settings.database_url.replace(f"/{database}", "/postgres")
    maintenance_url = maintenance_url.replace("postgresql+psycopg://", "postgresql://")
    with psycopg.connect(maintenance_url, autocommit=True) as conn:
        exists = conn.execute(
            "select 1 from pg_database where datname = %s", (database,)
        ).fetchone()
        if not exists:
            conn.execute(f'create database "{database}"')


if __name__ == "__main__":
    create_database_if_missing()
