# Dashboard Module

> **Status:** ✅ Complete (Phase 3)

## Overview

The Dashboard module provides a visual overview of the user's financial status through summary banners, charts, and progress indicators. This is a read-only module that aggregates data from other modules' tables.

## Architecture

```
modules/dashboard/
├── index.js      # Public API exports
├── service.js    # Data aggregation and calculations
└── README.md     # Module documentation

ui/pages/
└── dashboard.js  # Dashboard page UI component

ui/styles/
└── dashboard.css # Dashboard-specific styles
```

## Tables Read (No Tables Owned)

The Dashboard module is read-only and queries data from:

| Table | Purpose |
|-------|---------|
| `accounts` | For balance calculations |
| `transactions` | For actual income/expense data |
| `income_sources` | For projected income |
| `planned_expenses` | For budget projections |
| `buckets` | For category grouping |
| `categories` | For budget category breakdown |
| `goals` | For goal progress tracking |

## IPC Channels

All Dashboard operations are exposed via IPC handlers in `main.js`:

| Channel | Parameters | Returns |
|---------|------------|---------|
| `dashboard:getBudgetSummary` | `month` (YYYY-MM) | `{ ok, data: BudgetSummary }` |
| `dashboard:getBalanceProjection` | `startDate, endDate` | `{ ok, data: ProjectionData }` |
| `dashboard:getBudgetVsExpense` | `month` (YYYY-MM) | `{ ok, data: BudgetVsExpenseData }` |
| `dashboard:getGoalsProgress` | - | `{ ok, data: Goal[] }` |
| `dashboard:getAccountBalances` | - | `{ ok, data: AccountBalances }` |

## Data Structures

### BudgetSummary
```javascript
{
  month: 'YYYY-MM',
  income: {
    planned: number,
    actual: number,
    remaining: number,
    percentReceived: number
  },
  expenses: {
    planned: number,
    actual: number,
    remaining: number,
    percentUsed: number
  },
  categoryStatus: [{
    id: number,
    name: string,
    bucketId: number,
    bucketName: string,
    bucketKey: string,
    planned: number,
    actual: number,
    remaining: number,
    percentUsed: number,
    status: 'over' | 'warning' | 'on-track' | 'under'
  }],
  goals: [{
    id: number,
    name: string,
    targetAmount: number,
    fundedAmount: number,
    targetDate: string,
    percentFunded: number,
    isComplete: boolean
  }],
  totalBalance: number,
  netCashFlow: number
}
```

### ProjectionData
```javascript
{
  startDate: string,
  endDate: string,
  startingBalance: number,
  projected: [{ date: string, balance: number }],
  actual: [{ date: string, balance: number }]
}
```

### BudgetVsExpenseData
```javascript
{
  month: string,
  byBucket: [{
    id: number,
    name: string,
    bucketKey: string,
    color: string,
    planned: number,
    actual: number
  }],
  byCategory: [{
    id: number,
    name: string,
    bucketId: number,
    bucketName: string,
    bucketKey: string,
    color: string,
    planned: number,
    actual: number
  }]
}
```

## Events

### Events Emitted

| Event | Payload | Description |
|-------|---------|-------------|
| `dashboard:data-changed` | (varies) | Emitted when underlying data changes |

### Events Listened

The Dashboard service listens to these events to know when to notify UI of potential data changes:

- `transaction:created`, `transaction:updated`, `transaction:deleted`
- `account:created`, `account:updated`, `account:deleted`
- `planned-expense:created`, `planned-expense:updated`, `planned-expense:deleted`
- `goal:created`, `goal:updated`, `goal:deleted`, `goal:funded`
- `income-source:created`, `income-source:updated`, `income-source:deleted`

## UI Components

The Dashboard page (`ui/pages/dashboard.js`) provides:

### 1. Summary Banner
- Full-width overview of financial status
- Net cash flow (income minus expenses)
- Income status (planned vs actual)
- Expense status (planned vs actual)
- Notable category statuses (over budget, warning, etc.)
- Goals quick summary with mini progress bars

### 2. Balance Projection Chart
- Full-width line chart
- Two lines: Projected (dashed blue) and Actual (solid green)
- Date range selector for custom viewing
- Default: current month
- Y-axis: Balance amounts
- X-axis: Dates

### 3. Budget vs Expense Chart
- Side-by-side bar chart
- Shows budget vs actual by category
- Category filter chips to show/hide categories
- Color-coded by bucket
- Gradient bar fills

### 4. Goals Progress Section
- Grid of goal cards
- Each card shows:
  - Goal name and target date
  - Funded amount / Target amount
  - Progress bar with gradient fill
  - Percentage funded
  - Remaining amount or "Complete" status
- Progress bar turns solid purple at 100%

## Styling

The dashboard uses the app's design system:

- **Glass-look cards** with subtle shadows
- **Gradient progress bars** (orange → pink → purple)
- **Color-coded status badges**:
  - Over budget: Red
  - Warning (>90%): Amber
  - On track (50-90%): Green
  - Under budget (<50%): Blue
- **Canvas-based charts** with custom rendering
- **Responsive grid layouts**

## Usage Example

```javascript
// In renderer process (ui/pages/dashboard.js)
const { ipcRenderer } = require('electron');

// Get budget summary for current month
const result = await ipcRenderer.invoke('dashboard:getBudgetSummary', '2024-12');

if (result.ok) {
  console.log('Net cash flow:', result.data.netCashFlow);
  console.log('Categories over budget:', 
    result.data.categoryStatus.filter(c => c.status === 'over')
  );
}
```

## Dependencies

- **Core:** database.js, events.js
- **No cross-module imports** - follows MODULE_GUIDELINES.md
- All data accessed through shared database queries

## Notes

- All service functions are `async` and use `await` for database operations
- Dashboard is read-only - it never modifies data
- Charts are rendered using native Canvas 2D API (no external chart library)
- The balance projection calculates running balances based on starting balance + transactions
- Category filter state is maintained in page state, not persisted

## Session Log

| Date | Session | Notes |
|------|---------|-------|
| Phase 3 | Initial implementation | Complete dashboard with all components |
