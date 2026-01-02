-- ============================================================
-- Disable work order line items totals trigger
-- This trigger tries to update columns that don't exist yet
-- ============================================================

-- Drop the trigger
DROP TRIGGER IF EXISTS wo_line_items_totals ON work_order_line_items;

-- Drop the function
DROP FUNCTION IF EXISTS update_wo_line_totals();

-- Note: If you want to re-enable this trigger in the future,
-- you'll need to add these columns to the work_orders table:
-- ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS total_labor_cost DECIMAL(10,2) DEFAULT 0;
-- ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS total_parts_cost DECIMAL(10,2) DEFAULT 0;
-- ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0;

SELECT 'Trigger disabled successfully' AS result;
