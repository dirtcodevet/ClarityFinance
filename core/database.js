/**
 * Database Module for Clarity Finance
 * 
 * All database operations go through this module.
 * Features:
 * - Schema validation via Zod before any write
 * - Structured error returns (never throws)
 * - Soft deletes (is_deleted flag)
 * - Automatic timestamps (created_at, updated_at)
 * - Defined filter syntax for queries
 * 
 * See docs/CORE_API.md for full documentation.
 */

const path = require('path');
const { validate } = require('./schemas');

// Database instance - set during initialize()
let db = null;

// ============================================================
// Filter Building
// ============================================================

/**
 * Supported filter operators.
 * Any operator not in this list will be rejected.
 */
const SUPPORTED_OPERATORS = ['in', 'gt', 'gte', 'lt', 'lte', 'between'];

/**
 * Builds a WHERE clause from a filters object.
 * 
 * @param {object} filters - Filter criteria
 * @returns {{ ok: true, clause: string, params: array } | { ok: false, error: object }}
 */
function buildWhereClause(filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return { ok: true, clause: '', params: [] };
  }
  
  const conditions = [];
  const params = [];
  
  for (const [field, value] of Object.entries(filters)) {
    // Skip undefined values
    if (value === undefined) continue;
    
    // Simple equality check
    if (value === null || typeof value !== 'object') {
      conditions.push(`${field} = ?`);
      params.push(value);
      continue;
    }
    
    // Object value - check for operators
    for (const [operator, operand] of Object.entries(value)) {
      if (!SUPPORTED_OPERATORS.includes(operator)) {
        return {
          ok: false,
          error: {
            code: 'INVALID_FILTER',
            message: `Unsupported filter operator: ${operator}. Supported: ${SUPPORTED_OPERATORS.join(', ')}`
          }
        };
      }
      
      switch (operator) {
        case 'in':
          if (!Array.isArray(operand) || operand.length === 0) {
            return {
              ok: false,
              error: {
                code: 'INVALID_FILTER',
                message: `'in' operator requires a non-empty array`
              }
            };
          }
          const placeholders = operand.map(() => '?').join(', ');
          conditions.push(`${field} IN (${placeholders})`);
          params.push(...operand);
          break;
          
        case 'gt':
          conditions.push(`${field} > ?`);
          params.push(operand);
          break;
          
        case 'gte':
          conditions.push(`${field} >= ?`);
          params.push(operand);
          break;
          
        case 'lt':
          conditions.push(`${field} < ?`);
          params.push(operand);
          break;
          
        case 'lte':
          conditions.push(`${field} <= ?`);
          params.push(operand);
          break;
          
        case 'between':
          if (!Array.isArray(operand) || operand.length !== 2) {
            return {
              ok: false,
              error: {
                code: 'INVALID_FILTER',
                message: `'between' operator requires an array of exactly 2 values`
              }
            };
          }
          conditions.push(`${field} BETWEEN ? AND ?`);
          params.push(operand[0], operand[1]);
          break;
      }
    }
  }
  
  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { ok: true, clause, params };
}

// ============================================================
// Timestamp Helpers
// ============================================================

/**
 * Returns current timestamp in ISO 8601 format.
 */
function now() {
  return new Date().toISOString();
}

// ============================================================
// Database Operations
// ============================================================

/**
 * Initializes the database and runs migrations.
 * Must be called once at app startup.
 * 
 * @param {string} dbPath - Path to database file
 * @returns {{ ok: true, data: { migrationsRun: number } } | { ok: false, error: object }}
 */
async function initialize(dbPath) {
  try {
    // Dynamic import of better-sqlite3 (it's a native module)
    const Database = require('better-sqlite3');
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Open database
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Run migrations
    const migrator = require('./migrator');
    const migrationsRun = await migrator.runMigrations(db);
    
    return {
      ok: true,
      data: { migrationsRun }
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to initialize database: ${error.message}`
      }
    };
  }
}

/**
 * Inserts a new record after validation.
 * 
 * @param {string} table - Table name
 * @param {object} record - Record data
 * @returns {{ ok: true, data: object } | { ok: false, error: object }}
 */
function insert(table, record) {
  // Validate against schema
  const validation = validate(table, 'insert', record);
  if (!validation.ok) {
    return validation;
  }
  
  const validatedData = validation.data;
  
  // Add timestamps
  const timestamp = now();
  const recordWithMeta = {
    ...validatedData,
    created_at: timestamp,
    updated_at: timestamp,
    is_deleted: 0
  };
  
  try {
    const columns = Object.keys(recordWithMeta);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => recordWithMeta[col]);
    
    const stmt = db.prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
    );
    
    const result = stmt.run(...values);
    
    // Return the complete record with ID
    return {
      ok: true,
      data: {
        id: result.lastInsertRowid,
        ...recordWithMeta
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Insert failed: ${error.message}`
      }
    };
  }
}

