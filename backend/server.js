// Complete ServiceSync Backend API Server with Enhanced Date Visibility Management
// File: backend/server.js

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const CollaborationManager = require('./realtime-collaboration');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    // Allow connections from localhost and any IP on the local network
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      // Allow localhost and local network IPs
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        /http:\/\/192\.168\.\d+\.\d+:3000/.test(origin) ||
        /http:\/\/10\.\d+\.\d+\.\d+:3000/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Initialize collaboration manager
const collaborationManager = new CollaborationManager();

// Clean up stale typing indicators every 3 seconds
setInterval(() => {
  collaborationManager.cleanupStaleTyping();
}, 3000);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Database connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'servicesync_dev',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  // SSL configuration for Windows PostgreSQL
  ssl: false,
  // Connection timeout settings
  connectionTimeoutMillis: 5000,
  // Retry on connection failure
  max: 20,
  idleTimeoutMillis: 30000,
});

// Test database connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// Initialize zones schema on startup
async function initializeZonesSchema() {
  try {
    console.log('🔄 Initializing zones schema...');
    const schemaPath = path.join(__dirname, 'zones-schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Zones schema initialized successfully');
  } catch (error) {
    // If schema already exists, that's fine - just log and continue
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️  Zones schema already exists');
    } else {
      console.error('❌ Error initializing zones schema:', error.message);
    }
  }
}

// Initialize authentication schema on startup
async function initializeAuthSchema() {
  try {
    console.log('🔄 Initializing authentication schema...');
    const schemaPath = path.join(__dirname, 'auth-schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Authentication schema initialized successfully');
    console.log('👤 Default admin user: employee_number="22", password="22" (CHANGE THIS!)');
  } catch (error) {
    // If schema already exists, that's fine - just log and continue
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️  Authentication schema already exists');
    } else {
      console.error('❌ Error initializing auth schema:', error.message);
    }
  }
}

// Initialize work order status and assignment tracking schema on startup
async function initializeWorkOrderStatusSchema() {
  try {
    console.log('🔄 Initializing work order status schema...');
    const schemaPath = path.join(__dirname, 'work-order-status-schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Work order status schema initialized successfully');
    console.log('📋 Status tracking: Active, Suspended, Complete');
    console.log('📅 Assignment tracking: Physical visits only');
  } catch (error) {
    // If schema already exists, that's fine - just log and continue
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️  Work order status schema already exists');
    } else {
      console.error('❌ Error initializing work order status schema:', error.message);
    }
  }
}

async function updateWorkOrderDates() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🔄 Updating incomplete work orders to current date: ${today}`);
    
    // Update all incomplete work orders to today's date
    // Completed work orders keep their original scheduled_date
    const result = await pool.query(`
      UPDATE work_orders 
      SET scheduled_date = $1
      WHERE status NOT IN ('Complete', 'Completed', 'Deleted') 
        AND (scheduled_date IS NULL OR scheduled_date != $1)
    `, [today]);
    
    console.log(`✅ Updated ${result.rowCount} work orders to today's date`);
    
    return result.rowCount;
  } catch (error) {
    console.error('❌ Error updating work order dates:', error);
    return 0;
  }
}

// Initialize database and update work orders on server start
(async () => {
  await initializeAuthSchema();
  await initializeZonesSchema();
  await initializeWorkOrderStatusSchema();
  await updateWorkOrderDates();
})();




// ========================================
// ENHANCED DATE VISIBILITY MANAGEMENT FUNCTIONS
// ========================================

/**
 * Creates or updates work order date visibility records
 * This manages when and how work orders appear on the dispatch board
 */
const manageWorkOrderVisibility = async (workOrderId, action, options = {}) => {
  const {
    date = new Date().toISOString().split('T')[0],
    techId = null,
    endDate = null,
    reason = null
  } = options;

  try {
    await pool.query('SELECT manage_work_order_visibility($1, $2, $3, $4, $5)', [
      workOrderId,
      action,
      date,
      techId,
      endDate
    ]);
    
    console.log(`📅 Updated visibility for WO ${workOrderId}: ${action} on ${date}`);
  } catch (error) {
    console.error('❌ Error managing work order visibility:', error);
    throw error;
  }
};

/**
 * Gets work orders with proper date visibility for dispatch board
 */
const getWorkOrdersForDate = async (targetDate) => {
  try {
    const result = await pool.query(`
      SELECT * FROM get_work_orders_for_date($1)
    `, [targetDate]);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting work orders for date:', error);
    // Fallback to basic query if enhanced view doesn't exist yet
    const fallbackResult = await pool.query(`
      SELECT wo.*, c.name as customer_name, c.service_city, c.zone as customer_zone,
             t.first_name as tech_first_name, t.last_name as tech_last_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      WHERE (wo.scheduled_date = $1 OR wo.created_at::date = $1)
        AND wo.status != 'Deleted'
      ORDER BY wo.assigned_tech_id NULLS FIRST, wo.created_at
    `, [targetDate]);
    
    return fallbackResult.rows;
  }
};

/**
 * Helper function to determine card styling based on status and visibility
 */
function getCardStyleClass(styleType, displayStatus) {
  switch (styleType) {
    case 'completed':
      return 'work-order-card completed-dark';
    case 'suspended_purple':
      return 'work-order-card suspended-purple';
    case 'suspended_original':
      return 'work-order-card suspended-original';
    case 'suspended_return':
      return 'work-order-card suspended-return-purple';
    default:
      return displayStatus === 'assigned' ? 'work-order-card assigned' : 'work-order-card open';
  }
}

/**
 * Enhanced broadcast function with date visibility info
 */
const broadcastWorkOrderUpdate = (workOrder, action = 'updated', affectedDates = []) => {
  console.log(`📡 Broadcasting work order ${action}: WO# ${workOrder?.wo_number || 'unknown'}`);

  // Enhanced broadcast with date visibility info
  const updateData = {
    action,
    workOrder,
    affectedDates,
    timestamp: new Date()
  };

  // Emit to all connected clients
  io.emit('workOrderUpdate', updateData);

  // Send targeted updates to technician's room
  if (workOrder.assigned_tech_id) {
    io.to(`tech_${workOrder.assigned_tech_id}`).emit('assignedWorkOrderUpdate', updateData);
  }
};

// ================================
// BASIC ROUTES
// ================================

/**
 * @route GET /api/health
 * @description Provides a simple health check for the server.
 * @returns {Object} JSON object with status, timestamp, and uptime.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @route GET /api/test
 * @description A basic test endpoint to confirm API functionality.
 * @returns {Object} JSON object with a test message and timestamp.
 */
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint hit');
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// ================================
// UNIVERSAL SEARCH
// ================================

/**
 * @route GET /api/search
 * @description Universal search across all system entities
 * @queryparam {string} q - Search query
 * @queryparam {string} [type] - Optional filter: 'work_orders', 'customers', 'inventory', 'purchase_orders', 'all'
 * @returns {Object} Categorized search results
 */
