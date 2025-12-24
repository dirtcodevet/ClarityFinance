/**
 * Planning Module - Service Layer
 *
 * Business logic for the Planning page.
 * Provides a sandbox environment for "what-if" financial scenarios.
 * Changes here NEVER affect real budget data.
 *
 * See docs/modules/planning.md for documentation.
 */

const db = require('../../core/database');
const events = require('../../core/events');
const config = require('../../core/config');

// In-memory store for current planning session data
let planningSessionData = {
  accounts: [],
  incomeSources: [],
  buckets: [],
  categories: [],
  plannedExpenses: [],
  goals: []
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initializes the planning module.
 * Called once at app startup.
 * Creates the planning_scenarios table if it doesn't exist.
 */
async function initialize() {
  // Create planning_scenarios table if it doesn't exist
  const result = await db.execute(`
    CREATE TABLE IF NOT EXISTS planning_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0
    )
  `);

  if (!result.ok) {
    console.error('[Planning] Failed to create planning_scenarios table:', result.error);
  }

  console.log('[Planning] Module initialized');
}

// ============================================================
// Session Data Management
// ============================================================

/**
 * Loads current budget data into the planning session.
 * This is a fresh copy - changes won't affect real data.
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function loadCurrentBudgetData() {
  const monthString = getCurrentMonthString();
  return await loadBudgetDataForMonth(monthString);
}

/**
 * Gets the current planning session data.
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function getSessionData() {
  // If session is empty, load from budget
  if (planningSessionData.accounts.length === 0) {
    return await loadCurrentBudgetData();
  }

  return { ok: true, data: planningSessionData };
}

/**
 * Resets the planning session to current budget data.
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function resetSession() {
  const result = await loadCurrentBudgetData();

  if (result.ok) {
    events.emit('planning:reset', { timestamp: new Date().toISOString() });
  }

  return result;
}

/**
 * Replaces the planning session data (used for undo/redo).
 * @param {object} data - Full session data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function replaceSessionData(data) {
  if (!data) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Session data is required' } };
  }

  planningSessionData = JSON.parse(JSON.stringify(data));
  events.emit('planning:data-loaded', { timestamp: new Date().toISOString() });
  return { ok: true, data: planningSessionData };
}

// ============================================================
// Month-Based Budget Loading (Sandbox)
// ============================================================

function getCurrentMonthString() {
  const result = config.get('currentMonth');
  if (result.ok && result.data) {
    return result.data;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange(monthString) {
  const [year, month] = monthString.split('-').map(Number);
  const startDate = `${monthString}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${monthString}-${String(endDay).padStart(2, '0')}`;
  const endDateTime = `${endDate}T23:59:59.999Z`;
  return { startDate, endDateTime };
}

async function getMonthData(table, monthString, orderBy) {
  const { startDate, endDateTime } = getMonthRange(monthString);
  return await db.query(
    table,
    { effective_from: { between: [startDate, endDateTime] } },
    { orderBy }
  );
}

function normalizeMonthString(dateString) {
  if (!dateString) return null;
  return dateString.slice(0, 7);
}

async function getLatestEditedMonthBefore(monthString) {
  const { startDate } = getMonthRange(monthString);
  const tables = ['accounts', 'income_sources', 'categories', 'planned_expenses', 'goals'];
  let latest = null;

  for (const table of tables) {
    const result = await db.query(
      table,
      { effective_from: { lt: startDate } },
      { orderBy: 'updated_at', order: 'desc', limit: 1 }
    );

    if (!result.ok) {
      return result;
    }

    if (result.data.length > 0) {
      const record = result.data[0];
      const recordMonth = normalizeMonthString(record.effective_from);
      if (!recordMonth) {
        continue;
      }
      if (!latest || record.updated_at > latest.updated_at) {
        latest = { month: recordMonth, updated_at: record.updated_at };
      }
    }
  }

  return { ok: true, data: latest ? latest.month : null };
}

async function loadBudgetDataForMonth(monthString) {
  const [accounts, incomeSources, buckets, categories, plannedExpenses, goals] = await Promise.all([
    getMonthData('accounts', monthString, 'bank_name'),
    getMonthData('income_sources', monthString, 'source_name'),
    db.query('buckets', {}, { orderBy: 'sort_order' }),
    getMonthData('categories', monthString, 'name'),
    getMonthData('planned_expenses', monthString, 'description'),
    getMonthData('goals', monthString, 'name')
  ]);

  const results = [accounts, incomeSources, buckets, categories, plannedExpenses, goals];
  const failed = results.find(result => !result.ok);
  if (failed) {
    return failed;
  }

  const isEmpty = accounts.data.length === 0
    && incomeSources.data.length === 0
    && categories.data.length === 0
    && plannedExpenses.data.length === 0
    && goals.data.length === 0;

  if (isEmpty) {
    const latestMonthResult = await getLatestEditedMonthBefore(monthString);
    if (!latestMonthResult.ok) {
      return latestMonthResult;
    }
    const fallbackMonth = latestMonthResult.data;
    if (fallbackMonth) {
      return await loadBudgetDataForMonth(fallbackMonth);
    }
  }

  planningSessionData = {
    accounts: JSON.parse(JSON.stringify(accounts.data)),
    incomeSources: JSON.parse(JSON.stringify(incomeSources.data)),
    buckets: JSON.parse(JSON.stringify(buckets.data)),
    categories: JSON.parse(JSON.stringify(categories.data)),
    plannedExpenses: JSON.parse(JSON.stringify(plannedExpenses.data)),
    goals: JSON.parse(JSON.stringify(goals.data))
  };

  events.emit('planning:data-loaded', { timestamp: new Date().toISOString() });

  return { ok: true, data: planningSessionData };
}

// ============================================================
// Session Data Modification (In-Memory Only)
// ============================================================

/**
 * Updates an account in the planning session.
 * @param {number} id - Account ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateSessionAccount(id, changes) {
  const account = planningSessionData.accounts.find(a => a.id === id);

  if (!account) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Account not found in session' }
    };
  }

  // Apply changes
  Object.assign(account, changes, { updated_at: new Date().toISOString() });

  return { ok: true, data: account };
}

/**
 * Updates an income source in the planning session.
 * @param {number} id - Income source ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateSessionIncomeSource(id, changes) {
  const incomeSource = planningSessionData.incomeSources.find(i => i.id === id);

  if (!incomeSource) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Income source not found in session' }
    };
  }

  // Apply changes
  Object.assign(incomeSource, changes, { updated_at: new Date().toISOString() });

  return { ok: true, data: incomeSource };
}

/**
 * Updates a category in the planning session.
 * @param {number} id - Category ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateSessionCategory(id, changes) {
  const category = planningSessionData.categories.find(c => c.id === id);

  if (!category) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Category not found in session' }
    };
  }

  // Apply changes
  Object.assign(category, changes, { updated_at: new Date().toISOString() });

  return { ok: true, data: category };
}

/**
 * Updates a planned expense in the planning session.
 * @param {number} id - Planned expense ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateSessionPlannedExpense(id, changes) {
  const expense = planningSessionData.plannedExpenses.find(e => e.id === id);

  if (!expense) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Planned expense not found in session' }
    };
  }

  // Apply changes
  Object.assign(expense, changes, { updated_at: new Date().toISOString() });

  return { ok: true, data: expense };
}

/**
 * Updates a goal in the planning session.
 * @param {number} id - Goal ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateSessionGoal(id, changes) {
  const goal = planningSessionData.goals.find(g => g.id === id);

  if (!goal) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found in session' }
    };
  }

  // Apply changes
  Object.assign(goal, changes, { updated_at: new Date().toISOString() });

  return { ok: true, data: goal };
}

/**
 * Creates a new account in the planning session.
 * @param {object} data - Account data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createSessionAccount(data) {
  // Generate a temporary ID (negative to avoid conflicts)
  const tempId = -(planningSessionData.accounts.length + 1);
  const effectiveFrom = data.effective_from || `${getCurrentMonthString()}-01`;

  const newAccount = {
    id: tempId,
    ...data,
    effective_from: effectiveFrom,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: 0
  };

  planningSessionData.accounts.push(newAccount);

  return { ok: true, data: newAccount };
}

/**
 * Creates a new income source in the planning session.
 * @param {object} data - Income source data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createSessionIncomeSource(data) {
  const tempId = -(planningSessionData.incomeSources.length + 1);
  const effectiveFrom = data.effective_from || `${getCurrentMonthString()}-01`;

  const newIncomeSource = {
    id: tempId,
    ...data,
    effective_from: effectiveFrom,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: 0
  };

  planningSessionData.incomeSources.push(newIncomeSource);

  return { ok: true, data: newIncomeSource };
}

/**
 * Creates a new category in the planning session.
 * @param {object} data - Category data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createSessionCategory(data) {
  const tempId = -(planningSessionData.categories.length + 1);
  const effectiveFrom = data.effective_from || `${getCurrentMonthString()}-01`;

  const newCategory = {
    id: tempId,
    ...data,
    effective_from: effectiveFrom,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: 0
  };

  planningSessionData.categories.push(newCategory);

  return { ok: true, data: newCategory };
}

/**
 * Creates a new planned expense in the planning session.
 * @param {object} data - Planned expense data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createSessionPlannedExpense(data) {
  const tempId = -(planningSessionData.plannedExpenses.length + 1);
  const effectiveFrom = data.effective_from || `${getCurrentMonthString()}-01`;

  const newExpense = {
    id: tempId,
    ...data,
    effective_from: effectiveFrom,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: 0
  };

  planningSessionData.plannedExpenses.push(newExpense);

  return { ok: true, data: newExpense };
}

/**
 * Creates a new goal in the planning session.
 * @param {object} data - Goal data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createSessionGoal(data) {
  const tempId = -(planningSessionData.goals.length + 1);
  const effectiveFrom = data.effective_from || `${getCurrentMonthString()}-01`;

  const newGoal = {
    id: tempId,
    ...data,
    effective_from: effectiveFrom,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: 0
  };

  planningSessionData.goals.push(newGoal);

  return { ok: true, data: newGoal };
}

/**
 * Deletes an account from the planning session (soft delete).
 * @param {number} id - Account ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteSessionAccount(id) {
  const account = planningSessionData.accounts.find(a => a.id === id);

  if (!account) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Account not found in session' }
    };
  }

  account.is_deleted = 1;
  account.updated_at = new Date().toISOString();

  return { ok: true, data: { id } };
}

/**
 * Deletes an income source from the planning session (soft delete).
 * @param {number} id - Income source ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteSessionIncomeSource(id) {
  const incomeSource = planningSessionData.incomeSources.find(i => i.id === id);

  if (!incomeSource) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Income source not found in session' }
    };
  }

  incomeSource.is_deleted = 1;
  incomeSource.updated_at = new Date().toISOString();

  return { ok: true, data: { id } };
}

/**
 * Deletes a category from the planning session (soft delete).
 * @param {number} id - Category ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteSessionCategory(id) {
  const category = planningSessionData.categories.find(c => c.id === id);

  if (!category) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Category not found in session' }
    };
  }

  category.is_deleted = 1;
  category.updated_at = new Date().toISOString();

  return { ok: true, data: { id } };
}

/**
 * Deletes a planned expense from the planning session (soft delete).
 * @param {number} id - Planned expense ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteSessionPlannedExpense(id) {
  const expense = planningSessionData.plannedExpenses.find(e => e.id === id);

  if (!expense) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Planned expense not found in session' }
    };
  }

  expense.is_deleted = 1;
  expense.updated_at = new Date().toISOString();

  return { ok: true, data: { id } };
}

/**
 * Deletes a goal from the planning session (soft delete).
 * @param {number} id - Goal ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteSessionGoal(id) {
  const goal = planningSessionData.goals.find(g => g.id === id);

  if (!goal) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Goal not found in session' }
    };
  }

  goal.is_deleted = 1;
  goal.updated_at = new Date().toISOString();

  return { ok: true, data: { id } };
}

// ============================================================
// Balance Projection Calculations
// ============================================================

/**
 * Calculates projected balances for all accounts over a date range.
 * Uses planning session data for calculations.
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function calculateBalanceProjection(startDate, endDate) {
  const accounts = planningSessionData.accounts.filter(a => !a.is_deleted);
  const incomeSources = planningSessionData.incomeSources.filter(i => !i.is_deleted);
  const plannedExpenses = planningSessionData.plannedExpenses.filter(e => !e.is_deleted);

  // Build projection data structure
  const projections = {};

  accounts.forEach(account => {
    projections[account.id] = {
      accountId: account.id,
      accountName: account.bank_name,
      accountType: account.account_type,
      startingBalance: account.starting_balance,
      dataPoints: []
    };
  });

  // Generate date range
  const dates = generateDateRange(startDate, endDate);

  // For each date, calculate projected balance
  dates.forEach(date => {
    // Calculate income on this date
    const incomeByAccount = {};
    incomeSources.forEach(source => {
      const payDates = JSON.parse(source.pay_dates || '[]');
      if (payDates.includes(date)) {
        if (!incomeByAccount[source.account_id]) {
          incomeByAccount[source.account_id] = 0;
        }
        incomeByAccount[source.account_id] += source.amount;
      }
    });

    // Calculate expenses on this date
    const expensesByAccount = {};
    plannedExpenses.forEach(expense => {
      const dueDates = JSON.parse(expense.due_dates || '[]');
      if (dueDates.includes(date)) {
        if (!expensesByAccount[expense.account_id]) {
          expensesByAccount[expense.account_id] = 0;
        }
        expensesByAccount[expense.account_id] += expense.amount;
      }
    });

    // Update balance for each account
    accounts.forEach(account => {
      const income = incomeByAccount[account.id] || 0;
      const expenses = expensesByAccount[account.id] || 0;
      const netChange = income - expenses;

      // Get previous balance
      const previousDataPoints = projections[account.id].dataPoints;
      const previousBalance = previousDataPoints.length > 0
        ? previousDataPoints[previousDataPoints.length - 1].balance
        : account.starting_balance;

      const newBalance = previousBalance + netChange;

      projections[account.id].dataPoints.push({
        date,
        balance: newBalance,
        income,
        expenses,
        netChange
      });
    });
  });

  return { ok: true, data: { projections, startDate, endDate } };
}

/**
 * Generates an array of dates between start and end (inclusive).
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Array<string>} Array of date strings
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// ============================================================
// Insights Generation
// ============================================================

/**
 * Generates financial insights based on planning session data.
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function generateInsights() {
  const insights = [];

  const accounts = planningSessionData.accounts.filter(a => !a.is_deleted);
  const incomeSources = planningSessionData.incomeSources.filter(i => !i.is_deleted);
  const plannedExpenses = planningSessionData.plannedExpenses.filter(e => !e.is_deleted);
  const goals = planningSessionData.goals.filter(g => !g.is_deleted);

  // Calculate total monthly income
  const totalMonthlyIncome = incomeSources.reduce((sum, source) => sum + source.amount, 0);

  // Calculate total monthly expenses
  const totalMonthlyExpenses = plannedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate net monthly cash flow
  const netCashFlow = totalMonthlyIncome - totalMonthlyExpenses;

  // Insight 1: Cash flow status
  if (netCashFlow > 0) {
    insights.push({
      type: 'positive',
      message: `You have a positive cash flow of $${netCashFlow.toFixed(2)} per month. Consider allocating this toward goals.`
    });
  } else if (netCashFlow < 0) {
    insights.push({
      type: 'warning',
      message: `Warning: Your expenses exceed income by $${Math.abs(netCashFlow).toFixed(2)} per month. Consider reducing expenses or increasing income.`
    });
  } else {
    insights.push({
      type: 'neutral',
      message: `Your income and expenses are balanced. Consider building an emergency fund with any extra income.`
    });
  }

  // Insight 2: Goal progress
  goals.forEach(goal => {
    const fundedAmount = goal.funded_amount || 0;
    const targetAmount = goal.target_amount;
    const remaining = targetAmount - fundedAmount;
    const progressPercent = (fundedAmount / targetAmount) * 100;

    if (progressPercent >= 100) {
      insights.push({
        type: 'positive',
        message: `Congratulations! Your goal "${goal.name}" is fully funded.`
      });
    } else if (progressPercent >= 75) {
      insights.push({
        type: 'positive',
        message: `You're ${progressPercent.toFixed(0)}% of the way to funding "${goal.name}". Only $${remaining.toFixed(2)} to go!`
      });
    } else if (netCashFlow > 0) {
      const monthsToGoal = Math.ceil(remaining / netCashFlow);
      insights.push({
        type: 'neutral',
        message: `At your current cash flow, you could fully fund "${goal.name}" in ${monthsToGoal} months.`
      });
    }
  });

  // Insight 3: Savings potential
  if (netCashFlow > 0) {
    const annualSavings = netCashFlow * 12;
    insights.push({
      type: 'positive',
      message: `If you maintain this budget, you could save $${annualSavings.toFixed(2)} annually.`
    });
  }

  // Insight 4: Expense breakdown
  const expensesByBucket = {};
  plannedExpenses.forEach(expense => {
    if (!expensesByBucket[expense.bucket_id]) {
      expensesByBucket[expense.bucket_id] = 0;
    }
    expensesByBucket[expense.bucket_id] += expense.amount;
  });

  // Find largest expense bucket
  let largestBucketId = null;
  let largestBucketAmount = 0;
  Object.entries(expensesByBucket).forEach(([bucketId, amount]) => {
    if (amount > largestBucketAmount) {
      largestBucketId = bucketId;
      largestBucketAmount = amount;
    }
  });

  if (largestBucketId) {
    const bucket = planningSessionData.buckets.find(b => b.id === parseInt(largestBucketId));
    if (bucket) {
      const percentOfIncome = (largestBucketAmount / totalMonthlyIncome) * 100;
      insights.push({
        type: 'neutral',
        message: `Your largest expense category is "${bucket.name}" at $${largestBucketAmount.toFixed(2)}/month (${percentOfIncome.toFixed(0)}% of income).`
      });
    }
  }

  return { ok: true, data: insights };
}

// ============================================================
// Scenario Persistence
// ============================================================

/**
 * Saves the current planning session as a named scenario.
 * @param {string} name - Scenario name
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function saveScenario(name) {
  const scenarioData = JSON.stringify(planningSessionData);

  const result = await db.insert('planning_scenarios', {
    name,
    data: scenarioData
  });

  if (result.ok) {
    events.emit('planning:scenario-saved', { scenario: result.data });
  }

  return result;
}

/**
 * Gets all saved planning scenarios.
 * @returns {Promise<{ok: boolean, data?: Array, error?: object}>}
 */
async function getScenarios() {
  return await db.query('planning_scenarios', {}, { orderBy: 'created_at DESC' });
}

/**
 * Loads a saved scenario into the planning session.
 * @param {number} id - Scenario ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function loadScenario(id) {
  const result = await db.getById('planning_scenarios', id);

  if (!result.ok) {
    return result;
  }

  // Parse and load scenario data
  planningSessionData = JSON.parse(result.data.data);

  events.emit('planning:scenario-loaded', { scenario: result.data });

  return { ok: true, data: planningSessionData };
}

/**
 * Deletes a saved scenario.
 * @param {number} id - Scenario ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteScenario(id) {
  return await db.delete('planning_scenarios', id);
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Initialization
  initialize,

  // Session management
  getSessionData,
  loadCurrentBudgetData,
  resetSession,

  // Session modifications - accounts
  updateSessionAccount,
  createSessionAccount,
  deleteSessionAccount,

  // Session modifications - income sources
  updateSessionIncomeSource,
  createSessionIncomeSource,
  deleteSessionIncomeSource,

  // Session modifications - categories
  updateSessionCategory,
  createSessionCategory,
  deleteSessionCategory,

  // Session modifications - planned expenses
  updateSessionPlannedExpense,
  createSessionPlannedExpense,
  deleteSessionPlannedExpense,

  // Session modifications - goals
  updateSessionGoal,
  createSessionGoal,
  deleteSessionGoal,

  // Calculations
  calculateBalanceProjection,
  generateInsights,

  // Scenario persistence
  saveScenario,
  getScenarios,
  loadScenario,
  deleteScenario
};
