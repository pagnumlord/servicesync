-- Customer Contacts Schema
-- Stores contact information for people at customer locations

CREATE TABLE IF NOT EXISTS customer_contacts (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Contact Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  title VARCHAR(100),
  role VARCHAR(100),

  -- Contact Methods
  phone VARCHAR(20),
  email VARCHAR(255),
  extension VARCHAR(10),

  -- Preferences
  is_primary BOOLEAN DEFAULT false,
  can_authorize_work BOOLEAN DEFAULT false,
  preferred_contact_method VARCHAR(20) DEFAULT 'phone', -- phone, email, text

  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_is_primary ON customer_contacts(is_primary);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_is_active ON customer_contacts(is_active);

-- Ensure only one primary contact per customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_contacts_unique_primary
ON customer_contacts(customer_id)
WHERE is_primary = true AND is_active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_customer_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_contacts_updated_at_trigger ON customer_contacts;
CREATE TRIGGER customer_contacts_updated_at_trigger
BEFORE UPDATE ON customer_contacts
FOR EACH ROW
EXECUTE FUNCTION update_customer_contacts_updated_at();
