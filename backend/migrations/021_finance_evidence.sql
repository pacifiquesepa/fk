ALTER TABLE budgets
  ADD COLUMN photo_url VARCHAR(500) NULL,
  ADD COLUMN document_url VARCHAR(500) NULL,
  ADD COLUMN description TEXT NULL;

ALTER TABLE expenses
  ADD COLUMN photo_url VARCHAR(500) NULL,
  ADD COLUMN document_url VARCHAR(500) NULL,
  ADD COLUMN video_url VARCHAR(500) NULL,
  ADD COLUMN budget_status ENUM('greater','equal','less') NOT NULL DEFAULT 'less';
