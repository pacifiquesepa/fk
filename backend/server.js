require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadDirectory = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({ dest: uploadDirectory, limits: { fileSize: 10 * 1024 * 1024 } });
const jwtSecret = process.env.JWT_SECRET;
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const otpRoles = new Set((process.env.OTP_ROLES || 'admin,dos,parent,teacher,accountant,librarian').split(',').map((role) => role.trim()).filter(Boolean));
const otpChannel = process.env.OTP_CHANNEL === 'sms' ? 'sms' : 'email';
const otpExpiresMinutes = Math.max(1, Number(process.env.OTP_EXPIRES_MINUTES || 5));
const otpMaxAttempts = Math.max(1, Number(process.env.OTP_MAX_ATTEMPTS || 5));

if (!jwtSecret) {
  console.warn('JWT_SECRET is not set. Login endpoints are disabled until the environment is configured.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fkams',
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
});

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDirectory));

const loginAttempts = new Map();
const otpRequests = new Map();
function validateLogin(body) {
  if (!body || typeof body.identifier !== 'string' || typeof body.password !== 'string') return 'Username/email and password are required.';
  if (!/^[^\s]{3,190}$/.test(body.identifier.trim())) return 'Enter a valid username or email address.';
  if (body.password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}
function maskDestination(value, channel) {
  if (channel === 'sms') return value ? `${value.slice(0, 3)}****${value.slice(-2)}` : '';
  const [name, domain] = value.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}
function createOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}
function hashOtp(code) {
  return crypto.createHash('sha256').update(`${code}:${jwtSecret}`).digest('hex');
}
async function deliverOtp({ code, destination, channel }) {
  if (channel === 'email' && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: destination, subject: 'FKAMS password verification code', text: `Your FKAMS verification code is ${code}. It expires in two minutes.`, html: `<p>Your FKAMS verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in two minutes. If you did not request it, you can ignore this email.</p>` });
    return;
  }
  if (process.env.OTP_PROVIDER === 'console' || !process.env.OTP_PROVIDER) {
    console.log(`[FKAMS OTP] ${channel} to ${maskDestination(destination, channel)}: ${code}`);
    return;
  }
  throw new Error('OTP provider is configured but no delivery adapter is installed.');
}
function otpDestination(user) {
  if (otpChannel === 'sms') return user.phone;
  return user.email;
}
async function issueOtp(user, purpose = 'login') {
  const destination = otpDestination(user);
  if (!destination) throw Object.assign(new Error(`No ${otpChannel} destination is configured for this account.`), { statusCode: 422 });
  const request = otpRequests.get(String(user.id));
  if (request && request.availableAt > Date.now()) throw Object.assign(new Error('Please wait before requesting another OTP.'), { statusCode: 429 });
  const code = createOtpCode();
  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + (purpose === 'password_reset' ? 120 : otpExpiresMinutes * 60) * 1000);
  await pool.query('UPDATE otp_challenges SET consumed_at = NOW() WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL', [user.id, purpose]);
  await pool.query('INSERT INTO otp_challenges (id, user_id, purpose, code_hash, channel, destination_mask, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [challengeId, user.id, purpose, hashOtp(code), otpChannel, maskDestination(destination, otpChannel), expiresAt]);
  await deliverOtp({ code, destination, channel: otpChannel });
  otpRequests.set(String(user.id), { availableAt: Date.now() + 30 * 1000 });
  return { challengeId, purpose, channel: otpChannel, destination: maskDestination(destination, otpChannel), expiresInSeconds: purpose === 'password_reset' ? 120 : otpExpiresMinutes * 60 };
}
function signUser(user) {
  const token = jwt.sign({ sub: user.id, role: user.role, name: user.full_name }, jwtSecret, { expiresIn: '8h' });
  return { token, user: { id: user.id, name: user.full_name, email: user.email, role: user.role } };
}
function requireAuth(req, res, next) {
  if (!jwtSecret) return res.status(503).json({ error: 'Authentication is not configured.' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'A valid access token is required.' });
  }
}
function authorize(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission for this resource.' });
}
function requiredString(value, label, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) return `${label} is required and must be at most ${max} characters.`;
  return null;
}
function positiveNumber(value, label) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return `${label} must be a positive number.`;
  return null;
}
function bodyErrors(body, fields) {
  return fields.map(([key, label, max]) => requiredString(body?.[key], label, max)).find(Boolean);
}
async function teacherCanAccessStudent(userId, studentId) {
  const [rows] = await pool.query(`
    SELECT s.id FROM students s
    JOIN student_classes sc ON sc.student_id = s.id
    JOIN teacher_assignments ta ON ta.class_id = sc.class_id
    WHERE ta.teacher_id = ? AND s.id = ? LIMIT 1`, [userId, studentId]);
  return rows.length > 0;
}
async function getStudentForUser(user) {
  const [rows] = await pool.query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [user.sub]);
  return rows[0]?.id;
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', service: 'FKAMS API' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable', service: 'FKAMS API' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const error = validateLogin(req.body);
  if (error) return res.status(400).json({ error });
  if (!jwtSecret) return res.status(503).json({ error: 'Authentication is not configured.' });
  const identifier = req.body.identifier.toLowerCase().trim();
  const now = Date.now();
  const attempt = loginAttempts.get(identifier) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > attempt.resetAt) { attempt.count = 0; attempt.resetAt = now + 15 * 60 * 1000; }
  if (attempt.count >= 10) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  try {
    const [users] = await pool.query('SELECT id, full_name, username, email, phone, password_hash, role, is_active FROM users WHERE username = ? OR email = ? LIMIT 1', [identifier, identifier]);
    const user = users[0];
    if (!user || !user.is_active || !(await bcrypt.compare(req.body.password, user.password_hash))) {
      attempt.count += 1; loginAttempts.set(identifier, attempt);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    loginAttempts.delete(identifier);
    if (otpRoles.has(user.role)) {
      const challenge = await issueOtp(user, 'login');
      return res.json({ requiresOtp: true, ...challenge });
    }
    res.json({ requiresOtp: false, ...signUser(user) });
  } catch (dbError) {
    console.error(dbError.message);
    res.status(dbError.statusCode || 503).json({ error: dbError.statusCode ? dbError.message : 'Unable to connect to the database.' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  if (!jwtSecret) return res.status(503).json({ error: 'Authentication is not configured.' });
  const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId.trim() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'A valid challengeId and six-digit OTP are required.' });
  try {
    const [rows] = await pool.query("SELECT o.id, o.user_id AS userId, o.code_hash AS codeHash, o.expires_at AS expiresAt, o.attempts, o.consumed_at AS consumedAt, u.full_name, u.email, u.role, u.is_active FROM otp_challenges o JOIN users u ON u.id = o.user_id WHERE o.id = ? AND o.purpose = 'login' LIMIT 1", [challengeId]);
    const challenge = rows[0];
    if (!challenge || challenge.consumedAt || new Date(challenge.expiresAt).getTime() <= Date.now() || !challenge.is_active) return res.status(401).json({ error: 'This OTP has expired or is no longer valid.' });
    if (challenge.attempts >= otpMaxAttempts) return res.status(429).json({ error: 'Too many invalid OTP attempts. Request a new code.' });
    const valid = crypto.timingSafeEqual(Buffer.from(challenge.codeHash, 'hex'), Buffer.from(hashOtp(code), 'hex'));
    if (!valid) {
      await pool.query('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?', [challengeId]);
      return res.status(401).json({ error: 'Invalid OTP.' });
    }
    await pool.query('UPDATE otp_challenges SET consumed_at = NOW() WHERE id = ?', [challengeId]);
    res.json({ requiresOtp: false, ...signUser({ id: challenge.userId, full_name: challenge.full_name, email: challenge.email, role: challenge.role }) });
  } catch (error) {
    console.error(error.message);
    res.status(503).json({ error: 'Unable to verify OTP.' });
  }
});

