# Core API Reference

> **IMPORTANT:** This document defines the ONLY functions available from the core. If a function is not documented here, it does not exist. Modules must use only these functions to interact with data and events.

---

## Response Format

All core functions return a structured result:

```javascript
// Success
{ ok: true, data: <result> }

// Failure  
{ ok: false, error: { code: 'ERROR_CODE', message: 'Human readable message' } }
```

**Error Codes:**
| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Data failed schema validation |
| `NOT_FOUND` | Record does not exist |
| `INVALID_FILTER` | Query filter syntax not supported |
| `DATABASE_ERROR` | Unexpected database error |

---

## Database Functions

All database functions are in `core/database.js`.

### initialize()

Initializes the database and runs any pending migrations.

```javascript
const result = await db.initialize();
// Returns: { ok: true, data: { migrationRun: number } }
```

**Call this once** at app startup before any other database operations.

---

### insert(table, record)

Inserts a new record after validation.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| table | string | yes | Table name (see DATA_SCHEMAS.md) |
| record | object | yes | Record data matching table schema |

**Returns:**
```javascript
// Success - includes auto-generated id and timestamps
{ ok: true, data: { id: 1, bank_name: 'Chase', ..., created_at: '...', updated_at: '...' } }

// Failure
{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'bank_name is required' } }
```

**Example:**
```javascript
const result = await db.insert('accounts', {
  bank_name: 'Chase',
  account_type: 'checking',
  starting_balance: 1000.00
});

if (result.ok) {
  console.log('Created account:', result.data.id);
} else {
  console.error('Error:', result.error.message);
}
```

---

### update(table, id, changes)

Updates an existing record after validation.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| table | string | yes | Table name |
| id | number | yes | Record ID to update |
| changes | object | yes | Fields to update (partial record) |

**Returns:**
```javascript
// Success - returns full updated record
{ ok: true, data: { id: 1, bank_name: 'Chase Bank', ..., updated_at: '...' } }

// Failure - not found
{ ok: false, error: { code: 'NOT_FOUND', message: 'Account with id 99 not found' } }

// Failure - validation
{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'account_type must be one of: checking, savings, credit, ira, other' } }
```

**Example:**
```javascript
const result = await db.update('accounts', 1, {
  bank_name: 'Chase Bank',
  starting_balance: 1500.00
});
```

---

### delete(table, id)

Soft-deletes a record (sets `is_deleted = 1`).

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| table | string | yes | Table name |
| id | number | yes | Record ID to delete |

**Returns:**
```javascript
// Success
{ ok: true, data: { id: 1, deleted: true } }

// Failure
{ ok: false, error: { code: 'NOT_FOUND', message: 'Account with id 99 not found' } }
```

**Note:** Records are never truly deleted. They remain in the database with `is_deleted = 1`.

---

### getById(table, id)

Retrieves a single record by ID.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| table | string | yes | Table name |
| id | number | yes | Record ID |

**Returns:**
```javascript
// Success
{ ok: true, data: { id: 1, bank_name: 'Chase', ... } }

// Not found (deleted records also return not found by default)
{ ok: false, error: { code: 'NOT_FOUND', message: 'Account with id 99 not found' } }
```

---

### query(table, filters, options)

Retrieves multiple records matching filters.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| table | string | yes | Table name |
| filters | object | no | Filter criteria (see below) |
| options | object | no | Query options (see below) |

**Filter Syntax (EXACT - no other formats supported):**

```javascript
// Exact match
{ account_id: 1 }

// Multiple exact matches (AND logic)
{ account_id: 1, type: 'expense' }

// Value in list
{ type: { in: ['income', 'expense'] } }

// Greater than
{ amount: { gt: 100 } }

// Greater than or equal
{ amount: { gte: 100 } }

// Less than
{ amount: { lt: 100 } }

// Less than or equal
{ amount: { lte: 100 } }

// Between (inclusive)
{ date: { between: ['2024-01-01', '2024-01-31'] } }

// Combined filters (all conditions must match)
{
  type: 'expense',
  date: { between: ['2024-01-01', '2024-01-31'] },
  amount: { gte: 50 }
}
```

**Options:**
```javascript
{
  includeDeleted: false,  // Default: false. Set true to include soft-deleted records
  orderBy: 'date',        // Column to sort by
  order: 'desc',          // 'asc' or 'desc' (default: 'asc')
  limit: 100              // Maximum records to return
}
```

**Returns:**
```javascript
// Success (always returns array, empty if no matches)
{ ok: true, data: [{ id: 1, ... }, { id: 2, ... }] }

// Failure - invalid filter
{ ok: false, error: { code: 'INVALID_FILTER', message: 'Unsupported filter operator: regex' } }
```

**Examples:**
```javascript
// Get all checking accounts
const result = await db.query('accounts', { account_type: 'checking' });

// Get expenses over $50 in January
const result = await db.query('transactions', {
  type: 'expense',
  date: { between: ['2024-01-01', '2024-01-31'] },
  amount: { gt: 50 }
}, { orderBy: 'date', order: 'desc' });

// Get all records including deleted
const result = await db.query('accounts', {}, { includeDeleted: true });
```

---

## Event Functions

All event functions are in `core/events.js`.

### emit(eventName, data)

Broadcasts an event to all listeners.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventName | string | yes | Event name (see EVENT_CATALOG.md) |
| data | object | yes | Event payload matching catalog schema |

**Returns:** void (fire and forget)

**Example:**
```javascript
events.emit('transaction:created', { transaction: newTransaction });
```

**Note:** Events not in EVENT_CATALOG.md will log a warning but still emit.

---

### on(eventName, callback)

Subscribes to an event.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventName | string | yes | Event name to listen for |
| callback | function | yes | Function called with event data |

**Returns:** void

**Example:**
```javascript
events.on('transaction:created', (data) => {
  console.log('New transaction:', data.transaction);
  recalculateBalances();
});
```

---

### off(eventName, callback)

Unsubscribes from an event.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventName | string | yes | Event name |
| callback | function | yes | The exact function passed to `on()` |

**Returns:** void

**Example:**
```javascript
const handler = (data) => { /* ... */ };
events.on('transaction:created', handler);
// Later...
events.off('transaction:created', handler);
```

---

## Config Functions

All config functions are in `core/config.js`.

### get(key)

Retrieves a configuration value.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | yes | Config key |

**Available Keys:**
| Key | Type | Description |
|-----|------|-------------|
| `userName` | string | User's display name |
| `currentMonth` | string | Currently selected month (YYYY-MM) |
| `dbPath` | string | Path to database file (read-only) |

**Returns:**
```javascript
{ ok: true, data: 'Mathew' }
```

---

### set(key, value)

Sets a configuration value.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | yes | Config key |
| value | any | yes | Value to store |

**Returns:**
```javascript
{ ok: true, data: { key: 'userName', value: 'Mathew' } }
```

---

## Usage Pattern

Every module should follow this pattern:

```javascript
// Import core functions
const db = require('../../core/database');
const events = require('../../core/events');
const config = require('../../core/config');

// Always check result.ok before using result.data
async function createAccount(accountData) {
  const result = await db.insert('accounts', accountData);
  
  if (!result.ok) {
    // Handle error - show to user, log, etc.
    showError(result.error.message);
    return null;
  }
  
  // Success - emit event and return data
  events.emit('account:created', { account: result.data });
  return result.data;
}
```
