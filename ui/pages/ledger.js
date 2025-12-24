/**
 * Clarity Finance - Ledger Page
 * 
 * UI logic for the Ledger page including:
 * - Date range selector (5 years forward/back)
 * - Quick-add bar for transactions
 * - Transaction table with inline dropdown editing
 * - Edit/delete modals
 * - Ctrl+Z undo support
 * 
 * See docs/modules/ledger.md and END_STATE_VISION.md for specification.
 */

const { ipcRenderer } = require('electron');

// ============================================================
// State
// ============================================================

const ledgerState = {
  transactions: [],
  accounts: [],
  buckets: [],
  categories: [],
  incomeSources: [],
  startDate: null,
  endDate: null,
  undoStack: [],
  activeDropdown: null
};

// Maximum undo history
const MAX_UNDO_STACK = 20;

// ============================================================
// IPC Bridge
// ============================================================

const ledgerApi = {
  async createTransaction(data) {
    return await ipcRenderer.invoke('ledger:createTransaction', data);
  },
  async updateTransaction(id, changes) {
    return await ipcRenderer.invoke('ledger:updateTransaction', id, changes);
  },
  async deleteTransaction(id) {
    return await ipcRenderer.invoke('ledger:deleteTransaction', id);
  },
  async listTransactionsByDateRange(startDate, endDate) {
    return await ipcRenderer.invoke('ledger:listTransactionsByDateRange', startDate, endDate);
  },
  async getAccounts() {
    return await ipcRenderer.invoke('ledger:getAccounts');
  },
  async getBuckets() {
    return await ipcRenderer.invoke('ledger:getBuckets');
  },
  async getCategories() {
    return await ipcRenderer.invoke('ledger:getCategories');
  },
  async getCategoriesByBucket(bucketId) {
    return await ipcRenderer.invoke('ledger:getCategoriesByBucket', bucketId);
  },
  async getIncomeSources() {
    return await ipcRenderer.invoke('ledger:getIncomeSources');
  }
};

// ============================================================
// Date Helpers
// ============================================================

/**
 * Gets the default date range (current month).
 */
function getDefaultDateRange() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    start: formatDateForInput(startDate),
    end: formatDateForInput(endDate)
  };
}

/**
 * Formats a date for input[type="date"].
 */
function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Formats a date for display.
 */
function formatDateForDisplay(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Gets today's date as YYYY-MM-DD.
 */
function getTodayString() {
  return formatDateForInput(new Date());
}

/**
 * Calculates the min/max dates (5 years forward/back).
 */
function getDateBounds() {
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 5, 0, 1);
  const maxDate = new Date(now.getFullYear() + 5, 11, 31);
  
  return {
    min: formatDateForInput(minDate),
    max: formatDateForInput(maxDate)
  };
}

// ============================================================
// Currency Formatting
// ============================================================

/**
 * Formats a number as currency.
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// ============================================================
// Data Loading
// ============================================================

/**
 * Loads all supporting data (accounts, buckets, categories, income sources).
 */
async function loadSupportingData() {
  const [accountsResult, bucketsResult, categoriesResult, incomeSourcesResult] = await Promise.all([
    ledgerApi.getAccounts(),
    ledgerApi.getBuckets(),
    ledgerApi.getCategories(),
    ledgerApi.getIncomeSources()
  ]);
  
  if (accountsResult.ok) ledgerState.accounts = accountsResult.data;
  if (bucketsResult.ok) ledgerState.buckets = bucketsResult.data;
  if (categoriesResult.ok) ledgerState.categories = categoriesResult.data;
  if (incomeSourcesResult.ok) ledgerState.incomeSources = incomeSourcesResult.data;
}

/**
 * Loads transactions for the current date range.
 */
async function loadTransactions() {
  const result = await ledgerApi.listTransactionsByDateRange(
    ledgerState.startDate,
    ledgerState.endDate
  );
  
  if (result.ok) {
    ledgerState.transactions = result.data;
    renderTransactionTable();
    updateTransactionCount();
  } else {
    showError('Failed to load transactions: ' + result.error.message);
  }
}

// ============================================================
// Quick Add Bar
// ============================================================

/**
 * Sets up the quick add bar functionality.
 */
