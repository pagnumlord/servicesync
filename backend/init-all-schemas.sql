-- ServiceSync Master Schema Initialization
-- Run this to set up all database schemas in the correct order

-- This script applies all schema files in dependency order

\echo 'Starting ServiceSync schema initialization...'

-- 1. Base schemas (no dependencies)
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

-- 5. File management
\echo 'Applying file attachments schema...'
\ir file-attachments-schema.sql

-- 6. Equipment tracking
\echo 'Applying equipment schema...'
\ir equipment-schema.sql

-- 7. Multi-day scheduling
\echo 'Applying multi-day scheduling schema...'
\ir multi-day-scheduling-schema.sql

\echo 'Schema initialization complete!'
\echo 'You can now start the ServiceSync server.'
