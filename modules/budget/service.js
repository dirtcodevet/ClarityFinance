/**
 * Budget Module - Service Layer
 * 
 * Business logic for the Budget/Setup page.
 * Manages: accounts, income sources, buckets, categories, planned expenses, and goals.
 * 
 * See docs/modules/budget.md for documentation.
 */

const db = require('../../core/database');
const events = require('../../core/events');

// ============================================================
// Initialization
// ============================================================

/**
 * Initializes the budget module.
 * Called once at app startup.
 */
async function initialize() {
  console.log('[Budget] Module initialized');
}

// ============================================================
// Account Functions
// ============================================================

/**
 * Gets all active accounts.
 * @returns {Promise<{ok: boolean, data?: Array, error?: object}>}
 */
async function getAccounts() {
  return await db.query('accounts', {}, { orderBy: 'bank_name' });
}

/**
 * Creates a new account.
 * @param {object} data - Account data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createAccount(data) {
  // Set starting_balance_date to today if not provided
  if (!data.starting_balance_date) {
    data.starting_balance_date = new Date().toISOString().split('T')[0];
  }
  if (!data.effective_from) {
    data.effective_from = new Date().toISOString().split('T')[0];
  }

  const result = await db.insert('accounts', data);

  if (result.ok) {
    events.emit('account:created', { account: result.data });
  }

  return result;
}

/**
 * Updates an existing account.
 * @param {number} id - Account ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateAccount(id, changes) {
  const result = await db.update('accounts', id, changes);
  
  if (result.ok) {
    events.emit('account:updated', { account: result.data, changes });
  }
  
  return result;
}

/**
 * Deletes an account (soft delete).
 * @param {number} id - Account ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteAccount(id) {
  const result = await db.delete('accounts', id);
  
  if (result.ok) {
    events.emit('account:deleted', { id });
  }
  
  return result;
}

// ============================================================
// Income Source Functions
// ============================================================

/**
 * Gets all active income sources.
 * @returns {Promise<{ok: boolean, data?: Array, error?: object}>}
 */
async function getIncomeSources() {
  return await db.query('income_sources', {}, { orderBy: 'source_name' });
}

/**
 * Creates a new income source.
 * @param {object} data - Income source data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createIncomeSource(data) {
  if (!data.effective_from) {
    data.effective_from = new Date().toISOString().split('T')[0];
  }
  const result = await db.insert('income_sources', data);
  
  if (result.ok) {
    events.emit('income-source:created', { incomeSource: result.data });
  }
  
  return result;
}

/**
 * Updates an existing income source.
 * @param {number} id - Income source ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateIncomeSource(id, changes) {
  const result = await db.update('income_sources', id, changes);
  
  if (result.ok) {
    events.emit('income-source:updated', { incomeSource: result.data, changes });
  }
  
  return result;
}

/**
 * Deletes an income source (soft delete).
 * @param {number} id - Income source ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteIncomeSource(id) {
  const result = await db.delete('income_sources', id);
  
  if (result.ok) {
    events.emit('income-source:deleted', { id });
  }
  
  return result;
}

// ============================================================
// Bucket Functions
// ============================================================

/**
 * Gets all buckets (pre-seeded, cannot be deleted).
 * @returns {Promise<{ok: boolean, data?: Array, error?: object}>}
 */
async function getBuckets() {
  return await db.query('buckets', {}, { orderBy: 'sort_order' });
}

/**
 * Updates a bucket (can only rename).
 * @param {number} id - Bucket ID
 * @param {object} changes - Fields to update (only name allowed)
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateBucket(id, changes) {
  const result = await db.update('buckets', id, changes);
  
  if (result.ok) {
    events.emit('bucket:updated', { bucket: result.data, changes });
  }
  
  return result;
}

// ============================================================
// Category Functions
// ============================================================

/**
 * Gets all active categories.
 * @param {number} bucketId - Optional bucket ID to filter by
 * @returns {Promise<{ok: boolean, data?: Array, error?: object}>}
 */
async function getCategories(bucketId = null) {
  const filters = bucketId ? { bucket_id: bucketId } : {};
  return await db.query('categories', filters, { orderBy: 'name' });
}

