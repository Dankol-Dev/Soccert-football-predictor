"""Standalone script to create all database tables.

Run with:  python -m app.db.init_db
"""

from app.db.session import Base, engine
from app.models import User  # noqa: F401 — ensure models are registered


def init_db() -> None:
    print("Creating database tables…")
    Base.metadata.create_all(bind=engine)
    print("Done.")


if __name__ == "__main__":
    init_db()
