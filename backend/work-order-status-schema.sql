-- Work Order Status and Assignment Tracking Schema
-- This schema handles work order lifecycle, suspension tracking, and physical visit assignments

-- Add status tracking fields to work_orders table
DO $$
BEGIN
  -- Add status column (Active, Suspended, Complete)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE work_orders
    ADD COLUMN status VARCHAR(50) DEFAULT 'Active' NOT NULL;
  END IF;

  -- Add queue field (separate from DBoard - for workflow tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'queue'
  ) THEN
    ALTER TABLE work_orders
    ADD COLUMN queue VARCHAR(100) DEFAULT NULL;
  END IF;

  -- Add suspension reason (needs_parts, needs_return, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE work_orders
    ADD COLUMN suspension_reason VARCHAR(50) DEFAULT NULL;
  END IF;

  -- Add suspended_date to track when WO was suspended
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'suspended_date'
  ) THEN
    ALTER TABLE work_orders
    ADD COLUMN suspended_date DATE DEFAULT NULL;
  END IF;

  -- Add completed_date to seal WO to final completion date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'completed_date'
  ) THEN
    ALTER TABLE work_orders
    ADD COLUMN completed_date DATE DEFAULT NULL;
  END IF;

  -- Add customer remarks for tracking updates (no 500 char limit like Vision)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'customer_remarks'
  ) THEN
    ALTER TABLE work_orders
    ADD COLUMN customer_remarks TEXT DEFAULT NULL;
  END IF;

END $$;

-- Create work_order_assignments table
-- Tracks only physical on-site visits (NOT carry-over days)
CREATE TABLE IF NOT EXISTS work_order_assignments (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  technician_id INTEGER REFERENCES technicians(id) ON DELETE SET NULL,
  status_after_visit VARCHAR(50) NOT NULL, -- Status after this visit (Active, Suspended, Complete)
  time_slot VARCHAR(50), -- 'First AM', 'Second AM', 'First PM', 'Second PM', 'TBD'
  suspension_reason VARCHAR(50), -- If suspended: 'needs_parts', 'needs_return'
  notes TEXT, -- Tech notes from this visit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Add check-in/check-out columns for physical visit tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_assignments' AND column_name = 'checked_in_at'
  ) THEN
    ALTER TABLE work_order_assignments
    ADD COLUMN checked_in_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_assignments' AND column_name = 'checked_out_at'
  ) THEN
    ALTER TABLE work_order_assignments
    ADD COLUMN checked_out_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_assignments' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE work_order_assignments
    ADD COLUMN duration_minutes INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_assignments' AND column_name = 'final_status'
  ) THEN
    ALTER TABLE work_order_assignments
    ADD COLUMN final_status VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_order_assignments' AND column_name = 'status_notes'
  ) THEN
    ALTER TABLE work_order_assignments
    ADD COLUMN status_notes TEXT;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_queue ON work_orders(queue);
