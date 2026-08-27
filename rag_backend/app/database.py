import psycopg
from contextlib import contextmanager
from .config import settings

@contextmanager
def get_db_connection():
    if settings.DB_SSLMODE:
        sslmode = settings.DB_SSLMODE
    elif settings.DB_HOST in ("localhost", "127.0.0.1", "postgres", "mindanchor-postgres"):
        sslmode = "disable"
    else:
        sslmode = "require"
    conn = psycopg.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        dbname=settings.DB_NAME,
        sslmode=sslmode
    )
    try:
        yield conn
    finally:
        conn.close()
        
