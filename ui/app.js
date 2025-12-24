/**
 * Clarity Finance - UI Application
 * 
 * Main application shell for the renderer process.
 * Handles navigation, modals, and loads page components.
 */

const { ipcRenderer } = require('electron');

// Page modules
const budgetPage = require('./pages/budget');
const ledgerPage = require('./pages/ledger');
const dashboardPage = require('./pages/dashboard');
const planningPage = require('./pages/planning');
const dataPage = require('./pages/data');

// ============================================================
// State
// ============================================================

const state = {
  currentPage: 'dashboard',
  currentMonth: new Date(),
  userName: 'User',
  pageInitialized: {
    dashboard: false,
    ledger: false,
    budget: false,
    planning: false,
    data: false
  }
};

// ============================================================
// Config Bridge
// ============================================================

const config = {
  async get(key) {
    return await ipcRenderer.invoke('config:get', key);
  },
  async set(key, value) {
    return await ipcRenderer.invoke('config:set', key, value);
  }
};

// ============================================================
// DOM Elements
// ============================================================

const elements = {
  userName: document.getElementById('userName'),
  pageTitle: document.getElementById('pageTitle'),
  currentMonth: document.getElementById('currentMonth'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  saveBtn: document.getElementById('saveBtn'),
  editNameBtn: document.getElementById('editNameBtn'),
  editNameModal: document.getElementById('modal-edit-name'),
  newUserNameInput: document.getElementById('newUserName'),
  navItems: document.querySelectorAll('.nav-item'),
  pages: document.querySelectorAll('.page')
};

// ============================================================
// Navigation
// ============================================================

async function navigateTo(pageName) {
  const previousPage = state.currentPage;
  state.currentPage = pageName;
  
  elements.navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });
  
  elements.pages.forEach(page => {
    page.classList.toggle('active', page.id === `page-${pageName}`);
  });
  
  const titles = {
    dashboard: 'Dashboard',
    ledger: 'Ledger',
    budget: 'Budget',
    planning: 'Planning',
    data: 'Data'
  };
  elements.pageTitle.textContent = titles[pageName] || pageName;
  
  // Initialize and load page data
  if (pageName === 'dashboard') {
    if (!state.pageInitialized.dashboard) {
      dashboardPage.initializeDashboardPage();
      state.pageInitialized.dashboard = true;
    }
    const monthString = state.currentMonth.toISOString().slice(0, 7);
    dashboardPage.loadDashboardData(monthString);
  } else if (pageName === 'budget') {
    const monthString = state.currentMonth.toISOString().slice(0, 7);
    budgetPage.setCurrentMonth(monthString);
    budgetPage.loadBudgetData(monthString);
  } else if (pageName === 'ledger') {
    if (!state.pageInitialized.ledger) {
      await ledgerPage.initializeLedgerPage();
      state.pageInitialized.ledger = true;
    }
  } else if (pageName === 'planning') {
    if (!state.pageInitialized.planning) {
      await planningPage.initializePlanningPage();
      state.pageInitialized.planning = true;
    }
  } else if (pageName === 'data') {
    if (!state.pageInitialized.data) {
      await dataPage.initialize();
      state.pageInitialized.data = true;
    }
  }
  
  // Emit navigation event
  ipcRenderer.send('events:emit', 'page:changed', { 
    page: pageName, 
    previousPage: previousPage 
  });
}

// ============================================================
// Month Selector
// ============================================================

function formatMonth(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

async function updateMonthDisplay() {
  elements.currentMonth.textContent = formatMonth(state.currentMonth);
  const monthString = state.currentMonth.toISOString().slice(0, 7);
  await config.set('currentMonth', monthString);

  // Emit month change event
  ipcRenderer.send('events:emit', 'month:changed', {
    month: monthString,
    date: state.currentMonth.toISOString()
  });

  // Reload current page data
  budgetPage.setCurrentMonth(monthString);
  reloadCurrentPage();
}

function prevMonth() {
  state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
  updateMonthDisplay();
}

function nextMonth() {
  state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
  updateMonthDisplay();
}

/**
 * Reloads the current page's data after month change.
 */
function reloadCurrentPage() {
  const page = state.currentPage;
  const monthString = state.currentMonth.toISOString().slice(0, 7);

  if (page === 'ledger' && state.pageInitialized.ledger) {
    // Ledger date range is user-controlled; use refresh button to realign.
  } else if (page === 'budget') {
    budgetPage.loadBudgetData(monthString);
  } else if (page === 'dashboard' && state.pageInitialized.dashboard) {
    dashboardPage.loadDashboardData(monthString);
  }
  // Planning and Data pages don't need month-based reloading
}

// ============================================================
// Modals
// ============================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
    ipcRenderer.send('events:emit', 'modal:opened', { modalId });
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    ipcRenderer.send('events:emit', 'modal:closed', { modalId, action: 'close' });
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.active').forEach(modal => {
    modal.classList.remove('active');
  });
}

