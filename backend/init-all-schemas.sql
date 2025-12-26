-- ServiceSync Master Schema Initialization
-- Run this to set up all database schemas in the correct order

-- This script applies all schema files in dependency order

\echo 'Starting ServiceSync schema initialization...'

-- 0. Core tables (MUST be first - all other schemas depend on these)
\echo 'Applying base schema (customers, work_orders, technicians)...'
\ir base-schema.sql

-- 1. Base schemas (no dependencies on other tables)
\echo 'Applying zones schema...'
\ir zones-schema.sql

\echo 'Applying auth schema...'
\ir auth-schema.sql

-- 2. Schema additions (depends on base tables)
\echo 'Applying schema additions...'
\ir schema-additions.sql

-- 3. Work order enhancements
\echo 'Applying work order status schema...'
\ir work-order-status-schema.sql

\echo 'Applying queue system schema...'
\ir queue-system-schema.sql

-- 4. Vendor and purchasing
\echo 'Applying purchase order schema...'
\ir purchase-order-schema.sql

-- 5. Inventory management
\echo 'Applying inventory schema...'
\ir inventory-schema.sql

-- 6. File management
\echo 'Applying file attachments schema...'
\ir file-attachments-schema.sql

-- 7. Equipment tracking
\echo 'Applying equipment schema...'
\ir equipment-schema.sql

-- 8. Multi-day scheduling
\echo 'Applying multi-day scheduling schema...'
\ir multi-day-scheduling-schema.sql

-- 9. Invoicing and QuickBooks integration
\echo 'Applying invoicing schema...'
\ir invoicing-schema.sql

\echo 'Schema initialization complete!'
\echo 'You can now start the ServiceSync server.'
