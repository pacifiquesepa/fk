# FKAMS Backend

Node.js + Express + MySQL API for Forever King Academy Management System.

## Setup

1. Install dependencies:

```powershell
npm install
```

2. Create the database and tables:

```powershell
mysql -u root -p < schema.sql
```

After the base schema, apply later migrations in order:

```powershell
mysql -u root -p fkams < migrations/002_admission_profiles.sql
mysql -u root -p fkams < migrations/003_publications.sql
mysql -u root -p fkams < migrations/006_password_reset.sql
```

3. Copy `.env.example` to `.env` and set a long random `JWT_SECRET` plus the MySQL credentials.

4. Create the default administrator account:

```powershell
npm run seed:admin
```

The default development credentials are `admin123` and `Admin12345$`. The password is stored as a bcrypt hash. The account uses `admin@fkams.local` for the default console OTP destination; change `ADMIN_EMAIL` before using a real OTP provider.

5. Start the API:

```powershell
npm start
```

The API listens on `http://localhost:4000` by default.

To deliver OTPs by email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and optionally `SMTP_FROM`/`SMTP_SECURE` in `.env`. Without SMTP settings, development OTPs are printed in the backend console.

## Main routes

- `GET /api/health` - API/database health
- `POST /api/auth/login` - username/email and password verification; returns an OTP challenge for configured roles
- `POST /api/auth/verify-otp` - verify the six-digit OTP and receive a JWT
- `POST /api/auth/resend-otp` - request a new OTP with throttling
- `POST /api/auth/forgot-password`, `POST /api/auth/verify-reset-otp`, `POST /api/auth/reset-password` - two-minute password recovery OTP flow
- `GET /api/dashboard` - admin/DOS/accountant metrics
- `POST /api/users` - admin/DOS user creation
- `GET|POST /api/students` - role-scoped student records
- `GET /api/students/qr/:token` - secure QR identity lookup
- `POST /api/applications` - public admission application
- `GET /api/applications` - admin/DOS application review
- `PATCH /api/applications/:id/status` - approve/reject with comment
- Approving an application atomically creates the student user, temporary password, admission number and QR token.
- `POST /api/students` - DOS/admin registration for students who did not apply
- `POST /api/teachers/register` - DOS/admin teacher registration with automatic QR token
- `GET /api/student/profile` - student read-only profile and QR data
- `PATCH /api/student/profile/photo` - student-only photo update
- `PATCH /api/dos/students/:id/profile` - DOS/admin full student profile update
- `GET|POST /api/attendance` - role-scoped attendance
- `GET|POST /api/classes` - class management
- `GET|POST /api/subjects` - subject management
- `POST /api/teacher-assignments` - assign teacher, class and subject
- `GET|POST /api/tests` - tests visible by role/assignment
- `POST /api/tests/:id/questions` - choice, fill and match questions
- `POST /api/tests/:id/attempts` - student starts one attempt
- `POST /api/test-attempts/:id/submit` - server-side timed submission/grading
- `GET|POST /api/grades` - role-scoped academic grades
- `GET|POST /api/notices` - school notices
- `GET|POST /api/timetable` - class timetable
- `GET /api/teachers` and `POST /api/teachers/:id/profile` - teacher contracts and profiles
- `POST /api/staff-attendance` - staff attendance
- `GET|POST /api/finance/invoices` - fee invoices, scoped to parents/students
- `GET|POST /api/finance/payments` - fee payments and history
- `GET|POST /api/finance/expenses` - expenses
- `GET|POST /api/finance/budgets` - budgets
- `GET|POST /api/transport/routes` and `POST /api/transport/assign` - transport
- `GET|POST /api/inventory` - store inventory
- `GET|POST /api/assets` - asset register
- `GET|POST /api/library/books` - library catalogue
- `GET|POST /api/library/loans` and `PATCH /api/library/loans/:id/return` - borrowing and returns
- `GET /api/feeding/stock` and `POST /api/feeding/records` - feeding
- `GET|POST /api/documents` - document metadata and secure visibility
- `GET /api/publications` - public announcements and documents for the website
- `GET /api/news` and `POST /api/news` - public news and event posts
- `GET /api/curriculum` and `POST /api/curriculum` - public curriculum managed by Admin/DOS
- `GET|POST /api/homework` - teacher homework and role-scoped viewing
- `GET /api/notifications` and `PATCH /api/notifications/:id/read` - parent/user notifications
- `GET|POST /api/behavior` - behavior records
- `GET /api/students/:id/report` - consolidated student report

## OTP login

By default OTP is required for `admin`, `dos`, `parent`, `teacher`, `accountant` and `librarian`. The `student` role is excluded by default. Change `OTP_ROLES` in `.env` if the policy changes. Users in OTP roles need an email (default `OTP_CHANNEL=email`) or phone (with `OTP_CHANNEL=sms`).

For local development, `OTP_PROVIDER=console` prints the code in the backend terminal and never returns it in the HTTP response. A real email/SMS adapter must replace this provider before production; do not expose OTP codes through the frontend or API response.

## Security behavior

- Passwords are stored as bcrypt hashes; plain passwords are never persisted.
- JWTs expire after eight hours and protected routes require `Authorization: Bearer <token>`.
- OTP codes are hashed, expire after five minutes by default, are single-use, and allow only five verification attempts.
- Role middleware blocks unauthorized modules.
- Teacher access is limited to assigned class/subject students.
- Parents can access only linked children; students can access only their own records.
- Test expiry is checked on the API, so changing the browser clock cannot extend a test.
- SQL values use parameterized queries.
- Helmet, restricted CORS, JSON size limits and login attempt throttling are enabled.

Automatic backups should be configured at the infrastructure level, for example with a scheduled `mysqldump` job and encrypted off-site storage. Do not commit `.env` or database backups.

The document endpoint stores metadata and a `storageKey`; connect that key to private object storage (or a protected file service) before production. The schema intentionally keeps file bytes outside MySQL.
