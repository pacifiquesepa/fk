CREATE TABLE IF NOT EXISTS academic_years (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(20) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('planning', 'active', 'closed') NOT NULL DEFAULT 'planning',
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_year_terms (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id INT UNSIGNED NOT NULL,
  term_number TINYINT UNSIGNED NOT NULL,
  name VARCHAR(40) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('upcoming', 'active', 'ended') NOT NULL DEFAULT 'upcoming',
  UNIQUE KEY year_term (academic_year_id, term_number),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
