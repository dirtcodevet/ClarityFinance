/**
 * Dashboard Module - Service Layer
 * 
 * Provides data aggregation and calculations for dashboard visualizations.
 * This is a read-only module - it queries data from other modules' tables
 * but does not modify any data.
 * 
 * See docs/modules/dashboard.md for specification.
 */

const db = require('../../core/database');
const events = require('../../core/events');

// ============================================================
// Summary Banner Data
// ============================================================

/**
 * Gets a comprehensive budget summary for the summary banner.
 * Includes status of all budget categories and income.
 * 
 * @param {string} month - Month in YYYY-MM format
 * @returns {Promise<{ok: true, data: object} | {ok: false, error: object}>}
 */
async function getBudgetSummary(month) {
  const startDate = `${month}-01`;
  const endDate = getLastDayOfMonth(month);
  
  // Get all required data in parallel
  const [
    bucketsResult,
    categoriesResult,
    plannedExpensesResult,
    transactionsResult,
    incomeSourcesResult,
    goalsResult,
    accountsResult
  ] = await Promise.all([
    db.query('buckets', {}, { orderBy: 'sort_order', order: 'asc' }),
    db.query('categories', {}),
    db.query('planned_expenses', {}),
    db.query('transactions', { date: { between: [startDate, endDate] } }),
    db.query('income_sources', {}),
    db.query('goals', {}),
    db.query('accounts', {})
  ]);
  
  // Check for errors
  if (!bucketsResult.ok) return bucketsResult;
  if (!categoriesResult.ok) return categoriesResult;
  if (!plannedExpensesResult.ok) return plannedExpensesResult;
  if (!transactionsResult.ok) return transactionsResult;
  if (!incomeSourcesResult.ok) return incomeSourcesResult;
  if (!goalsResult.ok) return goalsResult;
  if (!accountsResult.ok) return accountsResult;
  
  const buckets = bucketsResult.data;
  const categories = categoriesResult.data;
  const plannedExpenses = plannedExpensesResult.data;
  const transactions = transactionsResult.data;
  const incomeSources = incomeSourcesResult.data;
  const goals = goalsResult.data;
  const accounts = accountsResult.data;
  
  // Build category lookup
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const bucketMap = new Map(buckets.map(b => [b.id, b]));
  
  // Calculate actual expenses by category
  const actualByCategory = new Map();
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const current = actualByCategory.get(t.category_id) || 0;
      actualByCategory.set(t.category_id, current + t.amount);
    });
  
  // Calculate planned expenses by category (for current month)
  const plannedByCategory = new Map();
  plannedExpenses.forEach(pe => {
    const dueDates = parseJsonArray(pe.due_dates);
    const datesInMonth = dueDates.filter(d => d.startsWith(month));
    if (datesInMonth.length > 0) {
      const current = plannedByCategory.get(pe.category_id) || 0;
      plannedByCategory.set(pe.category_id, current + (pe.amount * datesInMonth.length));
    }
  });
  
  // Build category status list
  const categoryStatus = categories.map(cat => {
    const bucket = bucketMap.get(cat.bucket_id);
    const planned = plannedByCategory.get(cat.id) || 0;
    const actual = actualByCategory.get(cat.id) || 0;
    const remaining = planned - actual;
    const percentUsed = planned > 0 ? (actual / planned) * 100 : 0;
    
    return {
      id: cat.id,
      name: cat.name,
      bucketId: cat.bucket_id,
      bucketName: bucket ? bucket.name : 'Unknown',
      bucketKey: bucket ? bucket.bucket_key : 'unknown',
      planned,
      actual,
      remaining,
      percentUsed,
      status: getStatusLabel(percentUsed, remaining)
    };
  }).filter(c => c.planned > 0 || c.actual > 0);
  
  // Calculate income summary
  const plannedIncome = incomeSources.reduce((sum, is) => {
    const payDates = parseJsonArray(is.pay_dates);
    const datesInMonth = payDates.filter(d => d.startsWith(month));
    return sum + (is.amount * datesInMonth.length);
  }, 0);
  
  const actualIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate totals
  const totalPlannedExpenses = Array.from(plannedByCategory.values()).reduce((a, b) => a + b, 0);
  const totalActualExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Goals summary
  const goalsSummary = goals.map(g => ({
    id: g.id,
    name: g.name,
    targetAmount: g.target_amount,
    fundedAmount: g.funded_amount || 0,
    targetDate: g.target_date,
    percentFunded: g.target_amount > 0 ? ((g.funded_amount || 0) / g.target_amount) * 100 : 0,
    isComplete: (g.funded_amount || 0) >= g.target_amount
  }));
  
  // Total account balance
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.starting_balance || 0), 0);
  
  return {
    ok: true,
    data: {
      month,
      income: {
        planned: plannedIncome,
        actual: actualIncome,
        remaining: plannedIncome - actualIncome,
        percentReceived: plannedIncome > 0 ? (actualIncome / plannedIncome) * 100 : 0
      },
      expenses: {
        planned: totalPlannedExpenses,
        actual: totalActualExpenses,
        remaining: totalPlannedExpenses - totalActualExpenses,
        percentUsed: totalPlannedExpenses > 0 ? (totalActualExpenses / totalPlannedExpenses) * 100 : 0
      },
      categoryStatus,
      goals: goalsSummary,
      totalBalance,
      netCashFlow: actualIncome - totalActualExpenses
    }
  };
}