/**
 * Creates a new category.
 * @param {object} data - Category data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createCategory(data) {
  if (!data.effective_from) {
    data.effective_from = new Date().toISOString().split('T')[0];
  }
  const result = await db.insert('categories', data);
  
  if (result.ok) {
    events.emit('category:created', { category: result.data });
  }
  
  return result;
}

/**
 * Updates an existing category.
 * @param {number} id - Category ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateCategory(id, changes) {
  const result = await db.update('categories', id, changes);
  
  if (result.ok) {
    events.emit('category:updated', { category: result.data, changes });
  }
  
  return result;
}

/**
 * Deletes a category (soft delete).
 * @param {number} id - Category ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteCategory(id) {
  const result = await db.delete('categories', id);
  
  if (result.ok) {
    events.emit('category:deleted', { id });
  }
  
  return result;
}

// ============================================================
// Planned Expense Functions
// ============================================================

/**
 * Gets all active planned expenses.
 * @param {number} bucketId - Optional bucket ID to filter by
 * @returns {Promise<{ok: boolean, data?: Array, error?: object}>}
 */
async function getPlannedExpenses(bucketId = null) {
  const filters = bucketId ? { bucket_id: bucketId } : {};
  return await db.query('planned_expenses', filters, { orderBy: 'description' });
}

/**
 * Creates a new planned expense.
 * @param {object} data - Planned expense data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createPlannedExpense(data) {
  if (!data.effective_from) {
    data.effective_from = new Date().toISOString().split('T')[0];
  }
  const result = await db.insert('planned_expenses', data);
  
  if (result.ok) {
    events.emit('planned-expense:created', { plannedExpense: result.data });
  }
  
  return result;
}

/**
 * Updates an existing planned expense.
 * @param {number} id - Planned expense ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updatePlannedExpense(id, changes) {
  const result = await db.update('planned_expenses', id, changes);
  
  if (result.ok) {
    events.emit('planned-expense:updated', { plannedExpense: result.data, changes });
  }
  
  return result;
}

/**
 * Deletes a planned expense (soft delete).
 * @param {number} id - Planned expense ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deletePlannedExpense(id) {
  const result = await db.delete('planned_expenses', id);
  
  if (result.ok) {
    events.emit('planned-expense:deleted', { id });
  }
  
  return result;
}

// ============================================================
// Goal Functions
// ============================================================

/**
 * Gets all active goals.
 * @returns {Promise<{ok: boolean, data?: Array, error?: object}>}
 */
async function getGoals() {
  return await db.query('goals', {}, { orderBy: 'target_date' });
}

/**
 * Creates a new goal.
 * @param {object} data - Goal data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function createGoal(data) {
  if (!data.effective_from) {
    data.effective_from = new Date().toISOString().split('T')[0];
  }
  const result = await db.insert('goals', data);
  
  if (result.ok) {
    events.emit('goal:created', { goal: result.data });
  }
  
  return result;
}

/**
 * Updates an existing goal.
 * @param {number} id - Goal ID
 * @param {object} changes - Fields to update
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function updateGoal(id, changes) {
  const result = await db.update('goals', id, changes);
  
  if (result.ok) {
    events.emit('goal:updated', { goal: result.data, changes });
  }
  
  return result;
}

/**
 * Deletes a goal (soft delete).
 * @param {number} id - Goal ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function deleteGoal(id) {
  const result = await db.delete('goals', id);
  
  if (result.ok) {
    events.emit('goal:deleted', { id });
  }
  
  return result;
}

// ============================================================
// Restore Functions (Undo Support)
// ============================================================

/**
 * Restores a soft-deleted record by table name.
 * @param {string} table - Table name
 * @param {number} id - Record ID
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function restoreRecord(table, id) {
  const allowedTables = new Set([
    'accounts',
    'income_sources',
    'categories',
    'planned_expenses',
    'goals'
  ]);

  if (!allowedTables.has(table)) {
    return { ok: false, error: { code: 'INVALID_TABLE', message: `Restore not allowed for table: ${table}` } };
  }

  const result = await db.execute(
    `UPDATE ${table} SET is_deleted = 0, updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );

  if (!result.ok) {
    return result;
  }

  const recordResult = await db.getById(table, id);
  if (!recordResult.ok) {
    return recordResult;
  }

  const record = recordResult.data;

  if (table === 'accounts') {
    events.emit('account:updated', { account: record, changes: { is_deleted: 0 } });
  } else if (table === 'income_sources') {
    events.emit('income-source:updated', { incomeSource: record, changes: { is_deleted: 0 } });
  } else if (table === 'categories') {
    events.emit('category:updated', { category: record, changes: { is_deleted: 0 } });
  } else if (table === 'planned_expenses') {
    events.emit('planned-expense:updated', { plannedExpense: record, changes: { is_deleted: 0 } });
  } else if (table === 'goals') {
    events.emit('goal:updated', { goal: record, changes: { is_deleted: 0 } });
  }

  return { ok: true, data: record };
}

/**
 * Adds funds to a goal.
 * @param {number} id - Goal ID
 * @param {number} amount - Amount to add
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function fundGoal(id, amount) {
  // Get current goal
  const goalResult = await db.getById('goals', id);
  if (!goalResult.ok) {
    return goalResult;
  }
  
  const goal = goalResult.data;
  const newFundedAmount = (goal.funded_amount || 0) + amount;
  
  const result = await db.update('goals', id, { funded_amount: newFundedAmount });
  
  if (result.ok) {
    const isComplete = newFundedAmount >= goal.target_amount;
    events.emit('goal:funded', {
      goal: result.data,
      amount,
      newTotal: newFundedAmount,
      isComplete
    });
  }
  
  return result;
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Calculates total planned expenses for a bucket.
 * @param {number} bucketId - Bucket ID
 * @returns {Promise<{ok: boolean, data?: number, error?: object}>}
 */