app.post('/api/auth/resend-otp', async (req, res) => {
  const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(challengeId)) return res.status(400).json({ error: 'A valid challengeId is required.' });
  try {
    const [rows] = await pool.query('SELECT o.purpose, u.id, u.email, u.phone, u.role, u.is_active FROM otp_challenges o JOIN users u ON u.id = o.user_id WHERE o.id = ? LIMIT 1', [challengeId]);
    const user = rows[0];
    if (!user || !user.is_active || !otpRoles.has(user.role)) return res.status(404).json({ error: 'OTP challenge not found.' });
    const challenge = await issueOtp(user, user.purpose || 'login');
    res.json(challenge);
  } catch (error) {
    res.status(error.statusCode || 503).json({ error: error.statusCode ? error.message : 'Unable to resend OTP.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : '';
  if (!identifier || identifier.length > 190) return res.status(400).json({ error: 'Enter the email address used for your account.' });
  try {
    const [users] = await pool.query('SELECT id, email, phone, role, is_active FROM users WHERE email = ? OR username = ? LIMIT 1', [identifier, identifier]);
    const user = users[0];
    if (!user || !user.is_active || !user.email) return res.status(404).json({ error: 'No active account was found with that email or username.' });
    const challenge = await issueOtp(user, 'password_reset');
    res.json(challenge);
  } catch (error) {
    res.status(error.statusCode || 503).json({ error: error.statusCode ? error.message : 'Unable to send a password reset code.' });
  }
});

app.post('/api/auth/verify-reset-otp', async (req, res) => {
  const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId.trim() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'A valid challengeId and six-digit OTP are required.' });
  try {
    const [rows] = await pool.query("SELECT id, user_id AS userId, code_hash AS codeHash, expires_at AS expiresAt, attempts, consumed_at AS consumedAt FROM otp_challenges WHERE id = ? AND purpose = 'password_reset' LIMIT 1", [challengeId]);
    const challenge = rows[0];
    if (!challenge || challenge.consumedAt || new Date(challenge.expiresAt).getTime() <= Date.now()) return res.status(401).json({ error: 'This OTP is invalid or has expired. Request a new code.' });
    if (challenge.attempts >= otpMaxAttempts) return res.status(429).json({ error: 'Too many invalid attempts. Request a new code.' });
    const valid = crypto.timingSafeEqual(Buffer.from(challenge.codeHash, 'hex'), Buffer.from(hashOtp(code), 'hex'));
    if (!valid) { await pool.query('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?', [challengeId]); return res.status(401).json({ error: 'Invalid OTP.' }); }
    await pool.query('UPDATE otp_challenges SET reset_verified_at = NOW() WHERE id = ?', [challengeId]);
    res.json({ resetToken: challengeId, expiresInSeconds: 600 });
  } catch (error) { res.status(503).json({ error: 'Unable to verify reset OTP.' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const resetToken = typeof req.body?.resetToken === 'string' ? req.body.resetToken.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!/^[0-9a-f-]{36}$/i.test(resetToken) || password.length < 8) return res.status(400).json({ error: 'A valid reset token and password of at least 8 characters are required.' });
  try {
    const [rows] = await pool.query("SELECT user_id AS userId, reset_verified_at AS verifiedAt, consumed_at AS consumedAt FROM otp_challenges WHERE id = ? AND purpose = 'password_reset' LIMIT 1", [resetToken]);
    const reset = rows[0];
    if (!reset || reset.consumedAt || !reset.verifiedAt || Date.now() - new Date(reset.verifiedAt).getTime() > 10 * 60 * 1000) return res.status(401).json({ error: 'Reset session expired. Request a new OTP.' });
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, reset.userId]);
    await pool.query('UPDATE otp_challenges SET consumed_at = NOW() WHERE id = ?', [resetToken]);
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch { res.status(503).json({ error: 'Unable to reset password.' }); }
});

app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.get('/api/dashboard', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => {
  const [summaryRows, attendanceRows, classRows, activityRows, alertRows] = await Promise.all([
    pool.query(`SELECT
      (SELECT COUNT(*) FROM students WHERE status = 'active') AS students,
      (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = TRUE) AS teachers,
      (SELECT COUNT(*) FROM classes WHERE is_active = TRUE) AS classes,
      (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS users,
      (SELECT COUNT(*) FROM applications WHERE status = 'pending') AS pendingAdmissions,
      (SELECT COALESCE(SUM(amount), 0) FROM fees WHERE paid_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')) AS feesCollected,
      (SELECT COALESCE(SUM(i.amount), 0) - COALESCE(SUM(f.amount), 0) FROM invoices i LEFT JOIN fees f ON f.student_id = i.student_id WHERE i.status <> 'paid') AS outstandingFees,
      (SELECT COUNT(*) FROM feeding_records WHERE feeding_date = CURRENT_DATE AND served = TRUE) AS feedingToday,
      (SELECT COUNT(*) FROM student_transport) AS transportStudents,
      (SELECT COUNT(*) FROM documents) AS documents,
      (SELECT COUNT(*) FROM library_loans WHERE returned_at IS NULL) AS activeLoans,
      (SELECT COUNT(*) FROM attendance WHERE attendance_date = CURRENT_DATE AND status = 'present') AS presentToday,
      (SELECT COUNT(*) FROM attendance WHERE attendance_date = CURRENT_DATE) AS markedToday`),
    pool.query(`SELECT a.status, COUNT(*) AS total FROM attendance a WHERE a.attendance_date = CURRENT_DATE GROUP BY a.status`),
    pool.query(`SELECT c.name, COUNT(sc.student_id) AS students, ROUND(COALESCE(SUM(a.status = 'present') / NULLIF(COUNT(a.id), 0) * 100, 0), 1) AS attendancePercent
      FROM classes c LEFT JOIN student_classes sc ON sc.class_id = c.id
      LEFT JOIN attendance a ON a.student_id = sc.student_id AND a.attendance_date = CURRENT_DATE
      WHERE c.is_active = TRUE GROUP BY c.id, c.name ORDER BY c.name LIMIT 12`),
    pool.query(`SELECT 'student' AS type, full_name AS name, 'Profile created' AS action, created_at AS createdAt FROM students
      UNION ALL SELECT 'application', applicant_name, CONCAT('Application ', status), created_at FROM applications
      UNION ALL SELECT 'notice', title, 'Notice published', published_at FROM notices
      UNION ALL SELECT 'finance', reference, 'Payment received', paid_at FROM fees
      ORDER BY createdAt DESC LIMIT 8`),
    pool.query(`SELECT 'fee' AS type, CONCAT(COUNT(*), ' unpaid invoices') AS title, 'Review outstanding fees' AS action, COUNT(*) AS quantity FROM invoices WHERE status IN ('unpaid', 'overdue')
      UNION ALL SELECT 'staff', 'Inactive staff detected', 'Review staff attendance', COUNT(*) FROM staff_attendance WHERE attendance_date = CURRENT_DATE AND status = 'absent'
      UNION ALL SELECT 'inventory', 'Low stock items', 'Open inventory', COUNT(*) FROM inventory_items WHERE quantity <= reorder_level
      UNION ALL SELECT 'library', 'Overdue library loans', 'Review returns', COUNT(*) FROM library_loans WHERE returned_at IS NULL AND due_at < CURRENT_DATE`),
  ]);
  const summary = summaryRows[0][0] || {};
  const marked = Number(summary.markedToday || 0);
  res.json({
    students: Number(summary.students || 0), teachers: Number(summary.teachers || 0), classes: Number(summary.classes || 0), users: Number(summary.users || 0),
    pendingAdmissions: Number(summary.pendingAdmissions || 0), feesCollected: Number(summary.feesCollected || 0), outstandingFees: Number(summary.outstandingFees || 0),
    feedingToday: Number(summary.feedingToday || 0), transportStudents: Number(summary.transportStudents || 0), documents: Number(summary.documents || 0), activeLoans: Number(summary.activeLoans || 0),
    attendancePercent: marked ? Math.round((Number(summary.presentToday || 0) / marked) * 10000) / 100 : 0,
    attendanceByStatus: attendanceRows[0], attendanceByClass: classRows[0], recentActivity: activityRows[0], alerts: alertRows[0].filter((alert) => Number(alert.quantity) > 0),
  });
});

app.post('/api/users', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['fullName', 'Full name', 120], ['username', 'Username', 60], ['email', 'Email', 190], ['password', 'Password', 100]]);
  const roles = ['admin', 'dos', 'teacher', 'student', 'parent', 'accountant', 'librarian'];
  if (error) return res.status(400).json({ error });
  if (!/^[a-zA-Z0-9._-]{3,60}$/.test(req.body.username)) return res.status(400).json({ error: 'Username may contain letters, numbers, dots, underscores and hyphens.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (req.body.password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!roles.includes(req.body.role)) return res.status(400).json({ error: 'Invalid user role.' });
  if (req.body.phone !== undefined && (typeof req.body.phone !== 'string' || req.body.phone.trim().length > 30)) return res.status(400).json({ error: 'Phone must be at most 30 characters.' });
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  try {
    const [result] = await pool.query('INSERT INTO users (full_name, username, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)', [req.body.fullName.trim(), req.body.username.trim().toLowerCase(), req.body.email.toLowerCase().trim(), req.body.phone?.trim() || null, passwordHash, req.body.role]);
    res.status(201).json({ id: result.insertId, message: 'User created.' });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email is already registered.' }); throw error; }
});

app.get('/api/users', requireAuth, authorize('admin'), async (_req, res) => {
  const [rows] = await pool.query('SELECT id, full_name AS fullName, username, email, phone, role, is_active AS isActive, created_at AS createdAt FROM users ORDER BY full_name');
  res.json({ users: rows });
});

app.patch('/api/users/:id/role', requireAuth, authorize('admin'), async (req, res) => {
  const roles = ['admin', 'dos', 'teacher', 'student', 'parent', 'accountant', 'librarian'];
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || !roles.includes(req.body?.role)) return res.status(400).json({ error: 'A valid user id and role are required.' });
  if (userId === Number(req.user.sub) && req.body.role !== 'admin') return res.status(400).json({ error: 'You cannot remove your own admin role.' });
  const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [req.body.role, userId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'User not found.' });
  res.json({ message: 'User role updated.' });
});