function setupQuickAddBar() {
  const quickAddBar = document.getElementById('ledger-quick-add');
  if (!quickAddBar) return;
  
  const typeSelect = quickAddBar.querySelector('[name="type"]');
  const bucketSelect = quickAddBar.querySelector('[name="bucket_id"]');
  const categorySelect = quickAddBar.querySelector('[name="category_id"]');
  const submitBtn = quickAddBar.querySelector('.quick-add-submit');
  
  // Update visibility based on type
  typeSelect.addEventListener('change', () => {
    const isExpense = typeSelect.value === 'expense';
    quickAddBar.setAttribute('data-type', typeSelect.value);
    
    // Clear bucket/category if switching to income
    if (!isExpense) {
      bucketSelect.value = '';
      categorySelect.value = '';
      categorySelect.innerHTML = '<option value="">Select category...</option>';
    }
  });
  
  // Update categories when bucket changes
  bucketSelect.addEventListener('change', async () => {
    const bucketId = parseInt(bucketSelect.value, 10);
    categorySelect.innerHTML = '<option value="">Select category...</option>';
    
    if (bucketId) {
      const result = await ledgerApi.getCategoriesByBucket(bucketId);
      if (result.ok) {
        result.data.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          categorySelect.appendChild(option);
        });
      }
    }
  });
  
  // Handle submit
  submitBtn.addEventListener('click', () => handleQuickAddSubmit());
  
  // Handle Enter key in any field
  quickAddBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickAddSubmit();
    }
  });
  
  // Populate dropdowns
  populateQuickAddDropdowns();
}

/**
 * Populates the quick add dropdowns with data.
 */
function populateQuickAddDropdowns() {
  const quickAddBar = document.getElementById('ledger-quick-add');
  if (!quickAddBar) return;
  
  const bucketSelect = quickAddBar.querySelector('[name="bucket_id"]');
  const accountSelect = quickAddBar.querySelector('[name="account_id"]');
  
  // Populate buckets (exclude goals bucket for regular expenses)
  bucketSelect.innerHTML = '<option value="">Select bucket...</option>';
  ledgerState.buckets.forEach(bucket => {
    if (bucket.bucket_key !== 'goals') {
      const option = document.createElement('option');
      option.value = bucket.id;
      option.textContent = bucket.name;
      bucketSelect.appendChild(option);
    }
  });
  
  // Populate accounts
  accountSelect.innerHTML = '<option value="">Select account...</option>';
  ledgerState.accounts.forEach(account => {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = `${account.bank_name} (${account.account_type})`;
    accountSelect.appendChild(option);
  });
  
  // Set default date to today
  const dateInput = quickAddBar.querySelector('[name="date"]');
  if (dateInput) {
    dateInput.value = getTodayString();
  }
}

/**
 * Handles quick add form submission.
 */
async function handleQuickAddSubmit() {
  const quickAddBar = document.getElementById('ledger-quick-add');
  if (!quickAddBar) return;
  
  const type = quickAddBar.querySelector('[name="type"]').value;
  const bucketId = quickAddBar.querySelector('[name="bucket_id"]').value;
  const categoryId = quickAddBar.querySelector('[name="category_id"]').value;
  const description = quickAddBar.querySelector('[name="description"]').value.trim();
  const amount = parseFloat(quickAddBar.querySelector('[name="amount"]').value);
  const date = quickAddBar.querySelector('[name="date"]').value;
  const accountId = quickAddBar.querySelector('[name="account_id"]').value;
  
  // Validate
  if (!type || !date || !accountId || isNaN(amount) || amount <= 0) {
    showError('Please fill in all required fields with valid values.');
    return;
  }
  
  if (type === 'expense' && (!bucketId || !categoryId)) {
    showError('Expense transactions require a bucket and category.');
    return;
  }
  
  // Build transaction data
  const transactionData = {
    type,
    date,
    amount,
    account_id: parseInt(accountId, 10)
  };
  
  if (description) {
    transactionData.description = description;
  }
  
  if (type === 'expense') {
    transactionData.bucket_id = parseInt(bucketId, 10);
    transactionData.category_id = parseInt(categoryId, 10);
  }
  
  // Create transaction
  const result = await ledgerApi.createTransaction(transactionData);
  
  if (result.ok) {
    // Add to undo stack
    addToUndoStack({
      type: 'create',
      transaction: result.data
    });
    
    // Clear form
    clearQuickAddForm();
    
    // Reload if within date range
    if (date >= ledgerState.startDate && date <= ledgerState.endDate) {
      await loadTransactions();
    }
    
    // Focus first field
    quickAddBar.querySelector('[name="type"]').focus();
  } else {
    showError('Failed to create transaction: ' + result.error.message);
  }
}

/**
 * Clears the quick add form.
 */
