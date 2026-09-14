-- Add open questions to tests created from the AI assessment editor.
ALTER TABLE test_questions
MODIFY COLUMN question_type ENUM('choice', 'fill', 'match', 'drag', 'rearrange', 'open') NOT NULL;