app.post('/api/applications', async (req, res) => {
  const error = bodyErrors(req.body, [['applicantName', 'Applicant name', 120], ['parentPhone', 'Parent phone', 30], ['desiredClass', 'Desired class', 80]]);
  if (error) return res.status(400).json({ error });
  if (req.body.gender && !['male', 'female', 'other'].includes(req.body.gender)) return res.status(400).json({ error: 'Invalid gender.' });
  const [result] = await pool.query(`INSERT INTO applications
    (applicant_name, mother_name, mother_phone, father_name, father_phone, parent_phone, province, district, sector, cell, desired_class, gender, birthday, previous_school, result_slip_key, academic_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.body.applicantName.trim(), req.body.motherName?.trim() || null, req.body.motherPhone?.trim() || null, req.body.fatherName?.trim() || null, req.body.fatherPhone?.trim() || null, req.body.parentPhone.trim(), req.body.province?.trim() || null, req.body.district?.trim() || null, req.body.sector?.trim() || null, req.body.cell?.trim() || null, req.body.desiredClass.trim(), req.body.gender || null, req.body.birthday || null, req.body.previousSchool?.trim() || null, req.body.resultSlipKey?.trim() || null, req.body.academicYear?.trim() || null]);
  res.status(201).json({ id: result.insertId, status: 'pending', message: 'Application received. You will be notified after review.' });
});

app.get('/api/applications', requireAuth, authorize('admin', 'dos'), async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
  res.json({ applications: rows });
});

app.patch('/api/applications/:id/status', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const status = ['approved', 'rejected'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'Status must be approved or rejected.' });
  if (status === 'rejected') {
    const [result] = await pool.query('UPDATE applications SET status = ?, reviewer_comment = ? WHERE id = ? AND status = \'pending\'', [status, req.body.comment?.trim() || null, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Pending application not found.' });
    return res.json({ message: 'Application rejected.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [applications] = await connection.query('SELECT * FROM applications WHERE id = ? AND status = \'pending\' FOR UPDATE', [req.params.id]);
    const application = applications[0];
    if (!application) { await connection.rollback(); return res.status(404).json({ error: 'Pending application not found.' }); }
    const admissionNumber = `FK-${new Date().getFullYear()}-${String(application.id).padStart(5, '0')}`;
    const username = `student${application.id}`;
    const email = `student${application.id}@fkams.local`;
    const temporaryPassword = `FK${crypto.randomInt(100000, 1000000)}!`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const [userResult] = await connection.query('INSERT INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, \'student\')', [application.applicant_name, username, email, passwordHash]);
    const qrToken = crypto.randomUUID();
    const [studentResult] = await connection.query(`INSERT INTO students (user_id, admission_number, full_name, gender, birthday, academic_year, class_name, parent_phone, qr_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userResult.insertId, admissionNumber, application.applicant_name, application.gender || 'other', application.birthday || '2000-01-01', application.academic_year || String(new Date().getFullYear()), application.desired_class, application.parent_phone, qrToken]);
    await connection.query('UPDATE applications SET status = \'approved\', reviewer_comment = ?, approved_student_id = ? WHERE id = ?', [req.body.comment?.trim() || null, studentResult.insertId, application.id]);
    await connection.commit();
    res.json({ message: 'Application approved and student account created.', student: { id: studentResult.insertId, admissionNumber, qrToken, username, temporaryPassword } });
  } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A student account for this application already exists.' }); throw error; } finally { connection.release(); }
});

app.get('/api/students', requireAuth, async (req, res) => {
  let query = `SELECT s.id, s.admission_number AS admissionNumber, s.full_name AS fullName, s.class_name AS className, s.parent_phone AS parentPhone, s.qr_token AS qrToken, s.status FROM students s`;
  const params = [];
  if (req.user.role === 'teacher') { query += ' JOIN student_classes sc ON sc.student_id = s.id JOIN teacher_assignments ta ON ta.class_id = sc.class_id WHERE ta.teacher_id = ?'; params.push(req.user.sub); }
  else if (req.user.role === 'parent') { query += ' JOIN parent_students ps ON ps.student_id = s.id WHERE ps.parent_id = ?'; params.push(req.user.sub); }
  else if (req.user.role === 'student') { query += ' WHERE s.user_id = ?'; params.push(req.user.sub); }
  else if (!['admin', 'dos'].includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to view students.' });
  query += ' ORDER BY s.full_name ASC';
  const [rows] = await pool.query(query, params);
  res.json({ students: rows });
});

app.post('/api/students', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['admissionNumber', 'Admission number', 40], ['fullName', 'Full name', 120], ['className', 'Class name', 80], ['parentPhone', 'Parent phone', 30]]);
  if (error) return res.status(400).json({ error });
  if (!req.body.password || req.body.password !== req.body.repassword) return res.status(400).json({ error: 'Password and repassword must match.' });
  if (!['male', 'female', 'other'].includes(req.body.gender) || !req.body.birthday || !req.body.academicYear) return res.status(400).json({ error: 'Gender, birthday and academic year are required.' });
  const qrToken = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const username = req.body.username?.trim().toLowerCase() || `student-${req.body.admissionNumber.trim().toLowerCase()}`;
  const email = req.body.email?.trim().toLowerCase() || `${username}@fkams.local`;
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const [userResult] = await connection.query('INSERT INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, \'student\')', [req.body.fullName.trim(), username, email, passwordHash]); const [result] = await connection.query('INSERT INTO students (user_id, admission_number, full_name, gender, birthday, academic_year, class_name, parent_phone, qr_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [userResult.insertId, req.body.admissionNumber.trim(), req.body.fullName.trim(), req.body.gender, req.body.birthday, req.body.academicYear.trim(), req.body.className.trim(), req.body.parentPhone.trim(), qrToken]); await connection.commit(); res.status(201).json({ id: result.insertId, qrToken, username, message: 'Student created.' }); } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username, email or admission number already exists.' }); throw error; } finally { connection.release(); }
});

app.post('/api/teachers/register', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['fullName', 'Full name', 120], ['email', 'Email', 190], ['subjectOrModule', 'Subject or module', 160]]);
  if (error) return res.status(400).json({ error });
  if (!req.body.password || req.body.password !== req.body.repassword) return res.status(400).json({ error: 'Password and repassword must match.' });
  if (!['male', 'female', 'other'].includes(req.body.gender) || !req.body.birthday) return res.status(400).json({ error: 'Gender and birthday are required.' });
  const username = req.body.username?.trim().toLowerCase() || `teacher${crypto.randomInt(10000, 99999)}`;
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const [userResult] = await connection.query('INSERT INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, \'teacher\')', [req.body.fullName.trim(), username, req.body.email.toLowerCase().trim(), passwordHash]); const qrToken = crypto.randomUUID(); await connection.query('INSERT INTO teacher_profiles (user_id, employee_number, qr_token, gender, birthday, diploma_key, subject_or_module) VALUES (?, ?, ?, ?, ?, ?, ?)', [userResult.insertId, req.body.employeeNumber?.trim() || `EMP-${userResult.insertId}`, qrToken, req.body.gender, req.body.birthday, req.body.diplomaKey?.trim() || null, req.body.subjectOrModule.trim()]); await connection.commit(); res.status(201).json({ id: userResult.insertId, username, qrToken, message: 'Teacher registered.' }); } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username, email or employee number already exists.' }); throw error; } finally { connection.release(); }
});

app.get('/api/student/profile', requireAuth, authorize('student'), async (req, res) => {
  const [rows] = await pool.query('SELECT s.id, s.full_name AS fullName, s.photo_key AS photoKey, s.qr_token AS qrToken, s.class_name AS className, s.gender, s.birthday, s.academic_year AS academicYear, s.admission_number AS admissionNumber FROM students s WHERE s.user_id = ? LIMIT 1', [req.user.sub]);
  if (!rows[0]) return res.status(404).json({ error: 'Student profile not found.' });
  res.json({ profile: rows[0], editable: ['photoKey'] });
});

app.patch('/api/student/profile/photo', requireAuth, authorize('student'), async (req, res) => {
  if (typeof req.body?.photoKey !== 'string' || !req.body.photoKey.trim() || req.body.photoKey.length > 255) return res.status(400).json({ error: 'A valid photo key is required.' });
  const [result] = await pool.query('UPDATE students SET photo_key = ? WHERE user_id = ?', [req.body.photoKey.trim(), req.user.sub]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Student profile not found.' });
  res.json({ message: 'Profile photo updated.' });
});

app.patch('/api/dos/students/:id/profile', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const studentId = Number(req.params.id); if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'Valid student id is required.' });
  const fields = { fullName: 'full_name', gender: 'gender', birthday: 'birthday', academicYear: 'academic_year', className: 'class_name', parentPhone: 'parent_phone', photoKey: 'photo_key' };
  const updates = []; const values = [];
  Object.entries(fields).forEach(([key, column]) => { if (req.body[key] !== undefined) { updates.push(`${column} = ?`); values.push(req.body[key]); } });
  if (!updates.length) return res.status(400).json({ error: 'At least one profile field is required.' });
  if (req.body.gender && !['male', 'female', 'other'].includes(req.body.gender)) return res.status(400).json({ error: 'Invalid gender.' });
  values.push(studentId); const [result] = await pool.query(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, values); if (!result.affectedRows) return res.status(404).json({ error: 'Student not found.' }); res.json({ message: 'Student profile updated.' });
});

app.get('/api/students/qr/:token', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT id, admission_number AS admissionNumber, full_name AS fullName, class_name AS className, status FROM students WHERE qr_token = ? LIMIT 1', [req.params.token]);
  if (!rows[0]) return res.status(404).json({ error: 'Student QR code is not valid.' });
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, rows[0].id))) return res.status(403).json({ error: 'This student is outside your assignment.' });
  if (req.user.role === 'parent') { const [linked] = await pool.query('SELECT 1 FROM parent_students WHERE parent_id = ? AND student_id = ?', [req.user.sub, rows[0].id]); if (!linked.length) return res.status(403).json({ error: 'This student is not linked to your account.' }); }
  res.json({ student: rows[0] });
});

app.post('/api/attendance', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => {
  const studentId = Number(req.body?.studentId);
  const statuses = ['present', 'absent', 'late', 'excused'];
  if (!Number.isInteger(studentId) || !statuses.includes(req.body?.status)) return res.status(400).json({ error: 'A valid studentId and attendance status are required.' });
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' });
  await pool.query('INSERT INTO attendance (student_id, attendance_date, status, marked_by) VALUES (?, COALESCE(?, CURRENT_DATE), ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)', [studentId, req.body.date || null, req.body.status, req.user.sub]);
  res.status(201).json({ message: 'Attendance saved.' });
});

app.get('/api/attendance', requireAuth, async (req, res) => {
  const studentId = Number(req.query.studentId);
  if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'studentId is required.' });
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' });
  if (req.user.role === 'student' && (await getStudentForUser(req.user)) !== studentId) return res.status(403).json({ error: 'You can only view your own attendance.' });
  if (req.user.role === 'parent') { const [linked] = await pool.query('SELECT 1 FROM parent_students WHERE parent_id = ? AND student_id = ?', [req.user.sub, studentId]); if (!linked.length) return res.status(403).json({ error: 'This student is not linked to your account.' }); }
  const [rows] = await pool.query('SELECT attendance_date AS date, status FROM attendance WHERE student_id = ? ORDER BY attendance_date DESC LIMIT 100', [studentId]);
  res.json({ attendance: rows });
});