function clearQuickAddForm() {
  const quickAddBar = document.getElementById('ledger-quick-add');
  if (!quickAddBar) return;
  
  quickAddBar.querySelector('[name="type"]').value = 'expense';
  quickAddBar.querySelector('[name="bucket_id"]').value = '';
  quickAddBar.querySelector('[name="category_id"]').innerHTML = '<option value="">Select category...</option>';
  quickAddBar.querySelector('[name="description"]').value = '';
  quickAddBar.querySelector('[name="amount"]').value = '';
  quickAddBar.querySelector('[name="date"]').value = getTodayString();
  quickAddBar.querySelector('[name="account_id"]').value = '';
  quickAddBar.setAttribute('data-type', 'expense');
}

// ============================================================
// Transaction Table Rendering
// ============================================================

/**
 * Renders the transaction table.
 */
function renderTransactionTable() {
  const tbody = document.getElementById('ledger-table-body');
  if (!tbody) return;
  
  if (ledgerState.transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">
          <div class="ledger-empty">
            <svg class="ledger-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <div class="ledger-empty-title">No transactions found</div>
            <div class="ledger-empty-text">
              Add your first transaction using the quick add bar above, or adjust the date range.
            </div>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = ledgerState.transactions.map(transaction => {
    const account = ledgerState.accounts.find(a => a.id === transaction.account_id);
    const bucket = ledgerState.buckets.find(b => b.id === transaction.bucket_id);
    const category = ledgerState.categories.find(c => c.id === transaction.category_id);
    
    return `
      <tr data-id="${transaction.id}">
        <td class="col-date">
          ${renderInlineDateCell(transaction)}
        </td>
        <td class="col-type">
          <span class="type-badge type-${transaction.type}">${transaction.type}</span>
        </td>
        <td class="col-description">${escapeHtml(transaction.description || '—')}</td>
        <td class="col-category">
          ${transaction.type === 'expense' 
            ? renderInlineDropdownCell(transaction, 'category_id', category?.name || '—', 'category')
            : '<span class="text-muted">—</span>'
          }
        </td>
        <td class="col-bucket">
          ${transaction.type === 'expense'
            ? renderInlineDropdownCell(transaction, 'bucket_id', bucket?.name || '—', 'bucket')
            : '<span class="text-muted">—</span>'
          }
        </td>
        <td class="col-amount">
          <span class="amount-${transaction.type}">
            ${transaction.type === 'expense' ? '-' : '+'}${formatCurrency(transaction.amount)}
          </span>
        </td>
        <td class="col-account">
          ${renderInlineDropdownCell(transaction, 'account_id', account?.bank_name || '—', 'account')}
        </td>
        <td class="col-actions">
          <button class="btn-icon" data-action="edit" data-id="${transaction.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon btn-icon-danger" data-action="delete" data-id="${transaction.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Attach event listeners
  attachTableEventListeners();
}

/**
 * Renders an inline date cell.
 */
function renderInlineDateCell(transaction) {
  const bounds = getDateBounds();
  return `
    <div class="inline-date-cell" data-id="${transaction.id}" data-field="date">
      <input type="date" 
             value="${transaction.date}" 
             min="${bounds.min}" 
             max="${bounds.max}"
             data-id="${transaction.id}">
      <div class="inline-date-display">
        <span>${formatDateForDisplay(transaction.date)}</span>
        <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
    </div>
  `;
}

/**
 * Renders an inline dropdown cell.
 */
function renderInlineDropdownCell(transaction, field, displayValue, dropdownType) {
  const isEmpty = !displayValue || displayValue === '—';
  return `
    <div class="inline-dropdown-cell" data-id="${transaction.id}" data-field="${field}" data-dropdown-type="${dropdownType}">
      <div class="inline-dropdown-trigger">
        <span class="inline-dropdown-value ${isEmpty ? 'empty' : ''}">${escapeHtml(displayValue)}</span>
        <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div class="inline-dropdown-menu"></div>
    </div>
  `;
}

/**
 * Updates the transaction count display.
 */
function updateTransactionCount() {
  const countEl = document.getElementById('ledger-transaction-count');
  if (countEl) {
    const count = ledgerState.transactions.length;
    countEl.innerHTML = `<strong>${count}</strong> transaction${count !== 1 ? 's' : ''}`;
  }
}

// ============================================================
// Inline Dropdown Logic
// ============================================================

/**
 * Opens an inline dropdown.
 */
function openInlineDropdown(cell) {
  // Close any other open dropdown
  closeAllDropdowns();
  
  const transactionId = parseInt(cell.dataset.id, 10);
  const field = cell.dataset.field;
  const dropdownType = cell.dataset.dropdownType;
  const menu = cell.querySelector('.inline-dropdown-menu');
  const transaction = ledgerState.transactions.find(t => t.id === transactionId);
  
  if (!transaction || !menu) return;
  
  // Populate the dropdown menu
  let options = [];
  
  if (dropdownType === 'account') {
    options = ledgerState.accounts.map(a => ({
      value: a.id,
      label: `${a.bank_name} (${a.account_type})`,
      selected: a.id === transaction.account_id
    }));
  } else if (dropdownType === 'bucket') {
    options = ledgerState.buckets
      .filter(b => b.bucket_key !== 'goals')
      .map(b => ({
        value: b.id,
        label: b.name,
        selected: b.id === transaction.bucket_id
      }));
  } else if (dropdownType === 'category') {
    // Group categories by bucket
    const bucketId = transaction.bucket_id;
    const categoriesInBucket = ledgerState.categories.filter(c => c.bucket_id === bucketId);
    
    if (categoriesInBucket.length === 0) {
      options = [{ value: '', label: 'No categories in this bucket', disabled: true }];
    } else {
      options = categoriesInBucket.map(c => ({
        value: c.id,
        label: c.name,
        selected: c.id === transaction.category_id
      }));
    }
  }
  
  menu.innerHTML = options.map(opt => `
    <div class="inline-dropdown-option ${opt.selected ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}" 
         data-value="${opt.value}"
         ${opt.disabled ? 'data-disabled="true"' : ''}>
      ${escapeHtml(opt.label)}
    </div>
  `).join('');
  
  // Attach click listeners to options
  menu.querySelectorAll('.inline-dropdown-option:not([data-disabled])').forEach(option => {
    option.addEventListener('click', async (e) => {
      e.stopPropagation();
      const newValue = parseInt(option.dataset.value, 10);
      await handleInlineDropdownChange(transactionId, field, newValue, dropdownType);
      closeAllDropdowns();
    });
  });
  
  cell.classList.add('active');
  ledgerState.activeDropdown = cell;
}

/**
 * Closes all open dropdowns.
 */
function closeAllDropdowns() {
  document.querySelectorAll('.inline-dropdown-cell.active').forEach(cell => {
    cell.classList.remove('active');
  });
  ledgerState.activeDropdown = null;
}

/**
 * Handles inline dropdown value change.
 */
async function handleInlineDropdownChange(transactionId, field, newValue, dropdownType) {
  const transaction = ledgerState.transactions.find(t => t.id === transactionId);
  if (!transaction) return;
  
  const oldValue = transaction[field];
  if (oldValue === newValue) return;
  
  // Build changes object
  const changes = { [field]: newValue };
  
  // If changing bucket, we need to clear category (it may no longer be valid)
  if (field === 'bucket_id') {
    changes.category_id = null;
  }
  
  // Store old state for undo
  const oldTransaction = { ...transaction };
  
  // Update via API
  const result = await ledgerApi.updateTransaction(transactionId, changes);
  
  if (result.ok) {
    // Add to undo stack
    addToUndoStack({
      type: 'update',
      transactionId,
      oldData: oldTransaction,
      newData: result.data
    });
    
    // Reload transactions
    await loadTransactions();
  } else {
    showError('Failed to update transaction: ' + result.error.message);
  }
}

// ============================================================
// Inline Date Editing
// ============================================================

/**
 * Sets up inline date editing.
 */
function setupInlineDateEditing() {
  const tbody = document.getElementById('ledger-table-body');
  if (!tbody) return;
  
  tbody.addEventListener('change', async (e) => {
    if (e.target.type === 'date' && e.target.closest('.inline-date-cell')) {
      const transactionId = parseInt(e.target.dataset.id, 10);
      const newDate = e.target.value;
      
      const transaction = ledgerState.transactions.find(t => t.id === transactionId);
      if (!transaction || transaction.date === newDate) return;
      
      const oldTransaction = { ...transaction };
      
      const result = await ledgerApi.updateTransaction(transactionId, { date: newDate });
      
      if (result.ok) {
        addToUndoStack({
          type: 'update',
          transactionId,
          oldData: oldTransaction,
          newData: result.data
        });
        
        await loadTransactions();
      } else {
        showError('Failed to update date: ' + result.error.message);
        e.target.value = transaction.date; // Revert
      }
    }
  });
}

// ============================================================
// Table Event Listeners
// ============================================================

/**
 * Attaches event listeners to the transaction table.
 */
function attachTableEventListeners() {
  const tbody = document.getElementById('ledger-table-body');
  if (!tbody) return;
  
  // Use event delegation
  tbody.addEventListener('click', async (e) => {
    const target = e.target;
    
    // Handle inline dropdown clicks
    const dropdownCell = target.closest('.inline-dropdown-cell');
    if (dropdownCell && !target.closest('.inline-dropdown-menu')) {
      e.stopPropagation();
      if (dropdownCell.classList.contains('active')) {
        closeAllDropdowns();
      } else {
        openInlineDropdown(dropdownCell);
      }
      return;
    }
    
    // Handle edit button
    const editBtn = target.closest('[data-action="edit"]');
    if (editBtn) {
      const id = parseInt(editBtn.dataset.id, 10);
      openEditModal(id);
      return;
    }
    
    // Handle delete button
    const deleteBtn = target.closest('[data-action="delete"]');
    if (deleteBtn) {
      const id = parseInt(deleteBtn.dataset.id, 10);
      openDeleteConfirmation(id);
      return;
    }
  });
}

// ============================================================
// Edit Modal
// ============================================================

/**
 * Opens the edit transaction modal.
 */
function openEditModal(transactionId) {
  const transaction = ledgerState.transactions.find(t => t.id === transactionId);
  if (!transaction) return;
  
  const modal = document.getElementById('modal-edit-transaction');
  if (!modal) return;
  
  // Populate form
  modal.querySelector('[name="id"]').value = transaction.id;
  modal.querySelector('[name="type"]').value = transaction.type;
  modal.querySelector('[name="date"]').value = transaction.date;
  modal.querySelector('[name="description"]').value = transaction.description || '';
  modal.querySelector('[name="amount"]').value = transaction.amount;
  modal.querySelector('[name="account_id"]').value = transaction.account_id;
  
  // Populate account dropdown
  const accountSelect = modal.querySelector('[name="account_id"]');
  accountSelect.innerHTML = ledgerState.accounts.map(a => 
    `<option value="${a.id}" ${a.id === transaction.account_id ? 'selected' : ''}>
      ${escapeHtml(a.bank_name)} (${a.account_type})
    </option>`
  ).join('');
  
  // Handle type-specific fields
  const isExpense = transaction.type === 'expense';
  const expenseFields = modal.querySelector('.expense-fields');
  if (expenseFields) {
    expenseFields.style.display = isExpense ? 'block' : 'none';
  }
  
  if (isExpense) {
    // Populate bucket dropdown
    const bucketSelect = modal.querySelector('[name="bucket_id"]');
    bucketSelect.innerHTML = ledgerState.buckets
      .filter(b => b.bucket_key !== 'goals')
      .map(b => 
        `<option value="${b.id}" ${b.id === transaction.bucket_id ? 'selected' : ''}>
          ${escapeHtml(b.name)}
        </option>`
      ).join('');
    
    // Populate category dropdown based on bucket
    populateEditModalCategories(transaction.bucket_id, transaction.category_id);
    
    // Handle bucket change
    bucketSelect.onchange = () => {
      const bucketId = parseInt(bucketSelect.value, 10);
      populateEditModalCategories(bucketId, null);
    };
  }
  
  // Show modal
  modal.classList.add('active');
  modal.querySelector('[name="description"]').focus();
}

/**
 * Populates categories in the edit modal based on selected bucket.
 */
function populateEditModalCategories(bucketId, selectedCategoryId) {
  const modal = document.getElementById('modal-edit-transaction');
  if (!modal) return;
  
  const categorySelect = modal.querySelector('[name="category_id"]');
  const categoriesInBucket = ledgerState.categories.filter(c => c.bucket_id === bucketId);
  
  categorySelect.innerHTML = categoriesInBucket.map(c => 
    `<option value="${c.id}" ${c.id === selectedCategoryId ? 'selected' : ''}>
      ${escapeHtml(c.name)}
    </option>`
  ).join('');
  
  if (categoriesInBucket.length === 0) {
    categorySelect.innerHTML = '<option value="">No categories in this bucket</option>';
  }
}

/**
 * Handles edit modal save.
 */
async function handleEditModalSave() {
  const modal = document.getElementById('modal-edit-transaction');
  if (!modal) return;
  
  const transactionId = parseInt(modal.querySelector('[name="id"]').value, 10);
  const transaction = ledgerState.transactions.find(t => t.id === transactionId);
  if (!transaction) return;
  
  const type = modal.querySelector('[name="type"]').value;
  const date = modal.querySelector('[name="date"]').value;
  const description = modal.querySelector('[name="description"]').value.trim();
  const amount = parseFloat(modal.querySelector('[name="amount"]').value);
  const accountId = parseInt(modal.querySelector('[name="account_id"]').value, 10);
  
  // Validate
  if (!date || isNaN(amount) || amount <= 0 || !accountId) {
    showError('Please fill in all required fields with valid values.');
    return;
  }
  
  const changes = {
    date,
    amount,
    account_id: accountId
  };
  
  // Handle description (can be empty)
  if (description !== (transaction.description || '')) {
    changes.description = description || null;
  }
  
  if (type === 'expense') {
    const bucketId = parseInt(modal.querySelector('[name="bucket_id"]').value, 10);
    const categoryId = parseInt(modal.querySelector('[name="category_id"]').value, 10);
    
    if (!bucketId || !categoryId) {
      showError('Expense transactions require a bucket and category.');
      return;
    }
    
    changes.bucket_id = bucketId;
    changes.category_id = categoryId;
  }
  
  const oldTransaction = { ...transaction };
  const result = await ledgerApi.updateTransaction(transactionId, changes);
  
  if (result.ok) {
    addToUndoStack({
      type: 'update',
      transactionId,
      oldData: oldTransaction,
      newData: result.data
    });
    
    closeModal('modal-edit-transaction');
    await loadTransactions();
  } else {
    showError('Failed to update transaction: ' + result.error.message);
  }
}

// ============================================================
// Delete Confirmation
// ============================================================

/**
 * Opens the delete confirmation modal.
 */
function openDeleteConfirmation(transactionId) {
  const modal = document.getElementById('modal-confirm-delete');
  if (!modal) return;
  
  modal.dataset.transactionId = transactionId;
  modal.classList.add('active');
}

/**
 * Handles delete confirmation.
 */
async function handleDeleteConfirm() {
  const modal = document.getElementById('modal-confirm-delete');
  if (!modal) return;
  
  const transactionId = parseInt(modal.dataset.transactionId, 10);
  const transaction = ledgerState.transactions.find(t => t.id === transactionId);
  if (!transaction) return;
  
  const result = await ledgerApi.deleteTransaction(transactionId);
  
  if (result.ok) {
    addToUndoStack({
      type: 'delete',
      transaction: { ...transaction }
    });
    
    closeModal('modal-confirm-delete');
    await loadTransactions();
  } else {
    showError('Failed to delete transaction: ' + result.error.message);
  }
}

// ============================================================
// Undo System
// ============================================================

/**
 * Adds an action to the undo stack.
 */
function addToUndoStack(action) {
  ledgerState.undoStack.push(action);
  
  // Limit stack size
  if (ledgerState.undoStack.length > MAX_UNDO_STACK) {
    ledgerState.undoStack.shift();
  }
}

/**
 * Undoes the last action.
 */
async function undoLastAction() {
  if (ledgerState.undoStack.length === 0) return;
  
  const action = ledgerState.undoStack.pop();
  
  try {
    if (action.type === 'create') {
      // Undo create = delete the transaction
      await ledgerApi.deleteTransaction(action.transaction.id);
      showUndoToast('Transaction creation undone');
    } else if (action.type === 'update') {
      // Undo update = restore old values
      const restoreData = {};
      for (const key of Object.keys(action.newData)) {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'is_deleted') {
          restoreData[key] = action.oldData[key];
        }
      }
      await ledgerApi.updateTransaction(action.transactionId, restoreData);
      showUndoToast('Transaction update undone');
    } else if (action.type === 'delete') {
      // Undo delete = recreate the transaction
      const { id, created_at, updated_at, is_deleted, ...transactionData } = action.transaction;
      await ledgerApi.createTransaction(transactionData);
      showUndoToast('Transaction restored');
    }
    
    await loadTransactions();
  } catch (error) {
    showError('Failed to undo: ' + error.message);
  }
}

/**
 * Shows the undo toast notification.
 */
function showUndoToast(message) {
  const toast = document.getElementById('undo-toast');
  if (!toast) return;
  
  toast.querySelector('.undo-toast-message').textContent = message;
  toast.classList.add('visible');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 5000);
}

// ============================================================
// Date Range Controls
// ============================================================

/**
 * Sets up date range controls.
 */
function setupDateRangeControls() {
  const startInput = document.getElementById('ledger-start-date');
  const endInput = document.getElementById('ledger-end-date');
  
  if (!startInput || !endInput) return;
  
  const bounds = getDateBounds();
  startInput.min = bounds.min;
  startInput.max = bounds.max;
  endInput.min = bounds.min;
  endInput.max = bounds.max;
  
  // Set initial values
  const defaultRange = getDefaultDateRange();
  startInput.value = defaultRange.start;
  endInput.value = defaultRange.end;
  ledgerState.startDate = defaultRange.start;
  ledgerState.endDate = defaultRange.end;
  
  // Handle changes
  startInput.addEventListener('change', async () => {
    ledgerState.startDate = startInput.value;
    if (ledgerState.startDate > ledgerState.endDate) {
      ledgerState.endDate = ledgerState.startDate;
      endInput.value = ledgerState.endDate;
    }
    await loadTransactions();
  });
  
  endInput.addEventListener('change', async () => {
    ledgerState.endDate = endInput.value;
    if (ledgerState.endDate < ledgerState.startDate) {
      ledgerState.startDate = ledgerState.endDate;
      startInput.value = ledgerState.startDate;
    }
    await loadTransactions();
  });
}

// ============================================================
// Modal Management
// ============================================================

/**
 * Closes a modal by ID.
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Sets up modal event handlers.
 */
function setupModals() {
  // Edit transaction modal
  const editModal = document.getElementById('modal-edit-transaction');
  if (editModal) {
    // Close button
    editModal.querySelector('.modal-close').addEventListener('click', () => {
      closeModal('modal-edit-transaction');
    });
    
    // Cancel button
    editModal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      closeModal('modal-edit-transaction');
    });
    
    // Save button
    editModal.querySelector('[data-action="save"]').addEventListener('click', () => {
      handleEditModalSave();
    });
    
    // Click on overlay
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) {
        closeModal('modal-edit-transaction');
      }
    });
    
    // Enter key submits
    editModal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.target.matches('textarea')) {
        e.preventDefault();
        handleEditModalSave();
      }
    });
  }
  
  // Delete confirmation modal
  const deleteModal = document.getElementById('modal-confirm-delete');
  if (deleteModal) {
    deleteModal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      closeModal('modal-confirm-delete');
    });
    
    deleteModal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      handleDeleteConfirm();
    });
    
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) {
        closeModal('modal-confirm-delete');
      }
    });
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Escapes HTML special characters.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Shows inline validation error by logging to console only.
 * NO system dialogues - they break input focus in Electron.
 */
function showError(message) {
  console.error('[Ledger]', message);
  // No alert() - just silent validation
}

// ============================================================
// Global Event Listeners
// ============================================================

/**
 * Sets up global event listeners.
 */
function setupGlobalListeners() {
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.inline-dropdown-cell')) {
      closeAllDropdowns();
    }
  });
  
  // Escape key closes dropdowns and modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDropdowns();
    }
    
    // Ctrl+Z for undo
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      undoLastAction();
    }
  });
  
  // Listen for events from main process
  ipcRenderer.on('events:broadcast', (event, eventName, data) => {
    if (eventName === 'ledger:accounts-changed' || 
        eventName === 'ledger:categories-changed' ||
        eventName === 'account:created' ||
        eventName === 'account:updated' ||
        eventName === 'account:deleted' ||
        eventName === 'category:created' ||
        eventName === 'category:updated' ||
        eventName === 'category:deleted') {
      // Reload supporting data and re-render
      loadSupportingData().then(() => {
        populateQuickAddDropdowns();
        renderTransactionTable();
      });
    }
  });
}

// ============================================================
// Add Transaction Button
// ============================================================

/**
 * Sets up the add transaction button (opens modal for new transaction).
 */
function setupAddTransactionButton() {
  const addBtn = document.getElementById('btn-add-transaction');
  if (!addBtn) return;
  
  addBtn.addEventListener('click', () => {
    openAddTransactionModal();
  });
}

/**
 * Opens the add transaction modal.
 */
function openAddTransactionModal() {
  const modal = document.getElementById('modal-edit-transaction');
  if (!modal) return;
  
  // Reset form for new transaction
  modal.querySelector('[name="id"]').value = '';
  modal.querySelector('[name="type"]').value = 'expense';
  modal.querySelector('[name="date"]').value = getTodayString();
  modal.querySelector('[name="description"]').value = '';
  modal.querySelector('[name="amount"]').value = '';
  
  // Populate account dropdown
  const accountSelect = modal.querySelector('[name="account_id"]');
  accountSelect.innerHTML = '<option value="">Select account...</option>' + 
    ledgerState.accounts.map(a => 
      `<option value="${a.id}">${escapeHtml(a.bank_name)} (${a.account_type})</option>`
    ).join('');
  
  // Show expense fields
  const expenseFields = modal.querySelector('.expense-fields');
  if (expenseFields) {
    expenseFields.style.display = 'block';
  }
  
  // Populate bucket dropdown
  const bucketSelect = modal.querySelector('[name="bucket_id"]');
  bucketSelect.innerHTML = '<option value="">Select bucket...</option>' +
    ledgerState.buckets
      .filter(b => b.bucket_key !== 'goals')
      .map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)
      .join('');
  
  // Clear category dropdown
  const categorySelect = modal.querySelector('[name="category_id"]');
  categorySelect.innerHTML = '<option value="">Select category...</option>';
  
  // Handle bucket change
  bucketSelect.onchange = () => {
    const bucketId = parseInt(bucketSelect.value, 10);
    populateEditModalCategories(bucketId, null);
  };
  
  // Handle type change
  const typeSelect = modal.querySelector('[name="type"]');
  typeSelect.onchange = () => {
    const isExpense = typeSelect.value === 'expense';
    if (expenseFields) {
      expenseFields.style.display = isExpense ? 'block' : 'none';
    }
  };
  
  // Update modal title
  modal.querySelector('.modal-title').textContent = 'Add Transaction';
  
  // Update save handler
  modal.querySelector('[data-action="save"]').onclick = async () => {
    await handleAddTransactionFromModal();
  };
  
  modal.classList.add('active');
  modal.querySelector('[name="description"]').focus();
}

/**
 * Handles adding a new transaction from the modal.
 */
async function handleAddTransactionFromModal() {
  const modal = document.getElementById('modal-edit-transaction');
  if (!modal) return;
  
  const type = modal.querySelector('[name="type"]').value;
  const date = modal.querySelector('[name="date"]').value;
  const description = modal.querySelector('[name="description"]').value.trim();
  const amount = parseFloat(modal.querySelector('[name="amount"]').value);
  const accountId = parseInt(modal.querySelector('[name="account_id"]').value, 10);
  
  // Validate
  if (!type || !date || isNaN(amount) || amount <= 0 || !accountId) {
    showError('Please fill in all required fields with valid values.');
    return;
  }
  
  const transactionData = {
    type,
    date,
    amount,
    account_id: accountId
  };
  
  if (description) {
    transactionData.description = description;
  }
  
  if (type === 'expense') {
    const bucketId = parseInt(modal.querySelector('[name="bucket_id"]').value, 10);
    const categoryId = parseInt(modal.querySelector('[name="category_id"]').value, 10);
    
    if (!bucketId || !categoryId) {
      showError('Expense transactions require a bucket and category.');
      return;
    }
    
    transactionData.bucket_id = bucketId;
    transactionData.category_id = categoryId;
  }
  
  const result = await ledgerApi.createTransaction(transactionData);
  
  if (result.ok) {
    addToUndoStack({
      type: 'create',
      transaction: result.data
    });
    
    closeModal('modal-edit-transaction');
    
    // Reload if within date range
    if (date >= ledgerState.startDate && date <= ledgerState.endDate) {
      await loadTransactions();
    }
    
    // Reset save handler back to edit mode
    modal.querySelector('[data-action="save"]').onclick = () => handleEditModalSave();
    modal.querySelector('.modal-title').textContent = 'Edit Transaction';
  } else {
    showError('Failed to create transaction: ' + result.error.message);
  }
}

// ============================================================
// Initialization
// ============================================================

/**
 * Initializes the ledger page.
 */
async function initializeLedgerPage() {
  console.log('[Ledger] Initializing page...');
  
  // Load supporting data first
  await loadSupportingData();
  
  // Set up UI components
  setupDateRangeControls();
  setupMonthRefreshButton();
  setupQuickAddBar();
  setupModals();
  setupAddTransactionButton();
  setupGlobalListeners();
  setupInlineDateEditing();
  
  // Load initial transactions
  await loadTransactions();

  console.log('[Ledger] Page initialized.');
}

async function refreshDateRangeToCurrentMonth() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  ledgerState.startDate = formatDateForInput(startDate);
  ledgerState.endDate = formatDateForInput(endDate);

  const startDateInput = document.getElementById('ledger-start-date');
  const endDateInput = document.getElementById('ledger-end-date');
  if (startDateInput) startDateInput.value = ledgerState.startDate;
  if (endDateInput) endDateInput.value = ledgerState.endDate;

  await loadTransactions();
}

function setupMonthRefreshButton() {
  const refreshButton = document.getElementById('ledger-refresh-month');
  if (!refreshButton) return;
  refreshButton.addEventListener('click', refreshDateRangeToCurrentMonth);
}

/**
 * Reloads ledger data for a specific month.
 * Called when the month selector changes.
 * @param {Date} monthDate - The selected month
 */
async function reloadForMonth(monthDate) {
  console.log('[Ledger] Reloading for month:', monthDate.toISOString().slice(0, 7));

  // Update date range to the selected month
  const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  ledgerState.startDate = formatDateForInput(startDate);
  ledgerState.endDate = formatDateForInput(endDate);

  // Update date range inputs in UI
  const startDateInput = document.getElementById('ledger-start-date');
  const endDateInput = document.getElementById('ledger-end-date');
  if (startDateInput) startDateInput.value = ledgerState.startDate;
  if (endDateInput) endDateInput.value = ledgerState.endDate;

  // Reload transactions
  await loadTransactions();
}

// Export initialization function
module.exports = { initializeLedgerPage, reloadForMonth };
