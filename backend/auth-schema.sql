-- ServiceSync Authentication System
-- Complete user management with role-based access control

-- ========================================
-- USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  employee_number VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'dispatcher', 'technician', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  created_by_user_id INTEGER REFERENCES users(id)
);

-- Index for fast login lookups
CREATE INDEX IF NOT EXISTS idx_users_employee_number ON users(employee_number);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ========================================
-- PERMISSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50) -- 'dispatch', 'customers', 'reports', etc.
);

-- ========================================
-- USER PERMISSIONS (Many-to-Many)
-- ========================================
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by_user_id INTEGER REFERENCES users(id),
  PRIMARY KEY (user_id, permission_id)
);

-- ========================================
-- SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  refresh_token VARCHAR(500) UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ========================================
-- AUDIT LOG
-- ========================================
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'failed_login', 'permission_change', etc.
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- DEFAULT PERMISSIONS
-- ========================================
INSERT INTO permissions (name, description, category) VALUES
('dispatch.view', 'View dispatch board', 'dispatch'),
('dispatch.edit', 'Edit work orders on dispatch board', 'dispatch'),
('dispatch.assign', 'Assign work orders to technicians', 'dispatch'),
('dispatch.complete', 'Mark work orders as complete', 'dispatch'),
('customers.view', 'View customer information', 'customers'),
('customers.create', 'Create new customers', 'customers'),
('customers.edit', 'Edit customer information', 'customers'),
('customers.delete', 'Delete customers', 'customers'),
('workorders.view', 'View work orders', 'workorders'),
('workorders.create', 'Create new work orders', 'workorders'),
('workorders.edit', 'Edit work orders', 'workorders'),
('workorders.delete', 'Delete work orders', 'workorders'),
('reports.view', 'View reports', 'reports'),
('reports.export', 'Export reports', 'reports'),
('admin.users', 'Manage user accounts', 'admin'),
('admin.permissions', 'Manage permissions', 'admin'),
('admin.settings', 'Manage system settings', 'admin')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- DEFAULT ADMIN USER
-- ========================================
-- Password for user '22' is '22' (hashed with bcrypt)
-- THIS IS A TEMPORARY PASSWORD - CHANGE IT AFTER FIRST LOGIN!
INSERT INTO users (employee_number, username, password_hash, first_name, last_name, email, role, is_active)
VALUES (
  '22',
  '22',
  '$2b$10$rKqF.8l8yL5f3OvQH0FGweN1d5.LqE4Tc3xNX5R1ZqQxJ0yZqGEHK', -- bcrypt hash of '22'
  'Karsten',
  'Allen',
  'karsten@icumechanical.com',
  'admin',
  true
)
ON CONFLICT (employee_number) DO NOTHING;

-- Grant all permissions to admin user
INSERT INTO user_permissions (user_id, permission_id)
SELECT
  (SELECT id FROM users WHERE employee_number = '22'),
  id
FROM permissions
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to log authentication events
CREATE OR REPLACE FUNCTION log_auth_event(
  p_user_id INTEGER,
  p_action VARCHAR(100),
  p_details JSONB DEFAULT NULL,
  p_ip_address VARCHAR(50) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO auth_audit_log (user_id, action, details, ip_address)
  VALUES (p_user_id, p_action, p_details, p_ip_address);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id INTEGER,
  p_permission_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  -- Admins have all permissions
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin'
  ) INTO has_perm;

  IF has_perm THEN
    RETURN true;
  END IF;

  -- Check specific permission
  SELECT EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id AND p.name = p_permission_name
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE users IS 'System users with authentication credentials';
COMMENT ON TABLE permissions IS 'Available permissions in the system';
COMMENT ON TABLE user_permissions IS 'Maps users to their specific permissions';
COMMENT ON TABLE sessions IS 'Active user sessions with JWT tokens';
COMMENT ON TABLE auth_audit_log IS 'Audit trail of all authentication events';