app.get('/api/classes', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT id, name, academic_year AS academicYear, is_active AS isActive FROM classes ORDER BY name');
  res.json({ classes: rows });
});

app.post('/api/classes', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['name', 'Class name', 80], ['academicYear', 'Academic year', 20]]);
  if (error) return res.status(400).json({ error });
  const [result] = await pool.query('INSERT INTO classes (name, academic_year) VALUES (?, ?)', [req.body.name.trim(), req.body.academicYear.trim()]);
  res.status(201).json({ id: result.insertId, message: 'Class created.' });
});

app.get('/api/subjects', requireAuth, async (_req, res) => {
  const [rows] = await pool.query('SELECT id, name, code, is_active AS isActive FROM subjects ORDER BY name');
  res.json({ subjects: rows });
});

app.post('/api/subjects', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['name', 'Subject name', 100], ['code', 'Subject code', 30]]);
  if (error) return res.status(400).json({ error });
  const [result] = await pool.query('INSERT INTO subjects (name, code) VALUES (?, ?)', [req.body.name.trim(), req.body.code.trim().toUpperCase()]);
  res.status(201).json({ id: result.insertId, message: 'Subject created.' });
});

app.post('/api/teacher-assignments', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const teacherId = Number(req.body?.teacherId); const classId = Number(req.body?.classId); const subjectId = Number(req.body?.subjectId);
  if (![teacherId, classId, subjectId].every(Number.isInteger)) return res.status(400).json({ error: 'teacherId, classId and subjectId are required.' });
  const [teacher] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'teacher' AND is_active = TRUE", [teacherId]);
  if (!teacher.length) return res.status(400).json({ error: 'The selected user is not an active teacher.' });
  await pool.query('INSERT INTO teacher_assignments (teacher_id, class_id, subject_id) VALUES (?, ?, ?)', [teacherId, classId, subjectId]);
  res.status(201).json({ message: 'Teacher assignment saved.' });
});

app.post('/api/tests', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => {
  const error = bodyErrors(req.body, [['title', 'Test title', 180]]);
  const classId = Number(req.body?.classId); const subjectId = Number(req.body?.subjectId); const duration = Number(req.body?.durationMinutes);
  if (error || !Number.isInteger(classId) || !Number.isInteger(subjectId) || !Number.isInteger(duration) || duration < 1 || duration > 480) return res.status(400).json({ error: error || 'A valid class, subject and duration from 1 to 480 minutes are required.' });
  if (req.user.role === 'teacher') {
    const [assignment] = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND subject_id = ?', [req.user.sub, classId, subjectId]);
    if (!assignment.length) return res.status(403).json({ error: 'You can only create tests for your assigned classes and subjects.' });
  }
  const [result] = await pool.query('INSERT INTO tests (title, class_id, subject_id, teacher_id, duration_minutes, starts_at, ends_at, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.body.title.trim(), classId, subjectId, req.user.sub, duration, req.body.startsAt || null, req.body.endsAt || null, Boolean(req.body.isPublished)]);
  res.status(201).json({ id: result.insertId, message: 'Test created.' });
});

app.get('/api/tests', requireAuth, async (req, res) => {
  let query = `SELECT t.id, t.title, t.class_id AS classId, t.subject_id AS subjectId, t.duration_minutes AS durationMinutes, t.starts_at AS startsAt, t.ends_at AS endsAt, t.is_published AS isPublished FROM tests t`;
  const params = [];
  if (req.user.role === 'teacher') { query += ' WHERE t.teacher_id = ?'; params.push(req.user.sub); }
  else if (req.user.role === 'student') { query += ' JOIN student_classes sc ON sc.class_id = t.class_id JOIN students s ON s.id = sc.student_id WHERE s.user_id = ? AND t.is_published = TRUE'; params.push(req.user.sub); }
  else if (req.user.role === 'parent') { query += ' JOIN student_classes sc ON sc.class_id = t.class_id JOIN parent_students ps ON ps.student_id = sc.student_id WHERE ps.parent_id = ? AND t.is_published = TRUE'; params.push(req.user.sub); }
  query += ' ORDER BY t.starts_at DESC, t.id DESC';
  const [rows] = await pool.query(query, params);
  res.json({ tests: rows });
});

app.get('/api/tests/:id/questions', requireAuth, async (req, res) => {
  const testId = Number(req.params.id); if (!Number.isInteger(testId)) return res.status(400).json({ error: 'Valid test id is required.' });
  let allowed = ['admin', 'dos', 'teacher'].includes(req.user.role);
  if (req.user.role === 'student') { const studentId = await getStudentForUser(req.user); const [rows] = await pool.query('SELECT 1 FROM tests t JOIN student_classes sc ON sc.class_id = t.class_id WHERE t.id = ? AND sc.student_id = ? AND t.is_published = TRUE', [testId, studentId]); allowed = rows.length > 0; }
  if (!allowed) return res.status(403).json({ error: 'You cannot access this test.' });
  const [rows] = await pool.query('SELECT id, question_order AS questionOrder, question_type AS questionType, prompt, options_json AS options, points FROM test_questions WHERE test_id = ? ORDER BY question_order', [testId]);
  res.json({ questions: rows.map((question) => ({ ...question, options: typeof question.options === 'string' ? JSON.parse(question.options) : question.options })) });
});

app.patch('/api/tests/:id', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => {
  const [tests] = await pool.query('SELECT teacher_id AS teacherId FROM tests WHERE id = ?', [req.params.id]); if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });
  if (req.user.role === 'teacher' && Number(tests[0].teacherId) !== Number(req.user.sub)) return res.status(403).json({ error: 'You can only update your own tests.' });
  const allowed = ['title', 'duration_minutes', 'starts_at', 'ends_at', 'is_published']; const updates = []; const values = [];
  [['title', 'title'], ['durationMinutes', 'duration_minutes'], ['startsAt', 'starts_at'], ['endsAt', 'ends_at'], ['isPublished', 'is_published']].forEach(([input, column]) => { if (req.body[input] !== undefined) { updates.push(`${column} = ?`); values.push(req.body[input]); } });
  if (!updates.length || (req.body.durationMinutes !== undefined && (!Number.isInteger(Number(req.body.durationMinutes)) || Number(req.body.durationMinutes) < 1))) return res.status(400).json({ error: 'Provide valid test fields.' });
  values.push(req.params.id); await pool.query(`UPDATE tests SET ${updates.join(', ')} WHERE id = ?`, values); res.json({ message: 'Test updated.' });
});

app.post('/api/tests/:id/questions', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => {
  const error = bodyErrors(req.body, [['prompt', 'Question prompt', 5000]]);
  const type = ['choice', 'fill', 'match'].includes(req.body?.questionType) ? req.body.questionType : null;
  const pointsError = positiveNumber(Number(req.body?.points || 1), 'Points');
  if (error || !type || pointsError || !Array.isArray(req.body.answer)) return res.status(400).json({ error: error || 'Question type, answer array and positive points are required.' });
  const [tests] = await pool.query('SELECT id, teacher_id AS teacherId FROM tests WHERE id = ? LIMIT 1', [req.params.id]);
  if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });
  if (req.user.role === 'teacher' && tests[0].teacherId !== req.user.sub) return res.status(403).json({ error: 'You can only edit your own tests.' });
  const [[order]] = await pool.query('SELECT COALESCE(MAX(question_order), 0) + 1 AS nextOrder FROM test_questions WHERE test_id = ?', [req.params.id]);
  const [result] = await pool.query('INSERT INTO test_questions (test_id, question_order, question_type, prompt, options_json, answer_json, points) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.params.id, order.nextOrder, type, req.body.prompt.trim(), JSON.stringify(req.body.options || []), JSON.stringify(req.body.answer), Number(req.body.points || 1)]);
  res.status(201).json({ id: result.insertId, message: 'Question added.' });
});

app.post('/api/tests/:id/attempts', requireAuth, authorize('student'), async (req, res) => {
  const studentId = await getStudentForUser(req.user);
  if (!studentId) return res.status(404).json({ error: 'Student profile not found.' });
  const [tests] = await pool.query('SELECT t.id, t.duration_minutes AS durationMinutes FROM tests t JOIN student_classes sc ON sc.class_id = t.class_id WHERE t.id = ? AND sc.student_id = ? AND t.is_published = TRUE LIMIT 1', [req.params.id, studentId]);
  if (!tests[0]) return res.status(403).json({ error: 'This test is not available to you.' });
  const [existing] = await pool.query('SELECT id, started_at AS startedAt, submitted_at AS submittedAt, status FROM test_attempts WHERE test_id = ? AND student_id = ?', [req.params.id, studentId]);
  if (existing[0]) return res.json({ attempt: existing[0] });
  const [result] = await pool.query('INSERT INTO test_attempts (test_id, student_id, started_at) VALUES (?, ?, NOW())', [req.params.id, studentId]);
  res.status(201).json({ attempt: { id: result.insertId, startedAt: new Date(), durationMinutes: tests[0].durationMinutes } });
});

app.post('/api/test-attempts/:id/submit', requireAuth, authorize('student'), async (req, res) => {
  const studentId = await getStudentForUser(req.user);
  const [attempts] = await pool.query('SELECT a.id, a.test_id AS testId, a.started_at AS startedAt, a.status, t.duration_minutes AS durationMinutes FROM test_attempts a JOIN tests t ON t.id = a.test_id WHERE a.id = ? AND a.student_id = ? LIMIT 1', [req.params.id, studentId]);
  const attempt = attempts[0];
  if (!attempt) return res.status(404).json({ error: 'Test attempt not found.' });
  if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'This test attempt is already closed.' });
  const expired = Date.now() > new Date(attempt.startedAt).getTime() + attempt.durationMinutes * 60 * 1000;
  const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const [questions] = await pool.query('SELECT id, answer_json AS answer, points FROM test_questions WHERE test_id = ?', [attempt.testId]);
  let score = 0;
  questions.forEach((question) => { const expected = typeof question.answer === 'string' ? JSON.parse(question.answer) : question.answer; const actual = answers[String(question.id)]; if (JSON.stringify(expected) === JSON.stringify(actual)) score += Number(question.points); });
  const status = expired ? 'expired' : 'submitted';
  await pool.query('UPDATE test_attempts SET submitted_at = NOW(), score = ?, status = ? WHERE id = ?', [score, status, attempt.id]);
  res.json({ score, status, message: expired ? 'Time expired. Your answers were submitted automatically.' : 'Test submitted successfully.' });
});

