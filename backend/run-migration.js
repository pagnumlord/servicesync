/**
 * Migration Runner
 * Usage: node run-migration.js <migration-file>
 * Example: node run-migration.js migrations/001-add-queue-permissions.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync_dev',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
});

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('❌ Usage: node run-migration.js <migration-file>');
    console.error('   Example: node run-migration.js migrations/001-add-queue-permissions.sql');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`🔄 Running migration: ${migrationFile}`);

  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    await pool.query(sql);
    console.log(`✅ Migration completed successfully: ${migrationFile}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
