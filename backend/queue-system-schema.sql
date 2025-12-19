-- ServiceSync Queue System Schema
-- Based on Vision's queue architecture

-- ============================================
-- WORK ORDER STATUSES
-- ============================================
-- Update work_orders table to include status
DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'status') THEN
    ALTER TABLE work_orders ADD COLUMN status VARCHAR(50) DEFAULT 'Activated';
  END IF;

  -- Add queue-related columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'current_queue_id') THEN
    ALTER TABLE work_orders ADD COLUMN current_queue_id INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'needs_parts') THEN
    ALTER TABLE work_orders ADD COLUMN needs_parts BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'needs_return_trip') THEN
    ALTER TABLE work_orders ADD COLUMN needs_return_trip BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'parts_ordered_at') THEN
    ALTER TABLE work_orders ADD COLUMN parts_ordered_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'parts_ready_at') THEN
    ALTER TABLE work_orders ADD COLUMN parts_ready_at TIMESTAMP;
  END IF;
END $$;

-- Valid work order statuses
-- Activated: Active work order
-- Suspended: On hold for parts/return
-- Completed: Finished
-- Checked In: Tech is on-site
-- On Hold: Paused
CREATE TYPE work_order_status_enum AS ENUM (
  'Activated',
  'Suspended',
  'Completed',
  'Checked In',
  'On Hold'
);

-- Update status column to use enum (if not already)
-- Note: This requires migration of existing data