app.post('/api/grades', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => {
  const studentId = Number(req.body?.studentId); const subjectId = Number(req.body?.subjectId); const score = Number(req.body?.score); const maxScore = Number(req.body?.maxScore);
  const error = bodyErrors(req.body, [['assessmentName', 'Assessment name', 120]]);
  if (error || ![studentId, subjectId, score, maxScore].every(Number.isFinite) || maxScore <= 0 || score < 0 || score > maxScore) return res.status(400).json({ error: error || 'Student, subject, score and maxScore must be valid.' });
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' });
  const [result] = await pool.query('INSERT INTO grades (student_id, subject_id, assessment_name, score, max_score, recorded_by) VALUES (?, ?, ?, ?, ?, ?)', [studentId, subjectId, req.body.assessmentName.trim(), score, maxScore, req.user.sub]);
  res.status(201).json({ id: result.insertId, message: 'Grade recorded.' });
});

app.get('/api/grades', requireAuth, async (req, res) => {
  const studentId = Number(req.query.studentId);
  if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'studentId is required.' });
  if (req.user.role === 'student' && (await getStudentForUser(req.user)) !== studentId) return res.status(403).json({ error: 'You can only view your own grades.' });
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' });
  if (req.user.role === 'parent') { const [linked] = await pool.query('SELECT 1 FROM parent_students WHERE parent_id = ? AND student_id = ?', [req.user.sub, studentId]); if (!linked.length) return res.status(403).json({ error: 'This student is not linked to your account.' }); }
  const [rows] = await pool.query('SELECT g.id, s.name AS subject, g.assessment_name AS assessmentName, g.score, g.max_score AS maxScore, g.created_at AS createdAt FROM grades g JOIN subjects s ON s.id = g.subject_id WHERE g.student_id = ? ORDER BY g.created_at DESC', [studentId]);
  res.json({ grades: rows });
});

app.patch('/api/grades/:id', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => {
  const [grades] = await pool.query('SELECT student_id AS studentId FROM grades WHERE id = ?', [req.params.id]); if (!grades[0]) return res.status(404).json({ error: 'Grade not found.' });
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, grades[0].studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' });
  const score = Number(req.body?.score); const maxScore = Number(req.body?.maxScore); if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) return res.status(400).json({ error: 'Score and maxScore are invalid.' });
  await pool.query('UPDATE grades SET score = ?, max_score = ?, assessment_name = COALESCE(?, assessment_name) WHERE id = ?', [score, maxScore, req.body.assessmentName?.trim() || null, req.params.id]); res.json({ message: 'Grade updated.' });
});

app.get('/api/teacher/attendance', requireAuth, authorize('teacher'), async (req, res) => {
  const classId = Number(req.query.classId); const date = req.query.date || new Date().toISOString().slice(0, 10); if (!Number.isInteger(classId)) return res.status(400).json({ error: 'classId is required.' });
  const [assigned] = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? LIMIT 1', [req.user.sub, classId]); if (!assigned.length) return res.status(403).json({ error: 'This class is outside your assignment.' });
  const [rows] = await pool.query(`SELECT s.id, s.full_name AS fullName, s.admission_number AS admissionNumber, COALESCE(a.status, 'unmarked') AS attendanceStatus FROM students s JOIN student_classes sc ON sc.student_id = s.id LEFT JOIN attendance a ON a.student_id = s.id AND a.attendance_date = ? WHERE sc.class_id = ? ORDER BY s.full_name`, [date, classId]); res.json({ date, students: rows });
});

app.post('/api/teacher/reports', requireAuth, authorize('teacher'), async (req, res) => {
  const studentId = Number(req.body?.studentId); const error = bodyErrors(req.body, [['message', 'Report message', 3000]]); if (error || !Number.isInteger(studentId)) return res.status(400).json({ error: error || 'Student and report message are required.' }); if (!(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' });
  const [[dos]] = await pool.query("SELECT id FROM users WHERE role = 'dos' AND is_active = TRUE ORDER BY id LIMIT 1"); if (!dos) return res.status(503).json({ error: 'No active DOS account is available.' }); await pool.query("INSERT INTO notifications (recipient_id, channel, title, message, sent_at) VALUES (?, 'in_app', ?, ?, NOW())", [dos.id, 'Teacher report submitted', req.body.message.trim()]); res.status(201).json({ message: 'Report sent to DOS.' });
});

app.post('/api/notices', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['title', 'Title', 180], ['body', 'Body', 5000]]);
  if (error) return res.status(400).json({ error });
  const audience = ['all', 'teachers', 'parents', 'students'].includes(req.body.audience) ? req.body.audience : 'all';
  const category = String(req.body.category || 'announcement').trim().slice(0, 60) || 'announcement';
  const [result] = await pool.query('INSERT INTO notices (title, body, category, audience, published_by) VALUES (?, ?, ?, ?, ?)', [req.body.title.trim(), req.body.body.trim(), category, audience, req.user.sub]);
  res.status(201).json({ id: result.insertId, message: 'Notice published.' });
});

app.get('/api/notices', requireAuth, async (req, res) => {
  const audience = ['all', req.user.role === 'teacher' ? 'teachers' : req.user.role === 'parent' ? 'parents' : 'students'];
  const [rows] = await pool.query('SELECT id, title, body, category, audience, published_at AS publishedAt FROM notices WHERE audience IN (?, ?) ORDER BY published_at DESC', audience);
  res.json({ notices: rows });
});

app.get('/api/publications', async (_req, res) => {
  const [notices] = await pool.query("SELECT id, title, body, category, 'notice' AS kind, published_at AS publishedAt, NULL AS storageKey, NULL AS mimeType FROM notices WHERE audience = 'all' ORDER BY published_at DESC");
  const [documents] = await pool.query("SELECT id, title, category, document_type AS documentType, 'document' AS kind, created_at AS publishedAt, storage_key AS storageKey, mime_type AS mimeType FROM documents WHERE visibility = 'public' ORDER BY created_at DESC");
  res.json({ publications: [...notices, ...documents].sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt)) });
});

app.get('/api/curriculum', async (_req, res) => {
  const [rows] = await pool.query('SELECT id, year_name AS yearName, title, description, file_url AS fileUrl, subject_name AS subjectName, created_at AS createdAt FROM curriculum_items ORDER BY year_name, title');
  res.json({ curriculum: rows });
});

app.post('/api/curriculum', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['yearName', 'Year', 80], ['title', 'Title', 180], ['description', 'Description', 10000]]);
  if (error) return res.status(400).json({ error });
  const [result] = await pool.query('INSERT INTO curriculum_items (year_name, title, description, file_url, subject_name, created_by) VALUES (?, ?, ?, ?, ?, ?)', [req.body.yearName.trim(), req.body.title.trim(), req.body.description.trim(), req.body.fileUrl?.trim() || null, req.body.subjectName?.trim() || null, req.user.sub]);
  res.status(201).json({ id: result.insertId, message: 'Curriculum item saved.' });
});

app.get('/api/news', async (_req, res) => {
  const [rows] = await pool.query('SELECT id, title, category, description, photo_url AS photoUrl, video_url AS videoUrl, event_date AS eventDate, created_at AS createdAt FROM news_posts ORDER BY COALESCE(event_date, created_at) DESC, id DESC');
  res.json({ news: rows });
});

app.post('/api/news', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['title', 'Title', 220], ['description', 'Description', 10000]]);
  if (error) return res.status(400).json({ error });
  const category = String(req.body.category || 'news').trim().slice(0, 60) || 'news';
  const [result] = await pool.query('INSERT INTO news_posts (title, category, description, photo_url, video_url, event_date, published_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.body.title.trim(), category, req.body.description.trim(), req.body.photoUrl?.trim() || null, req.body.videoUrl?.trim() || null, req.body.eventDate || null, req.user.sub]);
  res.status(201).json({ id: result.insertId, message: 'News post published.' });
});

app.post('/api/news/upload', requireAuth, authorize('admin', 'dos'), upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  const error = bodyErrors(req.body, [['title', 'Title', 220], ['description', 'Description', 10000]]);
  if (error) return res.status(400).json({ error });
  const files = req.files || {};
  const fileUrl = (file) => file ? `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${file.filename}` : null;
  const category = String(req.body.category || 'news').trim().slice(0, 60) || 'news';
  const photoUrl = fileUrl(files.photo?.[0]) || req.body.photoUrl?.trim() || null;
  const videoUrl = fileUrl(files.video?.[0]) || req.body.videoUrl?.trim() || null;
  try {
    const [result] = await pool.query('INSERT INTO news_posts (title, category, description, photo_url, video_url, event_date, published_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.body.title.trim(), category, req.body.description.trim(), photoUrl, videoUrl, req.body.eventDate || null, req.user.sub]);
    res.status(201).json({ id: result.insertId, photoUrl, videoUrl, message: 'News post published.' });
  } catch (uploadError) {
    Object.values(files).flat().forEach((file) => fs.rmSync(file.path, { force: true }));
    throw uploadError;
  }
});

