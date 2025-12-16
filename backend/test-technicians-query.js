// test-technicians-query.js
// Run this in your backend folder to test the technicians query
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync_dev',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function testTechniciansQuery() {
  try {
    console.log('Testing technicians table structure...');
    
    // First, check what columns exist in the technicians table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'technicians'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nTechnicians table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Try a simple query first
    console.log('\nTesting simple technicians query...');
    const simpleResult = await pool.query('SELECT * FROM technicians LIMIT 1');
    console.log('Sample technician:', simpleResult.rows[0]);
    
    // Test the actual query from the API
    console.log('\nTesting full API query...');
    const fullResult = await pool.query(`
      SELECT
        t.id,
        t.first_name,
        t.last_name,
        t.crew,
        t.van_number,
        t.phone,
        t.current_location,
        t.latitude,
        t.longitude,
        t.last_location_update,
        t.status,
        COUNT(wo.id) as active_work_orders
      FROM technicians t
      LEFT JOIN work_orders wo ON t.id = wo.assigned_tech_id
        AND wo.status IN ('Assigned', 'In Progress', 'Suspended')
      WHERE t.is_active = true
      GROUP BY t.id
      ORDER BY t.crew, t.last_name, t.first_name
    `);
    
    console.log(`\nQuery successful! Found ${fullResult.rows.length} technicians`);
    
  } catch (error) {
    console.error('\n❌ Query failed:', error.message);
    console.error('\nThis suggests missing columns or tables in your database.');
    console.error('You may need to run database migrations or update the schema.');
  } finally {
    await pool.end();
  }
}

testTechniciansQuery();