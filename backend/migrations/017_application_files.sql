-- Migration 017: application photo/report uploads
ALTER TABLE applications
  ADD COLUMN applicant_photo_key VARCHAR(255) NULL AFTER applicant_name,
  ADD COLUMN report_key VARCHAR(255) NULL AFTER result_slip_key,
  ADD COLUMN village VARCHAR(80) NULL AFTER cell;
