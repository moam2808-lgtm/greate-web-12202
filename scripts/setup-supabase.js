#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Disable SSL verification for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Get connection string from environment
  const connectionString = process.env.SUPABASE_POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: SUPABASE_POSTGRES_URL or DATABASE_URL not set');
    process.exit(1);
  }

  console.log('📡 Connecting to Supabase PostgreSQL...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to Supabase successfully!');

    // Read schema.sql
    let schemaContent = null;
    const possiblePaths = [
      path.resolve(__dirname, '../schema.sql'),
      path.resolve('/vercel/share/v0-project/schema.sql'),
      'schema.sql'
    ];

    for (const schemaPath of possiblePaths) {
      try {
        console.log(`  Checking: ${schemaPath}`);
        schemaContent = fs.readFileSync(schemaPath, 'utf8');
        console.log(`✓ Found schema at: ${schemaPath}`);
        break;
      } catch (err) {
        // Continue to next path
      }
    }

    if (!schemaContent) {
      console.error('❌ Could not find schema.sql file');
      console.error('   Tried:');
      possiblePaths.forEach(p => console.error(`   - ${p}`));
      process.exit(1);
    }

    console.log(`📊 Schema loaded (${Math.round(schemaContent.length / 1024)}KB)`);

    // Execute the schema
    console.log('⚙️  Executing schema to create tables...');
    await client.query(schemaContent);

    console.log('\n✅ Migration completed successfully!');
    console.log('✅ All tables created in Supabase PostgreSQL\n');
    console.log('Next steps:');
    console.log('  1. Your DATABASE_URL is now set to Supabase');
    console.log('  2. Make sure JWT_SECRET and API_KEY are configured');
    console.log('  3. Start the development server: npm run dev\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ENOENT') {
      console.error('   Schema file not found. Please ensure schema.sql exists in project root.');
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.release();
    }
    await pool.end();
  }
}

main();
