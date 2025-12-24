-- Multi-Day Scheduling Support
-- Allows work orders to span multiple days

-- Add fields for multi-day projects
ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS is_multi_day BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS project_start_date DATE,
ADD COLUMN IF NOT EXISTS project_end_date DATE,
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS project_notes TEXT;

-- Index for calendar queries
CREATE INDEX IF NOT EXISTS idx_work_orders_date_range
ON work_orders(project_start_date, project_end_date)
WHERE is_multi_day = TRUE;

-- Function to get work orders for a specific date (includes multi-day)
CREATE OR REPLACE FUNCTION get_work_orders_for_date(target_date DATE)
RETURNS TABLE (
  id INTEGER,
  work_order_number VARCHAR(50),
  customer_id INTEGER,
  customer_name VARCHAR(200),
  scheduled_date TIMESTAMP,
  assigned_technician INTEGER,
  technician_name VARCHAR(200),
  status VARCHAR(50),
  is_multi_day BOOLEAN,
  project_start_date DATE,
  project_end_date DATE,
  problem_description TEXT,
  urgency VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wo.id,
    wo.work_order_number,
    wo.customer_id,
    c.customer_name,
    wo.scheduled_date,
    wo.assigned_technician,
    u.username AS technician_name,
    wo.status,
    COALESCE(wo.is_multi_day, FALSE) AS is_multi_day,
    wo.project_start_date,
    wo.project_end_date,
    wo.problem_description,
    wo.urgency
  FROM work_orders wo
  JOIN customers c ON wo.customer_id = c.id
  LEFT JOIN users u ON wo.assigned_technician = u.id
  WHERE
    -- Single day work orders scheduled for target date
    (wo.is_multi_day = FALSE AND DATE(wo.scheduled_date) = target_date)
    OR
    -- Multi-day work orders that include target date
    (wo.is_multi_day = TRUE AND wo.project_start_date <= target_date AND wo.project_end_date >= target_date)
  ORDER BY wo.scheduled_date, wo.work_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get work orders for a date range (for calendar view)
CREATE OR REPLACE FUNCTION get_work_orders_for_date_range(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  id INTEGER,
  work_order_number VARCHAR(50),
  customer_id INTEGER,
  customer_name VARCHAR(200),
  scheduled_date TIMESTAMP,
  assigned_technician INTEGER,
  technician_name VARCHAR(200),
  status VARCHAR(50),
  is_multi_day BOOLEAN,
  project_start_date DATE,
  project_end_date DATE,
  estimated_hours DECIMAL(6,2),
  problem_description TEXT,
  urgency VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wo.id,
    wo.work_order_number,
    wo.customer_id,
    c.customer_name,
    wo.scheduled_date,
    wo.assigned_technician,
    u.username AS technician_name,
    wo.status,
    COALESCE(wo.is_multi_day, FALSE) AS is_multi_day,
    wo.project_start_date,
    wo.project_end_date,
    wo.estimated_hours,
    wo.problem_description,
    wo.urgency
  FROM work_orders wo
  JOIN customers c ON wo.customer_id = c.id
  LEFT JOIN users u ON wo.assigned_technician = u.id
  WHERE
    -- Single day work orders in range
    (wo.is_multi_day = FALSE AND DATE(wo.scheduled_date) BETWEEN start_date AND end_date)
    OR
    -- Multi-day work orders that overlap with range
    (wo.is_multi_day = TRUE AND
     wo.project_start_date <= end_date AND
     wo.project_end_date >= start_date)
  ORDER BY
    CASE WHEN wo.is_multi_day THEN wo.project_start_date ELSE DATE(wo.scheduled_date) END,
    wo.work_order_number;
END;
$$ LANGUAGE plpgsql;

-- View for upcoming multi-day projects
CREATE OR REPLACE VIEW upcoming_multi_day_projects AS
SELECT
  wo.id,
  wo.work_order_number,
  c.customer_name,
  wo.project_start_date,
  wo.project_end_date,
  wo.project_end_date - wo.project_start_date + 1 AS duration_days,
  wo.estimated_hours,
  u.username AS assigned_technician,
  wo.status,
  wo.problem_description,
  wo.project_notes
FROM work_orders wo
JOIN customers c ON wo.customer_id = c.id
LEFT JOIN users u ON wo.assigned_technician = u.id
WHERE wo.is_multi_day = TRUE
  AND wo.project_end_date >= CURRENT_DATE
  AND wo.status NOT IN ('Completed', 'Cancelled')
ORDER BY wo.project_start_date;

-- Comments
COMMENT ON COLUMN work_orders.is_multi_day IS 'True for projects spanning multiple days';
COMMENT ON COLUMN work_orders.project_start_date IS 'Start date for multi-day projects';
COMMENT ON COLUMN work_orders.project_end_date IS 'End date for multi-day projects';
COMMENT ON COLUMN work_orders.estimated_hours IS 'Estimated total hours for project';
COMMENT ON FUNCTION get_work_orders_for_date IS 'Get all work orders for a specific date (including multi-day)';
COMMENT ON FUNCTION get_work_orders_for_date_range IS 'Get all work orders for a date range (for calendar)';
