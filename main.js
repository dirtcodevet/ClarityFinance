/**
 * Clarity Finance - Main Process
 *
 * Electron entry point. Creates the application window and initializes core systems.
 */

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs").promises;

// Core modules
const db = require("./core/database");
const events = require("./core/events");
const config = require("./core/config");

// Feature modules
const budget = require("./modules/budget");
const ledger = require("./modules/ledger");
const dashboard = require("./modules/dashboard");
const planning = require("./modules/planning");
const dataExport = require("./modules/data-export");

// Main window reference
let mainWindow = null;

/**
 * Creates the main application window.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1024,
    minHeight: 700,
	icon: path.join(__dirname, "assets", "icon.ico"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: "#F8FAFC",
    show: false // Don't show until ready
  });

  // Load the main HTML file
  mainWindow.loadFile(path.join(__dirname, "ui/index.html"));

  // Show window when ready to prevent flicker
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Initializes the application.
 */
async function initializeApp() {
  console.log("[App] Initializing Clarity Finance...");

  // Get database path
  const dbPath = config.getDefaultDbPath();
  console.log("[App] Database path:", dbPath);

  // Initialize database
  const dbResult = await db.initialize(dbPath);
  if (!dbResult.ok) {
    console.error("[App] Failed to initialize database:", dbResult.error);
    app.quit();
    return;
  }

  console.log(
    `[App] Database initialized. ${dbResult.data.migrationsRun} migrations run.`
  );

  // Initialize config (loads values from DB into cache)
  config.initialize(db, events);

  // Enable event debugging in development
  if (process.argv.includes("--dev")) {
    events.setDebugMode(true);
  }

  // Emit ready event
  events.emit("database:initialized", { migrationsRun: dbResult.data.migrationsRun });

  // Initialize feature modules (in dependency order)
  await budget.initialize();
  console.log("[App] Budget module initialized.");

  await ledger.initialize();
  console.log("[App] Ledger module initialized.");

  await dashboard.initialize();
  console.log("[App] Dashboard module initialized.");

  await planning.initialize();
  console.log("[App] Planning module initialized.");

  // Set up event forwarding to renderer
  setupEventForwarding();

  console.log("[App] Initialization complete.");
}

// ============================================================
// Auto Updates (GitHub Releases via electron-updater)
// ============================================================

function setupAutoUpdates() {
  // Optional: reduce noise during development
  const isDev = process.argv.includes("--dev");

  // electron-updater expects a packaged app for real update checks.
  // In dev mode, we can skip to avoid confusing logs.
  if (isDev) {
    console.log("[Updater] Dev mode detected; skipping auto-update checks.");
    return;
  }

  autoUpdater.on("checking-for-update", () => {
    console.log("[Updater] Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("[Updater] Update available:", info && info.version ? info.version : info);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[Updater] No update available.");
  });

  autoUpdater.on("error", (err) => {
    console.error("[Updater] Error:", err);
  });

  autoUpdater.on("update-downloaded", async () => {
    try {
      const result = await dialog.showMessageBox({
        type: "info",
        buttons: ["Restart now", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update ready",
        message: "A new version of Clarity Finance has been downloaded. Restart to install it?"
      });

      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    } catch (e) {
      console.error("[Updater] Failed to prompt for restart:", e);
    }
  });

  // Check after the app is up; avoids interfering with startup/DB init.
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 4000);
}

// ============================================================
// IPC Handlers - Bridge between renderer and main process
// ============================================================

// --- Generic Database Operations (for direct queries if needed) ---

ipcMain.handle("db:query", async (event, table, filters, options) => {
  return db.query(table, filters, options);
});

ipcMain.handle("db:getById", async (event, table, id, options) => {
  return db.getById(table, id, options);
});

// --- Config Operations ---

ipcMain.handle("config:get", async (event, key) => {
  return config.get(key);
});

ipcMain.handle("config:set", async (event, key, value) => {
  return config.set(key, value);
});

ipcMain.handle("config:getAll", async () => {
  return config.getAll();
});

// ============================================================
// Budget Module IPC Handlers
// ============================================================

// --- Accounts ---

ipcMain.handle("budget:getAccounts", async () => {
  return budget.getAccounts();
});

ipcMain.handle("budget:createAccount", async (event, data) => {
  return budget.createAccount(data);
});

ipcMain.handle("budget:updateAccount", async (event, id, changes) => {
  return budget.updateAccount(id, changes);
});

ipcMain.handle("budget:deleteAccount", async (event, id) => {
  return budget.deleteAccount(id);
});

// --- Income Sources ---

ipcMain.handle("budget:getIncomeSources", async () => {
  return budget.getIncomeSources();
});

ipcMain.handle("budget:createIncomeSource", async (event, data) => {
  return budget.createIncomeSource(data);
});

ipcMain.handle("budget:updateIncomeSource", async (event, id, changes) => {
  return budget.updateIncomeSource(id, changes);
});

ipcMain.handle("budget:deleteIncomeSource", async (event, id) => {
  return budget.deleteIncomeSource(id);
});

// --- Buckets ---

