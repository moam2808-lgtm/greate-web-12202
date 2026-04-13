#!/usr/bin/env python3

import os
import psycopg2
from pathlib import Path

# Disable SSL certificate validation
os.environ['PSQL_PGOPTIONS'] = '-c ssl_max_protocol_version=TLSv1.3'

# Get Supabase connection string
connection_string = os.getenv('SUPABASE_POSTGRES_URL')

if not connection_string:
    print("❌ Error: SUPABASE_POSTGRES_URL not set")
    exit(1)

print("📡 Connecting to Supabase...")

try:
    # Replace postgres:// with postgresql:// for compatibility
    if connection_string.startswith('postgres://'):
        connection_string = connection_string.replace('postgres://', 'postgresql://', 1)
    
    # Connect to Supabase
    conn = psycopg2.connect(
        connection_string,
        sslmode='require',
        connect_timeout=10
    )
    
    print("✅ Connected successfully!")
    
    # Find and read schema.sql
    schema_paths = [
        Path('/vercel/share/v0-project/schema.sql'),
        Path('/home/user/schema.sql'),
        Path.cwd() / 'schema.sql'
    ]
    
    schema_file = None
    for path in schema_paths:
        if path.exists():
            schema_file = path
            print(f"📂 Found schema at: {schema_file}")
            break
    
    if not schema_file:
        print("❌ Could not find schema.sql")
        conn.close()
        exit(1)
    
    # Read schema
    with open(schema_file, 'r') as f:
        schema_sql = f.read()
    
    print(f"📊 Loaded schema ({len(schema_sql) / 1024:.2f}KB)")
    
    # Create cursor and execute schema
    cursor = conn.cursor()
    
    print("⚙️  Creating tables...")
    cursor.execute(schema_sql)
    conn.commit()
    
    print("✅ Migration completed successfully!")
    print("✅ All tables created in Supabase")
    print("\n📝 Next steps:")
    print("1. DATABASE_URL is now using Supabase")
    print("2. Configure JWT_SECRET and other keys")
    print("3. Run the development server with: npm run dev")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Migration failed: {e}")
    exit(1)
