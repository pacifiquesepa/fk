USE fkams;

CREATE TABLE curriculum_items (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  year_name VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  file_url VARCHAR(500) NULL,
  subject_name VARCHAR(100) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX curriculum_year (year_name)
);