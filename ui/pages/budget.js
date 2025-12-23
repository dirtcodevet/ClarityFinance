/**
 * Budget Page
 *
 * Handles all UI logic for the Budget/Setup page.
 * Uses the Budget module via IPC for all data operations.
 */

const { ipcRenderer } = require('electron');
const flatpickr = require('flatpickr');

// ============================================================
// State
// ============================================================

const state = {
  accounts: [],
  incomeSources: [],
  buckets: [],
  categories: [],
  plannedExpenses: [],
  goals: [],
  pendingDelete: null
};

// ============================================================
// IPC Bridge - Routes through Budget module service
// ============================================================

const budgetApi = {
  getAccounts: () => ipcRenderer.invoke('budget:getAccounts'),
  createAccount: (data) => ipcRenderer.invoke('budget:createAccount', data),
  updateAccount: (id, changes) => ipcRenderer.invoke('budget:updateAccount', id, changes),
  deleteAccount: (id) => ipcRenderer.invoke('budget:deleteAccount', id),
  getIncomeSources: () => ipcRenderer.invoke('budget:getIncomeSources'),
  createIncomeSource: (data) => ipcRenderer.invoke('budget:createIncomeSource', data),
  updateIncomeSource: (id, changes) => ipcRenderer.invoke('budget:updateIncomeSource', id, changes),
  deleteIncomeSource: (id) => ipcRenderer.invoke('budget:deleteIncomeSource', id),
  getBuckets: () => ipcRenderer.invoke('budget:getBuckets'),
  updateBucket: (id, changes) => ipcRenderer.invoke('budget:updateBucket', id, changes),
  getCategories: (bucketId) => ipcRenderer.invoke('budget:getCategories', bucketId),
  createCategory: (data) => ipcRenderer.invoke('budget:createCategory', data),
  updateCategory: (id, changes) => ipcRenderer.invoke('budget:updateCategory', id, changes),
  deleteCategory: (id) => ipcRenderer.invoke('budget:deleteCategory', id),
  getPlannedExpenses: (bucketId) => ipcRenderer.invoke('budget:getPlannedExpenses', bucketId),
  createPlannedExpense: (data) => ipcRenderer.invoke('budget:createPlannedExpense', data),
  updatePlannedExpense: (id, changes) => ipcRenderer.invoke('budget:updatePlannedExpense', id, changes),
  deletePlannedExpense: (id) => ipcRenderer.invoke('budget:deletePlannedExpense', id),
  getGoals: () => ipcRenderer.invoke('budget:getGoals'),
  createGoal: (data) => ipcRenderer.invoke('budget:createGoal', data),
  updateGoal: (id, changes) => ipcRenderer.invoke('budget:updateGoal', id, changes),
  deleteGoal: (id) => ipcRenderer.invoke('budget:deleteGoal', id),
  fundGoal: (id, amount) => ipcRenderer.invoke('budget:fundGoal', id, amount)
};

const dashboardApi = {
  getAccountBalances: () => ipcRenderer.invoke('dashboard:getAccountBalances')
};

// ============================================================
// Utility Functions
// ============================================================

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseJsonArray(str) {
  try { return Array.isArray(JSON.parse(str)) ? JSON.parse(str) : []; } catch { return []; }
}

function datesToJson(datesStr) {
  if (!datesStr) return '[]';
  const dates = datesStr.split(',').map(d => d.trim()).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  return JSON.stringify(dates);
}

function showError(message) { console.error('[Budget] Error:', message); /* No alert - silent validation */ }

function getBucketColorClass(bucketKey) {
  const colorMap = { 'major_fixed': 'header-blue', 'major_variable': 'header-purple', 'minor_fixed': 'header-green', 'minor_variable': 'header-amber', 'goals': 'header-pink' };
  return colorMap[bucketKey] || 'header-blue';
}

function getAccountById(id) { return state.accounts.find(a => a.id === id); }
function getCategoryById(id) { return state.categories.find(c => c.id === id); }
function getBucketById(id) { return state.buckets.find(b => b.id === id); }

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) { modal.classList.add('active'); const input = modal.querySelector('input:not([type="hidden"]), select'); if (input) setTimeout(() => input.focus(), 100); }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// ============================================================
// Data Loading
// ============================================================

