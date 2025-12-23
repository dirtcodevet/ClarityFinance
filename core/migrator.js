/**
 * Database Migration System for Clarity Finance
 * 
 * Runs database migrations in order to set up or update the schema.
 * Migrations are numbered files in /migrations/ folder.
 * 
 * Each migration runs once and is tracked in the database.
 */

const fs = require('fs');
const path = require('path');

/**
 * Runs all pending migrations.
 * 
 * @param {object} db - better-sqlite3 database instance
 * @returns {number} Number of migrations run
 */
async function runMigrations(db) {
  // Ensure migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      run_at TEXT NOT NULL
    )
  `);
  
  // Get list of already-run migrations
  const runMigrations = db.prepare('SELECT name FROM _migrations').all();
  const runNames = new Set(runMigrations.map(m => m.name));
  
  // Get migration files
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('[Migrator] No migrations directory found');
    return 0;
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort(); // Ensure numerical order (001_, 002_, etc.)
  
  let count = 0;
  
  for (const file of files) {
    const migrationName = path.basename(file, '.js');
    
    // Skip if already run
    if (runNames.has(migrationName)) {
      continue;
    }
    
    console.log(`[Migrator] Running migration: ${migrationName}`);
    
    try {
      // Load and run migration
      const migration = require(path.join(migrationsDir, file));
      
      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${file} does not export an 'up' function`);
      }
      
      // Run in a transaction
      const transaction = db.transaction(() => {
        migration.up(db);
        
        // Record that migration has run
        db.prepare('INSERT INTO _migrations (name, run_at) VALUES (?, ?)')
          .run(migrationName, new Date().toISOString());
      });
      
      transaction();
      count++;
      
      console.log(`[Migrator] Completed: ${migrationName}`);
    } catch (error) {
      console.error(`[Migrator] Failed: ${migrationName}`, error);
      throw error; // Stop on failure
    }
  }
  
  if (count === 0) {
    console.log('[Migrator] No new migrations to run');
  } else {
    console.log(`[Migrator] Ran ${count} migration(s)`);
  }
  
  return count;
}

/**
 * Gets the current migration version (highest migration number run).
 * 
 * @param {object} db - better-sqlite3 database instance
 * @returns {string|null} Name of last migration run, or null if none
 */
function getCurrentVersion(db) {
  try {
    const row = db.prepare(
      'SELECT name FROM _migrations ORDER BY id DESC LIMIT 1'
    ).get();
    return row ? row.name : null;
  } catch {
    return null;
  }
}

/**
 * Lists all migrations and their status.
 * 
 * @param {object} db - better-sqlite3 database instance
 * @returns {array} Array of { name, status, runAt }
 */
function listMigrations(db) {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }
  
  // Get run migrations
  let runMigrations = [];
  try {
    runMigrations = db.prepare('SELECT name, run_at FROM _migrations').all();
  } catch {
    // Table doesn't exist yet
  }
  const runMap = new Map(runMigrations.map(m => [m.name, m.run_at]));
  
  // Get all migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();
  
  return files.map(file => {
    const name = path.basename(file, '.js');
    const runAt = runMap.get(name);
    return {
      name,
      status: runAt ? 'complete' : 'pending',
      runAt: runAt || null
    };
  });
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  runMigrations,
  getCurrentVersion,
  listMigrations
};
