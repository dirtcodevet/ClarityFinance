/**
 * Planning Page
 *
 * Handles all UI logic for the Planning page.
 * Provides a sandbox environment for "what-if" financial scenarios.
 * Changes here NEVER affect real budget data.
 */

const { ipcRenderer } = require('electron');
const flatpickr = require('flatpickr');

// ============================================================
// State
// ============================================================

const state = {
  sessionData: null,
  selectedProjectionStartDate: null,
  selectedProjectionEndDate: null,
  projectionData: null,
  insights: [],
  visibleAccounts: [],
  pendingDelete: null,
  undoStack: [],
  redoStack: [],
  isReplaying: false
};

// ============================================================
// IPC Bridge - Routes through Planning module service
// ============================================================

const planningApi = {
  getSessionData: () => ipcRenderer.invoke('planning:getSessionData'),
  loadCurrentBudgetData: () => ipcRenderer.invoke('planning:loadCurrentBudgetData'),
  resetSession: () => ipcRenderer.invoke('planning:resetSession'),
  updateSessionAccount: (id, changes) => ipcRenderer.invoke('planning:updateSessionAccount', id, changes),
  createSessionAccount: (data) => ipcRenderer.invoke('planning:createSessionAccount', data),
  deleteSessionAccount: (id) => ipcRenderer.invoke('planning:deleteSessionAccount', id),
  updateSessionIncomeSource: (id, changes) => ipcRenderer.invoke('planning:updateSessionIncomeSource', id, changes),
  createSessionIncomeSource: (data) => ipcRenderer.invoke('planning:createSessionIncomeSource', data),
  deleteSessionIncomeSource: (id) => ipcRenderer.invoke('planning:deleteSessionIncomeSource', id),
  updateSessionCategory: (id, changes) => ipcRenderer.invoke('planning:updateSessionCategory', id, changes),
  createSessionCategory: (data) => ipcRenderer.invoke('planning:createSessionCategory', data),
  deleteSessionCategory: (id) => ipcRenderer.invoke('planning:deleteSessionCategory', id),
  updateSessionPlannedExpense: (id, changes) => ipcRenderer.invoke('planning:updateSessionPlannedExpense', id, changes),
  createSessionPlannedExpense: (data) => ipcRenderer.invoke('planning:createSessionPlannedExpense', data),
  deleteSessionPlannedExpense: (id) => ipcRenderer.invoke('planning:deleteSessionPlannedExpense', id),
  updateSessionGoal: (id, changes) => ipcRenderer.invoke('planning:updateSessionGoal', id, changes),
  createSessionGoal: (data) => ipcRenderer.invoke('planning:createSessionGoal', data),
  deleteSessionGoal: (id) => ipcRenderer.invoke('planning:deleteSessionGoal', id),
  calculateBalanceProjection: (startDate, endDate) => ipcRenderer.invoke('planning:calculateBalanceProjection', startDate, endDate),
  generateInsights: () => ipcRenderer.invoke('planning:generateInsights'),
  replaceSessionData: (data) => ipcRenderer.invoke('planning:replaceSessionData', data),
  saveScenario: (name) => ipcRenderer.invoke('planning:saveScenario', name),
  getScenarios: () => ipcRenderer.invoke('planning:getScenarios'),
  loadScenario: (id) => ipcRenderer.invoke('planning:loadScenario', id),
  deleteScenario: (id) => ipcRenderer.invoke('planning:deleteScenario', id)
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

function cloneSessionData(data) {
  return JSON.parse(JSON.stringify(data));
}

function recordUndoSnapshot() {
  if (state.isReplaying || !state.sessionData) return;
  state.undoStack.push(cloneSessionData(state.sessionData));
  state.redoStack = [];
}

async function handleUndo() {
  const previous = state.undoStack.pop();
  if (!previous) return;

  state.redoStack.push(cloneSessionData(state.sessionData));
  state.isReplaying = true;
  const result = await planningApi.replaceSessionData(previous);
  if (result.ok) {
    state.sessionData = result.data;
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
  state.isReplaying = false;
}

async function handleRedo() {
  const next = state.redoStack.pop();
  if (!next) return;

  state.undoStack.push(cloneSessionData(state.sessionData));
  state.isReplaying = true;
  const result = await planningApi.replaceSessionData(next);
  if (result.ok) {
    state.sessionData = result.data;
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
  state.isReplaying = false;
}

function showError(message) {
  console.error('[Planning] Error:', message);
  /* No alert - silent validation */
}

function getBucketColorClass(bucketKey) {
  const colorMap = {
    'major_fixed': 'header-blue',
    'major_variable': 'header-purple',
    'minor_fixed': 'header-green',
    'minor_variable': 'header-amber',
    'goals': 'header-pink'
  };
  return colorMap[bucketKey] || 'header-blue';
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    const firstInput = modal.querySelector('input:not([type="hidden"]), select');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// ============================================================
// Page Initialization
// ============================================================

async function initializePlanningPage() {
  console.log('[Planning] Initializing page...');

  // Set default projection dates (current month)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  state.selectedProjectionStartDate = firstDay.toISOString().split('T')[0];
  state.selectedProjectionEndDate = lastDay.toISOString().split('T')[0];

  // Set date inputs
  document.getElementById('projection-start-date').value = state.selectedProjectionStartDate;
  document.getElementById('projection-end-date').value = state.selectedProjectionEndDate;

  // Load session data
  await loadSessionData();

  // Set up event listeners
  setupEventListeners();

  // Set up modal handlers
  setupModalHandlers();
  setupDatePickers();
  setupRecurringToggles();
  setupKeyboardShortcuts();

  console.log('[Planning] Page initialized.');
}

// ============================================================
// Data Loading
// ============================================================

async function loadSessionData() {
  console.log('[Planning] Loading session data...');

  const result = await planningApi.getSessionData();

  if (!result.ok) {
    showError('Failed to load planning session data');
    return;
  }

  state.sessionData = result.data;
  if (!state.isReplaying) {
    state.undoStack = [];
    state.redoStack = [];
  }

  // Initialize visible accounts (all visible by default)
  state.visibleAccounts = state.sessionData.accounts
    .filter(a => !a.is_deleted)
    .map(a => a.id);

  // Render all components
  renderAccounts();
  renderIncomeSources();
  renderCategories();
  renderBuckets();
  renderGoals();
  updateDropdowns();

  // Calculate and render projection
  await updateBalanceProjection();

  // Generate and render insights
  await updateInsights();

  console.log('[Planning] Session data loaded.');
}

// ============================================================
// Dropdown Updates
// ============================================================

function updateDropdowns() {
  // Update account dropdowns (modals + quick-add bars)
  const accountSelects = document.querySelectorAll('#planning-edit-income-account, #planning-edit-expense-account, #planning-add-income-account, #planning-add-expense-account, #planning-income-account');
  accountSelects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select account...</option>' +
      state.sessionData.accounts.filter(a => !a.is_deleted).map(a =>
        `<option value="${a.id}">${a.bank_name} (${a.account_type})</option>`
      ).join('');
    if (currentValue) select.value = currentValue;
  });

  // Update bucket dropdowns (modals + quick-add bars)
  const bucketSelects = document.querySelectorAll('#planning-edit-category-bucket, #planning-add-category-bucket, #planning-add-expense-bucket, #planning-category-bucket');
  bucketSelects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select bucket...</option>' +
      state.sessionData.buckets.filter(b => b.bucket_key !== 'goals').map(b =>
        `<option value="${b.id}">${b.name}</option>`
      ).join('');
    if (currentValue) select.value = currentValue;
  });

  // Update category dropdowns (modals only - no quick-add category dropdown)
  const categorySelects = document.querySelectorAll('#planning-edit-expense-category, #planning-add-expense-category');
  categorySelects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select category...</option>' +
      state.sessionData.categories.filter(c => !c.is_deleted).map(c =>
        `<option value="${c.id}">${c.name}</option>`
      ).join('');
    if (currentValue) select.value = currentValue;
  });
}

