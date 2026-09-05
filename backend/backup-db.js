const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '3306',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fkams',
};

const backupDir = path.join(__dirname, 'backups');
fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = path.join(backupDir, `fkams-${timestamp}.sql`);

const dumpCommand = [
    'mysqldump',
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    `--password=${config.password}`,
    config.database,
    '--result-file', outputFile,
].join(' ');

try {
    execSync(dumpCommand, { stdio: 'inherit' });
    console.log(`Database backup created successfully: ${outputFile}`);
} catch (error) {
    console.error('Database backup failed. Check MySQL credentials or the mysqldump binary.', error.message);
    process.exitCode = 1;
}
