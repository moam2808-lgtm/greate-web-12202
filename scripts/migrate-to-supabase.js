#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Disable SSL certificate validation for Supabase in development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function runMigration() {
  // Use Supabase connection string
  const connectionString = process.env.SUPABASE_POSTGRES_URL;

  if (!connectionString) {
    console.error('❌ Error: SUPABASE_POSTGRES_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  let client;
  try {
    console.log('📡 Connecting to Supabase...');
    client = await pool.connect();
    console.log('✅ Connected successfully!');

    // Read schema.sql from project root - try multiple paths
    console.log(`📍 Current working directory: ${process.cwd()}`);
    
    const possiblePaths = [
      path.join(process.cwd(), 'schema.sql'),
      path.join(process.cwd(), '..', 'schema.sql'),
      '/vercel/share/v0-project/schema.sql',
      './schema.sql',
      '../schema.sql'
    ];

    let schemaPath = null;
    for (const candidate of possiblePaths) {
      console.log(`  Checking: ${candidate}`);
      if (fs.existsSync(candidate)) {
        schemaPath = candidate;
        console.log(`✓ Found at: ${schemaPath}`);
        break;
      }
    }

    if (!schemaPath) {
      throw new Error(`Schema file not found. Tried: ${possiblePaths.join(', ')}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📊 Loaded schema (${(schemaSql.length / 1024).toFixed(2)}KB)`);

    // Execute the schema
    console.log('⚙️  Creating tables...');
    await client.query(schemaSql);

    console.log('✅ Migration completed successfully!');
    console.log('✅ All tables created in Supabase');
    console.log('\n📝 Next steps:');
    console.log('1. Update DATABASE_URL in .env to use Supabase');
    console.log('2. Set VITE_API_URL to same port for frontend');
    console.log('3. Configure JWT_SECRET and other keys');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.error('\n⚠️  SSL error - NODE_TLS_REJECT_UNAUTHORIZED is set to 0');
    }
    process.exit(1);
  } finally {
    if (client) await client.end();
    await pool.end();
  }
}

runMigration();
