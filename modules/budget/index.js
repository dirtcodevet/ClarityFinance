/**
 * Budget Module - Public API
 * 
 * This file exports ONLY the public interface for the Budget module.
 * All business logic is in service.js.
 * 
 * Tables owned: accounts, income_sources, buckets, categories, planned_expenses, goals
 * 
 * @module modules/budget
 */

const service = require('./service');

module.exports = {
  // Initialization
  initialize: service.initialize,
  
  // Accounts
  getAccounts: service.getAccounts,
  createAccount: service.createAccount,
  updateAccount: service.updateAccount,
  deleteAccount: service.deleteAccount,
  
  // Income Sources
  getIncomeSources: service.getIncomeSources,
  createIncomeSource: service.createIncomeSource,
  updateIncomeSource: service.updateIncomeSource,
  deleteIncomeSource: service.deleteIncomeSource,
  
  // Buckets (pre-seeded, cannot create/delete)
  getBuckets: service.getBuckets,
  updateBucket: service.updateBucket,
  
  // Categories
  getCategories: service.getCategories,
  createCategory: service.createCategory,
  updateCategory: service.updateCategory,
  deleteCategory: service.deleteCategory,
  
  // Planned Expenses
  getPlannedExpenses: service.getPlannedExpenses,
  createPlannedExpense: service.createPlannedExpense,
  updatePlannedExpense: service.updatePlannedExpense,
  deletePlannedExpense: service.deletePlannedExpense,
  
  // Goals
  getGoals: service.getGoals,
  createGoal: service.createGoal,
  updateGoal: service.updateGoal,
  deleteGoal: service.deleteGoal,
  fundGoal: service.fundGoal,
  restoreRecord: service.restoreRecord,
  
  // Utilities
  getBucketTotal: service.getBucketTotal,
  getBudgetSummary: service.getBudgetSummary,
  getBudgetDataForMonth: service.getBudgetDataForMonth
};
