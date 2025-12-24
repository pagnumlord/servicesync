-- Diagnostic Script to Check Current Schema
-- This will show us what columns actually exist in key tables

\echo '=== VENDORS TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendors'
ORDER BY ordinal_position;

\echo ''
\echo '=== WORK_ORDERS TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'work_orders'
ORDER BY ordinal_position;

\echo ''
\echo '=== PURCHASE_ORDERS TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
ORDER BY ordinal_position;

\echo ''
\echo '=== FILE_ATTACHMENTS TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'file_attachments'
ORDER BY ordinal_position;

\echo ''
\echo '=== EQUIPMENT TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipment'
ORDER BY ordinal_position;
