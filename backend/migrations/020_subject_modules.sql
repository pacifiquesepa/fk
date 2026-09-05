CREATE TABLE IF NOT EXISTS subject_modules (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  subject_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_subject_modules_subject (subject_id),
  KEY idx_subject_modules_teacher (teacher_id),
  CONSTRAINT fk_subject_modules_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_subject_modules_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subject_module_notes (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  subject_id INT UNSIGNED NOT NULL,
  module_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  header TEXT NOT NULL,
  file_url VARCHAR(255) NULL,
  mime_type VARCHAR(120) NULL,
  file_size INT UNSIGNED NULL,
  note_type VARCHAR(30) NOT NULL DEFAULT 'note',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_subject_module_notes_subject (subject_id),
  KEY idx_subject_module_notes_module (module_id),
  KEY idx_subject_module_notes_teacher (teacher_id),
  CONSTRAINT fk_subject_module_notes_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_subject_module_notes_module FOREIGN KEY (module_id) REFERENCES subject_modules(id) ON DELETE CASCADE,
  CONSTRAINT fk_subject_module_notes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);