app.get('/api/timetable', requireAuth, async (req, res) => {
  let query = `SELECT t.id, t.class_id AS classId, c.name AS className, t.subject_id AS subjectId, s.name AS subjectName, t.teacher_id AS teacherId, u.full_name AS teacherName, t.day_of_week AS dayOfWeek, t.starts_at AS startsAt, t.ends_at AS endsAt, t.room FROM timetable_entries t JOIN classes c ON c.id = t.class_id JOIN subjects s ON s.id = t.subject_id JOIN users u ON u.id = t.teacher_id`;
  const params = [];
  if (req.user.role === 'teacher') { query += ' WHERE t.teacher_id = ?'; params.push(req.user.sub); }
  else if (req.user.role === 'student') { query += ' JOIN student_classes sc ON sc.class_id = t.class_id JOIN students st ON st.id = sc.student_id WHERE st.user_id = ?'; params.push(req.user.sub); }
  else if (req.user.role === 'parent') { query += ' JOIN student_classes sc ON sc.class_id = t.class_id JOIN parent_students ps ON ps.student_id = sc.student_id WHERE ps.parent_id = ?'; params.push(req.user.sub); }
  query += ' ORDER BY t.day_of_week, t.starts_at';
  const [rows] = await pool.query(query, params); res.json({ timetable: rows });
});

app.post('/api/timetable', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const ids = ['classId', 'subjectId', 'teacherId'].map((key) => Number(req.body?.[key]));
  const day = Number(req.body?.dayOfWeek);
  if (!ids.every(Number.isInteger) || !Number.isInteger(day) || day < 1 || day > 7 || !/^\d{2}:\d{2}/.test(req.body?.startsAt || '') || !/^\d{2}:\d{2}/.test(req.body?.endsAt || '')) return res.status(400).json({ error: 'Class, subject, teacher, day and valid start/end times are required.' });
  const [result] = await pool.query('INSERT INTO timetable_entries (class_id, subject_id, teacher_id, day_of_week, starts_at, ends_at, room) VALUES (?, ?, ?, ?, ?, ?, ?)', [...ids, day, req.body.startsAt, req.body.endsAt, req.body.room?.trim() || null]);
  res.status(201).json({ id: result.insertId, message: 'Timetable entry created.' });
});

app.get('/api/teachers', requireAuth, authorize('admin', 'dos'), async (_req, res) => {
  const [rows] = await pool.query(`SELECT u.id, u.full_name AS fullName, u.email, u.phone, u.is_active AS isActive, tp.employee_number AS employeeNumber, tp.contract_type AS contractType, tp.contract_start AS contractStart, tp.contract_end AS contractEnd, tp.salary FROM users u LEFT JOIN teacher_profiles tp ON tp.user_id = u.id WHERE u.role = 'teacher' ORDER BY u.full_name`);
  res.json({ teachers: rows });
});

app.post('/api/teachers/:id/profile', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const userId = Number(req.params.id);
  const error = bodyErrors(req.body, [['employeeNumber', 'Employee number', 40]]);
  if (error || !Number.isInteger(userId)) return res.status(400).json({ error: error || 'A valid teacher id is required.' });
  const [teacher] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'teacher'", [userId]);
  if (!teacher.length) return res.status(404).json({ error: 'Teacher not found.' });
  await pool.query('INSERT INTO teacher_profiles (user_id, employee_number, national_id, contract_type, contract_start, contract_end, salary) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE employee_number = VALUES(employee_number), national_id = VALUES(national_id), contract_type = VALUES(contract_type), contract_start = VALUES(contract_start), contract_end = VALUES(contract_end), salary = VALUES(salary)', [userId, req.body.employeeNumber.trim(), req.body.nationalId?.trim() || null, ['permanent', 'temporary', 'part_time'].includes(req.body.contractType) ? req.body.contractType : 'permanent', req.body.contractStart || null, req.body.contractEnd || null, req.body.salary || null]);
  res.status(201).json({ message: 'Teacher profile saved.' });
});

app.post('/api/staff-attendance', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const userId = Number(req.body?.userId); const statuses = ['present', 'absent', 'late', 'leave'];
  if (!Number.isInteger(userId) || !statuses.includes(req.body?.status)) return res.status(400).json({ error: 'Valid userId and staff attendance status are required.' });
  await pool.query('INSERT INTO staff_attendance (user_id, attendance_date, status, marked_by) VALUES (?, COALESCE(?, CURRENT_DATE), ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)', [userId, req.body.date || null, req.body.status, req.user.sub]);
  res.status(201).json({ message: 'Staff attendance saved.' });
});
app.post('/api/hr/leave', requireAuth, async (req, res) => { const types = ['annual', 'sick', 'maternity', 'personal', 'other']; const error = bodyErrors(req.body, [['reason', 'Reason', 2000]]); if (error || !types.includes(req.body.leaveType) || !req.body.startsOn || !req.body.endsOn) return res.status(400).json({ error: error || 'Leave type, dates and reason are required.' }); const [result] = await pool.query('INSERT INTO leave_requests (user_id, leave_type, starts_on, ends_on, reason) VALUES (?, ?, ?, ?, ?)', [req.user.sub, req.body.leaveType, req.body.startsOn, req.body.endsOn, req.body.reason.trim()]); res.status(201).json({ id: result.insertId, status: 'pending', message: 'Leave request submitted.' }); });
app.get('/api/hr/leave', requireAuth, authorize('admin', 'dos'), async (_req, res) => { const [rows] = await pool.query('SELECT l.id, l.user_id AS userId, u.full_name AS fullName, l.leave_type AS leaveType, l.starts_on AS startsOn, l.ends_on AS endsOn, l.reason, l.status FROM leave_requests l JOIN users u ON u.id = l.user_id ORDER BY l.id DESC'); res.json({ requests: rows }); });
app.patch('/api/hr/leave/:id', requireAuth, authorize('admin', 'dos'), async (req, res) => { if (!['approved', 'rejected'].includes(req.body?.status)) return res.status(400).json({ error: 'Status must be approved or rejected.' }); const [result] = await pool.query('UPDATE leave_requests SET status = ?, reviewed_by = ? WHERE id = ?', [req.body.status, req.user.sub, req.params.id]); if (!result.affectedRows) return res.status(404).json({ error: 'Leave request not found.' }); res.json({ message: 'Leave request updated.' }); });

app.get('/api/finance/invoices', requireAuth, async (req, res) => {
  const params = []; let query = 'SELECT i.id, i.student_id AS studentId, st.full_name AS studentName, i.invoice_number AS invoiceNumber, i.description, i.amount, i.due_date AS dueDate, i.status FROM invoices i JOIN students st ON st.id = i.student_id';
  if (req.user.role === 'parent') { query += ' JOIN parent_students ps ON ps.student_id = i.student_id WHERE ps.parent_id = ?'; params.push(req.user.sub); }
  else if (req.user.role === 'student') { query += ' WHERE st.user_id = ?'; params.push(req.user.sub); }
  else if (!['admin', 'dos', 'accountant'].includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to view invoices.' });
  query += ' ORDER BY i.due_date DESC'; const [rows] = await pool.query(query, params); res.json({ invoices: rows });
});

app.post('/api/finance/payments', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => {
  const studentId = Number(req.body?.studentId); const amount = Number(req.body?.amount);
  if (!Number.isInteger(studentId) || !Number.isFinite(amount) || amount <= 0 || !req.body.reference?.trim()) return res.status(400).json({ error: 'Student, positive amount and payment reference are required.' });
  const [result] = await pool.query('INSERT INTO fees (student_id, amount, reference) VALUES (?, ?, ?)', [studentId, amount, req.body.reference.trim()]);
  res.status(201).json({ id: result.insertId, message: 'Payment recorded.' });
});
app.get('/api/finance/payments', requireAuth, async (req, res) => {
  const params = []; let query = 'SELECT f.id, f.student_id AS studentId, s.full_name AS studentName, f.amount, f.reference, f.paid_at AS paidAt FROM fees f JOIN students s ON s.id = f.student_id';
  if (req.user.role === 'parent') { query += ' JOIN parent_students ps ON ps.student_id = s.id WHERE ps.parent_id = ?'; params.push(req.user.sub); } else if (req.user.role === 'student') { query += ' WHERE s.user_id = ?'; params.push(req.user.sub); } else if (!['admin', 'dos', 'accountant'].includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to view payments.' });
  query += ' ORDER BY f.paid_at DESC'; const [rows] = await pool.query(query, params); res.json({ payments: rows });
});

app.post('/api/finance/invoices', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => {
  const studentId = Number(req.body?.studentId); const amount = Number(req.body?.amount);
  const error = bodyErrors(req.body, [['invoiceNumber', 'Invoice number', 60], ['description', 'Description', 180]]);
  if (error || !Number.isInteger(studentId) || !Number.isFinite(amount) || amount <= 0 || !req.body.dueDate) return res.status(400).json({ error: error || 'Student, positive amount and due date are required.' });
  const [result] = await pool.query('INSERT INTO invoices (student_id, invoice_number, description, amount, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?)', [studentId, req.body.invoiceNumber.trim(), req.body.description.trim(), amount, req.body.dueDate, req.user.sub]);
  res.status(201).json({ id: result.insertId, message: 'Invoice created.' });
});

app.get('/api/finance/expenses', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => { const [rows] = await pool.query('SELECT id, category, description, amount, spent_at AS spentAt FROM expenses ORDER BY spent_at DESC'); res.json({ expenses: rows }); });
app.post('/api/finance/expenses', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => {
  const amount = Number(req.body?.amount); const error = bodyErrors(req.body, [['category', 'Category', 100], ['description', 'Description', 180]]);
  if (error || !Number.isFinite(amount) || amount <= 0 || !req.body.spentAt) return res.status(400).json({ error: error || 'Category, description, positive amount and date are required.' });
  const [result] = await pool.query('INSERT INTO expenses (category, description, amount, spent_at, recorded_by) VALUES (?, ?, ?, ?, ?)', [req.body.category.trim(), req.body.description.trim(), amount, req.body.spentAt, req.user.sub]); res.status(201).json({ id: result.insertId, message: 'Expense recorded.' });
});
app.get('/api/finance/budgets', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => { const [rows] = await pool.query('SELECT id, name, fiscal_year AS fiscalYear, amount, status FROM budgets ORDER BY fiscal_year DESC'); res.json({ budgets: rows }); });
app.post('/api/finance/budgets', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const error = bodyErrors(req.body, [['name', 'Budget name', 120], ['fiscalYear', 'Fiscal year', 20]]); const amount = Number(req.body?.amount); if (error || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: error || 'Budget amount must be positive.' }); const [result] = await pool.query('INSERT INTO budgets (name, fiscal_year, amount, status, created_by) VALUES (?, ?, ?, ?, ?)', [req.body.name.trim(), req.body.fiscalYear.trim(), amount, req.body.status === 'approved' ? 'approved' : 'draft', req.user.sub]); res.status(201).json({ id: result.insertId, message: 'Budget saved.' }); });

