-- Migration 008: keep class subjects separate from teacher assignments
CREATE TABLE IF NOT EXISTS class_subjects (
  class_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (class_id, subject_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO class_subjects (class_id, subject_id)
SELECT DISTINCT class_id, subject_id FROM teacher_assignments;
