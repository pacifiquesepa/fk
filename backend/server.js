require('dotenv').config();

const express = require('express');
const { runPendingMigrations } = require('./migrations');
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
const allowedOrigins = new Set([
  allowedOrigin,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
].filter(Boolean));
const otpRoles = new Set((process.env.OTP_ROLES || 'admin,dos,parent,teacher,accountant,librarian').split(',').map((role) => role.trim()).filter(Boolean));
const emailLoginRoles = new Set(['teacher', 'dos', 'admin', 'accountant', 'librarian']);
const otpChannel = process.env.OTP_CHANNEL === 'sms' ? 'sms' : 'email';
const otpExpiresMinutes = Math.max(1, Number(process.env.OTP_EXPIRES_MINUTES || 5));
const otpMaxAttempts = Math.max(1, Number(process.env.OTP_MAX_ATTEMPTS || 5));
const smtpPassword = String(process.env.SMTP_PASSWORD || '').replace(/\s/g, '');

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

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", 'http://localhost:5173', 'http://127.0.0.1:5173'],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
const rateLimitWindowMs = 60 * 1000;
const rateLimitMaxRequests = 120;
const rateLimitStore = new Map();
app.use((req, res, next) => {
  const key = `${req.ip || 'unknown'}:${req.path}`;
  const now = Date.now();
  const bucket = rateLimitStore.get(key) || { count: 0, resetAt: now + rateLimitWindowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + rateLimitWindowMs;
  }
  bucket.count += 1;
  if (bucket.count > rateLimitMaxRequests) {
    res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  rateLimitStore.set(key, bucket);
  next();
});
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
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}
function explainSmtpError(error) {
  const message = error && (error.message || String(error));
  if (!message) return 'SMTP delivery failed.';
  if (/535|5\.7\.9|WebLoginRequired|web login required|Invalid login/i.test(message)) {
    return 'Gmail rejected the SMTP login. Generate a 16-character Google App Password for the Gmail account and set it as SMTP_PASSWORD in backend/.env. Do not use your normal Gmail password.';
  }
  return message;
}
function createSmtpTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: smtpPassword },
  });
}
async function deliverOtp({ code, destination, channel }) {
  if (channel === 'email' && process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword && !smtpPassword.includes('PUT_YOUR_')) {
    const transporter = createSmtpTransport();
    try {
      await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: destination, subject: 'FKAMS password verification code', text: `Your FKAMS verification code is ${code}. It expires in two minutes.`, html: `<p>Your FKAMS verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in two minutes. If you did not request it, you can ignore this email.</p>` });
      return;
    } catch (error) {
      const friendlyError = explainSmtpError(error);
      console.error(`[FKAMS SMTP] ${friendlyError}`);
      throw new Error(friendlyError);
    }
  }
  if (process.env.OTP_PROVIDER === 'console' || !process.env.OTP_PROVIDER) {
    console.log(`[FKAMS OTP] ${channel} to ${maskDestination(destination, channel)}: ${code}`);
    return;
  }
  throw new Error('OTP provider is configured but no delivery adapter is installed.');
}
async function deliverAdmissionNotice({ destination, name, status, admissionNumber, username, temporaryPassword }) {
  if (!destination || !destination.includes('@')) throw Object.assign(new Error('A valid parent email is required before changing the application status.'), { statusCode: 422 });
  const approved = status === 'approved';
  const subject = approved ? 'FKAMS admission approved' : 'FKAMS admission application update';
  const text = approved
    ? `Dear parent, ${name}'s application has been approved. Admission number: ${admissionNumber}. Login username: ${username}. Default password: ${temporaryPassword}. Please change the password after your first login.`
    : `Dear parent, ${name}'s application was not approved at this time. Please contact Forever King Academy admissions for more information.`;
  if (destination.includes('@') && process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword && !smtpPassword.includes('PUT_YOUR_')) {
    const transporter = createSmtpTransport();
    const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'forever.jpg');
    const logoUrl = fs.existsSync(logoPath) ? 'cid:fkams-logo' : (process.env.PUBLIC_LOGO_URL || `${allowedOrigin}/forever.jpg`);
    const html = approved
      ? `<div style="font-family:Arial,sans-serif;max-width:600px;color:#17333d"><img src="${escapeHtml(logoUrl)}" alt="Forever King Academy" style="max-width:220px;max-height:80px;object-fit:contain"><h2 style="color:#1d7b91">Application approved</h2><p>Dear parent,</p><p><strong>${escapeHtml(name)}</strong>'s application has been approved.</p><div style="background:#eef8f6;border-radius:10px;padding:16px"><p><strong>Admission number:</strong> ${escapeHtml(admissionNumber)}</p><p><strong>Login username:</strong> ${escapeHtml(username)}</p><p><strong>Default password:</strong> ${escapeHtml(temporaryPassword)}</p></div><p>Use the admission number as the username to access FKAMS. Please change the password after your first login.</p><p><a href="${escapeHtml(allowedOrigin)}" style="display:inline-block;background:#1d7b91;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Login now</a></p><p>Welcome to Forever King Academy.</p></div>`
      : `<div style="font-family:Arial,sans-serif;max-width:600px;color:#17333d"><img src="${escapeHtml(logoUrl)}" alt="Forever King Academy" style="max-width:220px;max-height:80px;object-fit:contain"><h2 style="color:#1d7b91">Application update</h2><p>Dear parent,</p><p>We are sorry to inform you that <strong>${escapeHtml(name)}</strong>'s application was not approved at this time.</p><p><a href="tel:+250788390989" style="display:inline-block;background:#1d7b91;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Contact admissions: +250 788 390 989</a></p></div>`;
    try {
      await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: destination, subject, text, html, ...(fs.existsSync(logoPath) ? { attachments: [{ filename: 'forever.jpg', path: logoPath, cid: 'fkams-logo' }] } : {}) });
      return 'email';
    } catch (error) {
      const friendlyError = explainSmtpError(error);
      console.error(`[FKAMS SMTP] ${friendlyError}`);
      throw new Error(friendlyError);
    }
  }
  throw Object.assign(new Error('Gmail SMTP is not configured. The application status was not changed.'), { statusCode: 503 });
}
async function deliverApplicationReceived({ destination, name }) {
  if (!destination || !destination.includes('@')) throw Object.assign(new Error('A valid parent email is required.'), { statusCode: 422 });
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !smtpPassword || smtpPassword.includes('PUT_YOUR_')) throw Object.assign(new Error('Gmail SMTP is not configured. The application was not submitted.'), { statusCode: 503 });
  const transporter = createSmtpTransport();
  const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'forever.jpg');
  const logoUrl = fs.existsSync(logoPath) ? 'cid:fkams-logo' : (process.env.PUBLIC_LOGO_URL || `${allowedOrigin}/forever.jpg`);
  const safeName = escapeHtml(name);
  const text = `Congratulations. Dear parent, ${name}'s application was submitted successfully. Our admissions team will review it and contact you by email. Please wait for the approval decision.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;color:#17333d"><img src="${escapeHtml(logoUrl)}" alt="Forever King Academy" style="max-width:220px;max-height:80px;object-fit:contain"><h2 style="color:#1d7b91">Congratulations, application submitted</h2><p>Dear parent,</p><p><strong>${safeName}</strong>'s application was submitted successfully.</p><div style="background:#eef8f6;border-radius:10px;padding:16px"><p>Our admissions team will review the application and contact you by email.</p><p style="margin-bottom:0"><strong>Status:</strong> Waiting for approval</p></div><p>Please wait for the approval decision. You will receive another email when the application is approved or rejected.</p></div>`;
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: destination, subject: 'Congratulations, FKAMS application submitted', text, html, ...(fs.existsSync(logoPath) ? { attachments: [{ filename: 'forever.jpg', path: logoPath, cid: 'fkams-logo' }] } : {}) });
    return 'email';
  } catch (error) {
    const friendlyError = explainSmtpError(error);
    console.error(`[FKAMS SMTP] ${friendlyError}`);
    throw new Error(friendlyError);
  }
}
async function notifyAdmission({ application, status, admissionNumber, username, temporaryPassword }) {
  const destination = application.parent_email || application.parent_phone;
  return deliverAdmissionNotice({ destination, name: application.applicant_name, status, admissionNumber, username, temporaryPassword });
}
async function createStudentForApplication(connection, application) {
  const admissionNumber = `FK-${new Date().getFullYear()}-${String(application.id).padStart(5, '0')}`;
  const username = admissionNumber.toLowerCase();
  const email = `student${application.id}@fkams.local`;
  const temporaryPassword = `FK${crypto.randomInt(100000, 1000000)}!`;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const [userResult] = await connection.query('INSERT INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, \'student\')', [application.applicant_name, username, email, passwordHash]);
  const qrToken = crypto.randomUUID();
  const [studentResult] = await connection.query(`INSERT INTO students (user_id, admission_number, full_name, gender, birthday, academic_year, class_name, parent_phone, qr_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userResult.insertId, admissionNumber, application.applicant_name, application.gender || 'other', application.birthday || '2000-01-01', application.academic_year || String(new Date().getFullYear()), application.desired_class, application.parent_phone, qrToken]);
  const [[classRow]] = await connection.query('SELECT id FROM classes WHERE name = ? AND academic_year = ? AND is_active = TRUE LIMIT 1', [application.desired_class, application.academic_year]);
  if (classRow) await connection.query('INSERT IGNORE INTO student_classes (student_id, class_id, enrolled_at) VALUES (?, ?, CURRENT_DATE)', [studentResult.insertId, classRow.id]);
  await connection.query('UPDATE applications SET approved_student_id = ? WHERE id = ?', [studentResult.insertId, application.id]);
  return { admissionNumber, username, temporaryPassword, qrToken, studentId: studentResult.insertId };
}
async function processEnrollmentQueue() {
  const connection = await pool.getConnection();
  try {
    const [queued] = await connection.query("SELECT * FROM applications WHERE status = 'approved' AND approved_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND approved_student_id IS NULL ORDER BY approved_at ASC LIMIT 20");
    for (const queuedApplication of queued) {
      try {
        await connection.beginTransaction();
        const [[application]] = await connection.query("SELECT * FROM applications WHERE id = ? AND status = 'approved' AND approved_student_id IS NULL FOR UPDATE", [queuedApplication.id]);
        if (!application) { await connection.rollback(); continue; }
        const student = await createStudentForApplication(connection, application);
        await notifyAdmission({ application, status: 'approved', admissionNumber: student.admissionNumber, username: student.username, temporaryPassword: student.temporaryPassword });
        await connection.commit();
      } catch (error) { await connection.rollback(); console.error(`[FKAMS enrollment queue] ${error.message}`); }
    }
  } finally { connection.release(); }
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
  return { token, user: { id: user.id, name: user.full_name, email: user.email, phone: user.phone || null, photoKey: user.photo_key || user.photoKey || null, role: user.role } };
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
    const emailLogin = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    if (!user || (emailLoginRoles.has(user.role) && (!emailLogin || !user.email || user.email.toLowerCase() !== identifier)) || !user.is_active || !(await bcrypt.compare(req.body.password, user.password_hash))) {
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

app.patch('/api/auth/profile', requireAuth, async (req, res) => {
  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : null;
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!fullName || fullName.length > 120) return res.status(400).json({ error: 'Full name is required and must be at most 120 characters.' });
  if (newPassword && (!currentPassword || newPassword.length < 8)) return res.status(400).json({ error: 'Current password is required and the new password must be at least 8 characters.' });
  try {
    const [[user]] = await pool.query('SELECT id, email, role, phone, photo_key AS photoKey, password_hash AS passwordHash FROM users WHERE id = ? AND is_active = TRUE LIMIT 1', [req.user.sub]);
    if (!user) return res.status(404).json({ error: 'User account not found.' });
    const updates = ['full_name = ?', 'phone = ?'];
    const values = [fullName, phone || null];
    if (newPassword) {
      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ error: 'Current password is incorrect.' });
      updates.push('password_hash = ?');
      values.push(await bcrypt.hash(newPassword, 12));
    }
    values.push(user.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Profile updated successfully.', user: { id: user.id, name: fullName, email: user.email, role: user.role, phone: phone || null, photoKey: user.photoKey || null } });
  } catch (error) {
    console.error(error.message);
    res.status(503).json({ error: 'Unable to update profile.' });
  }
});

app.post('/api/auth/profile/photo-upload', requireAuth, upload.single('photo'), async (req, res) => {
  if (!req.file || !req.file.mimetype.startsWith('image/')) { if (req.file) fs.rmSync(req.file.path, { force: true }); return res.status(400).json({ error: 'Choose a valid image.' }); }
  const photoKey = `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${req.file.filename}`;
  try {
    const [result] = await pool.query('UPDATE users SET photo_key = ? WHERE id = ? AND is_active = TRUE', [photoKey, req.user.sub]);
    if (!result.affectedRows) { fs.rmSync(req.file.path, { force: true }); return res.status(404).json({ error: 'User account not found.' }); }
    res.json({ photoKey, message: 'Profile photo uploaded.' });
  } catch (error) { fs.rmSync(req.file.path, { force: true }); throw error; }
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
    if (!user || (emailLoginRoles.has(user.role) && (!user.email || user.email.toLowerCase() !== identifier || !identifier.includes('@'))) || !user.is_active || !user.email) return res.status(404).json({ error: 'No active account was found with that email.' });
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
  const username = req.body.username.trim().toLowerCase();
  const email = req.body.email.trim().toLowerCase();
  const [existingUsers] = await pool.query('SELECT username, email FROM users WHERE username = ? OR email = ? LIMIT 1', [username, email]);
  if (existingUsers[0]) {
    if (existingUsers[0].email === email) return res.status(409).json({ error: 'This email is already registered. Use a different email or edit the existing account.' });
    return res.status(409).json({ error: 'This username is already in use. Choose a different username.' });
  }
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  try {
    const [result] = await pool.query('INSERT INTO users (full_name, username, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)', [req.body.fullName.trim(), username, email, req.body.phone?.trim() || null, passwordHash, req.body.role]);
    res.status(201).json({ id: result.insertId, message: 'User created.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicateField = error.message.includes('username') ? 'username' : 'email';
      return res.status(409).json({ error: `This ${duplicateField} is already in use. Choose a different ${duplicateField}.` });
    }
    throw error;
  }
});

app.get('/api/users', requireAuth, authorize('admin'), async (_req, res) => {
  const [rows] = await pool.query(`SELECT u.id, u.full_name AS fullName, u.username, u.email, u.phone, u.role, u.is_active AS isActive, u.created_at AS createdAt,
    s.id AS profileId, s.admission_number AS admissionNumber, s.class_name AS className, s.parent_phone AS parentPhone, s.gender, s.birthday, s.academic_year AS academicYear,
    tp.employee_number AS employeeNumber, tp.subject_or_module AS subjectOrModule, tp.gender, tp.birthday, tp.diploma_key AS diplomaKey
    FROM users u LEFT JOIN students s ON s.user_id = u.id LEFT JOIN teacher_profiles tp ON tp.user_id = u.id ORDER BY u.full_name`);
  res.json({ users: rows });
});

app.patch('/api/users/:id', requireAuth, authorize('admin'), async (req, res) => {
  const userId = Number(req.params.id); const roles = ['admin', 'dos', 'teacher', 'student', 'parent', 'accountant', 'librarian'];
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'A valid user id is required.' });
  if (req.body.role !== undefined && !roles.includes(req.body.role)) return res.status(400).json({ error: 'Invalid user role.' });
  if (userId === Number(req.user.sub) && req.body.role && req.body.role !== 'admin') return res.status(400).json({ error: 'You cannot remove your own admin role.' });
  const fields = { fullName: 'full_name', email: 'email', phone: 'phone', role: 'role' }; const updates = []; const values = [];
  Object.entries(fields).forEach(([key, column]) => { if (req.body[key] !== undefined) { if (key === 'role' && !roles.includes(req.body[key])) return; updates.push(`${column} = ?`); values.push(typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key]); } });
  if (req.body.password !== undefined) { if (typeof req.body.password !== 'string' || req.body.password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' }); updates.push('password_hash = ?'); values.push(await bcrypt.hash(req.body.password, 12)); }
  if (!updates.length) return res.status(400).json({ error: 'At least one user field is required.' }); values.push(userId);
  try { const [result] = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values); if (!result.affectedRows) return res.status(404).json({ error: 'User not found.' }); res.json({ message: 'User updated.' }); } catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email is already registered.' }); throw error; }
});

app.patch('/api/teachers/:id/profile', requireAuth, authorize('admin'), async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'A valid teacher id is required.' });
  if (req.body.gender !== undefined && !['male', 'female', 'other'].includes(req.body.gender)) return res.status(400).json({ error: 'Invalid gender.' });
  const [teachers] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'teacher'", [userId]);
  if (!teachers.length) return res.status(404).json({ error: 'Teacher not found.' });
  const fields = { gender: 'gender', birthday: 'birthday', subjectOrModule: 'subject_or_module', diplomaKey: 'diploma_key', employeeNumber: 'employee_number' };
  const updates = []; const values = [];
  Object.entries(fields).forEach(([key, column]) => { if (req.body[key] !== undefined) { updates.push(`${column} = ?`); values.push(typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key]); } });
  if (!updates.length) return res.status(400).json({ error: 'At least one teacher profile field is required.' });
  values.push(userId);
  const [result] = await pool.query(`UPDATE teacher_profiles SET ${updates.join(', ')} WHERE user_id = ?`, values);
  if (!result.affectedRows) return res.status(404).json({ error: 'Teacher profile not found.' });
  res.json({ message: 'Teacher profile updated.' });
});

app.delete('/api/users/:id', requireAuth, authorize('admin'), async (req, res) => {
  const userId = Number(req.params.id); if (!Number.isInteger(userId)) return res.status(400).json({ error: 'A valid user id is required.' });
  if (userId === Number(req.user.sub)) return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); await connection.query('DELETE FROM students WHERE user_id = ?', [userId]); await connection.query('DELETE FROM teacher_profiles WHERE user_id = ?', [userId]); const [result] = await connection.query('DELETE FROM users WHERE id = ?', [userId]); if (!result.affectedRows) { await connection.rollback(); return res.status(404).json({ error: 'User not found.' }); } await connection.commit(); res.json({ message: 'User and dependent records deleted.' }); } catch (error) { await connection.rollback(); if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') return res.status(409).json({ error: 'This account has dependent records that must be reassigned before deletion.' }); throw error; } finally { connection.release(); }
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

app.post('/api/applications', upload.fields([{ name: 'applicantPhoto', maxCount: 1 }, { name: 'report', maxCount: 1 }]), async (req, res) => {
  const contact = String(req.body.parentPhone || '').trim();
  const parentEmail = contact.includes('@') ? contact : String(req.body.parentEmail || '').trim() || '';
  const parentPhone = contact.includes('@') ? null : contact;
  const error = bodyErrors(req.body, [['applicantName', 'Applicant name', 120], ['desiredClass', 'Desired class', 80]]) || ((!parentPhone && !parentEmail) ? 'A parent phone number or email is required.' : null);
  if (error) return res.status(400).json({ error });
  if (req.body.gender && !['male', 'female', 'other'].includes(req.body.gender)) return res.status(400).json({ error: 'Invalid gender.' });
  if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) return res.status(400).json({ error: 'Enter a valid parent email.' });
  const [[currentYear]] = await pool.query("SELECT name FROM academic_years WHERE status = 'active' AND is_current = TRUE ORDER BY start_date DESC LIMIT 1");
  if (!currentYear) return res.status(409).json({ error: 'No active academic year is configured.' });
  const [matchingClasses] = await pool.query('SELECT id FROM classes WHERE name = ? AND academic_year = ? AND is_active = TRUE LIMIT 1', [req.body.desiredClass.trim(), currentYear.name]);
  if (!matchingClasses.length) return res.status(400).json({ error: 'Select a class from the active academic year.' });
  const files = req.files || {};
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const uploadedFiles = Object.values(files).flat();
  if (uploadedFiles.some((file) => !allowedTypes.includes(file.mimetype))) {
    uploadedFiles.forEach((file) => fs.rmSync(file.path, { force: true }));
    return res.status(400).json({ error: 'Photo must be JPG, PNG or WEBP; report must be PDF or an image.' });
  }
  const fileUrl = (file) => file ? `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${file.filename}` : null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(`INSERT INTO applications
    (applicant_name, applicant_photo_key, mother_name, mother_phone, father_name, father_phone, parent_phone, parent_email, province, district, sector, cell, village, desired_class, gender, birthday, previous_school, result_slip_key, report_key, academic_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.body.applicantName.trim(), fileUrl(files.applicantPhoto?.[0]), req.body.motherName?.trim() || null, req.body.motherPhone?.trim() || null, req.body.fatherName?.trim() || null, req.body.fatherPhone?.trim() || null, parentPhone || '', parentEmail, req.body.province?.trim() || null, req.body.district?.trim() || null, req.body.sector?.trim() || null, req.body.cell?.trim() || null, req.body.village?.trim() || null, req.body.desiredClass.trim(), req.body.gender || null, req.body.birthday || null, req.body.previousSchool?.trim() || null, req.body.resultSlipKey?.trim() || null, fileUrl(files.report?.[0]), currentYear.name]);
    const notification = await deliverApplicationReceived({ destination: parentEmail, name: req.body.applicantName.trim() });
    await connection.commit();
    res.status(201).json({ id: result.insertId, status: 'pending', notification, message: 'Application submitted. A confirmation email was sent to the parent.' });
  } catch (submitError) {
    await connection.rollback();
    Object.values(files).flat().forEach((file) => fs.rmSync(file.path, { force: true }));
    if (submitError.statusCode) return res.status(submitError.statusCode).json({ error: submitError.message });
    throw submitError;
  } finally { connection.release(); }
});

