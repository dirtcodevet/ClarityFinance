/**
 * Migration 002: Add starting_balance_date to accounts
 *
 * Adds a starting_balance_date column to the accounts table to track
 * when the starting balance was set. This allows accurate current balance
 * calculation by only including transactions after this date.
 *
 * For existing accounts, defaults to created_at date.
 */

function up(db) {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(accounts)").all();
  const columnNames = tableInfo.map(col => col.name);

  // Add starting_balance_date column if it doesn't exist
  if (!columnNames.includes('starting_balance_date')) {
    db.exec(`
      ALTER TABLE accounts
      ADD COLUMN starting_balance_date TEXT
    `);
  }

  // Set starting_balance_date to created_at for existing accounts (safe to run even if column exists)
  db.exec(`
    UPDATE accounts
    SET starting_balance_date = created_at
    WHERE starting_balance_date IS NULL
  `);

  console.log('[Migration 002] Added starting_balance_date to accounts table');
}

function down(db) {
  // SQLite doesn't support DROP COLUMN directly
  // We need to recreate the table without the column

  // Create temporary table with old schema
  db.exec(`
    CREATE TABLE accounts_backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      starting_balance REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0
    )
  `);

  // Copy data
  db.exec(`
    INSERT INTO accounts_backup (id, bank_name, account_type, starting_balance, created_at, updated_at, is_deleted)
    SELECT id, bank_name, account_type, starting_balance, created_at, updated_at, is_deleted
    FROM accounts
  `);

  // Drop new table
  db.exec('DROP TABLE accounts');

  // Rename backup to original
  db.exec('ALTER TABLE accounts_backup RENAME TO accounts');

  console.log('[Migration 002] Removed starting_balance_date from accounts table');
}

module.exports = { up, down };
