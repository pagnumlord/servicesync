// Customer Import Script - Vision to ServiceSync
// Imports customer data from Vision Excel export

const XLSX = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'servicesync_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Column mapping from Vision export to ServiceSync
const COLUMN_MAPPING = {
  'Full Name': 'name',
  'Customer #': 'customer_number',
  'Address': 'service_address_line1',
  'City': 'service_city',
  'State': 'service_state',
  'Contact': 'primary_contact_name',
  'Phone #': 'phone',
  'Customer Balance': 'balance_due',
  'Opened': 'created_at',
  'Location': 'zone',
  'Credit Hold?': 'credit_hold'
};

// Format phone number to standard format
function formatPhone(phone) {
  if (!phone) return null;

  // Remove all non-digits
  const digits = String(phone).replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX if 10 digits
  if (digits.length === 10) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }

  return digits || null;
}

// Parse date from various formats
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch (e) {
    return null;
  }
}

// Clean and validate customer data
function cleanCustomerData(row) {
  const customer = {
    name: row['Full Name']?.trim() || 'Unknown',
    customer_number: row['Customer #'] ? String(row['Customer #']).trim() : null,
    service_address_line1: row['Address']?.trim() || null,
    service_city: row['City']?.trim() || null,
    service_state: row['State']?.trim() || null,
    primary_contact_name: row['Contact']?.trim() || null,
    phone: formatPhone(row['Phone #']),
    balance_due: parseFloat(row['Customer Balance']) || 0,
    zone: row['Location']?.trim() || null,
    is_active: true,
    created_at: parseDate(row['Opened'])
  };

  // Set billing same as service by default
  customer.billing_same_as_service = true;

  return customer;
}

// Import customers from Excel file
async function importCustomers(filePath) {
  console.log('🚀 Starting customer import from Vision...\n');
  console.log(`📄 Reading file: ${filePath}`);

  try {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${rows.length} customers to import\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const customer = cleanCustomerData(row);

        // Check if customer already exists
        const existingResult = await pool.query(
          'SELECT id FROM customers WHERE customer_number = $1 OR name = $2',
          [customer.customer_number, customer.name]
        );

        if (existingResult.rows.length > 0) {
          console.log(`⏭️  Skipping "${customer.name}" (already exists)`);
          skipped++;
          continue;
        }

        // Insert customer
        await pool.query(`
          INSERT INTO customers (
            name,
            customer_number,
            service_address_line1,
            service_city,
            service_state,
            primary_contact_name,
            phone,
            balance_due,
            zone,
            billing_same_as_service,
            is_active,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          customer.name,
          customer.customer_number,
          customer.service_address_line1,
          customer.service_city,
          customer.service_state,
          customer.primary_contact_name,
          customer.phone,
          customer.balance_due,
          customer.zone,
          customer.billing_same_as_service,
          customer.is_active,
          customer.created_at || new Date()
        ]);

        console.log(`✅ Imported: ${customer.name} (${customer.customer_number})`);
        imported++;

      } catch (error) {
        console.error(`❌ Error importing "${row['Full Name']}":`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`⏭️  Skipped (duplicates):  ${skipped}`);
    console.log(`❌ Errors:                ${errors}`);
    console.log(`📋 Total processed:       ${rows.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Main execution
const filePath = process.argv[2] || './importstuff/CustomersList.xlsx';

importCustomers(filePath)
  .then(() => {
    console.log('\n✨ Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error);
    process.exit(1);
  });
