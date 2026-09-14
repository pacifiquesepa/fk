-- Migration 026: persist DOS report-card term settings
CREATE TABLE IF NOT EXISTS student_report_settings (
  student_id INT UNSIGNED PRIMARY KEY,
  academic_year VARCHAR(80) NULL,
  term VARCHAR(40) NOT NULL DEFAULT 'Term 1',
  updated_by INT UNSIGNED NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
