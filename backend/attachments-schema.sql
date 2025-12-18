-- Work Order Attachments Schema
-- File attachments with preview support for images

CREATE TABLE IF NOT EXISTS work_order_attachments (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,

  -- File details
  file_name VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),

  -- Categorization
  attachment_type VARCHAR(50) DEFAULT 'general', -- 'photo', 'document', 'invoice', 'general'
  description TEXT,

  -- Permissions
  customer_viewable BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,

  -- Metadata
  uploaded_at TIMESTAMP DEFAULT NOW(),
  uploaded_by_user_id INTEGER,

  CONSTRAINT fk_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_attachment_wo ON work_order_attachments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_attachment_type ON work_order_attachments(attachment_type);
CREATE INDEX IF NOT EXISTS idx_attachment_uploaded ON work_order_attachments(uploaded_at DESC);

COMMENT ON TABLE work_order_attachments IS 'File attachments for work orders with preview support';
