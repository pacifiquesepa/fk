ALTER TABLE applications
  ADD COLUMN review_code_hash VARCHAR(255) NULL AFTER parent_email;