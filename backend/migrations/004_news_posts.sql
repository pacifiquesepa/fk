USE fkams;

CREATE TABLE news_posts (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'news',
  description TEXT NOT NULL,
  photo_url VARCHAR(500) NULL,
  video_url VARCHAR(500) NULL,
  event_date DATE NULL,
  published_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (published_by) REFERENCES users(id),
  INDEX news_posts_created_at (created_at),
  INDEX news_posts_category (category)
);