ipcMain.handle("budget:getBuckets", async () => {
  return budget.getBuckets();
});

ipcMain.handle("budget:updateBucket", async (event, id, changes) => {
  return budget.updateBucket(id, changes);
});

// --- Categories ---

ipcMain.handle("budget:getCategories", async (event, bucketId) => {
  return budget.getCategories(bucketId);
});

ipcMain.handle("budget:createCategory", async (event, data) => {
  return budget.createCategory(data);
});

ipcMain.handle("budget:updateCategory", async (event, id, changes) => {
  return budget.updateCategory(id, changes);
});

ipcMain.handle("budget:deleteCategory", async (event, id) => {
  return budget.deleteCategory(id);
});

// --- Planned Expenses ---

ipcMain.handle("budget:getPlannedExpenses", async (event, bucketId) => {
  return budget.getPlannedExpenses(bucketId);
});

ipcMain.handle("budget:createPlannedExpense", async (event, data) => {
  return budget.createPlannedExpense(data);
});

ipcMain.handle("budget:updatePlannedExpense", async (event, id, changes) => {
  return budget.updatePlannedExpense(id, changes);
});

ipcMain.handle("budget:deletePlannedExpense", async (event, id) => {
  return budget.deletePlannedExpense(id);
});

// --- Goals ---

ipcMain.handle("budget:getGoals", async () => {
  return budget.getGoals();
});

ipcMain.handle("budget:createGoal", async (event, data) => {
  return budget.createGoal(data);
});

ipcMain.handle("budget:updateGoal", async (event, id, changes) => {
  return budget.updateGoal(id, changes);
});

ipcMain.handle("budget:deleteGoal", async (event, id) => {
  return budget.deleteGoal(id);
});

ipcMain.handle("budget:fundGoal", async (event, id, amount) => {
  return budget.fundGoal(id, amount);
});

// --- Budget Utilities ---

ipcMain.handle("budget:getBucketTotal", async (event, bucketId) => {
  return budget.getBucketTotal(bucketId);
});

ipcMain.handle("budget:getBudgetSummary", async () => {
  return budget.getBudgetSummary();
});

// ============================================================
// Ledger Module IPC Handlers
// ============================================================

ipcMain.handle("ledger:createTransaction", async (event, data) => {
  return ledger.createTransaction(data);
});

ipcMain.handle("ledger:updateTransaction", async (event, id, changes) => {
  return ledger.updateTransaction(id, changes);
});

ipcMain.handle("ledger:deleteTransaction", async (event, id) => {
  return ledger.deleteTransaction(id);
});

ipcMain.handle("ledger:getTransaction", async (event, id) => {
  return ledger.getTransaction(id);
});

ipcMain.handle("ledger:listTransactions", async (event, filters, options) => {
  return ledger.listTransactions(filters, options);
});

ipcMain.handle("ledger:listTransactionsByDateRange", async (event, startDate, endDate, additionalFilters, options) => {
  return ledger.listTransactionsByDateRange(startDate, endDate, additionalFilters, options);
});

ipcMain.handle("ledger:getAccounts", async () => {
  return ledger.getAccounts();
});

ipcMain.handle("ledger:getBuckets", async () => {
  return ledger.getBuckets();
});

ipcMain.handle("ledger:getCategories", async () => {
  return ledger.getCategories();
});

ipcMain.handle("ledger:getCategoriesByBucket", async (event, bucketId) => {
  return ledger.getCategoriesByBucket(bucketId);
});

ipcMain.handle("ledger:getIncomeSources", async () => {
  return ledger.getIncomeSources();
});

// ============================================================
// Dashboard Module IPC Handlers
// ============================================================

ipcMain.handle("dashboard:getBudgetSummary", async (event, month) => {
  return dashboard.getBudgetSummary(month);
});

ipcMain.handle("dashboard:getBalanceProjection", async (event, startDate, endDate) => {
  return dashboard.getBalanceProjection(startDate, endDate);
});

ipcMain.handle("dashboard:getBudgetVsExpense", async (event, month) => {
  return dashboard.getBudgetVsExpense(month);
});

ipcMain.handle("dashboard:getGoalsProgress", async () => {
  return dashboard.getGoalsProgress();
});

ipcMain.handle("dashboard:getAccountBalances", async () => {
  return dashboard.getAccountBalances();
});

// ============================================================
// Planning Module IPC Handlers
// ============================================================

// --- Session Management ---

ipcMain.handle("planning:getSessionData", async () => {
  return planning.getSessionData();
});

ipcMain.handle("planning:loadCurrentBudgetData", async () => {
  return planning.loadCurrentBudgetData();
});

ipcMain.handle("planning:resetSession", async () => {
  return planning.resetSession();
});

// --- Session Modifications - Accounts ---

ipcMain.handle("planning:updateSessionAccount", async (event, id, changes) => {
  return planning.updateSessionAccount(id, changes);
});

ipcMain.handle("planning:createSessionAccount", async (event, data) => {
  return planning.createSessionAccount(data);
});

ipcMain.handle("planning:deleteSessionAccount", async (event, id) => {
  return planning.deleteSessionAccount(id);
});

