/**
 * Dashboard Page
 * 
 * Handles all UI logic for the Dashboard page.
 * Uses the Dashboard module via IPC for all data operations.
 * 
 * Features:
 * - Summary banner with budget status
 * - Balance projection chart (projected vs actual)
 * - Budget vs expense bar chart
 * - Goals progress section
 */

const { ipcRenderer } = require('electron');

// ============================================================
// State
// ============================================================

const state = {
  currentMonth: null,
  summaryData: null,
  projectionData: null,
  budgetVsExpenseData: null,
  goalsData: null,
  selectedCategories: new Set(), // For category filter in bar chart
  chartDateRange: {
    start: null,
    end: null
  }
};

// ============================================================
// IPC Bridge
// ============================================================

const dashboard = {
  getBudgetSummary: (month) => ipcRenderer.invoke('dashboard:getBudgetSummary', month),
  getBalanceProjection: (startDate, endDate) => ipcRenderer.invoke('dashboard:getBalanceProjection', startDate, endDate),
  getBudgetVsExpense: (month) => ipcRenderer.invoke('dashboard:getBudgetVsExpense', month),
  getGoalsProgress: () => ipcRenderer.invoke('dashboard:getGoalsProgress'),
  getAccountBalances: () => ipcRenderer.invoke('dashboard:getAccountBalances')
};

// ============================================================
// Utility Functions
// ============================================================

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatCurrencyFull(amount) {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(amount || 0);
}

