# Module Guidelines

> **IMPORTANT:** Follow these guidelines when creating any new module. This ensures modules work together without conflicts, even when built in different sessions.

---

## Module Structure

Every module follows this folder structure:

```
modules/[module-name]/
├── index.js              # Public exports ONLY
├── service.js            # Business logic
├── components/           # Module-specific UI components
│   ├── [name]-card.js
│   ├── [name]-modal.js
│   └── ...
└── README.md             # Module documentation
```

---

## Creating a New Module

### Step 1: Create the folder structure

```bash
mkdir -p modules/[module-name]/components
```

### Step 2: Create index.js (Public API)

This file exports ONLY what other parts of the app need.

```javascript
// modules/[module-name]/index.js

const service = require('./service');

module.exports = {
  // Initialize module (called once at app startup)
  initialize: service.initialize,
  
  // Public functions other code might need
  // Keep this minimal - most logic stays internal
};
```

### Step 3: Create service.js (Business Logic)

```javascript
// modules/[module-name]/service.js

const db = require('../../core/database');
const events = require('../../core/events');

/**
 * Initialize the module.
 * Called once at app startup.
 */
async function initialize() {
  // Set up event listeners
  events.on('some:event', handleSomeEvent);
  
  // Any other initialization
}

/**
 * Internal handler - not exported
 */
function handleSomeEvent(data) {
  // React to event
}

/**
 * Example public function
 */
async function doSomething(params) {
  const result = await db.query('tablename', { /* filters */ });
  
  if (!result.ok) {
    return result; // Pass through error
  }
  
  // Process and return
  return { ok: true, data: processedData };
}

module.exports = {
  initialize,
  doSomething,
};
```

### Step 4: Create README.md (Documentation)

```markdown
# [Module Name] Module

## Purpose
Brief description of what this module does.

## Dependencies
- Core: database, events
- Tables: accounts, transactions (read), [own tables] (read/write)
- Events listened: transaction:created, account:updated
- Events emitted: [module]:something

## Public API
### initialize()
Called at app startup. Sets up event listeners.

### doSomething(params)
Description of what it does.
- Parameters: ...
- Returns: ...

## Internal Tables
If module creates its own tables, document them here.

### [module]_something
| Column | Type | Description |
|--------|------|-------------|

## Components
List of UI components in this module.

## Notes
Any special considerations for future sessions.
```

### Step 5: Register the module

Add to `main.js` (or wherever modules are loaded):

```javascript
const moduleName = require('./modules/module-name');
await moduleName.initialize();
```

### Step 6: Create the page

Add to `ui/pages/`:

```javascript
// ui/pages/[module-name].js

const { createCard } = require('../components/card');
// ... other imports

function createModulePage() {
  const container = document.createElement('div');
  container.className = 'page page-[module-name]';
  
  // Build page content
  
  return container;
}

module.exports = { createModulePage };
```

### Step 7: Add navigation

Update `ui/components/sidebar.js` to include the new page.

### Step 8: Update documentation

- Update `PROJECT_STATUS.md`
- Create `docs/modules/[module-name].md`

---

## Module Rules

### Imports

**ALLOWED:**
```javascript
// Core modules
const db = require('../../core/database');
const events = require('../../core/events');
const config = require('../../core/config');

// Own module files
const { helper } = require('./helpers');

// Shared UI components
const { createCard } = require('../../ui/components/card');
const { createModal } = require('../../ui/components/modal');
```

**FORBIDDEN:**
```javascript
// Other modules - NEVER
const budget = require('../budget/service');  // ✗ NO

// Direct database access - NEVER
const Database = require('better-sqlite3');   // ✗ NO
```

### Cross-Module Data Access

Need data from another module? Use the shared database:

```javascript
// Budget module owns accounts, but Ledger can query them
const accounts = await db.query('accounts', { account_type: 'checking' });
```

### Cross-Module Communication

Need to react to changes in another module? Use events:

```javascript
// Ledger module listens for new accounts
events.on('account:created', (data) => {
  // Update ledger's account dropdown
  refreshAccountList();
});
```

### Module-Owned Tables

Modules can create their own tables. Rules:

1. **Prefix with module name:** `planning_scenarios`, `dashboard_cache`
2. **Document in module README**
3. **Other modules cannot access these tables**

```javascript
// In module's initialize()
async function initialize() {
  // Create module-specific table if needed
  await db.execute(`
    CREATE TABLE IF NOT EXISTS planning_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0
    )
  `);
}
```

### Module-Specific Events

Modules can emit their own events. Rules:

1. **Prefix with module name:** `planning:scenario-saved`
2. **Add to EVENT_CATALOG.md**
3. **Document in module README**

---

## Module Initialization Order

Modules are initialized in this order:

1. Core (database, events, config)
2. Budget module (owns accounts, buckets, categories)
3. Ledger module (owns transactions)
4. Dashboard module (reads from others)
5. Planning module (sandbox, reads from others)
6. Data Export module (reads from all)

If your module depends on another, ensure it's listed later.

---

## Testing a Module

Create tests in `tests/[module-name].test.js`:

```javascript
const db = require('../core/database');
const events = require('../core/events');
const module = require('../modules/[module-name]');

describe('[module-name] module', () => {
  beforeAll(async () => {
    await db.initialize();
    await module.initialize();
  });
  
  test('does something correctly', async () => {
    const result = await module.doSomething({ /* params */ });
    expect(result.ok).toBe(true);
  });
});
```

---

## Checklist: New Module

Before considering a module complete:

- [ ] Folder structure matches template
- [ ] index.js exports only public API
- [ ] service.js contains all business logic
- [ ] No imports from other modules
- [ ] All database operations use core/database
- [ ] All events emitted are in EVENT_CATALOG.md
- [ ] All event listeners set up in initialize()
- [ ] README.md documents everything
- [ ] Page component created in ui/pages/
- [ ] Navigation updated in sidebar
- [ ] Tests written and passing
- [ ] docs/modules/[name].md created
- [ ] PROJECT_STATUS.md updated

---

## Common Patterns

### Loading data on page view

```javascript
async function loadPageData() {
  const [accounts, transactions] = await Promise.all([
    db.query('accounts', {}),
    db.query('transactions', { 
      date: { between: [startDate, endDate] } 
    })
  ]);
  
  if (!accounts.ok || !transactions.ok) {
    showError('Failed to load data');
    return;
  }
  
  renderData(accounts.data, transactions.data);
}
```

### Handling form submission

```javascript
async function handleSubmit(formData) {
  // Validate on client side first (optional, for UX)
  if (!formData.name) {
    showFieldError('name', 'Name is required');
    return;
  }
  
  // Submit to database
  const result = await db.insert('tablename', formData);
  
  if (!result.ok) {
    showError(result.error.message);
    return;
  }
  
  // Success - emit event and update UI
  events.emit('entity:created', { entity: result.data });
  closeModal();
  refreshList();
}
```

### Listening for updates from other modules

```javascript
function initialize() {
  // React to transactions (from Ledger module)
  events.on('transaction:created', recalculateBalances);
  events.on('transaction:updated', recalculateBalances);
  events.on('transaction:deleted', recalculateBalances);
}

function recalculateBalances(data) {
  // Update displayed balances
}
```
