-- Migration 015: Attendance workflow, comments and conduct score tracking
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS comment TEXT NULL,
  ADD COLUMN IF NOT EXISTS score_deduction TINYINT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE behavior_records
  ADD COLUMN IF NOT EXISTS attendance_id BIGINT UNSIGNED NULL;
