/**
 * Automatic migration handler for FKAMS
 * Runs pending migrations at server startup
 */

const fs = require('fs');
const path = require('path');

async function runPendingMigrations(pool) {
    console.log('🔄 Checking for pending migrations...');

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => ['011_behavior_scores.sql', '012_behavior_record_scores.sql', '013_user_profile_photo.sql', '014_graduates_promotions.sql', '015_attendance_workflow.sql', '016_admission_notifications.sql', '017_application_files.sql', '018_delayed_admission_enrollment.sql', '019_subject_notes.sql', '020_subject_modules.sql', '021_finance_evidence.sql', '022_transport_tables.sql', '023_inventory_transactions.sql'].includes(f))
        .sort();

    for (const file of migrationFiles) {
        const migrationPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        // Split by semicolon and execute each statement
        const statements = sql
            .split(/\r?\n/)
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        const connection = await pool.getConnection();
        try {
            for (const statement of statements) {
                try {
                    await connection.query(statement);
                } catch (err) {
                    // Allow "already exists" errors - they're not failures
                    if (
                        err.code === 'ER_TABLE_EXISTS_ERROR' ||
                        err.code === 'ER_DUP_FIELDNAME' ||
                        err.code === 'ER_DUP_KEYNAME' ||
                        err.code === 'ER_FK_DUP_NAME' ||
                        err.message.includes('already exists')
                    ) {
                        // Silently skip
                        continue;
                    }
                    // Re-throw other errors
                    throw err;
                }
            }
            console.log(`  ✓ ${file}`);
        } catch (error) {
            console.error(`  ✗ ${file}: ${error.message}`);
            throw error;
        } finally {
            connection.release();
        }
    }

    console.log('✅ Migrations complete\n');
}

module.exports = { runPendingMigrations };
