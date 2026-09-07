export const CREATE_TABLES_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('MANAGER', 'TEACHER', 'STUDENT', 'CR')),
  department TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK(capacity > 0),
  status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE')),
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS resource_specifications (
  resource_id TEXT PRIMARY KEY,
  system_count INTEGER DEFAULT 0,
  laptop_count INTEGER DEFAULT 0,
  has_projector INTEGER DEFAULT 0,
  has_screen INTEGER DEFAULT 0,
  has_ac INTEGER DEFAULT 0,
  has_internet INTEGER DEFAULT 0,
  has_audio_system INTEGER DEFAULT 0,
  has_microphones INTEGER DEFAULT 0,
  has_smart_board INTEGER DEFAULT 0,
  installed_software TEXT, -- JSON string array
  other_notes TEXT,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL,   -- HH:MM
  class_section TEXT NOT NULL,
  subject TEXT NOT NULL,
  faculty TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  resource_location TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_department TEXT NOT NULL,
  date TEXT NOT NULL,       -- YYYY-MM-DD
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL,   -- HH:MM
  purpose TEXT NOT NULL,
  description TEXT,
  expected_count INTEGER DEFAULT 1,
  required_equipment TEXT,  -- JSON string array
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED')),
  rejection_reason TEXT,
  requested_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL, -- YYYY-MM-DD
  end_date TEXT NOT NULL,   -- YYYY-MM-DD
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL,   -- HH:MM
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('APPROVAL', 'REJECTION', 'REQUEST_CREATED', 'MAINTENANCE', 'SYSTEM')),
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  booking_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata TEXT -- JSON object
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category_id);
CREATE INDEX IF NOT EXISTS idx_timetable_resource_day ON timetable_entries(resource_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_bookings_resource_date ON bookings(resource_id, date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_resource ON maintenance_schedules(resource_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
`;
