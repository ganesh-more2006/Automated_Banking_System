import sqlite3
import os

def migrate():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "banking.db"))
    print(f"Connecting to SQLite database: {db_path}")
    
    if not os.path.exists(db_path):
        print("Database file does not exist yet. Running normal FastAPI startup will create it automatically.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Migrate transactions table (risk assessment columns)
    tx_columns = [
        ("risk_score", "INTEGER DEFAULT 0 NOT NULL"),
        ("risk_level", "VARCHAR(20) DEFAULT 'LOW' NOT NULL"),
        ("is_suspicious", "BOOLEAN DEFAULT 0 NOT NULL"),
        ("model_version", "VARCHAR(50) DEFAULT 'v1.0.0' NOT NULL"),
        ("detected_reasons", "VARCHAR(500)"),
        ("evaluated_at", "DATETIME DEFAULT '2026-08-28 12:00:00' NOT NULL")
    ]
    
    for col_name, col_type in tx_columns:
        try:
            print(f"Adding column '{col_name}' to transactions table...")
            cursor.execute(f"ALTER TABLE transactions ADD COLUMN {col_name} {col_type};")
            conn.commit()
            print(f"Column '{col_name}' added successfully.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column '{col_name}' already exists. Skipping.")
            else:
                print(f"Error adding '{col_name}' to transactions: {e}")
                
    # 2. Migrate accounts table (IFSC column)
    try:
        print("Adding column 'ifsc_code' to accounts table...")
        cursor.execute("ALTER TABLE accounts ADD COLUMN ifsc_code VARCHAR(11) DEFAULT 'APEX0000123' NOT NULL;")
        conn.commit()
        print("Column 'ifsc_code' added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'ifsc_code' already exists. Skipping.")
        else:
            print(f"Error adding 'ifsc_code' to accounts: {e}")
            
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
