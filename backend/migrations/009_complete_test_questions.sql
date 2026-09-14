-- Migration 009: complete test question columns after a partial 007 migration
ALTER TABLE test_questions
MODIFY COLUMN question_type ENUM('choice', 'fill', 'match', 'drag', 'rearrange', 'open') NOT NULL;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE test_questions ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT FALSE COMMENT ''Flag to indicate if question is still being edited''',
  'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'test_questions' AND column_name = 'is_draft');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE test_questions ADD INDEX idx_test_order (test_id, question_order)',
  'SELECT 1') FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'test_questions' AND index_name = 'idx_test_order');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
