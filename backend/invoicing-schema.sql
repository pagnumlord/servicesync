-- Invoicing Schema for ServiceSync
-- Foundation for QuickBooks Integration

-- Invoice Status Enum
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'Draft',
    'Pending',
    'Sent',
    'Paid',
    'Partial',
    'Overdue',
    'Void',
    'Cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payment Method Enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'Cash',
    'Check',
    'Credit Card',
    'ACH',
    'Wire Transfer',
    'QuickBooks Payment',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,

  -- Invoice Details
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  terms VARCHAR(50) DEFAULT 'Net 30',

  -- Customer Information (denormalized for invoice permanence)
  bill_to_name VARCHAR(255) NOT NULL,
  bill_to_address VARCHAR(255),
  bill_to_city VARCHAR(100),
  bill_to_state VARCHAR(50),
  bill_to_zip VARCHAR(20),
  bill_to_email VARCHAR(255),
  bill_to_phone VARCHAR(50),

  -- Financial Summary
  subtotal DECIMAL(12,2) DEFAULT 0.00,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(12,2) DEFAULT 0.00,
  balance_due DECIMAL(12,2) DEFAULT 0.00,

  -- Status & Tracking
  status invoice_status DEFAULT 'Draft',
  notes TEXT,
  internal_notes TEXT,

  -- QuickBooks Integration
  quickbooks_id VARCHAR(100) UNIQUE,
  quickbooks_sync_token VARCHAR(100),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'Not Synced', -- 'Not Synced', 'Syncing', 'Synced', 'Error'
  sync_error TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES technicians(id),

  -- Indexes for performance
  CONSTRAINT chk_amounts CHECK (
    subtotal >= 0 AND
    tax_amount >= 0 AND
    discount_amount >= 0 AND
    total_amount >= 0 AND
    amount_paid >= 0 AND
    balance_due >= 0
  )
);

-- Invoice Line Items Table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Line Item Details
  line_number INTEGER NOT NULL,
  item_type VARCHAR(50) NOT NULL, -- 'Labor', 'Parts', 'Equipment', 'Service', 'Custom'
  description TEXT NOT NULL,

  -- Reference to source (if applicable)
  register_entry_id INTEGER REFERENCES register(id),
  purchase_order_id INTEGER REFERENCES purchase_orders(id),

  -- Pricing
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unit_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,

  -- Tax handling
  is_taxable BOOLEAN DEFAULT true,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,

  -- QuickBooks Integration
  quickbooks_item_id VARCHAR(100),
  quickbooks_account_ref VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_invoice_line_number UNIQUE (invoice_id, line_number),
  CONSTRAINT chk_line_amounts CHECK (quantity > 0 AND line_total >= 0)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Payment Details
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  reference_number VARCHAR(100), -- Check number, transaction ID, etc.

  -- Payment Notes
  notes TEXT,

  -- QuickBooks Integration
  quickbooks_payment_id VARCHAR(100) UNIQUE,
  quickbooks_sync_token VARCHAR(100),
  last_synced_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES technicians(id),

  CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

-- Invoice Number Sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1001;

-- Function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_num INTEGER;
  new_invoice_number VARCHAR(50);
BEGIN
  next_num := nextval('invoice_number_seq');
  new_invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 5, '0');

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_number = new_invoice_number) LOOP
    next_num := nextval('invoice_number_seq');
    new_invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 5, '0');
  END LOOP;

  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number if not provided
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Trigger to update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET
    subtotal = (
      SELECT COALESCE(SUM(line_total), 0)
      FROM invoice_line_items
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    tax_amount = (
      SELECT COALESCE(SUM(tax_amount), 0)
      FROM invoice_line_items
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Update total_amount and balance_due
  UPDATE invoices
  SET
    total_amount = subtotal + tax_amount - discount_amount,
    balance_due = (subtotal + tax_amount - discount_amount) - amount_paid,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_totals_insert
  AFTER INSERT ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER trigger_update_invoice_totals_update
  AFTER UPDATE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER trigger_update_invoice_totals_delete
  AFTER DELETE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- Trigger to update invoice balance when payments are added
CREATE OR REPLACE FUNCTION update_invoice_payment_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET
    amount_paid = (
      SELECT COALESCE(SUM(amount), 0)
      FROM invoice_payments
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Update balance_due and status
  UPDATE invoices
  SET
    balance_due = total_amount - amount_paid,
    status = CASE
      WHEN amount_paid >= total_amount THEN 'Paid'::invoice_status
      WHEN amount_paid > 0 THEN 'Partial'::invoice_status
      WHEN due_date < CURRENT_DATE AND status NOT IN ('Paid', 'Void', 'Cancelled') THEN 'Overdue'::invoice_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_payment_insert
  AFTER INSERT ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payment_balance();

CREATE TRIGGER trigger_update_invoice_payment_update
  AFTER UPDATE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payment_balance();

CREATE TRIGGER trigger_update_invoice_payment_delete
  AFTER DELETE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payment_balance();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order_id ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_quickbooks_id ON invoices(quickbooks_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

-- View for invoice summary with customer info
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  i.id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.status,
  i.total_amount,
  i.amount_paid,
  i.balance_due,
  i.bill_to_name,
  c.customer_number,
  c.name as customer_name,
  c.email as customer_email,
  w.wo_number,
  w.scheduled_date as work_order_date,
  i.quickbooks_id,
  i.sync_status,
  i.created_at,
  i.updated_at,
  CASE
    WHEN i.status = 'Paid' THEN 'Paid'
    WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('Paid', 'Void', 'Cancelled') THEN 'Overdue'
    ELSE i.status::TEXT
  END as display_status
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
LEFT JOIN work_orders w ON i.work_order_id = w.id
ORDER BY i.created_at DESC;

COMMENT ON TABLE invoices IS 'Main invoices table with QuickBooks integration support';
COMMENT ON TABLE invoice_line_items IS 'Individual line items for each invoice';
COMMENT ON TABLE invoice_payments IS 'Payment records for invoices';
COMMENT ON COLUMN invoices.quickbooks_id IS 'QuickBooks Online entity ID for sync';
COMMENT ON COLUMN invoices.quickbooks_sync_token IS 'QuickBooks sync token for optimistic locking';
