CREATE TABLE IF NOT EXISTS school_messages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  message_type ENUM('announcement','meeting') NOT NULL DEFAULT 'announcement',
  audience_role ENUM('parent','teacher','doc','librarian','student','accountant','all') NOT NULL DEFAULT 'all',
  audience_scope ENUM('all','class','role') NOT NULL DEFAULT 'all',
  class_name VARCHAR(80) NULL,
  body TEXT NOT NULL,
  file_url VARCHAR(255) NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  ended_at DATETIME NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS school_message_recipients (
  message_id BIGINT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  viewed_at DATETIME NULL,
  present_at DATETIME NULL,
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES school_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);