// ============================================================
// Balance Projection Chart Data
// ============================================================

/**
 * Gets balance projection data for the chart.
 * Returns projected vs actual balance over time.
 * 
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<{ok: true, data: object} | {ok: false, error: object}>}
 */
async function getBalanceProjection(startDate, endDate) {
  // Get all required data
  const [
    accountsResult,
    transactionsResult,
    plannedExpensesResult,
    incomeSourcesResult
  ] = await Promise.all([
    db.query('accounts', {}),
    db.query('transactions', { date: { between: [startDate, endDate] } }, { orderBy: 'date', order: 'asc' }),
    db.query('planned_expenses', {}),
    db.query('income_sources', {})
  ]);
  
  if (!accountsResult.ok) return accountsResult;
  if (!transactionsResult.ok) return transactionsResult;
  if (!plannedExpensesResult.ok) return plannedExpensesResult;
  if (!incomeSourcesResult.ok) return incomeSourcesResult;
  
  const accounts = accountsResult.data;
  const transactions = transactionsResult.data;
  const plannedExpenses = plannedExpensesResult.data;
  const incomeSources = incomeSourcesResult.data;
  
  // Calculate starting balance (sum of all account starting balances)
  const startingBalance = accounts.reduce((sum, acc) => sum + (acc.starting_balance || 0), 0);
  
  // Generate date range
  const dates = generateDateRange(startDate, endDate);
  
  // Build projected data points (based on planned income/expenses)
  const projectedData = [];
  let projectedBalance = startingBalance;
  
  // Collect all projected events
  const projectedEvents = [];
  
  // Add planned income
  incomeSources.forEach(is => {
    const payDates = parseJsonArray(is.pay_dates);
    payDates.forEach(date => {
      if (date >= startDate && date <= endDate) {
        projectedEvents.push({ date, amount: is.amount, type: 'income' });
      }
    });
  });
  
  // Add planned expenses
  plannedExpenses.forEach(pe => {
    const dueDates = parseJsonArray(pe.due_dates);
    dueDates.forEach(date => {
      if (date >= startDate && date <= endDate) {
        projectedEvents.push({ date, amount: -pe.amount, type: 'expense' });
      }
    });
  });
  
  // Sort projected events by date
  projectedEvents.sort((a, b) => a.date.localeCompare(b.date));
  
  // Build projected balance over time
  let eventIndex = 0;
  dates.forEach(date => {
    // Apply all events up to this date
    while (eventIndex < projectedEvents.length && projectedEvents[eventIndex].date <= date) {
      projectedBalance += projectedEvents[eventIndex].amount;
      eventIndex++;
    }
    projectedData.push({
      date,
      balance: projectedBalance
    });
  });
  
  // Build actual data points (based on real transactions)
  const actualData = [];
  let actualBalance = startingBalance;
  let txIndex = 0;
  
  // Get transactions before start date to calculate correct starting actual balance
  const priorTxResult = await db.query('transactions', { date: { lt: startDate } });
  if (priorTxResult.ok) {
    priorTxResult.data.forEach(t => {
      if (t.type === 'income') {
        actualBalance += t.amount;
      } else {
        actualBalance -= t.amount;
      }
    });
  }
  
  dates.forEach(date => {
    // Apply all transactions up to this date
    while (txIndex < transactions.length && transactions[txIndex].date <= date) {
      const tx = transactions[txIndex];
      if (tx.type === 'income') {
        actualBalance += tx.amount;
      } else {
        actualBalance -= tx.amount;
      }
      txIndex++;
    }
    actualData.push({
      date,
      balance: actualBalance
    });
  });
  
  return {
    ok: true,
    data: {
      startDate,
      endDate,
      startingBalance,
      projected: projectedData,
      actual: actualData
    }
  };
}

