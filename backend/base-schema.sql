-- ServiceSync Base Schema
-- Core tables: customers, work_orders, technicians
-- This must be run FIRST before any other schema files

-- ========================================
-- CUSTOMERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  customer_number VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Service address
  service_address VARCHAR(255),
  service_city VARCHAR(100),
  service_state VARCHAR(50),
  service_zip VARCHAR(20),

  -- Billing address
  billing_address VARCHAR(255),
  billing_city VARCHAR(100),
  billing_state VARCHAR(50),
  billing_zip VARCHAR(20),

  -- Customer details
  customer_type VARCHAR(50), -- 'Residential', 'Commercial', 'Industrial'
  rate_sheet VARCHAR(50),
  payment_terms VARCHAR(100),
  invoice_delivery_method VARCHAR(50), -- 'Email', 'Mail', 'Portal'

  -- Zone assignment
  zone VARCHAR(10),

  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_zone ON customers(zone);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(service_city);

-- ========================================
-- TECHNICIANS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS technicians (
  id SERIAL PRIMARY KEY,
  employee_number VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Work details
  crew VARCHAR(50),
  van_number VARCHAR(50),

  -- Current location tracking
  current_location JSONB, -- {lat, lon, timestamp}
  last_location_update TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_technicians_active ON technicians(is_active);
CREATE INDEX IF NOT EXISTS idx_technicians_crew ON technicians(crew);

-- ========================================
-- WORK ORDERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS work_orders (
  id SERIAL PRIMARY KEY,
  wo_number VARCHAR(50) UNIQUE NOT NULL,

  -- Customer information (denormalized for performance)
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  phone VARCHAR(50),

  -- Service location
  service_address VARCHAR(255),
  service_city VARCHAR(100),
  service_state VARCHAR(50),
  service_zip VARCHAR(20),
  customer_zone VARCHAR(10),

  -- GPS coordinates
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Equipment
  equipment_id INTEGER, -- Will be FK after equipment table is created

  -- Work details
  problem_description TEXT,
  call_rate VARCHAR(50), -- 'Regular Time', 'After Hours', 'Emergency'
  call_urgency VARCHAR(50), -- 'Routine', 'Priority', 'Emergency'
  call_type VARCHAR(50), -- 'Service Call', 'Install', 'Maintenance', 'Estimate'
  priority INTEGER DEFAULT 1,
  customer_po VARCHAR(100),

  -- Scheduling
  scheduled_date DATE,
  scheduled_time_slot VARCHAR(50),
  assigned_tech_id INTEGER REFERENCES technicians(id) ON DELETE SET NULL,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Suspended', 'Complete', 'Completed', 'Deleted'
  completion_queue VARCHAR(100), -- 'Parts Ordered', 'Ready to Schedule', etc.

  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  suspended_at TIMESTAMP,
  parts_ordered_at TIMESTAMP,
  parts_ready_at TIMESTAMP,

  -- Notes
  status_notes TEXT,
  internal_notes TEXT,
  tech_notes TEXT,

  -- Check-in/Check-out tracking
  checked_in_at TIMESTAMP,
  checked_out_at TIMESTAMP,

  -- Multi-day project support
  is_multi_day BOOLEAN DEFAULT FALSE,
  project_start_date DATE,
  project_end_date DATE,
  estimated_hours DECIMAL(6,2),
  project_notes TEXT,

  -- Queue assignment
  queue_id INTEGER, -- Will be FK after queue table is created

  -- Display customization
  card_style_type VARCHAR(50), -- 'normal', 'urgent', 'suspended', etc.
  display_status VARCHAR(50),

  -- Metadata
  created_by_user_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_tech ON work_orders(assigned_tech_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_date ON work_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_zone ON work_orders(customer_zone);
CREATE INDEX IF NOT EXISTS idx_work_orders_number ON work_orders(wo_number);
CREATE INDEX IF NOT EXISTS idx_work_orders_queue ON work_orders(completion_queue);
CREATE INDEX IF NOT EXISTS idx_work_orders_created ON work_orders(created_at);

-- Work Order Number Sequence
CREATE SEQUENCE IF NOT EXISTS work_order_number_seq START WITH 1;

-- Auto-generate WO numbers
CREATE OR REPLACE FUNCTION generate_wo_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_num INTEGER;
  new_wo_number VARCHAR(50);
BEGIN
  -- Get next number
  next_num := nextval('work_order_number_seq');

  -- Format as WO-XXXXX
  new_wo_number := 'WO-' || LPAD(next_num::TEXT, 5, '0');

  -- Check if it already exists (shouldn't happen, but be safe)
  WHILE EXISTS (SELECT 1 FROM work_orders WHERE wo_number = new_wo_number) LOOP
    next_num := nextval('work_order_number_seq');
    new_wo_number := 'WO-' || LPAD(next_num::TEXT, 5, '0');
  END LOOP;

  RETURN new_wo_number;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE customers IS 'Customer master records';
COMMENT ON TABLE technicians IS 'Service technicians and crew members';
COMMENT ON TABLE work_orders IS 'Service work orders and calls';

COMMENT ON COLUMN work_orders.card_style_type IS 'Visual styling for work order cards on dispatch board';
COMMENT ON COLUMN work_orders.completion_queue IS 'Queue assignment for work order workflow';
COMMENT ON COLUMN work_orders.is_multi_day IS 'Indicates if this is a multi-day project';
