// ui/pages/data.js
// Data page UI logic - Tips & Tricks, Backup/Restore

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// State
const state = {
  expandedPanel: null
};

/**
 * Initialize the Data page
 */
async function initialize() {
  renderTipsAccordion();
  setupAccordion();
  setupBackupButton();
  setupImportButton();
}

/**
 * Render the Tips & Tricks accordion HTML
 */
function renderTipsAccordion() {
  const tipsContent = document.getElementById('tips-content');
  if (!tipsContent) return;

  tipsContent.innerHTML = `
    <div class="tips-accordion">
      <div class="tip-panel" data-panel="getting-started">
        <div class="tip-header" data-action="toggle-panel">
          <h4 class="tip-title">Getting Started</h4>
          <svg class="tip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="tip-content">
          <ul class="tip-list">
            <li>Start by setting up your <strong>Accounts</strong> on the Budget page with starting balances</li>
            <li>Add your <strong>Income Sources</strong> with pay dates and amounts</li>
            <li>Create <strong>Categories</strong> and assign them to appropriate buckets (Major Fixed, Major Variable, etc.)</li>
            <li>Set up <strong>Planned Expenses</strong> within each bucket with due dates</li>
            <li>Create <strong>Goals</strong> for savings targets and non-standard expenses</li>
            <li>Record actual transactions in the <strong>Ledger</strong> as they occur</li>
          </ul>
        </div>
      </div>
      <div class="tip-panel" data-panel="ledger">
        <div class="tip-header" data-action="toggle-panel">
          <h4 class="tip-title">Using the Ledger</h4>
          <svg class="tip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="tip-content">
          <ul class="tip-list">
            <li>Use the <strong>Quick-Add Bar</strong> at the top to rapidly enter transactions</li>
            <li>Click the <strong>+ button</strong> to submit a transaction</li>
            <li>Click on <strong>Account, Bucket, or Category</strong> cells to edit inline with dropdowns</li>
            <li>Click on the <strong>Date</strong> cell to open a calendar picker</li>
            <li>Click the <strong>trash icon</strong> to delete a transaction</li>
            <li>Use the date range selector to view transactions from different time periods</li>
            <li><em>Keyboard shortcuts (Enter, Ctrl+Z) coming in Phase X</em></li>
          </ul>
        </div>
      </div>
      <div class="tip-panel" data-panel="planning">
        <div class="tip-header" data-action="toggle-panel">
          <h4 class="tip-title">Planning Your Budget</h4>
          <svg class="tip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="tip-content">
          <ul class="tip-list">
            <li>The <strong>Planning page</strong> is a sandbox - changes here never affect your Budget or Ledger</li>
            <li>Experiment with "what-if" scenarios by adding/removing income or expenses</li>
            <li>Watch the <strong>Balance Projection Chart</strong> update as you make changes</li>
            <li>Read the <strong>Insights</strong> at the bottom for AI-style financial advice</li>
            <li>Click <strong>Refresh</strong> to reload your current budget data and start over</li>
            <li>Click <strong>Save Scenario</strong> to preserve interesting "what-if" scenarios for future reference</li>
          </ul>
        </div>
      </div>
      <div class="tip-panel" data-panel="keyboard">
        <div class="tip-header" data-action="toggle-panel">
          <h4 class="tip-title">Keyboard Shortcuts</h4>
          <svg class="tip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="tip-content">
          <p style="margin-bottom: 1rem; color: var(--text-secondary); font-style: italic;">
            <strong>Note:</strong> Comprehensive keyboard shortcuts are planned for Phase X (Polish & Deploy).
            Currently, standard browser shortcuts work (copy/paste, select all, etc.).
          </p>
          <table class="shortcuts-table">
            <thead><tr><th>Action</th><th>Shortcut</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Copy</td><td><kbd>Ctrl</kbd> + <kbd>C</kbd></td><td>✓ Works</td></tr>
              <tr><td>Paste</td><td><kbd>Ctrl</kbd> + <kbd>V</kbd></td><td>✓ Works</td></tr>
              <tr><td>Select All</td><td><kbd>Ctrl</kbd> + <kbd>A</kbd></td><td>✓ Works</td></tr>
              <tr><td>Save</td><td><kbd>Ctrl</kbd> + <kbd>S</kbd></td><td>Phase X</td></tr>
              <tr><td>Undo</td><td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td><td>Phase X</td></tr>
              <tr><td>Submit form</td><td><kbd>Enter</kbd></td><td>Phase X</td></tr>
              <tr><td>Close modal</td><td><kbd>Escape</kbd></td><td>Phase X</td></tr>
              <tr><td>Navigate fields</td><td><kbd>Tab</kbd></td><td>Phase X</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="tip-panel" data-panel="best-practices">
        <div class="tip-header" data-action="toggle-panel">
          <h4 class="tip-title">Best Practices</h4>
          <svg class="tip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="tip-content">
          <ul class="tip-list">
            <li><strong>Backup regularly:</strong> Export your data weekly or monthly to avoid data loss</li>
            <li><strong>Record transactions promptly:</strong> Enter transactions as they occur for accurate tracking</li>
            <li><strong>Review the Dashboard:</strong> Check weekly to see how actual spending compares to planned</li>
            <li><strong>Use buckets wisely:</strong> Major Fixed = rent/mortgage, Major Variable = groceries, Minor Fixed = subscriptions, Minor Variable = entertainment</li>
            <li><strong>Set realistic goals:</strong> Break large savings goals into monthly contributions</li>
            <li><strong>Plan ahead:</strong> Use the Planning page to model major life changes before committing</li>
            <li><strong>Keep categories simple:</strong> Too many categories makes tracking difficult - aim for 10-15 total</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup accordion functionality for Tips & Tricks
 */
function setupAccordion() {
  const accordion = document.querySelector('.tips-accordion');
  if (!accordion) return;

  // Event delegation for accordion headers
  accordion.addEventListener('click', (e) => {
    const header = e.target.closest('.tip-header');
    if (!header) return;

    const panel = header.parentElement;
    const panelName = panel.dataset.panel;

    // Toggle panel
    if (state.expandedPanel === panelName) {
      // Close currently open panel
      panel.classList.remove('expanded');
      state.expandedPanel = null;
    } else {
      // Close any open panel
      if (state.expandedPanel) {
        const openPanel = accordion.querySelector(`[data-panel="${state.expandedPanel}"]`);
        if (openPanel) {
          openPanel.classList.remove('expanded');
        }
      }

      // Open clicked panel
      panel.classList.add('expanded');
      state.expandedPanel = panelName;
    }
  });
}

/**
 * Setup Backup button functionality
 */
function setupBackupButton() {
  const backupBtn = document.getElementById('data-backup-btn');
  if (!backupBtn) return;

  backupBtn.addEventListener('click', async () => {
    try {
      // Disable button during export
      backupBtn.disabled = true;
      backupBtn.textContent = 'Exporting...';

      // Call IPC to export data
      const result = await ipcRenderer.invoke('data:export');

      if (!result.ok) {
        showError(`Export failed: ${result.error.message}`);
        backupBtn.disabled = false;
        backupBtn.innerHTML = `
          <svg class="btn-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export Backup
        `;
        return;
      }

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/:/g, '-').split('.')[0];
      const filename = `clarity-finance-backup-${timestamp}.json`;

      // Show save dialog via IPC
      const saveDialogResult = await ipcRenderer.invoke('dialog:showSaveDialog', {
        title: 'Save Backup File',
        defaultPath: filename,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (saveDialogResult.canceled || !saveDialogResult.filePath) {
        // User cancelled
        backupBtn.disabled = false;
        backupBtn.innerHTML = `
          <svg class="btn-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export Backup
        `;
        return;
      }

      // Write file via IPC (pretty-printed JSON)
      const jsonContent = JSON.stringify(result.data, null, 2);
      const writeResult = await ipcRenderer.invoke('fs:writeFile', saveDialogResult.filePath, jsonContent);

      if (!writeResult.ok) {
        showError(`Failed to write file: ${writeResult.error}`);
        backupBtn.disabled = false;
        backupBtn.innerHTML = `
          <svg class="btn-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export Backup
        `;
        return;
      }

      // Show success message (extract just filename from path)
      const fileName = saveDialogResult.filePath.split(/[\\/]/).pop();
      showSuccess(`Backup saved successfully to ${fileName}`);

      // Re-enable button
      backupBtn.disabled = false;
      backupBtn.innerHTML = `
        <svg class="btn-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Export Backup
      `;

    } catch (error) {
      console.error('Backup error:', error);
      showError(`Backup failed: ${error.message}`);
      backupBtn.disabled = false;
      backupBtn.innerHTML = `
        <svg class="btn-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Export Backup
      `;
    }
  });
}

/**
 * Setup Import button functionality
 */
function setupImportButton() {
  const importBtn = document.getElementById('data-import-btn');

  if (!importBtn) return;

  // Click import button triggers file dialog
  importBtn.addEventListener('click', async () => {
    try {
      // Show open file dialog via IPC
      const openDialogResult = await ipcRenderer.invoke('dialog:showOpenDialog', {
        title: 'Select Backup File',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (openDialogResult.canceled || !openDialogResult.filePaths || openDialogResult.filePaths.length === 0) {
        // User cancelled
        return;
      }

      const filePath = openDialogResult.filePaths[0];

      // Read file contents via IPC
      const readResult = await ipcRenderer.invoke('fs:readFile', filePath);

      if (!readResult.ok) {
        showError(`Failed to read file: ${readResult.error}`);
        return;
      }

      let backupData;

      try {
        backupData = JSON.parse(readResult.data);
      } catch (parseError) {
        showError('Invalid backup file: Not valid JSON');
        return;
      }

      // Validate backup
      const validationResult = await ipcRenderer.invoke('data:validate', backupData);

      if (!validationResult.ok) {
        const errors = validationResult.error.details || [];
        const errorList = errors.length > 0
          ? `\n\nErrors:\n- ${errors.join('\n- ')}`
          : '';
        showError(`Invalid backup file: ${validationResult.error.message}${errorList}`);
        return;
      }

      // Show confirmation modal
      const confirmed = await showConfirmationModal(
        'Import Backup',
        `This will overwrite ALL existing data with the backup from ${backupData.exportDate}.\n\nThis action cannot be undone. Make sure you have a current backup before proceeding.\n\nDo you want to continue?`
      );

      if (!confirmed) {
        return;
      }

      // Disable import button
      importBtn.disabled = true;
      importBtn.textContent = 'Importing...';

      // Perform import
      const importResult = await ipcRenderer.invoke('data:import', backupData);

      if (!importResult.ok) {
        showError(`Import failed: ${importResult.error.message}`);
        importBtn.disabled = false;
        importBtn.innerHTML = `
          <svg class="btn-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Import Backup
        `;
        fileInput.value = ''; // Reset file input
        return;
      }

      // Show success message
      const { imported, skipped, errors } = importResult.data;
      let message = `Import successful! ${imported} records imported.`;
      if (skipped > 0) {
        message += ` ${skipped} records skipped.`;
      }
      if (errors > 0) {
        message += ` ${errors} errors occurred.`;
      }

      showSuccess(message);

      // Re-enable button
      importBtn.disabled = false;
      importBtn.innerHTML = `
        <svg class="btn-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Import Backup
      `;

      // Reset file input
      fileInput.value = '';

      // Reload the page to reflect imported data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
      showError(`Import failed: ${error.message}`);
      importBtn.disabled = false;
      importBtn.innerHTML = `
        <svg class="btn-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Import Backup
      `;
      fileInput.value = ''; // Reset file input
    }
  });
}

/**
 * Show confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - True if confirmed, false if cancelled
 */
function showConfirmationModal(title, message) {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.dataset.modal = 'confirm-import';

    overlay.innerHTML = `
      <div class="modal modal-small">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
          <p class="confirm-message" style="white-space: pre-line;">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="cancel">No, Cancel</button>
          <button class="btn btn-danger" data-action="confirm">Yes, Import</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Handle button clicks
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="confirm"]')) {
        overlay.remove();
        resolve(true);
      } else if (e.target.closest('[data-action="cancel"]') || e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });

    // Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        resolve(false);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

/**
 * Show success toast message
 * @param {string} message - Success message
 */
function showSuccess(message) {
  showToast(message, 'success');
}

/**
 * Show error toast message
 * @param {string} message - Error message
 */
function showError(message) {
  showToast(message, 'error');
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, info)
 */
function showToast(message, type = 'info') {
  // Remove any existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Export for app.js to call
module.exports = {
  initialize
};
