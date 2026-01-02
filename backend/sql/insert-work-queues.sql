-- ============================================================
-- Insert Work Queues for ServiceSync
-- Vision-inspired work queue system
-- ============================================================

-- Clear existing queues if needed (commented out for safety)
-- DELETE FROM work_order_queue_assignments WHERE queue_id IN (SELECT id FROM work_order_queues);
-- DELETE FROM work_order_queue_history WHERE to_queue_id IN (SELECT id FROM work_order_queues) OR from_queue_id IN (SELECT id FROM work_order_queues);
-- DELETE FROM work_order_queues;

-- Insert all work queues with colors and display order
INSERT INTO work_order_queues (queue_name, queue_type, color, display_order) VALUES
  ('Blaine Quoting', 'custom', '#8B5CF6', 1),           -- Purple
  ('Call Backs', 'custom', '#F59E0B', 2),               -- Amber
  ('Invoice Review', 'custom', '#10B981', 3),           -- Green
  ('Jen M Quoting', 'custom', '#EC4899', 4),            -- Pink
  ('Jen M Sent/Sold', 'custom', '#06B6D4', 5),          -- Cyan
  ('Jen W Review/Hold', 'custom', '#6366F1', 6),        -- Indigo
  ('Jerry Follow-Up', 'custom', '#EF4444', 7),          -- Red
  ('Josh Quoting/Working', 'custom', '#3B82F6', 8),     -- Blue
  ('Josh Review', 'custom', '#0EA5E9', 9),              -- Sky Blue
  ('Josh Service Estimates', 'custom', '#14B8A6', 10),  -- Teal
  ('Mikes Follow-up', 'custom', '#F97316', 11),         -- Orange
  ('Needs Parts', 'system', '#DC2626', 12),             -- Dark Red
  ('Needs Return Trip', 'custom', '#7C3AED', 13),       -- Violet
  ('Pending Projects', 'custom', '#A855F7', 14),        -- Purple
  ('PM', 'custom', '#059669', 15),                      -- Emerald
  ('PM Quoting', 'custom', '#0D9488', 16),              -- Teal
  ('PM Scheduling', 'custom', '#06B6D4', 17),           -- Cyan
  ('Rational', 'custom', '#64748B', 18),                -- Slate
  ('RFS Mistake', 'custom', '#DC2626', 19),             -- Red
  ('Warranty Review', 'custom', '#2563EB', 20),         -- Blue
  ('WFU - Jen M', 'custom', '#DB2777', 21)              -- Pink
ON CONFLICT (queue_name) DO UPDATE
  SET
    queue_type = EXCLUDED.queue_type,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order;

-- Verify insertion
SELECT
  id,
  queue_name,
  queue_type,
  color,
  display_order
FROM work_order_queues
ORDER BY display_order;
