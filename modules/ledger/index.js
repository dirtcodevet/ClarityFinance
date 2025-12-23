/**
 * Ledger Module - Public API
 * 
 * This file exports ONLY what other parts of the app need.
 * All business logic is in service.js.
 * 
 * See docs/modules/ledger.md for specification.
 */

const service = require('./service');

module.exports = {
  // Initialize module (called once at app startup)
  initialize: service.initialize,
  
  // Transaction CRUD
  createTransaction: service.createTransaction,
  updateTransaction: service.updateTransaction,
  deleteTransaction: service.deleteTransaction,
  getTransaction: service.getTransaction,
  listTransactions: service.listTransactions,
  listTransactionsByDateRange: service.listTransactionsByDateRange,
  
  // Supporting data queries (for dropdowns)
  getAccounts: service.getAccounts,
  getBuckets: service.getBuckets,
  getCategories: service.getCategories,
  getCategoriesByBucket: service.getCategoriesByBucket,
  getIncomeSources: service.getIncomeSources
};
