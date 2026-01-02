const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'servicesync_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync',
  password: process.env.DB_PASSWORD || 'servicesync123',
  port: process.env.DB_PORT || 5432,
});

async function addCustomerIsActive() {
  console.log('🔧 Adding is_active column to customers table...\n');

  try {
    const sqlPath = path.join(__dirname, '../sql/add-customer-is-active.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);

    console.log('✅ Successfully added is_active column to customers table!');
    console.log('   - Column added with default value TRUE');
    console.log('   - All existing customers set to active');
    console.log('   - Index created for performance\n');
  } catch (error) {
    console.error('❌ Error adding is_active column:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addCustomerIsActive();
