// test-customers-db.js
// Run this in your backend folder to test the customers table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync_dev',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function testCustomersTable() {
  try {
    console.log('Testing customers table structure...');
    
    // First, check what columns exist in the customers table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nCustomers table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check if table exists
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customers'
      );
    `);
    
    console.log('\nCustomers table exists:', tableExistsResult.rows[0].exists);
    
    // Try to count customers
    const countResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    console.log(`\nTotal customers in database: ${countResult.rows[0].count}`);
    
    // Try a simple query
    console.log('\nTesting simple customers query...');
    const simpleResult = await pool.query('SELECT * FROM customers LIMIT 3');
    console.log(`Found ${simpleResult.rows.length} customers`);
    
    if (simpleResult.rows.length > 0) {
      console.log('\nSample customer:');
      console.log(JSON.stringify(simpleResult.rows[0], null, 2));
    }
    
    // Test the search query
    if (simpleResult.rows.length > 0) {
      console.log('\nTesting search query...');
      const searchResult = await pool.query(`
        SELECT
          id,
          name,
          customer_number,
          service_city,
          service_state,
          service_address_line1,
          service_address_line2,
          service_zip,
          zone,
          primary_contact_name,
          primary_contact_phone,
          primary_contact_email,
          business_type,
          is_active
        FROM customers
        WHERE (
          name ILIKE $1
          OR customer_number ILIKE $1
          OR primary_contact_name ILIKE $1
          OR service_city ILIKE $1
        )
        ORDER BY name ASC
        LIMIT 20
      `, ['%a%']);
      
      console.log(`Search query successful! Found ${searchResult.rows.length} customers`);
    }
    
  } catch (error) {
    console.error('\n❌ Query failed:', error.message);
    console.error('\nThis suggests:');
    console.error('1. The customers table might not exist');
    console.error('2. The database connection might be incorrect');
    console.error('3. Missing columns in the customers table');
    console.error('\nYou may need to:');
    console.error('- Check your database name in .env file');
    console.error('- Create the customers table');
    console.error('- Run database migrations');
  } finally {
    await pool.end();
  }
}

testCustomersTable();