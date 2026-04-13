import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use Supabase connection string
const pool = new Pool({
  connectionString: process.env.SUPABASE_POSTGRES_URL || process.env.POSTGRES_PRISMA_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration to Supabase...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    console.log('Executing schema...');
    await client.query(schema);
    
    console.log('✓ Migration completed successfully!');
    console.log('✓ All tables created in Supabase');
    
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    await pool.end();
  }
}

runMigration();
