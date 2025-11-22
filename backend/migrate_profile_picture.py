"""Add profile_picture column to users table"""

from sqlalchemy import text
from app.database import engine

def upgrade():
    """Add profile_picture column"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS profile_picture VARCHAR;
        """))
        conn.commit()
    print("✅ Migration completed: Added profile_picture column")

def downgrade():
    """Remove profile_picture column"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE users 
            DROP COLUMN IF EXISTS profile_picture;
        """))
        conn.commit()
    print("✅ Rollback completed: Removed profile_picture column")

if __name__ == "__main__":
    upgrade()
