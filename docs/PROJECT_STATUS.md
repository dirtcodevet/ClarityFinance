# Clarity Finance - Project Status

> **Last Updated:** Phase X Preparation (2024-12-22)
> **Current Phase:** Phase 5 COMPLETE → Phase X Ready to Begin
> **Next Session:** Begin Phase X Part 0 (Critical Bug Fixes)

---

## 📋 SINGLE SOURCE OF TRUTH (SSOT)

**This document is the MASTER CHECKLIST for all phases.**

For complete SSOT hierarchy and conflict resolution rules, see: **[DOCUMENTATION_SSOT.md](./DOCUMENTATION_SSOT.md)**

| Question | Authoritative Document |
|----------|----------------------|
| What should we build? | **END_STATE_VISION.md** |
| Where are we now? What's complete? | **PROJECT_STATUS.md** (this file) |
| What bugs exist? What's broken? | **KNOWN_ISSUES.md** |
| How do I structure code? | **MODULE_GUIDELINES.md, CODE_STANDARDS.md** |
| What did Phase N deliver? | **PHASE[N]_HANDOFF.md** |

**When documents conflict, trust the hierarchy above.**

---

## Quick Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Foundation | ✅ Complete | Core systems built, app runs |
| Phase 1: Budget Module | ✅ Complete | Accounts, income, buckets, categories, goals |
| Phase 2: Ledger Module | ✅ Complete | Transactions with inline editing |
| Phase 3: Dashboard Module | ✅ Complete | Charts, summaries, visualizations |
| Phase 4: Planning Module | ✅ Complete* | What-if sandbox, insights (*UX/keyboard deferred to Phase X) |
| Phase 5: Data Module | ✅ Complete | Backup/restore via IPC, tips & tricks, keyboard shortcuts reference |
| Phase X: Polish & Deploy | 📋 **NEXT** | **CRITICAL: 7 blocking bugs must be fixed first, then UX/keyboard/installer** |

---

## Phase 5 Checklist (COMPLETE)

### Data Module Implementation ✅
- [x] `modules/data-export/service.js` - Export/import/validation logic
- [x] `modules/data-export/index.js` - Public API exports
- [x] IPC handlers in main.js (data:export, data:validate, data:import)
- [x] IPC handlers for file dialogs (dialog:showSaveDialog, dialog:showOpenDialog)
- [x] IPC handlers for file I/O (fs:writeFile, fs:readFile)
- [x] Event forwarding for data:exported and data:imported

### Data Page UI ✅
- [x] `ui/pages/data.js` - Page logic with accordion, export/import
- [x] `ui/styles/data.css` - Data page styling
- [x] Backup button with save dialog (IPC-based)
- [x] Import button with open dialog (IPC-based)
- [x] Toast notifications for success/error feedback
- [x] Confirmation modal before import
- [x] Page reload after successful import

### Tips & Tricks Content ✅
- [x] 5-panel accordion (Getting Started, Ledger, Planning, Keyboard Shortcuts, Best Practices)
- [x] Dynamic HTML rendering in data.js
- [x] Single-panel-open accordion behavior
- [x] Accurate tips (only describe working features)
- [x] Keyboard shortcuts marked as "Phase X" where not implemented
- [x] Helpful budgeting advice

### Documentation ✅
- [x] `docs/PHASE_5_DATA_MODULE.md` - Implementation plan
- [x] `docs/PHASE_5_COMPLETE.md` - Handoff document
- [x] `docs/PHASE_X_POLISH.md` - Critical fixes prioritized first
- [x] `docs/KNOWN_ISSUES.md` - Updated with 8 P1 issues
- [x] `docs/modules/data-export.md` - API documentation
- [x] `docs/PROJECT_STATUS.md` - Updated (this file)

### Technical Decisions ✅
- [x] IPC-based file dialogs (Electron 28+ compatible, no remote module)
- [x] Transaction-based import (atomic all-or-nothing)
- [x] Validation before import
- [x] Pretty-printed JSON backups
- [x] File naming: `clarity-finance-backup-YYYY-MM-DD-HHmmss.json`

### Critical Issues Discovered During Phase 5 Testing ⚠️
Phase 5 testing revealed **7 critical P1 bugs** that MUST be fixed in Phase X Part 0:
- Issue #2: Budget shows starting_balance not current_balance (P1)
- Issue #3: Cannot delete budget items (P1 - BLOCKING)
- Issue #4: Dashboard doesn't baseline from starting_balance (P1)
- Issue #5: Multi-date expenses not summed (P1)
- Issue #6: Month selector doesn't filter data (P1 - BLOCKING)
- Issue #7: No recurring expense support (P1 - CRITICAL FEATURE)
- Issue #8: No flexible pay frequency (P1 - CRITICAL FEATURE)

**Phase X must fix these BEFORE any polish work.**

---

## Phase 4 Checklist (COMPLETE)