async function getBucketTotal(bucketId) {
  const result = await db.query('planned_expenses', { bucket_id: bucketId });
  
  if (!result.ok) {
    return result;
  }
  
  const total = result.data.reduce((sum, expense) => sum + expense.amount, 0);
  return { ok: true, data: total };
}

/**
 * Gets summary data for the budget page.
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function getBudgetSummary() {
  const [accounts, incomeSources, buckets, categories, plannedExpenses, goals] = await Promise.all([
    getAccounts(),
    getIncomeSources(),
    getBuckets(),
    getCategories(),
    getPlannedExpenses(),
    getGoals()
  ]);
  
  // Check for any errors
  const results = [accounts, incomeSources, buckets, categories, plannedExpenses, goals];
  const failed = results.find(r => !r.ok);
  if (failed) {
    return failed;
  }
  
  // Calculate totals
  const totalIncome = incomeSources.data.reduce((sum, s) => sum + s.amount, 0);
  const totalExpenses = plannedExpenses.data.reduce((sum, e) => sum + e.amount, 0);
  const totalGoalTarget = goals.data.reduce((sum, g) => sum + g.target_amount, 0);
  const totalGoalFunded = goals.data.reduce((sum, g) => sum + (g.funded_amount || 0), 0);
  
  return {
    ok: true,
    data: {
      accounts: accounts.data,
      incomeSources: incomeSources.data,
      buckets: buckets.data,
      categories: categories.data,
      plannedExpenses: plannedExpenses.data,
      goals: goals.data,
      totals: {
        income: totalIncome,
        expenses: totalExpenses,
        remaining: totalIncome - totalExpenses,
        goalTarget: totalGoalTarget,
        goalFunded: totalGoalFunded
      }
    }
  };
}

// ============================================================
// Month-Based Budget Data
// ============================================================

function getMonthRange(monthString) {
  const [year, month] = monthString.split('-').map(Number);
  const startDate = `${monthString}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${monthString}-${String(endDay).padStart(2, '0')}`;
  const endDateTime = `${endDate}T23:59:59.999Z`;
  return { startDate, endDate, endDateTime };
}

function normalizeMonthString(dateString) {
  if (!dateString) return null;
  return dateString.slice(0, 7);
}

async function getMonthData(table, monthString, orderBy) {
  const { startDate, endDateTime } = getMonthRange(monthString);
  return await db.query(
    table,
    { effective_from: { between: [startDate, endDateTime] } },
    { orderBy }
  );
}

async function monthHasData(monthString) {
  const tables = ['accounts', 'income_sources', 'categories', 'planned_expenses', 'goals'];

  for (const table of tables) {
    const result = await getMonthData(table, monthString, 'effective_from');
    if (!result.ok) {
      return result;
    }
    if (result.data.length > 0) {
      return { ok: true, data: true };
    }
  }

  return { ok: true, data: false };
}

async function getLatestEditedMonthBefore(monthString) {
  const { startDate } = getMonthRange(monthString);
  const tables = ['accounts', 'income_sources', 'planned_expenses', 'goals'];
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

async function copyMonthData(fromMonth, toMonth) {
  if (!fromMonth || fromMonth === toMonth) {
    return { ok: true, data: false };
  }

  const [accountsResult, incomeResult, categoriesResult, expensesResult, goalsResult] = await Promise.all([
    getMonthData('accounts', fromMonth, 'bank_name'),
    getMonthData('income_sources', fromMonth, 'source_name'),
    getMonthData('categories', fromMonth, 'name'),
    getMonthData('planned_expenses', fromMonth, 'description'),
    getMonthData('goals', fromMonth, 'target_date')
  ]);

  const results = [accountsResult, incomeResult, categoriesResult, expensesResult, goalsResult];
  const failed = results.find(result => !result.ok);
  if (failed) {
    return failed;
  }

  const accountIdMap = new Map();
  const categoryIdMap = new Map();
  const toStartDate = `${toMonth}-01`;

  for (const account of accountsResult.data) {
    const newRecord = {
      bank_name: account.bank_name,
      account_type: account.account_type,
      starting_balance: account.starting_balance,
      starting_balance_date: account.starting_balance_date,
      effective_from: toStartDate
    };
    const insertResult = await db.insert('accounts', newRecord);
    if (!insertResult.ok) {
      return insertResult;
    }
    accountIdMap.set(account.id, insertResult.data.id);
  }

  for (const income of incomeResult.data) {
    const newRecord = {
      source_name: income.source_name,
      income_type: income.income_type,
      amount: income.amount,
      account_id: accountIdMap.get(income.account_id) || income.account_id,
      pay_dates: income.pay_dates,
      effective_from: toStartDate
    };
    const insertResult = await db.insert('income_sources', newRecord);
    if (!insertResult.ok) {
      return insertResult;
    }
  }

  for (const category of categoriesResult.data) {
    const newRecord = {
      name: category.name,
      bucket_id: category.bucket_id,
      effective_from: toStartDate
    };
    const insertResult = await db.insert('categories', newRecord);
    if (!insertResult.ok) {
      return insertResult;
    }
    categoryIdMap.set(category.id, insertResult.data.id);
  }

  for (const expense of expensesResult.data) {
    const newRecord = {
      description: expense.description,
      amount: expense.amount,
      bucket_id: expense.bucket_id,
      category_id: categoryIdMap.get(expense.category_id) || expense.category_id,
      account_id: accountIdMap.get(expense.account_id) || expense.account_id,
      due_dates: expense.due_dates,
      is_recurring: expense.is_recurring,
      recurrence_end_date: expense.recurrence_end_date,
      effective_from: toStartDate
    };
    const insertResult = await db.insert('planned_expenses', newRecord);
    if (!insertResult.ok) {
      return insertResult;
    }
  }

  for (const goal of goalsResult.data) {
    const newRecord = {
      name: goal.name,
      target_amount: goal.target_amount,
      target_date: goal.target_date,
      funded_amount: goal.funded_amount,
      effective_from: toStartDate
    };
    const insertResult = await db.insert('goals', newRecord);
    if (!insertResult.ok) {
      return insertResult;
    }
  }

  return { ok: true, data: true };
}

async function ensureMonthData(monthString) {
  if (!monthString) {
    return { ok: true, data: false };
  }

  const hasDataResult = await monthHasData(monthString);
  if (!hasDataResult.ok) {
    return hasDataResult;
  }

  if (hasDataResult.data) {
    return { ok: true, data: false };
  }

  const latestMonthResult = await getLatestEditedMonthBefore(monthString);
  if (!latestMonthResult.ok) {
    return latestMonthResult;
  }

  const latestMonth = latestMonthResult.data;
  if (!latestMonth) {
    return { ok: true, data: false };
  }

  return await copyMonthData(latestMonth, monthString);
}

/**
 * Gets budget data for a specific month, applying forward carry rules.
 * @param {string} monthString - Month in YYYY-MM format
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function getBudgetDataForMonth(monthString) {
  if (!monthString) {
    const now = new Date();
    monthString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const ensureResult = await ensureMonthData(monthString);
  if (!ensureResult.ok) {
    return ensureResult;
  }

  const [accounts, incomeSources, buckets, categories, plannedExpenses, goals] = await Promise.all([
    getMonthData('accounts', monthString, 'bank_name'),
    getMonthData('income_sources', monthString, 'source_name'),
    getBuckets(),
    getMonthData('categories', monthString, 'name'),
    getMonthData('planned_expenses', monthString, 'description'),
    getMonthData('goals', monthString, 'target_date')
  ]);

  const results = [accounts, incomeSources, buckets, categories, plannedExpenses, goals];
  const failed = results.find(result => !result.ok);
  if (failed) {
    return failed;
  }

  return {
    ok: true,
    data: {
      accounts: accounts.data,
      incomeSources: incomeSources.data,
      buckets: buckets.data,
      categories: categories.data,
      plannedExpenses: plannedExpenses.data,
      goals: goals.data
    }
  };
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  initialize,
  
  // Accounts
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  
  // Income Sources
  getIncomeSources,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  
  // Buckets
  getBuckets,
  updateBucket,
  
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Planned Expenses
  getPlannedExpenses,
  createPlannedExpense,
  updatePlannedExpense,
  deletePlannedExpense,
  
  // Goals
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  fundGoal,
  restoreRecord,
  
  // Utilities
  getBucketTotal,
  getBudgetSummary,

  // Month-based
  getBudgetDataForMonth
};
