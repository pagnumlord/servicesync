// run-schema.js - Run SQL schema files easily
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function runSchema(schemaFile) {
  try {
    console.log(`📋 Reading ${schemaFile}...`);
    const sqlPath = path.join(__dirname, schemaFile);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`🚀 Executing ${schemaFile}...`);
    await pool.query(sql);

    console.log(`✅ Schema ${schemaFile} executed successfully!`);
  } catch (error) {
    console.error(`❌ Error running schema:`, error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Get schema file from command line argument
const schemaFile = process.argv[2];

if (!schemaFile) {
  console.log('Usage: node run-schema.js <schema-file.sql>');
  console.log('Example: node run-schema.js attachments-schema.sql');
  process.exit(1);
}

runSchema(schemaFile);