### Benchmark 4.1: Service Layer ✅
- [x] `modules/planning/service.js` with async/await
- [x] In-memory session data management
- [x] Deep copy logic for budget data isolation
- [x] CRUD operations for all session entities
- [x] Balance projection calculations
- [x] Financial insights generation
- [x] Scenario save/load to database
- [x] `modules/planning/index.js` with public exports

### Benchmark 4.2: IPC Integration ✅
- [x] IPC handlers in `main.js` for all planning operations
- [x] Session management handlers (get, load, reset)
- [x] CRUD handlers for accounts (create, update, delete)
- [x] CRUD handlers for income sources
- [x] CRUD handlers for categories
- [x] CRUD handlers for planned expenses
- [x] CRUD handlers for goals
- [x] Calculation handlers (projection, insights)
- [x] Scenario persistence handlers (save, load, delete, list)
- [x] Event forwarding for planning events

### Benchmark 4.3: Explanation Box ✅
- [x] Blue gradient background
- [x] Clear description of sandbox concept
- [x] Instructions for use

### Benchmark 4.4: Balance Projection Chart ✅
- [x] High-DPI canvas rendering with devicePixelRatio
- [x] Multi-line chart (one per account)
- [x] Date range selector
- [x] Crisp rendering on all screen densities
- [x] Grid lines and labels

### Benchmark 4.5: Quick-Add Bars ✅
- [x] Accounts quick-add (bank name, type, balance)
- [x] Income quick-add (source, type, amount, account)
- [x] Categories quick-add (name, bucket)
- [x] Goals quick-add (name, target, date)
- [x] Form validation before submission
- [x] Auto-clear on successful creation
- [x] Dropdown population for account/bucket selects

### Benchmark 4.6: Edit Modals ✅
- [x] Edit Account modal
- [x] Edit Income Source modal
- [x] Edit Category modal
- [x] Edit Planned Expense modal
- [x] Edit Goal modal
- [x] Add Planned Expense modal
- [x] Confirm Delete modal with sandbox messaging
- [x] Pre-population with current data
- [x] Save and Cancel buttons

### Benchmark 4.7: Data Cards ✅
- [x] Accounts card with data table
- [x] Income sources card with data table
- [x] Bucket cards (4 standard buckets)
- [x] Categories card with grid display
- [x] Goals card with progress bars
- [x] Edit/Delete actions on all cards
- [x] Color-coded headers

### Benchmark 4.8: Control Buttons ✅
- [x] Refresh button with confirmation
- [x] Save scenario button with name prompt
- [x] Proper button styling and icons

### Benchmark 4.9: Insights Box ✅
- [x] Orange gradient background
- [x] Info icon in header
- [x] Auto-generated insights based on session data
- [x] Budget surplus/deficit warnings
- [x] Savings rate analysis
- [x] Goal funding predictions
- [x] Income-to-expense insights
- [x] Semantic icons (✓, ⚠, •)

### Benchmark 4.10: Full CRUD Functionality ✅
- [x] Create operations for all entity types
- [x] Read/display for all entity types
- [x] Update operations via modals
- [x] Delete operations with confirmation
- [x] Session isolation (never affects real budget)
- [x] Data reload after all changes

### Benchmark 4.11: Styling ✅
- [x] `ui/styles/planning.css` created
- [x] Quick-add bar styles (reused from components.css)
- [x] Card layouts matching Budget page
- [x] Orange gradient insights box
- [x] Responsive grid layouts
- [x] Consistent with UI_PATTERNS.md

### Benchmark 4.12: Documentation ✅
- [x] `docs/modules/planning.md` updated with complete API
- [x] `docs/PHASE_4_COMPLETE.md` created
- [x] `docs/PHASE_5_IMPROVEMENTS.md` created with keyboard plan
- [x] `docs/END_STATE_VISION.md` updated
- [x] `docs/PROJECT_STATUS.md` updated

### Known Issues (Deferred to Phase X)

**Critical UX Issues:**
- [ ] Bucket expenses need instructional text (users confused about where to add expenses)
- [ ] Date selector for planned expenses needs multi-select calendar picker (currently manual text entry)
- [ ] Date format should be MM-DD-YYYY display (currently YYYY-MM-DD text input)
- [ ] Multi-date selection required for expenses due 2-6 times per month

**Keyboard Functionality:**
- [ ] Enter key submit in quick-add bars (Planning page)
- [ ] Tab navigation between fields (Planning page)
- [ ] Ctrl+Z undo support (Planning page)
- [ ] Ctrl+S/Ctrl+R keyboard shortcuts (Planning page)
- [ ] Enter key in modals (Planning page)
- [ ] Cross-page keyboard consistency verification

---

## Phase 3 Checklist (COMPLETE)

### Benchmark 3.1: Service Layer ✅
- [x] `modules/dashboard/service.js` with async/await
- [x] Budget summary aggregation
- [x] Balance projection calculations
- [x] Budget vs expense comparison
- [x] Goals progress data
- [x] Account balances calculation
- [x] Event listeners for data changes
- [x] `modules/dashboard/index.js` with public exports

