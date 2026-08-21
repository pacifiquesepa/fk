USE fkams;

ALTER TABLE otp_challenges
  ADD COLUMN purpose ENUM('login','password_reset') NOT NULL DEFAULT 'login' AFTER user_id,
  ADD COLUMN reset_verified_at DATETIME NULL AFTER consumed_at;