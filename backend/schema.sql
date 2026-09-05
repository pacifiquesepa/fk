CREATE DATABASE IF NOT EXISTS fkams CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fkams;

CREATE TABLE users (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  username VARCHAR(60) NOT NULL UNIQUE,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  photo_key VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','dos','teacher','student','parent','accountant','librarian') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE otp_challenges (
  id CHAR(36) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  code_hash CHAR(64) NOT NULL,
  channel ENUM('email','sms') NOT NULL,
  destination_mask VARCHAR(190) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  consumed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX otp_user_active (user_id, consumed_at, expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE classes (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL UNIQUE,
  academic_year VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE subjects (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
  desired_class VARCHAR(80) NOT NULL,
  village VARCHAR(80) NULL,
CREATE TABLE students (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NULL UNIQUE,
  admission_number VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  photo_key VARCHAR(255) NULL,
  gender ENUM('male','female','other') NOT NULL,
  birthday DATE NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  class_name VARCHAR(80) NOT NULL,
  date_of_birth DATE NULL,
    (applicant_name, applicant_photo_key, mother_name, mother_phone, father_name, father_phone, parent_phone, parent_email, province, district, sector, cell, village, desired_class, gender, birthday, previous_school, result_slip_key, report_key, academic_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.body.applicantName.trim(), fileUrl(files.applicantPhoto?.[0]), req.body.motherName?.trim() || null, req.body.motherPhone?.trim() || null, req.body.fatherName?.trim() || null, req.body.fatherPhone?.trim() || null, parentPhone || '', parentEmail, req.body.province?.trim() || null, req.body.district?.trim() || null, req.body.sector?.trim() || null, req.body.cell?.trim() || null, req.body.village?.trim() || null, req.body.desiredClass.trim(), req.body.gender || null, req.body.birthday || null, req.body.previousSchool?.trim() || null, req.body.resultSlipKey?.trim() || null, fileUrl(files.report?.[0]), currentYear.name]);
  qr_token CHAR(36) NOT NULL UNIQUE,
  conduct_score TINYINT UNSIGNED NOT NULL DEFAULT 100,
  conduct_updated_at TIMESTAMP NULL DEFAULT NULL,
  status ENUM('active','inactive','graduated') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE student_classes (
  student_id INT UNSIGNED NOT NULL,
  class_id INT UNSIGNED NOT NULL,
  enrolled_at DATE NOT NULL,
  PRIMARY KEY (student_id, class_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE teacher_assignments (
  teacher_id INT UNSIGNED NOT NULL,
  class_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (teacher_id, class_id, subject_id),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE parent_students (
  parent_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  relationship VARCHAR(40) NOT NULL,
  PRIMARY KEY (parent_id, student_id),
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE applications (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  applicant_name VARCHAR(120) NOT NULL,
  applicant_photo_key VARCHAR(255) NULL,
  mother_name VARCHAR(120) NULL,
  mother_phone VARCHAR(30) NULL,
  father_name VARCHAR(120) NULL,
  father_phone VARCHAR(30) NULL,
  parent_phone VARCHAR(30) NOT NULL,
  province VARCHAR(80) NULL,
  district VARCHAR(80) NULL,
  sector VARCHAR(80) NULL,
  cell VARCHAR(80) NULL,
  desired_class VARCHAR(80) NOT NULL,
  gender ENUM('male','female','other') NULL,
  birthday DATE NULL,
  previous_school VARCHAR(160) NULL,
  result_slip_key VARCHAR(255) NULL,
  report_key VARCHAR(255) NULL,
  academic_year VARCHAR(20) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  approved_at DATETIME NULL,
  reviewer_comment TEXT NULL,
  approved_student_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present','absent','late','excused') NOT NULL,
  comment TEXT NULL,
  marked_by INT UNSIGNED NOT NULL,
  score_deduction TINYINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY student_day (student_id, attendance_date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id)
);

CREATE TABLE fees (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference VARCHAR(80) NOT NULL UNIQUE,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE notices (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  audience ENUM('all','teachers','parents','students') NOT NULL DEFAULT 'all',
  published_by INT UNSIGNED NOT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (published_by) REFERENCES users(id)
);

CREATE TABLE tests (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  class_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE test_questions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  test_id INT UNSIGNED NOT NULL,
  question_order SMALLINT UNSIGNED NOT NULL,
  question_type ENUM('choice','fill','match') NOT NULL,
  prompt TEXT NOT NULL,
  options_json JSON NULL,
  answer_json JSON NOT NULL,
  points DECIMAL(6,2) NOT NULL DEFAULT 1,
  UNIQUE KEY test_order (test_id, question_order),
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

CREATE TABLE test_attempts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  test_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  score DECIMAL(7,2) NULL,
  status ENUM('in_progress','submitted','expired') NOT NULL DEFAULT 'in_progress',
  UNIQUE KEY one_attempt (test_id, student_id),
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE grades (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  assessment_name VARCHAR(120) NOT NULL,
  score DECIMAL(7,2) NOT NULL,
  max_score DECIMAL(7,2) NOT NULL,
  recorded_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE TABLE timetable_entries (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  class_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  room VARCHAR(80) NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE teacher_profiles (
  user_id INT UNSIGNED PRIMARY KEY,
  employee_number VARCHAR(40) NOT NULL UNIQUE,
  qr_token CHAR(36) NOT NULL UNIQUE,
  national_id VARCHAR(40) NULL UNIQUE,
  contract_type ENUM('permanent','temporary','part_time') NOT NULL DEFAULT 'permanent',
  contract_start DATE NULL,
  contract_end DATE NULL,
  salary DECIMAL(12,2) NULL,
  gender ENUM('male','female','other') NULL,
  birthday DATE NULL,
  diploma_key VARCHAR(255) NULL,
  subject_or_module VARCHAR(160) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE staff_attendance (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present','absent','late','leave') NOT NULL,
  marked_by INT UNSIGNED NOT NULL,
  UNIQUE KEY staff_day (user_id, attendance_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id)
);

CREATE TABLE leave_requests (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  leave_type ENUM('annual','sick','maternity','personal','other') NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT UNSIGNED NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE payroll_records (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  period_month DATE NOT NULL,
  gross_amount DECIMAL(12,2) NOT NULL,
  deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  status ENUM('draft','approved','paid') NOT NULL DEFAULT 'draft',
  approved_by INT UNSIGNED NULL,
  UNIQUE KEY staff_period (user_id, period_month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE invoices (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  invoice_number VARCHAR(60) NOT NULL UNIQUE,
  description VARCHAR(180) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('unpaid','partially_paid','paid','overdue') NOT NULL DEFAULT 'unpaid',
  created_by INT UNSIGNED NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE expenses (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(180) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  spent_at DATE NOT NULL,
  photo_url VARCHAR(500) NULL,
  document_url VARCHAR(500) NULL,
  video_url VARCHAR(500) NULL,
  budget_status ENUM('greater','equal','less') NOT NULL DEFAULT 'less',
  recorded_by INT UNSIGNED NOT NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE TABLE budgets (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  fiscal_year VARCHAR(20) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NULL,
  photo_url VARCHAR(500) NULL,
  document_url VARCHAR(500) NULL,
  status ENUM('draft','approved','closed') NOT NULL DEFAULT 'draft',
  created_by INT UNSIGNED NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE transport_routes (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  bus_number VARCHAR(40) NOT NULL UNIQUE,
  driver_name VARCHAR(120) NOT NULL,
  driver_phone VARCHAR(30) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE student_transport (
  student_id INT UNSIGNED PRIMARY KEY,
  route_id INT UNSIGNED NOT NULL,
  pickup_point VARCHAR(160) NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (route_id) REFERENCES transport_routes(id) ON DELETE CASCADE
);

CREATE TABLE inventory_items (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(140) NOT NULL,
  category VARCHAR(80) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  location VARCHAR(100) NULL,
  updated_by INT UNSIGNED NOT NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE inventory_transactions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  type ENUM('in','out') NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  note VARCHAR(255) NULL,
  moved_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (moved_by) REFERENCES users(id)
);

CREATE TABLE assets (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(140) NOT NULL,
  asset_tag VARCHAR(60) NOT NULL UNIQUE,
  category VARCHAR(80) NOT NULL,
  condition_status ENUM('new','good','repair','retired') NOT NULL DEFAULT 'good',
  location VARCHAR(100) NULL,
  assigned_to INT UNSIGNED NULL,
  acquired_on DATE NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE library_books (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  isbn VARCHAR(30) NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  author VARCHAR(140) NOT NULL,
  subject VARCHAR(100) NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  available_quantity INT UNSIGNED NOT NULL DEFAULT 1,
  shelf VARCHAR(50) NULL,
  created_by INT UNSIGNED NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE library_loans (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  book_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  issued_at DATE NOT NULL,
  due_at DATE NOT NULL,
  returned_at DATE NULL,
  issued_by INT UNSIGNED NOT NULL,
  FOREIGN KEY (book_id) REFERENCES library_books(id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES users(id)
);

CREATE TABLE feeding_records (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  feeding_date DATE NOT NULL,
  served BOOLEAN NOT NULL DEFAULT TRUE,
  meal_type VARCHAR(60) NOT NULL,
  recorded_by INT UNSIGNED NOT NULL,
  UNIQUE KEY student_feeding_day (student_id, feeding_date, meal_type),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE TABLE feeding_stock (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  item_name VARCHAR(120) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit VARCHAR(30) NOT NULL,
  reorder_level DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_by INT UNSIGNED NOT NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE documents (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  document_type ENUM('contract','certificate','letter','policy','report','other') NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  visibility ENUM('admin','dos','staff','parent','student') NOT NULL DEFAULT 'admin',
  uploaded_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE notifications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  recipient_id INT UNSIGNED NOT NULL,
  channel ENUM('in_app','email','sms','whatsapp') NOT NULL DEFAULT 'in_app',
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE homework (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  class_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE behavior_records (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  category ENUM('excellent','good','needs_improvement','discipline') NOT NULL,
  note TEXT NOT NULL,
  recorded_by INT UNSIGNED NOT NULL,
  score_deduction TINYINT UNSIGNED NOT NULL DEFAULT 0,
  score_after TINYINT UNSIGNED NULL,
  attendance_id BIGINT UNSIGNED NULL,
  UNIQUE KEY behavior_attendance (attendance_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);