### Benchmark 3.2: IPC Integration ✅
- [x] IPC handlers in `main.js` for all dashboard operations
- [x] Module initialization in app startup
- [x] Event forwarding for `dashboard:data-changed`
- [x] Proper error handling and result passing

### Benchmark 3.3: Summary Banner ✅
- [x] Full-width overview section
- [x] Net cash flow display (positive/negative)
- [x] Income status (planned vs actual)
- [x] Expense status (planned vs actual)
- [x] Category status list with badges
- [x] Status colors: over, warning, on-track, under
- [x] Goals quick summary with mini progress bars

### Benchmark 3.4: Balance Projection Chart ✅
- [x] Canvas-based line chart
- [x] Projected balance line (dashed blue)
- [x] Actual balance line (solid green)
- [x] Date range selector
- [x] Y-axis with currency labels
- [x] X-axis with date labels
- [x] Legend
- [x] Grid lines

### Benchmark 3.5: Budget vs Expense Chart ✅
- [x] Canvas-based bar chart
- [x] Side-by-side bars for budget vs actual
- [x] Color-coded by bucket
- [x] Gradient fills
- [x] Y-axis with currency labels
- [x] Category labels on X-axis
- [x] Legend

### Benchmark 3.6: Category Filter ✅
- [x] Filter chips for each category
- [x] Toggle individual categories on/off
- [x] Select All / Deselect All button
- [x] Chart updates when filter changes
- [x] Active state styling

### Benchmark 3.7: Goals Progress Section ✅
- [x] Grid layout of goal cards
- [x] Goal name and target date
- [x] Funded amount / Target amount
- [x] Progress bar with gradient fill
- [x] Percentage funded display
- [x] Remaining amount or "Complete" status
- [x] 100% complete turns solid purple
- [x] Empty state when no goals

### Benchmark 3.8: Live Updates ✅
- [x] Dashboard refreshes when transactions change
- [x] Dashboard refreshes when goals change
- [x] Dashboard refreshes when accounts change
- [x] Dashboard refreshes when planned expenses change
- [x] Dashboard refreshes when income sources change

### Benchmark 3.9: Styling ✅
- [x] `ui/styles/dashboard.css` created
- [x] Glass-look cards with shadows
- [x] Gradient progress bars
- [x] Color-coded status badges
- [x] Responsive grid layouts
- [x] Loading state
- [x] Consistent with UI_PATTERNS.md

### Benchmark 3.10: Documentation ✅
- [x] `docs/modules/dashboard.md` updated
- [x] `PHASE3_HANDOFF.md` created
- [x] `PROJECT_STATUS.md` updated
- [x] `EVENT_CATALOG.md` updated

---

## Phase 2 Checklist (COMPLETE)

### Benchmark 2.1: Service Layer âœ…
- [x] `modules/ledger/service.js` with async/await
- [x] Transaction CRUD operations
- [x] Supporting data queries (accounts, buckets, categories)
- [x] Event emission after DB operations
- [x] `modules/ledger/index.js` with public exports

### Benchmark 2.2: IPC Integration âœ…
- [x] IPC handlers in `main.js` for all ledger operations
- [x] Event forwarding to renderer process
- [x] Proper error handling and result passing

### Benchmark 2.3: Date Range Selector âœ…
- [x] Start and end date inputs
- [x] 5 years forward/back limit
- [x] Default to current month
- [x] Automatic reload on change

### Benchmark 2.4: Quick-Add Bar âœ…
- [x] Type toggle (Income/Expense)
- [x] Bucket dropdown (expense only)
- [x] Category dropdown (filtered by bucket)
- [x] Description input
- [x] Amount input with validation
- [x] Date input (defaults to today)
- [x] Account dropdown
- [x] Tab navigation between fields
- [x] Enter key submits

### Benchmark 2.5: Transaction Table âœ…
- [x] All transactions displayed
- [x] Columns: Date, Type, Description, Category, Bucket, Amount, Account, Actions
- [x] Type badges with color coding
- [x] Amount formatted with +/- and color
- [x] Edit and Delete action buttons
- [x] Empty state when no transactions

### Benchmark 2.6: Inline Dropdown Editing âœ…
- [x] Account dropdown in table cell
- [x] Bucket dropdown in table cell
- [x] Category dropdown in table cell (filtered by current bucket)
- [x] Click to open, click option to select
- [x] Click outside to close
- [x] Visual feedback on hover
- [x] Arrow indicator on hover

### Benchmark 2.7: Inline Date Editing âœ…
- [x] Date picker in date column
- [x] Click to open calendar
- [x] Change updates transaction immediately

### Benchmark 2.8: Edit Modal âœ…
- [x] Opens when Edit button clicked
- [x] Pre-populated with transaction data
- [x] Type change shows/hides expense fields
- [x] Bucket change updates category options
- [x] Save and Cancel buttons
- [x] Escape key closes
- [x] Click overlay closes

### Benchmark 2.9: Delete Confirmation âœ…
- [x] Opens when Delete button clicked
- [x] "Are you sure?" message
- [x] Yes/No buttons
- [x] Click overlay closes

