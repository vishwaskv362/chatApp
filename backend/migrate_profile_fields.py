"""Add status_message and bio columns to users table"""

from sqlalchemy import text
from app.database import engine

def upgrade():
    """Add status_message and bio columns"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS status_message VARCHAR;
        """))
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS bio VARCHAR;
        """))
        conn.commit()
    print("✅ Migration completed: Added status_message and bio columns")

def downgrade():
    """Remove status_message and bio columns"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE users 
            DROP COLUMN IF EXISTS status_message;
        """))
        conn.execute(text("""
            ALTER TABLE users 
            DROP COLUMN IF EXISTS bio;
        """))
        conn.commit()
    print("✅ Rollback completed: Removed status_message and bio columns")

if __name__ == "__main__":
    upgrade()
