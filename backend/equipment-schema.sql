-- ServiceSync Equipment/Unit Database Schema
-- Track equipment units with service history

-- Equipment types enum
CREATE TYPE equipment_type AS ENUM (
  'hvac',
  'refrigeration',
  'boiler',
  'water_heater',
  'furnace',
  'ac_unit',
  'heat_pump',
  'chiller',
  'ductless',
  'other'
);

-- Equipment status enum
CREATE TYPE equipment_status AS ENUM (
  'active',
  'inactive',
  'retired',
  'warranty',
  'pending_install'
);

-- Equipment/Units table
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,

  -- Equipment identification
  equipment_type equipment_type NOT NULL,
  manufacturer VARCHAR(100),
  model_number VARCHAR(100),
  serial_number VARCHAR(100),

  -- Installation details
  install_date DATE,
  warranty_expiration DATE,
  location VARCHAR(200), -- Location at customer site (e.g., "Roof Unit 1", "Basement")

  -- Equipment specifications
  capacity VARCHAR(50), -- e.g., "5 ton", "80,000 BTU"
  refrigerant_type VARCHAR(50),
  voltage VARCHAR(20),
  phase VARCHAR(20), -- Single, Three

  -- Status and notes
  status equipment_status DEFAULT 'active',
  notes TEXT,

  -- Service history summary (updated via triggers)
  last_service_date DATE,
  last_service_wo_id INTEGER,
  total_service_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_equipment_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_equipment_last_wo FOREIGN KEY (last_service_wo_id)
    REFERENCES work_orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_equipment_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Equipment service history (link to work orders)
CREATE TABLE IF NOT EXISTS equipment_service_history (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL,
  work_order_id INTEGER NOT NULL,

  -- Service details
  service_date DATE NOT NULL,
  service_type VARCHAR(100), -- "Maintenance", "Repair", "Install", "Inspection"
  technician_id INTEGER,

  -- Findings and work performed
  findings TEXT,
  work_performed TEXT,
  parts_replaced TEXT,

  -- Next service recommendation
  next_service_due DATE,
  recommendations TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_history_equipment FOREIGN KEY (equipment_id)
    REFERENCES equipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_work_order FOREIGN KEY (work_order_id)
    REFERENCES work_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_technician FOREIGN KEY (technician_id)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_equipment_wo UNIQUE (equipment_id, work_order_id)
);

-- Equipment photos/data tags (link to file attachments)
CREATE TABLE IF NOT EXISTS equipment_photos (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL,
  file_attachment_id INTEGER NOT NULL,
  photo_type VARCHAR(50), -- "data_plate", "installation", "damage", "repair"
  taken_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,

  CONSTRAINT fk_photo_equipment FOREIGN KEY (equipment_id)
    REFERENCES equipment(id) ON DELETE CASCADE,
  CONSTRAINT fk_photo_file FOREIGN KEY (file_attachment_id)
    REFERENCES file_attachments(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_customer ON equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_equipment_serial ON equipment(serial_number);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_history_equipment ON equipment_service_history(equipment_id);
CREATE INDEX IF NOT EXISTS idx_history_work_order ON equipment_service_history(work_order_id);

-- Trigger to update equipment service summary when history is added
CREATE OR REPLACE FUNCTION update_equipment_service_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE equipment
  SET last_service_date = NEW.service_date,
      last_service_wo_id = NEW.work_order_id,
      total_service_count = (
        SELECT COUNT(*) FROM equipment_service_history
        WHERE equipment_id = NEW.equipment_id
      ),
      updated_at = NOW()
  WHERE id = NEW.equipment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_equipment_summary
AFTER INSERT ON equipment_service_history
FOR EACH ROW
EXECUTE FUNCTION update_equipment_service_summary();

-- View: Equipment with customer and last service info
CREATE OR REPLACE VIEW equipment_detail AS
SELECT
  e.id,
  e.customer_id,
  c.customer_name,
  c.phone AS customer_phone,
  e.equipment_type,
  e.manufacturer,
  e.model_number,
  e.serial_number,
  e.install_date,
  e.warranty_expiration,
  e.location,
  e.capacity,
  e.refrigerant_type,
  e.voltage,
  e.phase,
  e.status,
  e.notes,
  e.last_service_date,
  e.last_service_wo_id,
  wo.work_order_number AS last_service_wo_number,
  e.total_service_count,
  CASE
    WHEN e.warranty_expiration IS NOT NULL AND e.warranty_expiration >= CURRENT_DATE
    THEN TRUE ELSE FALSE
  END AS is_under_warranty,
  e.created_at,
  u.username AS created_by_name
FROM equipment e
JOIN customers c ON e.customer_id = c.id
LEFT JOIN work_orders wo ON e.last_service_wo_id = wo.id
LEFT JOIN users u ON e.created_by = u.id
ORDER BY e.created_at DESC;

-- View: Equipment needing service (no service in 365 days)
CREATE OR REPLACE VIEW equipment_needs_service AS
SELECT
  e.*,
  c.customer_name,
  c.phone AS customer_phone,
  CURRENT_DATE - e.last_service_date AS days_since_service
FROM equipment e
JOIN customers c ON e.customer_id = c.id
WHERE e.status = 'active'
  AND (
    e.last_service_date IS NULL
    OR e.last_service_date < CURRENT_DATE - INTERVAL '365 days'
  )
ORDER BY e.last_service_date ASC NULLS FIRST;

-- Function: Get equipment service history
CREATE OR REPLACE FUNCTION get_equipment_service_history(equipment_id_param INTEGER)
RETURNS TABLE (
  service_date DATE,
  work_order_number VARCHAR(50),
  service_type VARCHAR(100),
  technician_name VARCHAR(200),
  work_performed TEXT,
  next_service_due DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.service_date,
    wo.work_order_number,
    h.service_type,
    u.username AS technician_name,
    h.work_performed,
    h.next_service_due
  FROM equipment_service_history h
  JOIN work_orders wo ON h.work_order_id = wo.id
  LEFT JOIN users u ON h.technician_id = u.id
  WHERE h.equipment_id = equipment_id_param
  ORDER BY h.service_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE equipment IS 'Equipment/units tracked for customers with service history';
COMMENT ON TABLE equipment_service_history IS 'Service history for each equipment unit';
COMMENT ON TABLE equipment_photos IS 'Photos and data plate images for equipment';
COMMENT ON COLUMN equipment.serial_number IS 'Equipment serial number from data plate';
COMMENT ON COLUMN equipment.location IS 'Location at customer site (Roof Unit 1, Basement, etc.)';
