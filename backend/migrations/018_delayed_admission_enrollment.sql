-- Migration 018: enroll approved applications after a 24-hour delay
ALTER TABLE applications
  ADD COLUMN approved_at DATETIME NULL AFTER status;

CREATE INDEX applications_enrollment_queue
  ON applications (status, approved_at, approved_student_id);