// --- Session Modifications - Income Sources ---

ipcMain.handle("planning:updateSessionIncomeSource", async (event, id, changes) => {
  return planning.updateSessionIncomeSource(id, changes);
});

ipcMain.handle("planning:createSessionIncomeSource", async (event, data) => {
  return planning.createSessionIncomeSource(data);
});

ipcMain.handle("planning:deleteSessionIncomeSource", async (event, id) => {
  return planning.deleteSessionIncomeSource(id);
});

// --- Session Modifications - Categories ---

ipcMain.handle("planning:updateSessionCategory", async (event, id, changes) => {
  return planning.updateSessionCategory(id, changes);
});

ipcMain.handle("planning:createSessionCategory", async (event, data) => {
  return planning.createSessionCategory(data);
});

ipcMain.handle("planning:deleteSessionCategory", async (event, id) => {
  return planning.deleteSessionCategory(id);
});

// --- Session Modifications - Planned Expenses ---

ipcMain.handle("planning:updateSessionPlannedExpense", async (event, id, changes) => {
  return planning.updateSessionPlannedExpense(id, changes);
});

ipcMain.handle("planning:createSessionPlannedExpense", async (event, data) => {
  return planning.createSessionPlannedExpense(data);
});

ipcMain.handle("planning:deleteSessionPlannedExpense", async (event, id) => {
  return planning.deleteSessionPlannedExpense(id);
});

// --- Session Modifications - Goals ---

ipcMain.handle("planning:updateSessionGoal", async (event, id, changes) => {
  return planning.updateSessionGoal(id, changes);
});

ipcMain.handle("planning:createSessionGoal", async (event, data) => {
  return planning.createSessionGoal(data);
});

ipcMain.handle("planning:deleteSessionGoal", async (event, id) => {
  return planning.deleteSessionGoal(id);
});

// --- Calculations ---

ipcMain.handle("planning:calculateBalanceProjection", async (event, startDate, endDate) => {
  return planning.calculateBalanceProjection(startDate, endDate);
});

ipcMain.handle("planning:generateInsights", async () => {
  return planning.generateInsights();
});

// --- Scenario Persistence ---

ipcMain.handle("planning:saveScenario", async (event, name) => {
  return planning.saveScenario(name);
});

ipcMain.handle("planning:getScenarios", async () => {
  return planning.getScenarios();
});

ipcMain.handle("planning:loadScenario", async (event, id) => {
  return planning.loadScenario(id);
});

ipcMain.handle("planning:deleteScenario", async (event, id) => {
  return planning.deleteScenario(id);
});

// ============================================================
// Data Export/Import IPC Handlers
// ============================================================

ipcMain.handle("data:export", async () => {
  return dataExport.exportAllData();
});

ipcMain.handle("data:validate", async (event, backupData) => {
  return dataExport.validateBackup(backupData);
});

ipcMain.handle("data:import", async (event, backupData) => {
  return dataExport.importData(backupData);
});

ipcMain.handle("data:saveToFolder", async () => {
  return dataExport.saveToFolder();
});

// ============================================================
// File Dialog IPC Handlers
// ============================================================

ipcMain.handle("dialog:showSaveDialog", async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle("dialog:showOpenDialog", async (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle("fs:writeFile", async (event, filePath, data) => {
  try {
    await fs.writeFile(filePath, data, "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("fs:readFile", async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// ============================================================
// Event Forwarding
// ============================================================

function setupEventForwarding() {
  const catalogedEvents = [
    // Account events
    "account:created", "account:updated", "account:deleted",
    // Income source events
    "income-source:created", "income-source:updated", "income-source:deleted",
    // Bucket events
    "bucket:updated",
    // Category events
    "category:created", "category:updated", "category:deleted",
    // Planned expense events
    "planned-expense:created", "planned-expense:updated", "planned-expense:deleted",
    // Goal events
    "goal:created", "goal:updated", "goal:deleted", "goal:funded",
    // Transaction events
    "transaction:created", "transaction:updated", "transaction:deleted",
    // Ledger module events
    "ledger:accounts-changed", "ledger:categories-changed",
    // Dashboard module events
    "dashboard:data-changed",
    // Planning module events
    "planning:data-loaded", "planning:scenario-saved", "planning:scenario-loaded", "planning:reset",
    // Data export/import events
    "data:exported", "data:imported",
    // Config events
    "config:changed",
    // UI events
    "page:changed", "modal:opened", "modal:closed"
  ];

  catalogedEvents.forEach((eventName) => {
    events.on(eventName, (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("events:broadcast", eventName, data);
      }
    });
  });
}

// Allow renderer to emit events
ipcMain.on("events:emit", (event, eventName, data) => {
  events.emit(eventName, data);
});

// ============================================================
// App Lifecycle
// ============================================================

app.whenReady().then(async () => {
  await initializeApp();
  createWindow();
  setupAutoUpdates();

  app.on("activate", () => {
    // macOS: recreate window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // Close database connection
  db.close();

  // Quit on all platforms except macOS
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  db.close();
});
