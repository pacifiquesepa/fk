ALTER TABLE applications
  ADD COLUMN temporary_password VARCHAR(255) NULL AFTER review_code_hash;