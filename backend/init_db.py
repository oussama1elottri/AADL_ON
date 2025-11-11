import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import engine, Base
# By importing models, we ensure all classes that inherit from Base are known.
import backend.models as models 

def main():
    print("Connecting to the database...")
    print("Declaring table metadata...")
    # This command inspects all classes that inherit from Base and creates them.
    Base.metadata.create_all(bind=engine)
    
    table_names = ", ".join(Base.metadata.tables.keys())
    print(f"Tables created successfully: [{table_names}]")
    print("You can now connect to the database to see them.")

if __name__ == "__main__":
    main()

