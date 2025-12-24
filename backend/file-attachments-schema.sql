-- ServiceSync File Attachments Schema
-- Photo and document management for work orders

-- File categories enum
CREATE TYPE file_category AS ENUM (
  'data_tag',
  'receipt',
  'photo',
  'document',
  'other'
);

-- File attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL,

  -- File details
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100), -- MIME type (image/jpeg, application/pdf, etc.)
  file_size INTEGER, -- Size in bytes
  file_category file_category DEFAULT 'photo',
  file_path VARCHAR(500) NOT NULL, -- Path to file on disk

  -- Metadata
  uploaded_by INTEGER,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,

  -- Optional image metadata
  image_width INTEGER,
  image_height INTEGER,

  CONSTRAINT fk_file_work_order FOREIGN KEY (work_order_id)
    REFERENCES work_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_file_uploaded_by FOREIGN KEY (uploaded_by)
    REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_files_work_order ON file_attachments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON file_attachments(file_category);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON file_attachments(uploaded_at DESC);

-- View for file attachments with user info
CREATE OR REPLACE VIEW file_attachments_detail AS
SELECT
  fa.id,
  fa.work_order_id,
  wo.work_order_number,
  fa.file_name,
  fa.file_type,
  fa.file_size,
  fa.file_category,
  fa.file_path,
  fa.uploaded_by,
  u.username AS uploaded_by_name,
  fa.uploaded_at,
  fa.notes,
  fa.image_width,
  fa.image_height
FROM file_attachments fa
LEFT JOIN work_orders wo ON fa.work_order_id = wo.id
LEFT JOIN users u ON fa.uploaded_by = u.id
ORDER BY fa.uploaded_at DESC;

-- Function to get file stats for a work order
CREATE OR REPLACE FUNCTION get_work_order_file_stats(wo_id INTEGER)
RETURNS TABLE (
  total_files INTEGER,
  total_size BIGINT,
  data_tag_count INTEGER,
  receipt_count INTEGER,
  photo_count INTEGER,
  document_count INTEGER,
  other_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_files,
    COALESCE(SUM(file_size), 0)::BIGINT AS total_size,
    COUNT(*) FILTER (WHERE file_category = 'data_tag')::INTEGER AS data_tag_count,
    COUNT(*) FILTER (WHERE file_category = 'receipt')::INTEGER AS receipt_count,
    COUNT(*) FILTER (WHERE file_category = 'photo')::INTEGER AS photo_count,
    COUNT(*) FILTER (WHERE file_category = 'document')::INTEGER AS document_count,
    COUNT(*) FILTER (WHERE file_category = 'other')::INTEGER AS other_count
  FROM file_attachments
  WHERE work_order_id = wo_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE file_attachments IS 'File attachments for work orders (photos, receipts, documents)';
COMMENT ON COLUMN file_attachments.file_category IS 'Category: data_tag, receipt, photo, document, other';
COMMENT ON FUNCTION get_work_order_file_stats IS 'Get file statistics for a work order';
