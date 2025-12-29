-- Migration: Add queue_permissions table
-- Description: Enables role-based access control for work order queues

CREATE TABLE IF NOT EXISTS queue_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  queue_id INTEGER NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_queue_perm_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_queue_perm_queue FOREIGN KEY (queue_id)
    REFERENCES work_order_queues(id) ON DELETE CASCADE,

  -- Unique constraint to prevent duplicate permissions
  CONSTRAINT unique_user_queue UNIQUE (user_id, queue_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_queue_permissions_user ON queue_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_permissions_queue ON queue_permissions(queue_id);

COMMENT ON TABLE queue_permissions IS 'User permissions for viewing specific work order queues';
COMMENT ON COLUMN queue_permissions.can_view IS 'Whether the user can view this queue';
