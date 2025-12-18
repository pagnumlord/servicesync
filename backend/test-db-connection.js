// Database Connection Diagnostic Tool
// This script tests the PostgreSQL connection and provides detailed error information

const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 PostgreSQL Connection Diagnostic Tool\n');
  console.log('Configuration from .env file:');
  console.log('━'.repeat(50));
  console.log(`Host:     ${process.env.DB_HOST || 'localhost'}`);
  console.log(`Port:     ${process.env.DB_PORT || 5432}`);
  console.log(`Database: ${process.env.DB_NAME || 'servicesync_dev'}`);
  console.log(`User:     ${process.env.DB_USER || 'postgres'}`);
  console.log(`Password: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-2) : 'NOT SET'}`);
  console.log('━'.repeat(50));
  console.log('');

  // Test 1: Basic connection
  console.log('Test 1: Basic connection (no SSL)...');
  const client1 = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'servicesync_dev',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: false,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client1.connect();
    console.log('✅ Connection successful (no SSL)!\n');

    // Test query
    const result = await client1.query('SELECT version()');
    console.log('PostgreSQL Version:');
    console.log(result.rows[0].version);
    console.log('');

    // Check for authentication tables
    const tablesResult = await client1.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'roles', 'permissions')
      ORDER BY table_name
    `);

    console.log('Authentication tables found:');
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
    } else {
      console.log('  ⚠️  No authentication tables found - schema may need initialization');
    }

    await client1.end();
    console.log('\n✅ All tests passed! Database connection is working.\n');
    process.exit(0);
  } catch (error) {
    console.log('❌ Connection failed (no SSL)');
    console.log('');
    console.log('Error details:');
    console.log('━'.repeat(50));
    console.log(`Error Code: ${error.code}`);
    console.log(`Error Message: ${error.message}`);
    console.log('━'.repeat(50));
    console.log('');

    // Provide specific troubleshooting advice
    if (error.code === '28P01') {
      console.log('🔧 Troubleshooting: Password Authentication Failed');
      console.log('');
      console.log('This error means the password is incorrect or the authentication method is wrong.');
      console.log('');
      console.log('Solutions:');
      console.log('1. Verify the PostgreSQL password:');
      console.log('   - Open pgAdmin and try connecting with the same password');
      console.log('   - If pgAdmin works, the issue is with pg_hba.conf authentication method');
      console.log('');
      console.log('2. Check pg_hba.conf file (PostgreSQL authentication configuration):');
      console.log('   Location: C:\\Program Files\\PostgreSQL\\17\\data\\pg_hba.conf');
      console.log('');
      console.log('   Look for lines like:');
      console.log('   host    all    all    127.0.0.1/32    <METHOD>');
      console.log('');
      console.log('   The <METHOD> should be one of:');
      console.log('   - "md5" (password authentication)');
      console.log('   - "scram-sha-256" (more secure password authentication)');
      console.log('   - "trust" (no password - for testing only!)');
      console.log('');
      console.log('   If it says "peer" or "ident", change it to "md5"');
      console.log('');
      console.log('3. After changing pg_hba.conf:');
      console.log('   - Open pgAdmin');
      console.log('   - Right-click on PostgreSQL 17 server');
      console.log('   - Select "Reload Configuration"');
      console.log('   - Or restart PostgreSQL service in Windows Services');
      console.log('');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('🔧 Troubleshooting: Connection Refused');
      console.log('');
      console.log('PostgreSQL server is not accepting connections.');
      console.log('');
      console.log('Solutions:');
      console.log('1. Check if PostgreSQL is running:');
      console.log('   - Open Windows Services (services.msc)');
      console.log('   - Look for "postgresql-x64-17"');
      console.log('   - Make sure it\'s running');
      console.log('');
      console.log('2. Verify the port number in .env matches PostgreSQL:');
      console.log('   - Check PostgreSQL port in pgAdmin (usually 5432)');
      console.log('   - Update DB_PORT in .env if needed');
      console.log('');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('🔧 Troubleshooting: Connection Timeout');
      console.log('');
      console.log('Cannot reach PostgreSQL server.');
      console.log('');
      console.log('Solutions:');
      console.log('1. Check if PostgreSQL is configured to accept connections:');
      console.log('   - File: C:\\Program Files\\PostgreSQL\\17\\data\\postgresql.conf');
      console.log('   - Look for: listen_addresses = \'*\' or \'localhost\'');
      console.log('');
      console.log('2. Check firewall settings');
      console.log('');
    } else {
      console.log('🔧 Troubleshooting: Unknown Error');
      console.log('');
      console.log('Please check:');
      console.log('1. PostgreSQL service is running');
      console.log('2. .env file has correct credentials');
      console.log('3. Database "servicesync_dev" exists');
      console.log('');
    }

    process.exit(1);
  }
}

testConnection();
