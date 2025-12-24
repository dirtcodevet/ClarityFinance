# Clarity Finance - End State Vision

> **Purpose:** This document describes the complete, finished product. All development phases work toward this vision. Future sessions should reference this to understand what we're building and why.

---

## Product Overview

**Clarity Finance** is a personal finance and budgeting desktop application that helps users:
- Track all income and expenses
- Organize spending into budget "buckets" and categories
- Visualize their financial health over time
- Plan future scenarios without affecting real data
- Maintain full control of their finances with a powerful planning tool

### Core Design Philosophy
- **Modern flat design** with vibrant colors, gradient fills, and glass-look charts
- **Keyboard-first** interaction (Tab, Enter, Ctrl+Z work everywhere)
- **No system dialogs** - all popups are custom styled modals
- **Local-first** - data stored locally, future sync via iCloud/OneDrive (Phase 6+)

---

## Application Structure

### Global UI Elements

**Left Sidebar Navigation:**
- User's name at top (editable via small edit icon)
- Navigation links to all 5 pages
- Dark background (#1E293B) with active state highlighting

**Top Header Bar:**
- Page title on the left
- Month selector in center-right (arrows to navigate months, default = current month)
- Save button on far right

**System Date/Time:**
- App uses system date/time for all operations
- Prevents issues with transactions appearing on wrong dates

---

## Page 1: Dashboard

> **Purpose:** Visual overview of financial health at a glance

### Components

**1. Summary Banner (full page width)**
- Text summarization in bullet format
- Shows status of every expense/budget category
- Includes: Budget vs. Expense by category, Non-standard expenses/goals status, Income (actual vs. planned)

**2. Balance Projection Chart (full width, ~1/4 page height)**
- Large banner-style line chart
- Two lines:
  - **Projected balance:** Based on planned income & expenses from Budget page
  - **Actual balance:** Based on real transactions from Ledger
- Date range selector (calendar picker)
- Default view: current month
- Max viewable range: 12 months
- Scroll bar at bottom to navigate time horizon
- Works because: Starting balances defined in Budget page feed the projection

**3. Financial Buckets Chart**
- Budget vs. Expense side-by-side bar chart comparison
- Category selector allows toggling categories on/off
- Chart auto-adjusts when selections change

**4. Goals Progress Section**
- Shows each goal/non-standard expense name
- Progress bar showing % funded toward budgeted allocation
- Date selector for viewing specific time ranges
- Bars show percentage with "fully funded" amount displayed
- When 100% funded: bar turns completely purple

### Chart Styling
- High contrast, glass-look effect
- Black text labels
- Gradient color schemes
- Shadow borders
- All charts are interactive with custom date range selectors

---

## Page 2: Ledger

> **Purpose:** Record and manage all actual transactions

### Components

**1. Date Range Selector (top of page)**
- Custom date range selection
- Forward or back up to 5 years

**2. Quick Add Bar (above ledger table)**
- Inline transaction entry
- Fields: Income/Expense toggle, Bucket (if expense), Category (if expense), Description, Amount, Date, Account
- Tab navigates between fields
- Enter submits and clears for next entry
- All standard keyboard shortcuts work (Ctrl+C, Ctrl+V, Ctrl+Z)

**3. Ledger Table**
- Shows ALL transactions from all buckets in one view
- Columns: Date, Type, Description, Category, Bucket, Amount, Account, Actions
- Plus (+) button in top-left corner opens add transaction modal
  - Enter in modal: adds transaction and opens fresh modal
  - Save button: adds transaction and closes modal
- Every row has Edit and Delete buttons
  - Edit: Opens modal with transaction data
  - Delete: Opens confirmation modal ("Are you sure?")
- Inline dropdown editing for: Bank, Bucket, Category (NOT description)
- Date cell has calendar selector for quick date changes
- Ctrl+Z undoes last action

---

## Page 3: Budget (Setup)

> **Purpose:** The core configuration page. Everything else flows from here.

### Components

**1. Quick Add Bar (full page width, top of content area)**
- First field: Income or Expense dropdown
- **If Income selected:** Source, Amount, Account Deposited To, Date(s)
- **If Expense selected:** Bucket, Category, Description, Amount, Payment Method, Date(s)
- All fields are dropdown OR fillable (user can type or select)
- Tab navigation, Enter to submit
- All keyboard shortcuts work

**2. Income Card (full page width)**
- Header: Vibrant color, "Income" title
- Quick-add section at top (same UX as main quick-add)
- Fields: Income Source, Income Type (W2, 1099, etc.), Amount, Pay Date(s) (multi-select calendar), Deposit Account
- List of all income sources below
- Each row has Edit/Delete buttons
- Edit opens modal, Delete opens confirmation

**3. Accounts Card (full page width)**
- Header: Different vibrant color
- Quick-add section at top
- Fields: Bank/Institution, Account Type (Checking, Savings, Credit, IRA, etc.), Current Balance
- List of all accounts below
- Each row has Edit/Delete buttons
- **"Total Balances"** displayed in header (sum of all accounts)
- Individual account balances update as transactions occur in Ledger

**4. Categories Card (tall, thin, right side)**
- "+ Add Category" button at top (no quick-add bar)
- When adding: Enter category name, select bucket from dropdown
- List of all categories with bucket association
- Each row has Edit/Delete buttons
- Scrollable list

**5. Bucket Cards (4 standard + 1 goals)**

Standard buckets (cannot be deleted, can be renamed):
- Major Fixed Expense (blue)
- Major Variable Expense (purple)
- Minor Fixed Expense (green)
- Minor Variable Expense (amber)

Each standard bucket card:
- Colored header with bucket name
- Edit button in header (rename only)
- Table for planned expenses
- Fields: Description, Account Paid With, Due Date(s) (multi-select calendar), Category, Amount
- Each row has Edit/Delete buttons
- All keyboard shortcuts work

**6. Goals Bucket (full page width, bottom)**
- "Non-Standard Expense/Goals" (pink header)
- Different from other buckets - includes progress tracking
- Fields: Goal Name, Target Amount (fully funded), Target Date, Funded Amount
- Progress bar for each goal:
  - Multi-color gradient (orange → pink → purple)
  - Shows amount funded vs. target
  - When 100%: turns solid purple
- Each row has Edit/Delete buttons

---

## Page 4: Planning

> **Purpose:** Sandbox environment for "what-if" scenarios without affecting real data

### Key Principle
**Changes here NEVER affect the Budget/Setup page.** This is a consequence-free planning tool.

### Components

**1. Explanation Box (full width, top)**
- Describes what this page is for
- How to use it effectively

**2. Balance Projection Chart**
- Line chart similar to Dashboard
- One line per account (from Budget page)
- Date range selector (top right of chart)
- Click account names to show/hide lines
- Shows projected balances based on Planning page data

**3. Income Card (clone of Budget page)**
- Pre-filled with data from Budget page
- Edits here don't affect Budget page

**4. Accounts Card (clone of Budget page)**
- Pre-filled with data from Budget page
- Edits here don't affect Budget page

**5. Bucket Cards (clones of Budget page)**
- All 5 buckets present
- Pre-filled with data from Budget page
- Edits here don't affect Budget page

**6. Categories List (clone of Budget page)**
- Pre-filled, editable without affecting real data

**7. Control Buttons (top right)**
- **Refresh:** Asks "Reset all data to defaults?" Yes/No
  - Yes: Clears and reloads from Budget page
  - No: Closes dialog, nothing changes
- **Save:** Stores current planning scenario in memory
  - Persists when app reopens

**8. Insights Box (full width, bottom)**
- Background: Gradient orange (transparent to 80% vibrant orange)
- Light bulb icon in top-right corner
- AI-style analysis of the planning data:
  - "If you cut grocery expenses by 20%, you'd save $X/month"
  - "Moving this expense out 2 weeks improves cash flow by..."
  - "At current pace, [goal] will be funded by [date]"
- Updates automatically when any data changes

---

## Page 5: Data

> **Purpose:** App management, backup/restore, and help

### Components

**1. Tips & Tricks Section**
- How to use the app
- General budgeting advice
- Keyboard shortcuts reference

**2. Backup / Import Buttons (top of page)**
- **Backup:** Exports all data to JSON file
- **Import:** Restores from backup file
  - Warns about overwriting existing data

**3. Activity Log**
- Date range selector
- Shows all actions taken in the app
- Columns: Timestamp, Action, Entity, Details
- Exportable for selected date range

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     BUDGET (Setup) PAGE                      │
│                                                              │
│  Accounts ──────┐                                            │
│  Income ────────┼──► Starting point for all calculations     │
│  Buckets ───────┤                                            │
│  Categories ────┤                                            │
│  Goals ─────────┘                                            │
└─────────────────────────────────────────────────────────────┘
           │                              │
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│     LEDGER PAGE      │      │    PLANNING PAGE     │
│                      │      │                      │
│  Actual transactions │      │  "What-if" sandbox   │
│  recorded here       │      │  (never affects      │
│                      │      │   real data)         │
└──────────────────────┘      └──────────────────────┘
           │                              │
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│   DASHBOARD PAGE     │      │    Insights shown    │
│                      │      │    in Planning       │
│  Visualizes both     │      │                      │
│  planned & actual    │      │                      │
└──────────────────────┘      └──────────────────────┘
```

---

## Technical Requirements

### Platform
- Desktop application (Windows, Mac)
- Built with Electron
- Future: Mobile app sharing same patterns (Phase 6+)

### Data Storage
- SQLite database (local file)
- All records have: id, created_at, updated_at, is_deleted
- Soft deletes (never truly delete data)
- Future: iCloud/OneDrive sync via event log (Phase 6+)

### Sync Strategy (Future)
- V1: Local only
- V2+: Append-only event log synced via cloud storage
- Local SQLite rebuilt from event log
- Allows conflict resolution

### UI/UX Requirements
- All popups are styled modals (never system dialogs)
- Keyboard navigation throughout (Tab, Enter, Ctrl+Z, etc.)
- Date pickers are calendar selectors
- Multi-date selection where noted
- All tables support inline dropdown editing where noted
- Edit always opens modal
- Delete always confirms

### Color Scheme
- Blue (#3B82F6) - Major Fixed
- Purple (#8B5CF6) - Major Variable  
- Green (#10B981) - Minor Fixed
- Amber (#F59E0B) - Minor Variable
- Pink (#EC4899) - Goals
- Sidebar: Dark slate (#1E293B)
- Background: Light gray (#F8FAFC)
- Cards: White (#FFFFFF)

---

## Development Phases

| Phase | Focus | Key Deliverables | Status |
|-------|-------|------------------|--------|
| 0 | Foundation | Core systems, UI shell, documentation | ✅ Complete |
| 1 | Budget | Accounts, income, buckets, categories, goals | ✅ Complete |
| 2 | Ledger | Transaction entry and management | ✅ Complete |
| 3 | Dashboard | Charts, summaries, visualizations | ✅ Complete |
| 4 | Planning | Sandbox environment, insights | ✅ Complete* |
| 5 | Data | Backup/restore, tips & tricks, keyboard shortcuts ref | 🔄 In Progress |
| X | Polish & Deploy | UX improvements, keyboard functionality, installer | 📋 Planned |
| 6+ | Future | Mobile app, cloud sync | 📋 Planned |

*Phase 4 note: UX improvements and keyboard functionality deferred to Phase X (polish phase)

---

## Success Criteria

The app is complete when a user can:

1. ✅ Open the app and see a clean, modern interface
2. Set up their accounts with starting balances
3. Define income sources with pay schedules
4. Create expense categories and assign to buckets
5. Plan regular expenses with due dates
6. Create savings goals with progress tracking
7. Record actual transactions as they occur
8. See dashboard showing planned vs. actual
9. Use planning page to model "what-if" scenarios
10. Export and restore their data
11. Do all of the above using keyboard shortcuts efficiently

---

## Reference: Original Requirements Source

This vision document is derived from the user's original specification document "CLARITY_FINANCE_APP.docx" combined with architectural decisions made during Phase 0 planning conversations.

Key modifications from original:
- V1 is local-only (sync deferred to Phase 6+)
- Structured error handling throughout
- Zod validation for data integrity
- Module isolation architecture for maintainability
- Session-based development with documentation as "shared memory"