// ============================================================
// Budget vs Expense Chart Data
// ============================================================

/**
 * Gets budget vs expense comparison by bucket/category.
 * 
 * @param {string} month - Month in YYYY-MM format
 * @returns {Promise<{ok: true, data: object} | {ok: false, error: object}>}
 */
async function getBudgetVsExpense(month) {
  const startDate = `${month}-01`;
  const endDate = getLastDayOfMonth(month);
  
  const [
    bucketsResult,
    categoriesResult,
    plannedExpensesResult,
    transactionsResult
  ] = await Promise.all([
    db.query('buckets', { bucket_key: { in: ['major_fixed', 'major_variable', 'minor_fixed', 'minor_variable'] } }, { orderBy: 'sort_order', order: 'asc' }),
    db.query('categories', {}),
    db.query('planned_expenses', {}),
    db.query('transactions', { type: 'expense', date: { between: [startDate, endDate] } })
  ]);
  
  if (!bucketsResult.ok) return bucketsResult;
  if (!categoriesResult.ok) return categoriesResult;
  if (!plannedExpensesResult.ok) return plannedExpensesResult;
  if (!transactionsResult.ok) return transactionsResult;
  
  const buckets = bucketsResult.data;
  const categories = categoriesResult.data;
  const plannedExpenses = plannedExpensesResult.data;
  const transactions = transactionsResult.data;
  
  // Build lookups
  const categoryToBucket = new Map(categories.map(c => [c.id, c.bucket_id]));
  
  // Calculate planned by bucket
  const plannedByBucket = new Map();
  plannedExpenses.forEach(pe => {
    const dueDates = parseJsonArray(pe.due_dates);
    const datesInMonth = dueDates.filter(d => d.startsWith(month));
    if (datesInMonth.length > 0) {
      const current = plannedByBucket.get(pe.bucket_id) || 0;
      plannedByBucket.set(pe.bucket_id, current + (pe.amount * datesInMonth.length));
    }
  });
  
  // Calculate actual by bucket
  const actualByBucket = new Map();
  transactions.forEach(t => {
    const bucketId = t.bucket_id;
    if (bucketId) {
      const current = actualByBucket.get(bucketId) || 0;
      actualByBucket.set(bucketId, current + t.amount);
    }
  });
  
  // Build comparison data
  const comparison = buckets.map(bucket => ({
    id: bucket.id,
    name: bucket.name,
    bucketKey: bucket.bucket_key,
    color: bucket.color,
    planned: plannedByBucket.get(bucket.id) || 0,
    actual: actualByBucket.get(bucket.id) || 0
  }));
  
  // Also build by category for detailed view
  const categoryComparison = categories
    .filter(c => {
      const bucket = buckets.find(b => b.id === c.bucket_id);
      return bucket !== undefined;
    })
    .map(cat => {
      const bucket = buckets.find(b => b.id === cat.bucket_id);
      
      // Calculate planned for this category
      const plannedForCat = plannedExpenses
        .filter(pe => pe.category_id === cat.id)
        .reduce((sum, pe) => {
          const dueDates = parseJsonArray(pe.due_dates);
          const datesInMonth = dueDates.filter(d => d.startsWith(month));
          return sum + (pe.amount * datesInMonth.length);
        }, 0);
      
      // Calculate actual for this category
      const actualForCat = transactions
        .filter(t => t.category_id === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        id: cat.id,
        name: cat.name,
        bucketId: cat.bucket_id,
        bucketName: bucket ? bucket.name : 'Unknown',
        bucketKey: bucket ? bucket.bucket_key : 'unknown',
        color: bucket ? bucket.color : '#888888',
        planned: plannedForCat,
        actual: actualForCat
      };
    })
    .filter(c => c.planned > 0 || c.actual > 0);
  
  return {
    ok: true,
    data: {
      month,
      byBucket: comparison,
      byCategory: categoryComparison
    }
  };
}

// ============================================================
// Goals Progress Data
// ============================================================

/**
 * Gets goals progress data for the goals section.
 * 
 * @returns {Promise<{ok: true, data: array} | {ok: false, error: object}>}
 */
async function getGoalsProgress() {
  const goalsResult = await db.query('goals', {}, { orderBy: 'target_date', order: 'asc' });
  
  if (!goalsResult.ok) return goalsResult;
  
  const goals = goalsResult.data.map(g => ({
    id: g.id,
    name: g.name,
    targetAmount: g.target_amount,
    fundedAmount: g.funded_amount || 0,
    targetDate: g.target_date,
    percentFunded: g.target_amount > 0 ? ((g.funded_amount || 0) / g.target_amount) * 100 : 0,
    isComplete: (g.funded_amount || 0) >= g.target_amount,
    remaining: Math.max(0, g.target_amount - (g.funded_amount || 0))
  }));
  
  return {
    ok: true,
    data: goals
  };
}

