// test-customer-work-orders.js
// Run this in your backend folder to test the new customer work orders endpoint
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync_dev',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function testCustomerWorkOrders() {
  try {
    console.log('Testing customer work orders endpoint...');
    
    // First, find a customer that has work orders
    console.log('\n1. Finding customers with work orders...');
    const customersWithWO = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        COUNT(wo.id) as work_order_count
      FROM customers c
      LEFT JOIN work_orders wo ON c.id = wo.customer_id
      GROUP BY c.id, c.name
      HAVING COUNT(wo.id) > 0
      ORDER BY COUNT(wo.id) DESC
      LIMIT 5
    `);
    
    console.log('Customers with work orders:');
    customersWithWO.rows.forEach(customer => {
      console.log(`  - ${customer.name} (ID: ${customer.id}) - ${customer.work_order_count} work orders`);
    });
    
    if (customersWithWO.rows.length === 0) {
      console.log('\n❌ No customers with work orders found. Create a work order first.');
      return;
    }
    
    // Test the actual query that the API endpoint will use
    const testCustomerId = customersWithWO.rows[0].id;
    console.log(`\n2. Testing work orders query for customer ID ${testCustomerId}...`);
    
    const workOrdersResult = await pool.query(`
      SELECT
        wo.id,
        wo.wo_number,
        wo.status,
        wo.priority,
        wo.problem_description,
        wo.call_type,
        wo.scheduled_date,
        wo.scheduled_time_slot,
        wo.created_at,
        wo.updated_at,
        wo.completed_at,
        wo.total_cost,
        wo.customer_po,
        wo.assigned_tech_id,
        
        -- Customer info
        c.name as customer_name,
        c.service_city,
        c.zone as customer_zone,
        
        -- Technician info
        t.first_name as tech_first_name,
        t.last_name as tech_last_name,
        t.crew as tech_crew,
        t.van_number as tech_van_number,
        
        -- Equipment info
        e.equipment_number,
        e.equipment_type,
        e.location_description as equipment_location,
        
        -- Completion queue info
        wo.completion_queue,
        wo.status_notes,
        wo.suspended_at
        
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      WHERE wo.customer_id = $1
      ORDER BY wo.created_at DESC
      LIMIT 50
    `, [testCustomerId]);
    
    console.log(`\n✅ Query successful! Found ${workOrdersResult.rows.length} work orders`);
    
    if (workOrdersResult.rows.length > 0) {
      console.log('\nSample work order data:');
      const sample = workOrdersResult.rows[0];
      console.log(`  - WO#: ${sample.wo_number}`);
      console.log(`  - Status: ${sample.status}`);
      console.log(`  - Priority: ${sample.priority}`);
      console.log(`  - Customer: ${sample.customer_name}`);
      console.log(`  - Tech: ${sample.tech_first_name} ${sample.tech_last_name || 'N/A'}`);
      console.log(`  - Created: ${sample.created_at}`);
      console.log(`  - Problem: ${sample.problem_description.substring(0, 100)}...`);
    }
    
    console.log('\n🎉 Customer work orders endpoint test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testCustomerWorkOrders();