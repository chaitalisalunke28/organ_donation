"""
Reset and re-seed clean demo database
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from seed_data import seed

engine.dispose()

db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "organ_allocation.db")
if os.path.exists(db_file):
    try:
        os.remove(db_file)
        print("[OK] Old database file removed")
    except Exception as e:
        print(f"Note: {e}")

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
seed()
