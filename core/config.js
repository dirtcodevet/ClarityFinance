/**
 * Configuration Module for Clarity Finance
 * 
 * Manages application configuration stored in the database.
 * Provides get/set interface for config values.
 * 
 * See docs/CORE_API.md for usage documentation.
 */

const path = require('path');
const os = require('os');

// Reference to database module (set after DB is initialized)
let db = null;

// In-memory cache for config values
const cache = new Map();

// Events module for change notifications
let events = null;

/**
 * Initializes the config module.
 * Called automatically after database is initialized.
 * 
 * @param {object} database - Database module reference
 * @param {object} eventsModule - Events module reference
 */
function initialize(database, eventsModule) {
  db = database;
  events = eventsModule;
  
  // Load all config into cache
  const result = db.execute('SELECT key, value FROM config WHERE is_deleted = 0');
  if (result.ok) {
    for (const row of result.data) {
      try {
        cache.set(row.key, JSON.parse(row.value));
      } catch {
        cache.set(row.key, row.value);
      }
    }
  }
}

/**
 * Gets a configuration value.
 * 
 * @param {string} key - Config key
 * @returns {{ ok: true, data: any } | { ok: false, error: object }}
 */
function get(key) {
  // Check cache first
  if (cache.has(key)) {
    return { ok: true, data: cache.get(key) };
  }
  
  // Special computed values
  if (key === 'dbPath') {
    return { ok: true, data: getDbPath() };
  }
  
  // Not found
  return {
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Config key "${key}" not found`
    }
  };
}

/**
 * Sets a configuration value.
 * 
 * @param {string} key - Config key
 * @param {any} value - Value to store
 * @returns {{ ok: true, data: { key: string, value: any } } | { ok: false, error: object }}
 */
function set(key, value) {
  const previousValue = cache.get(key);
  const serializedValue = JSON.stringify(value);
  
  try {
    // Check if key exists
    const existing = db.execute(
      'SELECT id FROM config WHERE key = ? AND is_deleted = 0',
      [key]
    );
    
    if (existing.ok && existing.data.length > 0) {
      // Update existing
      db.execute(
        'UPDATE config SET value = ?, updated_at = ? WHERE key = ?',
        [serializedValue, new Date().toISOString(), key]
      );
    } else {
      // Insert new
      db.execute(
        'INSERT INTO config (key, value, created_at, updated_at, is_deleted) VALUES (?, ?, ?, ?, 0)',
        [key, serializedValue, new Date().toISOString(), new Date().toISOString()]
      );
    }
    
    // Update cache
    cache.set(key, value);
    
    // Emit change event
    if (events) {
      events.emit('config:changed', { key, value, previousValue });
    }
    
    return { ok: true, data: { key, value } };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to set config: ${error.message}`
      }
    };
  }
}

/**
 * Gets all configuration values.
 * 
 * @returns {{ ok: true, data: object }}
 */
function getAll() {
  const all = {};
  for (const [key, value] of cache) {
    all[key] = value;
  }
  return { ok: true, data: all };
}

/**
 * Determines the database path based on OS.
 * For now, uses local app data folder (not cloud sync).
 * 
 * @returns {string} Path to database file
 */
function getDbPath() {
  const appName = 'ClarityFinance';
  
  switch (process.platform) {
    case 'darwin': // macOS
      return path.join(os.homedir(), 'Library', 'Application Support', appName, 'clarity.db');
    
    case 'win32': // Windows
      return path.join(process.env.APPDATA || os.homedir(), appName, 'clarity.db');
    
    default: // Linux and others
      return path.join(os.homedir(), `.${appName.toLowerCase()}`, 'clarity.db');
  }
}

/**
 * Gets the default database path.
 * Exported for use during initialization.
 */
function getDefaultDbPath() {
  return getDbPath();
}

/**
 * Clears the config cache. Primarily for testing.
 */
function clearCache() {
  cache.clear();
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  initialize,
  get,
  set,
  getAll,
  getDefaultDbPath,
  clearCache
};
