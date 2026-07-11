"""Create or update a user. Usage: uv run python -m app.scripts.create_user <email> <password> [role]"""

import asyncio
import sys

from sqlalchemy import select

from app.core.db import async_session_factory
from app.core.security import hash_password
from app.models.models import User


async def main(email: str, password: str, role: str = "admin") -> None:
    async with async_session_factory() as db:
        user = await db.scalar(select(User).where(User.email == email.lower()))
        if user is None:
            user = User(email=email.lower(), password_hash=hash_password(password), role=role)
            db.add(user)
            action = "Created"
        else:
            user.password_hash = hash_password(password)
            user.role = role
            action = "Updated"
        await db.commit()
        print(f"{action} user {email} with role {role}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: uv run python -m app.scripts.create_user <email> <password> [role]")
        sys.exit(1)
    asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "admin"))