/**
 * Updates an existing record after validation.
 * 
 * @param {string} table - Table name
 * @param {number} id - Record ID
 * @param {object} changes - Fields to update
 * @returns {{ ok: true, data: object } | { ok: false, error: object }}
 */
function update(table, id, changes) {
  // First check if record exists and isn't deleted
  const existing = getById(table, id);
  if (!existing.ok) {
    return existing;
  }
  
  // Validate changes against update schema
  const validation = validate(table, 'update', changes);
  if (!validation.ok) {
    return validation;
  }
  
  const validatedChanges = validation.data;
  
  // Add updated timestamp
  const changesWithMeta = {
    ...validatedChanges,
    updated_at: now()
  };
  
  try {
    const setClauses = Object.keys(changesWithMeta).map(col => `${col} = ?`);
    const values = [...Object.values(changesWithMeta), id];
    
    const stmt = db.prepare(
      `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`
    );
    
    stmt.run(...values);
    
    // Return the updated record
    return getById(table, id);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Update failed: ${error.message}`
      }
    };
  }
}

/**
 * Soft-deletes a record (sets is_deleted = 1).
 * 
 * @param {string} table - Table name
 * @param {number} id - Record ID
 * @returns {{ ok: true, data: { id: number, deleted: true } } | { ok: false, error: object }}
 */
function remove(table, id) {
  // Check if record exists
  const existing = getById(table, id);
  if (!existing.ok) {
    return existing;
  }
  
  try {
    const stmt = db.prepare(
      `UPDATE ${table} SET is_deleted = 1, updated_at = ? WHERE id = ?`
    );
    
    stmt.run(now(), id);
    
    return {
      ok: true,
      data: { id, deleted: true }
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Delete failed: ${error.message}`
      }
    };
  }
}

/**
 * Retrieves a single record by ID.
 * 
 * @param {string} table - Table name
 * @param {number} id - Record ID
 * @param {object} options - Query options
 * @param {boolean} options.includeDeleted - Include soft-deleted records
 * @returns {{ ok: true, data: object } | { ok: false, error: object }}
 */
function getById(table, id, options = {}) {
  try {
    let sql = `SELECT * FROM ${table} WHERE id = ?`;
    
    if (!options.includeDeleted) {
      sql += ' AND is_deleted = 0';
    }
    
    const stmt = db.prepare(sql);
    const row = stmt.get(id);
    
    if (!row) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `${table} with id ${id} not found`
        }
      };
    }
    
    return { ok: true, data: row };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Query failed: ${error.message}`
      }
    };
  }
}

/**
 * Retrieves multiple records matching filters.
 * 
 * @param {string} table - Table name
 * @param {object} filters - Filter criteria (see CORE_API.md)
 * @param {object} options - Query options
 * @returns {{ ok: true, data: array } | { ok: false, error: object }}
 */
function query(table, filters = {}, options = {}) {
  // Build WHERE clause
  const whereResult = buildWhereClause(filters);
  if (!whereResult.ok) {
    return whereResult;
  }
  
  try {
    let sql = `SELECT * FROM ${table}`;
    const params = [...whereResult.params];
    
    // Add soft-delete filter
    if (!options.includeDeleted) {
      if (whereResult.clause) {
        sql += ` ${whereResult.clause} AND is_deleted = 0`;
      } else {
        sql += ' WHERE is_deleted = 0';
      }
    } else {
      sql += ` ${whereResult.clause}`;
    }
    
    // Add ORDER BY
    if (options.orderBy) {
      const order = options.order === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${options.orderBy} ${order}`;
    }
    
    // Add LIMIT
    if (options.limit) {
      sql += ` LIMIT ${parseInt(options.limit, 10)}`;
    }
    
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    
    return { ok: true, data: rows };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Query failed: ${error.message}`
      }
    };
  }
}

/**
 * Executes raw SQL. Use sparingly - only for migrations and module table creation.
 * 
 * @param {string} sql - SQL statement
 * @param {array} params - Query parameters
 * @returns {{ ok: true, data: any } | { ok: false, error: object }}
 */
function execute(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    
    // Check if it's a SELECT statement
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const rows = stmt.all(...params);
      return { ok: true, data: rows };
    } else {
      const result = stmt.run(...params);
      return { ok: true, data: result };
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Execute failed: ${error.message}`
      }
    };
  }
}

/**
 * Gets the raw database instance. Only use for testing or advanced operations.
 */
function getDb() {
  return db;
}

/**
 * Closes the database connection.
 */
function close() {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  initialize,
  insert,
  update,
  delete: remove,  // 'delete' is a reserved word
  getById,
  query,
  execute,
  getDb,
  close
};