### Benchmark 2.10: Undo System âœ…
- [x] Ctrl+Z triggers undo
- [x] Undo create (delete the created transaction)
- [x] Undo update (restore previous values)
- [x] Undo delete (recreate the transaction)
- [x] Undo toast notification
- [x] Stack limited to 20 actions

### Benchmark 2.11: Styling âœ…
- [x] `ui/styles/ledger.css` created
- [x] Inline dropdown styles
- [x] Date picker styles
- [x] Transaction table styles
- [x] Undo toast styles
- [x] Consistent with UI_PATTERNS.md

### Benchmark 2.12: Documentation âœ…
- [x] `docs/modules/ledger.md` updated
- [x] `PHASE2_HANDOFF.md` created
- [x] `PROJECT_STATUS.md` updated

---

## To Run the App

```bash
cd clarity-finance
npm install
npm start
```

Or with dev tools:
```bash
npm start -- --dev
```

---

## Files Created in Phase 3

```
clarity-finance/
├── modules/
│   └── dashboard/
│       ├── index.js          # Public API exports
│       └── service.js        # Data aggregation service
├── ui/
│   ├── index.html           # Updated with dashboard page structure
│   ├── app.js               # Updated to load dashboard page
│   ├── pages/
│   │   └── dashboard.js     # Dashboard page UI logic
│   └── styles/
│       └── dashboard.css    # Dashboard-specific styles
├── docs/
│   └── modules/
│       └── dashboard.md     # Updated documentation
├── main.js                  # Updated with dashboard IPC handlers
├── PHASE3_HANDOFF.md        # Handoff document
├── EVENT_CATALOG.md         # Updated with dashboard events
└── PROJECT_STATUS.md        # This file
```

---

## Files Created in Phase 2

```
clarity-finance/
â”œâ”€â”€ modules/
â”‚   â””â”€â”€ ledger/
â”‚       â”œâ”€â”€ index.js          # Public API exports
â”‚       â””â”€â”€ service.js        # Business logic
â”œâ”€â”€ ui/
â”‚   â”œâ”€â”€ index.html           # Updated with ledger page
â”‚   â”œâ”€â”€ app.js               # Updated to load ledger page
â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â””â”€â”€ ledger.js        # Ledger page UI logic
â”‚   â””â”€â”€ styles/
â”‚       â””â”€â”€ ledger.css       # Ledger-specific styles
â”œâ”€â”€ docs/
â”‚   â””â”€â”€ modules/
â”‚       â””â”€â”€ ledger.md        # Updated documentation
â”œâ”€â”€ main.js                  # Updated with ledger IPC handlers
â”œâ”€â”€ PHASE2_HANDOFF.md        # Handoff document
â””â”€â”€ PROJECT_STATUS.md        # This file
```

---

## Files Created in Phase 4

```
clarity-finance/
├── modules/
│   └── planning/
│       ├── index.js          # Public API exports
│       └── service.js        # Session management & calculations (646 lines)
├── ui/
│   ├── index.html           # Updated with Planning page + 7 modals
│   ├── app.js               # Updated to load planning page
│   ├── pages/
│   │   └── planning.js      # Planning page UI logic (1100+ lines)
│   └── styles/
│       └── planning.css     # Planning-specific styles (550 lines)
├── docs/
│   ├── modules/
│   │   └── planning.md      # Complete documentation with API
│   ├── PHASE_4_COMPLETE.md  # Handoff document
│   ├── PHASE_5_IMPROVEMENTS.md # Keyboard functionality roadmap
│   └── END_STATE_VISION.md  # Updated with Phase 4 status
├── main.js                  # Updated with 30+ planning IPC handlers
└── PROJECT_STATUS.md        # This file
```

---

## Phase X Checklist (📋 READY TO BEGIN)

**⚠️ CRITICAL: Phase X has 3 sequential parts. Part 0 MUST be 100% complete before proceeding to Part 1.**

```
Phase X Structure:
├── Part 0: CRITICAL BUG FIXES (7 bugs) ← DO FIRST, NO EXCEPTIONS
├── Part 1: UX IMPROVEMENTS (Planning page, keyboard, polish)
└── Part 2: DEPLOYMENT (Installer, icons, final QA)
```

---

### Part 0: CRITICAL BUG FIXES (DO FIRST) ⚠️

**Objective:** Fix 7 P1 bugs that render app non-functional for real budgeting
**Duration:** 3-4 sessions (12-16 hours)

#### Micro-Phase 0.1: Fix Month Selector Filtering + Data Carry-Forward
**Priority:** P1 - BLOCKING
**Issue:** #6 - Month selector doesn't filter data + needs intelligent month-to-month persistence
**Files:** `ui/app.js`, `ui/pages/ledger.js`, `ui/pages/budget.js`, `ui/pages/dashboard.js`, `modules/budget/service.js`
**Estimated Effort:** 6-8 hours

