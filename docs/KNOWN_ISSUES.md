# Known Issues & Polish Pass Items

> **Purpose:** Track bugs and improvements to address after all phases are complete.
> **Last Updated:** Phase 3 Complete

---

## Priority Levels

- **P1:** Blocks functionality - fix immediately
- **P2:** Significant UX issue - fix before release
- **P3:** Minor annoyance - fix in polish pass
- **P4:** Enhancement - nice to have

---

## Open Issues

### Issue #1: System Dialogue Causes Complete Input Lock
**Priority:** P1 → CRITICAL (BLOCKING - affects all pages)
**Module:** All pages (Ledger, Budget, Planning, Data)
**Files:** All `ui/pages/*.js` files

**Description:**
When user submits a form without filling in all required fields, a system `alert()` dialogue appears. After dismissing this dialogue, **ALL input fields across the ENTIRE application become locked** - user cannot type anywhere, on any page. The only workaround is to close and restart the app.

**Root Cause - CONFIRMED:**
System `alert()` dialogue boxes fundamentally break input focus state across the entire Electron application. Multiple AI analyses confirmed this is a known Electron/Chromium issue with modal system dialogues.

**Solution - VERIFIED:**
Complete removal of ALL `alert()` calls throughout the application. Replace with simple inline validation flags or silent field highlighting. Testing confirmed that removing system dialogues completely solves the input lock issue.

**Required Action:**
1. Search entire codebase for `alert()` calls
2. Remove ALL system dialogues
3. Replace with inline validation indicators (red border, helper text)
4. NO toast notifications (keep it simple - just visual field indicators)
5. Test on all pages: Ledger, Budget, Planning, Data

**Files Requiring Changes:**
- `ui/pages/ledger.js` - Remove validation alerts
- `ui/pages/budget.js` - Remove validation alerts
- `ui/pages/planning.js` - Remove validation alerts
- `ui/pages/data.js` - Remove validation alerts
- Any other files with `alert()` or `confirm()` calls

**Testing:**
- [ ] Submit empty form on Ledger - no dialogue appears, inline validation only
- [ ] Submit empty form on Budget - no dialogue appears, inline validation only
- [ ] Submit empty form on Planning - no dialogue appears, inline validation only
- [ ] Verify can still type in all fields after validation error
- [ ] Verify can navigate between pages and type everywhere

---

### Issue #2: Budget Page Shows Starting Balance, Not Current Balance
**Priority:** P2 → P1 (critical for Phase X)
**Module:** Budget
**Files:** `ui/pages/budget.js`, potentially `modules/budget/service.js`

**Description:**
When transactions are added in the Ledger, the account balances shown on the Budget page do not update. The Budget page displays `starting_balance` (the static value entered when creating the account) rather than the calculated current balance.

**Expected Behavior:**
Account balance should reflect: `starting_balance + total_income - total_expenses` for that account.

**Current State:**
- Dashboard correctly calculates current balance in `getAccountBalances()`
- Budget page displays raw `starting_balance` from database

**Suggested Fix:**
1. Create a shared utility function for balance calculation (or use the dashboard service)
2. Update Budget page to call this function when rendering account balances
3. Consider showing both "Starting Balance" and "Current Balance" for clarity

**Note:** This is important for the Planning module to work correctly, as it clones Budget data for "what-if" scenarios.

---

### Issue #3: Cannot Delete Budget Items
**Priority:** P1 (blocking basic functionality)
**Module:** Budget
**Files:** `ui/pages/budget.js`

**Description:**
When creating items on the Budget page (accounts, income sources, categories, planned expenses, goals), the delete functionality does not work. Users cannot remove items they've created.

**Expected Behavior:**
Clicking the trash icon should delete the item after confirmation.

**Current State:**
Delete buttons appear but clicking them produces no result or error.

**Suggested Fix:**
1. Verify delete event handlers are properly attached
2. Ensure IPC calls to delete functions are working
3. Add proper confirmation modal before delete
4. Update UI to remove deleted item from display

---

### Issue #4: Dashboard Chart Doesn't Update with Account Balance
**Priority:** P1 (critical for dashboard accuracy)
**Module:** Dashboard
**Files:** `ui/pages/dashboard.js`, `modules/dashboard/service.js`

**Description:**
When account starting balance is negative (e.g., -$430), the dashboard chart projection and actual lines don't properly baseline from that starting point. The chart doesn't reflect the true starting position.

**Expected Behavior:**
If account starts at -$430, that should be the baseline (time zero) for both projected and actual balance lines on the chart.

**Current State:**
Chart may be starting from $0 instead of the actual starting balance.

**Suggested Fix:**
1. Ensure balance calculation includes `starting_balance` as the baseline
2. Update chart rendering to plot from actual starting balance
3. Verify all accounts' starting balances are included in totals

---

### Issue #5: Multi-Date Expenses Not Summed Correctly
**Priority:** P1 (critical for budget accuracy)
**Module:** Budget, Dashboard
**Files:** `ui/pages/budget.js`, `modules/dashboard/service.js`

**Description:**
When a planned expense is due multiple times in a month (e.g., $10 weekly = 4 times), the dashboard doesn't sum these occurrences. It should show $40 total for that expense for the month.

**Expected Behavior:**
If an expense is $10 and due on dates [1st, 8th, 15th, 22nd], the monthly total should be $40 in dashboard charts and summaries.

**Current State:**
Dashboard may only show $10 instead of the sum of all occurrences within the selected month.

**Suggested Fix:**
1. Update budget/dashboard calculations to count date occurrences within the selected month
2. Parse `due_dates` JSON array and filter for dates within current month
3. Multiply expense amount by number of occurrences
4. Display summed total in charts and tables

