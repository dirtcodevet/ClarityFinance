/**
 * Migration 004: Add effective_from dates to budget items
 *
 * Adds effective_from column to accounts, income_sources, planned_expenses, and goals.
 * This allows budget items to have a start date - they appear in all months >= effective_from.
 * Items without an effective_from date are treated as created at the earliest possible time.
 *
 * For existing items, defaults to created_at date.
 */

function up(db) {
  const tables = ['accounts', 'income_sources', 'planned_expenses', 'goals'];

  tables.forEach(table => {
    // Check if column already exists
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    const columnNames = tableInfo.map(col => col.name);

    // Add effective_from column if it doesn't exist
    if (!columnNames.includes('effective_from')) {
      db.exec(`
        ALTER TABLE ${table}
        ADD COLUMN effective_from TEXT
      `);
    }

    // Set effective_from to created_at for existing items (safe to run even if column exists)
    db.exec(`
      UPDATE ${table}
      SET effective_from = created_at
      WHERE effective_from IS NULL
    `);
  });

  console.log('[Migration 004] Added effective_from dates to budget tables');
}

function down(db) {
  // SQLite doesn't support DROP COLUMN directly
  // We need to recreate each table without the column

  // Create backup tables with old schema
  db.exec(`
    CREATE TABLE accounts_backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      starting_balance REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      starting_balance_date TEXT
    )
  `);

  db.exec(`
    CREATE TABLE income_sources_backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_name TEXT NOT NULL,
      income_type TEXT NOT NULL,
      amount REAL NOT NULL,
      account_id INTEGER NOT NULL,
      pay_dates TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )
  `);

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
      is_recurring INTEGER DEFAULT 0,
      recurrence_end_date TEXT,
      FOREIGN KEY (bucket_id) REFERENCES buckets(id),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )
  `);

  db.exec(`
    CREATE TABLE goals_backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      target_date TEXT NOT NULL,
      funded_amount REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0
    )
  `);

  // Copy data
  db.exec(`
    INSERT INTO accounts_backup
    SELECT id, bank_name, account_type, starting_balance, created_at, updated_at, is_deleted, starting_balance_date
    FROM accounts
  `);

  db.exec(`
    INSERT INTO income_sources_backup
    SELECT id, source_name, income_type, amount, account_id, pay_dates, created_at, updated_at, is_deleted
    FROM income_sources
  `);

  db.exec(`
    INSERT INTO planned_expenses_backup
    SELECT id, bucket_id, category_id, description, amount, account_id, due_dates, created_at, updated_at, is_deleted, is_recurring, recurrence_end_date
    FROM planned_expenses
  `);

  db.exec(`
    INSERT INTO goals_backup
    SELECT id, name, target_amount, target_date, funded_amount, created_at, updated_at, is_deleted
    FROM goals
  `);

  // Drop new tables
  db.exec('DROP TABLE accounts');
  db.exec('DROP TABLE income_sources');
  db.exec('DROP TABLE planned_expenses');
  db.exec('DROP TABLE goals');

  // Rename backups to original
  db.exec('ALTER TABLE accounts_backup RENAME TO accounts');
  db.exec('ALTER TABLE income_sources_backup RENAME TO income_sources');
  db.exec('ALTER TABLE planned_expenses_backup RENAME TO planned_expenses');
  db.exec('ALTER TABLE goals_backup RENAME TO goals');

  console.log('[Migration 004] Removed effective_from dates from budget tables');
}

module.exports = { up, down };