CREATE INDEX IF NOT EXISTS idx_work_orders_suspended_date ON work_orders(suspended_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_completed_date ON work_orders(completed_date);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_wo_id ON work_order_assignments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_date ON work_order_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_tech_id ON work_order_assignments(technician_id);

-- Add composite index for DBoard queries (get all WOs for a tech on a date)
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_tech_date
  ON work_order_assignments(technician_id, assignment_date);

-- Migrate existing status values to new standard
-- Map existing statuses to new status values before adding constraint
UPDATE work_orders
SET status = CASE
  WHEN status IN ('Complete', 'Completed') THEN 'Complete'
  WHEN status = 'Suspended' THEN 'Suspended'
  WHEN status IN ('In Progress', 'Assigned', 'Open', 'Unassigned') THEN 'Active'
  ELSE 'Active'
END
WHERE status IS NOT NULL
  AND status NOT IN ('Active', 'Suspended', 'Complete');

-- Set any NULL statuses to 'Active'
UPDATE work_orders SET status = 'Active' WHERE status IS NULL;

-- Add check constraints
ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS chk_work_orders_status;
ALTER TABLE work_orders
  ADD CONSTRAINT chk_work_orders_status
  CHECK (status IN ('Active', 'Suspended', 'Complete'));

ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS chk_work_orders_suspension_reason;
ALTER TABLE work_orders
  ADD CONSTRAINT chk_work_orders_suspension_reason
  CHECK (suspension_reason IN ('needs_parts', 'needs_return', 'other', NULL));

ALTER TABLE work_order_assignments
  DROP CONSTRAINT IF EXISTS chk_assignments_status;
ALTER TABLE work_order_assignments
  ADD CONSTRAINT chk_assignments_status
  CHECK (status_after_visit IN ('Active', 'Suspended', 'Complete'));

ALTER TABLE work_order_assignments
  DROP CONSTRAINT IF EXISTS chk_assignments_suspension_reason;
ALTER TABLE work_order_assignments
  ADD CONSTRAINT chk_assignments_suspension_reason
  CHECK (suspension_reason IN ('needs_parts', 'needs_return', 'other', NULL));

-- Create helper function to get assignment history for a work order
CREATE OR REPLACE FUNCTION get_work_order_assignment_history(wo_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  work_order_id INTEGER,
  technician_id INTEGER,
  tech_first_name VARCHAR(100),
  tech_last_name VARCHAR(100),
  tech_crew VARCHAR(50),
  tech_van_number VARCHAR(50),
  checked_in_at TIMESTAMP,
  checked_out_at TIMESTAMP,
  final_status VARCHAR(50),
  status_notes TEXT,
  duration_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    woa.id,
    woa.work_order_id,
    woa.technician_id,
    t.first_name,
    t.last_name,
    t.crew,
    t.van_number,
    woa.checked_in_at,
    woa.checked_out_at,
    COALESCE(woa.final_status, woa.status_after_visit) as final_status,
    COALESCE(woa.status_notes, woa.notes) as status_notes,
    woa.duration_minutes
  FROM work_order_assignments woa
  LEFT JOIN technicians t ON woa.technician_id = t.id
  WHERE woa.work_order_id = wo_id
  ORDER BY woa.checked_in_at DESC NULLS LAST, woa.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create helper function to determine if WO should appear on DBoard for a given date
-- Logic:
-- - If Complete: only show on completed_date
-- - If Suspended: show on suspended_date and all days after until status changes
-- - If Active: show on assigned dates
CREATE OR REPLACE FUNCTION should_show_on_dboard(
  wo_status VARCHAR(50),
  wo_suspended_date DATE,
  wo_completed_date DATE,
  check_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
  CASE wo_status
    WHEN 'Complete' THEN
      -- Only show on the completion date
      RETURN wo_completed_date = check_date;
    WHEN 'Suspended' THEN
      -- Show on and after suspension date (carries over daily)
      RETURN wo_suspended_date IS NOT NULL AND check_date >= wo_suspended_date;
    WHEN 'Active' THEN
      -- Show on dates where there's an assignment
      RETURN EXISTS (
        SELECT 1 FROM work_order_assignments
        WHERE work_order_id = wo_id AND assignment_date = check_date
      );
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create view for current work order status with latest assignment info
CREATE OR REPLACE VIEW work_order_status_view AS
SELECT
  wo.id,
  wo.wo_number,
  wo.customer_id,
  wo.status,
  wo.queue,
  wo.suspension_reason,
  wo.suspended_date,
  wo.completed_date,
  wo.customer_remarks,
  wo.scheduled_date,
  wo.scheduled_time_slot as time_slot,
  wo.customer_zone as zone,
  -- Get latest assignment info
  latest_assignment.assignment_date AS last_visit_date,
  latest_assignment.technician_id AS last_tech_id,
  latest_assignment.status_after_visit AS last_visit_status,
  -- Count total visits
  (SELECT COUNT(*) FROM work_order_assignments WHERE work_order_id = wo.id) AS total_visits
FROM work_orders wo
LEFT JOIN LATERAL (
  SELECT
    assignment_date,
    technician_id,
    status_after_visit
  FROM work_order_assignments
  WHERE work_order_id = wo.id
  ORDER BY assignment_date DESC, created_at DESC
  LIMIT 1
) latest_assignment ON true;

-- Add comment documentation
COMMENT ON COLUMN work_orders.status IS 'Work order lifecycle status: Active (in progress), Suspended (needs parts/return), Complete (finished)';
COMMENT ON COLUMN work_orders.queue IS 'Workflow tracking queue (separate from DBoard columns): Needs Parts, Needs Return Trip, etc.';
COMMENT ON COLUMN work_orders.suspension_reason IS 'Why WO was suspended: needs_parts, needs_return, other';
COMMENT ON COLUMN work_orders.suspended_date IS 'Date WO was suspended - used for carry-over logic on DBoard';
COMMENT ON COLUMN work_orders.completed_date IS 'Date WO was completed - seals WO to this date forever';
COMMENT ON COLUMN work_orders.customer_remarks IS 'Customer notes and updates (no character limit)';
COMMENT ON TABLE work_order_assignments IS 'Tracks physical on-site visits only (NOT carry-over days)';
COMMENT ON COLUMN work_order_assignments.status_after_visit IS 'Status set after this visit: Active (continuing), Suspended (needs return), Complete (finished)';
