-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  discord VARCHAR(255) NOT NULL,
  position VARCHAR(100) NOT NULL,
  experience TEXT NOT NULL,
  playtime VARCHAR(255) NOT NULL,
  message TEXT,
  answers JSON,
  status ENUM('Under Review', 'Accepted', 'Rejected') DEFAULT 'Under Review',
  submitted_at DATE NOT NULL,
  ip_address VARCHAR(45)
);

-- Application Settings table
CREATE TABLE IF NOT EXISTS application_settings (
  id INT PRIMARY KEY DEFAULT 1,
  is_open BOOLEAN DEFAULT TRUE,
  open_positions JSON,
  start_date DATE,
  end_date DATE
);

-- Admin Users table
CREATE TABLE IF NOT EXISTS admins (
  username VARCHAR(50) PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'superadmin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
  id VARCHAR(36) PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(50) NOT NULL,
  username VARCHAR(50),
  applicant_name VARCHAR(255),
  applicant_role VARCHAR(100),
  application_id VARCHAR(36),
  ip_address VARCHAR(45),
  details TEXT
);

-- Statistics table
CREATE TABLE IF NOT EXISTS statistics (
  id INT PRIMARY KEY DEFAULT 1,
  total_applications INT DEFAULT 0,
  accepted INT DEFAULT 0,
  rejected INT DEFAULT 0,
  under_review INT DEFAULT 0,
  by_position JSON
);

-- Position Questions table
CREATE TABLE IF NOT EXISTS position_questions (
  position VARCHAR(100) PRIMARY KEY,
  questions JSON NOT NULL
);

-- Insert default data if needed
INSERT INTO application_settings (is_open, open_positions, start_date, end_date)
SELECT true, '["Moderator", "Builder", "Developer", "Event Manager"]', '2023-11-01', '2025-12-31'
WHERE NOT EXISTS (SELECT * FROM application_settings WHERE id = 1);

INSERT INTO admins (username, password, role)
SELECT 'admin', 'admin', 'superadmin'
WHERE NOT EXISTS (SELECT * FROM admins WHERE username = 'admin');

INSERT INTO statistics (total_applications, accepted, rejected, under_review, by_position)
SELECT 0, 0, 0, 0, '{}'
WHERE NOT EXISTS (SELECT * FROM statistics WHERE id = 1);