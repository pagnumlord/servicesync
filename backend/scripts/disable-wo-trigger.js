#!/usr/bin/env node
/**
 * Disable Work Order Line Items Totals Trigger
 * This trigger is trying to update columns that don't exist
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function disableTrigger() {
  console.log('🔧 Disabling work order line items totals trigger...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../sql/disable-wo-totals-trigger.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Trigger disabled successfully!');
    console.log('   Line items can now be added without trigger errors.\n');

  } catch (error) {
    console.error('❌ Error disabling trigger:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

disableTrigger();