async function loadBudgetData() {
  console.log('[Budget] Loading data...');
  const [accountsResult, incomeResult, bucketsResult, categoriesResult, expensesResult, goalsResult, balancesResult] = await Promise.all([
    budgetApi.getAccounts(), budgetApi.getIncomeSources(), budgetApi.getBuckets(),
    budgetApi.getCategories(), budgetApi.getPlannedExpenses(), budgetApi.getGoals(),
    dashboardApi.getAccountBalances()
  ]);

  if (!accountsResult.ok || !incomeResult.ok || !bucketsResult.ok || !categoriesResult.ok || !expensesResult.ok || !goalsResult.ok) {
    showError('Failed to load data'); return;
  }

  // Merge current balances with account data
  const accounts = accountsResult.data;
  if (balancesResult.ok && balancesResult.data && balancesResult.data.accounts) {
    const balanceMap = new Map(balancesResult.data.accounts.map(b => [b.id, b.currentBalance]));
    accounts.forEach(acc => {
      acc.current_balance = balanceMap.get(acc.id) || acc.starting_balance || 0;
    });
  }

  state.accounts = accounts;
  state.incomeSources = incomeResult.data;
  state.buckets = bucketsResult.data;
  state.categories = categoriesResult.data;
  state.plannedExpenses = expensesResult.data;
  state.goals = goalsResult.data;

  renderAccounts(); renderIncomeSources(); renderCategories(); renderBuckets(); renderGoals(); updateDropdowns();
  console.log('[Budget] Data loaded.');
}

// ============================================================
// Render Functions
// ============================================================

function renderAccounts() {
  const list = document.getElementById('accounts-list');
  const empty = document.getElementById('accounts-empty');
  const table = document.getElementById('accounts-table');
  if (state.accounts.length === 0) { table.style.display = 'none'; empty.style.display = 'block'; return; }
  table.style.display = 'table'; empty.style.display = 'none';
  list.innerHTML = state.accounts.map(a => `<tr><td>${a.bank_name}</td><td><span class="account-type-label type-${a.account_type}">${a.account_type}</span></td><td class="col-currency">${formatCurrency(a.current_balance || a.starting_balance)}</td><td class="col-actions"><button class="btn-icon" data-action="edit-account" data-id="${a.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-icon btn-icon-danger" data-action="delete-account" data-id="${a.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td></tr>`).join('');
}

function renderIncomeSources() {
  const list = document.getElementById('income-list');
  const empty = document.getElementById('income-empty');
  const table = document.getElementById('income-table');
  if (state.incomeSources.length === 0) { table.style.display = 'none'; empty.style.display = 'block'; return; }
  table.style.display = 'table'; empty.style.display = 'none';
  list.innerHTML = state.incomeSources.map(i => `<tr><td>${i.source_name}</td><td><span class="income-type-label type-${i.income_type}">${i.income_type}</span></td><td class="col-currency">${formatCurrency(i.amount)}</td><td class="col-actions"><button class="btn-icon" data-action="edit-income" data-id="${i.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-icon btn-icon-danger" data-action="delete-income" data-id="${i.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td></tr>`).join('');
}

function renderCategories() {
  const grid = document.getElementById('categories-grid');
  const empty = document.getElementById('categories-empty');
  if (state.categories.length === 0) { grid.style.display = 'none'; empty.style.display = 'block'; return; }
  grid.style.display = 'flex'; empty.style.display = 'none';
  grid.innerHTML = state.categories.map(c => {
    const bucket = getBucketById(c.bucket_id);
    const color = bucket ? bucket.color : '#666';
    return `<div class="category-tag"><span class="category-bucket-indicator" style="background-color:${color}"></span><span class="category-name">${c.name}</span><div class="category-actions"><button class="btn-icon" data-action="edit-category" data-id="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-icon btn-icon-danger" data-action="delete-category" data-id="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div></div>`;
  }).join('');
}

