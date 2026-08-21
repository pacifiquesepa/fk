require('dotenv').config();

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fkams',
};

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin123';
  const password = process.env.ADMIN_PASSWORD || 'Admin12345$';
  const fullName = process.env.ADMIN_NAME || 'System Administrator';
  const email = process.env.ADMIN_EMAIL || 'admin@fkams.local';
  const phone = process.env.ADMIN_PHONE || null;
  const passwordHash = await bcrypt.hash(password, 12);
  const connection = await mysql.createConnection(config);

  try {
    await connection.execute(
      `INSERT INTO users (full_name, username, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, 'admin', TRUE)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         email = VALUES(email),
         phone = VALUES(phone),
         password_hash = VALUES(password_hash),
         role = 'admin',
         is_active = TRUE`,
      [fullName, username, email, phone, passwordHash],
    );
    console.log(`Default admin is ready: ${username}`);
  } finally {
    await connection.end();
  }
}

seedAdmin().catch((error) => {
  console.error(`Unable to seed admin: ${error.message}`);
  process.exitCode = 1;
});
