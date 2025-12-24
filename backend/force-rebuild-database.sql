-- Force Rebuild Database Script
-- This will forcefully disconnect all users and rebuild the database

\echo 'Terminating all connections to servicesync_dev...'

-- Terminate all connections to the database (except this one)
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'servicesync_dev'
  AND pid <> pg_backend_pid();

\echo 'Dropping servicesync_dev database...'
DROP DATABASE IF EXISTS servicesync_dev;

\echo 'Creating fresh servicesync_dev database...'
CREATE DATABASE servicesync_dev;

\echo 'Database rebuilt successfully! Now run init-all-schemas.sql'
