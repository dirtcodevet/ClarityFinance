/**
 * Migration 001: Initial Schema
 * 
 * Creates all tables for the Clarity Finance application.
 * 
 * Tables created:
 * - config
 * - accounts
 * - income_sources
 * - buckets (with pre-seeded data)
 * - categories
 * - planned_expenses
 * - goals
 * - transactions
 * - planning_scenarios
 */

function up(db) {
  // ============================================================
  // Config table
  // ============================================================
  db.exec(`
    CREATE TABLE config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0
    )
  `);
  
  // Insert default config values
  const now = new Date().toISOString();
  const insertConfig = db.prepare(
    'INSERT INTO config (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)'
  );
  
  insertConfig.run('userName', '"User"', now, now);
  insertConfig.run('currentMonth', `"${new Date().toISOString().slice(0, 7)}"`, now, now);
  
  // ============================================================
  // Accounts table
  // ============================================================
  db.exec(`
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      starting_balance REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0
    )
  `);
  
  // ============================================================
  // Income Sources table
  // ============================================================
  db.exec(`
    CREATE TABLE income_sources (
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
  
  // ============================================================
  // Buckets table (pre-seeded)
  // ============================================================
  db.exec(`
    CREATE TABLE buckets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bucket_key TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0
    )
  `);
  
  // Pre-seed buckets (these cannot be deleted)
  const insertBucket = db.prepare(`
    INSERT INTO buckets (name, bucket_key, color, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const buckets = [
    { name: 'Major Fixed Expense', key: 'major_fixed', color: '#3B82F6', order: 1 },
    { name: 'Major Variable Expense', key: 'major_variable', color: '#8B5CF6', order: 2 },
    { name: 'Minor Fixed Expense', key: 'minor_fixed', color: '#10B981', order: 3 },
    { name: 'Minor Variable Expense', key: 'minor_variable', color: '#F59E0B', order: 4 },
    { name: 'Non-Standard Expense/Goals', key: 'goals', color: '#EC4899', order: 5 }
  ];
  
  for (const bucket of buckets) {
    insertBucket.run(bucket.name, bucket.key, bucket.color, bucket.order, now, now);
  }
  
  // ============================================================
  // Categories table
  // ============================================================
  db.exec(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bucket_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (bucket_id) REFERENCES buckets(id)
    )
  `);
  
  // ============================================================
  // Planned Expenses table
  // ============================================================
  db.exec(`
    CREATE TABLE planned_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      bucket_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
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
  
  // ============================================================
  // Goals table
  // ============================================================
  db.exec(`
    CREATE TABLE goals (
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
  
  // ============================================================
  // Transactions table
  // ============================================================
  db.exec(`
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      account_id INTEGER NOT NULL,
      bucket_id INTEGER,
      category_id INTEGER,
      income_source_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (bucket_id) REFERENCES buckets(id),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (income_source_id) REFERENCES income_sources(id)
    )
  `);
  
  // Create index for common queries
  db.exec(`
    CREATE INDEX idx_transactions_date ON transactions(date);
    CREATE INDEX idx_transactions_account ON transactions(account_id);
    CREATE INDEX idx_transactions_type ON transactions(type);
  `);
  
  // ============================================================
  // Planning Scenarios table (owned by Planning module)
  // ============================================================
  db.exec(`
    CREATE TABLE planning_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0
    )
  `);
}

/**
 * Rollback function (optional, for development)
 */
function down(db) {
  const tables = [
    'planning_scenarios',
    'transactions',
    'goals',
    'planned_expenses',
    'categories',
    'buckets',
    'income_sources',
    'accounts',
    'config'
  ];
  
  for (const table of tables) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
}

module.exports = { up, down };
