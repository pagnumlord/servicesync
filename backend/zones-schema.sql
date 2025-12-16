-- ServiceSync Zones System
-- Comprehensive zone management with geographic boundaries

-- ========================================
-- ZONES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS service_zones (
  id SERIAL PRIMARY KEY,
  zone_code VARCHAR(10) UNIQUE NOT NULL, -- 'A', 'B', 'C', etc.
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL, -- Hex color code #RRGGBB
  description TEXT,

  -- Geographic boundary (polygon as JSON array of coordinates)
  -- Format: [{"lat": 40.42, "lng": -86.89}, {"lat": 40.43, "lng": -86.89}, ...]
  boundary JSONB NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  visible_on_map BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_user_id INTEGER
);

-- Index for zone code lookups
CREATE INDEX IF NOT EXISTS idx_zone_code ON service_zones(zone_code);
CREATE INDEX IF NOT EXISTS idx_zone_active ON service_zones(is_active);

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to check if a point is inside a polygon (zone boundary)
CREATE OR REPLACE FUNCTION point_in_polygon(
  point_lat DECIMAL,
  point_lng DECIMAL,
  polygon JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  vertex JSONB;
  vertex_lat DECIMAL;
  vertex_lng DECIMAL;
  next_lat DECIMAL;
  next_lng DECIMAL;
  inside BOOLEAN := false;
  i INTEGER;
  j INTEGER;
  vertices_count INTEGER;
BEGIN
  vertices_count := jsonb_array_length(polygon);

  IF vertices_count < 3 THEN
    RETURN false;
  END IF;

  j := vertices_count - 1;

  FOR i IN 0..(vertices_count - 1) LOOP
    vertex := polygon->i;
    vertex_lat := (vertex->>'lat')::DECIMAL;
    vertex_lng := (vertex->>'lng')::DECIMAL;

    vertex := polygon->j;
    next_lat := (vertex->>'lat')::DECIMAL;
    next_lng := (vertex->>'lng')::DECIMAL;

    IF ((vertex_lng > point_lng) != (next_lng > point_lng)) AND
       (point_lat < (next_lat - vertex_lat) * (point_lng - vertex_lng) / (next_lng - vertex_lng) + vertex_lat) THEN
      inside := NOT inside;
    END IF;

    j := i;
  END LOOP;

  RETURN inside;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-detect zone for a given lat/lng
CREATE OR REPLACE FUNCTION detect_zone_for_location(
  target_lat DECIMAL,
  target_lng DECIMAL
)
RETURNS VARCHAR(10) AS $$
DECLARE
  zone_record RECORD;
BEGIN
  -- Return NULL if coordinates are missing
  IF target_lat IS NULL OR target_lng IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check each active zone
  FOR zone_record IN
    SELECT zone_code, boundary
    FROM service_zones
    WHERE is_active = true
    ORDER BY zone_code
  LOOP
    IF point_in_polygon(target_lat, target_lng, zone_record.boundary) THEN
      RETURN zone_record.zone_code;
    END IF;
  END LOOP;

  -- No zone found
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGER TO AUTO-UPDATE WORK ORDER ZONES
-- ========================================

-- Add latitude/longitude to work_orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN latitude DECIMAL(10, 7);
    ALTER TABLE work_orders ADD COLUMN longitude DECIMAL(10, 7);
  END IF;
END $$;

-- Function to auto-assign zone when work order location changes
CREATE OR REPLACE FUNCTION auto_assign_work_order_zone()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update zone if latitude/longitude are set
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.customer_zone := detect_zone_for_location(NEW.latitude, NEW.longitude);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_auto_assign_zone ON work_orders;
CREATE TRIGGER trigger_auto_assign_zone
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_work_order_zone();

-- ========================================
-- DEFAULT ZONES (Lafayette, IN area)
-- ========================================

INSERT INTO service_zones (zone_code, name, color, description, boundary) VALUES
('A', 'Zone A - Downtown Lafayette', '#EF4444', 'Downtown Lafayette core business district', '[
  {"lat": 40.4200, "lng": -86.8900},
  {"lat": 40.4300, "lng": -86.8900},
  {"lat": 40.4300, "lng": -86.8700},
  {"lat": 40.4200, "lng": -86.8700}
]'::jsonb),

('B', 'Zone B - West Lafayette', '#3B82F6', 'West Lafayette including Purdue University area', '[
  {"lat": 40.4150, "lng": -86.9200},
  {"lat": 40.4350, "lng": -86.9200},
  {"lat": 40.4350, "lng": -86.9000},
  {"lat": 40.4150, "lng": -86.9000}
]'::jsonb),

('C', 'Zone C - North Lafayette', '#10B981', 'North Lafayette residential and commercial', '[
  {"lat": 40.4350, "lng": -86.8900},
  {"lat": 40.4500, "lng": -86.8900},
  {"lat": 40.4500, "lng": -86.8700},
  {"lat": 40.4350, "lng": -86.8700}
]'::jsonb),

('D', 'Zone D - South Lafayette', '#F59E0B', 'South Lafayette including industrial areas', '[
  {"lat": 40.3950, "lng": -86.8900},
  {"lat": 40.4100, "lng": -86.8900},
  {"lat": 40.4100, "lng": -86.8700},
  {"lat": 40.3950, "lng": -86.8700}
]'::jsonb),

('E', 'Zone E - East Lafayette', '#8B5CF6', 'East Lafayette residential', '[
  {"lat": 40.4150, "lng": -86.8550},
  {"lat": 40.4300, "lng": -86.8550},
  {"lat": 40.4300, "lng": -86.8400},
  {"lat": 40.4150, "lng": -86.8400}
]'::jsonb),

('F', 'Zone F - County', '#EC4899', 'Tippecanoe County surrounding areas', '[
  {"lat": 40.3800, "lng": -86.9500},
  {"lat": 40.4600, "lng": -86.9500},
  {"lat": 40.4600, "lng": -86.8300},
  {"lat": 40.3800, "lng": -86.8300}
]'::jsonb)

ON CONFLICT (zone_code) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  description = EXCLUDED.description,
  boundary = EXCLUDED.boundary,
  updated_at = NOW();

-- ========================================
-- HELPER VIEWS
-- ========================================

-- View to see zone customer counts
CREATE OR REPLACE VIEW zone_statistics AS
SELECT
  sz.zone_code,
  sz.name,
  sz.color,
  COUNT(DISTINCT c.id) as customer_count,
  COUNT(wo.id) as total_work_orders,
  COUNT(CASE WHEN wo.status NOT IN ('Complete', 'Completed', 'Cancelled') THEN 1 END) as open_work_orders
FROM service_zones sz
LEFT JOIN customers c ON c.zone = sz.zone_code
LEFT JOIN work_orders wo ON wo.customer_zone = sz.zone_code
WHERE sz.is_active = true
GROUP BY sz.zone_code, sz.name, sz.color
ORDER BY sz.zone_code;

COMMENT ON TABLE service_zones IS 'Service zones with geographic boundaries for dispatch management';
COMMENT ON FUNCTION detect_zone_for_location IS 'Automatically detects which zone a lat/lng coordinate falls into';
COMMENT ON FUNCTION point_in_polygon IS 'Ray casting algorithm to determine if point is inside polygon';