function formatPercent(value) {
  return `${Math.round(value || 0)}%`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMonth(dateStr) {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange(month) {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

function getBucketColor(bucketKey) {
  const colors = {
    'major_fixed': '#3B82F6',
    'major_variable': '#8B5CF6',
    'minor_fixed': '#10B981',
    'minor_variable': '#F59E0B',
    'goals': '#EC4899'
  };
  return colors[bucketKey] || '#64748B';
}

function getStatusColor(status) {
  const colors = {
    'over': '#EF4444',
    'warning': '#F59E0B',
    'on-track': '#10B981',
    'under': '#3B82F6'
  };
  return colors[status] || '#64748B';
}

// ============================================================
// Data Loading
// ============================================================

async function loadDashboardData(monthString = null) {
  // Use provided month or default to current month
  const month = monthString || getCurrentMonth();
  state.currentMonth = month;
  
  const { startDate, endDate } = getMonthRange(month);
  
  // Update chart date range
  state.chartDateRange = { start: startDate, end: endDate };
  
  try {
    // Load all data in parallel
    const [summaryResult, projectionResult, budgetVsExpenseResult, goalsResult] = await Promise.all([
      dashboard.getBudgetSummary(month),
      dashboard.getBalanceProjection(startDate, endDate),
      dashboard.getBudgetVsExpense(month),
      dashboard.getGoalsProgress()
    ]);
    
    if (summaryResult.ok) {
      state.summaryData = summaryResult.data;
      renderSummaryBanner();
    }
    
    if (projectionResult.ok) {
      state.projectionData = projectionResult.data;
      renderBalanceProjectionChart();
    }
    
    if (budgetVsExpenseResult.ok) {
      state.budgetVsExpenseData = budgetVsExpenseResult.data;
      // Initialize selected categories (all selected by default)
      state.selectedCategories = new Set(
        budgetVsExpenseResult.data.byCategory.map(c => c.id)
      );
      renderBudgetVsExpenseChart();
      renderCategoryFilter();
    }
    
    if (goalsResult.ok) {
      state.goalsData = goalsResult.data;
      renderGoalsProgress();
    }
    
  } catch (error) {
    console.error('[Dashboard] Failed to load data:', error);
  }
}

// ============================================================
// Summary Banner Rendering
// ============================================================

function renderSummaryBanner() {
  const container = document.getElementById('dashboard-summary');
  if (!container || !state.summaryData) return;
  
  const data = state.summaryData;
  
  // Build status items
  const statusItems = [];
  
  // Income status
  const incomeStatus = data.income.actual >= data.income.planned ? 'on-track' : 
                       data.income.percentReceived >= 50 ? 'warning' : 'under';
  statusItems.push({
    label: 'Income',
    planned: data.income.planned,
    actual: data.income.actual,
    status: incomeStatus,
    icon: 'income'
  });
  
  // Overall expense status
  const expenseStatus = data.expenses.actual > data.expenses.planned ? 'over' :
                        data.expenses.percentUsed >= 90 ? 'warning' :
                        data.expenses.percentUsed >= 50 ? 'on-track' : 'under';
  statusItems.push({
    label: 'Total Expenses',
    planned: data.expenses.planned,
    actual: data.expenses.actual,
    status: expenseStatus,
    icon: 'expense'
  });
  
  // Build category status bullets (only show notable ones)
  const notableCategories = data.categoryStatus
    .filter(c => c.status === 'over' || c.status === 'warning' || c.percentUsed > 0)
    .slice(0, 6); // Limit to 6 categories
  
  container.innerHTML = `
    <div class="summary-header">
      <h2 class="summary-title">Financial Summary - ${formatMonth(data.month)}</h2>
      <div class="summary-balance">
        <span class="balance-label">Net Cash Flow:</span>
        <span class="balance-value ${data.netCashFlow >= 0 ? 'positive' : 'negative'}">
          ${data.netCashFlow >= 0 ? '+' : ''}${formatCurrency(data.netCashFlow)}
        </span>
      </div>
    </div>
    
    <div class="summary-grid">
      <div class="summary-section">
        <h3 class="summary-section-title">Overview</h3>
        <ul class="summary-list">
          ${statusItems.map(item => `
            <li class="summary-item">
              <span class="summary-item-icon ${item.icon}">
                ${item.icon === 'income' ? 
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline></svg>' :
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>'
                }
              </span>
              <span class="summary-item-label">${item.label}</span>
              <span class="summary-item-values">
                <span class="actual">${formatCurrency(item.actual)}</span>
                <span class="separator">/</span>
                <span class="planned">${formatCurrency(item.planned)}</span>
              </span>
              <span class="summary-item-status status-${item.status}">${item.status.replace('-', ' ')}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      
      <div class="summary-section">
        <h3 class="summary-section-title">Budget Categories</h3>
        ${notableCategories.length > 0 ? `
          <ul class="summary-list category-list">
            ${notableCategories.map(cat => `
              <li class="summary-item category-item">
                <span class="category-dot" style="background-color: ${getBucketColor(cat.bucketKey)}"></span>
                <span class="summary-item-label">${cat.name}</span>
                <span class="summary-item-values">
                  <span class="actual">${formatCurrency(cat.actual)}</span>
                  <span class="separator">/</span>
                  <span class="planned">${formatCurrency(cat.planned)}</span>
                </span>
                <span class="summary-item-status status-${cat.status}">${formatPercent(cat.percentUsed)}</span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <p class="summary-empty">No budget categories with activity this month.</p>
        `}
      </div>
      
      <div class="summary-section goals-summary">
        <h3 class="summary-section-title">Goals</h3>
        ${data.goals.length > 0 ? `
          <ul class="summary-list goals-list">
            ${data.goals.slice(0, 3).map(goal => `
              <li class="summary-item goal-item">
                <span class="goal-icon ${goal.isComplete ? 'complete' : ''}">
                  ${goal.isComplete ? 
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' :
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
                  }
                </span>
                <span class="summary-item-label">${goal.name}</span>
                <span class="goal-progress-mini">
                  <span class="goal-bar-mini">
                    <span class="goal-fill-mini ${goal.isComplete ? 'complete' : ''}" style="width: ${Math.min(100, goal.percentFunded)}%"></span>
                  </span>
                  <span class="goal-percent">${formatPercent(goal.percentFunded)}</span>
                </span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <p class="summary-empty">No goals set. Add goals in Budget page.</p>
        `}
      </div>
    </div>
  `;
}

// ============================================================
// Balance Projection Chart
// ============================================================

function renderBalanceProjectionChart() {
  const container = document.getElementById('balance-chart-container');
  if (!container || !state.projectionData) return;
  
  const data = state.projectionData;
  const canvas = document.getElementById('balance-chart');
  
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const rect = container.getBoundingClientRect();
  
  // Set canvas size
  canvas.width = rect.width - 40;
  canvas.height = 250;
  
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Get min/max values
  const allValues = [
    ...data.projected.map(d => d.balance),
    ...data.actual.map(d => d.balance)
  ];
  const minValue = Math.min(...allValues) * 0.95;
  const maxValue = Math.max(...allValues) * 1.05;
  const valueRange = maxValue - minValue;
  
  // Helper functions
  const xScale = (index) => padding.left + (index / (data.projected.length - 1)) * chartWidth;
  const yScale = (value) => padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
  
  // Draw grid lines
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  
  // Horizontal grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (i / gridLines) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Y-axis labels
    const value = maxValue - (i / gridLines) * valueRange;
    ctx.fillStyle = '#64748B';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(value), padding.left - 10, y + 4);
  }

  // Draw $0 reference line if chart includes negative values
  if (minValue < 0 && maxValue > 0) {
    const zeroY = yScale(0);
    ctx.strokeStyle = '#DC2626'; // Red for $0 line
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label for $0 line
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('$0', padding.left - 10, zeroY + 4);
  }
  
  // Draw projected line
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  data.projected.forEach((point, i) => {
    const x = xScale(i);
    const y = yScale(point.balance);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  // Draw actual line
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  data.actual.forEach((point, i) => {
    const x = xScale(i);
    const y = yScale(point.balance);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  // Draw X-axis labels (dates)
  ctx.fillStyle = '#64748B';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  
  const labelInterval = Math.ceil(data.projected.length / 7); // Show ~7 labels
  data.projected.forEach((point, i) => {
    if (i % labelInterval === 0 || i === data.projected.length - 1) {
      const x = xScale(i);
      ctx.fillText(formatDate(point.date), x, height - 10);
    }
  });
  
  // Draw legend
  const legendY = padding.top - 5;
  
  // Projected legend
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(padding.left, legendY - 8, 20, 3);
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, legendY - 6);
  ctx.lineTo(padding.left + 20, legendY - 6);
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.fillStyle = '#0F172A';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Projected', padding.left + 25, legendY - 3);
  
  // Actual legend
  const actualLegendX = padding.left + 100;
  ctx.fillStyle = '#10B981';
  ctx.fillRect(actualLegendX, legendY - 8, 20, 3);
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Actual', actualLegendX + 25, legendY - 3);
}

// ============================================================
// Budget vs Expense Chart
// ============================================================

function renderBudgetVsExpenseChart() {
  const container = document.getElementById('budget-expense-chart-container');
  if (!container || !state.budgetVsExpenseData) return;
  
  const canvas = document.getElementById('budget-expense-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const rect = container.getBoundingClientRect();
  
  // Set canvas size
  canvas.width = rect.width - 40;
  canvas.height = 280;
  
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 30, right: 20, bottom: 60, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Filter data by selected categories
  const filteredCategories = state.budgetVsExpenseData.byCategory
    .filter(c => state.selectedCategories.has(c.id));
  
  if (filteredCategories.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No categories selected', width / 2, height / 2);
    return;
  }
  
  // Calculate max value
  const maxValue = Math.max(
    ...filteredCategories.map(c => Math.max(c.planned, c.actual))
  ) * 1.1;
  
  // Bar dimensions
  const groupWidth = chartWidth / filteredCategories.length;
  const barWidth = Math.min(30, groupWidth * 0.35);
  const barGap = 4;
  
  // Draw grid lines
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (i / gridLines) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    
    // Y-axis labels
    const value = maxValue - (i / gridLines) * maxValue;
    ctx.fillStyle = '#64748B';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(value), padding.left - 10, y + 4);
  }
  
  // Draw bars
  filteredCategories.forEach((cat, i) => {
    const groupX = padding.left + i * groupWidth + groupWidth / 2;
    
    // Budget bar
    const budgetHeight = (cat.planned / maxValue) * chartHeight;
    const budgetX = groupX - barWidth - barGap / 2;
    const budgetY = padding.top + chartHeight - budgetHeight;
    
    // Budget bar with gradient
    const budgetGradient = ctx.createLinearGradient(budgetX, budgetY, budgetX, padding.top + chartHeight);
    budgetGradient.addColorStop(0, cat.color);
    budgetGradient.addColorStop(1, adjustColor(cat.color, 0.7));
    ctx.fillStyle = budgetGradient;
    roundedRect(ctx, budgetX, budgetY, barWidth, budgetHeight, 4);
    ctx.fill();
    
    // Actual bar
    const actualHeight = (cat.actual / maxValue) * chartHeight;
    const actualX = groupX + barGap / 2;
    const actualY = padding.top + chartHeight - actualHeight;
    
    // Actual bar (slightly darker)
    const actualGradient = ctx.createLinearGradient(actualX, actualY, actualX, padding.top + chartHeight);
    actualGradient.addColorStop(0, adjustColor(cat.color, 0.8));
    actualGradient.addColorStop(1, adjustColor(cat.color, 0.5));
    ctx.fillStyle = actualGradient;
    roundedRect(ctx, actualX, actualY, barWidth, actualHeight, 4);
    ctx.fill();
    
    // Category label
    ctx.fillStyle = '#0F172A';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    // Truncate long names
    let label = cat.name;
    if (label.length > 12) {
      label = label.substring(0, 10) + '...';
    }
    
    ctx.save();
    ctx.translate(groupX, height - 10);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });
  
  // Draw legend
  const legendY = padding.top - 10;
  
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(padding.left, legendY - 10, 15, 15);
  ctx.fillStyle = '#0F172A';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Budget', padding.left + 20, legendY);
  
  ctx.fillStyle = adjustColor('#3B82F6', 0.7);
  ctx.fillRect(padding.left + 80, legendY - 10, 15, 15);
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Actual', padding.left + 100, legendY);
}

function renderCategoryFilter() {
  const container = document.getElementById('category-filter');
  if (!container || !state.budgetVsExpenseData) return;
  
  const categories = state.budgetVsExpenseData.byCategory;
  
  container.innerHTML = `
    <div class="filter-header">
      <span class="filter-label">Categories:</span>
      <button class="filter-toggle-all" id="toggle-all-categories">
        ${state.selectedCategories.size === categories.length ? 'Deselect All' : 'Select All'}
      </button>
    </div>
    <div class="filter-chips">
      ${categories.map(cat => `
        <button class="filter-chip ${state.selectedCategories.has(cat.id) ? 'active' : ''}" 
                data-category-id="${cat.id}"
                style="--chip-color: ${cat.color}">
          ${cat.name}
        </button>
      `).join('')}
    </div>
  `;
  
  // Add event listeners
  container.querySelector('#toggle-all-categories').addEventListener('click', () => {
    if (state.selectedCategories.size === categories.length) {
      state.selectedCategories.clear();
    } else {
      state.selectedCategories = new Set(categories.map(c => c.id));
    }
    renderCategoryFilter();
    renderBudgetVsExpenseChart();
  });
  
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = parseInt(chip.dataset.categoryId);
      if (state.selectedCategories.has(id)) {
        state.selectedCategories.delete(id);
      } else {
        state.selectedCategories.add(id);
      }
      renderCategoryFilter();
      renderBudgetVsExpenseChart();
    });
  });
}

// ============================================================
// Goals Progress
// ============================================================

function renderGoalsProgress() {
  const container = document.getElementById('goals-progress');
  if (!container) return;
  
  const goals = state.goalsData || [];
  
  if (goals.length === 0) {
    container.innerHTML = `
      <div class="goals-empty">
        <svg class="goals-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
        <p>No goals set yet.</p>
        <p class="goals-empty-hint">Add goals in the Budget page to track your progress here.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = goals.map(goal => `
    <div class="goal-card ${goal.isComplete ? 'complete' : ''}">
      <div class="goal-header">
        <h4 class="goal-name">${goal.name}</h4>
        <span class="goal-target-date">
          Target: ${formatDate(goal.targetDate)}
        </span>
      </div>
      <div class="goal-amounts">
        <span class="goal-funded">${formatCurrencyFull(goal.fundedAmount)}</span>
        <span class="goal-separator">/</span>
        <span class="goal-target">${formatCurrencyFull(goal.targetAmount)}</span>
      </div>
      <div class="goal-progress-bar">
        <div class="goal-progress-fill ${goal.isComplete ? 'complete' : ''}" 
             style="width: ${Math.min(100, goal.percentFunded)}%">
        </div>
      </div>
      <div class="goal-footer">
        <span class="goal-percent">${formatPercent(goal.percentFunded)} funded</span>
        ${goal.isComplete ? 
          '<span class="goal-status complete">✓ Complete!</span>' :
          `<span class="goal-remaining">${formatCurrencyFull(goal.remaining)} to go</span>`
        }
      </div>
    </div>
  `).join('');
}

// ============================================================
// Chart Helper Functions
// ============================================================

function roundedRect(ctx, x, y, width, height, radius) {
  if (height <= 0) return;
  radius = Math.min(radius, height / 2, width / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function adjustColor(hex, factor) {
  // Convert hex to RGB
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  
  // Adjust brightness
  r = Math.round(r * factor);
  g = Math.round(g * factor);
  b = Math.round(b * factor);
  
  // Ensure values are in valid range
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  
  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============================================================
// Date Range Handling
// ============================================================

function setupDateRangeSelectors() {
  const projectionStart = document.getElementById('projection-start-date');
  const projectionEnd = document.getElementById('projection-end-date');
  
  if (projectionStart && projectionEnd) {
    // Set default values
    const { startDate, endDate } = getMonthRange(state.currentMonth || getCurrentMonth());
    projectionStart.value = startDate;
    projectionEnd.value = endDate;
    
    // Add event listeners
    projectionStart.addEventListener('change', updateProjectionDateRange);
    projectionEnd.addEventListener('change', updateProjectionDateRange);
  }
}

async function updateProjectionDateRange() {
  const startDate = document.getElementById('projection-start-date')?.value;
  const endDate = document.getElementById('projection-end-date')?.value;
  
  if (startDate && endDate && startDate <= endDate) {
    state.chartDateRange = { start: startDate, end: endDate };
    
    const result = await dashboard.getBalanceProjection(startDate, endDate);
    if (result.ok) {
      state.projectionData = result.data;
      renderBalanceProjectionChart();
    }
  }
}

// ============================================================
// Event Listeners
// ============================================================

function setupEventListeners() {
  // Listen for data changes from main process
  ipcRenderer.on('events:broadcast', (event, eventName, data) => {
    if (eventName === 'dashboard:data-changed' ||
        eventName === 'transaction:created' ||
        eventName === 'transaction:updated' ||
        eventName === 'transaction:deleted' ||
        eventName === 'goal:updated' ||
        eventName === 'goal:funded') {
      // Reload dashboard data
      loadDashboardData();
    }
  });
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      renderBalanceProjectionChart();
      renderBudgetVsExpenseChart();
    }, 250);
  });
}

// ============================================================
// Initialization
// ============================================================

function initializeDashboardPage() {
  console.log('[Dashboard] Initializing dashboard page...');
  
  // Set current month
  state.currentMonth = getCurrentMonth();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup date range selectors
  setupDateRangeSelectors();
  
  console.log('[Dashboard] Dashboard page initialized.');
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  initializeDashboardPage,
  loadDashboardData,
  renderBalanceProjectionChart,
  renderBudgetVsExpenseChart,
  renderGoalsProgress
};