**Tasks:**
- [ ] Add month change event emission in `prevMonth()` and `nextMonth()`
- [ ] Create `reloadCurrentPage()` function to trigger data reload
- [ ] Add `reloadForMonth()` function to Ledger page
- [ ] Add month filtering to Budget `loadBudgetData()`
- [ ] Add month change listener to Dashboard page
- [ ] Update Budget service to accept month parameter in queries
- [ ] Implement data carry-forward logic in Budget service:
  - [ ] Check if target month has data
  - [ ] If future month is empty, copy from previous month
  - [ ] If past/current month, show actual data for that month
- [ ] Add helper functions: `isFutureMonth()`, `copyMonthData()`
- [ ] Test: Navigate to November from December - shows November data (not December)
- [ ] Test: Navigate to January from December - if January empty, shows December's data
- [ ] Test: Navigate to January from December - if January has data, shows January's data
- [ ] Test: Month selector filters transactions in Ledger
- [ ] Test: Month selector filters expenses in Budget
- [ ] Test: Dashboard updates for selected month

**Success Criteria:**
1. Month selector immediately filters all page data to selected month
2. Future months with no data auto-populate from previous month
3. Past months show their actual historical data

---

#### Micro-Phase 0.2: Fix Delete Functionality
**Priority:** P1 - BLOCKING
**Issue:** #3 - Cannot delete budget items
**Files:** `ui/pages/budget.js`
**Estimated Effort:** 1 hour

**Tasks:**
- [ ] Extend event listener scope to include modal buttons (Option C: document-level delegation)
- [ ] Test: Delete account button opens confirmation modal
- [ ] Test: Confirm button in modal actually deletes item
- [ ] Test: Delete works for all item types (accounts, income, categories, expenses, goals)
- [ ] Test: UI updates after delete (item removed from display)

**Success Criteria:** Can delete all budget items with confirmation

---

#### Micro-Phase 0.3: Fix Budget Balance Calculation
**Priority:** P1 - CRITICAL
**Issue:** #2 - Budget shows starting_balance not current_balance
**Files:** `ui/pages/budget.js`, `modules/dashboard/service.js`
**Estimated Effort:** 2-3 hours

**Tasks:**
- [ ] Add `loadAccountBalances()` function to Budget page (reuse Dashboard calculation)
- [ ] Modify `loadBudgetData()` to call `loadAccountBalances()` first
- [ ] Merge calculated balances with account data
- [ ] Update `renderAccounts()` to display current_balance
- [ ] Optionally show both starting and current balance
- [ ] Test: Budget shows current balance after transactions
- [ ] Test: Planning page clones correct current balances

**Success Criteria:** Budget shows current_balance = starting_balance + income - expenses

---

#### Micro-Phase 0.4: Fix Dashboard Chart Baseline
**Priority:** P1 - CRITICAL
**Issue:** #4 - Dashboard doesn't baseline from starting_balance
**Files:** `ui/pages/dashboard.js`
**Estimated Effort:** 1-2 hours

**Tasks:**
- [ ] Add $0 reference line to balance projection chart
- [ ] Draw dashed horizontal line at Y=$0 when chart includes negatives
- [ ] Label the $0 line clearly
- [ ] Add starting balance to summary banner
- [ ] Add current balance to summary banner with positive/negative styling
- [ ] Test: Chart shows $0 line when starting balance is negative
- [ ] Test: Baseline clearly represents starting balance

**Success Criteria:** Chart includes $0 reference line for clarity with negative starting balances

---

#### Micro-Phase 0.5: Fix Multi-Date Expense Summing
**Priority:** P1 - CRITICAL
**Issue:** #5 - Multi-date expenses not summed
**Files:** `modules/budget/service.js`, `modules/dashboard/service.js`, `ui/pages/budget.js`
**Estimated Effort:** 3-4 hours

**Tasks:**
- [ ] Update Budget service `getPlannedExpenses()` to calculate monthly totals
- [ ] Parse `due_dates` JSON array for each expense
- [ ] Filter dates within selected month
- [ ] Multiply expense amount × number of occurrences
- [ ] Update Dashboard `getBudgetVsExpense()` to sum multi-date expenses
- [ ] Update Budget UI to show occurrences and monthly total
- [ ] Test: Weekly expense ($10 × 4) shows as $40 monthly total
- [ ] Test: Dashboard charts reflect correct summed amounts

**Success Criteria:** Weekly/bi-weekly expenses summed correctly (4 dates × $10 = $40)

---

#### Micro-Phase 0.6: Add Recurring Expense Support
**Priority:** P1 - CRITICAL FEATURE
**Issue:** #7 - No recurring expense support
**Files:** `migrations/`, `core/schemas.js`, `ui/index.html`, `ui/pages/budget.js`, `modules/budget/service.js`
**Estimated Effort:** 4-5 hours