---

### Issue #6: Month Selector Doesn't Filter Data + Data Should Carry Forward
**Priority:** P1 (blocking core functionality)
**Module:** All pages
**Files:** `ui/app.js`, all page modules, budget service

**Description:**
The month selector arrows (previous/next month) don't change which data is displayed. All data remains visible regardless of selected month. Additionally, the app needs intelligent month-to-month data persistence.

**Expected Behavior:**

**Navigation:**
- Selecting "November 2024" should show November data (not December)
- Selecting "December 2024" should show December data
- Month selector must actually filter what's displayed

**Data Carry-Forward Logic:**
- If user is in December and navigates to January:
  - If January has NO data → pre-populate with December's data (accounts, income, categories, expenses, goals)
  - If January HAS data → show January's actual data (user has already set up that month)
- If user navigates to November (past month):
  - Show November's actual data (what was entered for November)
  - Do NOT show December's data when viewing November

**Current State:**
- Month selector doesn't filter anything - all months' data shows simultaneously
- No data carry-forward mechanism exists
- Each month exists independently (even future months show empty)

**Suggested Fix:**
1. Ensure month selector properly updates `state.currentMonth` and triggers reload
2. Add month filtering to all data queries
3. Implement data carry-forward logic in Budget service:
   ```javascript
   async function getDataForMonth(monthString) {
     // Check if month has data
     const monthData = await db.query('expenses', { month: monthString });

     if (monthData.length === 0 && isFutureMonth(monthString)) {
       // Future month with no data - copy from previous month
       const previousMonth = getPreviousMonth(monthString);
       return await copyMonthData(previousMonth, monthString);
     }

     // Return actual data for this month
     return monthData;
   }
   ```
4. Add month field to all relevant tables (or use date ranges)
5. Update all pages to respect current month filter

**Note:** This is critical - app is non-functional for time-based budgeting without working month filtering AND data carry-forward.

---

### Issue #7: No Recurring Expense Support
**Priority:** P1 (critical feature missing)
**Module:** Budget
**Files:** `ui/pages/budget.js`, `modules/budget/service.js`, schema

**Description:**
When creating a planned expense, there's no option to mark it as recurring. Users must manually re-enter the same expense every month (rent, subscriptions, etc.).

**Expected Behavior:**
- Checkbox or toggle: "Recurring monthly"
- If checked, expense auto-appears in all future months
- Option to edit recurring expense globally or just one occurrence
- Option to set end date for recurring expenses

**Implementation Suggestion:**
1. Add `is_recurring` boolean field to planned_expenses table
2. Add `recurrence_end_date` optional field
3. When displaying budget for a month, include all recurring expenses that started before/in that month and haven't ended
4. Add UI toggle in Add/Edit Expense modals
5. Consider adding recurrence patterns (monthly, weekly, bi-weekly, custom)

---

### Issue #8: Pay Dates Need Flexible Multi-Date Calendar Selector
**Priority:** P1 (critical for income accuracy)
**Module:** Budget
**Files:** `ui/pages/budget.js`, `modules/budget/service.js`

**Description:**
Income sources currently use text-based date entry. Users need a flexible calendar picker that allows selecting ANY combination of dates - daily, weekly, random intervals, bi-weekly, monthly, or completely custom patterns.

**Expected Behavior:**
Users should be able to:
- **Select multiple dates freely from a calendar picker**
- Pick ANY dates they want (not constrained to patterns)
- Examples of what users might need:
  - Daily (select all 30 days)
  - Weekly (select 4-5 specific days)
  - Bi-weekly (select 2 specific days)
  - Monthly (select 1 day)
  - Random/irregular (select any combination: 3rd, 7th, 15th, 23rd, 29th)
  - Split payments (1st and 15th)
  - Variable (get paid different days each month)

**Implementation:**
1. Use flatpickr or similar with `mode: 'multiple'`
2. Allow user to click/select as many dates as they want from calendar
3. Store selected dates as JSON array in `pay_dates` field (already exists)
4. Display selected dates clearly in UI
5. Allow editing by reopening calendar picker

**UI Flow:**
```
Income Source: "Freelance Work"
Amount: $500
Pay Dates: [Click to select dates]
  → Opens calendar
  → User clicks: Jan 5, Jan 12, Jan 19, Jan 26 (4 dates)
  → Displays: "5th, 12th, 19th, 26th"
  → Save
```

**Note:** This is essential for real-world income tracking. People get paid on all kinds of schedules - the app must be flexible, not prescriptive.

---

## Resolved Issues

(None yet - issues move here when fixed)

---

## Polish Pass Checklist

Items to address after Phase 5 is complete:

### UX Improvements
- [ ] Fix Issue #1 (amount input lock)
- [ ] Fix Issue #2 (current balance calculation)
- [ ] Review all `alert()` calls - replace with styled toasts
- [ ] Add keyboard shortcuts help modal
- [ ] Add loading states to all data fetches

### Code Quality
- [ ] Audit all error handling paths
- [ ] Add input validation feedback (inline errors, not alerts)
- [ ] Review accessibility (focus management, ARIA labels)
- [ ] Performance review of chart rendering

### Testing
- [ ] Test all CRUD operations
- [ ] Test edge cases (empty states, large data sets)
- [ ] Test keyboard navigation throughout
- [ ] Cross-platform testing (Windows, Mac)

---

## Notes for Future Sessions

When starting the polish pass:
1. Read this file first
2. Address P2 issues before P3
3. Update this file as issues are resolved
4. Consider creating automated tests for regression prevention
