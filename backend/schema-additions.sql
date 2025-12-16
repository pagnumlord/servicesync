-- ServiceSync Database Schema Additions
-- Register Tab, Purchasing Module, and Invoice Features
-- Run this to add new tables for enhanced functionality

-- ========================================
-- VENDORS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  vendor_number VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  phone_2 VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),

  -- Business details
  payment_terms VARCHAR(100), -- 'Net 30', 'Net 60', 'COD', 'Credit Card'
  tax_id VARCHAR(50),
  account_number VARCHAR(100), -- Our account number with vendor

  -- Categories
  vendor_type VARCHAR(50), -- 'Parts', 'Equipment', 'Service', 'Supplies'
  specialty VARCHAR(100), -- 'HVAC', 'Refrigeration', 'Electrical', etc.

  -- Financial
  credit_limit DECIMAL(10,2),
  current_balance DECIMAL(10,2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_preferred BOOLEAN DEFAULT false,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Metadata
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id INTEGER
);

-- ========================================
-- PURCHASE ORDERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE RESTRICT,

  -- Dates
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  received_date DATE,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'Open', -- 'Open', 'Ordered', 'Partial', 'Received', 'Cancelled'

  -- Financial
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,

  -- Payment
  payment_method VARCHAR(50), -- 'Net 30', 'Credit Card', 'Check', 'COD'
  payment_status VARCHAR(50) DEFAULT 'Unpaid', -- 'Unpaid', 'Partial', 'Paid'
  payment_date DATE,

  -- Shipping
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(100),
  ship_to_address TEXT,

  -- Additional info
  notes TEXT,
  internal_notes TEXT,
  priority VARCHAR(20) DEFAULT 'Normal', -- 'Low', 'Normal', 'High', 'Rush'

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id INTEGER,
  approved_by_user_id INTEGER,
  approved_at TIMESTAMP
);

-- ========================================
-- PURCHASE ORDER LINE ITEMS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS po_line_items (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,

  -- Item details
  line_number INTEGER NOT NULL,
  part_number VARCHAR(100),
  description TEXT NOT NULL,
  manufacturer VARCHAR(100),

  -- Quantity and pricing
  quantity_ordered DECIMAL(10,3) NOT NULL,
  quantity_received DECIMAL(10,3) DEFAULT 0,
  unit_of_measure VARCHAR(20) DEFAULT 'EA', -- 'EA', 'LB', 'FT', 'GAL', etc.

  unit_cost DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,

  -- Markup for resale
  markup_percentage DECIMAL(5,2) DEFAULT 0,
  sell_price DECIMAL(10,2),

  -- Status
  status VARCHAR(50) DEFAULT 'Ordered', -- 'Ordered', 'Backordered', 'Received', 'Cancelled'

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- WORK ORDER LINE ITEMS TABLE (Register Tab)
-- ========================================
CREATE TABLE IF NOT EXISTS work_order_line_items (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,

  -- Item details
  line_number INTEGER NOT NULL,
  item_type VARCHAR(50) NOT NULL, -- 'labor', 'part', 'material', 'equipment', 'misc'

  -- Description
  description TEXT NOT NULL,
  part_number VARCHAR(100),
  manufacturer VARCHAR(100),

  -- Quantity and pricing
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_of_measure VARCHAR(20) DEFAULT 'EA',

  unit_cost DECIMAL(10,2) DEFAULT 0, -- What we paid
  unit_price DECIMAL(10,2) NOT NULL, -- What we charge

  -- Labor specific fields
  labor_hours DECIMAL(5,2),
  labor_rate DECIMAL(10,2),

  -- Calculated
  line_total DECIMAL(10,2) NOT NULL,
  cost_total DECIMAL(10,2) DEFAULT 0,
  profit_margin DECIMAL(10,2),

  -- Source tracking
  po_line_item_id INTEGER REFERENCES po_line_items(id) ON DELETE SET NULL,

  -- Status
  is_billable BOOLEAN DEFAULT true,
  is_taxable BOOLEAN DEFAULT true,
  is_warranty BOOLEAN DEFAULT false,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id INTEGER
);

-- ========================================
-- INVOICES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE RESTRICT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,

  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Cancelled'

  -- Financial
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) DEFAULT 0,

  -- Payment tracking
  payment_terms VARCHAR(100), -- 'Due on Receipt', 'Net 30', 'Net 60'
  payment_method VARCHAR(50),
  last_payment_date DATE,

  -- QuickBooks integration
  quickbooks_invoice_id VARCHAR(100),
  quickbooks_sync_status VARCHAR(50),
  quickbooks_last_sync TIMESTAMP,

  -- Additional info
  notes TEXT,
  internal_notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id INTEGER,
  sent_at TIMESTAMP,
  sent_by_user_id INTEGER
);

-- ========================================
-- INVOICE LINE ITEMS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  work_order_line_item_id INTEGER REFERENCES work_order_line_items(id) ON DELETE SET NULL,

  line_number INTEGER NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,

  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,

  is_taxable BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- PAYMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE RESTRICT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,

  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL,

  payment_method VARCHAR(50) NOT NULL, -- 'Cash', 'Check', 'Credit Card', 'ACH', 'Wire Transfer'
  reference_number VARCHAR(100), -- Check number, transaction ID, etc.

  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id INTEGER
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Vendors
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(vendor_type);

