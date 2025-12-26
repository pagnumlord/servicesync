-- Queue Permissions Table
-- Manages which users can view which work order queues

CREATE TABLE IF NOT EXISTS queue_permissions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  queue_id INTEGER NOT NULL,
  can_view BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, queue_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_queue_permissions_user ON queue_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_permissions_queue ON queue_permissions(queue_id);

-- Comments
COMMENT ON TABLE queue_permissions IS 'Controls which users can view specific work order queues';
COMMENT ON COLUMN queue_permissions.user_id IS 'ID of the user';
COMMENT ON COLUMN queue_permissions.queue_id IS 'ID of the work order queue';
COMMENT ON COLUMN queue_permissions.can_view IS 'Whether the user can view this queue';