function renderBuckets() {
  const container = document.getElementById('buckets-container');
  const expenseBuckets = state.buckets.filter(b => b.bucket_key !== 'goals');
  container.innerHTML = expenseBuckets.map(bucket => {
    const bucketExpenses = state.plannedExpenses.filter(e => e.bucket_id === bucket.id);
    const total = bucketExpenses.reduce((sum, e) => sum + e.amount, 0);
    const colorClass = getBucketColorClass(bucket.bucket_key);
    return `<div class="card bucket-card" data-bucket-id="${bucket.id}"><div class="card-header ${colorClass}"><div><h3 class="card-title">${bucket.name}</h3><span class="bucket-total">${formatCurrency(total)}</span></div><button class="bucket-add-btn" data-action="add-expense" data-bucket-id="${bucket.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add</button></div><div class="card-body">${bucketExpenses.length === 0 ? '<div class="bucket-empty"><p class="bucket-empty-text">No expenses yet</p></div>' : '<ul class="expense-list">' + bucketExpenses.map(e => {
      const cat = getCategoryById(e.category_id);
      const dates = parseJsonArray(e.due_dates);
      const nextDate = dates[0] ? formatDate(dates[0]) : 'No date';
      return `<li class="expense-item"><div class="expense-info"><div class="expense-description">${e.description}</div><div class="expense-details">${cat ? cat.name : 'No category'} • ${nextDate}</div></div><span class="expense-amount">${formatCurrency(e.amount)}</span><div class="expense-actions"><button class="btn-icon" data-action="edit-expense" data-id="${e.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-icon btn-icon-danger" data-action="delete-expense" data-id="${e.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></li>`;
    }).join('') + '</ul>'}</div></div>`;
  }).join('');
}

function renderGoals() {
  const list = document.getElementById('goals-list');
  const empty = document.getElementById('goals-empty');
  if (state.goals.length === 0) { list.style.display = 'none'; empty.style.display = 'block'; return; }
  list.style.display = 'grid'; empty.style.display = 'none';
  list.innerHTML = state.goals.map(g => {
    const funded = g.funded_amount || 0;
    const target = g.target_amount || 1;
    const percent = Math.min(100, Math.round((funded / target) * 100));
    return `<div class="goal-card"><div class="goal-header"><div><div class="goal-name">${g.name}</div><div class="goal-target-date">Target: ${formatDate(g.target_date)}</div></div><div class="goal-actions"><button class="btn-icon" data-action="edit-goal" data-id="${g.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-icon btn-icon-danger" data-action="delete-goal" data-id="${g.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div><div class="goal-progress"><div class="goal-amounts"><span class="goal-funded">${formatCurrency(funded)}</span><span class="goal-target">of ${formatCurrency(target)}</span></div><div class="goal-bar"><div class="goal-bar-fill ${percent >= 100 ? 'complete' : ''}" style="width:${percent}%"></div></div><span class="goal-percent">${percent}%</span></div></div>`;
  }).join('');
}

function updateDropdowns() {
  const incomeAccount = document.getElementById('income-account');
  if (incomeAccount) incomeAccount.innerHTML = state.accounts.length === 0 ? '<option value="">Add an account first</option>' : state.accounts.map(a => `<option value="${a.id}">${a.bank_name}</option>`).join('');
  const categoryBucket = document.getElementById('category-bucket');
  if (categoryBucket) categoryBucket.innerHTML = state.buckets.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
}

// ============================================================
// CRUD Operations
// ============================================================

async function addAccount() {
  const name = document.getElementById('account-name').value.trim();
  const type = document.getElementById('account-type').value;
  const balance = parseFloat(document.getElementById('account-balance').value) || 0;
  if (!name) { showError('Please enter a bank name'); return; }
  const result = await budgetApi.createAccount({ bank_name: name, account_type: type, starting_balance: balance });
  if (!result.ok) { showError(result.error.message); return; }
  document.getElementById('account-name').value = ''; document.getElementById('account-balance').value = '';
  await loadBudgetData();
}

async function saveAccount() {
  const id = parseInt(document.getElementById('edit-account-id').value);
  const name = document.getElementById('edit-account-name').value.trim();
  const type = document.getElementById('edit-account-type').value;
  const balance = parseFloat(document.getElementById('edit-account-balance').value) || 0;
  if (!name) { showError('Please enter a bank name'); return; }
  const result = await budgetApi.updateAccount(id, { bank_name: name, account_type: type, starting_balance: balance });
  if (!result.ok) { showError(result.error.message); return; }
  closeModal('modal-edit-account'); await loadBudgetData();
}

async function deleteAccount(id) {
  const result = await budgetApi.deleteAccount(id);
  if (!result.ok) { showError(result.error.message); return; }
  await loadBudgetData();
}