app.get('/api/applications', requireAuth, authorize('admin', 'dos'), async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM applications WHERE status IN ('pending', 'rejected') OR (status = 'approved' AND approved_student_id IS NULL) ORDER BY created_at DESC");
  res.json({ applications: rows });
});

app.get('/api/public/classes', async (_req, res) => {
  const [[currentYear]] = await pool.query("SELECT name FROM academic_years WHERE status = 'active' AND is_current = TRUE ORDER BY start_date DESC LIMIT 1");
  if (!currentYear) return res.json({ classes: [] });
  const [classes] = await pool.query('SELECT id, name, academic_year AS academicYear FROM classes WHERE academic_year = ? AND is_active = TRUE ORDER BY name', [currentYear.name]);
  res.json({ classes });
});
app.get('/api/public/academic-years/current', async (_req, res) => {
  const [[year]] = await pool.query("SELECT id, name FROM academic_years WHERE status = 'active' AND is_current = TRUE ORDER BY start_date DESC LIMIT 1");
  res.json(year || null);
});

app.patch('/api/applications/:id/status', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const status = ['approved', 'rejected'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'Status must be approved or rejected.' });
  if (status === 'rejected') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[application]] = await connection.query('SELECT * FROM applications WHERE id = ? AND status = \'pending\' FOR UPDATE', [req.params.id]);
      if (!application) { await connection.rollback(); return res.status(404).json({ error: 'Pending application not found.' }); }
      await connection.query('UPDATE applications SET status = ?, reviewer_comment = ? WHERE id = ? AND status = \'pending\'', [status, req.body.comment?.trim() || null, req.params.id]);
      const notification = await notifyAdmission({ application, status });
      await connection.commit();
      return res.json({ message: 'Application rejected and parent notified.', notification });
    } catch (error) { await connection.rollback(); if (error.statusCode) return res.status(error.statusCode).json({ error: error.message }); throw error; } finally { connection.release(); }
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [applications] = await connection.query('SELECT * FROM applications WHERE id = ? AND status = \'pending\' FOR UPDATE', [req.params.id]);
    const application = applications[0];
    if (!application) { await connection.rollback(); return res.status(404).json({ error: 'Pending application not found.' }); }
    await connection.query('UPDATE applications SET status = \'approved\', approved_at = NOW(), reviewer_comment = ? WHERE id = ?', [req.body.comment?.trim() || null, application.id]);
    await connection.commit();
    res.json({ message: 'Application approved. Student enrollment is scheduled after 24 hours.', enrollmentAfterHours: 24 });
  } catch (error) { await connection.rollback(); if (error.statusCode) return res.status(error.statusCode).json({ error: error.message }); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A student account for this application already exists.' }); throw error; } finally { connection.release(); }
});

