# Budget Module

> **Status:** ✅ Complete (Phase 1)

## Overview

The Budget module provides the foundation for financial planning in Clarity Finance. It manages accounts, income sources, expense buckets, categories, planned expenses, and savings goals.

## Architecture

```
modules/budget/
├── index.js      # Public API exports
├── service.js    # Business logic with event emissions
└── README.md     # Module documentation

ui/pages/
└── budget.js     # Budget page UI component
```

## Tables Owned

| Table | Description |
|-------|-------------|
| `accounts` | Bank accounts (checking, savings, credit, etc.) |
| `income_sources` | Sources of income with pay schedules |
| `buckets` | Pre-seeded expense categories (5 fixed) |
| `categories` | User-defined expense categories |
| `planned_expenses` | Recurring/planned expense entries |
| `goals` | Savings goals with progress tracking |

## IPC Channels

All Budget operations are exposed via IPC handlers in `main.js`:

| Channel | Parameters | Returns |
|---------|------------|---------|
| `budget:getAccounts` | - | `{ ok, data: Account[] }` |
| `budget:createAccount` | `data` | `{ ok, data: Account }` |
| `budget:updateAccount` | `id, changes` | `{ ok, data: Account }` |
| `budget:deleteAccount` | `id` | `{ ok, data: { id } }` |
| `budget:restoreRecord` | `table, id` | `{ ok, data: Record }` |
| `budget:getIncomeSources` | - | `{ ok, data: IncomeSource[] }` |
| `budget:createIncomeSource` | `data` | `{ ok, data: IncomeSource }` |
| `budget:updateIncomeSource` | `id, changes` | `{ ok, data: IncomeSource }` |
| `budget:deleteIncomeSource` | `id` | `{ ok, data: { id } }` |
| `budget:getBuckets` | - | `{ ok, data: Bucket[] }` |
| `budget:updateBucket` | `id, changes` | `{ ok, data: Bucket }` |
| `budget:getCategories` | `bucketId?` | `{ ok, data: Category[] }` |
| `budget:createCategory` | `data` | `{ ok, data: Category }` |
| `budget:updateCategory` | `id, changes` | `{ ok, data: Category }` |
| `budget:deleteCategory` | `id` | `{ ok, data: { id } }` |
| `budget:getPlannedExpenses` | `bucketId?` | `{ ok, data: PlannedExpense[] }` |
| `budget:createPlannedExpense` | `data` | `{ ok, data: PlannedExpense }` |
| `budget:updatePlannedExpense` | `id, changes` | `{ ok, data: PlannedExpense }` |
| `budget:deletePlannedExpense` | `id` | `{ ok, data: { id } }` |
| `budget:getGoals` | - | `{ ok, data: Goal[] }` |
| `budget:createGoal` | `data` | `{ ok, data: Goal }` |
| `budget:updateGoal` | `id, changes` | `{ ok, data: Goal }` |
| `budget:deleteGoal` | `id` | `{ ok, data: { id } }` |
| `budget:fundGoal` | `id, amount` | `{ ok, data: Goal }` |
| `budget:getBucketTotal` | `bucketId` | `{ ok, data: number }` |
| `budget:getBudgetSummary` | - | `{ ok, data: BudgetSummary }` |
| `budget:getBudgetDataForMonth` | `month` (YYYY-MM) | `{ ok, data: { accounts, incomeSources, buckets, categories, plannedExpenses, goals } }` |

## Events Emitted

All events are emitted by `service.js` after successful database operations:

| Event | Payload |
|-------|---------|
| `account:created` | `{ account }` |
| `account:updated` | `{ account, changes }` |
| `account:deleted` | `{ id }` |
| `income-source:created` | `{ incomeSource }` |
| `income-source:updated` | `{ incomeSource, changes }` |
| `income-source:deleted` | `{ id }` |
| `bucket:updated` | `{ bucket, changes }` |
| `category:created` | `{ category }` |
| `category:updated` | `{ category, changes }` |
| `category:deleted` | `{ id }` |
| `planned-expense:created` | `{ plannedExpense }` |
| `planned-expense:updated` | `{ plannedExpense, changes }` |
| `planned-expense:deleted` | `{ id }` |
| `goal:created` | `{ goal }` |
| `goal:updated` | `{ goal, changes }` |
| `goal:deleted` | `{ id }` |
| `goal:funded` | `{ goal, amount, newTotal, isComplete }` |

## UI Components

The Budget page (`ui/pages/budget.js`) provides:

- **Accounts Card**: Quick-add bar, data table, edit/delete modals
- **Income Sources Card**: Quick-add bar, data table, edit/delete modals
- **Categories Card**: Quick-add bar, tag grid grouped by bucket color
- **Bucket Cards (4)**: Major Fixed, Major Variable, Minor Fixed, Minor Variable - each with planned expense list
- **Goals Card**: Quick-add bar, goal cards with progress bars

## Usage Example

```javascript
// In renderer process (ui/pages/budget.js)
const { ipcRenderer } = require('electron');

// Create an account
const result = await ipcRenderer.invoke('budget:createAccount', {
  bank_name: 'Chase',
  account_type: 'checking',
  starting_balance: 5000
});

if (result.ok) {
  console.log('Created account:', result.data);
  // Event 'account:created' is automatically emitted
}
```

## Dependencies

- **Core:** database.js, events.js, config.js
- **No cross-module imports** - follows MODULE_GUIDELINES.md

## Month-Based Budget Data

// codex/review-project-documents-and-codebase-44xjc9
Budget items with `effective_from` (including categories) are scoped to a specific month. When the UI requests `budget:getBudgetDataForMonth`, the service ensures:
Budget items with `effective_from` are scoped to a specific month. When the UI requests `budget:getBudgetDataForMonth`, the service ensures:
Test_Codex
- If the requested month has no budget data yet, it copies the most recently edited prior month forward.
- Past months never inherit data from future months.

## Notes

- All service functions are `async` and use `await` for database operations
- Events are emitted AFTER successful database operations
- Buckets are pre-seeded (5 total) and cannot be created/deleted
- The 5th bucket ("goals") exists in DB but is not displayed as a bucket card
