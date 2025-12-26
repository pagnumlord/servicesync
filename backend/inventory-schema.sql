-- ============================================
-- ServiceSync Inventory & Parts Management
-- ============================================
-- Unified inventory system for both regular parts (consignment/stock)
-- and miscellaneous items (chemicals, fees, labor, etc.)

-- ============================================
-- INVENTORY ITEMS (Parts + Miscellaneous)
-- ============================================

-- Item type enum
CREATE TYPE inventory_item_type AS ENUM (
  'inventory',      -- Regular parts (motors, refrigerant, etc.)
  'miscellaneous'   -- Chemicals, fees, labor items, etc.
);

-- Product category enum (for miscellaneous items)
CREATE TYPE product_category_type AS ENUM (
  'labor',
  'equipment',
  'subcontractor',
  'misc_use_fees',
  'refrig_trailer',
  'material',
  'other'
);

-- Main inventory table
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,

  -- Item classification
  item_type inventory_item_type NOT NULL DEFAULT 'inventory',
  product_category product_category_type DEFAULT 'material',

  -- Identification
  part_number VARCHAR(100) UNIQUE, -- NULL for misc items without part numbers
  description TEXT NOT NULL,
  manufacturer VARCHAR(200),
  mfg_part_number VARCHAR(100), -- Manufacturer's part number

  -- Pricing
  unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  unit_sale DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  markup_percentage DECIMAL(5, 2), -- Calculated: (unit_sale - unit_cost) / unit_cost * 100

  -- Stock tracking (primarily for inventory items)
  quantity_on_hand INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  location VARCHAR(100), -- Warehouse location, van, etc.

  -- Vendor information
  primary_vendor_id INTEGER, -- Main vendor for this item
  vendor_part_number VARCHAR(100), -- Vendor's part number (may differ from mfg)
  last_vendor_price DECIMAL(10, 2), -- Last known vendor price
  last_price_check_date DATE, -- When price was last verified

  -- Tax and billing
  is_taxable BOOLEAN DEFAULT TRUE,
  tax_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Flags
  is_equipment BOOLEAN DEFAULT FALSE, -- Equipment vs consumable
  is_active BOOLEAN DEFAULT TRUE,
  is_consignment BOOLEAN DEFAULT FALSE, -- Consignment item (Duncan)
  requires_po BOOLEAN DEFAULT FALSE, -- Requires PO vs direct purchase

  -- Usage tracking
  last_used_date DATE,
  times_ordered INTEGER DEFAULT 0, -- How many times ordered

  -- Notes and metadata
  notes TEXT,
  internal_notes TEXT, -- Internal notes not visible to customers

  -- System fields
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER,

  CONSTRAINT fk_inventory_vendor FOREIGN KEY (primary_vendor_id)
    REFERENCES vendors(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_updater FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_part_number ON inventory_items(part_number) WHERE part_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_description ON inventory_items USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_items(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_vendor ON inventory_items(primary_vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory_items(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_inventory_manufacturer ON inventory_items(manufacturer) WHERE manufacturer IS NOT NULL;

-- ============================================
-- PRICE CHANGE HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_price_history (
  id SERIAL PRIMARY KEY,
  inventory_item_id INTEGER NOT NULL,

  -- Price changes
  old_unit_cost DECIMAL(10, 2),
  new_unit_cost DECIMAL(10, 2),
  cost_change_amount DECIMAL(10, 2), -- new - old
  cost_change_percent DECIMAL(5, 2), -- % change

  old_unit_sale DECIMAL(10, 2),
  new_unit_sale DECIMAL(10, 2),
  sale_change_amount DECIMAL(10, 2),
  sale_change_percent DECIMAL(5, 2),

  -- Tracking
  change_reason TEXT, -- "Monthly price update", "Vendor increase", etc.
  change_source VARCHAR(100), -- "Manual", "Price Scraper", "Vendor Notice", etc.
  changed_by INTEGER,
  changed_at TIMESTAMP DEFAULT NOW(),

  -- Vendor information at time of change
  vendor_id INTEGER,
  vendor_invoice_reference VARCHAR(100), -- Reference to vendor invoice if applicable

  CONSTRAINT fk_price_history_item FOREIGN KEY (inventory_item_id)
    REFERENCES inventory_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_price_history_user FOREIGN KEY (changed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_price_history_vendor FOREIGN KEY (vendor_id)
    REFERENCES vendors(id) ON DELETE SET NULL
);

-- Index for price history lookups
CREATE INDEX IF NOT EXISTS idx_price_history_item ON inventory_price_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON inventory_price_history(changed_at DESC);

-- ============================================
-- VENDOR PRICING (Multi-vendor support)
-- ============================================
-- Track pricing from multiple vendors for the same item

CREATE TABLE IF NOT EXISTS inventory_vendor_pricing (
  id SERIAL PRIMARY KEY,
  inventory_item_id INTEGER NOT NULL,
  vendor_id INTEGER NOT NULL,

  -- Vendor-specific details
  vendor_part_number VARCHAR(100),
  vendor_description TEXT,

  -- Pricing
  vendor_unit_cost DECIMAL(10, 2) NOT NULL,
  minimum_order_qty INTEGER DEFAULT 1,
  lead_time_days INTEGER, -- Typical delivery time

  -- Tracking
  is_preferred BOOLEAN DEFAULT FALSE, -- Preferred vendor for this item
  last_ordered_date DATE,
  last_price_update DATE DEFAULT CURRENT_DATE,

  -- Status
  is_available BOOLEAN DEFAULT TRUE,
  availability_notes TEXT, -- "Backordered until...", "Discontinued", etc.

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_vendor_pricing_item FOREIGN KEY (inventory_item_id)
    REFERENCES inventory_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_vendor_pricing_vendor FOREIGN KEY (vendor_id)
    REFERENCES vendors(id) ON DELETE CASCADE,
  CONSTRAINT uq_vendor_pricing UNIQUE (inventory_item_id, vendor_id)
);

-- Index for vendor pricing lookups
CREATE INDEX IF NOT EXISTS idx_vendor_pricing_item ON inventory_vendor_pricing(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_vendor_pricing_vendor ON inventory_vendor_pricing(vendor_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically log price changes
CREATE OR REPLACE FUNCTION log_inventory_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if prices actually changed
  IF (OLD.unit_cost != NEW.unit_cost OR OLD.unit_sale != NEW.unit_sale) THEN
    INSERT INTO inventory_price_history (
      inventory_item_id,
      old_unit_cost,
      new_unit_cost,
      cost_change_amount,
      cost_change_percent,
      old_unit_sale,
      new_unit_sale,
      sale_change_amount,
      sale_change_percent,
      changed_by,
      vendor_id
    ) VALUES (
      NEW.id,
      OLD.unit_cost,
      NEW.unit_cost,
      NEW.unit_cost - OLD.unit_cost,
      CASE WHEN OLD.unit_cost > 0 THEN
        ((NEW.unit_cost - OLD.unit_cost) / OLD.unit_cost * 100)
      ELSE 0 END,
      OLD.unit_sale,
      NEW.unit_sale,
      NEW.unit_sale - OLD.unit_sale,
      CASE WHEN OLD.unit_sale > 0 THEN
        ((NEW.unit_sale - OLD.unit_sale) / OLD.unit_sale * 100)
      ELSE 0 END,
      NEW.updated_by,
      NEW.primary_vendor_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log price changes
CREATE TRIGGER trigger_log_price_changes
  AFTER UPDATE ON inventory_items
  FOR EACH ROW
  WHEN (OLD.unit_cost IS DISTINCT FROM NEW.unit_cost OR
        OLD.unit_sale IS DISTINCT FROM NEW.unit_sale)
  EXECUTE FUNCTION log_inventory_price_change();

-- Function to calculate markup percentage
CREATE OR REPLACE FUNCTION calculate_markup_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_cost > 0 THEN
    NEW.markup_percentage := ((NEW.unit_sale - NEW.unit_cost) / NEW.unit_cost * 100);
  ELSE
    NEW.markup_percentage := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate markup
CREATE TRIGGER trigger_calculate_markup
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_markup_percentage();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Inventory items with vendor information
CREATE OR REPLACE VIEW inventory_items_with_vendor AS
SELECT
  i.*,
  v.vendor_name,
  v.vendor_code,
  v.payment_type AS vendor_payment_type,
  CASE
    WHEN i.quantity_on_hand <= i.reorder_level THEN TRUE
    ELSE FALSE
  END AS needs_reorder,
  (SELECT COUNT(*) FROM inventory_price_history WHERE inventory_item_id = i.id) AS price_change_count,
  (SELECT changed_at FROM inventory_price_history WHERE inventory_item_id = i.id ORDER BY changed_at DESC LIMIT 1) AS last_price_change_date
FROM inventory_items i
LEFT JOIN vendors v ON i.primary_vendor_id = v.id
ORDER BY i.part_number, i.description;

-- View: Low stock items
CREATE OR REPLACE VIEW inventory_low_stock AS
SELECT
  i.id,
  i.part_number,
  i.description,
  i.manufacturer,
  i.quantity_on_hand,
  i.reorder_level,
  i.reorder_level - i.quantity_on_hand AS units_below_reorder,
  v.vendor_name,
  i.unit_cost,
  (i.reorder_level - i.quantity_on_hand) * i.unit_cost AS estimated_reorder_cost
FROM inventory_items i
LEFT JOIN vendors v ON i.primary_vendor_id = v.id
WHERE i.is_active = TRUE
  AND i.item_type = 'inventory'
  AND i.quantity_on_hand <= i.reorder_level
ORDER BY (i.reorder_level - i.quantity_on_hand) DESC;

-- View: Price change summary (last 30 days)
CREATE OR REPLACE VIEW inventory_recent_price_changes AS
SELECT
  iph.id,
  iph.changed_at,
  i.part_number,
  i.description,
  i.manufacturer,
  iph.old_unit_cost,
  iph.new_unit_cost,
  iph.cost_change_amount,
  iph.cost_change_percent,
  iph.old_unit_sale,
  iph.new_unit_sale,
  iph.sale_change_amount,
  iph.sale_change_percent,
  iph.change_reason,
  iph.change_source,
  u.username AS changed_by_name,
  v.vendor_name
FROM inventory_price_history iph
JOIN inventory_items i ON iph.inventory_item_id = i.id
LEFT JOIN users u ON iph.changed_by = u.id
LEFT JOIN vendors v ON iph.vendor_id = v.id
WHERE iph.changed_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY iph.changed_at DESC;

-- View: Inventory value summary
CREATE OR REPLACE VIEW inventory_value_summary AS
SELECT
  item_type,
  COUNT(*) AS item_count,
  SUM(quantity_on_hand) AS total_quantity,
  SUM(quantity_on_hand * unit_cost) AS total_cost_value,
  SUM(quantity_on_hand * unit_sale) AS total_sale_value,
  SUM(quantity_on_hand * (unit_sale - unit_cost)) AS total_profit_potential
FROM inventory_items
WHERE is_active = TRUE
GROUP BY item_type;

-- ============================================
-- SEED DATA (Example Items)
-- ============================================

-- Example inventory items (adjust as needed)
INSERT INTO inventory_items (
  item_type,
  part_number,
  description,
  manufacturer,
  unit_cost,
  unit_sale,
  is_taxable,
  product_category,
  quantity_on_hand,
  reorder_level,
  is_active
) VALUES
  -- Refrigerants
  ('inventory', 'R134A', 'R134A Refrigerant - 30lb Cylinder', 'Various', 400.00, 600.00, true, 'material', 5, 3, true),
  ('inventory', 'R404A', 'R404A Refrigerant - 25lb Cylinder', 'Various', 450.00, 675.00, true, 'material', 3, 2, true),
  ('inventory', 'R410A', 'R410A Refrigerant - 25lb Cylinder', 'Various', 350.00, 525.00, true, 'material', 4, 2, true),

  -- Common parts
  ('inventory', 'COMP-3HP', '3HP Compressor - Copeland', 'Copeland', 850.00, 1275.00, true, 'equipment', 2, 1, true),
  ('inventory', 'MOTOR-1/4', '1/4 HP Condenser Fan Motor', 'GE', 125.00, 200.00, true, 'equipment', 4, 2, true),

  -- Miscellaneous items
  ('miscellaneous', NULL, '40W Light Bulb', NULL, 1.20, 2.52, false, 'material', 0, 0, true),
  ('miscellaneous', NULL, 'Warranty Travel', NULL, 0.00, 95.00, true, 'labor', 0, 0, true),
  ('miscellaneous', NULL, 'Ice-O-Matic Recovery Fee', NULL, 0.00, 15.00, true, 'misc_use_fees', 0, 0, true),
  ('miscellaneous', NULL, 'Small Recovery (0-5 lbs)', NULL, 0.00, 35.00, true, 'misc_use_fees', 0, 0, true),
  ('miscellaneous', NULL, 'Subcontractor Labor', NULL, 0.00, 0.00, true, 'subcontractor', 0, 0, true)
ON CONFLICT (part_number) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE inventory_items IS 'Unified inventory table for parts and miscellaneous items';
COMMENT ON TABLE inventory_price_history IS 'Historical tracking of all price changes';
COMMENT ON TABLE inventory_vendor_pricing IS 'Multi-vendor pricing for inventory items';
COMMENT ON COLUMN inventory_items.item_type IS 'Type: inventory (regular parts) or miscellaneous (fees, labor, chemicals)';
COMMENT ON COLUMN inventory_items.product_category IS 'Category for billing: labor, equipment, material, etc.';
COMMENT ON COLUMN inventory_items.is_consignment IS 'True if consignment item (e.g., Duncan Supply)';
COMMENT ON COLUMN inventory_items.markup_percentage IS 'Auto-calculated markup percentage';
