/**
 * Ledger Module - Service Layer
 * 
 * Business logic for transaction management.
 * All functions are async and emit events after successful database operations.
 * 
 * See docs/modules/ledger.md for specification.
 */

const db = require('../../core/database');
const events = require('../../core/events');

// ============================================================
// Transaction CRUD Operations
// ============================================================

/**
 * Creates a new transaction.
 * 
 * @param {object} data - Transaction data
 * @param {string} data.date - Transaction date (YYYY-MM-DD)
 * @param {string} data.type - 'income' or 'expense'
 * @param {number} data.amount - Transaction amount (positive)
 * @param {string} [data.description] - Optional description
 * @param {number} data.account_id - Account ID
 * @param {number} [data.bucket_id] - Bucket ID (required for expenses)
 * @param {number} [data.category_id] - Category ID (required for expenses)
 * @param {number} [data.income_source_id] - Optional income source ID
 * @returns {Promise<{ok: true, data: object} | {ok: false, error: object}>}
 */
async function createTransaction(data) {
  const result = await db.insert('transactions', data);
  
  if (result.ok) {
    events.emit('transaction:created', { transaction: result.data });
  }
  
  return result;
}

/**
 * Updates an existing transaction.
 * 
 * @param {number} id - Transaction ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: true, data: object} | {ok: false, error: object}>}
 */
async function updateTransaction(id, changes) {
  const result = await db.update('transactions', id, changes);
  
  if (result.ok) {
    events.emit('transaction:updated', { transaction: result.data, changes });
  }
  
  return result;
}

/**
 * Soft-deletes a transaction.
 * 
 * @param {number} id - Transaction ID
 * @returns {Promise<{ok: true, data: object} | {ok: false, error: object}>}
 */
async function deleteTransaction(id) {
  const result = await db.delete('transactions', id);
  
  if (result.ok) {
    events.emit('transaction:deleted', { id });
  }
  
  return result;
}

/**
 * Gets a transaction by ID.
 * 
 * @param {number} id - Transaction ID
 * @returns {Promise<{ok: true, data: object} | {ok: false, error: object}>}
 */
async function getTransaction(id) {
  return await db.getById('transactions', id);
}

/**
 * Lists transactions with optional filters.
 * 
 * @param {object} [filters] - Filter criteria
 * @param {object} [options] - Query options (orderBy, order, limit)
 * @returns {Promise<{ok: true, data: array} | {ok: false, error: object}>}
 */
async function listTransactions(filters = {}, options = {}) {
  // Default ordering by date descending (most recent first)
  const defaultOptions = {
    orderBy: 'date',
    order: 'desc',
    ...options
  };
  
  return await db.query('transactions', filters, defaultOptions);
}

/**
 * Lists transactions within a date range.
 * 
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {object} [additionalFilters] - Additional filter criteria
 * @param {object} [options] - Query options
 * @returns {Promise<{ok: true, data: array} | {ok: false, error: object}>}
 */
async function listTransactionsByDateRange(startDate, endDate, additionalFilters = {}, options = {}) {
  const filters = {
    ...additionalFilters,
    date: { between: [startDate, endDate] }
  };
  
  return await listTransactions(filters, options);
}

// ============================================================
// Supporting Data Queries
// ============================================================

/**
 * Gets all accounts for dropdown population.
 * 
 * @returns {Promise<{ok: true, data: array} | {ok: false, error: object}>}
 */
async function getAccounts() {
  return await db.query('accounts', {}, { orderBy: 'bank_name', order: 'asc' });
}

/**
 * Gets all buckets for dropdown population.
 * 
 * @returns {Promise<{ok: true, data: array} | {ok: false, error: object}>}
 */
async function getBuckets() {
  return await db.query('buckets', {}, { orderBy: 'sort_order', order: 'asc' });
}

/**
 * Gets all categories for dropdown population.
 * 
 * @returns {Promise<{ok: true, data: array} | {ok: false, error: object}>}
 */
async function getCategories() {
  return await db.query('categories', {}, { orderBy: 'name', order: 'asc' });
}

/**
 * Gets categories filtered by bucket ID.
 * 
 * @param {number} bucketId - Bucket ID to filter by
 * @returns {Promise<{ok: true, data: array} | {ok: false, error: object}>}
 */
async function getCategoriesByBucket(bucketId) {
  return await db.query('categories', { bucket_id: bucketId }, { orderBy: 'name', order: 'asc' });
}

/**
 * Gets all income sources for dropdown population.
 * 
 * @returns {Promise<{ok: true, data: array} | {ok: false, error: object}>}
 */
async function getIncomeSources() {
  return await db.query('income_sources', {}, { orderBy: 'source_name', order: 'asc' });
}

// ============================================================
// Initialization
// ============================================================

/**
 * Initializes the ledger module.
 * Sets up event listeners for cross-module updates.
 */
async function initialize() {
  // Listen for account changes to potentially refresh UI
  events.on('account:created', handleAccountChange);
  events.on('account:updated', handleAccountChange);
  events.on('account:deleted', handleAccountChange);
  
  // Listen for category changes
  events.on('category:created', handleCategoryChange);
  events.on('category:updated', handleCategoryChange);
  events.on('category:deleted', handleCategoryChange);
}

/**
 * Handles account changes from Budget module.
 * @param {object} data - Event data
 */
function handleAccountChange(data) {
  // Emit a ledger-specific event that UI can listen to
  events.emit('ledger:accounts-changed', data);
}

/**
 * Handles category changes from Budget module.
 * @param {object} data - Event data
 */
function handleCategoryChange(data) {
  // Emit a ledger-specific event that UI can listen to
  events.emit('ledger:categories-changed', data);
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Initialization
  initialize,
  
  // Transaction CRUD
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  listTransactionsByDateRange,
  
  // Supporting data queries
  getAccounts,
  getBuckets,
  getCategories,
  getCategoriesByBucket,
  getIncomeSources
};