**Tasks:**
- [ ] Create migration: Add `is_recurring` and `recurrence_end_date` to planned_expenses
- [ ] Update `plannedExpenseSchema` in `core/schemas.js`
- [ ] Add "Recurring monthly" checkbox to Add/Edit Expense modals
- [ ] Add optional "Ends on" date field (shown when recurring checked)
- [ ] Update Budget service `getPlannedExpenses()` to filter recurring by month
- [ ] Add recurring badge to expense list UI
- [ ] Test: Can create recurring monthly expense
- [ ] Test: Recurring expense appears in all future months
- [ ] Test: Recurring expense stops appearing after end date

**Success Criteria:** Can mark rent as recurring monthly, auto-appears in future months

---

#### Micro-Phase 0.7: Add Multi-Date Calendar Selector for Pay Dates
**Priority:** P1 - CRITICAL FEATURE
**Issue:** #8 - Need flexible multi-date calendar picker for income
**Files:** `ui/index.html`, `ui/pages/budget.js`, `ui/styles/budget.css`
**Estimated Effort:** 3-4 hours

**Tasks:**
- [ ] Install/import flatpickr library (if not already available)
- [ ] Add calendar picker button to Income Source modals (Add + Edit)
- [ ] Initialize flatpickr with `mode: 'multiple'` for pay_dates field
- [ ] Configure to allow ANY combination of dates (no pattern restrictions)
- [ ] Store selected dates in existing `pay_dates` JSON field
- [ ] Display selected dates clearly (e.g., "5th, 12th, 19th, 26th")
- [ ] Allow re-opening calendar to edit selected dates
- [ ] Style calendar to match app theme
- [ ] Test: Can select daily schedule (all 30 dates)
- [ ] Test: Can select weekly schedule (4-5 dates)
- [ ] Test: Can select bi-weekly schedule (2 dates)
- [ ] Test: Can select random/irregular dates (any combination)
- [ ] Test: Can select split payment (1st and 15th)
- [ ] Test: Selected dates save and display correctly

**Success Criteria:** Users can freely select ANY combination of pay dates from calendar picker (no pattern restrictions)

---

### ✅ Part 0 Testing Checklist (MUST PASS BEFORE PART 1)

**Month Filtering:**
- [ ] Month selector filters Ledger transactions correctly
- [ ] Month selector filters Budget expenses correctly
- [ ] Month selector updates Dashboard calculations correctly
- [ ] Navigate to past month shows that month's data (not current month)
- [ ] Navigate to future empty month auto-populates from previous month
- [ ] Navigate to future month with data shows that month's data

**Delete Functionality:**
- [ ] Can delete accounts with confirmation
- [ ] Can delete income sources with confirmation
- [ ] Can delete categories with confirmation
- [ ] Can delete planned expenses with confirmation
- [ ] Can delete goals with confirmation
- [ ] UI updates immediately after delete

**Balance Calculations:**
- [ ] Budget shows current balance, not starting_balance
- [ ] Planning clones correct current balances
- [ ] Dashboard chart includes $0 reference line for negatives
- [ ] Starting and current balances clearly labeled

**Multi-Date & Recurring:**
- [ ] Weekly expenses sum correctly (4 dates × $10 = $40)
- [ ] Can create recurring monthly expense
- [ ] Recurring expenses appear in future months
- [ ] Recurring expenses respect end date

**Pay Date Selection:**
- [ ] Calendar picker allows selecting ANY dates freely
- [ ] Can select daily, weekly, bi-weekly, monthly, or random schedules
- [ ] Selected dates save and display correctly
- [ ] Can edit previously selected dates

**🚨 GATE: All checkboxes above MUST be checked before proceeding to Part 1**

---

### Part 1: UX IMPROVEMENTS (After Part 0 Complete)

**Objective:** Polish Planning page, add keyboard functionality, fix remaining UX issues
**Duration:** 2-3 sessions (8-12 hours)

#### Micro-Phase 1.1: Planning Page Instructional Text
**Files:** `ui/index.html`, `ui/styles/planning.css`
**Estimated Effort:** 0.5 hours