// ============================================================
// Render Functions
// ============================================================

function renderAccounts() {
  const list = document.getElementById('planning-accounts-list');
  const accounts = state.sessionData.accounts.filter(a => !a.is_deleted);

  if (accounts.length === 0) {
    list.innerHTML = '<p class="empty-message">No accounts defined.</p>';
    return;
  }

  list.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Bank / Institution</th>
          <th>Type</th>
          <th class="col-currency">Starting Balance</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${accounts.map(a => `
          <tr>
            <td>${a.bank_name}</td>
            <td><span class="account-type-label type-${a.account_type}">${a.account_type}</span></td>
            <td class="col-currency">${formatCurrency(a.starting_balance)}</td>
            <td class="col-actions">
              <button class="btn-icon" data-action="edit-account" data-id="${a.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon btn-icon-danger" data-action="delete-account" data-id="${a.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderIncomeSources() {
  const list = document.getElementById('planning-income-list');
  const incomeSources = state.sessionData.incomeSources.filter(i => !i.is_deleted);

  if (incomeSources.length === 0) {
    list.innerHTML = '<p class="empty-message">No income sources defined.</p>';
    return;
  }

  list.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Source</th>
          <th>Type</th>
          <th class="col-currency">Amount</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${incomeSources.map(i => `
          <tr>
            <td>${i.source_name}</td>
            <td><span class="income-type-label type-${i.income_type}">${i.income_type}</span></td>
            <td class="col-currency">${formatCurrency(i.amount)}</td>
            <td class="col-actions">
              <button class="btn-icon" data-action="edit-income" data-id="${i.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon btn-icon-danger" data-action="delete-income" data-id="${i.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderCategories() {
  const grid = document.getElementById('planning-categories-grid');
  const categories = state.sessionData.categories.filter(c => !c.is_deleted);

  if (categories.length === 0) {
    grid.innerHTML = '<p class="empty-message">No categories defined.</p>';
    return;
  }

  grid.innerHTML = categories.map(c => {
    const bucket = state.sessionData.buckets.find(b => b.id === c.bucket_id);
    return `
      <div class="category-item">
        <div class="category-info">
          <div class="category-name">${c.name}</div>
          <div class="category-bucket">${bucket ? bucket.name : 'Unknown'}</div>
        </div>
        <div class="category-actions">
          <button class="btn-icon btn-sm" data-action="edit-category" data-id="${c.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon btn-sm btn-icon-danger" data-action="delete-category" data-id="${c.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderBuckets() {
  const container = document.getElementById('planning-buckets-container');
  const buckets = state.sessionData.buckets.filter(b => b.bucket_key !== 'goals');

  container.innerHTML = buckets.map(bucket => {
    const expenses = state.sessionData.plannedExpenses.filter(e => e.bucket_id === bucket.id && !e.is_deleted);
    const colorClass = getBucketColorClass(bucket.bucket_key);

    return `
      <div class="card bucket-card">
        <div class="card-header ${colorClass}">
          <h3>${bucket.name}</h3>
          <button class="btn-icon btn-icon-light" data-action="add-expense" data-bucket-id="${bucket.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        <div class="card-body">
          ${expenses.length === 0 ? '<p class="empty-message">No expenses in this bucket.</p>' : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th class="col-currency">Amount</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${expenses.map(e => {
                  const category = state.sessionData.categories.find(c => c.id === e.category_id);
                  return `
                    <tr>
                      <td>${e.description}</td>
                      <td>${category ? category.name : 'Unknown'}</td>
                      <td class="col-currency">${formatCurrency(e.amount)}</td>
                      <td class="col-actions">
                        <button class="btn-icon" data-action="edit-expense" data-id="${e.id}">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="btn-icon btn-icon-danger" data-action="delete-expense" data-id="${e.id}">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function renderGoals() {
  const list = document.getElementById('planning-goals-list');
  const goals = state.sessionData.goals.filter(g => !g.is_deleted);

  if (goals.length === 0) {
    list.innerHTML = '<p class="empty-message">No goals defined.</p>';
    return;
  }

  list.innerHTML = goals.map(g => {
    const fundedAmount = g.funded_amount || 0;
    const targetAmount = g.target_amount;
    const progressPercent = Math.min((fundedAmount / targetAmount) * 100, 100);

    return `
      <div class="goal-item">
        <div class="goal-header">
          <div class="goal-name">${g.name}</div>
          <div class="goal-amount">${formatCurrency(fundedAmount)} / ${formatCurrency(targetAmount)}</div>
        </div>
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill ${progressPercent >= 100 ? 'complete' : ''}" style="width: ${progressPercent}%"></div>
          </div>
          <div class="progress-percent">${Math.round(progressPercent)}%</div>
        </div>
        <div class="goal-actions">
          <button class="btn-icon" data-action="edit-goal" data-id="${g.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon btn-icon-danger" data-action="delete-goal" data-id="${g.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// Balance Projection Chart
// ============================================================

async function updateBalanceProjection() {
  const result = await planningApi.calculateBalanceProjection(
    state.selectedProjectionStartDate,
    state.selectedProjectionEndDate
  );

  if (!result.ok) {
    showError('Failed to calculate balance projection');
    return;
  }

  state.projectionData = result.data;
  renderBalanceProjectionChart();
}

function renderBalanceProjectionChart() {
  const canvas = document.getElementById('planning-projection-chart');
  const container = canvas.parentElement;

  // Set canvas size to match container (with devicePixelRatio for crisp rendering)
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (!state.projectionData || Object.keys(state.projectionData.projections).length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No projection data available', width / 2, height / 2);
    return;
  }

  // Filter to visible accounts only
  const visibleProjections = Object.values(state.projectionData.projections)
    .filter(proj => state.visibleAccounts.includes(proj.accountId));

  if (visibleProjections.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No accounts selected for display', width / 2, height / 2);
    return;
  }

  // Calculate chart bounds
  const padding = 50;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Find min/max values
  let minBalance = Infinity;
  let maxBalance = -Infinity;

  visibleProjections.forEach(proj => {
    proj.dataPoints.forEach(point => {
      if (point.balance < minBalance) minBalance = point.balance;
      if (point.balance > maxBalance) maxBalance = point.balance;
    });
  });

  // Add padding to y-axis range
  const yRange = maxBalance - minBalance || 1000;
  minBalance -= yRange * 0.1;
  maxBalance += yRange * 0.1;

  // Draw axes
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw y-axis labels
  ctx.fillStyle = '#475569';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const value = minBalance + (maxBalance - minBalance) * (i / 4);
    const y = height - padding - (i / 4) * chartHeight;
    ctx.fillText(formatCurrency(value), padding - 10, y);

    // Draw gridline
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Draw projection lines
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];
  visibleProjections.forEach((proj, index) => {
    const color = colors[index % colors.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const dataPoints = proj.dataPoints;
    if (dataPoints.length === 0) return;

    dataPoints.forEach((point, i) => {
      const x = padding + (i / Math.max(dataPoints.length - 1, 1)) * chartWidth;
      const y = height - padding - ((point.balance - minBalance) / (maxBalance - minBalance)) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw account label
    if (dataPoints.length > 0) {
      const lastPoint = dataPoints[dataPoints.length - 1];
      const lastX = padding + chartWidth;
      const lastY = height - padding - ((lastPoint.balance - minBalance) / (maxBalance - minBalance)) * chartHeight;

      ctx.fillStyle = color;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(proj.accountName, lastX + 10, lastY);
    }
  });

  setupPlanningChartTooltip(container, canvas, visibleProjections, padding, chartWidth, chartHeight, minBalance, maxBalance);
}

function setupPlanningChartTooltip(container, canvas, projections, padding, chartWidth, chartHeight, minBalance, maxBalance) {
  let tooltip = container.querySelector('.planning-chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'planning-chart-tooltip';
    container.appendChild(tooltip);
  }

  const dataPoints = projections[0]?.dataPoints || [];
  const xScale = (index) => padding + (index / Math.max(dataPoints.length - 1, 1)) * chartWidth;
  const yScale = (value) => container.clientHeight - padding - ((value - minBalance) / (maxBalance - minBalance)) * chartHeight;

  canvas.onmousemove = (event) => {
    if (dataPoints.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const relativeX = Math.min(Math.max(x - padding, 0), chartWidth);
    const index = Math.round((relativeX / chartWidth) * (dataPoints.length - 1));
    const date = dataPoints[index].date;

    const lines = projections.map(proj => {
      const point = proj.dataPoints[index];
      return `<div>${proj.accountName}: ${formatCurrency(point.balance)}</div>`;
    }).join('');

    const xPos = xScale(index);
    const yPos = yScale(projections[0].dataPoints[index].balance);
    tooltip.innerHTML = `<div>${formatDate(date)}</div>${lines}`;
    tooltip.style.left = `${xPos}px`;
    tooltip.style.top = `${yPos}px`;
    tooltip.style.display = 'block';
  };

  canvas.onmouseleave = () => {
    tooltip.style.display = 'none';
  };
}

// ============================================================
// Insights
// ============================================================

async function updateInsights() {
  const result = await planningApi.generateInsights();

  if (!result.ok) {
    showError('Failed to generate insights');
    return;
  }

  state.insights = result.data;
  renderInsights();
}

function renderInsights() {
  const container = document.getElementById('planning-insights-content');

  if (state.insights.length === 0) {
    container.innerHTML = '<p>No insights available. Add some income and expenses to see analysis.</p>';
    return;
  }

  container.innerHTML = state.insights.map(insight => {
    const iconClass = insight.type === 'positive' ? 'insight-positive' : insight.type === 'warning' ? 'insight-warning' : 'insight-neutral';
    return `<p class="${iconClass}">${insight.message}</p>`;
  }).join('');
}

// ============================================================
// Event Handlers
// ============================================================

function setupEventListeners() {
  // Projection date range selectors
  document.getElementById('projection-start-date').addEventListener('change', async (e) => {
    state.selectedProjectionStartDate = e.target.value;
    await updateBalanceProjection();
  });

  document.getElementById('projection-end-date').addEventListener('change', async (e) => {
    state.selectedProjectionEndDate = e.target.value;
    await updateBalanceProjection();
  });

  // Refresh button
  document.getElementById('planning-refresh-btn').addEventListener('click', handleRefresh);

  // Save scenario button
  document.getElementById('planning-save-btn').addEventListener('click', handleSaveScenario);

  // Quick-add buttons
  document.getElementById('planning-add-account-btn').addEventListener('click', handleAddAccount);
  document.getElementById('planning-add-income-btn').addEventListener('click', handleAddIncome);
  document.getElementById('planning-add-category-btn').addEventListener('click', handleAddCategory);
  document.getElementById('planning-add-goal-btn').addEventListener('click', handleAddGoal);

  // Event delegation for all action buttons
  document.getElementById('page-planning').addEventListener('click', handleActionClick);
}

function setupKeyboardShortcuts() {
  const quickAddFields = [
    'planning-account-name', 'planning-account-type', 'planning-account-balance',
    'planning-income-name', 'planning-income-type', 'planning-income-amount', 'planning-income-account',
    'planning-category-name', 'planning-category-bucket',
    'planning-goal-name', 'planning-goal-target', 'planning-goal-date'
  ];

  quickAddFields.forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (id.startsWith('planning-account')) handleAddAccount();
      else if (id.startsWith('planning-income')) handleAddIncome();
      else if (id.startsWith('planning-category')) handleAddCategory();
      else if (id.startsWith('planning-goal')) handleAddGoal();
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.target.matches('textarea')) {
        const saveButton = modal.querySelector('[data-action="save"], [data-action="confirm"]');
        if (saveButton) saveButton.click();
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSaveScenario();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      handleRefresh();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
    }
  });
}

function handleRefresh() {
  openModal('planning-modal-refresh');
}

function handleSaveScenario() {
  const input = document.getElementById('planning-save-scenario-name');
  if (input) input.value = '';
  openModal('planning-modal-save-scenario');
}

function handleActionClick(e) {
  const button = e.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = parseInt(button.dataset.id);
  const bucketId = parseInt(button.dataset.bucketId);

  switch(action) {
    case 'edit-account': openEditAccountModal(id); break;
    case 'delete-account': handleDeleteAccount(id); break;
    case 'edit-income': openEditIncomeModal(id); break;
    case 'delete-income': handleDeleteIncome(id); break;
    case 'edit-category': openEditCategoryModal(id); break;
    case 'delete-category': handleDeleteCategory(id); break;
    case 'add-expense': openAddExpenseModal(bucketId); break;
    case 'edit-expense': openEditExpenseModal(id); break;
    case 'delete-expense': handleDeleteExpense(id); break;
    case 'edit-goal': openEditGoalModal(id); break;
    case 'delete-goal': handleDeleteGoal(id); break;
  }
}

// Quick-add handlers
async function handleAddAccount() {
  const bankName = document.getElementById('planning-account-name').value.trim();
  const accountType = document.getElementById('planning-account-type').value;
  const startingBalance = parseFloat(document.getElementById('planning-account-balance').value) || 0;

  if (!bankName) {
    showError('Please enter a bank name');
    return;
  }

  const data = {
    bank_name: bankName,
    account_type: accountType,
    starting_balance: startingBalance
  };

  recordUndoSnapshot();
  const result = await planningApi.createSessionAccount(data);
  if (result.ok) {
    // Clear inputs
    document.getElementById('planning-account-name').value = '';
    document.getElementById('planning-account-type').value = 'checking';
    document.getElementById('planning-account-balance').value = '';
    // Reload data
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

async function handleAddIncome() {
  const sourceName = document.getElementById('planning-income-name').value.trim();
  const incomeType = document.getElementById('planning-income-type').value;
  const amount = parseFloat(document.getElementById('planning-income-amount').value);
  const accountId = parseInt(document.getElementById('planning-income-account').value);

  if (!sourceName) {
    showError('Please enter a source name');
    return;
  }
  if (!amount || amount <= 0) {
    showError('Please enter a valid amount');
    return;
  }
  if (!accountId) {
    showError('Please select an account');
    return;
  }

  const data = {
    source_name: sourceName,
    income_type: incomeType,
    amount: amount,
    account_id: accountId,
    pay_dates: '[]'
  };

  recordUndoSnapshot();
  const result = await planningApi.createSessionIncomeSource(data);
  if (result.ok) {
    // Clear inputs
    document.getElementById('planning-income-name').value = '';
    document.getElementById('planning-income-type').value = 'w2';
    document.getElementById('planning-income-amount').value = '';
    document.getElementById('planning-income-account').value = '';
    // Reload data
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

async function handleAddCategory() {
  const categoryName = document.getElementById('planning-category-name').value.trim();
  const bucketId = parseInt(document.getElementById('planning-category-bucket').value);

  if (!categoryName) {
    showError('Please enter a category name');
    return;
  }
  if (!bucketId) {
    showError('Please select a bucket');
    return;
  }

  const data = {
    name: categoryName,
    bucket_id: bucketId
  };

  recordUndoSnapshot();
  const result = await planningApi.createSessionCategory(data);
  if (result.ok) {
    // Clear inputs
    document.getElementById('planning-category-name').value = '';
    document.getElementById('planning-category-bucket').value = '';
    // Reload data
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

async function handleAddGoal() {
  const goalName = document.getElementById('planning-goal-name').value.trim();
  const targetAmount = parseFloat(document.getElementById('planning-goal-target').value);
  const targetDate = document.getElementById('planning-goal-date').value;

  if (!goalName) {
    showError('Please enter a goal name');
    return;
  }
  if (!targetAmount || targetAmount <= 0) {
    showError('Please enter a valid target amount');
    return;
  }
  if (!targetDate) {
    showError('Please select a target date');
    return;
  }

  const data = {
    name: goalName,
    target_amount: targetAmount,
    target_date: targetDate,
    funded_amount: 0
  };

  recordUndoSnapshot();
  const result = await planningApi.createSessionGoal(data);
  if (result.ok) {
    // Clear inputs
    document.getElementById('planning-goal-name').value = '';
    document.getElementById('planning-goal-target').value = '';
    document.getElementById('planning-goal-date').value = '';
    // Reload data
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

// ============================================================
// Modal Handlers
// ============================================================

function setupModalHandlers() {
  // Edit Account Modal
  document.querySelector('#planning-modal-edit-account [data-action="save"]').addEventListener('click', saveAccountEdit);

  // Edit Income Modal
  document.querySelector('#planning-modal-edit-income [data-action="save"]').addEventListener('click', saveIncomeEdit);

  // Edit Category Modal
  document.querySelector('#planning-modal-edit-category [data-action="save"]').addEventListener('click', saveCategoryEdit);

  // Add Expense Modal
  document.querySelector('#planning-modal-add-expense [data-action="save"]').addEventListener('click', saveExpenseAdd);

  // Edit Expense Modal
  document.querySelector('#planning-modal-edit-expense [data-action="save"]').addEventListener('click', saveExpenseEdit);

  // Edit Goal Modal
  document.querySelector('#planning-modal-edit-goal [data-action="save"]').addEventListener('click', saveGoalEdit);

  // Delete Confirmation Modal
  document.querySelector('#planning-modal-confirm-delete [data-action="confirm"]').addEventListener('click', confirmDelete);

  // Refresh Confirmation Modal
  document.querySelector('#planning-modal-refresh [data-action="confirm"]').addEventListener('click', confirmRefresh);

  // Save Scenario Modal
  document.querySelector('#planning-modal-save-scenario [data-action="save"]').addEventListener('click', confirmSaveScenario);
}

function setupDatePickers() {
  const addExpenseDatesInput = document.getElementById('planning-add-expense-dates');
  const editExpenseDatesInput = document.getElementById('planning-edit-expense-dates');

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
}

function setupRecurringToggles() {
  const addRecurringCheckbox = document.getElementById('planning-add-expense-recurring');
  const editRecurringCheckbox = document.getElementById('planning-edit-expense-recurring');

  if (addRecurringCheckbox) {
    addRecurringCheckbox.addEventListener('change', (e) => {
      document.getElementById('planning-add-expense-end-date-group').style.display = e.target.checked ? 'block' : 'none';
    });
  }

  if (editRecurringCheckbox) {
    editRecurringCheckbox.addEventListener('change', (e) => {
      document.getElementById('planning-edit-expense-end-date-group').style.display = e.target.checked ? 'block' : 'none';
    });
  }
}

// Account Modals
function openEditAccountModal(id) {
  const account = state.sessionData.accounts.find(a => a.id === id);
  if (!account) return;

  document.getElementById('planning-edit-account-id').value = account.id;
  document.getElementById('planning-edit-account-name').value = account.bank_name;
  document.getElementById('planning-edit-account-type').value = account.account_type;
  document.getElementById('planning-edit-account-balance').value = account.starting_balance;

  openModal('planning-modal-edit-account');
}

async function saveAccountEdit() {
  const id = parseInt(document.getElementById('planning-edit-account-id').value);
  const changes = {
    bank_name: document.getElementById('planning-edit-account-name').value,
    account_type: document.getElementById('planning-edit-account-type').value,
    starting_balance: parseFloat(document.getElementById('planning-edit-account-balance').value)
  };

  recordUndoSnapshot();
  const result = await planningApi.updateSessionAccount(id, changes);
  if (result.ok) {
    closeModal('planning-modal-edit-account');
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

function handleDeleteAccount(id) {
  state.pendingDelete = { type: 'account', id };
  document.getElementById('planning-confirm-delete-message').textContent =
    'Are you sure you want to delete this account from the planning session?';
  openModal('planning-modal-confirm-delete');
}

// Income Modals
function openEditIncomeModal(id) {
  const income = state.sessionData.incomeSources.find(i => i.id === id);
  if (!income) return;

  updateDropdowns();

  document.getElementById('planning-edit-income-id').value = income.id;
  document.getElementById('planning-edit-income-name').value = income.source_name;
  document.getElementById('planning-edit-income-type').value = income.income_type;
  document.getElementById('planning-edit-income-amount').value = income.amount;
  document.getElementById('planning-edit-income-account').value = income.account_id;
  document.getElementById('planning-edit-income-dates').value = parseJsonArray(income.pay_dates).join(', ');

  openModal('planning-modal-edit-income');
}

async function saveIncomeEdit() {
  const id = parseInt(document.getElementById('planning-edit-income-id').value);
  const changes = {
    source_name: document.getElementById('planning-edit-income-name').value,
    income_type: document.getElementById('planning-edit-income-type').value,
    amount: parseFloat(document.getElementById('planning-edit-income-amount').value),
    account_id: parseInt(document.getElementById('planning-edit-income-account').value),
    pay_dates: datesToJson(document.getElementById('planning-edit-income-dates').value)
  };

  recordUndoSnapshot();
  const result = await planningApi.updateSessionIncomeSource(id, changes);
  if (result.ok) {
    closeModal('planning-modal-edit-income');
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

function handleDeleteIncome(id) {
  state.pendingDelete = { type: 'income', id };
  document.getElementById('planning-confirm-delete-message').textContent =
    'Are you sure you want to delete this income source from the planning session?';
  openModal('planning-modal-confirm-delete');
}

// Category Modals
function openEditCategoryModal(id) {
  const category = state.sessionData.categories.find(c => c.id === id);
  if (!category) return;

  updateDropdowns();

  document.getElementById('planning-edit-category-id').value = category.id;
  document.getElementById('planning-edit-category-name').value = category.name;
  document.getElementById('planning-edit-category-bucket').value = category.bucket_id;

  openModal('planning-modal-edit-category');
}

async function saveCategoryEdit() {
  const id = parseInt(document.getElementById('planning-edit-category-id').value);
  const changes = {
    name: document.getElementById('planning-edit-category-name').value,
    bucket_id: parseInt(document.getElementById('planning-edit-category-bucket').value)
  };

  recordUndoSnapshot();
  const result = await planningApi.updateSessionCategory(id, changes);
  if (result.ok) {
    closeModal('planning-modal-edit-category');
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

function handleDeleteCategory(id) {
  state.pendingDelete = { type: 'category', id };
  document.getElementById('planning-confirm-delete-message').textContent =
    'Are you sure you want to delete this category from the planning session?';
  openModal('planning-modal-confirm-delete');
}

// Expense Modals
function openAddExpenseModal(bucketId) {
  updateDropdowns();

  document.getElementById('planning-add-expense-bucket-id').value = bucketId;
  document.getElementById('planning-add-expense-description').value = '';
  document.getElementById('planning-add-expense-amount').value = '';
  document.getElementById('planning-add-expense-category').value = '';
  document.getElementById('planning-add-expense-account').value = '';
  document.getElementById('planning-add-expense-dates').value = '';
  document.getElementById('planning-add-expense-recurring').checked = false;
  document.getElementById('planning-add-expense-end-date').value = '';
  document.getElementById('planning-add-expense-end-date-group').style.display = 'none';

  openModal('planning-modal-add-expense');
}

async function saveExpenseAdd() {
  const data = {
    bucket_id: parseInt(document.getElementById('planning-add-expense-bucket-id').value),
    description: document.getElementById('planning-add-expense-description').value,
    amount: parseFloat(document.getElementById('planning-add-expense-amount').value),
    category_id: parseInt(document.getElementById('planning-add-expense-category').value),
    account_id: parseInt(document.getElementById('planning-add-expense-account').value),
    due_dates: datesToJson(document.getElementById('planning-add-expense-dates').value),
    is_recurring: document.getElementById('planning-add-expense-recurring').checked ? 1 : 0,
    recurrence_end_date: document.getElementById('planning-add-expense-end-date').value || null
  };

  recordUndoSnapshot();
  const result = await planningApi.createSessionPlannedExpense(data);
  if (result.ok) {
    closeModal('planning-modal-add-expense');
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

function openEditExpenseModal(id) {
  const expense = state.sessionData.plannedExpenses.find(e => e.id === id);
  if (!expense) return;

  updateDropdowns();

  document.getElementById('planning-edit-expense-id').value = expense.id;
  document.getElementById('planning-edit-expense-description').value = expense.description;
  document.getElementById('planning-edit-expense-amount').value = expense.amount;
  document.getElementById('planning-edit-expense-category').value = expense.category_id;
  document.getElementById('planning-edit-expense-account').value = expense.account_id;
  document.getElementById('planning-edit-expense-dates').value = parseJsonArray(expense.due_dates).join(', ');
  document.getElementById('planning-edit-expense-recurring').checked = expense.is_recurring === 1;
  document.getElementById('planning-edit-expense-end-date').value = expense.recurrence_end_date || '';
  document.getElementById('planning-edit-expense-end-date-group').style.display = expense.is_recurring === 1 ? 'block' : 'none';

  openModal('planning-modal-edit-expense');
}

async function saveExpenseEdit() {
  const id = parseInt(document.getElementById('planning-edit-expense-id').value);
  const changes = {
    description: document.getElementById('planning-edit-expense-description').value,
    amount: parseFloat(document.getElementById('planning-edit-expense-amount').value),
    category_id: parseInt(document.getElementById('planning-edit-expense-category').value),
    account_id: parseInt(document.getElementById('planning-edit-expense-account').value),
    due_dates: datesToJson(document.getElementById('planning-edit-expense-dates').value),
    is_recurring: document.getElementById('planning-edit-expense-recurring').checked ? 1 : 0,
    recurrence_end_date: document.getElementById('planning-edit-expense-end-date').value || null
  };

  recordUndoSnapshot();
  const result = await planningApi.updateSessionPlannedExpense(id, changes);
  if (result.ok) {
    closeModal('planning-modal-edit-expense');
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

function handleDeleteExpense(id) {
  state.pendingDelete = { type: 'expense', id };
  document.getElementById('planning-confirm-delete-message').textContent =
    'Are you sure you want to delete this planned expense from the planning session?';
  openModal('planning-modal-confirm-delete');
}

async function confirmRefresh() {
  const result = await planningApi.resetSession();
  if (result.ok) {
    closeModal('planning-modal-refresh');
    await loadSessionData();
  } else {
    showError('Failed to reset session');
  }
}

async function confirmSaveScenario() {
  const nameInput = document.getElementById('planning-save-scenario-name');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    showError('Please enter a scenario name');
    return;
  }

  const result = await planningApi.saveScenario(name);
  if (result.ok) {
    closeModal('planning-modal-save-scenario');
  } else {
    showError('Failed to save scenario');
  }
}

// Goal Modals
function openEditGoalModal(id) {
  const goal = state.sessionData.goals.find(g => g.id === id);
  if (!goal) return;

  document.getElementById('planning-edit-goal-id').value = goal.id;
  document.getElementById('planning-edit-goal-name').value = goal.name;
  document.getElementById('planning-edit-goal-target').value = goal.target_amount;
  document.getElementById('planning-edit-goal-date').value = goal.target_date;
  document.getElementById('planning-edit-goal-funded').value = goal.funded_amount || 0;

  openModal('planning-modal-edit-goal');
}

async function saveGoalEdit() {
  const id = parseInt(document.getElementById('planning-edit-goal-id').value);
  const changes = {
    name: document.getElementById('planning-edit-goal-name').value,
    target_amount: parseFloat(document.getElementById('planning-edit-goal-target').value),
    target_date: document.getElementById('planning-edit-goal-date').value,
    funded_amount: parseFloat(document.getElementById('planning-edit-goal-funded').value)
  };

  recordUndoSnapshot();
  const result = await planningApi.updateSessionGoal(id, changes);
  if (result.ok) {
    closeModal('planning-modal-edit-goal');
    await loadSessionData();
  } else {
    showError(result.error.message);
  }
}

function handleDeleteGoal(id) {
  state.pendingDelete = { type: 'goal', id };
  document.getElementById('planning-confirm-delete-message').textContent =
    'Are you sure you want to delete this goal from the planning session?';
  openModal('planning-modal-confirm-delete');
}

// Delete Confirmation
async function confirmDelete() {
  if (!state.pendingDelete) return;

  const { type, id } = state.pendingDelete;
  let result;

  recordUndoSnapshot();
  switch(type) {
    case 'account': result = await planningApi.deleteSessionAccount(id); break;
    case 'income': result = await planningApi.deleteSessionIncomeSource(id); break;
    case 'category': result = await planningApi.deleteSessionCategory(id); break;
    case 'expense': result = await planningApi.deleteSessionPlannedExpense(id); break;
    case 'goal': result = await planningApi.deleteSessionGoal(id); break;
  }

  if (result && result.ok) {
    closeModal('planning-modal-confirm-delete');
    state.pendingDelete = null;
    await loadSessionData();
  } else if (result) {
    showError(result.error.message);
  }
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  initializePlanningPage
};
