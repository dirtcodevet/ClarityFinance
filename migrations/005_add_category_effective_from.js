/**
 * Migration 005: Add effective_from to categories
 *
 * Adds effective_from column to categories so categories can be month-scoped.
 * Defaults to created_at for existing rows.
 */

function up(db) {
  const tableInfo = db.prepare('PRAGMA table_info(categories)').all();
  const columnNames = tableInfo.map(col => col.name);

  if (!columnNames.includes('effective_from')) {
    db.exec(`
      ALTER TABLE categories
      ADD COLUMN effective_from TEXT
    `);
  }

  db.exec(`
    UPDATE categories
    SET effective_from = created_at
    WHERE effective_from IS NULL
  `);

  console.log('[Migration 005] Added effective_from to categories');
}

function down(db) {
  // SQLite doesn't support DROP COLUMN directly; rebuild table.
  db.exec(`
    CREATE TABLE categories_backup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bucket_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (bucket_id) REFERENCES buckets(id)
    )
  `);

  db.exec(`
    INSERT INTO categories_backup
    SELECT id, name, bucket_id, created_at, updated_at, is_deleted
    FROM categories
  `);

  db.exec('DROP TABLE categories');
  db.exec('ALTER TABLE categories_backup RENAME TO categories');

  console.log('[Migration 005] Removed effective_from from categories');
}

module.exports = { up, down };
