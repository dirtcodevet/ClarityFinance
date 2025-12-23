/**
 * Migration 003: Add recurring expense support
 *
 * Adds is_recurring and recurrence_end_date columns to planned_expenses table.
 * This allows expenses like rent to automatically appear in future months.
 */

function up(db) {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(planned_expenses)").all();
  const columnNames = tableInfo.map(col => col.name);

  const hasIsRecurring = columnNames.includes('is_recurring');
  const hasRecurrenceEndDate = columnNames.includes('recurrence_end_date');

  // Add is_recurring column if it doesn't exist
  if (!hasIsRecurring) {
    db.exec(`
      ALTER TABLE planned_expenses
      ADD COLUMN is_recurring INTEGER DEFAULT 0
    `);
  }

  // Add recurrence_end_date column if it doesn't exist
  if (!hasRecurrenceEndDate) {
    db.exec(`
      ALTER TABLE planned_expenses
      ADD COLUMN recurrence_end_date TEXT
    `);
  }

  // Set all existing expenses to non-recurring (safe to run even if column exists)
  db.exec(`
    UPDATE planned_expenses
    SET is_recurring = 0
    WHERE is_recurring IS NULL
  `);

  console.log('[Migration 003] Added recurring expense support to planned_expenses table');
}

function down(db) {
  // SQLite doesn't support DROP COLUMN directly
  // We need to recreate the table without the columns

  // Create temporary table with old schema
  db.exec(`
    CREATE TABLE planned_expenses_backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bucket_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      account_id INTEGER NOT NULL,
      due_dates TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (bucket_id) REFERENCES buckets(id),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )
  `);

  // Copy data
  db.exec(`
    INSERT INTO planned_expenses_backup
    (id, bucket_id, category_id, description, amount, account_id, due_dates, created_at, updated_at, is_deleted)
    SELECT id, bucket_id, category_id, description, amount, account_id, due_dates, created_at, updated_at, is_deleted
    FROM planned_expenses
  `);

  // Drop new table
  db.exec('DROP TABLE planned_expenses');

  // Rename backup to original
  db.exec('ALTER TABLE planned_expenses_backup RENAME TO planned_expenses');

  console.log('[Migration 003] Removed recurring expense support from planned_expenses table');
}

module.exports = { up, down };