app.get('/api/transport/routes', requireAuth, async (_req, res) => { const [rows] = await pool.query('SELECT id, name, bus_number AS busNumber, driver_name AS driverName, driver_phone AS driverPhone, capacity, is_active AS isActive FROM transport_routes ORDER BY name'); res.json({ routes: rows }); });
app.post('/api/transport/routes', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => {
  const error = bodyErrors(req.body, [['name', 'Route name', 100], ['busNumber', 'Bus number', 40], ['driverName', 'Driver name', 120], ['driverPhone', 'Driver phone', 30]]); const capacity = Number(req.body?.capacity);
  if (error || !Number.isInteger(capacity) || capacity < 1) return res.status(400).json({ error: error || 'Capacity must be a positive whole number.' });
  const [result] = await pool.query('INSERT INTO transport_routes (name, bus_number, driver_name, driver_phone, capacity) VALUES (?, ?, ?, ?, ?)', [req.body.name.trim(), req.body.busNumber.trim(), req.body.driverName.trim(), req.body.driverPhone.trim(), capacity]); res.status(201).json({ id: result.insertId, message: 'Transport route created.' });
});
app.post('/api/transport/assign', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const studentId = Number(req.body?.studentId); const routeId = Number(req.body?.routeId); if (!Number.isInteger(studentId) || !Number.isInteger(routeId) || !req.body.pickupPoint?.trim()) return res.status(400).json({ error: 'Student, route and pickup point are required.' }); await pool.query('INSERT INTO student_transport (student_id, route_id, pickup_point) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE route_id = VALUES(route_id), pickup_point = VALUES(pickup_point)', [studentId, routeId, req.body.pickupPoint.trim()]); res.status(201).json({ message: 'Student transport assigned.' }); });

