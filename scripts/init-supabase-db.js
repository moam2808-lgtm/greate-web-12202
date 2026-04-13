#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const { Pool } = pg;

// Disable SSL cert validation for Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = process.env.SUPABASE_POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL or SUPABASE_POSTGRES_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  let client;
  try {
    console.log('📡 Connecting to Supabase PostgreSQL...');
    client = await pool.connect();
    console.log('✅ Connected successfully!\n');

    // Try to find schema.sql in multiple ways
    let schemaContent = null;
    const possiblePaths = [
      './schema.sql',
      '../schema.sql',
      '/vercel/share/v0-project/schema.sql',
      path.resolve(process.cwd(), 'schema.sql'),
      path.resolve(process.cwd(), '..', 'schema.sql')
    ];

    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          console.log(`📂 Found schema at: ${filePath}`);
          schemaContent = fs.readFileSync(filePath, 'utf8');
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }

    // If file not found, try using find command
    if (!schemaContent) {
      try {
        console.log('🔍 Searching for schema.sql with find command...');
        const findResult = execSync('find . -name "schema.sql" -type f 2>/dev/null | head -1', {
          encoding: 'utf8',
          timeout: 5000
        }).trim();
        
        if (findResult) {
          console.log(`📂 Found schema at: ${findResult}`);
          schemaContent = fs.readFileSync(findResult, 'utf8');
        }
      } catch (e) {
        console.warn('⚠️ Could not find schema.sql with find command');
      }
    }

    if (!schemaContent) {
      throw new Error('Could not find schema.sql in any expected location');
    }

    console.log(`\n📝 Executing schema (${Math.round(schemaContent.length / 1024)}KB)...\n`);

    // Execute the entire schema as a single query
    await client.query(schemaContent);

    console.log('✅ Database setup completed successfully!');
    console.log('\n📊 Schema executed in Supabase');
    console.log('🎉 All tables created and ready to use\n');

  } catch (error) {
    console.error('\n❌ Error during database setup:');
    console.error(error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n⚠️ Connection error - Check your DATABASE_URL');
    } else if (error.message.includes('schema.sql')) {
      console.error('\n⚠️ Schema file error - Check that schema.sql exists in project root');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
    await pool.end();
  }
}

setupDatabase();
