// backend/test-db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('📅 Current time from database:', result.rows[0].now);
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:');
    console.error('Error details:', err.message);
    console.error('\n🔧 Check your .env file settings:');
    console.error('DB_HOST:', process.env.DB_HOST);
    console.error('DB_PORT:', process.env.DB_PORT);
    console.error('DB_NAME:', process.env.DB_NAME);
    console.error('DB_USER:', process.env.DB_USER);
    console.error('DB_PASSWORD:', process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]');
    process.exit(1);
  }
}

testConnection();