async function addIncomeSource() {
  const name = document.getElementById('income-name').value.trim();
  const type = document.getElementById('income-type').value;
  const amount = parseFloat(document.getElementById('income-amount').value) || 0;
  const accountId = parseInt(document.getElementById('income-account').value);
  if (!name) { showError('Please enter a source name'); return; }
  if (!accountId) { showError('Please select an account'); return; }
  if (amount <= 0) { showError('Please enter a valid amount'); return; }
  const result = await budgetApi.createIncomeSource({ source_name: name, income_type: type, amount, account_id: accountId, pay_dates: '[]' });
  if (!result.ok) { showError(result.error.message); return; }
  document.getElementById('income-name').value = ''; document.getElementById('income-amount').value = '';
  await loadBudgetData();
}

async function saveIncomeSource() {
  const id = parseInt(document.getElementById('edit-income-id').value);
  const name = document.getElementById('edit-income-name').value.trim();
  const type = document.getElementById('edit-income-type').value;
  const amount = parseFloat(document.getElementById('edit-income-amount').value) || 0;
  const accountId = parseInt(document.getElementById('edit-income-account').value);
  const datesStr = document.getElementById('edit-income-dates').value;
  if (!name) { showError('Please enter a source name'); return; }
  const result = await budgetApi.updateIncomeSource(id, { source_name: name, income_type: type, amount, account_id: accountId, pay_dates: datesToJson(datesStr) });
  if (!result.ok) { showError(result.error.message); return; }
  closeModal('modal-edit-income'); await loadBudgetData();
}

async function deleteIncomeSource(id) {
  const result = await budgetApi.deleteIncomeSource(id);
  if (!result.ok) { showError(result.error.message); return; }
  await loadBudgetData();
}

async function addCategory() {
  const name = document.getElementById('category-name').value.trim();
  const bucketId = parseInt(document.getElementById('category-bucket').value);
  if (!name) { showError('Please enter a category name'); return; }
  if (!bucketId) { showError('Please select a bucket'); return; }
  const result = await budgetApi.createCategory({ name, bucket_id: bucketId });
  if (!result.ok) { showError(result.error.message); return; }
  document.getElementById('category-name').value = '';
  await loadBudgetData();
}

async function saveCategory() {
  const id = parseInt(document.getElementById('edit-category-id').value);
  const name = document.getElementById('edit-category-name').value.trim();
  const bucketId = parseInt(document.getElementById('edit-category-bucket').value);
  if (!name) { showError('Please enter a category name'); return; }
  const result = await budgetApi.updateCategory(id, { name, bucket_id: bucketId });
  if (!result.ok) { showError(result.error.message); return; }
  closeModal('modal-edit-category'); await loadBudgetData();
}

async function deleteCategory(id) {
  const result = await budgetApi.deleteCategory(id);
  if (!result.ok) { showError(result.error.message); return; }
  await loadBudgetData();
}

async function addPlannedExpense() {
  const bucketId = parseInt(document.getElementById('add-expense-bucket-id').value);
  const description = document.getElementById('add-expense-description').value.trim();
  const amount = parseFloat(document.getElementById('add-expense-amount').value) || 0;
  const categoryId = parseInt(document.getElementById('add-expense-category').value);
  const accountId = parseInt(document.getElementById('add-expense-account').value);
  const datesStr = document.getElementById('add-expense-dates').value;
  if (!description) { showError('Please enter a description'); return; }
  if (amount <= 0) { showError('Please enter a valid amount'); return; }
  if (!categoryId) { showError('Please select a category'); return; }
  if (!accountId) { showError('Please select an account'); return; }
  const isRecurring = document.getElementById('add-expense-recurring').checked ? 1 : 0;
  const endDate = document.getElementById('add-expense-end-date').value || null;
  const data = { description, amount, bucket_id: bucketId, category_id: categoryId, account_id: accountId, due_dates: datesToJson(datesStr), is_recurring: isRecurring };
  if (endDate) data.recurrence_end_date = endDate;
  const result = await budgetApi.createPlannedExpense(data);
  if (!result.ok) { showError(result.error.message); return; }
  closeModal('modal-add-expense'); await loadBudgetData();
}

