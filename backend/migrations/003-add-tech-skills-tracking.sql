-- Create technician_skills table for manual skill/certification tracking
CREATE TABLE IF NOT EXISTS technician_skills (
  id SERIAL PRIMARY KEY,
  technician_id INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  skill_category VARCHAR(50) NOT NULL, -- 'equipment_type', 'certification', 'specialty'
  skill_name VARCHAR(100) NOT NULL, -- 'Steamer', 'Chiller', 'EPA Certified', etc.
  proficiency_level INTEGER DEFAULT 3 CHECK (proficiency_level BETWEEN 1 AND 5), -- 1-5 star rating
  certified BOOLEAN DEFAULT FALSE,
  certification_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(technician_id, skill_category, skill_name)
);

-- Create technician_performance table for automated performance tracking
CREATE TABLE IF NOT EXISTS technician_performance (
  id SERIAL PRIMARY KEY,
  technician_id INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  equipment_type VARCHAR(100), -- From work order
  job_type VARCHAR(100), -- 'Service Call', 'PM', 'Installation', etc.

  -- Performance metrics
  completion_status VARCHAR(50), -- 'completed', 'completed_with_callback', 'incomplete'
  first_time_fix BOOLEAN DEFAULT TRUE, -- Was it fixed on first visit?
  callback_required BOOLEAN DEFAULT FALSE,

  -- Time metrics
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  efficiency_rating DECIMAL(3,2), -- actual/estimated (lower is better)

  -- Customer satisfaction
  customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
  customer_feedback TEXT,

  -- Revenue metrics
  quoted_amount DECIMAL(10,2),
  final_amount DECIMAL(10,2),
  parts_sold DECIMAL(10,2),

  completed_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(work_order_id, technician_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tech_skills_tech_id ON technician_skills(technician_id);
CREATE INDEX IF NOT EXISTS idx_tech_skills_category ON technician_skills(skill_category, skill_name);
CREATE INDEX IF NOT EXISTS idx_tech_perf_tech_id ON technician_performance(technician_id);
CREATE INDEX IF NOT EXISTS idx_tech_perf_equipment ON technician_performance(equipment_type);
CREATE INDEX IF NOT EXISTS idx_tech_perf_completed ON technician_performance(completed_date);

-- Create view for aggregated tech ratings by equipment type
CREATE OR REPLACE VIEW technician_equipment_ratings AS
SELECT
  tp.technician_id,
  t.first_name,
  t.last_name,
  t.crew,
  tp.equipment_type,
  COUNT(*) as total_jobs,
  AVG(CASE WHEN tp.first_time_fix THEN 1 ELSE 0 END) as first_time_fix_rate,
  AVG(tp.efficiency_rating) as avg_efficiency,
  AVG(tp.customer_rating) as avg_customer_rating,
  -- Calculate overall rating (1-5 stars)
  ROUND(
    (
      (AVG(CASE WHEN tp.first_time_fix THEN 1 ELSE 0 END) * 2) + -- 40% weight
      (1 - LEAST(AVG(tp.efficiency_rating) - 1, 0.5)) + -- 20% weight (efficiency)
      (AVG(COALESCE(tp.customer_rating, 4)) / 5 * 2) -- 40% weight
    ) * 5 / 4
  , 1) as overall_rating
FROM technician_performance tp
JOIN technicians t ON tp.technician_id = t.id
WHERE tp.equipment_type IS NOT NULL
  AND tp.completed_date >= NOW() - INTERVAL '12 months' -- Last 12 months
GROUP BY tp.technician_id, t.first_name, t.last_name, t.crew, tp.equipment_type
HAVING COUNT(*) >= 3; -- Minimum 3 jobs to be rated

-- Add equipment_type column to work_orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'equipment_type'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN equipment_type VARCHAR(100);
    COMMENT ON COLUMN work_orders.equipment_type IS 'Type of equipment being serviced (Steamer, Chiller, Oven, etc.)';
  END IF;
END $$;

-- Add job_type column to work_orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN job_type VARCHAR(100) DEFAULT 'Service Call';
    COMMENT ON COLUMN work_orders.job_type IS 'Type of job (Service Call, PM, Installation, etc.)';
  END IF;
END $$;

COMMENT ON TABLE technician_skills IS 'Manual skill and certification tracking for technicians';
COMMENT ON TABLE technician_performance IS 'Automated performance tracking based on completed work orders';
COMMENT ON VIEW technician_equipment_ratings IS 'Aggregated technician ratings by equipment type for recommendations';
