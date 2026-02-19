-- ============================================================
-- ServiceSync: Pricebook, Estimates, and Invoices Schema
-- ============================================================

-- ============================================================
-- PRICEBOOK
-- ============================================================

CREATE TABLE IF NOT EXISTS pricebook_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(7),
  icon        VARCHAR(50),
  is_active   BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricebook_items (
  id                SERIAL PRIMARY KEY,
  category_id       INTEGER REFERENCES pricebook_categories(id) ON DELETE SET NULL,
  item_code         VARCHAR(50) UNIQUE,
  name              VARCHAR(200) NOT NULL,
  description       TEXT,
  item_type         VARCHAR(50) DEFAULT 'service' CHECK (item_type IN ('service','labor','part','material','equipment','misc')),
  unit_of_measure   VARCHAR(50) DEFAULT 'each',
  unit_cost         DECIMAL(10,2) DEFAULT 0,
  unit_price        DECIMAL(10,2) DEFAULT 0,
  markup_percent    DECIMAL(5,2),
  is_taxable        BOOLEAN DEFAULT TRUE,
  is_active         BOOLEAN DEFAULT TRUE,
  manufacturer      VARCHAR(100),
  part_number       VARCHAR(100),
  quickbooks_item_id VARCHAR(100),
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricebook_items_category ON pricebook_items(category_id);
CREATE INDEX IF NOT EXISTS idx_pricebook_items_type    ON pricebook_items(item_type);
CREATE INDEX IF NOT EXISTS idx_pricebook_items_active  ON pricebook_items(is_active);

-- Seed default categories
INSERT INTO pricebook_categories (name, description, color, display_order) VALUES
  ('Labor',             'Labor and service work',            '#3B82F6', 1),
  ('Refrigerants',      'Refrigerant charges',               '#10B981', 2),
  ('Parts & Materials', 'Replacement parts and materials',   '#F59E0B', 3),
  ('Equipment',         'Equipment and major components',    '#8B5CF6', 4),
  ('Service Calls',     'Standard service call charges',     '#EF4444', 5),
  ('Miscellaneous',     'Other charges',                     '#6B7280', 6)
ON CONFLICT DO NOTHING;

-- Seed default pricebook items
INSERT INTO pricebook_items (category_id, item_code, name, item_type, unit_of_measure, unit_cost, unit_price, is_taxable) VALUES
  ((SELECT id FROM pricebook_categories WHERE name='Labor'),          'LAB-RT',   'Regular Time Labor',         'labor',   'hour',  80.00, 120.00, FALSE),
  ((SELECT id FROM pricebook_categories WHERE name='Labor'),          'LAB-OT',   'Overtime Labor',             'labor',   'hour', 120.00, 180.00, FALSE),
  ((SELECT id FROM pricebook_categories WHERE name='Labor'),          'LAB-AH',   'After Hours Labor',          'labor',   'hour', 140.00, 200.00, FALSE),
  ((SELECT id FROM pricebook_categories WHERE name='Labor'),          'LAB-HLP',  'Helper Labor',               'labor',   'hour',  60.00, 100.00, FALSE),
  ((SELECT id FROM pricebook_categories WHERE name='Service Calls'),  'SVC-STD',  'Standard Service Call',      'service', 'each',   0.00,  85.00, FALSE),
  ((SELECT id FROM pricebook_categories WHERE name='Service Calls'),  'SVC-EMRG', 'Emergency Service Call',     'service', 'each',   0.00, 150.00, FALSE),
  ((SELECT id FROM pricebook_categories WHERE name='Refrigerants'),   'REF-410A', 'R-410A Refrigerant',         'part',    'lb',    18.00,  45.00, TRUE),
  ((SELECT id FROM pricebook_categories WHERE name='Refrigerants'),   'REF-22',   'R-22 Refrigerant',           'part',    'lb',    45.00,  95.00, TRUE),
  ((SELECT id FROM pricebook_categories WHERE name='Refrigerants'),   'REF-404A', 'R-404A Refrigerant',         'part',    'lb',    20.00,  48.00, TRUE),
  ((SELECT id FROM pricebook_categories WHERE name='Miscellaneous'),  'MISC-TRIP','Trip Charge',                'service', 'each',   0.00,  65.00, FALSE),
  ((SELECT id FROM pricebook_categories WHERE name='Miscellaneous'),  'MISC-DIAG','Diagnostic Fee',             'service', 'each',  25.00,  75.00, FALSE)
ON CONFLICT (item_code) DO NOTHING;

-- ============================================================
-- ESTIMATES
-- ============================================================

CREATE TABLE IF NOT EXISTS estimates (
  id               SERIAL PRIMARY KEY,
  estimate_number  VARCHAR(50) UNIQUE,
  customer_id      INTEGER NOT NULL REFERENCES customers(id),
  work_order_id    INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  assigned_tech_id INTEGER REFERENCES technicians(id) ON DELETE SET NULL,
  status           VARCHAR(50) DEFAULT 'draft'
                   CHECK (status IN ('draft','sent','viewed','approved','rejected','expired','converted')),
  title            VARCHAR(200),
  description      TEXT,
  valid_until      DATE,
  subtotal         DECIMAL(10,2) DEFAULT 0,
  tax_rate         DECIMAL(5,2)  DEFAULT 0,
  tax_amount       DECIMAL(10,2) DEFAULT 0,
  discount_amount  DECIMAL(10,2) DEFAULT 0,
  total            DECIMAL(10,2) DEFAULT 0,
  notes            TEXT,
  internal_notes   TEXT,
  terms            TEXT DEFAULT 'This estimate is valid for 30 days.',
  sent_at          TIMESTAMP,
  viewed_at        TIMESTAMP,
  approved_at      TIMESTAMP,
  rejected_at      TIMESTAMP,
  converted_at     TIMESTAMP,
  converted_wo_id  INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  created_by       INTEGER,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estimate_line_items (
  id                SERIAL PRIMARY KEY,
  estimate_id       INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  pricebook_item_id INTEGER REFERENCES pricebook_items(id) ON DELETE SET NULL,
  sort_order        INTEGER DEFAULT 0,
  item_type         VARCHAR(50) DEFAULT 'service',
  description       TEXT NOT NULL,
  quantity          DECIMAL(10,2) DEFAULT 1,
  unit_of_measure   VARCHAR(50) DEFAULT 'each',
  unit_cost         DECIMAL(10,2) DEFAULT 0,
  unit_price        DECIMAL(10,2) DEFAULT 0,
  line_total        DECIMAL(10,2) DEFAULT 0,
  is_taxable        BOOLEAN DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimates_customer    ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status      ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_wo          ON estimates(work_order_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_est    ON estimate_line_items(estimate_id);

-- Auto-generate estimate numbers: EST-000001
CREATE OR REPLACE FUNCTION generate_estimate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estimate_number IS NULL OR NEW.estimate_number = '' THEN
    NEW.estimate_number := 'EST-' || LPAD(NEW.id::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_estimate_number ON estimates;
CREATE TRIGGER set_estimate_number
  BEFORE INSERT ON estimates
  FOR EACH ROW EXECUTE FUNCTION generate_estimate_number();

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id                    SERIAL PRIMARY KEY,
  invoice_number        VARCHAR(50) UNIQUE,
  customer_id           INTEGER NOT NULL REFERENCES customers(id),
  work_order_id         INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
  estimate_id           INTEGER REFERENCES estimates(id) ON DELETE SET NULL,
  status                VARCHAR(50) DEFAULT 'draft'
                        CHECK (status IN ('draft','sent','viewed','paid','partial','overdue','void')),
  title                 VARCHAR(200),
  issue_date            DATE DEFAULT CURRENT_DATE,
  due_date              DATE,
  payment_terms         VARCHAR(50) DEFAULT 'net30',
  subtotal              DECIMAL(10,2) DEFAULT 0,
  tax_rate              DECIMAL(5,2)  DEFAULT 0,
  tax_amount            DECIMAL(10,2) DEFAULT 0,
  discount_amount       DECIMAL(10,2) DEFAULT 0,
  total                 DECIMAL(10,2) DEFAULT 0,
  amount_paid           DECIMAL(10,2) DEFAULT 0,
  balance_due           DECIMAL(10,2) DEFAULT 0,
  notes                 TEXT,
  internal_notes        TEXT,
  terms                 TEXT DEFAULT 'Payment due within 30 days of invoice date.',
  sent_at               TIMESTAMP,
  paid_at               TIMESTAMP,
  voided_at             TIMESTAMP,
  void_reason           TEXT,
  quickbooks_id         VARCHAR(100),
  quickbooks_synced_at  TIMESTAMP,
  teams_notification_sent BOOLEAN DEFAULT FALSE,
  created_by            INTEGER,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id                      SERIAL PRIMARY KEY,
  invoice_id              INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  work_order_line_item_id INTEGER REFERENCES work_order_line_items(id) ON DELETE SET NULL,
  pricebook_item_id       INTEGER REFERENCES pricebook_items(id) ON DELETE SET NULL,
  sort_order              INTEGER DEFAULT 0,
  item_type               VARCHAR(50) DEFAULT 'service',
  description             TEXT NOT NULL,
  quantity                DECIMAL(10,2) DEFAULT 1,
  unit_of_measure         VARCHAR(50) DEFAULT 'each',
  unit_cost               DECIMAL(10,2) DEFAULT 0,
  unit_price              DECIMAL(10,2) DEFAULT 0,
  line_total              DECIMAL(10,2) DEFAULT 0,
  is_taxable              BOOLEAN DEFAULT TRUE,
  notes                   TEXT,
  created_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id               SERIAL PRIMARY KEY,
  invoice_id       INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date     DATE DEFAULT CURRENT_DATE,
  amount           DECIMAL(10,2) NOT NULL,
  payment_method   VARCHAR(50) DEFAULT 'check'
                   CHECK (payment_method IN ('check','cash','credit_card','ach','online','other')),
  reference_number VARCHAR(100),
  notes            TEXT,
  created_by       INTEGER,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer   ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_wo         ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv   ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments    ON invoice_payments(invoice_id);

-- Auto-generate invoice numbers: INV-000001
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || LPAD(NEW.id::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW estimate_summary AS
SELECT
  e.id,
  e.estimate_number,
  e.status,
  e.title,
  e.valid_until,
  e.total,
  e.created_at,
  c.name AS customer_name,
  c.service_city,
  wo.wo_number,
  (SELECT COUNT(*) FROM estimate_line_items WHERE estimate_id = e.id) AS line_item_count
FROM estimates e
JOIN customers c ON e.customer_id = c.id
LEFT JOIN work_orders wo ON e.work_order_id = wo.id;

CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  i.id,
  i.invoice_number,
  i.status,
  i.title,
  i.issue_date,
  i.due_date,
  i.total,
  i.amount_paid,
  i.balance_due,
  i.created_at,
  c.name AS customer_name,
  c.service_city,
  wo.wo_number,
  CASE
    WHEN i.status = 'paid' THEN 'paid'
    WHEN i.status = 'void' THEN 'void'
    WHEN i.due_date < CURRENT_DATE AND i.balance_due > 0 THEN 'overdue'
    ELSE i.status
  END AS display_status,
  GREATEST(0, CURRENT_DATE - i.due_date) AS days_overdue
FROM invoices i
JOIN customers c ON i.customer_id = c.id
LEFT JOIN work_orders wo ON i.work_order_id = wo.id;