async function savePlannedExpense() {
  const id = parseInt(document.getElementById('edit-expense-id').value);
  const description = document.getElementById('edit-expense-description').value.trim();
  const amount = parseFloat(document.getElementById('edit-expense-amount').value) || 0;
  const categoryId = parseInt(document.getElementById('edit-expense-category').value);
  const accountId = parseInt(document.getElementById('edit-expense-account').value);
  const datesStr = document.getElementById('edit-expense-dates').value;
  const isRecurring = document.getElementById('edit-expense-recurring').checked ? 1 : 0;
  const endDate = document.getElementById('edit-expense-end-date').value || null;
  if (!description) { showError('Please enter a description'); return; }
  const expense = state.plannedExpenses.find(e => e.id === id);
  if (!expense) return;
  const data = { description, amount, bucket_id: expense.bucket_id, category_id: categoryId, account_id: accountId, due_dates: datesToJson(datesStr), is_recurring: isRecurring };
  if (endDate) data.recurrence_end_date = endDate;
  const result = await budgetApi.updatePlannedExpense(id, data);
  if (!result.ok) { showError(result.error.message); return; }
  closeModal('modal-edit-expense'); await loadBudgetData();
}

async function deletePlannedExpense(id) {
  const result = await budgetApi.deletePlannedExpense(id);
  if (!result.ok) { showError(result.error.message); return; }
  await loadBudgetData();
}

async function addGoal() {
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value) || 0;
  const date = document.getElementById('goal-date').value;
  if (!name) { showError('Please enter a goal name'); return; }
  if (target <= 0) { showError('Please enter a valid target'); return; }
  if (!date) { showError('Please select a date'); return; }
  const result = await budgetApi.createGoal({ name, target_amount: target, target_date: date, funded_amount: 0 });
  if (!result.ok) { showError(result.error.message); return; }
  document.getElementById('goal-name').value = ''; document.getElementById('goal-target').value = ''; document.getElementById('goal-date').value = '';
  await loadBudgetData();
}

async function saveGoal() {
  const id = parseInt(document.getElementById('edit-goal-id').value);
  const name = document.getElementById('edit-goal-name').value.trim();
  const target = parseFloat(document.getElementById('edit-goal-target').value) || 0;
  const date = document.getElementById('edit-goal-date').value;
  const funded = parseFloat(document.getElementById('edit-goal-funded').value) || 0;
  if (!name) { showError('Please enter a goal name'); return; }
  const result = await budgetApi.updateGoal(id, { name, target_amount: target, target_date: date, funded_amount: funded });
  if (!result.ok) { showError(result.error.message); return; }
  closeModal('modal-edit-goal'); await loadBudgetData();
}

async function deleteGoal(id) {
  const result = await budgetApi.deleteGoal(id);
  if (!result.ok) { showError(result.error.message); return; }
  await loadBudgetData();
}

// ============================================================
// Modal Helpers
// ============================================================

function openEditAccountModal(id) {
  const a = state.accounts.find(x => x.id === id); if (!a) return;
  document.getElementById('edit-account-id').value = id;
  document.getElementById('edit-account-name').value = a.bank_name;
  document.getElementById('edit-account-type').value = a.account_type;
  document.getElementById('edit-account-balance').value = a.starting_balance;
  openModal('modal-edit-account');
}

function openEditIncomeModal(id) {
  const i = state.incomeSources.find(x => x.id === id); if (!i) return;
  document.getElementById('edit-income-id').value = id;
  document.getElementById('edit-income-name').value = i.source_name;
  document.getElementById('edit-income-type').value = i.income_type;
  document.getElementById('edit-income-amount').value = i.amount;
  document.getElementById('edit-income-account').innerHTML = state.accounts.map(a => `<option value="${a.id}" ${a.id === i.account_id ? 'selected' : ''}>${a.bank_name}</option>`).join('');
  document.getElementById('edit-income-dates').value = parseJsonArray(i.pay_dates).join(', ');
  openModal('modal-edit-income');
}

function openEditCategoryModal(id) {
  const c = state.categories.find(x => x.id === id); if (!c) return;
  document.getElementById('edit-category-id').value = id;
  document.getElementById('edit-category-name').value = c.name;
  document.getElementById('edit-category-bucket').innerHTML = state.buckets.map(b => `<option value="${b.id}" ${b.id === c.bucket_id ? 'selected' : ''}>${b.name}</option>`).join('');
  openModal('modal-edit-category');
}

