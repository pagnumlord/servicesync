-- Migration: Add profile_image column to technicians table
-- Description: Enables storing profile photos for technicians

DO $$
BEGIN
  -- Add profile_image column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technicians' AND column_name = 'profile_image'
  ) THEN
    ALTER TABLE technicians
    ADD COLUMN profile_image TEXT;

    COMMENT ON COLUMN technicians.profile_image IS 'URL or path to technician profile photo';
  END IF;

  -- Add latitude column if it doesn't exist (for GPS tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technicians' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE technicians
    ADD COLUMN latitude DECIMAL(10, 7);
  END IF;

  -- Add longitude column if it doesn't exist (for GPS tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technicians' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE technicians
    ADD COLUMN longitude DECIMAL(10, 7);
  END IF;
END $$;

-- Create index for GPS coordinates (for zone detection)
CREATE INDEX IF NOT EXISTS idx_technicians_location ON technicians(latitude, longitude);
