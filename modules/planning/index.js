/**
 * Planning Module - Public API
 *
 * This file exports ONLY the public interface for the Planning module.
 * All business logic is in service.js.
 *
 * Tables owned: planning_scenarios
 *
 * @module modules/planning
 */

const service = require('./service');

module.exports = {
  // Initialization
  initialize: service.initialize,

  // Session management
  getSessionData: service.getSessionData,
  loadCurrentBudgetData: service.loadCurrentBudgetData,
  resetSession: service.resetSession,

  // Session modifications - accounts
  updateSessionAccount: service.updateSessionAccount,
  createSessionAccount: service.createSessionAccount,
  deleteSessionAccount: service.deleteSessionAccount,

  // Session modifications - income sources
  updateSessionIncomeSource: service.updateSessionIncomeSource,
  createSessionIncomeSource: service.createSessionIncomeSource,
  deleteSessionIncomeSource: service.deleteSessionIncomeSource,

  // Session modifications - categories
  updateSessionCategory: service.updateSessionCategory,
  createSessionCategory: service.createSessionCategory,
  deleteSessionCategory: service.deleteSessionCategory,

  // Session modifications - planned expenses
  updateSessionPlannedExpense: service.updateSessionPlannedExpense,
  createSessionPlannedExpense: service.createSessionPlannedExpense,
  deleteSessionPlannedExpense: service.deleteSessionPlannedExpense,

  // Session modifications - goals
  updateSessionGoal: service.updateSessionGoal,
  createSessionGoal: service.createSessionGoal,
  deleteSessionGoal: service.deleteSessionGoal,

  // Calculations
  calculateBalanceProjection: service.calculateBalanceProjection,
  generateInsights: service.generateInsights,

  // Scenario persistence
  saveScenario: service.saveScenario,
  getScenarios: service.getScenarios,
  loadScenario: service.loadScenario,
  deleteScenario: service.deleteScenario
};