function openAddExpenseModal(bucketId) {
  document.getElementById('add-expense-bucket-id').value = bucketId;
  document.getElementById('add-expense-description').value = '';
  document.getElementById('add-expense-amount').value = '';
  document.getElementById('add-expense-dates').value = '';
  const cats = state.categories.filter(c => c.bucket_id === bucketId);
  document.getElementById('add-expense-category').innerHTML = cats.length === 0 ? '<option value="">No categories</option>' : cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('add-expense-account').innerHTML = state.accounts.length === 0 ? '<option value="">No accounts</option>' : state.accounts.map(a => `<option value="${a.id}">${a.bank_name}</option>`).join('');
  openModal('modal-add-expense');
}

function openEditExpenseModal(id) {
  const e = state.plannedExpenses.find(x => x.id === id); if (!e) return;
  document.getElementById('edit-expense-id').value = id;
  document.getElementById('edit-expense-description').value = e.description;
  document.getElementById('edit-expense-amount').value = e.amount;
  document.getElementById('edit-expense-category').innerHTML = state.categories.map(c => `<option value="${c.id}" ${c.id === e.category_id ? 'selected' : ''}>${c.name}</option>`).join('');
  document.getElementById('edit-expense-account').innerHTML = state.accounts.map(a => `<option value="${a.id}" ${a.id === e.account_id ? 'selected' : ''}>${a.bank_name}</option>`).join('');
  document.getElementById('edit-expense-dates').value = parseJsonArray(e.due_dates).join(', ');
  document.getElementById('edit-expense-recurring').checked = e.is_recurring === 1;
  document.getElementById('edit-expense-end-date').value = e.recurrence_end_date || '';
  document.getElementById('edit-expense-end-date-group').style.display = e.is_recurring === 1 ? 'block' : 'none';
  openModal('modal-edit-expense');
}

function openEditGoalModal(id) {
  const g = state.goals.find(x => x.id === id); if (!g) return;
  document.getElementById('edit-goal-id').value = id;
  document.getElementById('edit-goal-name').value = g.name;
  document.getElementById('edit-goal-target').value = g.target_amount;
  document.getElementById('edit-goal-date').value = g.target_date;
  document.getElementById('edit-goal-funded').value = g.funded_amount || 0;
  openModal('modal-edit-goal');
}

// ============================================================
// Delete Confirmation
// ============================================================

function confirmDelete(type, id, name) {
  state.pendingDelete = { type, id };
  document.getElementById('confirm-delete-message').textContent = `Are you sure you want to delete "${name}"?`;
  openModal('modal-confirm-delete');
}

async function executeDelete() {
  if (!state.pendingDelete) return;
  const { type, id } = state.pendingDelete;
  if (type === 'account') await deleteAccount(id);
  else if (type === 'income') await deleteIncomeSource(id);
  else if (type === 'category') await deleteCategory(id);
  else if (type === 'expense') await deletePlannedExpense(id);
  else if (type === 'goal') await deleteGoal(id);
  state.pendingDelete = null;
  closeModal('modal-confirm-delete');
}

// ============================================================
// Event Handling
// ============================================================

function handleDelegatedClick(e) {
  const target = e.target.closest('[data-action]'); if (!target) return;
  const action = target.dataset.action;
  const id = parseInt(target.dataset.id);
  const bucketId = parseInt(target.dataset.bucketId);

  // Only handle budget-specific actions or actions within budget page/modals
  const budgetPage = document.getElementById('page-budget');
  const budgetModals = ['modal-confirm-delete', 'modal-edit-account', 'modal-edit-income',
                        'modal-edit-category', 'modal-edit-expense', 'modal-add-expense',
                        'modal-edit-goal'];
  const isInBudgetModal = budgetModals.some(id => document.getElementById(id)?.contains(e.target));
  const isInBudgetContext = budgetPage?.contains(e.target) || isInBudgetModal;

  if (!isInBudgetContext) return; // Ignore clicks outside budget context

  if (action === 'edit-account') openEditAccountModal(id);
  else if (action === 'delete-account') { const a = state.accounts.find(x => x.id === id); confirmDelete('account', id, a?.bank_name || 'this account'); }
  else if (action === 'edit-income') openEditIncomeModal(id);
  else if (action === 'delete-income') { const i = state.incomeSources.find(x => x.id === id); confirmDelete('income', id, i?.source_name || 'this income'); }
  else if (action === 'edit-category') openEditCategoryModal(id);
  else if (action === 'delete-category') { const c = state.categories.find(x => x.id === id); confirmDelete('category', id, c?.name || 'this category'); }
  else if (action === 'add-expense') openAddExpenseModal(bucketId);
  else if (action === 'edit-expense') openEditExpenseModal(id);
  else if (action === 'delete-expense') { const e = state.plannedExpenses.find(x => x.id === id); confirmDelete('expense', id, e?.description || 'this expense'); }
  else if (action === 'edit-goal') openEditGoalModal(id);
  else if (action === 'delete-goal') { const g = state.goals.find(x => x.id === id); confirmDelete('goal', id, g?.name || 'this goal'); }
  else if (action === 'confirm') executeDelete();
}

