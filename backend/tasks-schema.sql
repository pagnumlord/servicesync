-- ============================================
-- ServiceSync Internal Task Management
-- ============================================
-- For managing company internal tasks separate from customer work orders

-- Task categories
CREATE TYPE task_category AS ENUM (
  'Administrative',
  'Maintenance',
  'Follow-up',
  'Inventory',
  'Training',
  'Other'
);

-- Task priorities
CREATE TYPE task_priority AS ENUM (
  'Low',
  'Medium',
  'High',
  'Urgent'
);

-- Task statuses
CREATE TYPE task_status AS ENUM (
  'Pending',
  'In Progress',
  'Completed',
  'Cancelled'
);

-- Main tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category task_category NOT NULL DEFAULT 'Other',
  priority task_priority NOT NULL DEFAULT 'Medium',
  status task_status NOT NULL DEFAULT 'Pending',

  -- Assignment
  assigned_to_id INTEGER,
  assigned_to_name VARCHAR(255), -- Denormalized for quick display

  -- Dates
  due_date DATE,
  completed_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  created_by INTEGER,
  notes TEXT,

  CONSTRAINT fk_task_assigned_to FOREIGN KEY (assigned_to_id)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_created_by FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_timestamp
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_timestamp();

-- Auto-set completed_date when status changes to Completed
CREATE OR REPLACE FUNCTION set_task_completed_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
    NEW.completed_date = NOW();
  ELSIF NEW.status != 'Completed' THEN
    NEW.completed_date = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_task_completed_date
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_task_completed_date();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Active tasks (not completed or cancelled)
CREATE OR REPLACE VIEW active_tasks AS
SELECT
  t.*,
  u.username as created_by_name,
  CASE
    WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.status NOT IN ('Completed', 'Cancelled')
    THEN TRUE
    ELSE FALSE
  END as is_overdue,
  CASE
    WHEN t.due_date IS NOT NULL AND t.due_date <= CURRENT_DATE + INTERVAL '3 days' AND t.status NOT IN ('Completed', 'Cancelled')
    THEN TRUE
    ELSE FALSE
  END as is_due_soon
FROM tasks t
LEFT JOIN users u ON t.created_by = u.id
WHERE t.status NOT IN ('Completed', 'Cancelled')
ORDER BY
  CASE t.priority
    WHEN 'Urgent' THEN 1
    WHEN 'High' THEN 2
    WHEN 'Medium' THEN 3
    WHEN 'Low' THEN 4
  END,
  t.due_date ASC NULLS LAST,
  t.created_at DESC;

-- View: Task statistics
CREATE OR REPLACE VIEW task_stats AS
SELECT
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'Pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_count,
  COUNT(*) FILTER (WHERE status = 'Completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled_count,
  COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE AND status NOT IN ('Completed', 'Cancelled')) as overdue_count,
  COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date <= CURRENT_DATE + INTERVAL '3 days' AND status NOT IN ('Completed', 'Cancelled')) as due_soon_count,
  COUNT(*) FILTER (WHERE priority = 'Urgent' AND status NOT IN ('Completed', 'Cancelled')) as urgent_count,
  COUNT(*) FILTER (WHERE priority = 'High' AND status NOT IN ('Completed', 'Cancelled')) as high_priority_count
FROM tasks;

-- ============================================
-- SEED DATA (Sample tasks)
-- ============================================

INSERT INTO tasks (
  title,
  description,
  category,
  priority,
  status,
  assigned_to_name,
  due_date,
  notes
) VALUES
  (
    'Schedule van #3 oil change',
    'Van is due for 5000 mile oil change and inspection',
    'Maintenance',
    'High',
    'Pending',
    'Karsten Allen',
    CURRENT_DATE + INTERVAL '2 days',
    'Use preferred mechanic at Main Street Auto'
  ),
  (
    'Follow up with Johnson Industries quote',
    'Called about HVAC installation - quote expires next week',
    'Follow-up',
    'Medium',
    'Pending',
    NULL,
    CURRENT_DATE + INTERVAL '1 day',
    'Quote #Q-2025-0123'
  ),
  (
    'Order new uniforms for technicians',
    '3 new hires need uniforms - sizes: L, XL, M',
    'Administrative',
    'Low',
    'In Progress',
    'Office Manager',
    CURRENT_DATE + INTERVAL '4 days',
    'Order from Uniforms Plus'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE tasks IS 'Internal company task management (separate from customer work orders)';
COMMENT ON COLUMN tasks.category IS 'Task category: Administrative, Maintenance, Follow-up, Inventory, Training, Other';
COMMENT ON COLUMN tasks.priority IS 'Task priority: Low, Medium, High, Urgent';
COMMENT ON COLUMN tasks.status IS 'Task status: Pending, In Progress, Completed, Cancelled';
COMMENT ON COLUMN tasks.assigned_to_name IS 'Denormalized name for quick display without join';
