// Fix admin user password
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync_dev',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: false,
});

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin user password...\n');

    // Generate correct bcrypt hash for password "22"
    const correctHash = '$2b$10$YfT5NIEfafiWtUiHXx6nW.EZQUPgLJVFcxbu22chqj3bSzhKmcIMu';

    // Update the user's password
    const result = await pool.query(`
      UPDATE users
      SET password_hash = $1
      WHERE employee_number = '22'
      RETURNING id, employee_number, username, first_name, last_name, role
    `, [correctHash]);

    if (result.rows.length > 0) {
      console.log('✅ Admin user password updated successfully!');
      console.log('━'.repeat(50));
      console.log(`User: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
      console.log(`Employee Number: ${result.rows[0].employee_number}`);
      console.log(`Role: ${result.rows[0].role}`);
      console.log('━'.repeat(50));
      console.log('\n🔐 You can now login with:');
      console.log('   Employee Number: 22');
      console.log('   Password: 22');
      console.log('');
    } else {
      console.log('❌ User with employee_number="22" not found!');
      console.log('The user may need to be created first.');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixAdminPassword();
