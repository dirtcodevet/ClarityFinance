/**
 * Dashboard Module - Public API
 * 
 * This file exports ONLY what other parts of the app need.
 * All business logic is in service.js.
 * 
 * The Dashboard module is read-only - it queries data from other modules'
 * tables but does not modify any data.
 * 
 * See docs/modules/dashboard.md for specification.
 */

const service = require('./service');

module.exports = {
  // Initialize module (called once at app startup)
  initialize: service.initialize,
  
  // Summary data
  getBudgetSummary: service.getBudgetSummary,
  
  // Chart data
  getBalanceProjection: service.getBalanceProjection,
  getBudgetVsExpense: service.getBudgetVsExpense,
  
  // Goals data
  getGoalsProgress: service.getGoalsProgress,
  
  // Account data
  getAccountBalances: service.getAccountBalances
};
