ALTER TABLE users ADD COLUMN IF NOT EXISTS can_report BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_sign BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_order BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_schedule BOOLEAN DEFAULT FALSE;

-- Grant default permissions based on role (optional, but good for migration)
UPDATE users SET can_report = TRUE, can_sign = TRUE WHERE role IN ('radiologist', 'admin');
UPDATE users SET can_report = TRUE WHERE role IN ('doctor');
UPDATE users SET can_schedule = TRUE WHERE role IN ('receptionist', 'admin', 'staff');
UPDATE users SET can_order = TRUE WHERE role IN ('technician', 'doctor', 'admin');
