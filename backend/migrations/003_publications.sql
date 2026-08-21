USE fkams;

ALTER TABLE notices
  ADD COLUMN category VARCHAR(60) NOT NULL DEFAULT 'announcement' AFTER body;

ALTER TABLE documents
  MODIFY visibility ENUM('public','admin','dos','staff','parent','student') NOT NULL DEFAULT 'admin';

ALTER TABLE documents
  ADD COLUMN category VARCHAR(60) NOT NULL DEFAULT 'general' AFTER title;