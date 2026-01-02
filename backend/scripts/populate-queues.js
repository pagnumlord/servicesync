#!/usr/bin/env node
/**
 * Populate Work Queues Script
 * Inserts all required work queues into the database
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Queue definitions with colors and display order
const queues = [
  { name: 'Blaine Quoting', type: 'custom', color: '#8B5CF6', order: 1 },
  { name: 'Call Backs', type: 'custom', color: '#F59E0B', order: 2 },
  { name: 'Invoice Review', type: 'custom', color: '#10B981', order: 3 },
  { name: 'Jen M Quoting', type: 'custom', color: '#EC4899', order: 4 },
  { name: 'Jen M Sent/Sold', type: 'custom', color: '#06B6D4', order: 5 },
  { name: 'Jen W Review/Hold', type: 'custom', color: '#6366F1', order: 6 },
  { name: 'Jerry Follow-Up', type: 'custom', color: '#EF4444', order: 7 },
  { name: 'Josh Quoting/Working', type: 'custom', color: '#3B82F6', order: 8 },
  { name: 'Josh Review', type: 'custom', color: '#0EA5E9', order: 9 },
  { name: 'Josh Service Estimates', type: 'custom', color: '#14B8A6', order: 10 },
  { name: 'Mikes Follow-up', type: 'custom', color: '#F97316', order: 11 },
  { name: 'Needs Parts', type: 'system', color: '#DC2626', order: 12 },
  { name: 'Needs Return Trip', type: 'custom', color: '#7C3AED', order: 13 },
  { name: 'Pending Projects', type: 'custom', color: '#A855F7', order: 14 },
  { name: 'PM', type: 'custom', color: '#059669', order: 15 },
  { name: 'PM Quoting', type: 'custom', color: '#0D9488', order: 16 },
  { name: 'PM Scheduling', type: 'custom', color: '#06B6D4', order: 17 },
  { name: 'Rational', type: 'custom', color: '#64748B', order: 18 },
  { name: 'RFS Mistake', type: 'custom', color: '#DC2626', order: 19 },
  { name: 'Warranty Review', type: 'custom', color: '#2563EB', order: 20 },
  { name: 'WFU - Jen M', type: 'custom', color: '#DB2777', order: 21 }
];

async function populateQueues() {
  console.log('🚀 Starting queue population...\n');

  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established\n');

    // Insert queues one by one
    let insertedCount = 0;
    let updatedCount = 0;

    for (const queue of queues) {
      const result = await pool.query(`
        INSERT INTO work_order_queues (queue_name, queue_type, color, display_order, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (queue_name) DO UPDATE
          SET
            queue_type = EXCLUDED.queue_type,
            color = EXCLUDED.color,
            display_order = EXCLUDED.display_order,
            is_active = TRUE
        RETURNING id, (xmax = 0) AS inserted
      `, [queue.name, queue.type, queue.color, queue.order]);

      const wasInserted = result.rows[0].inserted;
      if (wasInserted) {
        console.log(`✅ Inserted: ${queue.name.padEnd(30)} | ${queue.color} | Order: ${queue.order}`);
        insertedCount++;
      } else {
        console.log(`🔄 Updated:  ${queue.name.padEnd(30)} | ${queue.color} | Order: ${queue.order}`);
        updatedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   • Inserted: ${insertedCount} queues`);
    console.log(`   • Updated:  ${updatedCount} queues`);
    console.log(`   • Total:    ${queues.length} queues\n`);

    // Verify all queues
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count FROM work_order_queues
    `);
    console.log(`✅ Verified: ${verifyResult.rows[0].count} queues in database\n`);

    // Show all queues
    const allQueues = await pool.query(`
      SELECT id, queue_name, queue_type, color, display_order
      FROM work_order_queues
      ORDER BY display_order
    `);

    console.log('📋 All Queues:');
    console.log('ID  | Queue Name                    | Type    | Color   | Order');
    console.log('----+-------------------------------+---------+---------+------');
    allQueues.rows.forEach(q => {
      console.log(
        `${String(q.id).padEnd(3)} | ${q.queue_name.padEnd(29)} | ${q.queue_type.padEnd(7)} | ${q.color} | ${q.display_order}`
      );
    });

    console.log('\n✅ Queue population complete!');

  } catch (error) {
    console.error('❌ Error populating queues:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
populateQueues();