app.get('/api/inventory', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => { const [rows] = await pool.query('SELECT id, name, category, quantity, reorder_level AS reorderLevel, unit_cost AS unitCost, location FROM inventory_items ORDER BY name'); res.json({ items: rows }); });
app.post('/api/inventory', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const error = bodyErrors(req.body, [['name', 'Item name', 140], ['category', 'Category', 80]]); const quantity = Number(req.body?.quantity); if (error || !Number.isFinite(quantity) || quantity < 0) return res.status(400).json({ error: error || 'A non-negative quantity is required.' }); const [result] = await pool.query('INSERT INTO inventory_items (name, category, quantity, reorder_level, unit_cost, location, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.body.name.trim(), req.body.category.trim(), quantity, Number(req.body.reorderLevel || 0), Number(req.body.unitCost || 0), req.body.location?.trim() || null, req.user.sub]); res.status(201).json({ id: result.insertId, message: 'Inventory item created.' }); });
app.get('/api/assets', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => { const [rows] = await pool.query('SELECT id, name, asset_tag AS assetTag, category, condition_status AS conditionStatus, location, assigned_to AS assignedTo, acquired_on AS acquiredOn FROM assets ORDER BY name'); res.json({ assets: rows }); });
app.post('/api/assets', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const error = bodyErrors(req.body, [['name', 'Asset name', 140], ['assetTag', 'Asset tag', 60], ['category', 'Category', 80]]); if (error) return res.status(400).json({ error }); const [result] = await pool.query('INSERT INTO assets (name, asset_tag, category, condition_status, location, assigned_to, acquired_on) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.body.name.trim(), req.body.assetTag.trim(), req.body.category.trim(), ['new', 'good', 'repair', 'retired'].includes(req.body.conditionStatus) ? req.body.conditionStatus : 'good', req.body.location?.trim() || null, req.body.assignedTo || null, req.body.acquiredOn || null]); res.status(201).json({ id: result.insertId, message: 'Asset recorded.' }); });

app.get('/api/library/books', requireAuth, async (_req, res) => { const [rows] = await pool.query('SELECT id, isbn, title, author, subject, quantity, available_quantity AS availableQuantity, shelf FROM library_books ORDER BY title'); res.json({ books: rows }); });
app.post('/api/library/books', requireAuth, authorize('admin', 'dos', 'librarian'), async (req, res) => { const error = bodyErrors(req.body, [['title', 'Book title', 180], ['author', 'Author', 140]]); const quantity = Number(req.body?.quantity); if (error || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: error || 'Quantity must be a positive whole number.' }); const [result] = await pool.query('INSERT INTO library_books (isbn, title, author, subject, quantity, available_quantity, shelf, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.body.isbn?.trim() || null, req.body.title.trim(), req.body.author.trim(), req.body.subject?.trim() || null, quantity, quantity, req.body.shelf?.trim() || null, req.user.sub]); res.status(201).json({ id: result.insertId, message: 'Book added.' }); });
app.get('/api/library/loans', requireAuth, async (req, res) => { let query = 'SELECT l.id, l.book_id AS bookId, b.title, l.student_id AS studentId, s.full_name AS studentName, l.issued_at AS issuedAt, l.due_at AS dueAt, l.returned_at AS returnedAt FROM library_loans l JOIN library_books b ON b.id = l.book_id JOIN students s ON s.id = l.student_id'; const params = []; if (req.user.role === 'student') { query += ' WHERE s.user_id = ?'; params.push(req.user.sub); } else if (req.user.role === 'parent') { query += ' JOIN parent_students ps ON ps.student_id = s.id WHERE ps.parent_id = ?'; params.push(req.user.sub); } else if (!['admin', 'dos', 'librarian'].includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to view library loans.' }); query += ' ORDER BY l.due_at DESC'; const [rows] = await pool.query(query, params); res.json({ loans: rows }); });
app.post('/api/library/loans', requireAuth, authorize('admin', 'dos', 'librarian'), async (req, res) => { const bookId = Number(req.body?.bookId); const studentId = Number(req.body?.studentId); if (!Number.isInteger(bookId) || !Number.isInteger(studentId) || !req.body.dueAt) return res.status(400).json({ error: 'Book, student and due date are required.' }); const connection = await pool.getConnection(); try { await connection.beginTransaction(); const [books] = await connection.query('SELECT available_quantity AS availableQuantity FROM library_books WHERE id = ? FOR UPDATE', [bookId]); if (!books[0] || books[0].availableQuantity < 1) { await connection.rollback(); return res.status(409).json({ error: 'This book is not available.' }); } const [result] = await connection.query('INSERT INTO library_loans (book_id, student_id, issued_at, due_at, issued_by) VALUES (?, ?, CURRENT_DATE, ?, ?)', [bookId, studentId, req.body.dueAt, req.user.sub]); await connection.query('UPDATE library_books SET available_quantity = available_quantity - 1 WHERE id = ?', [bookId]); await connection.commit(); res.status(201).json({ id: result.insertId, message: 'Book loan recorded.' }); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } });
app.patch('/api/library/loans/:id/return', requireAuth, authorize('admin', 'dos', 'librarian'), async (req, res) => { const [result] = await pool.query('UPDATE library_loans l JOIN library_books b ON b.id = l.book_id SET l.returned_at = CURRENT_DATE, b.available_quantity = b.available_quantity + 1 WHERE l.id = ? AND l.returned_at IS NULL', [req.params.id]); if (!result.affectedRows) return res.status(404).json({ error: 'Active loan not found.' }); res.json({ message: 'Book returned.' }); });

app.get('/api/feeding/stock', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => { const [rows] = await pool.query('SELECT id, item_name AS itemName, quantity, unit, reorder_level AS reorderLevel FROM feeding_stock ORDER BY item_name'); res.json({ stock: rows }); });
app.post('/api/feeding/stock', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const error = bodyErrors(req.body, [['itemName', 'Item name', 120], ['unit', 'Unit', 30]]); const quantity = Number(req.body?.quantity); if (error || !Number.isFinite(quantity) || quantity < 0) return res.status(400).json({ error: error || 'A non-negative quantity is required.' }); const [result] = await pool.query('INSERT INTO feeding_stock (item_name, quantity, unit, reorder_level, updated_by) VALUES (?, ?, ?, ?, ?)', [req.body.itemName.trim(), quantity, req.body.unit.trim(), Number(req.body.reorderLevel || 0), req.user.sub]); res.status(201).json({ id: result.insertId, message: 'Feeding stock saved.' }); });
app.post('/api/feeding/records', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => { const studentId = Number(req.body?.studentId); if (!Number.isInteger(studentId) || !req.body.mealType?.trim()) return res.status(400).json({ error: 'Student and meal type are required.' }); await pool.query('INSERT INTO feeding_records (student_id, feeding_date, served, meal_type, recorded_by) VALUES (?, COALESCE(?, CURRENT_DATE), ?, ?, ?) ON DUPLICATE KEY UPDATE served = VALUES(served), recorded_by = VALUES(recorded_by)', [studentId, req.body.date || null, req.body.served !== false, req.body.mealType.trim(), req.user.sub]); res.status(201).json({ message: 'Feeding record saved.' }); });

app.get('/api/documents', requireAuth, async (req, res) => { const allowed = { admin: ['public', 'admin', 'dos', 'staff', 'parent', 'student'], dos: ['public', 'dos', 'staff', 'parent', 'student'], teacher: ['staff'], accountant: ['staff'], librarian: ['staff'], parent: ['parent'], student: ['student'] }; const visibility = allowed[req.user.role] || []; const placeholders = visibility.map(() => '?').join(','); const [rows] = await pool.query(`SELECT id, title, category, document_type AS documentType, storage_key AS storageKey, mime_type AS mimeType, file_size AS fileSize, visibility, created_at AS createdAt FROM documents WHERE visibility IN (${placeholders}) OR uploaded_by = ? ORDER BY created_at DESC`, [...visibility, req.user.sub]); res.json({ documents: rows }); });
app.post('/api/documents', requireAuth, authorize('admin', 'dos'), async (req, res) => { const error = bodyErrors(req.body, [['title', 'Title', 180], ['storageKey', 'File URL', 255], ['mimeType', 'MIME type', 100]]); const fileSize = Number(req.body?.fileSize || 0); if (error || !Number.isInteger(fileSize) || fileSize < 0) return res.status(400).json({ error: error || 'A valid non-negative file size is required.' }); const types = ['contract', 'certificate', 'letter', 'policy', 'report', 'other']; const visibility = ['public', 'admin', 'dos', 'staff', 'parent', 'student']; const category = String(req.body.category || 'general').trim().slice(0, 60) || 'general'; const [result] = await pool.query('INSERT INTO documents (title, category, document_type, storage_key, mime_type, file_size, visibility, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.body.title.trim(), category, types.includes(req.body.documentType) ? req.body.documentType : 'other', req.body.storageKey.trim(), req.body.mimeType.trim(), fileSize, visibility.includes(req.body.visibility) ? req.body.visibility : 'admin', req.user.sub]); res.status(201).json({ id: result.insertId, message: 'Document registered.' }); });
app.post('/api/documents/upload', requireAuth, authorize('admin', 'dos'), upload.single('file'), async (req, res) => { const error = bodyErrors(req.body, [['title', 'Title', 180]]); const types = ['contract', 'certificate', 'letter', 'policy', 'report', 'other']; const visibility = ['public', 'admin', 'dos', 'staff', 'parent', 'student']; if (error || !req.file) { if (req.file) fs.rmSync(req.file.path, { force: true }); return res.status(400).json({ error: error || 'Choose a file to upload.' }); } const category = String(req.body.category || 'general').trim().slice(0, 60) || 'general'; const documentType = types.includes(req.body.documentType) ? req.body.documentType : 'other'; const documentVisibility = visibility.includes(req.body.visibility) ? req.body.visibility : 'admin'; const storageKey = `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${req.file.filename}`; try { const [result] = await pool.query('INSERT INTO documents (title, category, document_type, storage_key, mime_type, file_size, visibility, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.body.title.trim(), category, documentType, storageKey, req.file.mimetype, req.file.size, documentVisibility, req.user.sub]); res.status(201).json({ id: result.insertId, storageKey, message: 'Document uploaded.' }); } catch (uploadError) { fs.rmSync(req.file.path, { force: true }); throw uploadError; } });

app.get('/api/homework', requireAuth, async (req, res) => { let query = 'SELECT h.id, h.title, h.description, h.class_id AS classId, h.subject_id AS subjectId, h.teacher_id AS teacherId, h.due_date AS dueDate FROM homework h'; const params = []; if (req.user.role === 'teacher') { query += ' WHERE h.teacher_id = ?'; params.push(req.user.sub); } else if (req.user.role === 'student') { query += ' JOIN student_classes sc ON sc.class_id = h.class_id JOIN students s ON s.id = sc.student_id WHERE s.user_id = ?'; params.push(req.user.sub); } else if (req.user.role === 'parent') { query += ' JOIN student_classes sc ON sc.class_id = h.class_id JOIN parent_students ps ON ps.student_id = sc.student_id WHERE ps.parent_id = ?'; params.push(req.user.sub); } query += ' ORDER BY h.due_date'; const [rows] = await pool.query(query, params); res.json({ homework: rows }); });
app.post('/api/homework', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => { const ids = [Number(req.body?.classId), Number(req.body?.subjectId)]; const error = bodyErrors(req.body, [['title', 'Title', 180], ['description', 'Description', 5000]]); if (error || !ids.every(Number.isInteger) || !req.body.dueDate) return res.status(400).json({ error: error || 'Class, subject and due date are required.' }); if (req.user.role === 'teacher') { const [assignment] = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND subject_id = ?', [req.user.sub, ...ids]); if (!assignment.length) return res.status(403).json({ error: 'You can only create homework for your assignments.' }); } const [result] = await pool.query('INSERT INTO homework (title, description, class_id, subject_id, teacher_id, due_date) VALUES (?, ?, ?, ?, ?, ?)', [req.body.title.trim(), req.body.description.trim(), ...ids, req.user.sub, req.body.dueDate]); res.status(201).json({ id: result.insertId, message: 'Homework created.' }); });

app.get('/api/notifications', requireAuth, async (req, res) => { const [rows] = await pool.query('SELECT id, channel, title, message, sent_at AS sentAt, read_at AS readAt, created_at AS createdAt FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 100', [req.user.sub]); res.json({ notifications: rows }); });
app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => { const [result] = await pool.query('UPDATE notifications SET read_at = NOW() WHERE id = ? AND recipient_id = ?', [req.params.id, req.user.sub]); if (!result.affectedRows) return res.status(404).json({ error: 'Notification not found.' }); res.json({ message: 'Notification marked as read.' }); });
app.post('/api/notifications', requireAuth, authorize('admin', 'dos'), async (req, res) => { const recipientId = Number(req.body?.recipientId); const error = bodyErrors(req.body, [['title', 'Title', 180], ['message', 'Message', 5000]]); const channels = ['in_app', 'email', 'sms', 'whatsapp']; if (error || !Number.isInteger(recipientId) || !channels.includes(req.body.channel)) return res.status(400).json({ error: error || 'Recipient, channel, title and message are required.' }); const [result] = await pool.query('INSERT INTO notifications (recipient_id, channel, title, message, sent_at) VALUES (?, ?, ?, ?, NOW())', [recipientId, req.body.channel, req.body.title.trim(), req.body.message.trim()]); res.status(201).json({ id: result.insertId, message: 'Notification queued.' }); });

app.post('/api/behavior', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => { const studentId = Number(req.body?.studentId); const categories = ['excellent', 'good', 'needs_improvement', 'discipline']; const error = bodyErrors(req.body, [['note', 'Behavior note', 3000]]); if (error || !Number.isInteger(studentId) || !categories.includes(req.body.category)) return res.status(400).json({ error: error || 'Student, category and note are required.' }); if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' }); const [result] = await pool.query('INSERT INTO behavior_records (student_id, category, note, recorded_by) VALUES (?, ?, ?, ?)', [studentId, req.body.category, req.body.note.trim(), req.user.sub]); res.status(201).json({ id: result.insertId, message: 'Behavior record saved.' }); });
app.get('/api/behavior', requireAuth, async (req, res) => { const studentId = Number(req.query.studentId); if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'studentId is required.' }); if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' }); if (req.user.role === 'student' && (await getStudentForUser(req.user)) !== studentId) return res.status(403).json({ error: 'You can only view your own behavior records.' }); if (req.user.role === 'parent') { const [linked] = await pool.query('SELECT 1 FROM parent_students WHERE parent_id = ? AND student_id = ?', [req.user.sub, studentId]); if (!linked.length) return res.status(403).json({ error: 'This student is not linked to your account.' }); } const [rows] = await pool.query('SELECT id, category, note, created_at AS createdAt FROM behavior_records WHERE student_id = ? ORDER BY created_at DESC', [studentId]); res.json({ records: rows }); });
app.get('/api/students/:id/report', requireAuth, async (req, res) => { const studentId = Number(req.params.id); if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'A valid student id is required.' }); if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' }); if (req.user.role === 'student' && (await getStudentForUser(req.user)) !== studentId) return res.status(403).json({ error: 'You can only view your own report.' }); if (req.user.role === 'parent') { const [linked] = await pool.query('SELECT 1 FROM parent_students WHERE parent_id = ? AND student_id = ?', [req.user.sub, studentId]); if (!linked.length) return res.status(403).json({ error: 'This student is not linked to your account.' }); } const [[student]] = await pool.query('SELECT id, admission_number AS admissionNumber, full_name AS fullName, class_name AS className, status FROM students WHERE id = ?', [studentId]); if (!student) return res.status(404).json({ error: 'Student not found.' }); const [grades] = await pool.query('SELECT s.name AS subject, SUM(g.score) AS score, SUM(g.max_score) AS maxScore FROM grades g JOIN subjects s ON s.id = g.subject_id WHERE g.student_id = ? GROUP BY g.subject_id, s.name ORDER BY s.name', [studentId]); const [attendance] = await pool.query("SELECT status, COUNT(*) AS total FROM attendance WHERE student_id = ? GROUP BY status", [studentId]); const [behavior] = await pool.query('SELECT category, note, created_at AS createdAt FROM behavior_records WHERE student_id = ? ORDER BY created_at DESC LIMIT 20', [studentId]); res.json({ student, grades, attendance, behavior }); });

app.get('/api/parent/summary', requireAuth, authorize('parent'), async (req, res) => { const [rows] = await pool.query(`SELECT s.id, s.full_name AS fullName, s.admission_number AS admissionNumber, s.class_name AS className, COALESCE((SELECT SUM(f.amount) FROM fees f WHERE f.student_id = s.id), 0) AS feesPaid, (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'absent') AS absences FROM students s JOIN parent_students ps ON ps.student_id = s.id WHERE ps.parent_id = ?`, [req.user.sub]); res.json({ children: rows }); });

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'An unexpected server error occurred.' }); });

app.listen(port, () => console.log(`FKAMS API listening on http://localhost:${port}`));