app.get('/api/students', requireAuth, async (req, res) => {
  let query = `SELECT DISTINCT s.id, s.admission_number AS admissionNumber, s.full_name AS fullName, s.class_name AS className, s.parent_phone AS parentPhone, s.qr_token AS qrToken, s.status,
    (SELECT u.email FROM parent_students ps JOIN users u ON u.id = ps.parent_id WHERE ps.student_id = s.id ORDER BY ps.parent_id LIMIT 1) AS parentEmail
    FROM students s`;
  const params = [];
  if (req.user.role === 'teacher') { query += ' JOIN student_classes sc ON sc.student_id = s.id JOIN teacher_assignments ta ON ta.class_id = sc.class_id WHERE ta.teacher_id = ? AND s.status = \'active\''; params.push(req.user.sub); }
  else if (req.user.role === 'parent') { query += ' JOIN parent_students ps ON ps.student_id = s.id WHERE ps.parent_id = ?'; params.push(req.user.sub); }
  else if (req.user.role === 'student') { query += ' WHERE s.user_id = ?'; params.push(req.user.sub); }
  else if (!['admin', 'dos', 'accountant'].includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to view students.' });
  query += ' ORDER BY s.full_name ASC';
  const [rows] = await pool.query(query, params);
  res.json({ students: rows });
});

app.post('/api/students', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['fullName', 'Full name', 120]]);
  const classId = Number(req.body?.classId);
  if (error) return res.status(400).json({ error });
  if (!Number.isInteger(classId) && !String(req.body?.className || '').trim()) return res.status(400).json({ error: 'A valid class must be selected.' });
  if (!req.body.password || req.body.password !== req.body.repassword) return res.status(400).json({ error: 'Password and repassword must match.' });
  if (!['male', 'female', 'other'].includes(req.body.gender) || !req.body.birthday) return res.status(400).json({ error: 'Gender and birthday are required.' });

  const fullName = String(req.body?.fullName || '').trim();
  const admissionNumber = String(req.body?.admissionNumber || '').trim() || `FK-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const username = String(req.body?.username || '').trim().toLowerCase() || admissionNumber.toLowerCase();
  const email = String(req.body?.email || '').trim().toLowerCase() || `${username}@fkams.local`;
  const parentPhone = String(req.body?.parentPhone || '').trim();
  const photoKey = String(req.body?.photoKey || '').trim() || null;
  const dateOfBirth = req.body?.dateOfBirth || null;

  const qrToken = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const [[currentYear]] = await connection.query("SELECT id, name FROM academic_years WHERE status = 'active' AND is_current = TRUE ORDER BY start_date DESC LIMIT 1"); if (!currentYear) { await connection.rollback(); return res.status(409).json({ error: 'No active academic year is configured.' }); } const requestedClassName = String(req.body.className || '').trim(); const [classes] = await connection.query('SELECT id, name FROM classes WHERE (id = ? OR name = ?) AND academic_year = ? AND is_active = TRUE LIMIT 1', [Number.isInteger(classId) ? classId : null, requestedClassName, currentYear.name]); if (!classes[0]) { await connection.rollback(); return res.status(400).json({ error: 'Selected class is not part of the active academic year.' }); } const [userResult] = await connection.query('INSERT INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, \'student\')', [fullName, username, email, passwordHash]); const [result] = await connection.query('INSERT INTO students (user_id, admission_number, full_name, gender, birthday, academic_year, class_name, parent_phone, date_of_birth, photo_key, qr_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [userResult.insertId, admissionNumber, fullName, req.body.gender, req.body.birthday, currentYear.name, classes[0].name, parentPhone, dateOfBirth, photoKey, qrToken]); await connection.query('INSERT INTO student_classes (student_id, class_id, enrolled_at) VALUES (?, ?, CURRENT_DATE)', [result.insertId, classes[0].id]); await connection.commit(); res.status(201).json({ id: result.insertId, qrToken, username, classId: classes[0].id, academicYear: currentYear.name, message: 'Student created and assigned to the active academic year.' }); } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username, email or admission number already exists.' }); throw error; } finally { connection.release(); }
});

app.post('/api/teachers/register', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['fullName', 'Full name', 120], ['email', 'Email', 190], ['subjectOrModule', 'Subject or module', 160]]);
  if (error) return res.status(400).json({ error });
  if (!req.body.password || req.body.password !== req.body.repassword) return res.status(400).json({ error: 'Password and repassword must match.' });
  if (!['male', 'female', 'other'].includes(req.body.gender) || !req.body.birthday) return res.status(400).json({ error: 'Gender and birthday are required.' });

  const fullName = String(req.body?.fullName || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const subjectOrModule = String(req.body?.subjectOrModule || '').trim();
  const employeeNumber = String(req.body?.employeeNumber || '').trim() || `EMP-${Date.now()}`;
  const diplomaKey = String(req.body?.diplomaKey || '').trim() || null;
  const username = String(req.body?.username || '').trim().toLowerCase() || `teacher${crypto.randomInt(10000, 99999)}`;
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const [userResult] = await connection.query('INSERT INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, \'teacher\')', [fullName, username, email, passwordHash]); const qrToken = crypto.randomUUID(); await connection.query('INSERT INTO teacher_profiles (user_id, employee_number, qr_token, gender, birthday, diploma_key, subject_or_module) VALUES (?, ?, ?, ?, ?, ?, ?)', [userResult.insertId, employeeNumber, qrToken, req.body.gender, req.body.birthday, diplomaKey, subjectOrModule]); await connection.commit(); res.status(201).json({ id: userResult.insertId, username, qrToken, message: 'Teacher registered.' }); } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username, email or employee number already exists.' }); throw error; } finally { connection.release(); }
});

app.get('/api/student/profile', requireAuth, authorize('student'), async (req, res) => {
  const [rows] = await pool.query('SELECT s.id, s.full_name AS fullName, s.photo_key AS photoKey, s.qr_token AS qrToken, s.class_name AS className, s.gender, s.birthday, s.academic_year AS academicYear, s.admission_number AS admissionNumber, s.conduct_score AS conductScore, u.username, u.email, u.phone FROM students s JOIN users u ON u.id = s.user_id WHERE s.user_id = ? LIMIT 1', [req.user.sub]);
  if (!rows[0]) return res.status(404).json({ error: 'Student profile not found.' });
  res.json({ profile: rows[0], editable: ['photoKey'] });
});

app.patch('/api/student/profile/photo', requireAuth, authorize('student'), async (req, res) => {
  if (typeof req.body?.photoKey !== 'string' || !req.body.photoKey.trim() || req.body.photoKey.length > 255) return res.status(400).json({ error: 'A valid photo key is required.' });
  const [result] = await pool.query('UPDATE students SET photo_key = ? WHERE user_id = ?', [req.body.photoKey.trim(), req.user.sub]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Student profile not found.' });
  await pool.query('UPDATE users SET photo_key = ? WHERE id = ?', [req.body.photoKey.trim(), req.user.sub]);
  res.json({ message: 'Profile photo updated.' });
});

app.post('/api/student/profile/photo-upload', requireAuth, authorize('student'), upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose or capture a photo.' });
  const photoKey = `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${req.file.filename}`;
  const [result] = await pool.query('UPDATE students SET photo_key = ? WHERE user_id = ?', [photoKey, req.user.sub]);
  if (!result.affectedRows) { fs.rmSync(req.file.path, { force: true }); return res.status(404).json({ error: 'Student profile not found.' }); }
  await pool.query('UPDATE users SET photo_key = ? WHERE id = ?', [photoKey, req.user.sub]);
  res.json({ photoKey, message: 'Profile photo uploaded.' });
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
  if (req.body.status === 'excused' && !String(req.body.comment || '').trim()) return res.status(400).json({ error: 'A comment is required for excused attendance.' });
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const attendanceDate = req.body.date || new Date().toISOString().slice(0, 10);
    const [[student]] = await connection.query('SELECT id, full_name AS fullName, user_id AS userId, conduct_score AS conductScore FROM students WHERE id = ? FOR UPDATE', [studentId]);
    if (!student) { await connection.rollback(); return res.status(404).json({ error: 'Student not found.' }); }
    const [[previous]] = await connection.query('SELECT id, status, score_deduction AS scoreDeduction FROM attendance WHERE student_id = ? AND attendance_date = ? FOR UPDATE', [studentId, attendanceDate]);
    if (previous?.scoreDeduction) await connection.query('UPDATE students SET conduct_score = LEAST(100, conduct_score + ?) WHERE id = ?', [previous.scoreDeduction, studentId]);
    if (previous) await connection.query('DELETE FROM behavior_records WHERE attendance_id = ?', [previous.id]);
    const lateCount = req.body.status === 'late' ? Number((await connection.query("SELECT COUNT(*) AS total FROM attendance WHERE student_id = ? AND status = 'late' AND attendance_date <> ?", [studentId, attendanceDate]))[0][0].total) + 1 : 0;
    const deduction = req.body.status === 'absent' ? 2 : (req.body.status === 'late' && lateCount % 3 === 0 ? 2 : 0);
    let attendanceId;
    if (previous) {
      await connection.query('UPDATE attendance SET status = ?, comment = ?, marked_by = ?, score_deduction = ? WHERE id = ?', [req.body.status, req.body.comment?.trim() || null, req.user.sub, deduction, previous.id]);
      attendanceId = previous.id;
    } else {
      const [result] = await connection.query('INSERT INTO attendance (student_id, attendance_date, status, comment, marked_by, score_deduction) VALUES (?, ?, ?, ?, ?, ?)', [studentId, attendanceDate, req.body.status, req.body.comment?.trim() || null, req.user.sub, deduction]);
      attendanceId = result.insertId;
    }
    if (deduction) {
      await connection.query('UPDATE students SET conduct_score = GREATEST(0, conduct_score - ?) WHERE id = ?', [deduction, studentId]);
      const note = req.body.status === 'absent' ? `Absent on ${attendanceDate}. 2 marks deducted.` : `Late for the third time on ${attendanceDate}. 2 marks deducted.`;
      await connection.query("INSERT INTO behavior_records (student_id, attendance_id, category, note, recorded_by, score_deduction, score_after) VALUES (?, ?, 'discipline', ?, ?, ?, GREATEST(0, (SELECT conduct_score FROM students WHERE id = ?)))", [studentId, attendanceId, note, req.user.sub, deduction, studentId]);
    }
    const parentMessage = req.body.status === 'absent' ? `${student.fullName} was absent on ${attendanceDate}. 2 marks were deducted.` : req.body.status === 'late' ? `${student.fullName} was late on ${attendanceDate}.` : null;
    if (parentMessage) await connection.query("INSERT INTO notifications (recipient_id, channel, title, message, sent_at) SELECT parent_id, 'in_app', ?, ?, NOW() FROM parent_students WHERE student_id = ?", [req.body.status === 'absent' ? 'Student absent' : 'Student late', parentMessage, studentId]);
    await connection.commit();
    res.status(201).json({ message: 'Attendance saved.', deduction, conductScore: Math.max(0, Number(student.conductScore) - deduction), lateCount });
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
});

app.get('/api/attendance', requireAuth, async (req, res) => {
  const studentId = Number(req.query.studentId);
  if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'studentId is required.' });
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' });
  if (req.user.role === 'student' && (await getStudentForUser(req.user)) !== studentId) return res.status(403).json({ error: 'You can only view your own attendance.' });
  if (req.user.role === 'parent') { const [linked] = await pool.query('SELECT 1 FROM parent_students WHERE parent_id = ? AND student_id = ?', [req.user.sub, studentId]); if (!linked.length) return res.status(403).json({ error: 'This student is not linked to your account.' }); }
  const [rows] = await pool.query('SELECT attendance_date AS date, status, comment, score_deduction AS scoreDeduction FROM attendance WHERE student_id = ? ORDER BY attendance_date DESC LIMIT 100', [studentId]);
  res.json({ attendance: rows });
});

app.get('/api/classes', requireAuth, async (req, res) => {
  const currentOnly = req.query.current === 'true';
  const [currentYears] = currentOnly ? await pool.query("SELECT name FROM academic_years WHERE status = 'active' AND is_current = TRUE ORDER BY start_date DESC LIMIT 1") : [[]];
  const params = currentYears[0] ? [currentYears[0].name] : [];
  const [rows] = await pool.query(`SELECT id, name, academic_year AS academicYear, is_active AS isActive FROM classes ${currentYears[0] ? 'WHERE academic_year = ? AND is_active = TRUE' : ''} ORDER BY name`, params);
  res.json({ classes: rows });
});

app.get('/api/classes/:id/subjects', requireAuth, async (req, res) => {
  const classId = Number(req.params.id);
  if (!Number.isInteger(classId)) return res.status(400).json({ error: 'A valid class id is required.' });

  if (req.user.role === 'student') {
    const studentId = await getStudentForUser(req.user);
    const [linked] = await pool.query('SELECT 1 FROM student_classes WHERE student_id = ? AND class_id = ? LIMIT 1', [studentId, classId]);
    if (!linked.length) return res.status(403).json({ error: 'This class is not assigned to your profile.' });
  }

  if (req.user.role === 'teacher') {
    const [assigned] = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? LIMIT 1', [req.user.sub, classId]);
    if (!assigned.length) return res.status(403).json({ error: 'This class is outside your teaching assignment.' });
  }

  const [rows] = await pool.query(`
    SELECT s.id AS subjectId, s.name AS subjectName, s.code AS subjectCode,
      u.full_name AS teacherName
    FROM class_subjects cs
    JOIN subjects s ON s.id = cs.subject_id
    LEFT JOIN teacher_assignments ta ON ta.class_id = cs.class_id AND ta.subject_id = s.id
    LEFT JOIN users u ON u.id = ta.teacher_id
    WHERE cs.class_id = ?
    ORDER BY s.name
  `, [classId]);

  res.json({ subjects: rows });
});

app.post('/api/classes', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['name', 'Class name', 80]]);
  if (error) return res.status(400).json({ error });
  const [[currentYear]] = await pool.query("SELECT name FROM academic_years WHERE status = 'active' AND is_current = TRUE ORDER BY start_date DESC LIMIT 1");
  if (!currentYear) return res.status(409).json({ error: 'No active academic year is configured.' });
  const [result] = await pool.query('INSERT INTO classes (name, academic_year) VALUES (?, ?)', [req.body.name.trim(), currentYear.name]);
  res.status(201).json({ id: result.insertId, message: 'Class created.' });
});

app.put('/api/classes/:id', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const classId = Number(req.params.id); const error = bodyErrors(req.body, [['name', 'Class name', 80]]);
  if (error || !Number.isInteger(classId)) return res.status(400).json({ error: error || 'A valid class id is required.' });
  const [[currentYear]] = await pool.query("SELECT name FROM academic_years WHERE status = 'active' AND is_current = TRUE ORDER BY start_date DESC LIMIT 1");
  if (!currentYear) return res.status(409).json({ error: 'No active academic year is configured.' });
  const [result] = await pool.query('UPDATE classes SET name = ?, academic_year = ? WHERE id = ?', [req.body.name.trim(), currentYear.name, classId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Class not found.' });
  res.json({ message: 'Class updated.' });
});

app.delete('/api/classes/:id', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const classId = Number(req.params.id);
  if (!Number.isInteger(classId)) return res.status(400).json({ error: 'A valid class id is required.' });
  const [result] = await pool.query('DELETE FROM classes WHERE id = ?', [classId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Class not found.' });
  res.json({ message: 'Class deleted.' });
});

app.get('/api/subjects', requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, code, is_active AS isActive FROM subjects ORDER BY name');
    res.json({ subjects: rows });
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      const [rows] = await pool.query('SELECT id, name, code FROM subjects ORDER BY name');
      return res.json({ subjects: rows.map((row) => ({ ...row, isActive: true })) });
    }
    console.error('GET /api/subjects failed:', error);
    res.status(503).json({ error: 'Subjects are temporarily unavailable.' });
  }
});

async function userCanAccessSubject(user, subjectId) {
  if (!Number.isInteger(Number(subjectId))) return false;
  if (['admin', 'dos'].includes(user.role)) return true;
  if (user.role === 'teacher') {
    const [rows] = await pool.query('SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND subject_id = ? LIMIT 1', [user.sub, Number(subjectId)]);
    return rows.length > 0;
  }
  if (user.role === 'student') {
    const studentId = await getStudentForUser(user);
    const [rows] = await pool.query('SELECT 1 FROM student_classes sc JOIN class_subjects cs ON cs.class_id = sc.class_id WHERE sc.student_id = ? AND cs.subject_id = ? LIMIT 1', [studentId, Number(subjectId)]);
    return rows.length > 0;
  }
  return false;
}

async function userCanAccessModule(user, subjectId, moduleId) {
  if (!Number.isInteger(Number(subjectId)) || !Number.isInteger(Number(moduleId))) return false;
  if (['admin', 'dos'].includes(user.role)) return true;
  if (user.role === 'teacher') {
    const [rows] = await pool.query('SELECT 1 FROM subject_modules WHERE id = ? AND subject_id = ? AND teacher_id = ? LIMIT 1', [Number(moduleId), Number(subjectId), user.sub]);
    return rows.length > 0 || (await userCanAccessSubject(user, subjectId));
  }
  if (user.role === 'student') {
    return await userCanAccessSubject(user, subjectId);
  }
  return false;
}

function inferNoteType(file, fallback = 'note') {
  if (!file) return fallback;
  const type = String(file.mimetype || '').toLowerCase();
  if (type.includes('video')) return 'video';
  if (type.includes('pdf') || type.includes('word') || type.includes('text') || type.includes('sheet') || type.includes('presentation')) return 'document';
  return 'note';
}

app.get('/api/subjects/:id/modules', requireAuth, async (req, res) => {
  const subjectId = Number(req.params.id);
  if (!Number.isInteger(subjectId)) return res.status(400).json({ error: 'A valid subject id is required.' });
  if (!(await userCanAccessSubject(req.user, subjectId))) return res.status(403).json({ error: 'You cannot view units for this subject.' });

  const [moduleRows] = await pool.query(
    `SELECT id, subject_id AS subjectId, teacher_id AS teacherId, title, description, image_url AS imageUrl
     FROM subject_modules
     WHERE subject_id = ?
     ORDER BY created_at DESC`,
    [subjectId]
  );

  const modules = moduleRows.map((module) => ({
    ...module,
    image: module.imageUrl || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    notes: [],
  }));

  if (!modules.length) {
    return res.json({ modules: [] });
  }

  const moduleIds = modules.map((module) => module.id);
  const [noteRows] = await pool.query(
    `SELECT id, module_id AS moduleId, subject_id AS subjectId, teacher_id AS teacherId, name, header, file_url AS fileUrl, mime_type AS mimeType, file_size AS fileSize, note_type AS noteType
     FROM subject_module_notes
     WHERE subject_id = ? AND module_id IN (?)
     ORDER BY created_at DESC`,
    [subjectId, moduleIds]
  );

  const notesByModule = noteRows.reduce((accumulator, note) => {
    const key = Number(note.moduleId);
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push({
      ...note,
      noteType: note.noteType || 'note',
    });
    return accumulator;
  }, {});

  const payload = modules.map((module) => ({
    ...module,
    notes: notesByModule[Number(module.id)] || [],
  }));

  res.json({ modules: payload });
});

app.post('/api/subjects/:id/modules', requireAuth, authorize('admin', 'dos', 'teacher'), upload.single('photo'), async (req, res) => {
  const subjectId = Number(req.params.id);
  if (!Number.isInteger(subjectId)) return res.status(400).json({ error: 'A valid subject id is required.' });
  if (req.user.role === 'teacher' && !(await userCanAccessSubject(req.user, subjectId))) return res.status(403).json({ error: 'This subject is not in your assignment.' });

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || '').trim();
  if (!title || !description) return res.status(400).json({ error: 'Module title and description are required.' });

  const imageUrl = req.file ? `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${req.file.filename}` : null;
  const [result] = await pool.query(
    'INSERT INTO subject_modules (subject_id, teacher_id, title, description, image_url) VALUES (?, ?, ?, ?, ?)',
    [subjectId, req.user.sub, title, description, imageUrl]
  );

  res.status(201).json({ id: result.insertId, message: 'Module created.' });
});

app.delete('/api/subjects/:id/modules/:moduleId', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => {
  const subjectId = Number(req.params.id);
  const moduleId = Number(req.params.moduleId);
  if (!Number.isInteger(subjectId) || !Number.isInteger(moduleId)) return res.status(400).json({ error: 'A valid subject and module id are required.' });
  const [moduleRows] = await pool.query('SELECT teacher_id AS teacherId FROM subject_modules WHERE id = ? AND subject_id = ?', [moduleId, subjectId]);
  const module = moduleRows[0];
  if (!module) return res.status(404).json({ error: 'Module not found.' });
  if (req.user.role === 'teacher' && Number(module.teacherId) !== Number(req.user.sub)) return res.status(403).json({ error: 'You can only delete your own units.' });

  const [result] = await pool.query('DELETE FROM subject_modules WHERE id = ? AND subject_id = ?', [moduleId, subjectId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Module not found.' });
  res.json({ message: 'Module deleted.' });
});

app.get('/api/subjects/:id/notes', requireAuth, async (req, res) => {
  const subjectId = Number(req.params.id);
  if (!Number.isInteger(subjectId)) return res.status(400).json({ error: 'A valid subject id is required.' });
  if (!(await userCanAccessSubject(req.user, subjectId))) return res.status(403).json({ error: 'You cannot view notes for this subject.' });
  const [rows] = await pool.query('SELECT id, subject_id AS subjectId, teacher_id AS teacherId, name, header, file_url AS fileUrl, mime_type AS mimeType, file_size AS fileSize, note_type AS noteType, created_at AS createdAt, updated_at AS updatedAt FROM subject_notes WHERE subject_id = ? ORDER BY created_at DESC', [subjectId]);
  res.json({ notes: rows });
});

app.post('/api/subjects/:id/modules/:moduleId/notes', requireAuth, authorize('admin', 'dos', 'teacher'), upload.single('file'), async (req, res) => {
  const subjectId = Number(req.params.id);
  const moduleId = Number(req.params.moduleId);
  if (!Number.isInteger(subjectId) || !Number.isInteger(moduleId)) return res.status(400).json({ error: 'A valid subject and module id are required.' });

  const [moduleRows] = await pool.query('SELECT teacher_id AS teacherId, subject_id AS subjectId FROM subject_modules WHERE id = ? AND subject_id = ?', [moduleId, subjectId]);
  const module = moduleRows[0];
  if (!module) return res.status(404).json({ error: 'Module not found.' });
  if (req.user.role === 'teacher' && Number(module.teacherId) !== Number(req.user.sub)) return res.status(403).json({ error: 'You can only add notes to your own units.' });

  const name = String(req.body?.name || '').trim();
  const header = String(req.body?.header || '').trim();
  if (!name || !header) return res.status(400).json({ error: 'Name and note header are required.' });
  const noteType = inferNoteType(req.file, 'note');
  const fileUrl = req.file ? `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${req.file.filename}` : null;
  const fileSize = req.file ? Number(req.file.size || 0) : null;
  const mimeType = req.file ? String(req.file.mimetype || 'application/octet-stream') : null;
  try {
    const [result] = await pool.query('INSERT INTO subject_module_notes (subject_id, module_id, teacher_id, name, header, file_url, mime_type, file_size, note_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [subjectId, moduleId, req.user.sub, name, header, fileUrl, mimeType, fileSize, noteType]);
    res.status(201).json({ id: result.insertId, message: 'Note uploaded.' });
  } catch (uploadError) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    throw uploadError;
  }
});

app.patch('/api/subjects/:id/modules/:moduleId/notes/:noteId', requireAuth, authorize('admin', 'dos', 'teacher'), upload.single('file'), async (req, res) => {
  const subjectId = Number(req.params.id);
  const moduleId = Number(req.params.moduleId);
  const noteId = Number(req.params.noteId);
  if (!Number.isInteger(subjectId) || !Number.isInteger(moduleId) || !Number.isInteger(noteId)) return res.status(400).json({ error: 'A valid subject, module and note id are required.' });

  const [noteRows] = await pool.query('SELECT teacher_id AS teacherId, file_url AS fileUrl, note_type AS noteType FROM subject_module_notes WHERE id = ? AND subject_id = ? AND module_id = ?', [noteId, subjectId, moduleId]);
  const note = noteRows[0];
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  if (req.user.role === 'teacher' && Number(note.teacherId) !== Number(req.user.sub)) return res.status(403).json({ error: 'You can only edit your own notes.' });

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : null;
  const header = req.body?.header !== undefined ? String(req.body.header).trim() : null;
  if ((name !== null && !name) || (header !== null && !header)) return res.status(400).json({ error: 'Note name and header cannot be empty.' });

  const nextType = inferNoteType(req.file, note.noteType || 'note');
  const fileUrl = req.file ? `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${req.file.filename}` : null;
  const [result] = await pool.query('UPDATE subject_module_notes SET name = COALESCE(?, name), header = COALESCE(?, header), file_url = COALESCE(?, file_url), mime_type = COALESCE(?, mime_type), file_size = COALESCE(?, file_size), note_type = COALESCE(?, note_type) WHERE id = ? AND subject_id = ? AND module_id = ?', [name, header, fileUrl, req.file ? String(req.file.mimetype || 'application/octet-stream') : null, req.file ? Number(req.file.size || 0) : null, nextType, noteId, subjectId, moduleId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Note not found.' });
  res.json({ message: 'Note updated.' });
});

app.delete('/api/subjects/:id/modules/:moduleId/notes/:noteId', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => {
  const subjectId = Number(req.params.id);
  const moduleId = Number(req.params.moduleId);
  const noteId = Number(req.params.noteId);
  if (!Number.isInteger(subjectId) || !Number.isInteger(moduleId) || !Number.isInteger(noteId)) return res.status(400).json({ error: 'A valid subject, module and note id are required.' });

  const [rows] = await pool.query('SELECT teacher_id AS teacherId, file_url AS fileUrl FROM subject_module_notes WHERE id = ? AND subject_id = ? AND module_id = ?', [noteId, subjectId, moduleId]);
  const note = rows[0];
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  if (req.user.role === 'teacher' && Number(note.teacherId) !== Number(req.user.sub)) return res.status(403).json({ error: 'You can only delete your own notes.' });

  if (note.fileUrl) {
    try {
      const parsedUrl = new URL(note.fileUrl);
      const relativePath = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
      const filePath = path.join(__dirname, relativePath);
      if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    } catch {
      // ignore invalid or external URLs
    }
  }

  const [result] = await pool.query('DELETE FROM subject_module_notes WHERE id = ? AND subject_id = ? AND module_id = ?', [noteId, subjectId, moduleId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Note not found.' });
  res.json({ message: 'Note deleted.' });
});

app.post('/api/subjects/:id/notes', requireAuth, authorize('admin', 'dos', 'teacher'), upload.single('file'), async (req, res) => {
  const subjectId = Number(req.params.id);
  if (!Number.isInteger(subjectId)) return res.status(400).json({ error: 'A valid subject id is required.' });
  if (req.user.role === 'teacher' && !(await userCanAccessSubject(req.user, subjectId))) return res.status(403).json({ error: 'This subject is not in your assignment.' });
  const name = String(req.body?.name || '').trim();
  const header = String(req.body?.header || '').trim();
  if (!name || !header) return res.status(400).json({ error: 'Name and note header are required.' });
  const noteType = inferNoteType(req.file, 'note');
  const fileUrl = req.file ? `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${req.file.filename}` : null;
  const fileSize = req.file ? Number(req.file.size || 0) : null;
  const mimeType = req.file ? String(req.file.mimetype || 'application/octet-stream') : null;
  try {
    const [result] = await pool.query('INSERT INTO subject_notes (subject_id, teacher_id, name, header, file_url, mime_type, file_size, note_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [subjectId, req.user.sub, name, header, fileUrl, mimeType, fileSize, noteType]);
    res.status(201).json({ id: result.insertId, message: 'Note uploaded.' });
  } catch (uploadError) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    throw uploadError;
  }
});

app.patch('/api/subjects/:id/notes/:noteId', requireAuth, authorize('admin', 'dos', 'teacher'), upload.single('file'), async (req, res) => {
  const subjectId = Number(req.params.id);
  const noteId = Number(req.params.noteId);
  if (!Number.isInteger(subjectId) || !Number.isInteger(noteId)) return res.status(400).json({ error: 'A valid subject and note id are required.' });
  const [noteRows] = await pool.query('SELECT teacher_id AS teacherId, file_url AS fileUrl FROM subject_notes WHERE id = ? AND subject_id = ?', [noteId, subjectId]);
  const note = noteRows[0];
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  if (req.user.role === 'teacher' && Number(note.teacherId) !== Number(req.user.sub)) return res.status(403).json({ error: 'You can only edit your own notes.' });
  const name = req.body?.name !== undefined ? String(req.body.name).trim() : null;
  const header = req.body?.header !== undefined ? String(req.body.header).trim() : null;
  if ((name !== null && !name) || (header !== null && !header)) return res.status(400).json({ error: 'Note name and header cannot be empty.' });
  const nextType = inferNoteType(req.file, note.noteType || 'note');
  const fileUrl = req.file ? `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${req.file.filename}` : null;
  if (fileUrl && note.fileUrl) {
    try {
      const relativePath = decodeURIComponent(new URL(note.fileUrl).pathname.replace(/^\/+/, ''));
      const uploadPath = path.join(__dirname, relativePath.replace(/^uploads\//, 'uploads'));
      if (fs.existsSync(uploadPath)) fs.rmSync(uploadPath, { force: true });
    } catch {
      // ignore invalid stored paths
    }
  }
  const [result] = await pool.query('UPDATE subject_notes SET name = COALESCE(?, name), header = COALESCE(?, header), file_url = COALESCE(?, file_url), mime_type = COALESCE(?, mime_type), file_size = COALESCE(?, file_size), note_type = COALESCE(?, note_type) WHERE id = ? AND subject_id = ?', [name, header, fileUrl, req.file ? String(req.file.mimetype || 'application/octet-stream') : null, req.file ? Number(req.file.size || 0) : null, nextType, noteId, subjectId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Note not found.' });
  res.json({ message: 'Note updated.' });
});

app.delete('/api/subjects/:id/notes/:noteId', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => {
  const subjectId = Number(req.params.id);
  const noteId = Number(req.params.noteId);
  if (!Number.isInteger(subjectId) || !Number.isInteger(noteId)) return res.status(400).json({ error: 'A valid subject and note id are required.' });
  const [rows] = await pool.query('SELECT teacher_id AS teacherId, file_url AS fileUrl FROM subject_notes WHERE id = ? AND subject_id = ?', [noteId, subjectId]);
  const note = rows[0];
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  if (req.user.role === 'teacher' && Number(note.teacherId) !== Number(req.user.sub)) return res.status(403).json({ error: 'You can only delete your own notes.' });
  if (note.fileUrl) {
    try {
      const parsedUrl = new URL(note.fileUrl);
      const relativePath = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
      const filePath = path.join(__dirname, relativePath);
      if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    } catch {
      // ignore invalid or external URLs
    }
  }
  const [result] = await pool.query('DELETE FROM subject_notes WHERE id = ? AND subject_id = ?', [noteId, subjectId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Note not found.' });
  res.json({ message: 'Note deleted.' });
});

app.post('/api/subjects', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const error = bodyErrors(req.body, [['name', 'Subject name', 100], ['code', 'Subject code', 30]]);
  if (error) return res.status(400).json({ error });
  const [result] = await pool.query('INSERT INTO subjects (name, code) VALUES (?, ?)', [req.body.name.trim(), req.body.code.trim().toUpperCase()]);
  const classId = Number(req.body?.classId);
  if (Number.isInteger(classId)) await pool.query('INSERT INTO class_subjects (class_id, subject_id) VALUES (?, ?)', [classId, result.insertId]);
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

app.get('/api/teacher-assignments', requireAuth, authorize('admin', 'dos'), async (_req, res) => {
  const [rows] = await pool.query(`SELECT ta.teacher_id AS teacherId, ta.class_id AS classId, ta.subject_id AS subjectId, u.full_name AS teacherName, c.name AS className, s.name AS subjectName, s.code AS subjectCode FROM teacher_assignments ta JOIN users u ON u.id = ta.teacher_id JOIN classes c ON c.id = ta.class_id JOIN subjects s ON s.id = ta.subject_id ORDER BY c.name, s.name, u.full_name`);
  res.json({ assignments: rows });
});

app.get('/api/teacher/my-assignments', requireAuth, authorize('teacher'), async (req, res) => {
  const [rows] = await pool.query(`SELECT ta.class_id AS classId, c.name AS className, ta.subject_id AS subjectId, s.name AS subjectName, s.code AS subjectCode FROM teacher_assignments ta JOIN classes c ON c.id = ta.class_id JOIN subjects s ON s.id = ta.subject_id WHERE ta.teacher_id = ? ORDER BY c.name, s.name`, [req.user.sub]);
  res.json({ assignments: rows });
});

app.delete('/api/teacher-assignments', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const ids = ['teacherId', 'classId', 'subjectId'].map((key) => Number(req.body?.[key]));
  if (!ids.every(Number.isInteger)) return res.status(400).json({ error: 'teacherId, classId and subjectId are required.' });
  const [result] = await pool.query('DELETE FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND subject_id = ?', ids);
  if (!result.affectedRows) return res.status(404).json({ error: 'Teacher assignment not found.' });
  res.json({ message: 'Teacher assignment removed.' });
});

app.get('/api/dos/classes/:id', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const classId = Number(req.params.id);
  if (!Number.isInteger(classId)) return res.status(400).json({ error: 'A valid class id is required.' });
  const [[classRow]] = await pool.query('SELECT id, name, academic_year AS academicYear, is_active AS isActive FROM classes WHERE id = ? LIMIT 1', [classId]);
  if (!classRow) return res.status(404).json({ error: 'Class not found.' });
  const [subjects] = await pool.query(`SELECT s.id, s.name, s.code, u.id AS teacherId, u.full_name AS teacherName FROM class_subjects cs JOIN subjects s ON s.id = cs.subject_id LEFT JOIN teacher_assignments ta ON ta.subject_id = s.id AND ta.class_id = cs.class_id LEFT JOIN users u ON u.id = ta.teacher_id WHERE cs.class_id = ? ORDER BY s.name`, [classId]);
  const [[students]] = await pool.query('SELECT COUNT(DISTINCT sc.student_id) AS total FROM student_classes sc JOIN students s ON s.id = sc.student_id WHERE sc.class_id = ? AND s.status = \'active\'', [classId]);
  const [[tests]] = await pool.query('SELECT COUNT(*) AS total FROM tests WHERE class_id = ?', [classId]);
  const [[grades]] = await pool.query('SELECT ROUND(AVG(g.score / NULLIF(g.max_score, 0) * 100), 1) AS average FROM grades g JOIN students st ON st.id = g.student_id JOIN student_classes sc ON sc.student_id = st.id WHERE sc.class_id = ?', [classId]);
  const [subjectStats] = await pool.query(`SELECT s.id, s.name, ROUND(AVG(g.score / NULLIF(g.max_score, 0) * 100), 1) AS average, COUNT(DISTINCT g.student_id) AS gradedStudents, COUNT(DISTINCT t.id) AS tests, COUNT(DISTINCT ta.student_id) AS testParticipants FROM class_subjects cs JOIN subjects s ON s.id = cs.subject_id LEFT JOIN grades g ON g.subject_id = s.id LEFT JOIN students st ON st.id = g.student_id LEFT JOIN student_classes sc ON sc.student_id = st.id AND sc.class_id = cs.class_id LEFT JOIN tests t ON t.class_id = cs.class_id AND t.subject_id = s.id LEFT JOIN test_attempts ta ON ta.test_id = t.id WHERE cs.class_id = ? GROUP BY s.id, s.name ORDER BY s.name`, [classId]);
  res.json({ class: classRow, subjects, subjectStats, metrics: { students: Number(students.total || 0), tests: Number(tests.total || 0), average: Number(grades.average || 0) } });
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
  let query = `SELECT t.id, t.title, t.class_id AS classId, c.name AS className, t.subject_id AS subjectId, s.name AS subjectName, t.duration_minutes AS durationMinutes, t.starts_at AS startsAt, t.ends_at AS endsAt, t.is_published AS isPublished FROM tests t JOIN classes c ON c.id = t.class_id JOIN subjects s ON s.id = t.subject_id`;
  const params = [];
  if (req.user.role === 'teacher') { query += ' WHERE t.teacher_id = ?'; params.push(req.user.sub); }
  else if (req.user.role === 'student') { query += ' JOIN student_classes sc ON sc.class_id = t.class_id JOIN students st ON st.id = sc.student_id WHERE st.user_id = ? AND t.is_published = TRUE'; params.push(req.user.sub); }
  else if (req.user.role === 'parent') { query += ' JOIN student_classes sc ON sc.class_id = t.class_id JOIN parent_students ps ON ps.student_id = sc.student_id WHERE ps.parent_id = ? AND t.is_published = TRUE'; params.push(req.user.sub); }
  query += ' ORDER BY t.starts_at DESC, t.id DESC';
  const [rows] = await pool.query(query, params);
  res.json({ tests: rows });
});

app.get('/api/teacher/dashboard', requireAuth, authorize('teacher'), async (req, res) => {
  const teacherId = Number(req.user.sub);
  const today = new Date().toISOString().slice(0, 10);
  const [students, attendance, assessments, notices, timetable] = await Promise.all([
    pool.query('SELECT DISTINCT s.id, s.full_name AS fullName, s.admission_number AS admissionNumber, s.class_name AS className FROM students s JOIN student_classes sc ON sc.student_id = s.id JOIN teacher_assignments ta ON ta.class_id = sc.class_id WHERE ta.teacher_id = ? AND s.status = \'active\' ORDER BY s.full_name', [teacherId]),
    pool.query("SELECT COUNT(DISTINCT s.id) AS total, SUM(a.status = 'present') AS present FROM students s JOIN student_classes sc ON sc.student_id = s.id JOIN teacher_assignments ta ON ta.class_id = sc.class_id LEFT JOIN attendance a ON a.student_id = s.id AND a.attendance_date = ? WHERE ta.teacher_id = ? AND s.status = 'active'", [today, teacherId]),
    pool.query("SELECT COUNT(*) AS total FROM tests WHERE teacher_id = ? AND is_published = TRUE AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW())", [teacherId]),
    pool.query("SELECT id, title, body, category, published_at AS publishedAt FROM notices WHERE audience IN ('all', 'teachers') ORDER BY published_at DESC LIMIT 5"),
    pool.query('SELECT t.id, c.name AS className, s.name AS subjectName, t.day_of_week AS dayOfWeek, t.starts_at AS startsAt, t.ends_at AS endsAt, t.room FROM timetable_entries t JOIN classes c ON c.id = t.class_id JOIN subjects s ON s.id = t.subject_id WHERE t.teacher_id = ? ORDER BY t.day_of_week, t.starts_at LIMIT 8', [teacherId]),
  ]);
  const attendanceTotal = Number(attendance[0][0]?.total || 0);
  const attendancePresent = Number(attendance[0][0]?.present || 0);
  res.json({ students: students[0], attendance: { total: attendanceTotal, present: attendancePresent, percent: attendanceTotal ? Math.round((attendancePresent / attendanceTotal) * 100) : 0 }, activeAssessments: Number(assessments[0][0]?.total || 0), notices: notices[0], timetable: timetable[0] });
});

app.get('/api/tests/:id/questions', requireAuth, async (req, res) => {
  const testId = Number(req.params.id); if (!Number.isInteger(testId)) return res.status(400).json({ error: 'Valid test id is required.' });
  let allowed = ['admin', 'dos', 'teacher'].includes(req.user.role);
  if (req.user.role === 'student') { const studentId = await getStudentForUser(req.user); const [rows] = await pool.query('SELECT 1 FROM tests t JOIN student_classes sc ON sc.class_id = t.class_id WHERE t.id = ? AND sc.student_id = ? AND t.is_published = TRUE', [testId, studentId]); allowed = rows.length > 0; }
  if (!allowed) return res.status(403).json({ error: 'You cannot access this test.' });
  const order = req.user.role === 'student' ? 'RAND()' : 'question_order';
  const [rows] = await pool.query(`SELECT id, question_order AS questionOrder, question_type AS questionType, prompt, options_json AS options, points FROM test_questions WHERE test_id = ? ORDER BY ${order}`, [testId]);
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
  const [tests] = await pool.query('SELECT t.id, t.duration_minutes AS durationMinutes FROM tests t JOIN student_classes sc ON sc.class_id = t.class_id WHERE t.id = ? AND sc.student_id = ? AND t.is_published = TRUE AND (t.starts_at IS NULL OR t.starts_at <= NOW()) AND (t.ends_at IS NULL OR t.ends_at >= NOW()) LIMIT 1', [req.params.id, studentId]);
  if (!tests[0]) return res.status(403).json({ error: 'This test is not available to you.' });
  const [existing] = await pool.query('SELECT id, started_at AS startedAt, submitted_at AS submittedAt, score, status FROM test_attempts WHERE test_id = ? AND student_id = ?', [req.params.id, studentId]);
  if (existing[0]) return res.json({ attempt: existing[0] });
  const [result] = await pool.query('INSERT INTO test_attempts (test_id, student_id, started_at) VALUES (?, ?, NOW())', [req.params.id, studentId]);
  res.status(201).json({ attempt: { id: result.insertId, startedAt: new Date(), durationMinutes: tests[0].durationMinutes } });
});

app.post('/api/test-attempts/:id/submit', requireAuth, authorize('student'), async (req, res) => {
  const studentId = await getStudentForUser(req.user);
  const [attempts] = await pool.query('SELECT a.id, a.test_id AS testId, a.started_at AS startedAt, a.score, a.status, t.duration_minutes AS durationMinutes FROM test_attempts a JOIN tests t ON t.id = a.test_id WHERE a.id = ? AND a.student_id = ? LIMIT 1', [req.params.id, studentId]);
  const attempt = attempts[0];
  if (!attempt) return res.status(404).json({ error: 'Test attempt not found.' });
  if (attempt.status !== 'in_progress') return res.json({ score: attempt.score, status: attempt.status, message: 'This test attempt was already submitted.' });
  const expired = Date.now() > new Date(attempt.startedAt).getTime() + attempt.durationMinutes * 60 * 1000;
  const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const [questions] = await pool.query('SELECT id, answer_json AS answer, points FROM test_questions WHERE test_id = ?', [attempt.testId]);
  let score = 0;
  const same = (left, right) => String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase();
  questions.forEach((question) => {
    const expected = typeof question.answer === 'string' ? JSON.parse(question.answer) : question.answer;
    const actual = answers[String(question.id)];
    let fraction = 0;
    if (question.questionType === 'fill') fraction = same(expected?.[0], actual) ? 1 : 0;
    else if (['match', 'rearrange'].includes(question.questionType) && Array.isArray(expected) && Array.isArray(actual)) {
      fraction = expected.length ? expected.reduce((total, item, index) => total + (same(item, actual[index]) ? 1 : 0), 0) / expected.length : 0;
    } else fraction = JSON.stringify(expected) === JSON.stringify(actual) ? 1 : 0;
    score += Number(question.points) * fraction;
  });
  const status = expired ? 'expired' : 'submitted';
  await pool.query('UPDATE test_attempts SET submitted_at = NOW(), score = ?, status = ? WHERE id = ?', [score, status, attempt.id]);
  const breakdown = questions.map((question) => {
    const expected = typeof question.answer === 'string' ? JSON.parse(question.answer) : question.answer;
    const actual = answers[String(question.id)] ?? null;
    const correct = question.questionType === 'fill'
      ? same(expected?.[0], actual)
      : (['match', 'rearrange'].includes(question.questionType) && Array.isArray(expected) && Array.isArray(actual)
        ? expected.length > 0 && expected.every((item, index) => same(item, actual[index]))
        : JSON.stringify(expected) === JSON.stringify(actual));
    return { questionId: question.id, expected, actual, correct, points: Number(question.points) };
  });
  const maxScore = questions.reduce((total, question) => total + Number(question.points), 0);
  res.json({ score, maxScore, percentage: maxScore ? Math.round((score / maxScore) * 100) : 0, status, breakdown, message: expired ? 'Time expired. Your answers were submitted automatically.' : 'Test submitted successfully.' });
});

app.post('/api/test-attempts/:id/cheating', requireAuth, authorize('student'), async (req, res) => {
  const studentId = await getStudentForUser(req.user);
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 160) : 'Suspicious test activity';
  const [[attempt]] = await pool.query('SELECT a.id, t.title, t.teacher_id AS teacherId FROM test_attempts a JOIN tests t ON t.id = a.test_id WHERE a.id = ? AND a.student_id = ? LIMIT 1', [req.params.id, studentId]);
  if (!attempt) return res.status(404).json({ error: 'Test attempt not found.' });
  const [announcement] = await pool.query(`INSERT INTO announcements (title, message, type, related_test_id, created_by) SELECT ?, ?, 'general', t.id, ? FROM tests t WHERE t.id = (SELECT test_id FROM test_attempts WHERE id = ?)`, [`Test alert: ${req.user.name || 'Student'}`, `${req.user.name || 'A student'} may be attempting to copy during test "${attempt.title}". Reason: ${reason}`, studentId, req.params.id]);
  await pool.query('INSERT IGNORE INTO announcement_recipients (announcement_id, user_id) VALUES (?, ?)', [announcement.insertId, attempt.teacherId]);
  res.json({ message: 'Teacher has been notified.' });
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

app.get('/api/academic-years', requireAuth, authorize('admin', 'dos', 'teacher', 'student', 'parent', 'accountant', 'librarian'), async (_req, res) => {
  const [years] = await pool.query('SELECT id, name, start_date AS startDate, end_date AS endDate, status, is_current AS isCurrent FROM academic_years ORDER BY start_date DESC');
  res.json({ years });
});
app.get('/api/academic-years/current', requireAuth, authorize('admin', 'dos', 'teacher', 'student', 'parent', 'accountant', 'librarian'), async (_req, res) => {
  const [[year]] = await pool.query('SELECT id, name, start_date AS startDate, end_date AS endDate, status, is_current AS isCurrent FROM academic_years WHERE is_current = TRUE LIMIT 1');
  res.json(year || null);
});
app.get('/api/academic-years/:id', requireAuth, authorize('admin', 'dos', 'teacher', 'student', 'parent', 'accountant', 'librarian'), async (req, res) => {
  const [[year]] = await pool.query('SELECT id, name, start_date AS startDate, end_date AS endDate, status, is_current AS isCurrent FROM academic_years WHERE id = ? LIMIT 1', [Number(req.params.id)]);
  if (!year) return res.status(404).json({ error: 'Academic year not found.' });
  const [terms] = await pool.query('SELECT id, term_number AS termNumber, name, start_date AS startDate, end_date AS endDate, status FROM academic_year_terms WHERE academic_year_id = ? ORDER BY term_number', [year.id]);
  res.json({ ...year, terms });
});
app.post('/api/academic-years', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const name = String(req.body?.name || '').trim(); const terms = Array.isArray(req.body?.terms) ? req.body.terms.slice(0, 3) : [];
  if (!name || !req.body.startDate || !req.body.endDate || terms.length !== 3) return res.status(400).json({ error: 'Name, start/end dates and three terms are required.' });
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const [result] = await connection.query('INSERT INTO academic_years (name, start_date, end_date, status, is_current, created_by) VALUES (?, ?, ?, ?, ?, ?)', [name, req.body.startDate, req.body.endDate, req.body.setCurrent ? 'active' : 'planning', Boolean(req.body.setCurrent), req.user.sub]); if (req.body.setCurrent) await connection.query('UPDATE academic_years SET is_current = FALSE WHERE id <> ?', [result.insertId]); for (let index = 0; index < terms.length; index += 1) { const term = terms[index]; await connection.query('INSERT INTO academic_year_terms (academic_year_id, term_number, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)', [result.insertId, index + 1, term.name, term.startDate, term.endDate]); } await connection.commit(); res.status(201).json({ id: result.insertId, message: 'Academic year created.' }); } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That academic year already exists.' }); throw error; } finally { connection.release(); }
});
app.patch('/api/academic-years/:id', requireAuth, authorize('admin', 'dos'), async (req, res) => { const [result] = await pool.query('UPDATE academic_years SET name = COALESCE(?, name), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date) WHERE id = ?', [req.body.name?.trim() || null, req.body.startDate || null, req.body.endDate || null, Number(req.params.id)]); if (!result.affectedRows) return res.status(404).json({ error: 'Academic year not found.' }); res.json({ message: 'Academic year updated.' }); });
app.post('/api/academic-years/:id/set-current', requireAuth, authorize('admin', 'dos'), async (req, res) => { const id = Number(req.params.id); const [result] = await pool.query('UPDATE academic_years SET is_current = (id = ?), status = CASE WHEN id = ? AND status = \'planning\' THEN \'active\' ELSE status END', [id, id]); if (!result.affectedRows) return res.status(404).json({ error: 'Academic year not found.' }); res.json({ message: 'Current academic year updated.' }); });
app.post('/api/academic-years/:id/reopen', requireAuth, authorize('admin', 'dos'), async (req, res) => { const [result] = await pool.query("UPDATE academic_years SET status = 'planning' WHERE id = ?", [Number(req.params.id)]); if (!result.affectedRows) return res.status(404).json({ error: 'Academic year not found.' }); res.json({ message: 'Academic year reopened.' }); });
app.delete('/api/academic-years/:id', requireAuth, authorize('admin', 'dos'), async (req, res) => { const [result] = await pool.query('DELETE FROM academic_years WHERE id = ? AND is_current = FALSE', [Number(req.params.id)]); if (!result.affectedRows) return res.status(409).json({ error: 'Current or missing academic year cannot be deleted.' }); res.json({ message: 'Academic year deleted.' }); });

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
  const [rows] = await pool.query(`SELECT u.id, u.full_name AS fullName, u.email, u.phone, u.is_active AS isActive, tp.employee_number AS employeeNumber, tp.contract_type AS contractType, tp.contract_start AS contractStart, tp.contract_end AS contractEnd, tp.salary FROM users u LEFT JOIN teacher_profiles tp ON tp.user_id = u.id WHERE u.role = 'teacher' GROUP BY u.id, u.full_name, u.email, u.phone, u.is_active, tp.employee_number, tp.contract_type, tp.contract_start, tp.contract_end, tp.salary ORDER BY u.full_name`);
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

app.get('/api/academic-years', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => {
  const [rows] = await pool.query('SELECT id, name, start_date AS startDate, end_date AS endDate, status, is_current AS isCurrent FROM academic_years ORDER BY start_date DESC');
  res.json({ years: rows });
});

app.get('/api/academic-years/current', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => {
  const [[year]] = await pool.query('SELECT id, name, start_date AS startDate, end_date AS endDate, status, is_current AS isCurrent FROM academic_years WHERE is_current = TRUE LIMIT 1');
  res.json(year || null);
});

app.get('/api/academic-years/:id', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => {
  const yearId = Number(req.params.id);
  const [[year]] = await pool.query('SELECT id, name, start_date AS startDate, end_date AS endDate, status, is_current AS isCurrent FROM academic_years WHERE id = ? LIMIT 1', [yearId]);
  if (!year) return res.status(404).json({ error: 'Academic year not found.' });
  const [terms] = await pool.query('SELECT id, term_number AS termNumber, name, start_date AS startDate, end_date AS endDate, status FROM academic_year_terms WHERE academic_year_id = ? ORDER BY term_number', [yearId]);
  res.json({ ...year, terms });
});

app.post('/api/academic-years', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const terms = Array.isArray(req.body?.terms) ? req.body.terms.slice(0, 3) : [];
  if (!name || !req.body.startDate || !req.body.endDate || terms.length !== 3) return res.status(400).json({ error: 'Name, dates and exactly three terms are required.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query('INSERT INTO academic_years (name, start_date, end_date, status, is_current, created_by) VALUES (?, ?, ?, ?, ?, ?)', [name, req.body.startDate, req.body.endDate, req.body.setCurrent ? 'active' : 'planning', Boolean(req.body.setCurrent), req.user.sub]);
    if (req.body.setCurrent) await connection.query('UPDATE academic_years SET is_current = FALSE WHERE id <> ?', [result.insertId]);
    for (let index = 0; index < terms.length; index += 1) {
      const term = terms[index];
      await connection.query('INSERT INTO academic_year_terms (academic_year_id, term_number, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)', [result.insertId, index + 1, String(term.name || `Term ${index + 1}`).trim(), term.startDate, term.endDate]);
    }
    await connection.commit();
    res.status(201).json({ id: result.insertId, message: 'Academic year created.' });
  } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That academic year already exists.' }); throw error; } finally { connection.release(); }
});

app.post('/api/academic-years/:id/set-current', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const yearId = Number(req.params.id);
  const [result] = await pool.query('UPDATE academic_years SET is_current = (id = ?), status = CASE WHEN id = ? AND status = \'planning\' THEN \'active\' ELSE status END', [yearId, yearId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Academic year not found.' });
  res.json({ message: 'Current academic year updated.' });
});

app.patch('/api/academic-years/:id', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const yearId = Number(req.params.id); const updates = []; const values = [];
  if (req.body.name !== undefined) { updates.push('name = ?'); values.push(String(req.body.name).trim()); }
  if (req.body.startDate !== undefined) { updates.push('start_date = ?'); values.push(req.body.startDate); }
  if (req.body.endDate !== undefined) { updates.push('end_date = ?'); values.push(req.body.endDate); }
  if (!updates.length) return res.status(400).json({ error: 'No academic year fields supplied.' });
  values.push(yearId); const [result] = await pool.query(`UPDATE academic_years SET ${updates.join(', ')} WHERE id = ?`, values);
  if (!result.affectedRows) return res.status(404).json({ error: 'Academic year not found.' });
  res.json({ message: 'Academic year updated.' });
});

app.post('/api/academic-years/:yearId/terms/:termId/end', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const yearId = Number(req.params.yearId);
  const termId = Number(req.params.termId);
  if (!Number.isInteger(yearId) || !Number.isInteger(termId)) return res.status(400).json({ error: 'Valid academic year and term ids are required.' });
  const [result] = await pool.query("UPDATE academic_year_terms SET status = 'ended' WHERE id = ? AND academic_year_id = ? AND status <> 'ended'", [termId, yearId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Academic term not found or already ended.' });
  const [[summary]] = await pool.query('SELECT COUNT(*) AS total, SUM(status = \'ended\') AS ended FROM academic_year_terms WHERE academic_year_id = ?', [yearId]);
  res.json({ ended: Number(summary.ended || 0), total: Number(summary.total || 0), message: 'Academic term ended.' });
});

app.get('/api/academic-years/:yearId/terms/:termId/details', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => {
  const yearId = Number(req.params.yearId);
  const termId = Number(req.params.termId);
  if (!Number.isInteger(yearId) || !Number.isInteger(termId)) return res.status(400).json({ error: 'Valid academic year and term ids are required.' });

  const [[term]] = await pool.query('SELECT id, name, start_date, end_date, status FROM academic_year_terms WHERE id = ? AND academic_year_id = ?', [termId, yearId]);
  if (!term) return res.status(404).json({ error: 'Academic term not found.' });

  const dateRange = [term.start_date, term.end_date];
  const [[studentCount]] = await pool.query('SELECT COUNT(*) AS total FROM students WHERE status = \'active\'');
  const [attendanceRecords] = await pool.query('SELECT a.student_id AS student_id, s.full_name AS student_name, a.attendance_date, a.status FROM attendance a JOIN students s ON s.id = a.student_id WHERE a.attendance_date BETWEEN ? AND ? ORDER BY a.attendance_date DESC LIMIT 500', dateRange);
  const [[attendanceSummary]] = await pool.query("SELECT SUM(status = 'present') AS present, SUM(status = 'absent') AS absent, SUM(status = 'late') AS late, SUM(status = 'excused') AS excused FROM attendance WHERE attendance_date BETWEEN ? AND ?", dateRange);
  const [gradeRecords] = await pool.query('SELECT g.student_id AS student_id, s.full_name AS student_name, sub.name AS subject, g.assessment_name, g.score, g.max_score, g.created_at FROM grades g JOIN students s ON s.id = g.student_id JOIN subjects sub ON sub.id = g.subject_id WHERE g.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) ORDER BY g.created_at DESC LIMIT 500', dateRange);
  const [[gradeSummary]] = await pool.query('SELECT COUNT(*) AS count, COALESCE(AVG(score), 0) AS average_score FROM grades WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)', dateRange);
  const [disciplineRecords] = await pool.query('SELECT b.id, b.student_id AS student_id, s.full_name AS student_name, b.category, b.note, b.created_at FROM behavior_records b JOIN students s ON s.id = b.student_id WHERE b.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) ORDER BY b.created_at DESC LIMIT 500', dateRange);
  const [paymentRecords] = await pool.query('SELECT f.id, f.student_id AS student_id, s.full_name AS student_name, f.amount, f.reference, f.paid_at FROM fees f JOIN students s ON s.id = f.student_id WHERE f.paid_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) ORDER BY f.paid_at DESC LIMIT 500', dateRange);

  const bySubject = {};
  gradeRecords.forEach((grade) => {
    if (!bySubject[grade.subject]) bySubject[grade.subject] = { subject: grade.subject, count: 0, score: 0, max_score: 0 };
    bySubject[grade.subject].count += 1;
    bySubject[grade.subject].score += Number(grade.score || 0);
    bySubject[grade.subject].max_score += Number(grade.max_score || 0);
  });

  res.json({
    term,
    student_count: Number(studentCount.total || 0),
    attendance: { ...attendanceSummary, records: attendanceRecords },
    grades: { ...gradeSummary, records: gradeRecords, by_subject: Object.values(bySubject) },
    discipline: { count: disciplineRecords.length, records: disciplineRecords },
    payments: { total_paid: paymentRecords.reduce((total, payment) => total + Number(payment.amount || 0), 0), count: paymentRecords.length, records: paymentRecords },
    events: []
  });
});

app.get('/api/academic-years/:id/preview-close', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const yearId = Number(req.params.id);
  if (!Number.isInteger(yearId)) return res.status(400).json({ error: 'A valid academic year id is required.' });
  const [[year]] = await pool.query('SELECT id, name, status FROM academic_years WHERE id = ?', [yearId]);
  if (!year) return res.status(404).json({ error: 'Academic year not found.' });
  const [[terms]] = await pool.query("SELECT COUNT(*) AS total, SUM(status = 'ended') AS ended FROM academic_year_terms WHERE academic_year_id = ?", [yearId]);
  const [students] = await pool.query('SELECT id, full_name AS name, admission_number AS reg_number, class_name AS trade, academic_year AS from_level FROM students WHERE status = \'active\' AND academic_year = ? ORDER BY full_name', [year.name]);
  const plan = students.map((student) => ({ ...student, student_id: student.id, action: 'retained', to_level: student.from_level }));
  res.json({ year, ready_to_close: Number(terms.total || 0) > 0 && Number(terms.total) === Number(terms.ended || 0), pending_intake: 0, cohort_breakdown: {}, summary: { promoted: 0, graduated: 0, retained: plan.length }, plan });
});


app.post('/api/academic-years/:id/reopen', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const [result] = await pool.query("UPDATE academic_years SET status = 'planning' WHERE id = ?", [Number(req.params.id)]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Academic year not found.' });
  res.json({ message: 'Academic year reopened.' });
});

app.delete('/api/academic-years/:id', requireAuth, authorize('admin'), async (req, res) => {
  const [result] = await pool.query('DELETE FROM academic_years WHERE id = ? AND is_current = FALSE', [Number(req.params.id)]);
  if (!result.affectedRows) return res.status(409).json({ error: 'Current or missing academic year cannot be deleted.' });
  res.json({ message: 'Academic year deleted.' });
});

app.get('/api/finance/invoices', requireAuth, async (req, res) => {
  const params = []; let query = 'SELECT i.id, i.student_id AS studentId, st.full_name AS studentName, i.invoice_number AS invoiceNumber, i.description, i.amount, i.due_date AS dueDate, i.status FROM invoices i JOIN students st ON st.id = i.student_id';
  if (req.user.role === 'parent') { query += ' JOIN parent_students ps ON ps.student_id = i.student_id WHERE ps.parent_id = ?'; params.push(req.user.sub); }
  else if (req.user.role === 'student') { query += ' WHERE st.user_id = ?'; params.push(req.user.sub); }
  else if (!['admin', 'dos', 'accountant'].includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to view invoices.' });
  query += ' ORDER BY i.due_date DESC'; const [rows] = await pool.query(query, params); res.json({ invoices: rows });
});

app.post('/api/finance/payments', requireAuth, authorize('accountant'), async (req, res) => {
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

app.post('/api/finance/invoices', requireAuth, authorize('accountant'), async (req, res) => {
  const studentId = Number(req.body?.studentId); const amount = Number(req.body?.amount);
  const error = bodyErrors(req.body, [['invoiceNumber', 'Invoice number', 60], ['description', 'Description', 180]]);
  if (error || !Number.isInteger(studentId) || !Number.isFinite(amount) || amount <= 0 || !req.body.dueDate) return res.status(400).json({ error: error || 'Student, positive amount and due date are required.' });
  const [result] = await pool.query('INSERT INTO invoices (student_id, invoice_number, description, amount, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?)', [studentId, req.body.invoiceNumber.trim(), req.body.description.trim(), amount, req.body.dueDate, req.user.sub]);
  res.status(201).json({ id: result.insertId, message: 'Invoice created.' });
});

app.get('/api/finance/expenses', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => { const [rows] = await pool.query('SELECT id, category, description, amount, spent_at AS spentAt, photo_url AS photoUrl, document_url AS documentUrl, video_url AS videoUrl, budget_status AS budgetStatus FROM expenses ORDER BY spent_at DESC'); res.json({ expenses: rows }); });
app.post('/api/finance/expenses', requireAuth, authorize('accountant'), async (req, res) => {
  const amount = Number(req.body?.amount); const error = bodyErrors(req.body, [['category', 'Category', 100], ['description', 'Description', 180]]);
  if (error || !Number.isFinite(amount) || amount <= 0 || !req.body.spentAt) return res.status(400).json({ error: error || 'Category, description, positive amount and date are required.' });
  const [result] = await pool.query('INSERT INTO expenses (category, description, amount, spent_at, recorded_by) VALUES (?, ?, ?, ?, ?)', [req.body.category.trim(), req.body.description.trim(), amount, req.body.spentAt, req.user.sub]); res.status(201).json({ id: result.insertId, message: 'Expense recorded.' });
});
app.post('/api/finance/expenses/upload', requireAuth, authorize('accountant'), upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'document', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  const amount = Number(req.body?.amount); const error = bodyErrors(req.body, [['category', 'Budget', 100], ['description', 'Description', 180]]); const files = req.files || {};
  if (error || !Number.isFinite(amount) || amount <= 0 || !req.body.spentAt) { Object.values(files).flat().forEach((file) => fs.rmSync(file.path, { force: true })); return res.status(400).json({ error: error || 'Budget, description, positive amount and date are required.' }); }
  const fileUrl = (file) => file ? `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${file.filename}` : null;
  try { const [result] = await pool.query('INSERT INTO expenses (category, description, amount, spent_at, recorded_by, photo_url, document_url, video_url, budget_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [req.body.category.trim(), req.body.description.trim(), amount, req.body.spentAt, req.user.sub, fileUrl(files.photo?.[0]), fileUrl(files.document?.[0]), fileUrl(files.video?.[0]), ['greater', 'equal', 'less'].includes(req.body.budgetStatus) ? req.body.budgetStatus : 'less']); res.status(201).json({ id: result.insertId, message: 'Expense evidence saved.' }); } catch (error) { Object.values(files).flat().forEach((file) => fs.rmSync(file.path, { force: true })); throw error; }
});
app.get('/api/finance/budgets', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => { const [rows] = await pool.query('SELECT id, name, fiscal_year AS fiscalYear, amount, status, description, photo_url AS photoUrl, document_url AS documentUrl FROM budgets ORDER BY fiscal_year DESC'); res.json({ budgets: rows }); });
app.post('/api/finance/budgets', requireAuth, authorize('accountant'), async (req, res) => { const error = bodyErrors(req.body, [['name', 'Budget name', 120], ['fiscalYear', 'Fiscal year', 20]]); const amount = Number(req.body?.amount); if (error || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: error || 'Budget amount must be positive.' }); const [result] = await pool.query('INSERT INTO budgets (name, fiscal_year, amount, status, created_by) VALUES (?, ?, ?, ?, ?)', [req.body.name.trim(), req.body.fiscalYear.trim(), amount, req.body.status === 'approved' ? 'approved' : 'draft', req.user.sub]); res.status(201).json({ id: result.insertId, message: 'Budget saved.' }); });
app.post('/api/finance/budgets/upload', requireAuth, authorize('accountant'), upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'document', maxCount: 1 }]), async (req, res) => { const error = bodyErrors(req.body, [['name', 'Budget name', 120], ['fiscalYear', 'Fiscal year', 20], ['description', 'Description', 10000]]); const amount = Number(req.body?.amount); const files = req.files || {}; if (error || !Number.isFinite(amount) || amount <= 0) { Object.values(files).flat().forEach((file) => fs.rmSync(file.path, { force: true })); return res.status(400).json({ error: error || 'Budget name, description and a positive amount are required.' }); } const fileUrl = (file) => file ? `${process.env.PUBLIC_API_URL || `http://localhost:${port}`}/uploads/${file.filename}` : null; try { const [result] = await pool.query('INSERT INTO budgets (name, fiscal_year, amount, status, created_by, description, photo_url, document_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.body.name.trim(), req.body.fiscalYear.trim(), amount, req.body.status === 'approved' ? 'approved' : 'draft', req.user.sub, req.body.description.trim(), fileUrl(files.photo?.[0]), fileUrl(files.document?.[0])]); res.status(201).json({ id: result.insertId, message: 'Budget evidence saved.' }); } catch (uploadError) { Object.values(files).flat().forEach((file) => fs.rmSync(file.path, { force: true })); throw uploadError; } });

app.get('/api/transport/routes', requireAuth, async (_req, res) => { const [rows] = await pool.query('SELECT r.id, r.name, r.bus_number AS busNumber, r.driver_name AS driverName, r.driver_phone AS driverPhone, r.capacity, r.is_active AS isActive, COUNT(st.student_id) AS assignedCount, GREATEST(r.capacity - COUNT(st.student_id), 0) AS availableCapacity FROM transport_routes r LEFT JOIN student_transport st ON st.route_id = r.id GROUP BY r.id, r.name, r.bus_number, r.driver_name, r.driver_phone, r.capacity, r.is_active ORDER BY r.name'); res.json({ routes: rows }); });
app.post('/api/transport/routes', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => {
  const error = bodyErrors(req.body, [['name', 'Route name', 100], ['busNumber', 'Bus number', 40], ['driverName', 'Driver name', 120], ['driverPhone', 'Driver phone', 30]]); const capacity = Number(req.body?.capacity);
  if (error || !Number.isInteger(capacity) || capacity < 1) return res.status(400).json({ error: error || 'Capacity must be a positive whole number.' });
  const [result] = await pool.query('INSERT INTO transport_routes (name, bus_number, driver_name, driver_phone, capacity) VALUES (?, ?, ?, ?, ?)', [req.body.name.trim(), req.body.busNumber.trim(), req.body.driverName.trim(), req.body.driverPhone.trim(), capacity]); res.status(201).json({ id: result.insertId, message: 'Transport route created.' });
});
app.post('/api/transport/assign', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const studentId = Number(req.body?.studentId); const routeId = Number(req.body?.routeId); if (!Number.isInteger(studentId) || !Number.isInteger(routeId) || !req.body.pickupPoint?.trim()) return res.status(400).json({ error: 'Student, route and pickup point are required.' }); const [[route]] = await pool.query('SELECT capacity FROM transport_routes WHERE id = ?', [routeId]); if (!route) return res.status(404).json({ error: 'Transport route not found.' }); const [[existing]] = await pool.query('SELECT route_id AS routeId FROM student_transport WHERE student_id = ?', [studentId]); if (!existing || Number(existing.routeId) !== routeId) { const [[usage]] = await pool.query('SELECT COUNT(*) AS total FROM student_transport WHERE route_id = ?', [routeId]); if (Number(usage.total) >= Number(route.capacity)) return res.status(409).json({ error: 'This route has reached its capacity.' }); } await pool.query('INSERT INTO student_transport (student_id, route_id, pickup_point) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE route_id = VALUES(route_id), pickup_point = VALUES(pickup_point)', [studentId, routeId, req.body.pickupPoint.trim()]); res.status(201).json({ message: 'Student transport assigned.' }); });
app.get('/api/transport/assignments', requireAuth, async (req, res) => { const params = []; let query = 'SELECT st.student_id AS studentId, s.full_name AS studentName, s.class_name AS className, st.route_id AS routeId, r.name AS routeName, r.bus_number AS busNumber, r.driver_name AS driverName, st.pickup_point AS pickupPoint FROM student_transport st JOIN students s ON s.id = st.student_id JOIN transport_routes r ON r.id = st.route_id'; if (req.user.role === 'student') { query += ' WHERE s.user_id = ?'; params.push(req.user.sub); } else if (req.user.role === 'parent') { query += ' JOIN parent_students ps ON ps.student_id = s.id WHERE ps.parent_id = ?'; params.push(req.user.sub); } else if (!['admin', 'dos', 'teacher', 'accountant', 'librarian'].includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to view transport assignments.' }); query += ' ORDER BY r.name, s.full_name'; const [rows] = await pool.query(query, params); res.json({ assignments: rows }); });

app.get('/api/inventory', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => { const [rows] = await pool.query("SELECT i.id, i.name, i.category, i.quantity, i.reorder_level AS reorderLevel, i.unit_cost AS unitCost, i.location, COALESCE((SELECT SUM(t.quantity) FROM inventory_transactions t WHERE t.item_id = i.id AND t.type = 'in' AND t.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')), 0) AS monthlyAdded FROM inventory_items i ORDER BY i.name"); res.json({ items: rows }); });
app.post('/api/inventory', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const error = bodyErrors(req.body, [['name', 'Item name', 140], ['category', 'Category', 80]]); const quantity = Number(req.body?.quantity); if (error || !Number.isFinite(quantity) || quantity < 0) return res.status(400).json({ error: error || 'A non-negative quantity is required.' }); const connection = await pool.getConnection(); try { await connection.beginTransaction(); const [result] = await connection.query('INSERT INTO inventory_items (name, category, quantity, reorder_level, unit_cost, location, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.body.name.trim(), req.body.category.trim(), quantity, Number(req.body.reorderLevel || 0), Number(req.body.unitCost || 0), req.body.location?.trim() || null, req.user.sub]); if (quantity > 0) await connection.query('INSERT INTO inventory_transactions (item_id, type, quantity, note, moved_by) VALUES (?, \'in\', ?, ?, ?)', [result.insertId, quantity, 'Initial stock', req.user.sub]); await connection.commit(); res.status(201).json({ id: result.insertId, message: 'Inventory item created.' }); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } });
app.patch('/api/inventory/:id', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const error = bodyErrors(req.body, [['name', 'Item name', 140], ['category', 'Category', 80]]); const quantity = Number(req.body?.quantity); if (error || !Number.isFinite(quantity) || quantity < 0) return res.status(400).json({ error: error || 'A non-negative quantity is required.' }); const [result] = await pool.query('UPDATE inventory_items SET name = ?, category = ?, quantity = ?, reorder_level = ?, unit_cost = ?, location = ?, updated_by = ? WHERE id = ?', [req.body.name.trim(), req.body.category.trim(), quantity, Number(req.body.reorderLevel || 0), Number(req.body.unitCost || 0), req.body.location?.trim() || null, req.user.sub, Number(req.params.id)]); if (!result.affectedRows) return res.status(404).json({ error: 'Inventory item not found.' }); res.json({ message: 'Inventory item updated.' }); });
app.delete('/api/inventory/:id', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const [result] = await pool.query('DELETE FROM inventory_items WHERE id = ?', [Number(req.params.id)]); if (!result.affectedRows) return res.status(404).json({ error: 'Inventory item not found.' }); res.json({ message: 'Inventory item deleted.' }); });
app.post('/api/inventory/movements', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => { const itemId = Number(req.body?.itemId); const quantity = Number(req.body?.quantity); const type = req.body?.type; if (!Number.isInteger(itemId) || !Number.isInteger(quantity) || quantity < 1 || !['in', 'out'].includes(type)) return res.status(400).json({ error: 'Item, movement type and a positive quantity are required.' }); const connection = await pool.getConnection(); try { await connection.beginTransaction(); const [[item]] = await connection.query('SELECT quantity FROM inventory_items WHERE id = ? FOR UPDATE', [itemId]); if (!item) { await connection.rollback(); return res.status(404).json({ error: 'Inventory item not found.' }); } if (type === 'out' && quantity > Number(item.quantity)) { await connection.rollback(); return res.status(409).json({ error: 'Stock out quantity cannot exceed available stock.' }); } await connection.query('UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?', [type === 'in' ? quantity : -quantity, itemId]); const [result] = await connection.query('INSERT INTO inventory_transactions (item_id, type, quantity, note, moved_by) VALUES (?, ?, ?, ?, ?)', [itemId, type, quantity, req.body.note?.trim() || null, req.user.sub]); await connection.commit(); res.status(201).json({ id: result.insertId, message: 'Stock movement recorded.' }); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } });
app.get('/api/inventory/transactions', requireAuth, authorize('admin', 'dos', 'accountant'), async (_req, res) => { const [rows] = await pool.query("SELECT it.id, it.item_id AS itemId, i.name AS productName, it.type, it.quantity, it.note, it.created_at AS createdAt, i.quantity AS remainingStock, i.reorder_level AS reorderLevel, CASE WHEN i.quantity = 0 THEN 'out_of_stock' WHEN i.quantity <= i.reorder_level THEN 'low_stock' ELSE 'in_stock' END AS stockStatus FROM inventory_transactions it JOIN inventory_items i ON i.id = it.item_id ORDER BY it.created_at DESC"); res.json({ transactions: rows }); });
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

require('./test-builder-endpoints')({ app, pool, requireAuth, authorize, bodyErrors, positiveNumber });
require('./announcements-endpoints')({ app, pool, requireAuth });

/* ─── Graduates Endpoints ──────────────────────────────────────── */
app.get('/api/academic-years/graduates', requireAuth, authorize('admin', 'dos', 'accountant'), async (req, res) => {
  const yearId = req.query.year_id ? Number(req.query.year_id) : null;
  const trade = typeof req.query.trade === 'string' ? req.query.trade.trim() : null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : null;
  const limit = Math.min(Number(req.query.limit) || 1000, 5000);

  let query = `
    SELECT 
      sp.id as promotion_id,
      s.id,
      s.user_id,
      s.full_name,
      SUBSTRING_INDEX(s.full_name, ' ', 1) as first_name,
      SUBSTRING_INDEX(s.full_name, ' ', -1) as last_name,
      s.admission_number as reg_number,
      s.photo_key,
      s.class_name as from_level,
      sp.to_level as final_level,
      COALESCE(sp.to_level, sp.from_level) as trade,
      s.academic_year,
      ay.name as academic_year_name,
      ay.start_date,
      ay.end_date,
      s.graduation_date as graduated_at,
      s.graduated_cohort as promotion_notes,
      u.email as contact_email,
      u.phone as contact_phone,
      NULL as address_district,
      NULL as address_sector,
      NULL as guardian_name,
      NULL as guardian_phone
    FROM students s
    LEFT JOIN student_promotions sp ON s.id = sp.student_id
    LEFT JOIN academic_years ay ON sp.academic_year_id = ay.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.status = 'graduated'
  `;
  const params = [];

  if (yearId) {
    query += ' AND sp.academic_year_id = ?';
    params.push(yearId);
  }

  if (trade) {
    query += ' AND (sp.to_level = ? OR s.class_name = ?)';
    params.push(trade, trade);
  }

  if (search) {
    query += ' AND (LOWER(s.full_name) LIKE ? OR LOWER(s.admission_number) LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY ay.start_date DESC, s.full_name ASC LIMIT ?';
  params.push(limit);

  const [students] = await pool.query(query, params);

  // Get distinct years and trades for filters
  const [years] = await pool.query('SELECT DISTINCT ay.id, ay.name FROM academic_years ay JOIN student_promotions sp ON ay.id = sp.academic_year_id ORDER BY ay.start_date DESC');
  const [trades] = await pool.query('SELECT DISTINCT COALESCE(sp.to_level, sp.from_level, s.class_name) as trade FROM students s LEFT JOIN student_promotions sp ON s.id = sp.student_id WHERE s.status = \'graduated\' ORDER BY trade');

  // Group by year and trade
  const groups = [];
  const yearMap = {};

  students.forEach(student => {
    const yearKey = student.academic_year_name || 'Unknown';
    if (!yearMap[yearKey]) {
      yearMap[yearKey] = {
        year_id: student.academic_year_id,
        year_name: yearKey,
        start_date: student.start_date,
        end_date: student.end_date,
        total: 0,
        trades: {}
      };
    }
    const year = yearMap[yearKey];
    const tradeName = student.trade || 'Unassigned';
    if (!year.trades[tradeName]) {
      year.trades[tradeName] = {
        trade: tradeName,
        count: 0,
        students: []
      };
    }
    year.trades[tradeName].students.push(student);
    year.trades[tradeName].count += 1;
    year.total += 1;
  });

  Object.values(yearMap).forEach(year => {
    year.trades = Object.values(year.trades);
    groups.push(year);
  });

  const total = students.length;

  res.json({
    total,
    groups,
    filters: {
      years: years,
      trades: trades.map(t => t.trade).filter(Boolean)
    }
  });
});

app.post('/api/academic-years/:id/close', requireAuth, authorize('admin', 'dos'), async (req, res) => {
  const yearId = Number(req.params.id);
  const overrides = Array.isArray(req.body?.overrides) ? req.body.overrides : [];
  const nextYearData = req.body?.next_year || null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get the year to close
    const [[year]] = await connection.query('SELECT id, name, status FROM academic_years WHERE id = ?', [yearId]);
    if (!year) { await connection.rollback(); return res.status(404).json({ error: 'Academic year not found.' }); }
    if (year.status === 'closed') { await connection.rollback(); return res.status(409).json({ error: 'Academic year is already closed.' }); }

    if (!nextYearData?.name || !nextYearData.start_date || !nextYearData.end_date) {
      await connection.rollback();
      return res.status(400).json({ error: 'Next academic year name and dates are required.' });
    }

    let nextYearId;
    try {
      const [nextYearResult] = await connection.query(
        'INSERT INTO academic_years (name, start_date, end_date, status, is_current, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [nextYearData.name.trim(), nextYearData.start_date, nextYearData.end_date, nextYearData.set_current ? 'active' : 'planning', nextYearData.set_current ? 1 : 0, req.user.sub]
      );
      nextYearId = nextYearResult.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        await connection.rollback();
        return res.status(409).json({ error: 'That next academic year already exists.' });
      }
      throw error;
    }

    if (nextYearData.set_current) await connection.query('UPDATE academic_years SET is_current = FALSE WHERE id <> ?', [nextYearId]);
    for (let i = 0; i < (nextYearData.terms || []).length; i += 1) {
      const term = nextYearData.terms[i];
      await connection.query(
        'INSERT INTO academic_year_terms (academic_year_id, term_number, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
        [nextYearId, i + 1, String(term.name || `Term ${i + 1}`).trim(), term.start_date || term.startDate, term.end_date || term.endDate]
      );
    }

    // Get all active students
    const [students] = await connection.query(
      'SELECT id, full_name, academic_year, class_name FROM students WHERE status = \'active\' AND academic_year = ? ORDER BY id',
      [year.name]
    );

    const overrideMap = {};
    overrides.forEach(ovr => {
      overrideMap[ovr.student_id] = ovr;
    });

    if (overrides.some((override) => !['promoted', 'retained', 'graduated'].includes(override.action))) {
      await connection.rollback();
      return res.status(400).json({ error: 'Each promotion action must be promoted, retained, or graduated.' });
    }

    let promoted = 0, graduated = 0, retained = 0;

    // Process each student
    for (const student of students) {
      const override = overrideMap[student.id];
      const action = override?.action || 'retained';
      const toLevel = action === 'graduated' ? null : (override?.to_level || student.class_name);
      if (action === 'promoted' && !String(toLevel || '').trim()) {
        await connection.rollback();
        return res.status(400).json({ error: `A destination level is required for ${student.full_name}.` });
      }

      // Record promotion/graduation
      await connection.query(
        'INSERT INTO student_promotions (student_id, academic_year_id, from_level, to_level, action, created_by) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE from_level = VALUES(from_level), to_level = VALUES(to_level), action = VALUES(action), promoted_at = CURRENT_TIMESTAMP, created_by = VALUES(created_by)',
        [student.id, yearId, student.class_name, toLevel, action, req.user.sub]
      );

      if (action === 'graduated') {
        // Mark student as graduated
        await connection.query(
          'UPDATE students SET status = \'graduated\', graduation_date = CURRENT_DATE, graduated_cohort = ? WHERE id = ?',
          [year.name, student.id]
        );
        graduated += 1;
      } else if (action === 'promoted') {
        // Update student class to new level
        await connection.query(
          'UPDATE students SET class_name = ?, academic_year = ? WHERE id = ?',
          [toLevel, nextYearData.name.trim(), student.id]
        );
        promoted += 1;
      } else {
        await connection.query('UPDATE students SET academic_year = ? WHERE id = ?', [nextYearData.name.trim(), student.id]);
        retained += 1;
      }
    }

    // Close the year
    await connection.query("UPDATE academic_years SET status = 'closed', is_current = FALSE WHERE id = ?", [yearId]);

    await connection.commit();
    res.json({ promoted, graduated, retained, message: 'Academic year closed successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(503).json({ error: 'Failed to close academic year.' });
  } finally {
    connection.release();
  }
});

app.post('/api/behavior', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => { const studentId = Number(req.body?.studentId); const categories = ['excellent', 'good', 'needs_improvement', 'discipline']; const error = bodyErrors(req.body, [['note', 'Behavior note', 3000]]); if (error || !Number.isInteger(studentId) || !categories.includes(req.body.category)) return res.status(400).json({ error: error || 'Student, category and note are required.' }); if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' }); const connection = await pool.getConnection(); try { await connection.beginTransaction(); const [[student]] = await connection.query('SELECT id, full_name AS fullName, user_id AS userId, conduct_score AS conductScore FROM students WHERE id = ? FOR UPDATE', [studentId]); if (!student) { await connection.rollback(); return res.status(404).json({ error: 'Student not found.' }); } const [[countRow]] = await connection.query("SELECT COUNT(*) AS total FROM behavior_records WHERE student_id = ? AND category = 'needs_improvement'", [studentId]); const deduction = req.body.category === 'discipline' || (req.body.category === 'needs_improvement' && Number(countRow.total) >= 1) ? 2 : 0; const nextScore = Math.max(0, Number(student.conductScore ?? 100) - deduction); const [result] = await connection.query('INSERT INTO behavior_records (student_id, category, note, recorded_by, score_deduction, score_after) VALUES (?, ?, ?, ?, ?, ?)', [studentId, req.body.category, req.body.note.trim(), req.user.sub, deduction, nextScore]); await connection.query('UPDATE students SET conduct_score = ?, conduct_updated_at = IF(? > 0, CURRENT_TIMESTAMP, conduct_updated_at) WHERE id = ?', [nextScore, deduction, studentId]); if (deduction > 0) { const message = `Your conduct score changed by -${deduction}. Current score: ${nextScore}/100.`; if (student.userId) await connection.query('INSERT INTO notifications (recipient_id, channel, title, message, sent_at) VALUES (?, \'in_app\', ?, ?, NOW())', [student.userId, 'Conduct score updated', message]); await connection.query('INSERT INTO notifications (recipient_id, channel, title, message, sent_at) SELECT ps.parent_id, \'in_app\', ?, ?, NOW() FROM parent_students ps WHERE ps.student_id = ?', ['Student conduct score updated', `${student.fullName}: ${message}`, studentId]); } await connection.commit(); res.status(201).json({ id: result.insertId, deduction, score: nextScore, message: deduction ? `Behavior record saved. ${deduction} points deducted.` : 'Behavior record saved.' }); } catch (behaviorError) { await connection.rollback(); throw behaviorError; } finally { connection.release(); } });
app.delete('/api/behavior/:id', requireAuth, authorize('admin', 'dos', 'teacher'), async (req, res) => { const recordId = Number(req.params.id); if (!Number.isInteger(recordId)) return res.status(400).json({ error: 'A valid behavior record id is required.' }); const [records] = await pool.query('SELECT student_id AS studentId FROM behavior_records WHERE id = ?', [recordId]); if (!records[0]) return res.status(404).json({ error: 'Behavior record not found.' }); if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, records[0].studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' }); const studentId = records[0].studentId; const [result] = await pool.query('DELETE FROM behavior_records WHERE id = ?', [recordId]); if (!result.affectedRows) return res.status(404).json({ error: 'Behavior record not found.' }); const [[counts]] = await pool.query("SELECT SUM(category = 'discipline') AS disciplineCount, SUM(category = 'needs_improvement') AS needsCount FROM behavior_records WHERE student_id = ?", [studentId]); const restoredScore = Math.max(0, 100 - (Number(counts.disciplineCount || 0) * 2) - (Math.max(0, Number(counts.needsCount || 0) - 1) * 2)); await pool.query('UPDATE students SET conduct_score = ?, conduct_updated_at = CURRENT_TIMESTAMP WHERE id = ?', [restoredScore, studentId]); res.json({ score: restoredScore, message: 'Behavior record deleted.' }); });
app.get('/api/behavior', requireAuth, async (req, res) => { const studentId = Number(req.query.studentId); if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'studentId is required.' }); if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' }); if (req.user.role === 'student' && (await getStudentForUser(req.user)) !== studentId) return res.status(403).json({ error: 'You can only view your own behavior records.' }); if (req.user.role === 'parent') { const [linked] = await pool.query('SELECT 1 FROM parent_students WHERE parent_id = ? AND student_id = ?', [req.user.sub, studentId]); if (!linked.length) return res.status(403).json({ error: 'This student is not linked to your account.' }); } const [[student]] = await pool.query('SELECT conduct_score AS conductScore FROM students WHERE id = ?', [studentId]); const [rows] = await pool.query('SELECT id, category, note, score_deduction AS deduction, score_after AS scoreAfter, created_at AS createdAt FROM behavior_records WHERE student_id = ? ORDER BY created_at DESC', [studentId]); res.json({ score: Number(student?.conductScore ?? 100), records: rows }); });
app.get('/api/students/:id/report', requireAuth, async (req, res) => { const studentId = Number(req.params.id); if (!Number.isInteger(studentId)) return res.status(400).json({ error: 'A valid student id is required.' }); if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.sub, studentId))) return res.status(403).json({ error: 'This student is outside your assignment.' }); if (req.user.role === 'student' && (await getStudentForUser(req.user)) !== studentId) return res.status(403).json({ error: 'You can only view your own report.' }); if (req.user.role === 'parent') { const [linked] = await pool.query('SELECT 1 FROM parent_students WHERE parent_id = ? AND student_id = ?', [req.user.sub, studentId]); if (!linked.length) return res.status(403).json({ error: 'This student is not linked to your account.' }); } const [[student]] = await pool.query('SELECT id, admission_number AS admissionNumber, full_name AS fullName, class_name AS className, status FROM students WHERE id = ?', [studentId]); if (!student) return res.status(404).json({ error: 'Student not found.' }); const [grades] = await pool.query('SELECT s.name AS subject, SUM(g.score) AS score, SUM(g.max_score) AS maxScore FROM grades g JOIN subjects s ON s.id = g.subject_id WHERE g.student_id = ? GROUP BY g.subject_id, s.name ORDER BY s.name', [studentId]); const [attendance] = await pool.query("SELECT status, COUNT(*) AS total FROM attendance WHERE student_id = ? GROUP BY status", [studentId]); const [behavior] = await pool.query('SELECT category, note, created_at AS createdAt FROM behavior_records WHERE student_id = ? ORDER BY created_at DESC LIMIT 20', [studentId]); res.json({ student, grades, attendance, behavior }); });

app.get('/api/parent/summary', requireAuth, authorize('parent'), async (req, res) => { const [rows] = await pool.query(`SELECT s.id, s.full_name AS fullName, s.admission_number AS admissionNumber, s.class_name AS className, s.conduct_score AS conductScore, COALESCE((SELECT SUM(f.amount) FROM fees f WHERE f.student_id = s.id), 0) AS feesPaid, (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'absent') AS absences FROM students s JOIN parent_students ps ON ps.student_id = s.id WHERE ps.parent_id = ?`, [req.user.sub]); res.json({ children: rows }); });

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'An unexpected server error occurred.' }); });


async function startServer() {
  try {
    await runPendingMigrations(pool);
    app.listen(port, () => {
      console.log(`FKAMS API listening on http://localhost:${port}`);
      processEnrollmentQueue().catch((error) => console.error(`[FKAMS enrollment queue] ${error.message}`));
      setInterval(() => processEnrollmentQueue().catch((error) => console.error(`[FKAMS enrollment queue] ${error.message}`)), 60 * 1000).unref();
    });
  } catch (error) {
    console.error('Failed to run migrations. API was not started:', error);
    await pool.end();
    process.exitCode = 1;
  }
}

startServer();
