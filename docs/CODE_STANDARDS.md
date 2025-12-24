# Code Standards

> **IMPORTANT:** All code in this project must follow these standards. These are not guidelines — they are rules. Consistent code prevents "new session breaks old code" problems.

---

## Naming Conventions

### JavaScript

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `accountList`, `totalBalance` |
| Functions | camelCase | `getAccounts()`, `calculateBalance()` |
| Constants | UPPER_SNAKE | `MAX_RECORDS`, `DEFAULT_COLOR` |
| Classes | PascalCase | `AccountService`, `TransactionModal` |
| Event names | kebab-case with colon | `transaction:created`, `account:updated` |

### Files

| Type | Convention | Example |
|------|------------|---------|
| JavaScript files | kebab-case | `account-service.js`, `quick-add-bar.js` |
| CSS files | kebab-case | `main.css`, `variables.css` |
| Documentation | UPPER_SNAKE or kebab | `CORE_API.md`, `budget.md` |
| Folders | kebab-case | `data-export/`, `quick-add/` |

### Database

| Type | Convention | Example |
|------|------------|---------|
| Table names | snake_case, plural | `accounts`, `income_sources` |
| Column names | snake_case | `bank_name`, `account_type` |
| Foreign keys | singular_id | `account_id`, `bucket_id` |

---

## File Organization

```
clarity-finance/
├── core/                    # Core system - NEVER import from modules
│   ├── database.js          # All database operations
│   ├── schemas.js           # Zod schemas for validation
│   ├── events.js            # Event pub/sub system
│   ├── config.js            # Configuration management
│   └── migrator.js          # Database migration runner
│
├── modules/                 # Feature modules
│   └── [module-name]/
│       ├── index.js         # Public exports only
│       ├── service.js       # Business logic
│       ├── components/      # Module-specific UI
│       └── README.md        # Module documentation
│
├── ui/                      # Shared UI layer
│   ├── index.html           # Main HTML file
│   ├── styles/              # CSS files
│   ├── components/          # Shared components
│   └── pages/               # Page-level components
│
├── docs/                    # Documentation
├── tests/                   # Test files
└── migrations/              # Database migrations
```

---

## Module Isolation Rules

### Allowed Imports

A module CAN import from:
- `../../core/*` — Core system functions
- `./` — Own module files
- `../../ui/components/*` — Shared UI components

### Forbidden Imports

A module CANNOT import from:
- `../other-module/*` — Other modules
- Direct database libraries — Must use core/database.js

### Example

```javascript
// modules/ledger/service.js

// ✓ ALLOWED
const db = require('../../core/database');
const events = require('../../core/events');
const { formatCurrency } = require('./helpers');

// ✗ FORBIDDEN - importing from another module
const { getAccounts } = require('../budget/service');

// ✗ FORBIDDEN - direct database access
const Database = require('better-sqlite3');
```

### Cross-Module Communication

If Module A needs data from Module B:

**Option 1: Query the shared database**
```javascript
// Module A needs accounts (owned by Budget module)
// This is fine - accounts table is shared
const result = await db.query('accounts', { account_type: 'checking' });
```

**Option 2: Listen to events**
```javascript
// Module A reacts to changes in Module B
events.on('account:created', (data) => {
  // React to new account
});
```

---

## Function Patterns

### Async Database Functions

All functions that touch the database must be async:

```javascript
// ✓ CORRECT
async function getAccounts() {
  const result = await db.query('accounts', {});
  return result;
}

// ✗ WRONG - missing async/await
function getAccounts() {
  return db.query('accounts', {});
}
```

### Result Handling

Always check `result.ok` before using `result.data`:

```javascript
// ✓ CORRECT
async function createAccount(data) {
  const result = await db.insert('accounts', data);
  
  if (!result.ok) {
    showError(result.error.message);
    return null;
  }
  
  return result.data;
}

// ✗ WRONG - assumes success
async function createAccount(data) {
  const result = await db.insert('accounts', data);
  return result.data;  // Could be undefined if error!
}
```

