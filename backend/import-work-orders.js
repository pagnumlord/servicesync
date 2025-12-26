/**
 * Vision Work Order Import Script
 *
 * Imports work orders from Vision software Excel exports into ServiceSync database
 *
 * Usage:
 *   node import-work-orders.js <path-to-excel-file>
 *
 * Example:
 *   node import-work-orders.js importstuff/WorkOrdersList.xlsx
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync_dev',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

/**
 * Parse Vision date format
 */
function parseDate(dateValue) {
  if (!dateValue) return null;

  try {
    // Handle Excel serial date numbers
    if (typeof dateValue === 'number') {
      const date = XLSX.SSF.parse_date_code(dateValue);
      return new Date(date.y, date.m - 1, date.d);
    }

    // Handle string dates (M/D/YYYY format)
    if (typeof dateValue === 'string') {
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      }
    }

    // Fallback to direct parsing
    return new Date(dateValue);
  } catch (error) {
    console.warn(`⚠️  Could not parse date: ${dateValue}`);
    return null;
  }
}

/**
 * Parse Vision amount (handles $XXX.XX format)
 */
function parseAmount(amount) {
  if (!amount) return 0;
  if (typeof amount === 'number') return amount;

  // Remove $ and commas
  const cleaned = String(amount).replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Map Vision status to ServiceSync status
 */
function mapStatus(visionStatus) {
  if (!visionStatus) return 'Active';

  const statusMap = {
    'Completed': 'Completed',
    'Complete': 'Completed',
    'Open': 'Active',
    'Active': 'Active',
    'Suspended': 'Suspended',
    'Deleted': 'Deleted',
    'Cancelled': 'Deleted',
    'Canceled': 'Deleted'
  };

  return statusMap[visionStatus] || 'Active';
}

/**
 * Parse Vision call type (e.g., ".Service - Refrigeration" -> "Service Call")
 */
function parseCallType(visionCallType) {
  if (!visionCallType) return 'Service Call';

  const typeStr = String(visionCallType).toLowerCase();

  if (typeStr.includes('preventive') || typeStr.includes('pm')) {
    return 'Preventive Maintenance';
  }
  if (typeStr.includes('service')) {
    return 'Service Call';
  }
  if (typeStr.includes('install')) {
    return 'Install';
  }
  if (typeStr.includes('estimate')) {
    return 'Estimate';
  }

  return 'Service Call';
}

/**
 * Extract equipment type from call type string
 * e.g., ".Service - Refrigeration" -> "Refrigeration"
 */
function extractEquipmentType(callTypeStr) {
  if (!callTypeStr) return null;

  const str = String(callTypeStr);
  const match = str.match(/[-–]\s*(.+)$/);
  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

/**
 * Clean and format work order data from Vision export
 */
function cleanWorkOrderData(row) {
  // Vision exports have these exact column names
  const woNumber = row['Work Order'] || row['WO #'] || row['WO Number'];
  const customerName = row['Customer'] || row['Customer Name'];
  const dateValue = row['Date Entered'] || row['Date'] || row['Service Date'] || row['Created'];
  const callTypeRaw = row['Problem'] || row['Type'] || row['Call Type'] || row['Service Type'];
  const status = row['Status'];
  const tech = row['Tech'];
  const amount = row['WO Amt'] || row['Amount'] || row['Total'] || 0;
  const hours = row['Act Hours'] || row['Hours'] || row['Time'] || 0;
  const description = row['Problem'] || row['Description'] || row['Notes'] || '';

  const workOrder = {
    wo_number: woNumber ? String(woNumber).trim() : null,
    customer_name: customerName ? String(customerName).trim() : null,
    scheduled_date: parseDate(dateValue),
    call_type: parseCallType(callTypeRaw),
    equipment_type: extractEquipmentType(callTypeRaw),
    status: mapStatus(status),
    problem_description: description ? String(description).trim() : null,
    // Store Vision amounts in notes for reference
    internal_notes: amount && parseAmount(amount) > 0
      ? `Vision Amount: $${parseAmount(amount).toFixed(2)}${hours ? ` | Hours: ${hours}` : ''}`
      : null
  };

  // Set completed_at if status is Completed
  if (workOrder.status === 'Completed' && workOrder.scheduled_date) {
    workOrder.completed_at = workOrder.scheduled_date;
  }

  return workOrder;
}

/**
 * Find customer ID by name
 */
async function findCustomerId(customerName) {
  if (!customerName) return null;

  try {
    const result = await pool.query(
      `SELECT id FROM customers
       WHERE LOWER(name) = LOWER($1)
       OR LOWER(name) LIKE LOWER($2)
       LIMIT 1`,
      [customerName, `%${customerName}%`]
    );

    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error(`Error finding customer "${customerName}":`, error.message);
    return null;
  }
}

/**
 * Import work orders from Vision Excel export
 */
async function importWorkOrders(filePath) {
  console.log('\n🔧 Vision Work Order Import Starting...\n');
  console.log(`📂 Reading file: ${filePath}\n`);

  try {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${rows.length} work orders in file\n`);

    // Debug: Show first row columns
    if (rows.length > 0) {
      console.log('📋 Detected columns:', Object.keys(rows[0]).join(', '));
      console.log('');
    }

    console.log('─'.repeat(80));

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const workOrder = cleanWorkOrderData(row);

        // Validate required fields
        if (!workOrder.wo_number) {
          console.log(`⏭️  Row ${i + 1}: Skipping - no work order number`);
          skipped++;
          continue;
        }

        if (!workOrder.customer_name) {
          console.log(`⏭️  Row ${i + 1}: Skipping WO ${workOrder.wo_number} - no customer name`);
          skipped++;
          continue;
        }

        // Check if work order already exists
        const existingResult = await pool.query(
          'SELECT id FROM work_orders WHERE wo_number = $1',
          [workOrder.wo_number]
        );

        if (existingResult.rows.length > 0) {
          console.log(`⏭️  Skipping WO ${workOrder.wo_number} (already exists)`);
          skipped++;
          continue;
        }

        // Find customer ID
        const customerId = await findCustomerId(workOrder.customer_name);

        if (!customerId) {
          console.log(`⚠️  WO ${workOrder.wo_number}: Customer "${workOrder.customer_name}" not found in database`);
        }

        // Insert work order
        const insertResult = await pool.query(
          `INSERT INTO work_orders (
            wo_number,
            customer_id,
            customer_name,
            scheduled_date,
            call_type,
            equipment_type,
            status,
            problem_description,
            internal_notes,
            completed_at,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id`,
          [
            workOrder.wo_number,
            customerId,
            workOrder.customer_name,
            workOrder.scheduled_date,
            workOrder.call_type,
            workOrder.equipment_type,
            workOrder.status,
            workOrder.problem_description,
            workOrder.internal_notes,
            workOrder.completed_at,
            workOrder.scheduled_date || new Date() // Use scheduled date or now
          ]
        );

        const statusIcon = workOrder.status === 'Completed' ? '✅' :
                          workOrder.status === 'Active' ? '🔵' : '⏸️';

        console.log(
          `${statusIcon} Imported: WO ${workOrder.wo_number} - ${workOrder.customer_name} ` +
          `(${workOrder.call_type}${customerId ? '' : ' - NO CUSTOMER MATCH'})`
        );
        imported++;

      } catch (error) {
        console.log(`❌ Error importing row ${i + 1}:`, error.message);
        errors++;
      }
    }

    console.log('─'.repeat(80));
    console.log('\n📈 Import Summary:');
    console.log(`   ✅ Imported: ${imported} work orders`);
    console.log(`   ⏭️  Skipped:  ${skipped} work orders (duplicates or missing data)`);
    console.log(`   ❌ Errors:   ${errors} work orders`);
    console.log(`\n✨ Vision work order import complete!\n`);

  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run import
const filePath = process.argv[2];

if (!filePath) {
  console.error('\n❌ Error: Please provide an Excel file path');
  console.log('\nUsage:');
  console.log('  node import-work-orders.js <path-to-excel-file>\n');
  console.log('Example:');
  console.log('  node import-work-orders.js importstuff/WorkOrdersList.xlsx\n');
  process.exit(1);
}

importWorkOrders(filePath).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