function handleModalSave(modal) {
  if (!modal) return;
  if (modal.id === 'modal-edit-account') saveAccount();
  else if (modal.id === 'modal-edit-income') saveIncomeSource();
  else if (modal.id === 'modal-edit-category') saveCategory();
  else if (modal.id === 'modal-edit-expense') savePlannedExpense();
  else if (modal.id === 'modal-edit-goal') saveGoal();
  else if (modal.id === 'modal-add-expense') addPlannedExpense();
}

function setupQuickAddKeyboard() {
  ['account-name', 'account-type', 'account-balance'].forEach(id => { document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') addAccount(); }); });
  ['income-name', 'income-type', 'income-amount', 'income-account'].forEach(id => { document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') addIncomeSource(); }); });
  ['category-name', 'category-bucket'].forEach(id => { document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') addCategory(); }); });
  ['goal-name', 'goal-target', 'goal-date'].forEach(id => { document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') addGoal(); }); });
}

// ============================================================
// Initialization
// ============================================================

function initializeBudgetPage() {
  document.getElementById('add-account-btn')?.addEventListener('click', addAccount);
  document.getElementById('add-income-btn')?.addEventListener('click', addIncomeSource);
  document.getElementById('add-category-btn')?.addEventListener('click', addCategory);
  document.getElementById('add-goal-btn')?.addEventListener('click', addGoal);
  setupQuickAddKeyboard();

  // Set up recurring expense checkbox toggles
  const addRecurringCheckbox = document.getElementById('add-expense-recurring');
  const editRecurringCheckbox = document.getElementById('edit-expense-recurring');
  if (addRecurringCheckbox) {
    addRecurringCheckbox.addEventListener('change', (e) => {
      document.getElementById('add-expense-end-date-group').style.display = e.target.checked ? 'block' : 'none';
    });
  }
  if (editRecurringCheckbox) {
    editRecurringCheckbox.addEventListener('change', (e) => {
      document.getElementById('edit-expense-end-date-group').style.display = e.target.checked ? 'block' : 'none';
    });
  }

  // Initialize flatpickr for income pay dates (multi-date picker)
  const editIncomeDatesInput = document.getElementById('edit-income-dates');
  if (editIncomeDatesInput) {
    flatpickr(editIncomeDatesInput, {
      mode: 'multiple',
      dateFormat: 'Y-m-d',
      conjunction: ', ',
      allowInput: false
    });
  }

  // Initialize flatpickr for expense due dates (multi-date picker)
  const addExpenseDatesInput = document.getElementById('add-expense-dates');
  const editExpenseDatesInput = document.getElementById('edit-expense-dates');

  if (addExpenseDatesInput) {
    flatpickr(addExpenseDatesInput, {
      mode: 'multiple',
      dateFormat: 'Y-m-d',
      conjunction: ', ',
      allowInput: false
    });
  }

  if (editExpenseDatesInput) {
    flatpickr(editExpenseDatesInput, {
      mode: 'multiple',
      dateFormat: 'Y-m-d',
      conjunction: ', ',
      allowInput: false
    });
  }

  // Use document-level delegation to catch clicks in both page and modals
  document.addEventListener('click', handleDelegatedClick);

  document.querySelectorAll('[data-action="save"]').forEach(btn => {
    btn.addEventListener('click', e => { const modal = e.target.closest('.modal-overlay'); handleModalSave(modal); });
  });
}

module.exports = { initializeBudgetPage, loadBudgetData, openModal, closeModal };
