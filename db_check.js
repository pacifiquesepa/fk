const mysql = require('mysql2/promise');
const fs = require('fs');
(async () => {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'fkams' });
  const [rows] = await conn.query('SELECT id, username, email, role, is_active, password_hash FROM users WHERE username = ? OR email = ? LIMIT 20', ['admin123', 'admin@fkams.local']);
  fs.writeFileSync('d:/project/fk/db_check_result.json', JSON.stringify(rows, null, 2));
  await conn.end();
})();