### Event Emission After State Changes

When data changes, emit an event:

```javascript
async function createTransaction(data) {
  const result = await db.insert('transactions', data);
  
  if (result.ok) {
    // Notify other parts of the app
    events.emit('transaction:created', { transaction: result.data });
  }
  
  return result;
}
```

---

## Error Handling

### No Try/Catch for Core Functions

Core functions return structured errors. Don't wrap them in try/catch:

```javascript
// ✓ CORRECT - check result.ok
const result = await db.insert('accounts', data);
if (!result.ok) {
  handleError(result.error);
}

// ✗ UNNECESSARY - core doesn't throw
try {
  const result = await db.insert('accounts', data);
} catch (e) {
  // This will never catch anything from core
}
```

### Try/Catch for External Operations

Use try/catch for things outside core (file system, network, etc.):

```javascript
try {
  const fileContent = await fs.readFile(path);
} catch (e) {
  return { ok: false, error: { code: 'FILE_ERROR', message: e.message } };
}
```

---

## UI Patterns

### Component Structure

Each UI component follows this pattern:

```javascript
// ui/components/example.js

function createExample(options) {
  // Create element
  const element = document.createElement('div');
  element.className = 'example-component';
  
  // Set up content
  element.innerHTML = `
    <div class="example-header">${options.title}</div>
    <div class="example-body">${options.content}</div>
  `;
  
  // Attach event listeners
  element.querySelector('.example-header').addEventListener('click', () => {
    // Handle click
  });
  
  // Return element and any public methods
  return {
    element,
    update: (newContent) => { /* ... */ },
    destroy: () => { /* cleanup */ }
  };
}

module.exports = { createExample };
```

### DOM Queries

Use specific selectors, not generic ones:

```javascript
// ✓ CORRECT - specific to component
element.querySelector('.account-card-title')

// ✗ WRONG - too generic, could match unrelated elements
document.querySelector('.title')
```

### Event Delegation

For lists, use event delegation:

```javascript
// ✓ CORRECT - single listener on container
list.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-btn')) {
    const id = e.target.dataset.id;
    handleDelete(id);
  }
});

// ✗ WRONG - listener on every button
items.forEach(item => {
  item.querySelector('.delete-btn').addEventListener('click', () => {
    // Creates many listeners
  });
});
```

---

## Comments

### When to Comment

- Complex business logic
- Non-obvious decisions (with "why")
- Public function documentation

### When Not to Comment

- Obvious code
- Self-documenting variable names
- Every line

### Example

```javascript
// ✓ GOOD - explains why, not what
// Use soft delete to preserve data for future sync feature
await db.delete('accounts', id);

// ✗ BAD - states the obvious
// Delete the account
await db.delete('accounts', id);
```

---

## Testing

### Test File Location

Tests live in `/tests/` with names matching source files:

```
tests/
├── core.test.js         # Tests for all core modules
├── budget.test.js       # Tests for budget module
└── ledger.test.js       # Tests for ledger module
```

### Test Structure

```javascript
describe('database.insert', () => {
  test('accepts valid account data', async () => {
    const result = await db.insert('accounts', {
      bank_name: 'Test Bank',
      account_type: 'checking',
      starting_balance: 100
    });
    
    expect(result.ok).toBe(true);
    expect(result.data.id).toBeDefined();
  });
  
  test('rejects missing bank_name', async () => {
    const result = await db.insert('accounts', {
      account_type: 'checking',
      starting_balance: 100
    });
    
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## Checklist Before Committing Code

- [ ] All functions that use `await` are marked `async`
- [ ] All database results checked with `if (result.ok)`
- [ ] Events emitted after data changes
- [ ] No imports from other modules
- [ ] Naming conventions followed
- [ ] No console.log left in (except intentional debug logging)