**Tasks:**
- [ ] Add instructional text above bucket cards section
- [ ] Explain Planning page is sandbox (doesn't affect Budget)
- [ ] Style with subtle background and readable typography

**Success Criteria:** Clear explanation of sandbox concept on Planning page

---

#### Micro-Phase 1.2: Multi-Date Calendar Picker (flatpickr)
**Files:** `ui/pages/planning.js`, `ui/styles/planning.css`
**Estimated Effort:** 3-4 hours

**Tasks:**
- [ ] Import flatpickr library
- [ ] Initialize flatpickr with `mode: 'multiple'` on expense date fields
- [ ] Configure date format: display MM-DD-YYYY, store YYYY-MM-DD
- [ ] Style calendar to match app theme
- [ ] Test: Can select multiple dates with calendar
- [ ] Test: Selected dates save correctly

**Success Criteria:** Calendar picker allows multi-date selection for expenses

---

#### Micro-Phase 1.3: Keyboard Shortcuts - Planning Page
**Files:** `ui/pages/planning.js`
**Estimated Effort:** 3-4 hours

**Tasks:**
- [ ] Add Enter key submit to all quick-add bars
- [ ] Add Tab navigation between fields
- [ ] Implement undo stack (limit 50 states)
- [ ] Add Ctrl+Z undo functionality
- [ ] Add Ctrl+Shift+Z redo functionality
- [ ] Add Ctrl+S save scenario shortcut
- [ ] Add Ctrl+R refresh session shortcut (with confirmation)
- [ ] Add Enter key submit to edit modals
- [ ] Add Escape key cancel to edit modals

**Success Criteria:** All keyboard shortcuts work on Planning page

---

#### Micro-Phase 1.4: Keyboard Shortcuts - Budget Page
**Files:** `ui/pages/budget.js`
**Estimated Effort:** 2 hours

**Tasks:**
- [ ] Verify Enter key submits quick-add bars
- [ ] Verify Tab navigation is logical
- [ ] Add Ctrl+Z undo if missing (similar to Ledger)
- [ ] Test all shortcuts work correctly

**Success Criteria:** Budget page has consistent keyboard behavior

---

#### Micro-Phase 1.5: Modal Consistency Across All Pages
**Files:** `ui/utils/modal-manager.js`, all page `.js` files
**Estimated Effort:** 2-3 hours

**Tasks:**
- [ ] Create shared `modal-manager.js` utility
- [ ] Implement focus trap in all modals
- [ ] Ensure Escape closes all modals
- [ ] Ensure Enter submits all modals (when valid)
- [ ] Return focus to trigger element on close
- [ ] Test modal behavior on all pages

**Success Criteria:** All modals have consistent Escape, Enter, Tab behavior

---

#### Micro-Phase 1.6: Remove ALL System Dialogues (Issue #1 - CRITICAL)
**Files:** All page `.js` files
**Estimated Effort:** 2-3 hours

**Priority:** P1 - MUST be done in Part 1 (this fixes the input lock bug)

**Tasks:**
- [ ] Search entire codebase for `alert()` and `confirm()` calls: `grep -r "alert(" ui/`
- [ ] Remove ALL system dialogue calls
- [ ] Replace with simple inline validation:
  - [ ] Red border on invalid fields
  - [ ] Small helper text below field (e.g., "Amount required")
  - [ ] NO toast notifications (keep it simple)
- [ ] Update validation logic on all pages:
  - [ ] Ledger quick-add validation
  - [ ] Budget quick-add validation
  - [ ] Planning quick-add validation
  - [ ] All modal validation
- [ ] Test EXTENSIVELY:
  - [ ] Submit empty form on Ledger - no dialogue, inline indicators only
  - [ ] Submit empty form on Budget - no dialogue, inline indicators only
  - [ ] Submit empty form on Planning - no dialogue, inline indicators only
  - [ ] Verify can still type everywhere after validation error
  - [ ] Navigate between pages - verify typing works on all pages
  - [ ] Test multiple validation errors in a row

**Success Criteria:**
1. ZERO `alert()` or `confirm()` calls remain in codebase
2. Can type in all fields after validation error
3. Validation uses only inline visual indicators

---

### ✅ Part 1 Testing Checklist

**Planning Page:**
- [ ] Instructional text visible and clear
- [ ] Calendar picker allows multi-date selection
- [ ] Enter submits all quick-add bars
- [ ] Ctrl+Z undoes Planning changes
- [ ] Ctrl+S saves scenario
- [ ] Ctrl+R refreshes session

**Keyboard Consistency:**
- [ ] Enter submits all forms on all pages
- [ ] Tab navigation logical on all pages
- [ ] Escape closes all modals on all pages
- [ ] Focus trapped in modals (Tab cycles within modal)

**UX Polish:**
- [ ] No `alert()` or `confirm()` calls remain (all removed)
- [ ] Can type everywhere after validation errors (input lock bug fixed)

---

### Part 2: DEPLOYMENT (After Part 1 Complete)

**Objective:** Create professional installer, add icon, prepare for production
**Duration:** 1-2 sessions (4-8 hours)

#### Micro-Phase 2.1: Create Application Icon
**Files:** `build/icon.ico`, `build/icon.png`
**Estimated Effort:** 2 hours

**Tasks:**
- [ ] Design professional 256×256 icon
- [ ] Create .ico format for Windows
- [ ] Create .png format for macOS
- [ ] Test icon displays correctly at multiple sizes

**Success Criteria:** Professional icon created

---

#### Micro-Phase 2.2: Configure electron-builder
**Files:** `package.json`, `electron-builder.yml`
**Estimated Effort:** 1 hour

**Tasks:**
- [ ] Install electron-builder
- [ ] Create `electron-builder.yml` config
- [ ] Set app name, version, icon paths
- [ ] Configure install directory options
- [ ] Add build scripts to package.json

**Success Criteria:** Build configuration complete

---

#### Micro-Phase 2.3: Build Windows Installer
**Estimated Effort:** 1 hour

**Tasks:**
- [ ] Run `npm run build`
- [ ] Verify .exe installer created
- [ ] Check installer size and contents

**Success Criteria:** Functional .exe installer created

---

#### Micro-Phase 2.4: Test Installer
**Estimated Effort:** 2 hours

**Tasks:**
- [ ] Run installer on clean Windows system
- [ ] Verify user can select install directory
- [ ] Verify desktop shortcut created (if selected)
- [ ] Verify Start Menu entry created
- [ ] Launch app from installed location
- [ ] Test all features in installed version
- [ ] Run uninstaller
- [ ] Verify all files and shortcuts removed

**Success Criteria:** Installer works flawlessly

---

#### Micro-Phase 2.5: Create User Documentation
**Files:** `README.md`, `docs/USER_GUIDE.md`
**Estimated Effort:** 2 hours

**Tasks:**
- [ ] Write installation instructions
- [ ] Create "Quick Start" guide
- [ ] Document keyboard shortcuts
- [ ] Add troubleshooting section
- [ ] Include screenshots

**Success Criteria:** User documentation complete

---

#### Micro-Phase 2.6: Final QA Pass
**Estimated Effort:** 2-4 hours

**Tasks:**
- [ ] Test all CRUD operations on all pages
- [ ] Test keyboard navigation on all pages
- [ ] Test all modals
- [ ] Test backup/restore
- [ ] Test undo/redo
- [ ] Test edge cases (empty states, large numbers, long text)
- [ ] Test with various data sizes

**Success Criteria:** All features tested, no regressions

---

### ✅ Part 2 Testing Checklist

**Installer:**
- [ ] Installer runs without errors
- [ ] User can select install directory
- [ ] Desktop shortcut created (if selected)
- [ ] Start Menu entry created
- [ ] App launches from installed location
- [ ] All features work in installed version
- [ ] Uninstaller removes all files and shortcuts

**Documentation:**
- [ ] README includes installation instructions
- [ ] README includes Quick Start guide
- [ ] Keyboard shortcuts documented
- [ ] Troubleshooting section included

**Final QA:**
- [ ] All features tested end-to-end
- [ ] No regressions from previous phases
- [ ] App ready for production use

---

## Phase X Success Criteria

Phase X is complete when ALL of the following are true:

1. ✅ All 7 P1 bugs fixed and tested (Part 0)
2. ❌ Month selector filters data on all pages (still failing)
3. ✅ Delete functionality works on Budget page
4. ✅ Balance calculations correct everywhere
5. ✅ Recurring expenses and flexible pay frequency implemented
6. ✅ Planning page has instructional text and calendar picker
7. ✅ Keyboard shortcuts work on all pages
8. ✅ All modals have consistent behavior
9. ✅ All `alert()` replaced with toasts
10. ✅ Professional installer created with custom icon
11. ✅ User documentation complete
12. ✅ Full QA pass completed with no regressions

**When all criteria met:** Clarity Finance v1.0 is PRODUCTION READY 🎉

---

### Documentation References for Phase X:
- `docs/KNOWN_ISSUES.md` - Detailed bug descriptions and solutions
- `docs/DOCUMENTATION_SSOT.md` - Single source of truth hierarchy
- `docs/PHASE5_HANDOFF.md` - What Phase 5 delivered

---

## Architectural Decisions Made

See DECISIONS.md for full details:

1. **V1 Local-Only** - No cloud sync until Phase 6+
2. **Structured Errors** - All core functions return { ok, data/error }
3. **Zod Validation** - Runtime schema validation
4. **Soft Deletes** - Records never truly deleted
5. **Module Isolation** - No cross-module imports
6. **Tech Stack** - Electron + Vanilla JS + SQLite
7. **Filter Syntax** - Exact operators defined and enforced
8. **Inline Editing** - Dropdowns in table cells for quick edits
9. **Undo Stack** - Limited to 20 actions for memory efficiency

---

## Known Issues (Phase X Part 0 - CRITICAL)

See `KNOWN_ISSUES.md` for full details. **These must be fixed BEFORE polish work:**

| Issue | Priority | Module | Impact |
|-------|----------|--------|--------|
| #6: Month selector doesn't filter | P1 | All pages | BLOCKING - app non-functional for time-based budgeting |
| #3: Cannot delete budget items | P1 | Budget | BLOCKING - users cannot remove mistakes |
| #4: Dashboard balance baseline wrong | P1 | Dashboard | CRITICAL - charts show wrong data |
| #5: Multi-date expenses not summed | P1 | Budget/Dashboard | CRITICAL - budget totals completely wrong |
| #7: No recurring expense support | P1 | Budget | CRITICAL FEATURE - must manually re-enter rent monthly |
| #8: No flexible pay frequency | P1 | Budget | CRITICAL FEATURE - income projections wrong |
| #2: Budget shows starting_balance | P1 | Budget | CRITICAL - Planning clones wrong balances |
| #1: Amount input lock | P2 | Ledger | Deferred to Phase X Part 1 |

**Phase X must fix Issues #2-8 BEFORE any UX improvements or deployment work.**
