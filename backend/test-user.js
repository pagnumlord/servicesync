// Test if default admin user exists
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync_dev',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: false,
});

async function testUser() {
  try {
    console.log('🔍 Checking for default admin user...\n');

    const result = await pool.query(`
      SELECT id, employee_number, username, first_name, last_name, role, is_active
      FROM users
      WHERE employee_number = '22'
    `);

    if (result.rows.length === 0) {
      console.log('❌ User with employee_number="22" NOT FOUND');
      console.log('\nThe authentication schema may not have initialized correctly.');
      console.log('Try restarting the backend server to trigger initialization.');
    } else {
      console.log('✅ Default admin user found:');
      console.log('━'.repeat(50));
      console.log(`ID:              ${result.rows[0].id}`);
      console.log(`Employee Number: ${result.rows[0].employee_number}`);
      console.log(`Username:        ${result.rows[0].username}`);
      console.log(`Full Name:       ${result.rows[0].first_name} ${result.rows[0].last_name}`);
      console.log(`Role:            ${result.rows[0].role}`);
      console.log(`Active:          ${result.rows[0].is_active}`);
      console.log('━'.repeat(50));
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

testUser();
