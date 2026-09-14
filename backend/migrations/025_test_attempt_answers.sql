-- Migration 025: retain submitted answers for teacher review
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE test_attempts ADD COLUMN answers_json JSON NULL AFTER score',
  'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'test_attempts' AND column_name = 'answers_json');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