// ============================================================
// User Name
// ============================================================

function openEditNameModal() {
  elements.newUserNameInput.value = state.userName;
  openModal('modal-edit-name');
}

async function saveUserName() {
  const newName = elements.newUserNameInput.value.trim();
  
  if (newName) {
    state.userName = newName;
    elements.userName.textContent = newName;
    await config.set('userName', newName);
  }
  
  closeModal('modal-edit-name');
}

// ============================================================
// Save Button
// ============================================================

async function handleSave() {
  const btn = elements.saveBtn;
  const originalText = btn.innerHTML;

  // Show saving state
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>
    Saving...
  `;
  btn.disabled = true;

  // Call IPC to save to folder
  const result = await ipcRenderer.invoke('data:saveToFolder');

  if (result.ok) {
    // Show success
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Saved!
    `;
    console.log('[App] Data saved to:', result.data.path);
  } else {
    // Show error
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      Error
    `;
    console.error('[App] Save failed:', result.error);
  }

  // Reset button after 1.5 seconds
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }, 1500);
}

// ============================================================
// Event Handling
// ============================================================

function setupEventListeners() {
  // Navigation
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.page);
    });
  });
  
  // Month selector
  elements.prevMonth.addEventListener('click', prevMonth);
  elements.nextMonth.addEventListener('click', nextMonth);
  
  // Edit name
  elements.editNameBtn.addEventListener('click', openEditNameModal);
  
  // Save button
  elements.saveBtn.addEventListener('click', handleSave);
  
  // Edit name modal
  elements.newUserNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveUserName();
  });
  
  // Modal close buttons and overlays
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });
  
  document.querySelectorAll('[data-action="close"], [data-action="cancel"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
    });
  });
  
  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
  
  // Edit name save button
  document.querySelector('#modal-edit-name [data-action="save"]')?.addEventListener('click', saveUserName);
}

function setupEventBridge() {
  // Listen for events from main process
  ipcRenderer.on('events:broadcast', (event, eventName, data) => {
    console.log('[Events] Received:', eventName, data);
    
    // Handle cross-module updates
    if (eventName === 'account:created' || 
        eventName === 'account:updated' || 
        eventName === 'account:deleted' ||
        eventName === 'category:created' ||
        eventName === 'category:updated' ||
        eventName === 'category:deleted') {
      // These events might affect ledger dropdowns if the ledger page is loaded
      // The ledger page has its own event listeners for this
    }
  });
}

// ============================================================
// Undo Toast (for ledger page)
// ============================================================

function setupUndoToast() {
  const toast = document.getElementById('undo-toast');
  if (!toast) return;
  
  const dismissBtn = toast.querySelector('.undo-toast-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      toast.classList.remove('visible');
    });
  }
}

// ============================================================
// Initialization
// ============================================================

async function loadInitialData() {
  // Load user name
  const nameResult = await config.get('userName');
  if (nameResult.ok && nameResult.data) {
    state.userName = nameResult.data;
    elements.userName.textContent = state.userName;
  }

  // Always start at current month (don't load from config)
  const now = new Date();
  state.currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  budgetPage.setCurrentMonth(state.currentMonth.toISOString().slice(0, 7));
  updateMonthDisplay();
}

async function init() {
  console.log('[App] Initializing UI...');
  
  // Set up core event listeners
  setupEventListeners();
  setupEventBridge();
  setupUndoToast();
  
  // Load initial data
  await loadInitialData();
  
  // Initialize budget page module (it sets up its own event listeners)
  budgetPage.initializeBudgetPage();
  
  // Initialize and load dashboard (default page)
  dashboardPage.initializeDashboardPage();
  state.pageInitialized.dashboard = true;
  const monthString = state.currentMonth.toISOString().slice(0, 7);
  budgetPage.setCurrentMonth(monthString);
  dashboardPage.loadDashboardData(monthString);

  console.log('[App] UI initialized.');
}

// Start the app
init();

// ============================================================
// Exports (for page modules to access state)
// ============================================================

module.exports = {
  getState: () => state,
  getCurrentMonth: () => state.currentMonth,
  getCurrentMonthString: () => state.currentMonth.toISOString().slice(0, 7)
};