// ============================================================
// Account Balances
// ============================================================

/**
 * Gets current calculated balance for all accounts.
 * Balance = starting_balance + income - expenses
 * 
 * @returns {Promise<{ok: true, data: array} | {ok: false, error: object}>}
 */
async function getAccountBalances() {
  const [accountsResult, transactionsResult] = await Promise.all([
    db.query('accounts', {}),
    db.query('transactions', {})
  ]);
  
  if (!accountsResult.ok) return accountsResult;
  if (!transactionsResult.ok) return transactionsResult;
  
  const accounts = accountsResult.data;
  const transactions = transactionsResult.data;

  // Calculate balance changes by account, only for transactions after starting_balance_date
  const balanceChanges = new Map();

  transactions.forEach(t => {
    // Find the account to get its starting_balance_date
    const account = accounts.find(a => a.id === t.account_id);
    if (!account) return;

    // Only include transactions on or after the starting_balance_date
    const startDate = account.starting_balance_date || account.created_at.split('T')[0];
    if (t.date >= startDate) {
      const current = balanceChanges.get(t.account_id) || 0;
      if (t.type === 'income') {
        balanceChanges.set(t.account_id, current + t.amount);
      } else {
        balanceChanges.set(t.account_id, current - t.amount);
      }
    }
  });

  // Build account balance list
  const accountBalances = accounts.map(acc => ({
    id: acc.id,
    bankName: acc.bank_name,
    accountType: acc.account_type,
    startingBalance: acc.starting_balance || 0,
    startingBalanceDate: acc.starting_balance_date || acc.created_at.split('T')[0],
    currentBalance: (acc.starting_balance || 0) + (balanceChanges.get(acc.id) || 0)
  }));
  
  const totalBalance = accountBalances.reduce((sum, acc) => sum + acc.currentBalance, 0);
  
  return {
    ok: true,
    data: {
      accounts: accountBalances,
      totalBalance
    }
  };
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Parses a JSON array string safely.
 * @param {string} str - JSON string
 * @returns {array}
 */
function parseJsonArray(str) {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Gets the last day of a month.
 * @param {string} month - Month in YYYY-MM format
 * @returns {string} Last day in YYYY-MM-DD format
 */
function getLastDayOfMonth(month) {
  const [year, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Generates an array of dates between start and end.
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {string[]} Array of dates
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Gets a status label based on percentage used.
 * @param {number} percentUsed - Percentage of budget used
 * @param {number} remaining - Remaining amount
 * @returns {string} Status label
 */
function getStatusLabel(percentUsed, remaining) {
  if (remaining < 0) return 'over';
  if (percentUsed >= 90) return 'warning';
  if (percentUsed >= 50) return 'on-track';
  return 'under';
}

// ============================================================
// Initialization
// ============================================================

/**
 * Initializes the dashboard module.
 * Sets up event listeners for data refresh.
 */
async function initialize() {
  // Dashboard is read-only, but we listen to events for potential cache invalidation
  // Currently no caching, but event listeners are set up for future optimization
  
  events.on('transaction:created', handleDataChange);
  events.on('transaction:updated', handleDataChange);
  events.on('transaction:deleted', handleDataChange);
  events.on('account:created', handleDataChange);
  events.on('account:updated', handleDataChange);
  events.on('account:deleted', handleDataChange);
  events.on('planned-expense:created', handleDataChange);
  events.on('planned-expense:updated', handleDataChange);
  events.on('planned-expense:deleted', handleDataChange);
  events.on('goal:created', handleDataChange);
  events.on('goal:updated', handleDataChange);
  events.on('goal:deleted', handleDataChange);
  events.on('goal:funded', handleDataChange);
  events.on('income-source:created', handleDataChange);
  events.on('income-source:updated', handleDataChange);
  events.on('income-source:deleted', handleDataChange);
}

/**
 * Handles data changes from other modules.
 * Emits dashboard-specific event for UI updates.
 * @param {object} data - Event data
 */
function handleDataChange(data) {
  // Emit event to notify UI that dashboard data may need refresh
  events.emit('dashboard:data-changed', data);
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Initialization
  initialize,
  
  // Summary data
  getBudgetSummary,
  
  // Chart data
  getBalanceProjection,
  getBudgetVsExpense,
  
  // Goals data
  getGoalsProgress,
  
  // Account data
  getAccountBalances
};