-- ============================================
-- QUEUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS work_order_queues (
  id SERIAL PRIMARY KEY,
  queue_name VARCHAR(100) NOT NULL UNIQUE,
  queue_type VARCHAR(50) NOT NULL, -- 'system' or 'custom'
  description TEXT,
  color VARCHAR(20), -- For UI display (hex color)
  icon VARCHAR(50), -- Icon name for UI
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,

  -- Queue behavior settings
  auto_assign BOOLEAN DEFAULT FALSE, -- Auto-move WOs to this queue
  requires_approval BOOLEAN DEFAULT FALSE, -- Requires manual approval to exit

  -- Visibility settings
  visible_to_all BOOLEAN DEFAULT TRUE,
  visible_to_roles TEXT[], -- Array of role names that can see this queue

  CONSTRAINT fk_queue_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- SYSTEM QUEUES (Pre-populated)
-- ============================================
INSERT INTO work_order_queues (queue_name, queue_type, description, color, display_order, auto_assign, requires_approval)
VALUES
  ('Unassigned', 'system', 'New work orders not yet assigned to a technician', '#9CA3AF', 1, TRUE, FALSE),
  ('Needs Parts', 'system', 'Work orders requiring parts to be ordered (includes return trip)', '#F59E0B', 2, FALSE, FALSE),
  ('Needs Return Trip', 'system', 'Work orders needing return visit (NON-parts returns only)', '#8B5CF6', 3, FALSE, FALSE),
  ('Parts Ordered', 'system', 'Parts have been ordered, waiting for delivery', '#FCD34D', 4, FALSE, FALSE),
  ('Ready to Schedule', 'system', 'Parts arrived, ready to schedule return trip', '#10B981', 5, FALSE, FALSE),
  ('Invoice Review', 'system', 'Completed jobs awaiting invoice audit', '#3B82F6', 6, TRUE, FALSE),
  ('Callback', 'system', 'Work orders linked to original job, requires owner approval', '#DC2626', 7, FALSE, TRUE)
ON CONFLICT (queue_name) DO NOTHING;

-- ============================================
-- QUEUE ASSIGNMENTS (Junction Table)
-- ============================================
CREATE TABLE IF NOT EXISTS work_order_queue_assignments (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL,
  queue_id INTEGER NOT NULL,

  -- Assignment metadata
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by INTEGER, -- User who moved it to this queue
  removed_at TIMESTAMP, -- When it left this queue
  removed_by INTEGER, -- User who removed it

  -- Queue position (for ordering within queue)
  queue_position INTEGER,

  -- Notes about why it's in this queue
  assignment_notes TEXT,

  -- Priority within queue
  priority INTEGER DEFAULT 0, -- Higher number = higher priority

  CONSTRAINT fk_woqa_work_order FOREIGN KEY (work_order_id)
    REFERENCES work_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_woqa_queue FOREIGN KEY (queue_id)
    REFERENCES work_order_queues(id) ON DELETE CASCADE,
  CONSTRAINT fk_woqa_assigned_by FOREIGN KEY (assigned_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_woqa_removed_by FOREIGN KEY (removed_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Index for fast queue lookups
CREATE INDEX IF NOT EXISTS idx_woqa_work_order ON work_order_queue_assignments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_woqa_queue ON work_order_queue_assignments(queue_id);
CREATE INDEX IF NOT EXISTS idx_woqa_active ON work_order_queue_assignments(queue_id) WHERE removed_at IS NULL;

-- ============================================
-- QUEUE HISTORY (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS work_order_queue_history (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL,
  from_queue_id INTEGER,
  to_queue_id INTEGER,
  moved_at TIMESTAMP DEFAULT NOW(),
  moved_by INTEGER,
  move_reason TEXT,
  automatic BOOLEAN DEFAULT FALSE, -- Was this an automatic move?

  CONSTRAINT fk_woqh_work_order FOREIGN KEY (work_order_id)
    REFERENCES work_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_woqh_from_queue FOREIGN KEY (from_queue_id)
    REFERENCES work_order_queues(id) ON DELETE SET NULL,
  CONSTRAINT fk_woqh_to_queue FOREIGN KEY (to_queue_id)
    REFERENCES work_order_queues(id) ON DELETE SET NULL,
  CONSTRAINT fk_woqh_moved_by FOREIGN KEY (moved_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Index for history lookups
CREATE INDEX IF NOT EXISTS idx_woqh_work_order ON work_order_queue_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_woqh_moved_at ON work_order_queue_history(moved_at);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get work order's current queue
CREATE OR REPLACE FUNCTION get_work_order_current_queue(wo_id INTEGER)
RETURNS TABLE (
  queue_id INTEGER,
  queue_name VARCHAR(100),
  queue_type VARCHAR(50),
  assigned_at TIMESTAMP,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.queue_name,
    q.queue_type,
    qa.assigned_at,
    qa.priority
  FROM work_order_queue_assignments qa
  JOIN work_order_queues q ON qa.queue_id = q.id
  WHERE qa.work_order_id = wo_id
    AND qa.removed_at IS NULL
  ORDER BY qa.assigned_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to move work order to queue
CREATE OR REPLACE FUNCTION move_work_order_to_queue(
  wo_id INTEGER,
  new_queue_name VARCHAR(100),
  user_id INTEGER DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  is_automatic BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  old_queue_id INTEGER;
  new_queue_id INTEGER;
  assignment_id INTEGER;
BEGIN
  -- Get current queue
  SELECT qa.queue_id INTO old_queue_id
  FROM work_order_queue_assignments qa
  WHERE qa.work_order_id = wo_id AND qa.removed_at IS NULL
  ORDER BY qa.assigned_at DESC
  LIMIT 1;

  -- Get new queue ID
  SELECT id INTO new_queue_id
  FROM work_order_queues
  WHERE queue_name = new_queue_name AND is_active = TRUE;

  IF new_queue_id IS NULL THEN
    RAISE EXCEPTION 'Queue "%" not found or inactive', new_queue_name;
  END IF;

  -- Don't move if already in this queue
  IF old_queue_id = new_queue_id THEN
    RETURN FALSE;
  END IF;

  -- Remove from old queue
  IF old_queue_id IS NOT NULL THEN
    UPDATE work_order_queue_assignments
    SET removed_at = NOW(), removed_by = user_id
    WHERE work_order_id = wo_id AND queue_id = old_queue_id AND removed_at IS NULL;
  END IF;

  -- Add to new queue
  INSERT INTO work_order_queue_assignments (
    work_order_id, queue_id, assigned_by, assignment_notes
  ) VALUES (
    wo_id, new_queue_id, user_id, reason
  ) RETURNING id INTO assignment_id;

  -- Update work order's current_queue_id
  UPDATE work_orders
  SET current_queue_id = new_queue_id
  WHERE id = wo_id;

  -- Log to history
  INSERT INTO work_order_queue_history (
    work_order_id, from_queue_id, to_queue_id, moved_by, move_reason, automatic
  ) VALUES (
    wo_id, old_queue_id, new_queue_id, user_id, reason, is_automatic
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to handle checkout queue routing
CREATE OR REPLACE FUNCTION route_work_order_on_checkout(
  wo_id INTEGER,
  needs_parts_flag BOOLEAN,
  needs_return_flag BOOLEAN,
  user_id INTEGER DEFAULT NULL
)
RETURNS VARCHAR(100) AS $$
DECLARE
  target_queue VARCHAR(100);
BEGIN
  -- Update work order flags
  UPDATE work_orders
  SET needs_parts = needs_parts_flag,
      needs_return_trip = needs_return_flag
  WHERE id = wo_id;

  -- Determine target queue based on checkout answers
  IF needs_parts_flag THEN
    -- Needs parts implies return trip too
    target_queue := 'Needs Parts';
  ELSIF needs_return_flag THEN
    -- Return trip but NOT for parts
    target_queue := 'Needs Return Trip';
  ELSE
    -- No parts, no return -> ready for invoice
    target_queue := 'Invoice Review';
  END IF;

  -- Move to appropriate queue
  PERFORM move_work_order_to_queue(
    wo_id,
    target_queue,
    user_id,
    'Automatic routing from checkout',
    TRUE
  );

  RETURN target_queue;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Work orders by queue
CREATE OR REPLACE VIEW work_orders_by_queue AS
SELECT
  q.id AS queue_id,
  q.queue_name,
  q.queue_type,
  q.color AS queue_color,
  wo.id AS work_order_id,
  wo.work_order_number,
  wo.customer_id,
  wo.status,
  wo.created_at,
  wo.scheduled_date,
  wo.technician_id,
  qa.assigned_at AS queue_assigned_at,
  qa.priority AS queue_priority,
  qa.assignment_notes
FROM work_order_queues q
LEFT JOIN work_order_queue_assignments qa ON q.id = qa.queue_id AND qa.removed_at IS NULL
LEFT JOIN work_orders wo ON qa.work_order_id = wo.id
WHERE q.is_active = TRUE
ORDER BY q.display_order, qa.priority DESC, qa.assigned_at ASC;

-- View: Queue summary with counts
CREATE OR REPLACE VIEW queue_summary AS
SELECT
  q.id,
  q.queue_name,
  q.queue_type,
  q.color,
  q.display_order,
  COUNT(qa.id) AS work_order_count,
  COUNT(qa.id) FILTER (WHERE qa.priority > 0) AS priority_count
FROM work_order_queues q
LEFT JOIN work_order_queue_assignments qa ON q.id = qa.queue_id AND qa.removed_at IS NULL
WHERE q.is_active = TRUE
GROUP BY q.id, q.queue_name, q.queue_type, q.color, q.display_order
ORDER BY q.display_order;

-- ============================================
-- GRANTS (adjust as needed for your user)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

COMMENT ON TABLE work_order_queues IS 'Defines all work order queues (system and custom)';
COMMENT ON TABLE work_order_queue_assignments IS 'Tracks which work orders are in which queues';
COMMENT ON TABLE work_order_queue_history IS 'Audit trail of work order queue movements';
COMMENT ON FUNCTION move_work_order_to_queue IS 'Moves a work order from one queue to another';
COMMENT ON FUNCTION route_work_order_on_checkout IS 'Automatically routes work order to correct queue based on checkout answers';
