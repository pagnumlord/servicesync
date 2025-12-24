-- Fix equipment table - add missing equipment_number column
-- Run this to fix the equipment table structure

\echo 'Adding missing equipment_number column to equipment table...'

ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS equipment_number VARCHAR(50) UNIQUE;

\echo 'Equipment table fixed successfully!'
