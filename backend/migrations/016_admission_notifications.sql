-- Migration 016: admission contact and notification support
ALTER TABLE applications
  MODIFY COLUMN parent_phone VARCHAR(190) NOT NULL,
  ADD COLUMN parent_email VARCHAR(190) NULL AFTER parent_phone;