-- Purchase Orders
CREATE INDEX IF NOT EXISTS idx_po_work_order ON purchase_orders(work_order_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_order_date ON purchase_orders(order_date);

-- PO Line Items
CREATE INDEX IF NOT EXISTS idx_po_line_po ON po_line_items(po_id);

-- Work Order Line Items
CREATE INDEX IF NOT EXISTS idx_wo_line_wo ON work_order_line_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_line_type ON work_order_line_items(item_type);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoice_wo ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoices(invoice_date);

-- Invoice Line Items
CREATE INDEX IF NOT EXISTS idx_invoice_line_invoice ON invoice_line_items(invoice_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_date ON payments(payment_date);

-- ========================================
-- AUTO-NUMBER GENERATION FUNCTIONS
-- ========================================

-- Generate next PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_num INTEGER;
  new_po_number VARCHAR(50);
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM purchase_orders
  WHERE po_number ~ '^PO-[0-9]+$';

  new_po_number := 'PO-' || LPAD(next_num::text, 5, '0');
  RETURN new_po_number;
END;
$$ LANGUAGE plpgsql;

-- Generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_num INTEGER;
  new_invoice_number VARCHAR(50);
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM invoices
  WHERE invoice_number ~ '^INV-[0-9]+$';

  new_invoice_number := 'INV-' || LPAD(next_num::text, 5, '0');
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Generate next vendor number
CREATE OR REPLACE FUNCTION generate_vendor_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_num INTEGER;
  new_vendor_number VARCHAR(50);
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(vendor_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM vendors
  WHERE vendor_number ~ '^VN-[0-9]+$';

  new_vendor_number := 'VN-' || LPAD(next_num::text, 4, '0');
  RETURN new_vendor_number;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGER FUNCTIONS
-- ========================================

-- Update PO totals when line items change
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_orders
  SET
    subtotal = (
      SELECT COALESCE(SUM(line_total), 0)
      FROM po_line_items
      WHERE po_id = COALESCE(NEW.po_id, OLD.po_id)
    ),
    total_amount = (
      SELECT COALESCE(SUM(line_total), 0) + COALESCE(purchase_orders.tax_amount, 0) + COALESCE(purchase_orders.shipping_amount, 0)
      FROM po_line_items
      WHERE po_id = COALESCE(NEW.po_id, OLD.po_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.po_id, OLD.po_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER po_line_items_totals
AFTER INSERT OR UPDATE OR DELETE ON po_line_items
FOR EACH ROW
EXECUTE FUNCTION update_po_totals();

-- Update work order totals when line items change
CREATE OR REPLACE FUNCTION update_wo_line_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE work_orders
  SET
    total_labor_cost = (
      SELECT COALESCE(SUM(line_total), 0)
      FROM work_order_line_items
      WHERE work_order_id = COALESCE(NEW.work_order_id, OLD.work_order_id)
        AND item_type = 'labor'
    ),
    total_parts_cost = (
      SELECT COALESCE(SUM(line_total), 0)
      FROM work_order_line_items
      WHERE work_order_id = COALESCE(NEW.work_order_id, OLD.work_order_id)
        AND item_type IN ('part', 'material', 'equipment')
    ),
    total_cost = (
      SELECT COALESCE(SUM(line_total), 0)
      FROM work_order_line_items
      WHERE work_order_id = COALESCE(NEW.work_order_id, OLD.work_order_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.work_order_id, OLD.work_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wo_line_items_totals
AFTER INSERT OR UPDATE OR DELETE ON work_order_line_items
FOR EACH ROW
EXECUTE FUNCTION update_wo_line_totals();

-- Update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  inv_subtotal DECIMAL(10,2);
  inv_tax_amount DECIMAL(10,2);
  inv_total DECIMAL(10,2);
BEGIN
  SELECT
    COALESCE(SUM(line_total), 0),
    COALESCE(SUM(CASE WHEN is_taxable THEN line_total ELSE 0 END), 0) * (SELECT COALESCE(tax_rate, 0) / 100 FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id))
  INTO inv_subtotal, inv_tax_amount
  FROM invoice_line_items
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  inv_total := inv_subtotal + inv_tax_amount;

  UPDATE invoices
  SET
    subtotal = inv_subtotal,
    tax_amount = inv_tax_amount,
    total_amount = inv_total - COALESCE(discount_amount, 0),
    balance_due = inv_total - COALESCE(discount_amount, 0) - COALESCE(amount_paid, 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_line_items_totals
AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
FOR EACH ROW
EXECUTE FUNCTION update_invoice_totals();

-- ========================================
-- SAMPLE DATA (Optional - for testing)
-- ========================================

-- Insert sample vendor
INSERT INTO vendors (vendor_number, name, contact_name, phone, email, payment_terms, vendor_type, is_active)
VALUES
  ('VN-0001', 'Parts Town', 'John Smith', '(800) 555-0001', 'orders@partstown.com', 'Net 30', 'Parts', true),
  ('VN-0002', 'AllPoints Foodservice Parts', 'Jane Doe', '(800) 555-0002', 'info@allpointsfps.com', 'Net 30', 'Parts', true),
  ('VN-0003', 'Grainger Industrial', 'Bob Johnson', '(800) 555-0003', 'sales@grainger.com', 'Credit Card', 'Supplies', true)
ON CONFLICT (vendor_number) DO NOTHING;

COMMENT ON TABLE vendors IS 'Supplier and vendor management for purchasing';
COMMENT ON TABLE purchase_orders IS 'Purchase orders for parts and materials';
COMMENT ON TABLE po_line_items IS 'Line items for purchase orders';
COMMENT ON TABLE work_order_line_items IS 'Register tab - labor and parts breakdown';
COMMENT ON TABLE invoices IS 'Customer invoices generated from work orders';
COMMENT ON TABLE invoice_line_items IS 'Line items for invoices';
COMMENT ON TABLE payments IS 'Payment tracking for invoices';
