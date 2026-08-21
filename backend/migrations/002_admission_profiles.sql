USE fkams;

ALTER TABLE students
  ADD COLUMN photo_key VARCHAR(255) NULL AFTER full_name,
  ADD COLUMN gender ENUM('male','female','other') NOT NULL DEFAULT 'other' AFTER photo_key,
  ADD COLUMN birthday DATE NOT NULL DEFAULT '2000-01-01' AFTER gender,
  ADD COLUMN academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026' AFTER birthday;

ALTER TABLE applications
  ADD COLUMN mother_name VARCHAR(120) NULL AFTER applicant_name,
  ADD COLUMN mother_phone VARCHAR(30) NULL AFTER mother_name,
  ADD COLUMN father_name VARCHAR(120) NULL AFTER mother_phone,
  ADD COLUMN father_phone VARCHAR(30) NULL AFTER father_name,
  ADD COLUMN province VARCHAR(80) NULL AFTER parent_phone,
  ADD COLUMN district VARCHAR(80) NULL AFTER province,
  ADD COLUMN sector VARCHAR(80) NULL AFTER district,
  ADD COLUMN cell VARCHAR(80) NULL AFTER sector,
  ADD COLUMN gender ENUM('male','female','other') NULL AFTER desired_class,
  ADD COLUMN birthday DATE NULL AFTER gender,
  ADD COLUMN result_slip_key VARCHAR(255) NULL AFTER previous_school,
  ADD COLUMN academic_year VARCHAR(20) NULL AFTER result_slip_key,
  ADD COLUMN approved_student_id INT UNSIGNED NULL AFTER reviewer_comment;

ALTER TABLE teacher_profiles
  ADD COLUMN qr_token CHAR(36) NULL AFTER employee_number,
  ADD COLUMN gender ENUM('male','female','other') NULL AFTER salary,
  ADD COLUMN birthday DATE NULL AFTER gender,
  ADD COLUMN diploma_key VARCHAR(255) NULL AFTER birthday,
  ADD COLUMN subject_or_module VARCHAR(160) NULL AFTER diploma_key;

UPDATE teacher_profiles SET qr_token = UUID() WHERE qr_token IS NULL;
ALTER TABLE teacher_profiles MODIFY qr_token CHAR(36) NOT NULL UNIQUE;