app.get('/api/search', async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;

    if (!q || q.trim() === '') {
      return res.json({
        results: {
          workOrders: [],
          customers: [],
          inventory: [],
          purchaseOrders: []
        },
        query: '',
        totalResults: 0
      });
    }

    const searchQuery = q.trim();
    console.log(`🔍 Universal search: "${searchQuery}" (type: ${type})`);

    const results = {
      workOrders: [],
      customers: [],
      inventory: [],
      purchaseOrders: []
    };

    // Search Work Orders
    if (type === 'all' || type === 'work_orders') {
      const woQuery = `
        SELECT
          wo.id,
          wo.wo_number,
          wo.customer_name,
          wo.status,
          wo.call_type,
          wo.equipment_type,
          wo.scheduled_date,
          wo.problem_description,
          wo.internal_notes
        FROM work_orders wo
        WHERE
          wo.wo_number ILIKE $1
          OR wo.customer_name ILIKE $1
          OR wo.problem_description ILIKE $1
          OR wo.internal_notes ILIKE $1
          OR wo.equipment_type ILIKE $1
        ORDER BY wo.scheduled_date DESC
        LIMIT 20
      `;

      const woResult = await pool.query(woQuery, [`%${searchQuery}%`]);
      results.workOrders = woResult.rows;
    }

    // Search Customers
    if (type === 'all' || type === 'customers') {
      const customerQuery = `
        SELECT
          id,
          name,
          customer_number,
          phone,
          service_address_line1,
          service_city,
          service_state,
          zone,
          balance_due
        FROM customers
        WHERE
          name ILIKE $1
          OR customer_number ILIKE $1
          OR phone ILIKE $1
          OR service_address_line1 ILIKE $1
          OR service_city ILIKE $1
        ORDER BY name ASC
        LIMIT 20
      `;

      const customerResult = await pool.query(customerQuery, [`%${searchQuery}%`]);
      results.customers = customerResult.rows;
    }

    // Search Inventory
    if (type === 'all' || type === 'inventory') {
      const inventoryQuery = `
        SELECT
          id,
          part_number,
          description,
          category,
          manufacturer,
          cost,
          retail_price,
          markup_percentage,
          quantity_in_stock,
          location
        FROM inventory
        WHERE
          part_number ILIKE $1
          OR description ILIKE $1
          OR manufacturer ILIKE $1
          OR category ILIKE $1
          OR location ILIKE $1
          OR CAST(cost AS TEXT) ILIKE $1
          OR CAST(retail_price AS TEXT) ILIKE $1
        ORDER BY part_number ASC
        LIMIT 20
      `;

      const inventoryResult = await pool.query(inventoryQuery, [`%${searchQuery}%`]);
      results.inventory = inventoryResult.rows;
    }

    // Search Purchase Orders (if table exists)
    if (type === 'all' || type === 'purchase_orders') {
      try {
        const poQuery = `
          SELECT
            id,
            po_number,
            vendor_name,
            total_amount,
            status,
            order_date,
            expected_delivery_date,
            work_order_id
          FROM purchase_orders
          WHERE
            po_number ILIKE $1
            OR vendor_name ILIKE $1
            OR CAST(total_amount AS TEXT) ILIKE $1
          ORDER BY order_date DESC
          LIMIT 20
        `;

        const poResult = await pool.query(poQuery, [`%${searchQuery}%`]);
        results.purchaseOrders = poResult.rows;
      } catch (error) {
        // Table might not exist yet, skip PO search
        console.log('⚠️  Purchase orders table not found, skipping PO search');
      }
    }

    const totalResults =
      results.workOrders.length +
      results.customers.length +
      results.inventory.length +
      results.purchaseOrders.length;

    console.log(`✅ Found ${totalResults} results (WO: ${results.workOrders.length}, Customers: ${results.customers.length}, Inventory: ${results.inventory.length}, PO: ${results.purchaseOrders.length})`);

    res.json({
      results,
      query: searchQuery,
      totalResults
    });

  } catch (error) {
    console.error('❌ Universal search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// ================================
// CUSTOMER MANAGEMENT ROUTES
// ================================

/**
 * @route GET /api/customers
 * @description Retrieves a paginated and sortable list of customers.
 * @queryparam {number} [page=1] - The current page number.
 * @queryparam {number} [limit=50] - The number of customers per page.
 * @queryparam {string} [sort='alphabetical'] - Sorting order.
 * @queryparam {string} [active_only='false'] - Filter for active customers only.
 * @returns {Object} JSON object with customer data and pagination information.
 */
app.get('/api/customers', async (req, res) => {
  try {
    const { page = 1, limit = 50, sort = 'alphabetical', active_only = 'false' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    console.log(`📋 Loading customers - Page: ${page}, Limit: ${limit}, Sort: ${sort}, Active Only: ${active_only}`);

    // Build WHERE clause based on active_only filter
    const whereClause = active_only === 'true' ? 'WHERE is_active = true' : '';

    // Build ORDER BY clause based on sort parameter
    let orderClause = 'ORDER BY name ASC'; // Default alphabetical
    switch (sort) {
      case 'recent':
        orderClause = 'ORDER BY created_at DESC';
        break;
      case 'city':
        orderClause = 'ORDER BY service_city ASC, name ASC';
        break;
      case 'type':
        orderClause = 'ORDER BY customer_type ASC, name ASC';
        break;
      default:
        orderClause = 'ORDER BY name ASC';
    }

    // Get customers with pagination
    const customersResult = await pool.query(`
      SELECT *
      FROM customers
      ${whereClause}
      ${orderClause}
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM customers
      ${whereClause}
    `);

    const totalCustomers = parseInt(countResult.rows[0].total_count);
    const totalPages = Math.ceil(totalCustomers / parseInt(limit));

    console.log(`✅ Found ${customersResult.rows.length} customers (${totalCustomers} total)`);

    res.json({
      customers: customersResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCustomers,
        customersPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Get customers error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

/**
 * @route GET /api/customers/stats
 * @description Retrieves customer statistics for dashboard widgets.
 * @returns {Object} JSON object containing various customer statistics.
 */
app.get('/api/customers/stats', async (req, res) => {
  try {
    console.log('📊 Loading customer statistics');

    const result = await pool.query(`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_customers,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_customers,
        COUNT(CASE WHEN zone = 'A' THEN 1 END) as zone_a_count,
        COUNT(CASE WHEN zone = 'B' THEN 1 END) as zone_b_count,
        COUNT(CASE WHEN zone = 'C' THEN 1 END) as zone_c_count,
        COUNT(CASE WHEN zone = 'D' THEN 1 END) as zone_d_count,
        COUNT(CASE WHEN zone = 'E' THEN 1 END) as zone_e_count,
        COUNT(CASE WHEN zone = 'F' THEN 1 END) as zone_f_count,
        COUNT(CASE WHEN zone IS NULL THEN 1 END) as unassigned_zone_count
      FROM customers
    `);

    console.log('✅ Customer statistics loaded successfully');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Get customer stats error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

/**
 * @route GET /api/customers/search
 * @description Searches customers by name, phone, or address with optional filters.
 * @queryparam {string} q - Search query string.
 * @queryparam {string} [active_only='false'] - Filter for active customers only.
 * @returns {Array<Object>} Array of matching customer objects.
 */
app.get('/api/customers/search', async (req, res) => {
  try {
    const { q, active_only = 'false' } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    console.log(`🔍 Searching customers: "${q}", Active Only: ${active_only}`);

    const activeFilter = active_only === 'true' ? 'AND is_active = true' : '';
    const searchTerm = `%${q.toLowerCase()}%`;

    const result = await pool.query(`
      SELECT
        id, name, primary_contact_phone as phone, service_address_line1 as service_address, 
        service_city, service_state, service_zip, zone, business_type as customer_type, 
        is_active, created_at
      FROM customers
      WHERE (
        LOWER(name) LIKE $1
        OR LOWER(COALESCE(primary_contact_phone, '')) LIKE $1
        OR LOWER(COALESCE(service_address_line1, '')) LIKE $1
        OR LOWER(COALESCE(service_city, '')) LIKE $1
      )
      ${activeFilter}
      ORDER BY
        CASE WHEN LOWER(name) LIKE $1 THEN 1 ELSE 2 END,
        name ASC
      LIMIT 50
    `, [searchTerm]);

    console.log(`✅ Found ${result.rows.length} matching customers`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Search customers error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});


/**
 * @route GET /api/work-orders
 * @description Retrieves all work orders or work orders for a specific date
 */
app.get('/api/work-orders', async (req, res) => {
  try {
    const { date } = req.query;
    console.log(`📋 Loading work orders${date ? ` for date: ${date}` : ''}`);

    let query;
    let params = [];

    if (date) {
      query = `
        SELECT 
          wo.*,
          c.name as customer_name,
          c.service_city,
          c.zone as customer_zone,
          t.first_name as tech_first_name,
          t.last_name as tech_last_name,
          e.equipment_number,
          e.equipment_type
        FROM work_orders wo
        LEFT JOIN customers c ON wo.customer_id = c.id
        LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        WHERE (wo.scheduled_date = $1 OR wo.created_at::date = $1)
          AND wo.status != 'Deleted'
        ORDER BY wo.assigned_tech_id NULLS FIRST, wo.created_at
      `;
      params = [date];
    } else {
      query = `
        SELECT 
          wo.*,
          c.name as customer_name,
          c.service_city,
          c.zone as customer_zone,
          t.first_name as tech_first_name,
          t.last_name as tech_last_name,
          e.equipment_number,
          e.equipment_type
        FROM work_orders wo
        LEFT JOIN customers c ON wo.customer_id = c.id
        LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        WHERE wo.status != 'Deleted'
        ORDER BY wo.created_at DESC
        LIMIT 100
      `;
    }

    const result = await pool.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} work orders`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get work orders error:', error);
    res.status(500).json({ error: 'Failed to get work orders' });
  }
});


/**
 * @route GET /api/work-orders/queues
 * @description Retrieves all available completion queues for work orders.
 * @returns {Array<Object>} Array of queue objects.
 */
app.get('/api/work-orders/queues', async (req, res) => {
  try {
    console.log('📋 Loading work order queues');

    // For now, return static queues since you may not have a queues table yet
    const staticQueues = [
      { id: 1, name: 'Completed', description: 'Work completed successfully', color_code: '#10B981', display_order: 1, is_active: true },
      { id: 2, name: 'Billed', description: 'Work completed and billed', color_code: '#3B82F6', display_order: 2, is_active: true },
      { id: 3, name: 'Warranty', description: 'Warranty work completed', color_code: '#8B5CF6', display_order: 3, is_active: true },
      { id: 4, name: 'Parts Ordered', description: 'Waiting for parts', color_code: '#F59E0B', display_order: 4, is_active: true },
      { id: 5, name: 'Ready to Schedule', description: 'Ready for scheduling', color_code: '#EF4444', display_order: 5, is_active: true }
    ];

    // Try to get from database first, fallback to static
    try {
      const result = await pool.query(`
        SELECT * FROM work_order_queues 
        WHERE is_active = true 
        ORDER BY display_order
      `);
      
      if (result.rows.length > 0) {
        console.log(`✅ Found ${result.rows.length} queues from database`);
        res.json(result.rows);
      } else {
        console.log('⚠️ No queues in database, using static queues');
        res.json(staticQueues);
      }
    } catch (dbError) {
      console.log('⚠️ Queue table not found, using static queues');
      res.json(staticQueues);
    }

  } catch (error) {
    console.error('❌ Get queues error:', error);
    res.status(500).json({ error: 'Failed to get queues' });
  }
});


/**
 * @route GET /api/customers/:id
 * @description Retrieves detailed information for a specific customer.
 * @param {number} id - The ID of the customer to retrieve.
 * @returns {Object} JSON object containing customer details and their equipment.
 */
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    console.log(`🔍 Getting customer details for ID: ${customerId}`);

    // Get customer details
    const customerResult = await pool.query(`
      SELECT * FROM customers WHERE id = $1
    `, [customerId]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    // Get customer's active equipment
    const equipmentResult = await pool.query(`
      SELECT * FROM equipment
      WHERE customer_id = $1 AND is_active = true
      ORDER BY equipment_type, equipment_number
    `, [customerId]);

    // Combine customer and equipment data
    customer.equipment = equipmentResult.rows;

    console.log(`✅ Found customer: ${customer.name} with ${customer.equipment.length} equipment items`);
    res.json(customer);
  } catch (error) {
    console.error('❌ Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer details' });
  }
});

/**
 * @route POST /api/customers
 * @description Creates a new customer with auto-zone assignment.
 * @body {Object} customerData - Data for the new customer.
 * @returns {Object} The newly created customer object.
 */
app.post('/api/customers', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      name, phone, email, service_address, service_city, service_state, service_zip,
      billing_address, billing_city, billing_state, billing_zip, customer_type,
      rate_sheet, payment_terms, invoice_delivery_method, zone, notes
    } = req.body;

    console.log(`👤 Creating new customer: ${name}`);

    // Auto-assign zone based on city or use provided zone
    let assignedZone = zone;
    if (!assignedZone && service_city) {
      // Simple zone assignment logic - you can enhance this
      const cityLower = service_city.toLowerCase();
      if (cityLower.includes('lafayette')) assignedZone = 'A';
      else if (cityLower.includes('west lafayette')) assignedZone = 'B';
      // Add more zone assignment logic here
    }

    const result = await client.query(`
      INSERT INTO customers (
        name, phone, email, service_address, service_city, service_state, service_zip,
        billing_address, billing_city, billing_state, billing_zip, customer_type,
        rate_sheet, payment_terms, invoice_delivery_method, zone, notes,
        created_by_user_id, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `, [
      name, phone, email, service_address, service_city, service_state, service_zip,
      billing_address, billing_city, billing_state, billing_zip, customer_type,
      rate_sheet, payment_terms, invoice_delivery_method, assignedZone, notes,
      1, true // TODO: Replace 1 with actual user ID
    ]);

    await client.query('COMMIT');

    console.log('✅ Customer created successfully');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/customers/:id
 * @description Updates an existing customer's information.
 * @param {number} id - The ID of the customer to update.
 * @body {Object} updates - Object containing fields to update.
 * @returns {Object} The updated customer object.
 */
app.put('/api/customers/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerId = req.params.id;
    const updates = req.body;

    console.log(`🔄 Updating customer ${customerId}`);

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at') {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(customerId);
    const query = `
      UPDATE customers 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await client.query('COMMIT');

    console.log('✅ Customer updated successfully');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/customers/:id/status
 * @description Deactivates or reactivates a customer.
 * @param {number} id - The ID of the customer.
 * @body {Object} data - { is_active: boolean }
 * @returns {Object} The updated customer object.
 */
app.put('/api/customers/:id/status', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { is_active } = req.body;

    console.log(`🔄 ${is_active ? 'Reactivating' : 'Deactivating'} customer ${customerId}`);

    const result = await pool.query(`
      UPDATE customers
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [is_active, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    console.log(`✅ Customer ${is_active ? 'reactivated' : 'deactivated'} successfully`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Update customer status error:', error);
    res.status(500).json({ error: 'Failed to update customer status' });
  }
});

/**
 * @route PUT /api/customers/:id/zone
 * @description Updates a customer's zone assignment.
 * @param {number} id - The ID of the customer.
 * @body {Object} data - { zone: string }
 * @returns {Object} The updated customer object.
 */
app.put('/api/customers/:id/zone', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { zone } = req.body;

    console.log(`🗺️ Updating customer ${customerId} zone to: ${zone || 'None'}`);

    // Validate zone
    if (zone && !['A', 'B', 'C', 'D', 'E', 'F'].includes(zone)) {
      return res.status(400).json({ error: 'Invalid zone. Must be A, B, C, D, E, or F.' });
    }

    const result = await pool.query(`
      UPDATE customers
      SET zone = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [zone || null, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    console.log('✅ Customer zone updated successfully');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Update customer zone error:', error);
    res.status(500).json({ error: 'Failed to update customer zone' });
  }
});


/**
 * @route GET /api/customers/:id/work-orders
 * @description Retrieves all work orders for a specific customer with pagination and filtering.
 * @param {number} id - The ID of the customer.
 * @queryparam {number} [page=1] - The current page number.
 * @queryparam {number} [limit=50] - The number of work orders per page.
 * @queryparam {string} [status] - Filter by work order status.
 * @queryparam {string} [sort='recent'] - Sorting order (recent, oldest, status).
 * @returns {Object} JSON object containing work orders and pagination info.
 */
app.get('/api/customers/:id/work-orders', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { page = 1, limit = 50, status, sort = 'recent' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    console.log(`📋 Loading work orders for customer ${customerId} - Page: ${page}, Limit: ${limit}`);

    // Validate customer exists
    const customerExists = await pool.query(`
      SELECT id, name FROM customers WHERE id = $1
    `, [customerId]);

    if (customerExists.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Build WHERE clause
    let whereClause = `WHERE wo.customer_id = $1 AND wo.status != 'Deleted'`;
    const values = [customerId];
    let paramIndex = 2;

    // Add status filter if provided
    if (status) {
      whereClause += ` AND wo.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    // Build ORDER BY clause
    let orderClause = 'ORDER BY wo.created_at DESC'; // Default: recent first
    switch (sort) {
      case 'oldest':
        orderClause = 'ORDER BY wo.created_at ASC';
        break;
      case 'status':
        orderClause = 'ORDER BY wo.status, wo.created_at DESC';
        break;
      case 'scheduled':
        orderClause = 'ORDER BY wo.scheduled_date DESC NULLS LAST, wo.created_at DESC';
        break;
      default:
        orderClause = 'ORDER BY wo.created_at DESC';
    }

    // Get work orders with pagination
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
        wo.completion_queue,
        wo.status_notes,
        wo.suspended_at,
        
        -- Customer info (from work order record for historical accuracy)
        wo.customer_name,
        wo.service_city,
        wo.customer_zone,
        
        -- Current customer info (for reference)
        c.name as current_customer_name,
        c.service_city as current_service_city,
        c.zone as current_customer_zone,
        
        -- Technician info
        t.first_name as tech_first_name,
        t.last_name as tech_last_name,
        t.crew as tech_crew,
        t.van_number as tech_van_number,
        
        -- Equipment info
        e.equipment_number,
        e.equipment_type,
        e.location_description as equipment_location
        
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...values, parseInt(limit), offset]);

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM work_orders wo
      ${whereClause}
    `, values);

    const totalWorkOrders = parseInt(countResult.rows[0].total_count);
    const totalPages = Math.ceil(totalWorkOrders / parseInt(limit));

    console.log(`✅ Found ${workOrdersResult.rows.length} work orders for customer ${customerExists.rows[0].name} (${totalWorkOrders} total)`);

    res.json({
      customer: customerExists.rows[0],
      workOrders: workOrdersResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalWorkOrders,
        workOrdersPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        status: status || null,
        sort: sort
      }
    });
  } catch (error) {
    console.error('❌ Get customer work orders error:', error);
    res.status(500).json({ error: 'Failed to get customer work orders' });
  }
});


/**
 * @route GET /api/customers/by-zone/:zone
 * @description Retrieves all customers in a specific zone.
 * @param {string} zone - The zone to filter by (A, B, C, D, E, F).
 * @returns {Array<Object>} Array of customer objects in the specified zone.
 */
app.get('/api/customers/by-zone/:zone', async (req, res) => {
  try {
    const { zone } = req.params;

    console.log(`🗺️ Getting customers in zone: ${zone}`);

    // Validate zone
    if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(zone)) {
      return res.status(400).json({ error: 'Invalid zone. Must be A, B, C, D, E, or F.' });
    }

    const result = await pool.query(`
      SELECT id, name, service_address, service_city, zone, phone, is_active
      FROM customers
      WHERE zone = $1 AND is_active = true
      ORDER BY name
    `, [zone]);

    console.log(`✅ Found ${result.rows.length} customers in zone ${zone}`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get customers by zone error:', error);
    res.status(500).json({ error: 'Failed to get customers by zone' });
  }
});

/**
 * @route PUT /api/customers/bulk/zone
 * @description Bulk updates zone assignment for multiple customers.
 * @body {Object} data - { customerIds: number[], zone: string }
 * @returns {Object} Success message and updated customer count.
 */
app.put('/api/customers/bulk/zone', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customerIds, zone } = req.body;

    console.log(`🗺️ Bulk updating zone for ${customerIds.length} customers to Zone: ${zone || 'None'}`);

    // Validate zone
    if (zone && !['A', 'B', 'C', 'D', 'E', 'F'].includes(zone)) {
      return res.status(400).json({ error: 'Invalid zone. Must be A, B, C, D, E, or F.' });
    }

    // Validate customerIds array
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ error: 'customerIds must be a non-empty array' });
    }

    // Update all specified customers
    const result = await client.query(`
      UPDATE customers
      SET zone = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2::int[]) AND is_active = true
      RETURNING id, name, zone
    `, [zone || null, customerIds]);

    await client.query('COMMIT');

    console.log(`✅ Updated ${result.rows.length} customers to Zone: ${zone || 'None'}`);

    res.json({
      success: true,
      message: `${result.rows.length} customers updated successfully`,
      updatedCustomers: result.rows
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Bulk update customer zone error:', error);
    res.status(500).json({
      error: 'Failed to bulk update customer zones',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * @route POST /api/work-orders
 * @description Creates a new work order with enhanced date visibility management and proper input validation.
 */
app.post('/api/work-orders', async (req, res) => {
  console.log('🔥 BACKEND: Work order creation request received');
  console.log('🔥 Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔥 Request headers user-agent:', req.headers['user-agent']);
  console.log('🔥 Timestamp:', new Date().toISOString());
  console.log('🔥 Request ID:', Math.random().toString(36).substr(2, 9));
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // FIRST: Extract raw data from request body
    const {
      customerId: customerIdRaw,
      equipmentId: equipmentIdRaw,
      problemDescription,
      priority = 'Normal',
      callRate = 'RT',
      callUrgency = 'Default', 
      callType = 'Time and Material',
      scheduledDate,
      scheduledTimeSlot,
      assignedTechId: assignedTechIdRaw,
      customerPO
    } = req.body;

    console.log('🔍 Creating new work order with enhanced date management');

    // SECOND: Convert and validate - DECLARE customerId HERE
    const customerId = parseInt(customerIdRaw);
    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    // Handle equipment ID - can be null
    let equipmentId = null;
    if (equipmentIdRaw !== null && equipmentIdRaw !== undefined && equipmentIdRaw !== '') {
      equipmentId = parseInt(equipmentIdRaw);
      if (isNaN(equipmentId)) {
        return res.status(400).json({ error: 'Invalid equipment ID' });
      }
    }

    // Handle assigned tech ID - can be null  
    let assignedTechId = null;
    if (assignedTechIdRaw !== null && assignedTechIdRaw !== undefined && assignedTechIdRaw !== '') {
      assignedTechId = parseInt(assignedTechIdRaw);
      if (isNaN(assignedTechId)) {
        return res.status(400).json({ error: 'Invalid technician ID' });
      }
    }

    // Validate required fields
    if (!problemDescription || problemDescription.trim().length === 0) {
      return res.status(400).json({ error: 'Problem description is required' });
    }

    // THIRD: Get customer info (AFTER customerId is declared and validated)
    const customerResult = await client.query(`
      SELECT name, service_address_line1, service_city, service_state, service_zip, zone, primary_contact_phone
      FROM customers WHERE id = $1
    `, [customerId]);

    // Check if customer exists
    if (customerResult.rows.length === 0) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    // Extract customer data from the result
    const customer = customerResult.rows[0];

    // FOURTH: Generate work order number (AFTER customer is validated)
    const woNumberResult = await client.query(`
      SELECT 'WO-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(wo_number FROM 4) AS INTEGER)), 0) + 1)::text, 5, '0') as new_wo_number
      FROM work_orders 
      WHERE wo_number LIKE 'WO-%'
    `);
    const woNumber = woNumberResult.rows[0].new_wo_number;

    // FIFTH: NOW customer is properly defined - proceed with INSERT
    const result = await client.query(`
      INSERT INTO work_orders (
        wo_number, customer_id, customer_name, service_address, service_city, 
        service_state, service_zip, customer_zone, phone, equipment_id,
        problem_description, priority, call_rate, call_urgency, call_type, 
        status, scheduled_date, scheduled_time_slot, assigned_tech_id, 
        customer_po, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, CURRENT_TIMESTAMP
      ) RETURNING *
    `, [
      woNumber, 
      customerId, 
      customer.name, 
      customer.service_address_line1,
      customer.service_city, 
      customer.service_state, 
      customer.service_zip,
      customer.zone, 
      customer.primary_contact_phone, 
      equipmentId,
      problemDescription.trim(),
      priority, 
      callRate,
      callUrgency,
      callType,
      'Open', 
      scheduledDate || null,
      scheduledTimeSlot || null,
      assignedTechId,
      customerPO ? customerPO.trim() : null
    ]);

    const newWorkOrder = result.rows[0];
    await client.query('COMMIT');

    console.log('✅ Work order created successfully:', newWorkOrder.wo_number);

    // Broadcast the new work order
    broadcastWorkOrderUpdate(newWorkOrder, 'created');

    res.status(201).json({
      success: true,
      message: 'Work order created successfully',
      workOrder: newWorkOrder
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create work order error:', error);

    // Provide more specific error messages
    if (error.code === '23503') {
      if (error.constraint && error.constraint.includes('customer')) {
        return res.status(400).json({ error: 'Invalid customer ID' });
      } else if (error.constraint && error.constraint.includes('equipment')) {
        return res.status(400).json({ error: 'Invalid equipment ID' });
      } else if (error.constraint && error.constraint.includes('technician')) {
        return res.status(400).json({ error: 'Invalid technician ID' });
      }
    }

    res.status(500).json({ 
      error: 'Failed to create work order',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// ========================================
// INPUT VALIDATION HELPER FUNCTIONS
// ========================================
// Add these functions near the top of your server.js file, after the database connection

/**
 * Validates and converts a value to integer, allowing null
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {boolean} required - Whether the field is required
 * @returns {number|null} - Validated integer or null
 * @throws {Error} - If validation fails
 */
function validateInteger(value, fieldName, required = false) {
  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }

  const parsed = parseInt(value);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName}. Must be a valid number.`);
  }

  return parsed;
}

/**
 * Validates a string field
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {boolean} required - Whether the field is required
 * @param {number} minLength - Minimum length (default: 1)
 * @param {number} maxLength - Maximum length (default: 1000)
 * @returns {string|null} - Validated string or null
 * @throws {Error} - If validation fails
 */
function validateString(value, fieldName, required = false, minLength = 1, maxLength = 1000) {
  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }

  const stringValue = String(value).trim();
  
  if (stringValue.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} character(s) long`);
  }
  
  if (stringValue.length > maxLength) {
    throw new Error(`${fieldName} must be no more than ${maxLength} characters long`);
  }

  return stringValue;
}

/**
 * Validates a value against an allowed list
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {array} allowedValues - Array of allowed values
 * @param {any} defaultValue - Default value if none provided
 * @returns {any} - Validated value
 * @throws {Error} - If validation fails
 */
function validateEnum(value, fieldName, allowedValues, defaultValue = null) {
  if (value === null || value === undefined || value === '') {
    if (defaultValue !== null) {
      return defaultValue;
    }
    throw new Error(`${fieldName} is required`);
  }

  if (!allowedValues.includes(value)) {
    throw new Error(`Invalid ${fieldName}. Must be one of: ${allowedValues.join(', ')}`);
  }

  return value;
}

/**
 * Validates a date string
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {boolean} required - Whether the field is required
 * @returns {string|null} - Validated date string or null
 * @throws {Error} - If validation fails
 */
function validateDate(value, fieldName, required = false) {
  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }

  const dateValue = new Date(value);
  if (isNaN(dateValue.getTime())) {
    throw new Error(`Invalid ${fieldName}. Must be a valid date.`);
  }

  // Return as YYYY-MM-DD format
  return dateValue.toISOString().split('T')[0];
}



/**
 * @route PUT /api/work-orders/:id
 * @description Updates an existing work order dynamically based on provided fields.
 * @param {number} id - The ID of the work order to update.
 * @body {Object} updates - Object containing fields to update.
 * @returns {Object} The updated work order object.
 */
app.put('/api/work-orders/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workOrderId = req.params.id;
    const updates = req.body;

    console.log(`🔄 Updating work order ${workOrderId}`);

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'wo_number') {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(workOrderId);
    const updateQuery = `
      UPDATE work_orders 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Get full work order data with customer info
    const fullWOResult = await client.query(`
      SELECT wo.*, c.name as customer_name, c.service_city, c.zone as customer_zone,
             e.equipment_number, e.equipment_type
      FROM work_orders wo
      JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      WHERE wo.id = $1
    `, [workOrderId]);

    const fullWorkOrder = fullWOResult.rows[0];

    await client.query('COMMIT');

    // Handle date visibility updates if scheduling changes
    if (updates.scheduled_date || updates.assigned_tech_id) {
      try {
        await manageWorkOrderVisibility(workOrderId, 'schedule', {
          date: updates.scheduled_date || fullWorkOrder.scheduled_date || new Date().toISOString().split('T')[0],
          techId: updates.assigned_tech_id || fullWorkOrder.assigned_tech_id
        });
      } catch (visibilityError) {
        console.log('⚠️ Enhanced visibility not available for update');
      }
    }

    broadcastWorkOrderUpdate(fullWorkOrder, 'updated');
    console.log('✅ Work order updated successfully');
    res.json(fullWorkOrder);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Update work order error:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/work-orders/:id/assign
 * @description Assigns a work order to a technician with date visibility management.
 */
app.put('/api/work-orders/:id/assign', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workOrderId = req.params.id;
    const { tech_id, scheduled_date, scheduled_time_slot } = req.body;

    console.log(`👨‍🔧 Assigning work order ${workOrderId} to tech ${tech_id}`);

    const result = await client.query(`
      UPDATE work_orders 
      SET assigned_tech_id = $2, 
          status = 'Assigned',
          scheduled_date = $3,
          scheduled_time_slot = $4,
          last_status_change_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `, [workOrderId, tech_id, scheduled_date, scheduled_time_slot]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Get full work order data
    const fullWOResult = await client.query(`
      SELECT wo.*, c.name as customer_name, c.service_city, c.zone as customer_zone,
             e.equipment_number, e.equipment_type,
             t.first_name as tech_first_name, t.last_name as tech_last_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      WHERE wo.id = $1
    `, [workOrderId]);

    const assignedWorkOrder = fullWOResult.rows[0];

    await client.query('COMMIT');

    // Update visibility for assignment
    try {
      await manageWorkOrderVisibility(workOrderId, 'schedule', {
        date: scheduled_date || new Date().toISOString().split('T')[0],
        techId: tech_id
      });
    } catch (visibilityError) {
      console.log('⚠️ Enhanced visibility not available for assignment');
    }

    console.log('✅ Work order assigned successfully');

    const affectedDate = scheduled_date || new Date().toISOString().split('T')[0];
    broadcastWorkOrderUpdate(assignedWorkOrder, 'assigned', [affectedDate]);
    res.json(assignedWorkOrder);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Assign work order error:', error);
    res.status(500).json({ error: 'Failed to assign work order' });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/work-orders/:id/unassign
 * @description Unassigns a work order from a technician.
 */
app.put('/api/work-orders/:id/unassign', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workOrderId = req.params.id;
    const { notes } = req.body;

    console.log(`🔄 Unassigning work order ${workOrderId}`);

    // Get current status before update
    const statusResult = await client.query(`
      SELECT status FROM work_orders WHERE id = $1
    `, [workOrderId]);

    if (statusResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const oldStatus = statusResult.rows[0].status;

    const result = await client.query(`
      UPDATE work_orders
      SET assigned_tech_id = NULL,
          status = CASE 
            WHEN status IN ('Assigned', 'In Progress') THEN 'Open'
            ELSE status
          END,
          scheduled_date = NULL,
          scheduled_time_slot = NULL,
          last_status_change_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [workOrderId]);

    // Get full work order data
    const fullWOResult = await client.query(`
      SELECT wo.*, c.name as customer_name, c.service_city, c.zone as customer_zone,
             e.equipment_number, e.equipment_type
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      WHERE wo.id = $1
    `, [workOrderId]);

    const fullWorkOrder = fullWOResult.rows[0];

    await client.query('COMMIT');

    broadcastWorkOrderUpdate(fullWorkOrder, 'unassigned');
    console.log(`✅ Work order ${fullWorkOrder.wo_number} unassigned successfully`);
    res.json(fullWorkOrder);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Unassign work order error:', error);
    res.status(500).json({ error: 'Failed to unassign work order' });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/work-orders/:id/complete
 * @description Completes a work order with proper date visibility management.
 */
app.put('/api/work-orders/:id/complete', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workOrderId = req.params.id;
    const { queue, notes, completedBy = 1, completion_date } = req.body;
    
    const completionDateValue = completion_date || new Date().toISOString().split('T')[0];

    console.log(`✅ Completing work order ${workOrderId} on ${completionDateValue}`);

    // Validate work order exists
    const existsResult = await client.query(`
      SELECT id, status FROM work_orders WHERE id = $1
    `, [workOrderId]);

    if (existsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const oldStatus = existsResult.rows[0].status;

    if (oldStatus === 'Complete' || oldStatus === 'Completed') {
      return res.status(400).json({ error: 'Work order is already completed' });
    }

    // Update work order to completed status
    const updateResult = await client.query(`
      UPDATE work_orders
      SET status = 'Complete',
          completion_queue = $1,
          completion_date = $2,
          completion_notes = $3,
          status_notes = $4,
          last_status_change_by = $5,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [queue, completionDateValue, notes, notes, completedBy, workOrderId]);

    // Get full work order data
    const fullWOResult = await client.query(`
      SELECT wo.*, c.name as customer_name, c.service_city, c.zone as customer_zone,
             e.equipment_number, e.equipment_type,
             t.first_name as tech_first_name, t.last_name as tech_last_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      WHERE wo.id = $1
    `, [workOrderId]);

    const completedWorkOrder = fullWOResult.rows[0];

    await client.query('COMMIT');

    // Update date visibility for completion
    try {
      await manageWorkOrderVisibility(workOrderId, 'complete', {
        date: completionDateValue
      });
    } catch (visibilityError) {
      console.log('⚠️ Enhanced visibility not available for completion');
    }

    console.log('✅ Work order completed successfully');

    broadcastWorkOrderUpdate(completedWorkOrder, 'completed', [completionDateValue]);
    res.json({
      success: true,
      message: 'Work order completed successfully',
      workOrder: completedWorkOrder
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Complete work order error:', error);
    res.status(500).json({
      error: 'Failed to complete work order',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/work-orders/:id/suspend
 * @description Suspends a work order with complex date visibility rules.
 */
app.put('/api/work-orders/:id/suspend', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workOrderId = req.params.id;
    const { notes, suspendedBy = 1, suspension_reason, expected_return_date } = req.body;
    
    const suspensionDate = new Date().toISOString().split('T')[0];

    console.log(`⏸️ Suspending work order ${workOrderId} on ${suspensionDate}`);

    // Validate work order exists
    const existsResult = await client.query(`
      SELECT id, status FROM work_orders WHERE id = $1
    `, [workOrderId]);

    if (existsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const oldStatus = existsResult.rows[0].status;

    if (oldStatus === 'Complete' || oldStatus === 'Suspended') {
      return res.status(400).json({ error: 'Work order cannot be suspended in current status' });
    }

    // Update work order to suspended status
    const updateResult = await client.query(`
      UPDATE work_orders
      SET status = 'Suspended',
          suspended_at = CURRENT_TIMESTAMP,
          last_visit_date = $2,
          next_visit_date = $3,
          suspension_reason = $4,
          suspension_notes = $5,
          status_notes = $6,
          last_status_change_by = $7,
          last_status_change_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [workOrderId, suspensionDate, expected_return_date, suspension_reason, notes, notes, suspendedBy]);

    // Get full work order data
    const fullWOResult = await client.query(`
      SELECT wo.*, c.name as customer_name, c.service_city, c.zone as customer_zone,
             e.equipment_number, e.equipment_type,
             t.first_name as tech_first_name, t.last_name as tech_last_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      WHERE wo.id = $1
    `, [workOrderId]);

    const suspendedWorkOrder = fullWOResult.rows[0];

    await client.query('COMMIT');

    // Update date visibility for suspension
    try {
      await manageWorkOrderVisibility(workOrderId, 'suspend', {
        date: suspensionDate
      });
    } catch (visibilityError) {
      console.log('⚠️ Enhanced visibility not available for suspension');
    }

    console.log('⏸️ Work order suspended successfully');

    const affectedDates = [suspensionDate];
    if (expected_return_date) {
      affectedDates.push(expected_return_date);
    }

    broadcastWorkOrderUpdate(suspendedWorkOrder, 'suspended', affectedDates);
    res.json({
      success: true,
      message: 'Work order suspended successfully',
      workOrder: suspendedWorkOrder
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Suspend work order error:', error);
    res.status(500).json({
      error: 'Failed to suspend work order',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/work-orders/:id/resume
 * @description Resumes a suspended work order.
 */
app.put('/api/work-orders/:id/resume', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workOrderId = req.params.id;
    const { tech_id, resume_date, resume_notes } = req.body;
    
    const resumeDateValue = resume_date || new Date().toISOString().split('T')[0];

    console.log(`▶️ Resuming work order ${workOrderId} on ${resumeDateValue}`);

    // Update work order status
    const result = await client.query(`
      UPDATE work_orders 
      SET status = 'In Progress',
          assigned_tech_id = $2,
          suspended_at = NULL,
          next_visit_date = $3,
          resume_notes = $4,
          last_status_change_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'Suspended'
      RETURNING *
    `, [workOrderId, tech_id, resumeDateValue, resume_notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found or not suspended' });
    }

    // Get full work order data
    const fullWOResult = await client.query(`
      SELECT wo.*, c.name as customer_name, c.service_city, c.zone as customer_zone,
             e.equipment_number, e.equipment_type,
             t.first_name as tech_first_name, t.last_name as tech_last_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      WHERE wo.id = $1
    `, [workOrderId]);

    const resumedWorkOrder = fullWOResult.rows[0];

    await client.query('COMMIT');

    // Update date visibility for resume
    try {
      await manageWorkOrderVisibility(workOrderId, 'resume', {
        date: resumeDateValue,
        techId: tech_id
      });
    } catch (visibilityError) {
      console.log('⚠️ Enhanced visibility not available for resume');
    }

    console.log('▶️ Work order resumed successfully');

    broadcastWorkOrderUpdate(resumedWorkOrder, 'resumed', [resumeDateValue]);
    res.json(resumedWorkOrder);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Resume work order error:', error);
    res.status(500).json({ error: 'Failed to resume work order' });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/work-orders/:id/move
 * @description Moves a work order to a different queue.
 */
app.put('/api/work-orders/:id/move', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { destination, notes } = req.body;
    const workOrderId = req.params.id;

    console.log(`📦 Moving WO ${workOrderId} to ${destination}`);

    // Validate destination
    const validDestinations = ['unassigned', 'parts_ordered', 'ready_to_schedule'];
    if (!validDestinations.includes(destination)) {
      return res.status(400).json({ 
        error: `Invalid destination. Must be one of: ${validDestinations.join(', ')}` 
      });
    }

    // Get current status
    const statusResult = await client.query(`
      SELECT status FROM work_orders WHERE id = $1
    `, [workOrderId]);

    if (statusResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const oldStatus = statusResult.rows[0].status;

    // Determine new status and completion_queue based on destination
    let newStatus = oldStatus;
    let completionQueue = null;

    switch (destination) {
      case 'unassigned':
        newStatus = 'Open';
        completionQueue = null;
        break;
      case 'parts_ordered':
        newStatus = oldStatus; // Keep current status
        completionQueue = 'Parts Ordered';
        break;
      case 'ready_to_schedule':
        newStatus = 'Open';
        completionQueue = 'Ready to Schedule';
        break;
    }

    // Update work order
    const result = await client.query(`
      UPDATE work_orders
      SET status = $2,
          completion_queue = $3,
          status_notes = $4,
          assigned_tech_id = CASE 
            WHEN $5 = 'unassigned' THEN NULL 
            ELSE assigned_tech_id 
          END,
          scheduled_date = CASE 
            WHEN $5 = 'unassigned' THEN NULL 
            ELSE scheduled_date 
          END,
          scheduled_time_slot = CASE 
            WHEN $5 = 'unassigned' THEN NULL 
            ELSE scheduled_time_slot 
          END,
          last_status_change_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [workOrderId, newStatus, completionQueue, notes || `Moved to ${destination}`, destination]);

    // Get full work order data
    const fullWOResult = await client.query(`
      SELECT wo.*, c.name as customer_name, c.service_city, c.zone as customer_zone,
             e.equipment_number, e.equipment_type
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      WHERE wo.id = $1
    `, [workOrderId]);

    const fullWorkOrder = fullWOResult.rows[0];

    await client.query('COMMIT');

    broadcastWorkOrderUpdate(fullWorkOrder, 'moved');
    console.log(`✅ Work order ${fullWorkOrder.wo_number} moved to ${destination} successfully`);
    res.json(fullWorkOrder);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Move work order error:', error);
    res.status(500).json({ error: 'Failed to move work order' });
  } finally {
    client.release();
  }
});


/**
 * @route GET /api/dispatch/board
 * @description Gets dispatch board data with enhanced date visibility.
 */
app.get('/api/dispatch/board', async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const isToday = date === today;
    
    console.log(`📋 Loading dispatch board for date: ${date} (Today: ${today})`);

    // Different query logic based on whether viewing today or historical dates
    let workOrdersQuery;
    let queryParams;
    
    if (isToday) {
      // TODAY: Show all incomplete work orders regardless of their scheduled_date
      // Plus any completed work orders from today
      workOrdersQuery = `
        SELECT wo.*, 
               c.name as customer_name, 
               c.service_city, 
               c.zone as customer_zone,
               e.equipment_number, 
               e.equipment_type,
               t.first_name as tech_first_name, 
               t.last_name as tech_last_name,
               CASE 
                 WHEN wo.status IN ('Complete', 'Completed') THEN 'completed'
                 WHEN wo.completion_queue = 'Parts Ordered' THEN 'parts_ordered'
                 WHEN wo.completion_queue = 'Ready to Schedule' THEN 'ready_to_schedule'
                 WHEN wo.status = 'Suspended' THEN 'suspended'
                 ELSE 'normal'
               END as visibility_reason
        FROM work_orders wo
        LEFT JOIN customers c ON wo.customer_id = c.id
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
        WHERE 
          -- All incomplete work orders show on today
          (wo.status NOT IN ('Complete', 'Completed', 'Deleted'))
          OR
          -- Completed work orders only from today
          (wo.status IN ('Complete', 'Completed') AND DATE(wo.completed_at) = $1)
        ORDER BY wo.assigned_tech_id NULLS FIRST, 
                 wo.priority DESC, 
                 wo.created_at
      `;
      queryParams = [today];
    } else {
      // HISTORICAL/FUTURE DATES: Only show work orders that were completed on that date
      workOrdersQuery = `
        SELECT wo.*, 
               c.name as customer_name, 
               c.service_city, 
               c.zone as customer_zone,
               e.equipment_number, 
               e.equipment_type,
               t.first_name as tech_first_name, 
               t.last_name as tech_last_name,
               'completed' as visibility_reason
        FROM work_orders wo
        LEFT JOIN customers c ON wo.customer_id = c.id
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
        WHERE 
          wo.status IN ('Complete', 'Completed') 
          AND DATE(wo.completed_at) = $1
        ORDER BY wo.completed_at DESC
      `;
      queryParams = [date];
    }

    const workOrdersForDate = await pool.query(workOrdersQuery, queryParams);
    console.log(`✅ Found ${workOrdersForDate.rows.length} work orders for ${date}`);

    // Get technicians
    const techResult = await pool.query(`
      SELECT id, first_name, last_name, phone, crew, van_number, 
             current_location, is_active
      FROM technicians 
      WHERE is_active = true
      ORDER BY crew, last_name
    `);

    // Initialize collections
    const unassigned = [];
    const partsOrdered = [];
    const readyToSchedule = [];
    const techniciansMap = new Map();

    // Initialize technicians
    techResult.rows.forEach(tech => {
      techniciansMap.set(tech.id, {
        ...tech,
        work_orders: []
      });
    });

    // Categorize work orders
    workOrdersForDate.rows.forEach(wo => {
      const enhancedWo = {
        ...wo,
        card_class: getCardStyleClass(wo.card_style_type || 'normal', wo.display_status || wo.status),
        visibility_info: {
          reason: wo.visibility_reason || 'normal',
          is_historical: wo.status === 'Complete' || wo.status === 'Completed',
          is_suspended: wo.status === 'Suspended',
          is_carryover: false
        }
      };

      // Don't show completed work orders in queues on historical dates
      if (!isToday && (wo.status === 'Complete' || wo.status === 'Completed')) {
        // Historical completed work orders go to their assigned tech if any
        if (wo.assigned_tech_id && techniciansMap.has(wo.assigned_tech_id)) {
          techniciansMap.get(wo.assigned_tech_id).work_orders.push(enhancedWo);
        }
      } else {
        // Normal categorization for today's view
        if (wo.completion_queue === 'Parts Ordered') {
          partsOrdered.push(enhancedWo);
        } else if (wo.completion_queue === 'Ready to Schedule') {
          readyToSchedule.push(enhancedWo);
        } else if (wo.assigned_tech_id && techniciansMap.has(wo.assigned_tech_id)) {
          techniciansMap.get(wo.assigned_tech_id).work_orders.push(enhancedWo);
        } else if (!wo.assigned_tech_id && wo.status !== 'Complete' && wo.status !== 'Completed') {
          unassigned.push(enhancedWo);
        }
      }
    });

    const response = {
      date,
      technicians: Array.from(techniciansMap.values()),
      unassigned,
      partsOrdered,
      readyToSchedule,
      dateInfo: {
        isToday,
        isPast: new Date(date) < new Date(today),
        isFuture: new Date(date) > new Date(today)
      }
    };

    console.log(`✅ Dispatch board loaded:
      - ${response.technicians.length} technicians
      - ${response.unassigned.length} unassigned
      - ${response.partsOrdered.length} parts ordered
      - ${response.readyToSchedule.length} ready to schedule`);

    res.json(response);

  } catch (error) {
    console.error('❌ Dispatch board error:', error);
    res.status(500).json({ error: 'Failed to load dispatch board' });
  }
});


// ================================
// TECHNICIAN ROUTES
// ================================

/**
 * @route GET /api/technicians
 * @description Retrieves a list of active technicians.
 * @returns {Array<Object>} Array of technician objects.
 */
app.get('/api/technicians', async (req, res) => {
  try {
    console.log('👨‍🔧 Loading technicians');

    const result = await pool.query(`
      SELECT
        t.*,
        COUNT(wo.id) as active_work_orders_count
      FROM technicians t
      LEFT JOIN work_orders wo ON t.id = wo.assigned_tech_id 
        AND wo.status NOT IN ('Complete', 'Completed', 'Deleted')
      WHERE t.is_active = true
      GROUP BY t.id, t.first_name, t.last_name, t.phone, t.crew, t.van_number, 
               t.current_location, t.is_active
      ORDER BY t.crew, t.last_name
    `);

    console.log(`✅ Found ${result.rows.length} active technicians`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get technicians error:', error);
    res.status(500).json({ error: 'Failed to get technicians' });
  }
});

// ================================
// EQUIPMENT ROUTES
// ================================

/**
 * @route GET /api/customers/:id/equipment
 * @description Retrieves active equipment for a specific customer.
 */
app.get('/api/customers/:id/equipment', async (req, res) => {
  try {
    const customerId = req.params.id;
    console.log(`🔧 Getting equipment for customer ID: ${customerId}`);
1
    const result = await pool.query(`
      SELECT * FROM equipment
      WHERE customer_id = $1 AND is_active = true
      ORDER BY equipment_type, equipment_number
    `, [customerId]);

    console.log(`✅ Found ${result.rows.length} equipment items`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get equipment error:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

/**
 * @route POST /api/customers/:id/equipment
 * @description Adds new equipment to a customer.
 */
app.post('/api/customers/:id/equipment', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerId = req.params.id;
    const { equipmentNumber, equipmentType, locationDescription, modelNumber, serialNumber } = req.body;

    console.log(`🔧 Adding equipment to customer ${customerId}: ${equipmentType} ${equipmentNumber}`);

    const result = await client.query(`
      INSERT INTO equipment (
        customer_id, equipment_number, equipment_type, location_description,
        model_number, serial_number, created_by_user_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [customerId, equipmentNumber, equipmentType, locationDescription, modelNumber, serialNumber, 1, true]);

    await client.query('COMMIT');

    console.log('✅ Equipment added successfully');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Add equipment error:', error);
    res.status(500).json({ error: 'Failed to add equipment' });
  } finally {
    client.release();
  }
});


/**
 * @route DELETE /api/work-orders/:id
 * @description Deletes a work order and all associated records
 */
app.delete('/api/work-orders/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const workOrderId = req.params.id;
    console.log(`🗑️ Deleting work order ${workOrderId}`);

    // First check if work order exists
    const checkResult = await client.query('SELECT wo_number FROM work_orders WHERE id = $1', [workOrderId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const woNumber = checkResult.rows[0].wo_number;

    // Delete related records one by one with individual transactions
    const relatedTables = [
      'work_order_date_visibility',
      'work_order_status_history', 
      'work_order_attachments',
      'work_order_assignments'
    ];

    for (const table of relatedTables) {
      const tableClient = await pool.connect();
      try {
        await tableClient.query('BEGIN');
        const result = await tableClient.query(`DELETE FROM ${table} WHERE work_order_id = $1`, [workOrderId]);
        await tableClient.query('COMMIT');
        console.log(`✅ Deleted ${result.rowCount} records from ${table}`);
      } catch (tableError) {
        await tableClient.query('ROLLBACK');
        console.log(`⚠️ Could not delete from ${table}: ${tableError.message}`);
      } finally {
        tableClient.release();
      }
    }
    
    // Now delete the main work order in its own transaction
    await client.query('BEGIN');
    await client.query('DELETE FROM work_orders WHERE id = $1', [workOrderId]);
    await client.query('COMMIT');

    console.log(`✅ Work order ${woNumber} deleted successfully`);
    
    // Broadcast the deletion
    io.emit('workOrderDeleted', { id: workOrderId, wo_number: woNumber });

    res.json({ 
      success: true, 
      message: `Work order ${woNumber} deleted successfully`,
      deletedId: workOrderId 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Delete work order error:', error);
    res.status(500).json({ 
      error: 'Failed to delete work order',
      details: error.message 
    });
  } finally {
    client.release();
  }
});


/**
 * @route POST /api/dispatch/carryover
 * @description Manually trigger daily carryover for a specific date
 */
app.post('/api/dispatch/carryover', async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.body;
    
    console.log(`🔄 Running manual carryover for date: ${date}`);
    
    const result = await pool.query('SELECT daily_work_order_carryover($1)', [date]);
    const carriedOverCount = result.rows[0].daily_work_order_carryover;
    
    console.log(`✅ Carried over ${carriedOverCount} work orders to ${date}`);
    
    res.json({
      success: true,
      date,
      carriedOverCount,
      message: `Successfully carried over ${carriedOverCount} work orders`
    });
    
  } catch (error) {
    console.error('❌ Carryover error:', error);
    res.status(500).json({ error: 'Failed to run carryover process' });
  }
});

app.post('/api/dispatch/update-dates', async (req, res) => {
  try {
    const count = await updateWorkOrderDates();
    res.json({ 
      success: true, 
      message: `Updated ${count} work orders to current date`,
      count: count 
    });
  } catch (error) {
    console.error('❌ Manual date update error:', error);
    res.status(500).json({ error: 'Failed to update dates' });
  }
});

// ================================
// USER AUTHENTICATION (BASIC)
// ================================

/**
 * @route POST /api/auth/login
 * @description Handles user authentication using username and password.
 * @body {Object} credentials - { username: string, password: string }
 * @returns {Object} JWT token and basic user information.
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log(`🔐 Login attempt for user: ${username}`);

    // Retrieve user from database by username, email, or employee_number
    const result = await pool.query(`
      SELECT id, employee_number, username, email, password_hash, role, first_name, last_name, is_active
      FROM users
      WHERE (username = $1 OR email = $1 OR employee_number = $1) AND is_active = true
    `, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Compare provided password with hashed password in DB
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login timestamp
    await pool.query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    // Generate JSON Web Token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '8h' }
    );

    console.log(`✅ User ${username} logged in successfully as ${user.first_name} ${user.last_name}`);

    res.json({
      token,
      user: {
        id: user.id,
        employeeNumber: user.employee_number,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @route POST /api/auth/register
 * @description Register a new user with ICU Mechanical email
 * @body {Object} userData - { employeeNumber, firstName, lastName, email }
 * @returns {Object} JWT token and user information
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { employeeNumber, firstName, lastName, email } = req.body;

    console.log(`📝 Registration attempt for: ${email}`);

    // Validation
    if (!employeeNumber || !firstName || !lastName || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email domain
    if (!email.toLowerCase().endsWith('@icumechanical.com')) {
      return res.status(400).json({ error: 'Must use an @icumechanical.com email address' });
    }

    // Check if employee number already exists
    const employeeCheck = await pool.query(
      'SELECT id FROM users WHERE employee_number = $1',
      [employeeNumber]
    );

    if (employeeCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Employee number already registered' });
    }

    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash the employee number as the initial password
    const passwordHash = await bcrypt.hash(employeeNumber, 10);

    // Create the user with email as username
    const result = await pool.query(`
      INSERT INTO users (employee_number, username, password_hash, first_name, last_name, email, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, 'viewer', true)
      RETURNING id, employee_number, username, email, role, first_name, last_name
    `, [employeeNumber, email.toLowerCase(), passwordHash, firstName, lastName, email.toLowerCase()]);

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '8h' }
    );

    console.log(`✅ New user registered: ${email} (Employee #${employeeNumber})`);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        employeeNumber: user.employee_number,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @route GET /api/auth/me
 * @description Get current user information from token
 */
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    // Get fresh user data from database
    const result = await pool.query(`
      SELECT id, employee_number, username, role, first_name, last_name, email, is_active, last_login
      FROM users
      WHERE id = $1 AND is_active = true
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get user permissions
    const permissionsResult = await pool.query(`
      SELECT p.name, p.description, p.category
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1
    `, [user.id]);

    res.json({
      id: user.id,
      employeeNumber: user.employee_number,
      username: user.username,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      lastLogin: user.last_login,
      permissions: permissionsResult.rows
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', expired: true });
    }
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * @route POST /api/auth/logout
 * @description Logout user (could invalidate token in session table)
 */
app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Optional: Delete session from sessions table if you're tracking them
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * @route POST /api/auth/refresh
 * @description Refresh authentication token
 */
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify old token (even if expired)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', {
      ignoreExpiration: true
    });

    // Check if user is still active
    const result = await pool.query(`
      SELECT id, username, role, is_active
      FROM users
      WHERE id = $1 AND is_active = true
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = result.rows[0];

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '8h' }
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// ================================
// REPORTING ROUTES
// ================================

/**
 * @route GET /api/reports/work-orders
 * @description Generates a work order summary report with filtering options.
 */
app.get('/api/reports/work-orders', async (req, res) => {
  try {
    const { start_date, end_date, tech_id, status } = req.query;

    console.log('📊 Generating work order report');

    let whereClause = 'WHERE wo.status != \'Deleted\'';
    const values = [];
    let paramIndex = 1;

    if (start_date) {
  whereClause += ` AND wo.created_at >= $${paramIndex}`;
  values.push(start_date);
  paramIndex++;
}

if (end_date) {
  whereClause += ` AND wo.created_at <= $${paramIndex}`;
  values.push(end_date + ' 23:59:59');
  paramIndex++;
}

if (tech_id) {
  whereClause += ` AND wo.assigned_tech_id = $${paramIndex}`;
  values.push(tech_id);
  paramIndex++;
}

if (status) {
  whereClause += ` AND wo.status = $${paramIndex}`;
  values.push(status);
  paramIndex++;
}

    const result = await pool.query(`
      SELECT
        wo.*,
        c.name as customer_name,
        c.service_city,
        t.first_name || ' ' || t.last_name as tech_name,
        e.equipment_type
      FROM work_orders wo
      JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      ${whereClause}
      ORDER BY wo.created_at DESC
    `, values);

    console.log(`✅ Found ${result.rows.length} work orders for report`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Work order report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * @route GET /api/work-orders/completed
 * @description Retrieves completed work orders with filtering options.
 */
app.get('/api/work-orders/completed', async (req, res) => {
  try {
    const { 
      date = new Date().toISOString().split('T')[0], 
      days = 7, 
      queue, 
      techId 
    } = req.query;

    console.log(`📋 Loading completed work orders - Date: ${date}, Days back: ${days}`);

    let whereClause = `WHERE wo.status IN ('Complete', 'Completed')`;
    const values = [];
    let paramIndex = 1;

    // Date range filter
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - parseInt(days));
    
   whereClause += ` AND wo.completed_at >= $${paramIndex}`;
values.push(startDate.toISOString().split('T')[0]);
paramIndex++;

whereClause += ` AND wo.completed_at <= $${paramIndex}`;
values.push(date + ' 23:59:59');
paramIndex++;

// Queue filter
if (queue) {
  whereClause += ` AND wo.completion_queue = $${paramIndex}`;
  values.push(queue);
  paramIndex++;
}

// Technician filter
if (techId) {
  whereClause += ` AND wo.assigned_tech_id = $${paramIndex}`;
  values.push(techId);
  paramIndex++;
}

    const result = await pool.query(`
      SELECT
        wo.*,
        c.name as customer_name,
        c.service_city,
        c.zone as customer_zone,
        t.first_name as tech_first_name,
        t.last_name as tech_last_name,
        e.equipment_type,
        e.equipment_number
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      ${whereClause}
      ORDER BY wo.completed_at DESC
    `, values);

    console.log(`✅ Found ${result.rows.length} completed work orders`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get completed work orders error:', error);
    res.status(500).json({ error: 'Failed to get completed work orders' });
  }
});

/**
 * @route GET /api/work-orders/:id/history
 * @description Retrieves the status history for a specific work order.
 */
app.get('/api/work-orders/:id/history', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    console.log(`📜 Getting status history for work order ${workOrderId}`);

    const result = await pool.query(`
      SELECT
        wosh.*,
        'System' as changed_by_first_name,
        'User' as changed_by_last_name
      FROM work_order_status_history wosh
      WHERE wosh.work_order_id = $1
      ORDER BY wosh.changed_at DESC
    `, [workOrderId]);

    console.log(`✅ Found ${result.rows.length} status history entries`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get work order history error:', error);
    res.status(500).json({ error: 'Failed to get work order history' });
  }
});

// ============================================================
// WORK ORDER STATUS AND ASSIGNMENT TRACKING ENDPOINTS
// ============================================================

/**
 * @route POST /api/work-orders/:id/assignments
 * @description Record a new assignment/physical visit for a work order
 * This tracks only actual on-site visits, NOT carry-over days
 */
app.post('/api/work-orders/:id/assignments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workOrderId = req.params.id;
    const {
      assignment_date,
      technician_id,
      status_after_visit,
      time_slot,
      suspension_reason,
      notes,
      created_by_user_id
    } = req.body;

    console.log(`📅 Recording assignment for work order ${workOrderId} on ${assignment_date}`);

    // Validate work order exists
    const woExists = await client.query(
      'SELECT id, status FROM work_orders WHERE id = $1',
      [workOrderId]
    );

    if (woExists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Insert assignment record
    const assignmentResult = await client.query(`
      INSERT INTO work_order_assignments (
        work_order_id,
        assignment_date,
        technician_id,
        status_after_visit,
        time_slot,
        suspension_reason,
        notes,
        created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      workOrderId,
      assignment_date,
      technician_id,
      status_after_visit,
      time_slot,
      suspension_reason,
      notes,
      created_by_user_id
    ]);

    // Update work order status based on visit outcome
    const updateFields = ['status = $1', 'updated_at = NOW()'];
    const updateValues = [status_after_visit];
    let paramCount = 2;

    if (status_after_visit === 'Suspended') {
      updateFields.push(`suspended_date = $${paramCount}`);
      updateValues.push(assignment_date);
      paramCount++;

      if (suspension_reason) {
        updateFields.push(`suspension_reason = $${paramCount}`);
        updateValues.push(suspension_reason);
        paramCount++;
      }
    } else if (status_after_visit === 'Complete') {
      updateFields.push(`completed_date = $${paramCount}`);
      updateValues.push(assignment_date);
      paramCount++;
    }

    updateValues.push(workOrderId);
    const updateQuery = `
      UPDATE work_orders
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const updatedWO = await client.query(updateQuery, updateValues);

    await client.query('COMMIT');

    console.log(`✅ Assignment recorded successfully`);
    res.json({
      success: true,
      message: 'Assignment recorded successfully',
      assignment: assignmentResult.rows[0],
      workOrder: updatedWO.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Record assignment error:', error);
    res.status(500).json({
      error: 'Failed to record assignment',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * @route GET /api/work-orders/:id/assignments
 * @description Get assignment history for a work order (all physical visits)
 */
app.get('/api/work-orders/:id/assignments', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    console.log(`📋 Getting assignment history for work order ${workOrderId}`);

    const result = await pool.query(`
      SELECT * FROM get_work_order_assignment_history($1)
    `, [workOrderId]);

    console.log(`✅ Found ${result.rows.length} assignments`);
    res.json({
      work_order_id: parseInt(workOrderId),
      assignments: result.rows
    });

  } catch (error) {
    console.error('❌ Get assignments error:', error);
    res.status(500).json({
      error: 'Failed to get assignments',
      details: error.message
    });
  }
});

/**
 * @route PUT /api/work-orders/:id/queue
 * @description Update work order queue (separate from DBoard columns)
 * Queues: 'Needs Parts', 'Needs Return Trip', etc.
 */
app.put('/api/work-orders/:id/queue', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { queue } = req.body;

    console.log(`🔄 Updating work order ${workOrderId} queue to: ${queue || 'none'}`);

    const result = await pool.query(`
      UPDATE work_orders
      SET queue = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [queue, workOrderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    console.log(`✅ Queue updated successfully`);
    res.json({
      success: true,
      message: 'Queue updated successfully',
      workOrder: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Update queue error:', error);
    res.status(500).json({
      error: 'Failed to update queue',
      details: error.message
    });
  }
});

/**
 * @route PUT /api/work-orders/:id/remarks
 * @description Update customer remarks (no character limit like Vision)
 */
app.put('/api/work-orders/:id/remarks', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { customer_remarks } = req.body;

    console.log(`💬 Updating work order ${workOrderId} customer remarks`);

    const result = await pool.query(`
      UPDATE work_orders
      SET customer_remarks = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [customer_remarks, workOrderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    console.log(`✅ Customer remarks updated successfully`);
    res.json({
      success: true,
      message: 'Customer remarks updated successfully',
      workOrder: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Update remarks error:', error);
    res.status(500).json({
      error: 'Failed to update remarks',
      details: error.message
    });
  }
});

/**
 * @route GET /api/work-orders/by-queue
 * @description Get work orders filtered by queue status
 * Query params: queue (optional), status (optional)
 */
app.get('/api/work-orders/by-queue', async (req, res) => {
  try {
    const { queue, status } = req.query;

    console.log(`🔍 Getting work orders - Queue: ${queue || 'all'}, Status: ${status || 'all'}`);

    let query = `
      SELECT wo.*, c.name as customer_name, c.service_city,
             t.first_name as tech_first_name, t.last_name as tech_last_name,
             e.equipment_type, e.equipment_number
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN technicians t ON wo.assigned_tech_id = t.id
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (queue) {
      query += ` AND wo.queue = $${paramCount}`;
      params.push(queue);
      paramCount++;
    }

    if (status) {
      query += ` AND wo.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY wo.scheduled_date DESC, wo.created_at DESC`;

    const result = await pool.query(query, params);

    console.log(`✅ Found ${result.rows.length} work orders`);
    res.json({
      count: result.rows.length,
      workOrders: result.rows
    });

  } catch (error) {
    console.error('❌ Get work orders by queue error:', error);
    res.status(500).json({
      error: 'Failed to get work orders',
      details: error.message
    });
  }
});

/**
 * @route GET /api/work-orders/status-summary
 * @description Get summary counts of work orders by status and queue
 */
app.get('/api/work-orders/status-summary', async (req, res) => {
  try {
    console.log(`📊 Getting work order status summary`);

    const result = await pool.query(`
      SELECT
        status,
        queue,
        COUNT(*) as count
      FROM work_orders
      WHERE status != 'Complete'
      GROUP BY status, queue
      ORDER BY status, queue
    `);

    // Transform into more useful structure
    const summary = {
      by_status: {},
      by_queue: {},
      total: 0
    };

    result.rows.forEach(row => {
      // By status
      if (!summary.by_status[row.status]) {
        summary.by_status[row.status] = 0;
      }
      summary.by_status[row.status] += parseInt(row.count);

      // By queue
      const queueKey = row.queue || 'none';
      if (!summary.by_queue[queueKey]) {
        summary.by_queue[queueKey] = 0;
      }
      summary.by_queue[queueKey] += parseInt(row.count);

      summary.total += parseInt(row.count);
    });

    console.log(`✅ Status summary generated`);
    res.json(summary);

  } catch (error) {
    console.error('❌ Get status summary error:', error);
    res.status(500).json({
      error: 'Failed to get status summary',
      details: error.message
    });
  }
});

/**
 * @route POST /api/work-orders/:id/check-in
 * @description Tech checks into a work order (arrives on-site)
 * Sets status to "In Progress" and records start of visit
 */
app.post('/api/work-orders/:id/check-in', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workOrderId = req.params.id;
    const {
      technician_id,
      check_in_time,
      user_id
    } = req.body;

    const checkInDate = new Date().toISOString().split('T')[0];
    const checkInDateTime = check_in_time || new Date().toISOString();

    console.log(`✅ Tech checking in to work order ${workOrderId} at ${checkInDateTime}`);

    // Validate work order exists
    const woExists = await client.query(
      'SELECT id, status, assigned_tech_id FROM work_orders WHERE id = $1',
      [workOrderId]
    );

    if (woExists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Update work order status to "In Progress"
    const updateResult = await client.query(`
      UPDATE work_orders
      SET status = 'In Progress',
          assigned_tech_id = COALESCE($2, assigned_tech_id),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [workOrderId, technician_id]);

    // Record check-in as metadata (we'll store this temporarily until check-out)
    // For now, just update status - we'll create the assignment record on check-out
    await client.query(`
      UPDATE work_orders
      SET status_notes = CONCAT(
        COALESCE(status_notes, ''),
        E'\nChecked in at ',
        $2::text
      )
      WHERE id = $1
    `, [workOrderId, checkInDateTime]);

    await client.query('COMMIT');

    console.log(`✅ Tech checked in successfully`);

    // Broadcast WebSocket update
    broadcastWorkOrderUpdate(updateResult.rows[0], 'checked_in', [checkInDate]);

    res.json({
      success: true,
      message: 'Checked in successfully',
      workOrder: updateResult.rows[0],
      check_in_time: checkInDateTime
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Check-in error:', error);
    res.status(500).json({
      error: 'Failed to check in',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * @route POST /api/work-orders/:id/check-out
 * @description Tech checks out of a work order (leaves site)
 * Records the assignment and sets final status
 */
app.post('/api/work-orders/:id/check-out', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const workOrderId = req.params.id;
    const {
      technician_id,
      status_after_visit, // 'Active', 'Suspended', 'Complete'
      suspension_reason,
      notes,
      time_slot,
      user_id
    } = req.body;

    const checkOutDate = new Date().toISOString().split('T')[0];

    console.log(`🏁 Tech checking out of work order ${workOrderId} with status: ${status_after_visit}`);

    // Validate work order exists
    const woResult = await client.query(
      'SELECT id, status, assigned_tech_id FROM work_orders WHERE id = $1',
      [workOrderId]
    );

    if (woResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Work order not found' });
    }

    const currentWO = woResult.rows[0];
    const finalTechId = technician_id || currentWO.assigned_tech_id;

    // Record the assignment (physical visit)
    const assignmentResult = await client.query(`
      INSERT INTO work_order_assignments (
        work_order_id,
        assignment_date,
        technician_id,
        status_after_visit,
        time_slot,
        suspension_reason,
        notes,
        created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      workOrderId,
      checkOutDate,
      finalTechId,
      status_after_visit,
      time_slot,
      suspension_reason,
      notes,
      user_id
    ]);

    // Update work order with final status
    const updateFields = ['status = $1', 'updated_at = NOW()'];
    const updateValues = [status_after_visit];
    let paramCount = 2;

    if (status_after_visit === 'Suspended') {
      updateFields.push(`suspended_date = $${paramCount}`);
      updateValues.push(checkOutDate);
      paramCount++;

      if (suspension_reason) {
        updateFields.push(`suspension_reason = $${paramCount}`);
        updateValues.push(suspension_reason);
        paramCount++;
      }
    } else if (status_after_visit === 'Complete') {
      updateFields.push(`completed_date = $${paramCount}`);
      updateValues.push(checkOutDate);
      paramCount++;
    }

    updateValues.push(workOrderId);
    const updateQuery = `
      UPDATE work_orders
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const updatedWO = await client.query(updateQuery, updateValues);

    await client.query('COMMIT');

    console.log(`✅ Tech checked out successfully`);

    // Broadcast WebSocket update
    broadcastWorkOrderUpdate(updatedWO.rows[0], 'checked_out', [checkOutDate]);

    res.json({
      success: true,
      message: 'Checked out successfully',
      workOrder: updatedWO.rows[0],
      assignment: assignmentResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Check-out error:', error);
    res.status(500).json({
      error: 'Failed to check out',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * @route GET /api/work-orders/:id/check-in-status
 * @description Check if a work order is currently checked in
 */
app.get('/api/work-orders/:id/check-in-status', async (req, res) => {
  try {
    const workOrderId = req.params.id;

    const result = await pool.query(`
      SELECT
        id,
        status,
        assigned_tech_id,
        status_notes
      FROM work_orders
      WHERE id = $1
    `, [workOrderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const wo = result.rows[0];
    const isCheckedIn = wo.status === 'In Progress';

    res.json({
      work_order_id: parseInt(workOrderId),
      is_checked_in: isCheckedIn,
      status: wo.status,
      assigned_tech_id: wo.assigned_tech_id
    });

  } catch (error) {
    console.error('❌ Check-in status error:', error);
    res.status(500).json({
      error: 'Failed to get check-in status',
      details: error.message
    });
  }
});


// ============================================================
// SERVER.JS ADDITIONS - Customer Contacts & Notes API Endpoints
// File: backend/server.js
// 
// ADD these endpoints to your existing server.js file
// Place them after your existing customer endpoints
// ============================================================

// ============================================================
// CUSTOMER CONTACTS ENDPOINTS
// ============================================================

// GET /api/customers/:id/contacts - Get all contacts for a customer
app.get('/api/customers/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM customer_contacts 
      WHERE customer_id = $1 
      ORDER BY is_primary DESC, contact_type, name
    `, [id]);
    
    res.json({
      customer_id: parseInt(id),
      contacts: result.rows,
      total_count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching customer contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST /api/customers/:id/contacts - Create a new contact
app.post('/api/customers/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contact_type = 'general',
      name,
      title,
      phone,
      phone_type = 'office',
      phone_2,
      phone_2_type,
      email,
      is_primary = false,
      receives_invoices = false,
      receives_wo_updates = false,
      notes
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Contact name is required' });
    }
    
    // If this is set as primary, unset any existing primary contact
    if (is_primary) {
      await pool.query(
        'UPDATE customer_contacts SET is_primary = false WHERE customer_id = $1',
        [id]
      );
    }
    
    const result = await pool.query(`
      INSERT INTO customer_contacts (
        customer_id, contact_type, name, title, phone, phone_type,
        phone_2, phone_2_type, email, is_primary, receives_invoices,
        receives_wo_updates, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id, contact_type, name, title, phone, phone_type,
      phone_2, phone_2_type, email, is_primary, receives_invoices,
      receives_wo_updates, notes
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PUT /api/customers/:customerId/contacts/:contactId - Update a contact
app.put('/api/customers/:customerId/contacts/:contactId', async (req, res) => {
  try {
    const { customerId, contactId } = req.params;
    const {
      contact_type,
      name,
      title,
      phone,
      phone_type,
      phone_2,
      phone_2_type,
      email,
      is_primary,
      receives_invoices,
      receives_wo_updates,
      notes
    } = req.body;
    
    // If setting as primary, unset other primary contacts first
    if (is_primary) {
      await pool.query(
        'UPDATE customer_contacts SET is_primary = false WHERE customer_id = $1 AND id != $2',
        [customerId, contactId]
      );
    }
    
    const result = await pool.query(`
      UPDATE customer_contacts SET
        contact_type = COALESCE($1, contact_type),
        name = COALESCE($2, name),
        title = COALESCE($3, title),
        phone = COALESCE($4, phone),
        phone_type = COALESCE($5, phone_type),
        phone_2 = COALESCE($6, phone_2),
        phone_2_type = COALESCE($7, phone_2_type),
        email = COALESCE($8, email),
        is_primary = COALESCE($9, is_primary),
        receives_invoices = COALESCE($10, receives_invoices),
        receives_wo_updates = COALESCE($11, receives_wo_updates),
        notes = COALESCE($12, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 AND customer_id = $14
      RETURNING *
    `, [
      contact_type, name, title, phone, phone_type,
      phone_2, phone_2_type, email, is_primary, receives_invoices,
      receives_wo_updates, notes, contactId, customerId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/customers/:customerId/contacts/:contactId - Delete a contact
app.delete('/api/customers/:customerId/contacts/:contactId', async (req, res) => {
  try {
    const { customerId, contactId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM customer_contacts WHERE id = $1 AND customer_id = $2 RETURNING *',
      [contactId, customerId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json({ message: 'Contact deleted successfully', contact: result.rows[0] });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ============================================================
// CUSTOMER NOTES ENDPOINTS
// ============================================================

// GET /api/customers/:id/notes - Get all notes for a customer
app.get('/api/customers/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { pinned_only } = req.query;
    
    let query = `
      SELECT * FROM customer_notes 
      WHERE customer_id = $1
    `;
    
    if (pinned_only === 'true') {
      query += ' AND is_pinned = true';
    }
    
    query += ' ORDER BY is_pinned DESC, created_at DESC';
    
    const result = await pool.query(query, [id]);
    
    const pinnedCount = result.rows.filter(n => n.is_pinned).length;
    
    res.json({
      customer_id: parseInt(id),
      notes: result.rows,
      total_count: result.rows.length,
      pinned_count: pinnedCount
    });
  } catch (error) {
    console.error('Error fetching customer notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/customers/:id/notes - Create a new note
app.post('/api/customers/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      note_text,
      note_type = 'general',
      is_pinned = false,
      created_by,
      created_by_user_id
    } = req.body;
    
    if (!note_text || note_text.trim() === '') {
      return res.status(400).json({ error: 'Note text is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO customer_notes (
        customer_id, note_text, note_type, is_pinned, created_by, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, note_text, note_type, is_pinned, created_by, created_by_user_id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT /api/customers/:customerId/notes/:noteId - Update a note
app.put('/api/customers/:customerId/notes/:noteId', async (req, res) => {
  try {
    const { customerId, noteId } = req.params;
    const { note_text, note_type, is_pinned } = req.body;
    
    const result = await pool.query(`
      UPDATE customer_notes SET
        note_text = COALESCE($1, note_text),
        note_type = COALESCE($2, note_type),
        is_pinned = COALESCE($3, is_pinned),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND customer_id = $5
      RETURNING *
    `, [note_text, note_type, is_pinned, noteId, customerId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// PATCH /api/customers/:customerId/notes/:noteId/pin - Toggle pin status
app.patch('/api/customers/:customerId/notes/:noteId/pin', async (req, res) => {
  try {
    const { customerId, noteId } = req.params;
    
    const result = await pool.query(`
      UPDATE customer_notes SET
        is_pinned = NOT is_pinned,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND customer_id = $2
      RETURNING *
    `, [noteId, customerId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling note pin:', error);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// DELETE /api/customers/:customerId/notes/:noteId - Delete a note
app.delete('/api/customers/:customerId/notes/:noteId', async (req, res) => {
  try {
    const { customerId, noteId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM customer_notes WHERE id = $1 AND customer_id = $2 RETURNING *',
      [noteId, customerId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ message: 'Note deleted successfully', note: result.rows[0] });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ============================================================
// CUSTOMER EQUIPMENT ENDPOINT (if not already exists)
// ============================================================

// GET /api/customers/:id/equipment - Get all equipment for a customer
app.get('/api/customers/:id/equipment', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        e.*,
        (SELECT COUNT(*) FROM work_orders wo WHERE wo.equipment_id = e.id) as work_order_count
      FROM equipment e
      WHERE e.customer_id = $1 AND e.is_active = true
      ORDER BY e.equipment_number, e.equipment_type
    `, [id]);
    
    res.json({
      customer_id: parseInt(id),
      equipment: result.rows,
      total_count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching customer equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// ============================================================
// DUPLICATE ENDPOINT REMOVED - Using comprehensive endpoint at line 720
// The first endpoint already handles this with full pagination and better error handling

// ================================
// FILE UPLOAD HANDLING
// ================================

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, Word docs, Excel files
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, Word docs, and Excel files are allowed'));
    }
  }
});

/**
 * @route GET /api/work-orders/:id/attachments
 * @description Get all attachments for a work order
 */
app.get('/api/work-orders/:id/attachments', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    console.log(`📎 Getting attachments for work order ${workOrderId}`);

    const result = await pool.query(`
      SELECT
        id,
        work_order_id,
        file_name,
        file_type,
        file_size,
        file_path as file_url,
        file_path as thumbnail_url,
        file_category,
        uploaded_by,
        uploaded_at,
        notes as description
      FROM file_attachments
      WHERE work_order_id = $1
      ORDER BY uploaded_at DESC
    `, [workOrderId]);

    console.log(`✅ Found ${result.rows.length} attachments`);
    res.json({
      work_order_id: parseInt(workOrderId),
      attachments: result.rows
    });
  } catch (error) {
    console.error('❌ Get attachments error:', error);
    res.status(500).json({ error: 'Failed to get attachments' });
  }
});

/**
 * @route POST /api/work-orders/:id/attachments
 * @description Upload one or more files as attachments to a work order
 */
app.post('/api/work-orders/:id/attachments', upload.array('files', 10), async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`📎 Adding ${files.length} attachment(s) to work order ${workOrderId}`);

    const uploadedFiles = [];

    for (const file of files) {
      const filePath = `/uploads/${file.filename}`;

      const result = await pool.query(`
        INSERT INTO file_attachments (
          work_order_id,
          file_name,
          file_type,
          file_size,
          file_category,
          file_path,
          uploaded_by,
          uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [
        workOrderId,
        file.originalname,
        file.mimetype,
        file.size,
        'photo', // Default category
        filePath,
        1 // Default user ID - will need to be replaced with actual auth later
      ]);

      uploadedFiles.push(result.rows[0]);
    }

    console.log(`✅ ${uploadedFiles.length} attachment(s) uploaded successfully`);
    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      uploaded: uploadedFiles
    });
  } catch (error) {
    console.error('❌ Upload attachment error:', error);
    res.status(500).json({ error: 'Failed to upload attachments', details: error.message });
  }
});

/**
 * @route DELETE /api/work-orders/:id/attachments/:attachmentId
 * @description Delete an attachment
 */
app.delete('/api/work-orders/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const { id: workOrderId, attachmentId } = req.params;
    console.log(`🗑️ Deleting attachment ${attachmentId} from work order ${workOrderId}`);

    // Get file info before deleting
    const fileResult = await pool.query(
      'SELECT * FROM file_attachments WHERE id = $1 AND work_order_id = $2',
      [attachmentId, workOrderId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const file = fileResult.rows[0];

    // Delete from database
    const result = await pool.query(
      'DELETE FROM file_attachments WHERE id = $1 AND work_order_id = $2 RETURNING *',
      [attachmentId, workOrderId]
    );

    // Try to delete from filesystem
    try {
      const filePath = path.join(__dirname, file.file_path);
      await fs.unlink(filePath);
    } catch (fsError) {
      console.warn('⚠️  Could not delete file from filesystem:', fsError.message);
    }

    console.log(`✅ Attachment ${attachmentId} deleted`);
    res.json({
      message: 'Attachment deleted successfully',
      deleted: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Delete attachment error:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// ====================================
// MULTI-DAY SCHEDULING API
// ====================================

// Get work orders for a specific date (includes multi-day projects)
app.get('/api/schedule/date/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const result = await pool.query(
      'SELECT * FROM get_work_orders_for_date($1)',
      [date]
    );

    res.json({
      date,
      work_orders: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Schedule date fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule for date' });
  }
});

// Get work orders for a date range (calendar view)
app.get('/api/schedule/range', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date required' });
    }

    const result = await pool.query(
      'SELECT * FROM get_work_orders_for_date_range($1, $2)',
      [start_date, end_date]
    );

    res.json({
      start_date,
      end_date,
      work_orders: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Schedule range fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule range' });
  }
});

// Get upcoming multi-day projects
app.get('/api/schedule/multi-day-projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM upcoming_multi_day_projects');

    res.json({
      projects: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Multi-day projects fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch multi-day projects' });
  }
});

// Update work order to be multi-day
app.put('/api/work-orders/:id/make-multi-day', async (req, res) => {
  try {
    const { id } = req.params;
    const { project_start_date, project_end_date, estimated_hours, project_notes } = req.body;

    if (!project_start_date || !project_end_date) {
      return res.status(400).json({ error: 'project_start_date and project_end_date required' });
    }

    // Validate date range
    if (new Date(project_end_date) < new Date(project_start_date)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const result = await pool.query(
      `UPDATE work_orders
       SET is_multi_day = TRUE,
           project_start_date = $1,
           project_end_date = $2,
           estimated_hours = $3,
           project_notes = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [project_start_date, project_end_date, estimated_hours, project_notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    console.log(`✅ Work order ${id} converted to multi-day project`);
    io.emit('workOrderUpdated', result.rows[0]);

    res.json({
      message: 'Work order converted to multi-day project',
      work_order: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Make multi-day error:', error);
    res.status(500).json({ error: 'Failed to convert to multi-day project' });
  }
});

// Convert multi-day back to single day
app.put('/api/work-orders/:id/make-single-day', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE work_orders
       SET is_multi_day = FALSE,
           project_start_date = NULL,
           project_end_date = NULL,
           estimated_hours = NULL,
           project_notes = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    console.log(`✅ Work order ${id} converted back to single day`);
    io.emit('workOrderUpdated', result.rows[0]);

    res.json({
      message: 'Work order converted to single day',
      work_order: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Make single day error:', error);
    res.status(500).json({ error: 'Failed to convert to single day' });
  }
});

// ================================
// GPS AND LOCATION TRACKING
// ================================

/**
 * @route POST /api/map/gps-webhook
 * @description Updates technician location from GPS webhook.
 */
app.post('/api/map/gps-webhook', async (req, res) => {
  try {
    const { device_id, latitude, longitude, timestamp, speed, heading } = req.body;

    console.log(`📡 GPS webhook received for device ${device_id}`);

    const techResult = await pool.query(
      'SELECT id FROM technicians WHERE gps_device_id = $1',
      [device_id]
    );

    if (techResult.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const techId = techResult.rows[0].id;

    await pool.query(`
      UPDATE technicians
      SET latitude = $1, longitude = $2, last_location_update = $3,
          gps_speed = $4, gps_heading = $5
      WHERE id = $6
    `, [latitude, longitude, new Date(timestamp), speed, heading, techId]);

    io.emit('techLocationUpdate', {
      techId,
      location: { latitude, longitude },
      speed,
      heading,
      timestamp: new Date(timestamp)
    });

    console.log(`✅ GPS location updated for tech ${techId}`);
    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    console.error('❌ GPS webhook error:', error);
    res.status(500).json({ error: 'Failed to process GPS update' });
  }
});

// ================================
// QUEUE MANAGEMENT API
// ================================

/**
 * @route GET /api/queues
 * @description Get all active work order queues with counts
 */
app.get('/api/queues', async (req, res) => {
  try {
    console.log('📊 Fetching all queues');

    const result = await pool.query(`
      SELECT * FROM queue_summary
      ORDER BY display_order
    `);

    console.log(`✅ Found ${result.rows.length} queues`);
    res.json({ queues: result.rows });
  } catch (error) {
    console.error('❌ Get queues error:', error);
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
});

/**
 * @route GET /api/queues/:queueName/work-orders
 * @description Get all work orders in a specific queue
 */
app.get('/api/queues/:queueName/work-orders', async (req, res) => {
  try {
    const { queueName } = req.params;
    console.log(`📋 Fetching work orders for queue: ${queueName}`);

    const result = await pool.query(`
      SELECT
        wo.id,
        wo.work_order_number,
        wo.customer_id,
        wo.customer_name,
        wo.service_location,
        wo.customer_city,
        wo.customer_zone,
        wo.equipment_type,
        wo.equipment_number,
        wo.problem_description,
        wo.status,
        wo.call_urgency,
        wo.call_rate,
        wo.scheduled_date,
        wo.scheduled_time_slot,
        wo.technician_id,
        wo.needs_parts,
        wo.needs_return_trip,
        wo.parts_ordered_at,
        wo.parts_ready_at,
        wo.created_at,
        qa.assigned_at AS queue_assigned_at,
        qa.priority AS queue_priority,
        qa.assignment_notes,
        t.first_name AS tech_first_name,
        t.last_name AS tech_last_name,
        t.crew AS tech_crew,
        t.van_number AS tech_van_number
      FROM work_order_queue_assignments qa
      JOIN work_orders wo ON qa.work_order_id = wo.id
      JOIN work_order_queues q ON qa.queue_id = q.id
      LEFT JOIN technicians t ON wo.technician_id = t.id
      WHERE q.queue_name = $1
        AND qa.removed_at IS NULL
        AND q.is_active = TRUE
      ORDER BY qa.priority DESC, qa.assigned_at ASC
    `, [queueName]);

    console.log(`✅ Found ${result.rows.length} work orders in ${queueName}`);
    res.json({
      queue_name: queueName,
      work_orders: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Get queue work orders error:', error);
    res.status(500).json({ error: 'Failed to fetch queue work orders' });
  }
});

/**
 * @route POST /api/work-orders/:id/move-to-queue
 * @description Move a work order to a different queue
 */
app.post('/api/work-orders/:id/move-to-queue', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { queueName, reason, userId } = req.body;

    console.log(`🔄 Moving work order ${workOrderId} to queue: ${queueName}`);

    const result = await pool.query(
      'SELECT move_work_order_to_queue($1, $2, $3, $4, FALSE) AS success',
      [workOrderId, queueName, userId || null, reason || null]
    );

    if (result.rows[0].success) {
      console.log(`✅ Work order ${workOrderId} moved to ${queueName}`);

      // Broadcast queue update via WebSocket
      io.emit('queueUpdated', {
        workOrderId: parseInt(workOrderId),
        queueName,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Work order moved to ${queueName}`,
        queue_name: queueName
      });
    } else {
      res.json({
        success: false,
        message: 'Work order was already in this queue'
      });
    }
  } catch (error) {
    console.error('❌ Move to queue error:', error);
    res.status(500).json({ error: 'Failed to move work order to queue', details: error.message });
  }
});

/**
 * @route POST /api/work-orders/:id/checkout
 * @description Handle work order checkout with automatic queue routing
 */
app.post('/api/work-orders/:id/checkout', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { needsParts, needsReturn, userId, statusNotes } = req.body;

    console.log(`✅ Checking out work order ${workOrderId}`);
    console.log(`   Needs parts: ${needsParts}, Needs return: ${needsReturn}`);

    // Route to appropriate queue based on checkout answers
    const result = await pool.query(
      'SELECT route_work_order_on_checkout($1, $2, $3, $4) AS target_queue',
      [workOrderId, needsParts || false, needsReturn || false, userId || null]
    );

    const targetQueue = result.rows[0].target_queue;

    // Update status notes if provided
    if (statusNotes) {
      await pool.query(
        'UPDATE work_orders SET status_notes = $1 WHERE id = $2',
        [statusNotes, workOrderId]
      );
    }

    console.log(`✅ Work order ${workOrderId} routed to: ${targetQueue}`);

    // Broadcast checkout event via WebSocket
    io.emit('workOrderCheckedOut', {
      workOrderId: parseInt(workOrderId),
      queueName: targetQueue,
      needsParts,
      needsReturn,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Work order checked out successfully',
      target_queue: targetQueue,
      needs_parts: needsParts,
      needs_return: needsReturn
    });
  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({ error: 'Failed to checkout work order', details: error.message });
  }
});

/**
 * @route GET /api/work-orders/:id/queue-history
 * @description Get queue movement history for a work order
 */
app.get('/api/work-orders/:id/queue-history', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    console.log(`📜 Fetching queue history for work order ${workOrderId}`);

    const result = await pool.query(`
      SELECT
        h.id,
        h.moved_at,
        h.move_reason,
        h.automatic,
        fq.queue_name AS from_queue,
        tq.queue_name AS to_queue,
        u.username AS moved_by_user
      FROM work_order_queue_history h
      LEFT JOIN work_order_queues fq ON h.from_queue_id = fq.id
      LEFT JOIN work_order_queues tq ON h.to_queue_id = tq.id
      LEFT JOIN users u ON h.moved_by = u.id
      WHERE h.work_order_id = $1
      ORDER BY h.moved_at DESC
    `, [workOrderId]);

    console.log(`✅ Found ${result.rows.length} queue movements`);
    res.json({
      work_order_id: parseInt(workOrderId),
      history: result.rows
    });
  } catch (error) {
    console.error('❌ Get queue history error:', error);
    res.status(500).json({ error: 'Failed to fetch queue history' });
  }
});

/**
 * @route PUT /api/work-orders/:id/parts-ordered
 * @description Mark parts as ordered and move to Parts Ordered queue
 */
app.put('/api/work-orders/:id/parts-ordered', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { userId, notes } = req.body;

    console.log(`📦 Marking parts as ordered for work order ${workOrderId}`);

    // Update parts_ordered_at timestamp
    await pool.query(
      'UPDATE work_orders SET parts_ordered_at = NOW() WHERE id = $1',
      [workOrderId]
    );

    // Move to Parts Ordered queue
    await pool.query(
      'SELECT move_work_order_to_queue($1, $2, $3, $4, FALSE)',
      [workOrderId, 'Parts Ordered', userId || null, notes || 'Parts ordered']
    );

    console.log(`✅ Parts marked as ordered for work order ${workOrderId}`);

    // Broadcast update
    io.emit('partsOrdered', {
      workOrderId: parseInt(workOrderId),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Parts marked as ordered',
      queue_name: 'Parts Ordered'
    });
  } catch (error) {
    console.error('❌ Parts ordered error:', error);
    res.status(500).json({ error: 'Failed to mark parts as ordered' });
  }
});

/**
 * @route PUT /api/work-orders/:id/parts-ready
 * @description Mark parts as ready and move to Ready to Schedule queue
 */
app.put('/api/work-orders/:id/parts-ready', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const { userId, notes } = req.body;

    console.log(`✅ Marking parts as ready for work order ${workOrderId}`);

    // Update parts_ready_at timestamp
    await pool.query(
      'UPDATE work_orders SET parts_ready_at = NOW() WHERE id = $1',
      [workOrderId]
    );

    // Move to Ready to Schedule queue
    await pool.query(
      'SELECT move_work_order_to_queue($1, $2, $3, $4, FALSE)',
      [workOrderId, 'Ready to Schedule', userId || null, notes || 'Parts arrived and ready']
    );

    console.log(`✅ Parts marked as ready for work order ${workOrderId}`);

    // Broadcast update
    io.emit('partsReady', {
      workOrderId: parseInt(workOrderId),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Parts marked as ready',
      queue_name: 'Ready to Schedule'
    });
  } catch (error) {
    console.error('❌ Parts ready error:', error);
    res.status(500).json({ error: 'Failed to mark parts as ready' });
  }
});

// ====================================
// PURCHASE ORDER MANAGEMENT API
// ====================================

// -------------------- VENDORS --------------------

// Get all vendors
app.get('/api/vendors', async (req, res) => {
  try {
    const { active_only } = req.query;

    let query = 'SELECT * FROM vendors';
    if (active_only === 'true') {
      query += ' WHERE is_active = TRUE';
    }
    query += ' ORDER BY vendor_name';

    const result = await pool.query(query);

    res.json({
      vendors: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Vendors fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Get vendor by ID
app.get('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM vendors WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ vendor: result.rows[0] });
  } catch (error) {
    console.error('❌ Vendor fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// Create new vendor
app.post('/api/vendors', async (req, res) => {
  try {
    const {
      vendor_name,
      vendor_code,
      payment_type,
      contact_person,
      phone,
      email,
      website,
      address_line1,
      address_line2,
      city,
      state,
      zip,
      account_number,
      terms,
      credit_limit,
      notes,
      created_by
    } = req.body;

    const result = await pool.query(
      `INSERT INTO vendors (
        vendor_name, vendor_code, payment_type, contact_person, phone, email, website,
        address_line1, address_line2, city, state, zip, account_number, terms,
        credit_limit, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        vendor_name, vendor_code, payment_type || 'net_30', contact_person, phone, email, website,
        address_line1, address_line2, city, state, zip, account_number, terms,
        credit_limit, notes, created_by
      ]
    );

    console.log(`✅ Vendor created: ${vendor_name}`);
    io.emit('vendorCreated', result.rows[0]);

    res.status(201).json({
      message: 'Vendor created successfully',
      vendor: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Vendor creation error:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// Update vendor
app.put('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateFields).forEach(key => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateFields[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE vendors SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    console.log(`✅ Vendor updated: ${result.rows[0].vendor_name}`);
    io.emit('vendorUpdated', result.rows[0]);

    res.json({
      message: 'Vendor updated successfully',
      vendor: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Vendor update error:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// -------------------- PURCHASE ORDERS --------------------

// Get all purchase orders with summary
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const { status, work_order_id, vendor_id } = req.query;

    let query = 'SELECT * FROM purchase_order_summary WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (work_order_id) {
      query += ` AND work_order_id = $${paramCount}`;
      params.push(work_order_id);
      paramCount++;
    }

    if (vendor_id) {
      query += ` AND vendor_id = $${paramCount}`;
      params.push(vendor_id);
      paramCount++;
    }

    query += ' ORDER BY order_date DESC, po_number DESC';

    const result = await pool.query(query, params);

    res.json({
      purchase_orders: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ PO fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// Get PO by ID with items
app.get('/api/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get PO summary
    const poResult = await pool.query(
      'SELECT * FROM purchase_order_summary WHERE id = $1',
      [id]
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Get PO items
    const itemsResult = await pool.query(
      'SELECT * FROM purchase_order_items WHERE po_id = $1 ORDER BY line_number',
      [id]
    );

    res.json({
      purchase_order: poResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('❌ PO detail fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order details' });
  }
});

// Create new purchase order
app.post('/api/purchase-orders', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      work_order_id,
      vendor_id,
      expected_delivery_date,
      order_notes,
      ordered_by,
      items // Array of line items
    } = req.body;

    // Generate PO number
    const poNumberResult = await client.query('SELECT generate_po_number() AS po_number');
    const po_number = poNumberResult.rows[0].po_number;

    // Calculate totals from items
    let subtotal = 0;
    if (items && items.length > 0) {
      subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity_ordered * item.unit_price);
      }, 0);
    }

    const tax = subtotal * 0.0; // Tax calculated later if needed
    const shipping = 0; // Shipping added later if needed
    const total_amount = subtotal + tax + shipping;

    // Create PO
    const poResult = await client.query(
      `INSERT INTO purchase_orders (
        po_number, work_order_id, vendor_id, expected_delivery_date,
        subtotal, tax, shipping, total_amount, order_notes, ordered_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        po_number, work_order_id, vendor_id, expected_delivery_date,
        subtotal, tax, shipping, total_amount, order_notes, ordered_by
      ]
    );

    const po_id = poResult.rows[0].id;

    // Add line items
    const createdItems = [];
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const extended_price = item.quantity_ordered * item.unit_price;

        const itemResult = await client.query(
          `INSERT INTO purchase_order_items (
            po_id, line_number, part_number, description,
            quantity_ordered, unit_price, extended_price, item_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            po_id, i + 1, item.part_number, item.description,
            item.quantity_ordered, item.unit_price, extended_price, item.item_notes
          ]
        );

        createdItems.push(itemResult.rows[0]);
      }
    }

    // If PO is for a work order, move WO to "Parts Ordered" queue
    if (work_order_id) {
      await client.query(
        `SELECT move_work_order_to_queue($1, 'Parts Ordered', $2, $3, TRUE)`,
        [work_order_id, ordered_by, `PO ${po_number} created`]
      );
    }

    await client.query('COMMIT');

    console.log(`✅ Purchase order created: ${po_number}`);
    io.emit('purchaseOrderCreated', { po: poResult.rows[0], items: createdItems });

    if (work_order_id) {
      io.emit('queueUpdated', { workOrderId: work_order_id, queueName: 'Parts Ordered' });
    }

    res.status(201).json({
      message: 'Purchase order created successfully',
      purchase_order: poResult.rows[0],
      items: createdItems
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ PO creation error:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  } finally {
    client.release();
  }
});

// Update purchase order
app.put('/api/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateFields).forEach(key => {
      if (key !== 'id' && key !== 'created_at' && key !== 'po_number') {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateFields[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE purchase_orders SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    console.log(`✅ PO updated: ${result.rows[0].po_number}`);
    io.emit('purchaseOrderUpdated', result.rows[0]);

    res.json({
      message: 'Purchase order updated successfully',
      purchase_order: result.rows[0]
    });
  } catch (error) {
    console.error('❌ PO update error:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// Receive purchase order (auto-add to register)
app.post('/api/purchase-orders/:id/receive', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { received_by, receiving_notes, partial_receive, items } = req.body;

    // Update item quantities if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          'SELECT receive_po_item($1, $2, $3, $4)',
          [item.id, item.quantity_received, item.is_backordered, item.backorder_eta]
        );
      }
    }

    // Receive the PO (this auto-adds to register)
    const result = await client.query(
      'SELECT receive_purchase_order($1, $2, $3, $4) AS success',
      [id, received_by, receiving_notes, partial_receive || false]
    );

    // Get updated PO
    const poResult = await client.query(
      'SELECT * FROM purchase_order_summary WHERE id = $1',
      [id]
    );

    const po = poResult.rows[0];

    // Move work order to Ready to Schedule if not partial
    if (po.work_order_id && !partial_receive) {
      await client.query(
        `SELECT move_work_order_to_queue($1, 'Ready to Schedule', $2, $3, TRUE)`,
        [po.work_order_id, received_by, `PO ${po.po_number} received`]
      );
    }

    await client.query('COMMIT');

    console.log(`✅ PO received: ${po.po_number}${partial_receive ? ' (partial)' : ''}`);
    io.emit('purchaseOrderReceived', po);

    if (po.work_order_id) {
      io.emit('queueUpdated', {
        workOrderId: po.work_order_id,
        queueName: partial_receive ? 'Parts Ordered' : 'Ready to Schedule'
      });
      io.emit('workOrderRegisterUpdated', { workOrderId: po.work_order_id });
    }

    res.json({
      message: partial_receive ? 'PO partially received' : 'PO received and added to register',
      purchase_order: po,
      auto_added: !partial_receive
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ PO receive error:', error);
    res.status(500).json({ error: error.message || 'Failed to receive purchase order' });
  } finally {
    client.release();
  }
});

// Add item to purchase order
app.post('/api/purchase-orders/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { part_number, description, quantity_ordered, unit_price, item_notes } = req.body;

    // Get next line number
    const lineResult = await pool.query(
      'SELECT COALESCE(MAX(line_number), 0) + 1 AS next_line FROM purchase_order_items WHERE po_id = $1',
      [id]
    );
    const line_number = lineResult.rows[0].next_line;

    const extended_price = quantity_ordered * unit_price;

    const result = await pool.query(
      `INSERT INTO purchase_order_items (
        po_id, line_number, part_number, description,
        quantity_ordered, unit_price, extended_price, item_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [id, line_number, part_number, description, quantity_ordered, unit_price, extended_price, item_notes]
    );

    // Update PO totals
    await pool.query(
      `UPDATE purchase_orders
       SET subtotal = (SELECT SUM(extended_price) FROM purchase_order_items WHERE po_id = $1),
           total_amount = (SELECT SUM(extended_price) FROM purchase_order_items WHERE po_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    console.log(`✅ Item added to PO ${id}`);
    io.emit('purchaseOrderItemAdded', { po_id: id, item: result.rows[0] });

    res.status(201).json({
      message: 'Item added to purchase order',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('❌ PO item add error:', error);
    res.status(500).json({ error: 'Failed to add item to purchase order' });
  }
});

// Update PO item
app.put('/api/purchase-order-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Recalculate extended price if quantity or unit_price changed
    if (updateFields.quantity_ordered || updateFields.unit_price) {
      const currentResult = await pool.query(
        'SELECT quantity_ordered, unit_price FROM purchase_order_items WHERE id = $1',
        [id]
      );

      const current = currentResult.rows[0];
      const newQty = updateFields.quantity_ordered || current.quantity_ordered;
      const newPrice = updateFields.unit_price || current.unit_price;
      updateFields.extended_price = newQty * newPrice;
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateFields).forEach(key => {
      if (key !== 'id' && key !== 'po_id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateFields[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const query = `UPDATE purchase_order_items SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PO item not found' });
    }

    // Update PO totals
    const po_id = result.rows[0].po_id;
    await pool.query(
      `UPDATE purchase_orders
       SET subtotal = (SELECT SUM(extended_price) FROM purchase_order_items WHERE po_id = $1),
           total_amount = (SELECT SUM(extended_price) FROM purchase_order_items WHERE po_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [po_id]
    );

    console.log(`✅ PO item updated: ${id}`);
    io.emit('purchaseOrderItemUpdated', result.rows[0]);

    res.json({
      message: 'PO item updated successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('❌ PO item update error:', error);
    res.status(500).json({ error: 'Failed to update PO item' });
  }
});

// Delete PO item
app.delete('/api/purchase-order-items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get PO ID before deleting
    const poResult = await pool.query(
      'SELECT po_id FROM purchase_order_items WHERE id = $1',
      [id]
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({ error: 'PO item not found' });
    }

    const po_id = poResult.rows[0].po_id;

    // Delete the item
    await pool.query('DELETE FROM purchase_order_items WHERE id = $1', [id]);

    // Update PO totals
    await pool.query(
      `UPDATE purchase_orders
       SET subtotal = COALESCE((SELECT SUM(extended_price) FROM purchase_order_items WHERE po_id = $1), 0),
           total_amount = COALESCE((SELECT SUM(extended_price) FROM purchase_order_items WHERE po_id = $1), 0),
           updated_at = NOW()
       WHERE id = $1`,
      [po_id]
    );

    console.log(`✅ PO item deleted: ${id}`);
    io.emit('purchaseOrderItemDeleted', { po_id, item_id: id });

    res.json({ message: 'PO item deleted successfully' });
  } catch (error) {
    console.error('❌ PO item delete error:', error);
    res.status(500).json({ error: 'Failed to delete PO item' });
  }
});

// -------------------- CONSIGNMENT STOCK --------------------

// Get all consignment stock
app.get('/api/consignment/stock', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM consignment_stock_levels ORDER BY vendor_name, part_number'
    );

    res.json({
      stock: result.rows,
      count: result.rows.length,
      needs_reorder: result.rows.filter(s => s.needs_reorder).length
    });
  } catch (error) {
    console.error('❌ Consignment stock fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch consignment stock' });
  }
});

// Record consignment usage
app.post('/api/consignment/usage', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      consignment_stock_id,
      work_order_id,
      quantity_used,
      unit_price,
      used_by,
      notes
    } = req.body;

    const extended_price = quantity_used * unit_price;

    // Record usage
    const usageResult = await client.query(
      `INSERT INTO consignment_usage (
        consignment_stock_id, work_order_id, quantity_used,
        unit_price, extended_price, used_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [consignment_stock_id, work_order_id, quantity_used, unit_price, extended_price, used_by, notes]
    );

    // Update stock level
    await client.query(
      `UPDATE consignment_stock
       SET quantity_on_hand = quantity_on_hand - $1,
           updated_at = NOW()
       WHERE id = $2`,
      [quantity_used, consignment_stock_id]
    );

    // Get stock details for auto-add to register
    const stockResult = await client.query(
      `SELECT cs.*, v.vendor_name
       FROM consignment_stock cs
       JOIN vendors v ON cs.vendor_id = v.id
       WHERE cs.id = $1`,
      [consignment_stock_id]
    );

    const stock = stockResult.rows[0];

    // Auto-add to work order register
    if (work_order_id) {
      await client.query(
        `INSERT INTO work_order_line_items (
          work_order_id, item_type, description, quantity, unit_price,
          extended_price, is_taxable, added_by, notes
        ) VALUES ($1, 'Material', $2, $3, $4, $5, TRUE, $6, $7)`,
        [
          work_order_id,
          `${stock.description} (${stock.vendor_name} - Consignment)`,
          quantity_used,
          unit_price,
          extended_price,
          used_by,
          'Auto-added from consignment usage'
        ]
      );

      // Mark usage as added to register
      await client.query(
        'UPDATE consignment_usage SET added_to_register = TRUE WHERE id = $1',
        [usageResult.rows[0].id]
      );
    }

    await client.query('COMMIT');

    console.log(`✅ Consignment usage recorded for WO ${work_order_id}`);
    io.emit('consignmentUsageRecorded', usageResult.rows[0]);

    if (work_order_id) {
      io.emit('workOrderRegisterUpdated', { workOrderId: work_order_id });
    }

    res.status(201).json({
      message: 'Consignment usage recorded and added to register',
      usage: usageResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Consignment usage error:', error);
    res.status(500).json({ error: 'Failed to record consignment usage' });
  } finally {
    client.release();
  }
});

// Get consignment usage for work order
app.get('/api/consignment/usage/:workOrderId', async (req, res) => {
  try {
    const { workOrderId } = req.params;

    const result = await pool.query(
      `SELECT cu.*, cs.part_number, cs.description, v.vendor_name, u.username AS used_by_name
       FROM consignment_usage cu
       JOIN consignment_stock cs ON cu.consignment_stock_id = cs.id
       JOIN vendors v ON cs.vendor_id = v.id
       LEFT JOIN users u ON cu.used_by = u.id
       WHERE cu.work_order_id = $1
       ORDER BY cu.used_date DESC`,
      [workOrderId]
    );

    res.json({
      usage: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Consignment usage fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch consignment usage' });
  }
});

// ====================================
// FILE ATTACHMENTS API
// ====================================

// Upload file(s) to work order
app.post('/api/files/upload', upload.array('file', 10), async (req, res) => {
  try {
    const { work_order_id, file_category, uploaded_by, notes } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!work_order_id) {
      return res.status(400).json({ error: 'work_order_id is required' });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const filePath = `/uploads/${file.filename}`;

      const result = await pool.query(
        `INSERT INTO file_attachments (
          work_order_id, file_name, file_type, file_size, file_category,
          file_path, uploaded_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          work_order_id,
          file.originalname,
          file.mimetype,
          file.size,
          file_category || 'photo',
          filePath,
          uploaded_by || null,
          notes || null
        ]
      );

      uploadedFiles.push(result.rows[0]);
    }

    console.log(`✅ Uploaded ${uploadedFiles.length} file(s) to WO ${work_order_id}`);
    io.emit('filesUploaded', { workOrderId: work_order_id, files: uploadedFiles });

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Get all files for a work order
app.get('/api/work-orders/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.query;

    let query = `
      SELECT * FROM file_attachments_detail
      WHERE work_order_id = $1
    `;
    const params = [id];

    if (category) {
      query += ` AND file_category = $2`;
      params.push(category);
    }

    query += ` ORDER BY uploaded_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      files: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Files fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get file statistics for a work order
app.get('/api/work-orders/:id/files/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM get_work_order_file_stats($1)',
      [id]
    );

    res.json(result.rows[0] || {
      total_files: 0,
      total_size: 0,
      data_tag_count: 0,
      receipt_count: 0,
      photo_count: 0,
      document_count: 0,
      other_count: 0
    });
  } catch (error) {
    console.error('❌ File stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch file statistics' });
  }
});

// Delete a file
app.delete('/api/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get file info before deleting
    const fileResult = await pool.query(
      'SELECT * FROM file_attachments WHERE id = $1',
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Delete from database
    await pool.query('DELETE FROM file_attachments WHERE id = $1', [id]);

    // Try to delete from filesystem
    try {
      const filePath = path.join(__dirname, file.file_path);
      await fs.unlink(filePath);
    } catch (fsError) {
      console.warn('⚠️  Could not delete file from filesystem:', fsError.message);
    }

    console.log(`✅ File deleted: ${file.file_name}`);
    io.emit('fileDeleted', { fileId: id, workOrderId: file.work_order_id });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('❌ File delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ================================
// WEBSOCKET FOR REAL-TIME UPDATES
// ================================

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);

    // Handle collaboration cleanup when user disconnects
    const result = collaborationManager.leaveWorkOrder(socket.id);
    if (result && result.workOrderId) {
      // Notify others that this user left
      socket.to(`wo_${result.workOrderId}`).emit('viewersUpdate', {
        workOrderId: result.workOrderId,
        viewers: result.viewers
      });
    }
  });

  // ========================================
  // COLLABORATION EVENTS
  // ========================================

  // User joins a work order view
  socket.on('joinWorkOrder', ({ workOrderId, userId, userName }) => {
    // Join the work order room
    socket.join(`wo_${workOrderId}`);

    // Register with collaboration manager
    const viewers = collaborationManager.joinWorkOrder(socket.id, workOrderId, userId, userName);

    // Notify the joiner of current viewers
    socket.emit('viewersUpdate', {
      workOrderId,
      viewers
    });

    // Notify others that someone joined
    socket.to(`wo_${workOrderId}`).emit('viewersUpdate', {
      workOrderId,
      viewers
    });

    // Send current typing indicators to the new viewer
    const typingIndicators = collaborationManager.getTypingIndicators(workOrderId);
    socket.emit('typingIndicators', {
      workOrderId,
      indicators: typingIndicators
    });
  });

  // User leaves a work order view
  socket.on('leaveWorkOrder', ({ workOrderId }) => {
    const result = collaborationManager.leaveWorkOrder(socket.id);

    if (result && result.workOrderId) {
      socket.leave(`wo_${result.workOrderId}`);

      // Notify others
      socket.to(`wo_${result.workOrderId}`).emit('viewersUpdate', {
        workOrderId: result.workOrderId,
        viewers: result.viewers
      });
    }
  });

  // User starts typing in a field
  socket.on('startTyping', ({ workOrderId, fieldName }) => {
    const typingInfo = collaborationManager.startTyping(socket.id, workOrderId, fieldName);

    if (typingInfo) {
      // Notify others (not the typer)
      socket.to(`wo_${workOrderId}`).emit('userStartedTyping', {
        workOrderId,
        fieldName,
        userId: typingInfo.userId,
        userName: typingInfo.userName
      });
    }
  });

  // User stops typing in a field
  socket.on('stopTyping', ({ workOrderId, fieldName }) => {
    collaborationManager.stopTyping(socket.id, workOrderId, fieldName);

    // Notify others
    socket.to(`wo_${workOrderId}`).emit('userStoppedTyping', {
      workOrderId,
      fieldName
    });
  });

  // Field value changed (broadcast to others)
  socket.on('fieldChanged', ({ workOrderId, fieldName, value, userId, userName }) => {
    // Stop typing indicator for this field
    collaborationManager.stopTyping(socket.id, workOrderId, fieldName);

    // Broadcast the change to others viewing this work order
    socket.to(`wo_${workOrderId}`).emit('fieldUpdated', {
      workOrderId,
      fieldName,
      value,
      userId,
      userName,
      timestamp: new Date()
    });
  });

  // ========================================
  // EXISTING EVENTS
  // ========================================

  socket.on('workOrderCreated', (workOrder) => {
    console.log('📡 Broadcasting work order creation from client');
    broadcastWorkOrderUpdate(workOrder, 'created');
  });

  socket.on('joinTechRoom', (techId) => {
    socket.join(`tech_${techId}`);
    console.log(`👨‍🔧 Tech ${techId} joined their room`);
  });

  socket.on('leaveTechRoom', (techId) => {
    socket.leave(`tech_${techId}`);
    console.log(`👨‍🔧 Tech ${techId} left their room`);
  });
});

// ========================================
// IMPROVED ERROR HANDLING MIDDLEWARE
// ========================================
// Replace the existing error handling middleware in your server.js file

/**
 * Database error handler - converts PostgreSQL errors to user-friendly messages
 */
function handleDatabaseError(error) {
  console.error('💾 Database error details:', {
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    table: error.table,
    column: error.column
  });

  switch (error.code) {
    case '23503': // Foreign key violation
      if (error.constraint) {
        if (error.constraint.includes('customer')) {
          return { status: 400, message: 'Invalid customer ID - customer does not exist' };
        } else if (error.constraint.includes('equipment')) {
          return { status: 400, message: 'Invalid equipment ID - equipment does not exist' };
        } else if (error.constraint.includes('technician')) {
          return { status: 400, message: 'Invalid technician ID - technician does not exist' };
        }
      }
      return { status: 400, message: 'Referenced record does not exist' };

    case '23505': // Unique violation
      return { status: 409, message: 'Record already exists with these values' };

    case '23514': // Check constraint violation
      return { status: 400, message: 'Data does not meet validation requirements' };

    case '42703': // Undefined column
      return { status: 500, message: 'Database schema error - please contact support' };

    case '42P01': // Undefined table
      return { status: 500, message: 'Database table not found - please contact support' };

    case '22P02': // Invalid text representation (like NaN)
      return { status: 400, message: 'Invalid data format - please check your input values' };

    case '08003': // Connection does not exist
    case '08006': // Connection failure
      return { status: 503, message: 'Database temporarily unavailable - please try again' };

    default:
      return { status: 500, message: 'Database operation failed' };
  }
}

/**
 * Central error handling middleware
 */
function errorHandler(error, req, res, next) {
  console.error('❌ Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle validation errors (from our custom validation)
  if (error.message && error.message.startsWith('Validation failed:')) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.message.replace('Validation failed: ', ''),
      field: error.field || null
    });
  }

  // Handle Multer errors (file upload)
  if (error.name === 'MulterError') {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'File too large',
          details: 'Maximum file size is 10MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files',
          details: 'Maximum 1 file allowed'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected file field',
          details: 'File field name not recognized'
        });
      default:
        return res.status(400).json({
          error: 'File upload error',
          details: error.message
        });
    }
  }

  // Handle custom file filter errors
  if (error.message === 'Only images and PDFs are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      details: 'Only images (JPG, PNG, GIF) and PDF files are allowed'
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      details: 'Please log in again'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      details: 'Please log in again'
    });
  }

  // Handle database errors
  if (error.code && typeof error.code === 'string') {
    const dbError = handleDatabaseError(error);
    return res.status(dbError.status).json({
      error: 'Database error',
      details: dbError.message
    });
  }

  // Handle async/await errors
  if (error.name === 'TypeError' && error.message.includes('Cannot read property')) {
    return res.status(400).json({
      error: 'Invalid request data',
      details: 'Missing required fields in request'
    });
  }

  // Handle network/timeout errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      details: 'Please try again in a moment'
    });
  }

  // Generic 500 error for other unhandled exceptions
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal server error',
    details: isDevelopment ? error.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: error.stack })
  });
}

/**
 * 404 Not Found Handler with better logging
 */
function notFoundHandler(req, res) {
  console.log(`❌ Route not found: ${req.method} ${req.path}`);
  console.log(`   Query params:`, req.query);
  console.log(`   Request body:`, req.body);
  
  res.status(404).json({
    error: 'Route not found',
    details: `${req.method} ${req.path} is not a valid endpoint`,
    availableEndpoints: {
      customers: [
        'GET /api/customers',
        'GET /api/customers/:id',
        'GET /api/customers/:id/work-orders',
        'GET /api/customers/:id/equipment',
        'GET /api/customers/search?q=query'
      ],
      workOrders: [
        'GET /api/work-orders',
        'POST /api/work-orders',
        'GET /api/dispatch/board',
        'PUT /api/work-orders/:id/assign'
      ],
      technicians: [
        'GET /api/technicians'
      ]
    }
  });
}

/**
 * Async error wrapper to catch async/await errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Export these functions if you're using modules, or just use them directly
module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleDatabaseError
};



// ================================
// AUTOMATED DAILY CARRYOVER SCHEDULER
// ================================

/**
 * Runs daily at 12:01 AM to move incomplete work orders to current day
 */
cron.schedule('1 0 * * *', async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🔄 Running automated daily carryover at midnight for ${today}`);
    
    // Move all incomplete work orders to today
    const result = await pool.query(`
      UPDATE work_orders 
      SET scheduled_date = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE status NOT IN ('Complete', 'Completed', 'Deleted')
        AND (scheduled_date < $1 OR scheduled_date IS NULL)
    `, [today]);
    
    console.log(`✅ Daily carryover completed: ${result.rowCount} work orders moved to ${today}`);
    
    // Broadcast to all connected clients
    io.emit('dailyCarryoverCompleted', {
      date: today,
      count: result.rowCount,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Automated carryover failed:', error);
  }
}, {
  timezone: "America/Chicago" // Adjust to your timezone
});

console.log('📅 Daily carryover scheduler initialized (runs at 12:01 AM daily)');

// ================================
// GRACEFUL SHUTDOWN
// ================================

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');

  try {
    await pool.end();
    console.log('📀 Database connections closed.');

    server.close(() => {
      console.log('🔌 HTTP server closed.');
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Error during graceful shutdown:', err);
    process.exit(1);
  }
});





// ================================
// START SERVER
// ================================

// ========================================
// ZONE MANAGEMENT ENDPOINTS
// ========================================

/**
 * @route GET /api/zones
 * @description Get all service zones
 */
app.get('/api/zones', async (req, res) => {
  try {
    const { active_only = 'true' } = req.query;

    let query = 'SELECT * FROM service_zones WHERE 1=1';
    const params = [];

    if (active_only === 'true') {
      query += ' AND is_active = $1';
      params.push(true);
    }

    query += ' ORDER BY zone_code';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

/**
 * @route GET /api/zones/statistics
 * @description Get zone statistics including customer counts
 */
app.get('/api/zones/statistics', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM zone_statistics');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching zone statistics:', error);
    res.status(500).json({ error: 'Failed to fetch zone statistics' });
  }
});

/**
 * @route POST /api/zones
 * @description Create new service zone
 */
app.post('/api/zones', async (req, res) => {
  try {
    const { zone_code, name, color, description, boundary } = req.body;

    const result = await pool.query(`
      INSERT INTO service_zones (zone_code, name, color, description, boundary, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [zone_code, name, color, description, JSON.stringify(boundary), 1]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating zone:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Zone code already exists' });
    }
    res.status(500).json({ error: 'Failed to create zone' });
  }
});

/**
 * @route PUT /api/zones/:code
 * @description Update service zone
 */
app.put('/api/zones/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { name, color, description, boundary, is_active, visible_on_map } = req.body;

    const result = await pool.query(`
      UPDATE service_zones SET
        name = $1,
        color = $2,
        description = $3,
        boundary = $4,
        is_active = $5,
        visible_on_map = $6,
        updated_at = NOW()
      WHERE zone_code = $7
      RETURNING *
    `, [name, color, description, JSON.stringify(boundary), is_active, visible_on_map, code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

/**
 * @route DELETE /api/zones/:code
 * @description Delete service zone
 */
app.delete('/api/zones/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      'DELETE FROM service_zones WHERE zone_code = $1 RETURNING zone_code',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    res.json({ message: 'Zone deleted successfully', zone_code: code });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

/**
 * @route POST /api/zones/detect
 * @description Detect which zone a lat/lng falls into
 */
app.post('/api/zones/detect', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const result = await pool.query(
      'SELECT detect_zone_for_location($1, $2) as zone_code',
      [latitude, longitude]
    );

    res.json({
      latitude,
      longitude,
      zone_code: result.rows[0].zone_code
    });
  } catch (error) {
    console.error('Error detecting zone:', error);
    res.status(500).json({ error: 'Failed to detect zone' });
  }
});

// ========================================
// VENDOR MANAGEMENT ENDPOINTS
// ========================================

/**
 * @route GET /api/vendors
 * @description Get all vendors with pagination and filtering
 */
app.get('/api/vendors', async (req, res) => {
  try {
    const { active_only = 'true', type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM vendors WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (active_only === 'true') {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(true);
    }

    if (type) {
      query += ` AND vendor_type = $${paramIndex++}`;
      params.push(type);
    }

    query += ` ORDER BY name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

/**
 * @route GET /api/vendors/:id
 * @description Get single vendor details
 */
app.get('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

/**
 * @route POST /api/vendors
 * @description Create new vendor
 */
app.post('/api/vendors', async (req, res) => {
  try {
    const {
      name, contact_name, phone, phone_2, email, website,
      address_line1, address_line2, city, state, zip,
      payment_terms, tax_id, account_number,
      vendor_type, specialty,
      notes, internal_notes
    } = req.body;

    // Generate vendor number
    const vendorNumberResult = await pool.query('SELECT generate_vendor_number() as vendor_number');
    const vendor_number = vendorNumberResult.rows[0].vendor_number;

    const result = await pool.query(`
      INSERT INTO vendors (
        vendor_number, name, contact_name, phone, phone_2, email, website,
        address_line1, address_line2, city, state, zip,
        payment_terms, tax_id, account_number,
        vendor_type, specialty, notes, internal_notes,
        created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      vendor_number, name, contact_name, phone, phone_2, email, website,
      address_line1, address_line2, city, state, zip,
      payment_terms, tax_id, account_number,
      vendor_type, specialty, notes, internal_notes,
      1 // TODO: Use actual user ID from auth
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

/**
 * @route PUT /api/vendors/:id
 * @description Update vendor
 */
app.put('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, contact_name, phone, phone_2, email, website,
      address_line1, address_line2, city, state, zip,
      payment_terms, tax_id, account_number,
      vendor_type, specialty, is_active, is_preferred, rating,
      notes, internal_notes
    } = req.body;

    const result = await pool.query(`
      UPDATE vendors SET
        name = $1, contact_name = $2, phone = $3, phone_2 = $4, email = $5, website = $6,
        address_line1 = $7, address_line2 = $8, city = $9, state = $10, zip = $11,
        payment_terms = $12, tax_id = $13, account_number = $14,
        vendor_type = $15, specialty = $16, is_active = $17, is_preferred = $18, rating = $19,
        notes = $20, internal_notes = $21, updated_at = NOW()
      WHERE id = $22
      RETURNING *
    `, [
      name, contact_name, phone, phone_2, email, website,
      address_line1, address_line2, city, state, zip,
      payment_terms, tax_id, account_number,
      vendor_type, specialty, is_active, is_preferred, rating,
      notes, internal_notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// ========================================
// PURCHASE ORDER ENDPOINTS
// ========================================

/**
 * @route GET /api/purchase-orders
 * @description Get all purchase orders
 */
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const { status, work_order_id, vendor_id } = req.query;

    let query = `
      SELECT po.*, v.name as vendor_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND po.status = $${paramIndex++}`;
      params.push(status);
    }

    if (work_order_id) {
      query += ` AND po.work_order_id = $${paramIndex++}`;
      params.push(work_order_id);
    }

    if (vendor_id) {
      query += ` AND po.vendor_id = $${paramIndex++}`;
      params.push(vendor_id);
    }

    query += ' ORDER BY po.order_date DESC, po.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

/**
 * @route GET /api/purchase-orders/:id
 * @description Get purchase order details with line items
 */
app.get('/api/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const poResult = await pool.query(`
      SELECT po.*, v.name as vendor_name, v.phone as vendor_phone, v.email as vendor_email
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE po.id = $1
    `, [id]);

    if (poResult.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const lineItemsResult = await pool.query(`
      SELECT * FROM po_line_items
      WHERE po_id = $1
      ORDER BY line_number
    `, [id]);

    const po = poResult.rows[0];
    po.line_items = lineItemsResult.rows;

    res.json(po);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

/**
 * @route POST /api/purchase-orders
 * @description Create new purchase order with line items
 */
app.post('/api/purchase-orders', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      work_order_id, vendor_id, expected_delivery, payment_method,
      shipping_method, ship_to_address, notes, internal_notes, priority,
      line_items
    } = req.body;

    // Generate PO number
    const poNumberResult = await client.query('SELECT generate_po_number() as po_number');
    const po_number = poNumberResult.rows[0].po_number;

    // Create PO
    const poResult = await client.query(`
      INSERT INTO purchase_orders (
        po_number, work_order_id, vendor_id, expected_delivery, payment_method,
        shipping_method, ship_to_address, notes, internal_notes, priority,
        created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      po_number, work_order_id, vendor_id, expected_delivery, payment_method,
      shipping_method, ship_to_address, notes, internal_notes, priority,
      1 // TODO: Use actual user ID
    ]);

    const po = poResult.rows[0];

    // Create line items
    if (line_items && line_items.length > 0) {
      for (let i = 0; i < line_items.length; i++) {
        const item = line_items[i];
        await client.query(`
          INSERT INTO po_line_items (
            po_id, line_number, part_number, description, manufacturer,
            quantity_ordered, unit_of_measure, unit_cost, line_total,
            markup_percentage, sell_price, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          po.id, i + 1, item.part_number, item.description, item.manufacturer,
          item.quantity_ordered, item.unit_of_measure || 'EA', item.unit_cost,
          item.quantity_ordered * item.unit_cost, item.markup_percentage || 0,
          item.sell_price, item.notes
        ]);
      }
    }

    await client.query('COMMIT');

    // Fetch complete PO with line items
    const completePoResult = await pool.query(`
      SELECT po.*, v.name as vendor_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE po.id = $1
    `, [po.id]);

    const lineItemsResult = await pool.query(`
      SELECT * FROM po_line_items WHERE po_id = $1 ORDER BY line_number
    `, [po.id]);

    const completePo = completePoResult.rows[0];
    completePo.line_items = lineItemsResult.rows;

    res.status(201).json(completePo);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/purchase-orders/:id/status
 * @description Update purchase order status
 */
app.put('/api/purchase-orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, received_date } = req.body;

    const result = await pool.query(`
      UPDATE purchase_orders SET
        status = $1,
        received_date = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, received_date, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating PO status:', error);
    res.status(500).json({ error: 'Failed to update PO status' });
  }
});

// ========================================
// WORK ORDER LINE ITEMS (REGISTER TAB)
// ========================================

/**
 * @route GET /api/work-orders/:id/line-items
 * @description Get all line items for a work order
 */
app.get('/api/work-orders/:id/line-items', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM work_order_line_items
      WHERE work_order_id = $1
      ORDER BY line_number
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching line items:', error);
    res.status(500).json({ error: 'Failed to fetch line items' });
  }
});

/**
 * @route POST /api/work-orders/:id/line-items
 * @description Add line item to work order
 */
app.post('/api/work-orders/:id/line-items', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_type, description, part_number, manufacturer,
      quantity, unit_of_measure, unit_cost, unit_price,
      labor_hours, labor_rate, is_billable, is_taxable, is_warranty, notes
    } = req.body;

    // Get next line number
    const lineNumResult = await pool.query(`
      SELECT COALESCE(MAX(line_number), 0) + 1 as next_line_number
      FROM work_order_line_items
      WHERE work_order_id = $1
    `, [id]);

    const line_number = lineNumResult.rows[0].next_line_number;

    // Calculate totals
    const line_total = quantity * unit_price;
    const cost_total = quantity * (unit_cost || 0);
    const profit_margin = line_total - cost_total;

    const result = await pool.query(`
      INSERT INTO work_order_line_items (
        work_order_id, line_number, item_type, description, part_number, manufacturer,
        quantity, unit_of_measure, unit_cost, unit_price, labor_hours, labor_rate,
        line_total, cost_total, profit_margin,
        is_billable, is_taxable, is_warranty, notes, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      id, line_number, item_type, description, part_number, manufacturer,
      quantity, unit_of_measure || 'EA', unit_cost || 0, unit_price,
      labor_hours, labor_rate, line_total, cost_total, profit_margin,
      is_billable !== false, is_taxable !== false, is_warranty || false, notes,
      1 // TODO: Use actual user ID
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating line item:', error);
    res.status(500).json({ error: 'Failed to create line item' });
  }
});

/**
 * @route PUT /api/work-orders/:workOrderId/line-items/:lineItemId
 * @description Update line item
 */
app.put('/api/work-orders/:workOrderId/line-items/:lineItemId', async (req, res) => {
  try {
    const { lineItemId } = req.params;
    const {
      item_type, description, part_number, manufacturer,
      quantity, unit_of_measure, unit_cost, unit_price,
      labor_hours, labor_rate, is_billable, is_taxable, is_warranty, notes
    } = req.body;

    const line_total = quantity * unit_price;
    const cost_total = quantity * (unit_cost || 0);
    const profit_margin = line_total - cost_total;

    const result = await pool.query(`
      UPDATE work_order_line_items SET
        item_type = $1, description = $2, part_number = $3, manufacturer = $4,
        quantity = $5, unit_of_measure = $6, unit_cost = $7, unit_price = $8,
        labor_hours = $9, labor_rate = $10, line_total = $11, cost_total = $12,
        profit_margin = $13, is_billable = $14, is_taxable = $15, is_warranty = $16,
        notes = $17, updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `, [
      item_type, description, part_number, manufacturer,
      quantity, unit_of_measure, unit_cost, unit_price,
      labor_hours, labor_rate, line_total, cost_total, profit_margin,
      is_billable, is_taxable, is_warranty, notes, lineItemId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating line item:', error);
    res.status(500).json({ error: 'Failed to update line item' });
  }
});

/**
 * @route DELETE /api/work-orders/:workOrderId/line-items/:lineItemId
 * @description Delete line item
 */
app.delete('/api/work-orders/:workOrderId/line-items/:lineItemId', async (req, res) => {
  try {
    const { lineItemId } = req.params;

    const result = await pool.query(
      'DELETE FROM work_order_line_items WHERE id = $1 RETURNING id',
      [lineItemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    res.json({ message: 'Line item deleted successfully', id: lineItemId });
  } catch (error) {
    console.error('Error deleting line item:', error);
    res.status(500).json({ error: 'Failed to delete line item' });
  }
});

// ========================================
// INVOICE ENDPOINTS
// ========================================

/**
 * @route GET /api/invoices
 * @description Get all invoices
 */
app.get('/api/invoices', async (req, res) => {
  try {
    const { status, customer_id } = req.query;

    let query = `
      SELECT i.*, c.name as customer_name, w.wo_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN work_orders w ON i.work_order_id = w.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }

    if (customer_id) {
      query += ` AND i.customer_id = $${paramIndex++}`;
      params.push(customer_id);
    }

    query += ' ORDER BY i.invoice_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * @route POST /api/work-orders/:id/generate-invoice
 * @description Generate invoice from work order
 */
app.post('/api/work-orders/:id/generate-invoice', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { payment_terms, tax_rate, discount_amount, notes } = req.body;

    // Get work order details
    const woResult = await client.query(`
      SELECT * FROM work_orders WHERE id = $1
    `, [id]);

    if (woResult.rows.length === 0) {
      throw new Error('Work order not found');
    }

    const workOrder = woResult.rows[0];

    // Generate invoice number
    const invNumberResult = await client.query('SELECT generate_invoice_number() as invoice_number');
    const invoice_number = invNumberResult.rows[0].invoice_number;

    // Calculate due date (30 days from now by default)
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 30);

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        invoice_number, work_order_id, customer_id,
        payment_terms, tax_rate, discount_amount, notes,
        due_date, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      invoice_number, id, workOrder.customer_id,
      payment_terms || 'Net 30', tax_rate || 0, discount_amount || 0, notes,
      due_date, 1 // TODO: Use actual user ID
    ]);

    const invoice = invoiceResult.rows[0];

    // Copy work order line items to invoice
    const lineItemsResult = await client.query(`
      SELECT * FROM work_order_line_items
      WHERE work_order_id = $1 AND is_billable = true
      ORDER BY line_number
    `, [id]);

    for (let i = 0; i < lineItemsResult.rows.length; i++) {
      const item = lineItemsResult.rows[i];
      await client.query(`
        INSERT INTO invoice_line_items (
          invoice_id, work_order_line_item_id, line_number,
          item_type, description, quantity, unit_price, line_total, is_taxable
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        invoice.id, item.id, i + 1,
        item.item_type, item.description, item.quantity, item.unit_price,
        item.line_total, item.is_taxable
      ]);
    }

    await client.query('COMMIT');

    // Fetch complete invoice
    const completeInvoice = await pool.query(`
      SELECT i.*, c.name as customer_name, w.wo_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN work_orders w ON i.work_order_id = w.id
      WHERE i.id = $1
    `, [invoice.id]);

    res.status(201).json(completeInvoice.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  } finally {
    client.release();
  }
});

/**
 * @route GET /api/invoices/:id
 * @description Get invoice details with line items and payments
 */
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice header
    const invoiceResult = await pool.query(`
      SELECT i.*, c.name as customer_name, c.customer_number, c.email as customer_email,
             w.wo_number, w.scheduled_date as work_order_date
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN work_orders w ON i.work_order_id = w.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get line items
    const lineItemsResult = await pool.query(`
      SELECT * FROM invoice_line_items
      WHERE invoice_id = $1
      ORDER BY line_number
    `, [id]);

    invoice.line_items = lineItemsResult.rows;

    // Get payments
    const paymentsResult = await pool.query(`
      SELECT * FROM invoice_payments
      WHERE invoice_id = $1
      ORDER BY payment_date DESC
    `, [id]);

    invoice.payments = paymentsResult.rows;

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

/**
 * @route POST /api/invoices
 * @description Create a new invoice manually
 */
app.post('/api/invoices', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      customer_id,
      work_order_id,
      due_date,
      terms,
      tax_rate,
      notes,
      line_items
    } = req.body;

    // Get customer info for denormalized fields
    const customerResult = await client.query(`
      SELECT name, service_address, service_city, service_state, service_zip, email, phone
      FROM customers WHERE id = $1
    `, [customer_id]);

    if (customerResult.rows.length === 0) {
      throw new Error('Customer not found');
    }

    const customer = customerResult.rows[0];

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        customer_id, work_order_id, due_date, terms, tax_rate, notes,
        bill_to_name, bill_to_address, bill_to_city, bill_to_state, bill_to_zip,
        bill_to_email, bill_to_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      customer_id, work_order_id, due_date, terms || 'Net 30', tax_rate || 0, notes,
      customer.name, customer.service_address, customer.service_city,
      customer.service_state, customer.service_zip, customer.email, customer.phone
    ]);

    const invoice = invoiceResult.rows[0];

    // Add line items if provided
    if (line_items && line_items.length > 0) {
      for (let i = 0; i < line_items.length; i++) {
        const item = line_items[i];
        const itemTaxAmount = item.is_taxable ? (item.line_total * (tax_rate || 0) / 100) : 0;

        await client.query(`
          INSERT INTO invoice_line_items (
            invoice_id, line_number, item_type, description,
            quantity, unit_price, line_total, is_taxable, tax_rate, tax_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          invoice.id, i + 1, item.item_type, item.description,
          item.quantity, item.unit_price, item.line_total,
          item.is_taxable !== false, tax_rate || 0, itemTaxAmount
        ]);
      }
    }

    await client.query('COMMIT');

    // Fetch complete invoice
    const completeInvoice = await pool.query(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [invoice.id]);

    res.status(201).json(completeInvoice.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to create invoice' });
  } finally {
    client.release();
  }
});

/**
 * @route PUT /api/invoices/:id
 * @description Update invoice
 */
app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { due_date, terms, notes, discount_amount, status } = req.body;

    const result = await pool.query(`
      UPDATE invoices
      SET
        due_date = COALESCE($1, due_date),
        terms = COALESCE($2, terms),
        notes = COALESCE($3, notes),
        discount_amount = COALESCE($4, discount_amount),
        status = COALESCE($5, status),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [due_date, terms, notes, discount_amount, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

/**
 * @route POST /api/invoices/:id/payments
 * @description Add payment to invoice
 */
app.post('/api/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, payment_date, reference_number, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    if (!payment_method) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    const result = await pool.query(`
      INSERT INTO invoice_payments (
        invoice_id, amount, payment_method, payment_date, reference_number, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, amount, payment_method, payment_date || new Date(), reference_number, notes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

/**
 * @route GET /api/invoices/:id/payments
 * @description Get all payments for an invoice
 */
app.get('/api/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM invoice_payments
      WHERE invoice_id = $1
      ORDER BY payment_date DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * @route PUT /api/invoices/:id/status
 * @description Update invoice status
 */
app.put('/api/invoices/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Draft', 'Pending', 'Sent', 'Paid', 'Partial', 'Overdue', 'Void', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(`
      UPDATE invoices
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

/**
 * @route POST /api/invoices/:id/quickbooks-export
 * @description Export invoice to QuickBooks (placeholder for integration)
 */
app.post('/api/invoices/:id/quickbooks-export', async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice with all details
    const invoiceResult = await pool.query(`
      SELECT i.*, c.name as customer_name, c.customer_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get line items
    const lineItemsResult = await pool.query(`
      SELECT * FROM invoice_line_items
      WHERE invoice_id = $1
      ORDER BY line_number
    `, [id]);

    // TODO: Implement QuickBooks API integration
    // For now, just return a structured payload that would be sent to QuickBooks

    const quickbooksPayload = {
      Invoice: {
        CustomerRef: {
          value: invoice.customer_id,
          name: invoice.customer_name
        },
        Line: lineItemsResult.rows.map(item => ({
          DetailType: 'SalesItemLineDetail',
          Amount: item.line_total,
          Description: item.description,
          SalesItemLineDetail: {
            Qty: item.quantity,
            UnitPrice: item.unit_price,
            TaxCodeRef: item.is_taxable ? { value: 'TAX' } : { value: 'NON' }
          }
        })),
        DueDate: invoice.due_date,
        TxnDate: invoice.invoice_date,
        DocNumber: invoice.invoice_number,
        PrivateNote: invoice.internal_notes,
        CustomerMemo: { value: invoice.notes }
      }
    };

    // Mark as export attempted
    await pool.query(`
      UPDATE invoices
      SET sync_status = 'Not Synced', updated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({
      message: 'QuickBooks export prepared (integration pending)',
      payload: quickbooksPayload,
      note: 'QuickBooks integration to be implemented'
    });
  } catch (error) {
    console.error('Error preparing QuickBooks export:', error);
    res.status(500).json({ error: 'Failed to prepare QuickBooks export' });
  }
});

// ============================================
// INVENTORY MANAGEMENT ENDPOINTS
// ============================================

/**
 * @route GET /api/inventory
 * @description Get all inventory items with optional filtering
 * @query item_type - Filter by 'inventory' or 'miscellaneous'
 * @query vendor_id - Filter by vendor
 * @query search - Search by part number or description
 * @query low_stock - Only show items at or below reorder level
 * @query active_only - Only show active items (default: true)
 */
app.get('/api/inventory', async (req, res) => {
  try {
    const { item_type, vendor_id, search, low_stock, active_only = 'true' } = req.query;

    let query = 'SELECT * FROM inventory_items_with_vendor WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (active_only === 'true') {
      query += ' AND is_active = TRUE';
    }

    if (item_type) {
      query += ` AND item_type = $${paramCount}`;
      params.push(item_type);
      paramCount++;
    }

    if (vendor_id) {
      query += ` AND primary_vendor_id = $${paramCount}`;
      params.push(vendor_id);
      paramCount++;
    }

    if (search) {
      query += ` AND (part_number ILIKE $${paramCount} OR description ILIKE $${paramCount} OR manufacturer ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (low_stock === 'true') {
      query += ' AND needs_reorder = TRUE';
    }

    query += ' ORDER BY part_number, description';

    const result = await pool.query(query, params);

    // Get summary stats
    const statsQuery = `
      SELECT
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE item_type = 'inventory') as inventory_count,
        COUNT(*) FILTER (WHERE item_type = 'miscellaneous') as miscellaneous_count,
        COUNT(*) FILTER (WHERE needs_reorder = TRUE) as low_stock_count,
        SUM(quantity_on_hand * unit_cost) as total_inventory_value
      FROM inventory_items_with_vendor
      WHERE is_active = TRUE
    `;
    const statsResult = await pool.query(statsQuery);

    res.json({
      items: result.rows,
      stats: statsResult.rows[0],
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

/**
 * @route GET /api/inventory/low-stock
 * @description Get items at or below reorder level
 */
app.get('/api/inventory/low-stock', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_low_stock');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

/**
 * @route GET /api/inventory/:id
 * @description Get single inventory item with full details
 */
app.get('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get item details
    const itemResult = await pool.query(
      'SELECT * FROM inventory_items_with_vendor WHERE id = $1',
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get price history
    const historyResult = await pool.query(
      `SELECT * FROM inventory_price_history
       WHERE inventory_item_id = $1
       ORDER BY changed_at DESC
       LIMIT 10`,
      [id]
    );

    // Get vendor pricing
    const vendorPricingResult = await pool.query(
      `SELECT vp.*, v.vendor_name, v.vendor_code
       FROM inventory_vendor_pricing vp
       JOIN vendors v ON vp.vendor_id = v.id
       WHERE vp.inventory_item_id = $1
       ORDER BY vp.is_preferred DESC, vp.vendor_unit_cost ASC`,
      [id]
    );

    res.json({
      item: itemResult.rows[0],
      price_history: historyResult.rows,
      vendor_pricing: vendorPricingResult.rows
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

/**
 * @route POST /api/inventory
 * @description Create new inventory item
 */
app.post('/api/inventory', async (req, res) => {
  try {
    const {
      item_type,
      product_category,
      part_number,
      description,
      manufacturer,
      mfg_part_number,
      unit_cost,
      unit_sale,
      quantity_on_hand,
      reorder_level,
      primary_vendor_id,
      is_taxable,
      is_equipment,
      is_consignment,
      notes
    } = req.body;

    // Validation
    if (!description || !item_type) {
      return res.status(400).json({ error: 'Description and item type are required' });
    }

    const result = await pool.query(`
      INSERT INTO inventory_items (
        item_type, product_category, part_number, description, manufacturer,
        mfg_part_number, unit_cost, unit_sale, quantity_on_hand, reorder_level,
        primary_vendor_id, is_taxable, is_equipment, is_consignment, notes,
        created_by, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE)
      RETURNING *
    `, [
      item_type, product_category, part_number, description, manufacturer,
      mfg_part_number, unit_cost || 0, unit_sale || 0, quantity_on_hand || 0,
      reorder_level || 0, primary_vendor_id, is_taxable !== false, is_equipment || false,
      is_consignment || false, notes, req.user?.id || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Part number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create inventory item' });
    }
  }
});

/**
 * @route PUT /api/inventory/:id
 * @description Update inventory item
 */
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_type,
      product_category,
      part_number,
      description,
      manufacturer,
      mfg_part_number,
      unit_cost,
      unit_sale,
      quantity_on_hand,
      reorder_level,
      primary_vendor_id,
      is_taxable,
      is_equipment,
      is_consignment,
      is_active,
      notes
    } = req.body;

    const result = await pool.query(`
      UPDATE inventory_items SET
        item_type = COALESCE($1, item_type),
        product_category = COALESCE($2, product_category),
        part_number = COALESCE($3, part_number),
        description = COALESCE($4, description),
        manufacturer = COALESCE($5, manufacturer),
        mfg_part_number = COALESCE($6, mfg_part_number),
        unit_cost = COALESCE($7, unit_cost),
        unit_sale = COALESCE($8, unit_sale),
        quantity_on_hand = COALESCE($9, quantity_on_hand),
        reorder_level = COALESCE($10, reorder_level),
        primary_vendor_id = COALESCE($11, primary_vendor_id),
        is_taxable = COALESCE($12, is_taxable),
        is_equipment = COALESCE($13, is_equipment),
        is_consignment = COALESCE($14, is_consignment),
        is_active = COALESCE($15, is_active),
        notes = COALESCE($16, notes),
        updated_by = $17,
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `, [
      item_type, product_category, part_number, description, manufacturer,
      mfg_part_number, unit_cost, unit_sale, quantity_on_hand, reorder_level,
      primary_vendor_id, is_taxable, is_equipment, is_consignment, is_active,
      notes, req.user?.id || null, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Part number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update inventory item' });
    }
  }
});

/**
 * @route POST /api/inventory/:id/price-update
 * @description Update item price with history tracking
 */
app.post('/api/inventory/:id/price-update', async (req, res) => {
  try {
    const { id } = req.params;
    const { unit_cost, unit_sale, change_reason, change_source } = req.body;

    if (!unit_cost && !unit_sale) {
      return res.status(400).json({ error: 'At least one price must be provided' });
    }

    // Get current prices
    const currentResult = await pool.query(
      'SELECT unit_cost, unit_sale FROM inventory_items WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const current = currentResult.rows[0];

    // Update prices (trigger will log to history)
    const result = await pool.query(`
      UPDATE inventory_items SET
        unit_cost = COALESCE($1, unit_cost),
        unit_sale = COALESCE($2, unit_sale),
        updated_by = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [unit_cost, unit_sale, req.user?.id || null, id]);

    // Update the most recent price history entry with reason and source
    if (change_reason || change_source) {
      await pool.query(`
        UPDATE inventory_price_history
        SET change_reason = COALESCE($1, change_reason),
            change_source = COALESCE($2, change_source)
        WHERE inventory_item_id = $3
          AND changed_at = (
            SELECT MAX(changed_at)
            FROM inventory_price_history
            WHERE inventory_item_id = $3
          )
      `, [change_reason, change_source, id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

/**
 * @route POST /api/inventory/bulk-price-update
 * @description Bulk update prices for multiple items
 */
app.post('/api/inventory/bulk-price-update', async (req, res) => {
  try {
    const { updates, change_reason, change_source } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { id, unit_cost, unit_sale } = update;

        const result = await pool.query(`
          UPDATE inventory_items SET
            unit_cost = COALESCE($1, unit_cost),
            unit_sale = COALESCE($2, unit_sale),
            updated_by = $3,
            updated_at = NOW()
          WHERE id = $4
          RETURNING *
        `, [unit_cost, unit_sale, req.user?.id || null, id]);

        if (result.rows.length > 0) {
          // Update price history with reason
          if (change_reason || change_source) {
            await pool.query(`
              UPDATE inventory_price_history
              SET change_reason = COALESCE($1, change_reason),
                  change_source = COALESCE($2, change_source)
              WHERE inventory_item_id = $3
                AND changed_at = (
                  SELECT MAX(changed_at)
                  FROM inventory_price_history
                  WHERE inventory_item_id = $3
                )
            `, [change_reason, change_source, id]);
          }

          results.push(result.rows[0]);
        }
      } catch (err) {
        errors.push({ id: update.id, error: err.message });
      }
    }

    res.json({
      success: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error bulk updating prices:', error);
    res.status(500).json({ error: 'Failed to bulk update prices' });
  }
});

/**
 * @route DELETE /api/inventory/:id
 * @description Deactivate inventory item (soft delete)
 */
app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE inventory_items
      SET is_active = FALSE, updated_at = NOW(), updated_by = $1
      WHERE id = $2
      RETURNING *
    `, [req.user?.id || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deactivated successfully', item: result.rows[0] });
  } catch (error) {
    console.error('Error deactivating item:', error);
    res.status(500).json({ error: 'Failed to deactivate item' });
  }
});

/**
 * @route GET /api/inventory/price-history/:id
 * @description Get price change history for an item
 */
app.get('/api/inventory/price-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const result = await pool.query(`
      SELECT
        iph.*,
        u.username as changed_by_name,
        v.vendor_name
      FROM inventory_price_history iph
      LEFT JOIN users u ON iph.changed_by = u.id
      LEFT JOIN vendors v ON iph.vendor_id = v.id
      WHERE iph.inventory_item_id = $1
      ORDER BY iph.changed_at DESC
      LIMIT $2
    `, [id, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

/**
 * @route GET /api/inventory/stats
 * @description Get inventory statistics and value summary
 */
app.get('/api/inventory/stats', async (req, res) => {
  try {
    const valueSummary = await pool.query('SELECT * FROM inventory_value_summary');
    const lowStock = await pool.query('SELECT COUNT(*) as count FROM inventory_low_stock');
    const recentChanges = await pool.query(`
      SELECT COUNT(*) as count
      FROM inventory_price_history
      WHERE changed_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    res.json({
      value_summary: valueSummary.rows,
      low_stock_count: parseInt(lowStock.rows[0].count),
      recent_price_changes: parseInt(recentChanges.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ error: 'Failed to fetch inventory stats' });
  }
});

// ============================================
// TASK MANAGEMENT ENDPOINTS
// ============================================

/**
 * @route GET /api/tasks
 * @description Get all tasks with optional filtering
 */
app.get('/api/tasks', async (req, res) => {
  try {
    const { status, category, priority, assigned_to_id } = req.query;

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status && status !== 'all') {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (category && category !== 'all') {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (priority) {
      query += ` AND priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (assigned_to_id) {
      query += ` AND assigned_to_id = $${paramCount}`;
      params.push(assigned_to_id);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    // Get stats
    const statsResult = await pool.query('SELECT * FROM task_stats');

    res.json({
      tasks: result.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * @route GET /api/tasks/active
 * @description Get active tasks (not completed or cancelled)
 */
app.get('/api/tasks/active', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM active_tasks');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active tasks:', error);
    res.status(500).json({ error: 'Failed to fetch active tasks' });
  }
});

/**
 * @route GET /api/tasks/:id
 * @description Get single task by ID
 */
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

/**
 * @route POST /api/tasks
 * @description Create new task
 */
app.post('/api/tasks', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      status,
      assigned_to_id,
      assigned_to_name,
      due_date,
      notes
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(`
      INSERT INTO tasks (
        title,
        description,
        category,
        priority,
        status,
        assigned_to_id,
        assigned_to_name,
        due_date,
        notes,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      title,
      description,
      category || 'Other',
      priority || 'Medium',
      status || 'Pending',
      assigned_to_id,
      assigned_to_name,
      due_date,
      notes,
      req.user?.id || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * @route PUT /api/tasks/:id
 * @description Update task
 */
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      priority,
      status,
      assigned_to_id,
      assigned_to_name,
      due_date,
      notes
    } = req.body;

    const result = await pool.query(`
      UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        assigned_to_id = COALESCE($6, assigned_to_id),
        assigned_to_name = COALESCE($7, assigned_to_name),
        due_date = COALESCE($8, due_date),
        notes = COALESCE($9, notes),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      title,
      description,
      category,
      priority,
      status,
      assigned_to_id,
      assigned_to_name,
      due_date,
      notes,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * @route DELETE /api/tasks/:id
 * @description Delete task
 */
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

/**
 * @route GET /api/tasks/stats
 * @description Get task statistics
 */
app.get('/api/tasks/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM task_stats');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ error: 'Failed to fetch task stats' });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 ServiceSync Backend Server Started');
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`💾 Database: ${process.env.DB_NAME || 'servicesync_dev'}`);
  console.log(`🌐 Frontend: http://localhost:3000`);
  console.log('');
  console.log('📋 Customer Management Endpoints:');
  console.log('   📊 GET  /api/customers/stats - Customer statistics');
  console.log('   🔍 GET  /api/customers/search?q=query&active_only=true');
  console.log('   👤 GET  /api/customers/:id - Get customer details');
  console.log('   👤 POST /api/customers - Create new customer');
  console.log('   🔄 PUT  /api/customers/:id - Update customer');
  console.log('   🔄 PUT  /api/customers/:id/status - Deactivate/reactivate');
  console.log('   🗺️ PUT  /api/customers/:id/zone - Update customer zone');
  console.log('   🗺️ GET  /api/customers/by-zone/:zone - Get customers by zone');
  console.log('   🗺️ PUT  /api/customers/bulk/zone - Bulk zone assignment');
  console.log('');
  console.log('📋 Enhanced Work Order Endpoints:');
  console.log('   📄 POST /api/work-orders - Create work order with date visibility');
  console.log('   📄 PUT  /api/work-orders/:id - Update work order');
  console.log('   📋 GET  /api/dispatch/board?date=YYYY-MM-DD - Enhanced dispatch board');
  console.log('   👨‍🔧 PUT  /api/work-orders/:id/assign - Assign technician');
  console.log('   🔄 PUT  /api/work-orders/:id/unassign - Unassign technician');
  console.log('   📦 PUT  /api/work-orders/:id/move - Move work order to queue');
  console.log('   📎 POST /api/work-orders/:id/attachments - Upload file');
  console.log('   ✅ PUT  /api/work-orders/:id/complete - Complete work order');
  console.log('   ⏸️ PUT  /api/work-orders/:id/suspend - Suspend work order');
  console.log('   ▶️ PUT  /api/work-orders/:id/resume - Resume suspended work order');
  console.log('   📜 GET  /api/work-orders/:id/history - Get work order history');
  console.log('   📊 GET  /api/work-orders/completed - Get completed work orders');
  console.log('');
  console.log('📊 Other Endpoints:');
  console.log('   👨‍🔧 GET  /api/technicians - Get all technicians');
  console.log('   🔧 GET  /api/customers/:id/equipment - Get customer equipment');
  console.log('   🔧 POST /api/customers/:id/equipment - Add equipment');
  console.log('   🔐 POST /api/auth/login - User authentication');
  console.log('   📊 GET  /api/reports/work-orders - Work order reports');
  console.log('   📡 POST /api/map/gps-webhook - GPS location updates');
  console.log('   ✅ GET  /api/health - Health check');
  console.log('');
  console.log('🔌 WebSocket Events:');
  console.log('   📡 workOrderUpdate - Real-time work order changes (general)');
  console.log('   👨‍🔧 assignedWorkOrderUpdate - Real-time work order changes (tech specific)');
  console.log('   📍 techLocationUpdate - Real-time technician location updates');
  console.log('   🗺️ zoneUpdate - Real-time service zone updates');
  console.log('   👨‍🔧 joinTechRoom/leaveTechRoom - Technician room management');
  console.log('');
  console.log('⭐ Enhanced Features Active:');
  console.log('   📅 Multi-day work order scheduling');
  console.log('   📅 Advanced date visibility management');
  console.log('   🟣 Suspended work order carryover tracking');
  console.log('   📊 Enhanced dispatch board with historical data');
  console.log('');
});

// Export the app for testing or other modules if needed
module.exports = app;