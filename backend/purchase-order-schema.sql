-- ServiceSync Purchase Order System Schema
-- Based on Vision's PO workflow and vendor management

-- ============================================
-- VENDOR TYPES AND MANAGEMENT
-- ============================================

-- Vendor payment types
CREATE TYPE vendor_payment_type AS ENUM (
  'net_30',        -- Credit account, uses PO system
  'credit_card',   -- Immediate payment, direct to register
  'consignment'    -- Special case for Duncan Supply
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  vendor_name VARCHAR(200) NOT NULL,
  vendor_code VARCHAR(50) UNIQUE, -- Optional short code (e.g., "DUN" for Duncan)
  payment_type vendor_payment_type NOT NULL DEFAULT 'net_30',

  -- Contact information
  contact_person VARCHAR(200),
  phone VARCHAR(20),
  email VARCHAR(200),
  website VARCHAR(200),

  -- Address
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),

  -- Account details
  account_number VARCHAR(100), -- Our account number with this vendor
  terms VARCHAR(100), -- e.g., "Net 30", "Net 15", "Due on receipt"
  credit_limit DECIMAL(10, 2),

  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_vendor_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Index for quick vendor lookups
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active) WHERE is_active = TRUE;

-- ============================================
-- PURCHASE ORDERS
-- ============================================

-- PO status enum
CREATE TYPE po_status AS ENUM (
  'open',         -- PO created, parts ordered
  'received',     -- All items received, auto-added to register
  'backordered',  -- Some items received, some still pending
  'cancelled'     -- PO cancelled
);

-- Purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated PO number
  work_order_id INTEGER, -- Which work order this PO is for (can be NULL for stock orders)
  vendor_id INTEGER NOT NULL,

  -- Status and dates
  status po_status DEFAULT 'open',
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  received_date DATE, -- When fully received

  -- Financial
  subtotal DECIMAL(10, 2) DEFAULT 0.00,
  tax DECIMAL(10, 2) DEFAULT 0.00,
  shipping DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(10, 2) DEFAULT 0.00,

  -- Tracking
  vendor_invoice_number VARCHAR(100), -- Vendor's invoice number when it arrives
  tracking_number VARCHAR(100),

  -- Notes
  order_notes TEXT,
  receiving_notes TEXT, -- Notes added when receiving

  -- User tracking
  ordered_by INTEGER,
  received_by INTEGER,

  -- Auto-register flag
  auto_added_to_register BOOLEAN DEFAULT FALSE, -- True when items auto-added to WO register

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_po_work_order FOREIGN KEY (work_order_id)
    REFERENCES work_orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_po_vendor FOREIGN KEY (vendor_id)
    REFERENCES vendors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_po_ordered_by FOREIGN KEY (ordered_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_po_received_by FOREIGN KEY (received_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for PO lookups
CREATE INDEX IF NOT EXISTS idx_po_work_order ON purchase_orders(work_order_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_order_date ON purchase_orders(order_date DESC);

-- ============================================
-- PURCHASE ORDER LINE ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id SERIAL PRIMARY KEY,
  po_id INTEGER NOT NULL,

  -- Item details
  line_number INTEGER, -- Order of items in PO
  part_number VARCHAR(100),
  description TEXT NOT NULL,

  -- Quantities
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  quantity_backordered INTEGER DEFAULT 0, -- Calculated: ordered - received

  -- Pricing
  unit_price DECIMAL(10, 2) NOT NULL,
  extended_price DECIMAL(10, 2) NOT NULL, -- quantity_ordered * unit_price

  -- Receiving tracking
  received_date DATE,
  is_backordered BOOLEAN DEFAULT FALSE,
  backorder_eta DATE, -- Estimated arrival for backordered items

  -- Notes
  item_notes TEXT,

  CONSTRAINT fk_poi_purchase_order FOREIGN KEY (po_id)
    REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT chk_quantity_valid CHECK (quantity_received <= quantity_ordered)
);

-- Index for PO item lookups
CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_poi_part_number ON purchase_order_items(part_number);

-- ============================================
-- CONSIGNMENT TRACKING (Duncan Supply)
-- ============================================

CREATE TABLE IF NOT EXISTS consignment_stock (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL, -- Should be Duncan Supply

  -- Item details
  part_number VARCHAR(100) NOT NULL,
  description TEXT,

  -- Stock levels
  quantity_on_hand INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 5,

  -- Pricing
  current_price DECIMAL(10, 2),

  -- Tracking
  last_restocked_date DATE,
  last_counted_date DATE,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_consignment_vendor FOREIGN KEY (vendor_id)
    REFERENCES vendors(id) ON DELETE CASCADE,
  CONSTRAINT uq_consignment_item UNIQUE (vendor_id, part_number)
);

-- Consignment usage tracking (when techs pull from stock)
CREATE TABLE IF NOT EXISTS consignment_usage (
  id SERIAL PRIMARY KEY,
  consignment_stock_id INTEGER NOT NULL,
  work_order_id INTEGER,

  -- Usage details
  quantity_used INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  extended_price DECIMAL(10, 2) NOT NULL,

  -- Tracking
  used_by INTEGER, -- Technician
  used_date DATE DEFAULT CURRENT_DATE,

  -- Billing
  added_to_register BOOLEAN DEFAULT FALSE, -- Auto-added to WO register
  billed_on_invoice VARCHAR(50), -- Weekly invoice number from Duncan

  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_usage_stock FOREIGN KEY (consignment_stock_id)
    REFERENCES consignment_stock(id) ON DELETE CASCADE,
  CONSTRAINT fk_usage_work_order FOREIGN KEY (work_order_id)
    REFERENCES work_orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_usage_user FOREIGN KEY (used_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate next PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_number INTEGER;
  po_number VARCHAR(50);
BEGIN
  -- Get the highest existing PO number
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM purchase_orders
  WHERE po_number ~ '^PO-[0-9]+$';

  -- Format as PO-00001, PO-00002, etc.
  po_number := 'PO-' || LPAD(next_number::TEXT, 5, '0');

  RETURN po_number;
END;
$$ LANGUAGE plpgsql;

-- Function to receive PO and auto-add to register
CREATE OR REPLACE FUNCTION receive_purchase_order(
  po_id_param INTEGER,
  received_by_param INTEGER,
  receiving_notes_param TEXT DEFAULT NULL,
  partial_receive BOOLEAN DEFAULT FALSE -- If true, mark as backordered instead of received
)
RETURNS BOOLEAN AS $$
DECLARE
  po_work_order_id INTEGER;
  po_vendor_id INTEGER;
  vendor_name_var VARCHAR(200);
  item RECORD;
  auto_add_enabled BOOLEAN;
BEGIN
  -- Get PO details
  SELECT work_order_id, vendor_id, auto_added_to_register
  INTO po_work_order_id, po_vendor_id, auto_add_enabled
  FROM purchase_orders
  WHERE id = po_id_param;

  IF po_work_order_id IS NULL THEN
    RAISE EXCEPTION 'Cannot auto-add to register: PO is not linked to a work order';
  END IF;

  IF auto_add_enabled THEN
    RAISE EXCEPTION 'PO has already been added to register';
  END IF;

  -- Get vendor name
  SELECT vendor_name INTO vendor_name_var
  FROM vendors WHERE id = po_vendor_id;

  -- Update PO status
  UPDATE purchase_orders
  SET status = CASE
      WHEN partial_receive THEN 'backordered'::po_status
      ELSE 'received'::po_status
    END,
    received_date = CASE WHEN NOT partial_receive THEN CURRENT_DATE ELSE NULL END,
    received_by = received_by_param,
    receiving_notes = receiving_notes_param,
    updated_at = NOW()
  WHERE id = po_id_param;

  -- Auto-add each line item to work order register
  FOR item IN
    SELECT * FROM purchase_order_items
    WHERE po_id = po_id_param AND quantity_received > 0
  LOOP
    INSERT INTO work_order_line_items (
      work_order_id,
      item_type,
      description,
      quantity,
      unit_price,
      extended_price,
      is_taxable,
      added_by,
      notes,
      created_at
    ) VALUES (
      po_work_order_id,
      'Material',
      item.description || ' (PO-' || (SELECT po_number FROM purchase_orders WHERE id = po_id_param) || ' - ' || vendor_name_var || ')',
      item.quantity_received,
      item.unit_price,
      item.quantity_received * item.unit_price,
      TRUE, -- Materials are typically taxable
      received_by_param,
      'Auto-added from PO #' || (SELECT po_number FROM purchase_orders WHERE id = po_id_param),
      NOW()
    );
  END LOOP;

  -- Mark PO as auto-added
  UPDATE purchase_orders
  SET auto_added_to_register = TRUE
  WHERE id = po_id_param;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to update PO item quantities on receive
CREATE OR REPLACE FUNCTION receive_po_item(
  item_id INTEGER,
  qty_received INTEGER,
  is_backorder BOOLEAN DEFAULT FALSE,
  backorder_eta_param DATE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  po_id_var INTEGER;
  total_items INTEGER;
  received_items INTEGER;
  backordered_items INTEGER;
BEGIN
  -- Update the item
  UPDATE purchase_order_items
  SET quantity_received = qty_received,
      quantity_backordered = quantity_ordered - qty_received,
      received_date = CURRENT_DATE,
      is_backordered = is_backorder,
      backorder_eta = backorder_eta_param
  WHERE id = item_id
  RETURNING po_id INTO po_id_var;

  -- Check if all items are received
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE quantity_received = quantity_ordered) AS received,
    COUNT(*) FILTER (WHERE is_backordered = TRUE) AS backordered
  INTO total_items, received_items, backordered_items
  FROM purchase_order_items
  WHERE po_id = po_id_var;

  -- Update PO status based on item status
  IF received_items = total_items THEN
    -- All items received
    UPDATE purchase_orders
    SET status = 'received'::po_status,
        received_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = po_id_var;
  ELSIF backordered_items > 0 THEN
    -- Some items backordered
    UPDATE purchase_orders
    SET status = 'backordered'::po_status,
        updated_at = NOW()
    WHERE id = po_id_var;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: PO summary with vendor and item counts
CREATE OR REPLACE VIEW purchase_order_summary AS
SELECT
  po.id,
  po.po_number,
  po.status,
  po.order_date,
  po.expected_delivery_date,
  po.received_date,
  po.total_amount,
  po.work_order_id,
  wo.work_order_number,
  v.vendor_name,
  v.payment_type AS vendor_payment_type,
  COUNT(poi.id) AS item_count,
  COUNT(poi.id) FILTER (WHERE poi.quantity_received = poi.quantity_ordered) AS items_received,
  COUNT(poi.id) FILTER (WHERE poi.is_backordered = TRUE) AS items_backordered,
  u.username AS ordered_by_name,
  po.auto_added_to_register
FROM purchase_orders po
JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN work_orders wo ON po.work_order_id = wo.id
LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
LEFT JOIN users u ON po.ordered_by = u.id
GROUP BY po.id, po.po_number, po.status, po.order_date, po.expected_delivery_date,
  po.received_date, po.total_amount, po.work_order_id, wo.work_order_number,
  v.vendor_name, v.payment_type, u.username, po.auto_added_to_register
ORDER BY po.order_date DESC, po.po_number DESC;

-- View: PO items with receiving status
CREATE OR REPLACE VIEW purchase_order_items_detail AS
SELECT
  poi.id,
  poi.po_id,
  po.po_number,
  po.status AS po_status,
  poi.line_number,
  poi.part_number,
  poi.description,
  poi.quantity_ordered,
  poi.quantity_received,
  poi.quantity_backordered,
  poi.unit_price,
  poi.extended_price,
  poi.is_backordered,
  poi.backorder_eta,
  poi.received_date,
  v.vendor_name,
  po.work_order_id,
  wo.work_order_number
FROM purchase_order_items poi
JOIN purchase_orders po ON poi.po_id = po.id
JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN work_orders wo ON po.work_order_id = wo.id
ORDER BY po.po_number DESC, poi.line_number;

-- View: Active consignment stock levels
CREATE OR REPLACE VIEW consignment_stock_levels AS
SELECT
  cs.id,
  v.vendor_name,
  cs.part_number,
  cs.description,
  cs.quantity_on_hand,
  cs.reorder_level,
  CASE
    WHEN cs.quantity_on_hand <= cs.reorder_level THEN TRUE
    ELSE FALSE
  END AS needs_reorder,
  cs.current_price,
  cs.last_restocked_date,
  cs.last_counted_date,
  COALESCE(SUM(cu.quantity_used), 0) AS total_usage_last_30_days
FROM consignment_stock cs
JOIN vendors v ON cs.vendor_id = v.id
LEFT JOIN consignment_usage cu ON cs.id = cu.consignment_stock_id
  AND cu.used_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE v.payment_type = 'consignment'
GROUP BY cs.id, v.vendor_name, cs.part_number, cs.description,
  cs.quantity_on_hand, cs.reorder_level, cs.current_price,
  cs.last_restocked_date, cs.last_counted_date
ORDER BY v.vendor_name, cs.part_number;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert common vendors (adjust as needed)
INSERT INTO vendors (vendor_name, vendor_code, payment_type, terms, notes)
VALUES
  ('Duncan Supply', 'DUN', 'consignment', 'Net 30', 'Weekly rep visits, consignment stock'),
  ('Grainger', 'GRA', 'net_30', 'Net 30', 'Industrial supplies'),
  ('Ferguson', 'FER', 'net_30', 'Net 30', 'HVAC parts and supplies'),
  ('Menards', 'MEN', 'credit_card', 'Due on receipt', 'Immediate payment with company card')
ON CONFLICT (vendor_code) DO NOTHING;

-- ============================================
-- GRANTS
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Comments
COMMENT ON TABLE vendors IS 'Vendor/supplier information with payment type tracking';
COMMENT ON TABLE purchase_orders IS 'Purchase orders for Net 30 vendors';
COMMENT ON TABLE purchase_order_items IS 'Line items for each purchase order';
COMMENT ON TABLE consignment_stock IS 'Consignment stock levels (Duncan Supply)';
COMMENT ON TABLE consignment_usage IS 'Tracking of consignment stock usage';
COMMENT ON FUNCTION receive_purchase_order IS 'Mark PO as received and auto-add items to work order register';
COMMENT ON FUNCTION receive_po_item IS 'Update received quantities for PO line items';
COMMENT ON FUNCTION generate_po_number IS 'Generate next sequential PO number';
