ALTER TABLE behavior_records
  ADD COLUMN score_deduction TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN score_after TINYINT UNSIGNED NULL;

UPDATE behavior_records br
JOIN students s ON s.id = br.student_id
SET br.score_after = s.conduct_score;
