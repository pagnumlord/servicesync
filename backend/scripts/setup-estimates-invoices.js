require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync_dev',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: false,
});

async function setup() {
  console.log('🚀 Setting up Pricebook, Estimates, and Invoices...\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sqlPath = path.join(__dirname, '../sql/estimates-invoices-pricebook-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);

    await client.query('COMMIT');

    // Report what was created
    const tables = ['pricebook_categories', 'pricebook_items', 'estimates', 'estimate_line_items', 'invoices', 'invoice_line_items', 'invoice_payments'];
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   ✅ ${table}: ${result.rows[0].count} rows`);
    }

    console.log('\n✅ Setup complete!\n');
    console.log('📋 What was created:');
    console.log('   • pricebook_categories — 6 default categories');
    console.log('   • pricebook_items      — 11 default items (labor rates, service calls, refrigerants)');
    console.log('   • estimates + estimate_line_items');
    console.log('   • invoices + invoice_line_items + invoice_payments');
    console.log('   • estimate_summary and invoice_summary views');
    console.log('   • Auto-numbering triggers (EST-000001, INV-000001)\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
