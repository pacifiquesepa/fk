-- Migration 007: Extend tests schema to support drag-drop and rearrange question types
-- Adds support for new question types and enhances test tracking

-- Extend question_type enum to support new question types
ALTER TABLE test_questions 
MODIFY COLUMN question_type ENUM('choice', 'fill', 'match', 'drag', 'rearrange') NOT NULL;

-- Add metadata columns for test builder draft support
-- Add columns only when they do not already exist. This makes the migration
-- safe to rerun after a partial execution in phpMyAdmin.
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE tests ADD COLUMN description TEXT NULL COMMENT ''Test description/instructions for students''',
  'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tests' AND column_name = 'description');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE tests ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT TRUE COMMENT ''Flag to indicate if test is still being edited''',
  'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tests' AND column_name = 'is_draft');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE tests ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''Test creation timestamp''',
  'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tests' AND column_name = 'created_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE tests ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''Last update timestamp''',
  'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tests' AND column_name = 'updated_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE test_questions ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT FALSE COMMENT ''Flag to indicate if question is still being edited''',
  'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'test_questions' AND column_name = 'is_draft');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE test_questions ADD INDEX idx_test_order (test_id, question_order)',
  'SELECT 1') FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'test_questions' AND index_name = 'idx_test_order');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create a new table to track test progress in real-time
CREATE TABLE IF NOT EXISTS test_progress (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  test_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_question_index SMALLINT UNSIGNED DEFAULT 0,
  status ENUM('not_started', 'in_progress', 'submitted', 'expired') NOT NULL DEFAULT 'not_started',
  UNIQUE KEY unique_test_student (test_id, student_id),
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_test_status (test_id, status),
  INDEX idx_student_active (student_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create announcement table for test notifications
CREATE TABLE IF NOT EXISTS announcements (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('test_published', 'test_closed', 'grade_available', 'general') NOT NULL DEFAULT 'general',
  related_test_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (related_test_id) REFERENCES tests(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_type_date (type, created_at),
  INDEX idx_test (related_test_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create announcement recipient table to track which users get which announcements
CREATE TABLE IF NOT EXISTS announcement_recipients (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  announcement_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_announcement_user (announcement_id, user_id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
