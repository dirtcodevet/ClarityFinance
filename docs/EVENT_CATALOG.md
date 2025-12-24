# Event Catalog

> **IMPORTANT:** This document lists all events in the application. Events not listed here will trigger a console warning. When adding new events, add them to this catalog first.

---

## Event Naming Convention

Events follow this pattern: `entity:action`

- **entity**: The type of thing affected (account, transaction, etc.)
- **action**: What happened (created, updated, deleted)

Module-specific events use: `modulename:action`

---

## Core Events

These events are emitted by core operations.

### database:initialized

Emitted when database is ready.

| Field | Type | Description |
|-------|------|-------------|
| `migrationsRun` | number | Number of migrations executed |

```javascript
events.on('database:initialized', (data) => {
  console.log(`Database ready. ${data.migrationsRun} migrations run.`);
});
```

---

## Account Events

### account:created

Emitted when a new account is created.

| Field | Type | Description |
|-------|------|-------------|
| `account` | Account | The created account object |

```javascript
events.emit('account:created', { account: newAccount });
```

### account:updated

Emitted when an account is modified.

| Field | Type | Description |
|-------|------|-------------|
| `account` | Account | The updated account object |
| `changes` | object | Fields that changed |

```javascript
events.emit('account:updated', { 
  account: updatedAccount, 
  changes: { starting_balance: 1500 } 
});
```

### account:deleted

Emitted when an account is soft-deleted.

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | ID of deleted account |

```javascript
events.emit('account:deleted', { id: 5 });
```

---

## Transaction Events

### transaction:created

Emitted when a new transaction is recorded.

| Field | Type | Description |
|-------|------|-------------|
| `transaction` | Transaction | The created transaction |

### transaction:updated

Emitted when a transaction is modified.

| Field | Type | Description |
|-------|------|-------------|
| `transaction` | Transaction | The updated transaction |
| `changes` | object | Fields that changed |

### transaction:deleted

Emitted when a transaction is soft-deleted.

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | ID of deleted transaction |

---

## Income Source Events

### income-source:created

| Field | Type | Description |
|-------|------|-------------|
| `incomeSource` | IncomeSource | The created income source |

### income-source:updated

| Field | Type | Description |
|-------|------|-------------|
| `incomeSource` | IncomeSource | The updated income source |
| `changes` | object | Fields that changed |

### income-source:deleted

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | ID of deleted income source |

---

## Category Events

### category:created

| Field | Type | Description |
|-------|------|-------------|
| `category` | Category | The created category |

### category:updated

| Field | Type | Description |
|-------|------|-------------|
| `category` | Category | The updated category |
| `changes` | object | Fields that changed |

### category:deleted

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | ID of deleted category |

---

## Bucket Events

### bucket:updated

Buckets can only be renamed, not created or deleted.

| Field | Type | Description |
|-------|------|-------------|
| `bucket` | Bucket | The updated bucket |
| `changes` | object | Fields that changed (usually just name) |

---

## Planned Expense Events

### planned-expense:created

| Field | Type | Description |
|-------|------|-------------|
| `plannedExpense` | PlannedExpense | The created planned expense |

### planned-expense:updated

| Field | Type | Description |
|-------|------|-------------|
| `plannedExpense` | PlannedExpense | The updated planned expense |
| `changes` | object | Fields that changed |

### planned-expense:deleted

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | ID of deleted planned expense |

---

## Goal Events

### goal:created

| Field | Type | Description |
|-------|------|-------------|
| `goal` | Goal | The created goal |

### goal:updated

| Field | Type | Description |
|-------|------|-------------|
| `goal` | Goal | The updated goal |
| `changes` | object | Fields that changed |

### goal:deleted

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | ID of deleted goal |

### goal:funded

Special event when money is added to a goal.

| Field | Type | Description |
|-------|------|-------------|
| `goal` | Goal | The goal that received funding |
| `amount` | number | Amount added |
| `newTotal` | number | New funded_amount |
| `isComplete` | boolean | True if goal is now fully funded |

---

## Config Events

### config:changed

Emitted when any configuration value changes.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Config key that changed |
| `value` | any | New value |
| `previousValue` | any | Old value |

```javascript
events.on('config:changed', (data) => {
  if (data.key === 'currentMonth') {
    refreshDashboard();
  }
});
```

---

## UI Events

### page:changed

Emitted when user navigates to a different page.

| Field | Type | Description |
|-------|------|-------------|
| `page` | string | New page name (dashboard, ledger, etc.) |
| `previousPage` | string | Previous page name |

### modal:opened

| Field | Type | Description |
|-------|------|-------------|
| `modalId` | string | Identifier of opened modal |

### modal:closed

| Field | Type | Description |
|-------|------|-------------|
| `modalId` | string | Identifier of closed modal |
| `action` | string | How it closed: 'save', 'cancel', 'escape', 'overlay' |

---

## Dashboard Module Events

These events are specific to the Dashboard module.

### dashboard:data-changed

Emitted when underlying data changes that may affect dashboard displays.
Dashboard listens to transaction, account, goal, and other events and re-emits this
to notify the UI that dashboard data may need to be refreshed.

| Field | Type | Description |
|-------|------|-------------|
| (varies) | object | Original event data passed through |

---

## Planning Module Events

These events are specific to the Planning module.

### planning:scenario-loaded

| Field | Type | Description |
|-------|------|-------------|
| `scenarioId` | number | ID of loaded scenario |
| `name` | string | Scenario name |

### planning:scenario-saved

| Field | Type | Description |
|-------|------|-------------|
| `scenarioId` | number | ID of saved scenario |
| `name` | string | Scenario name |

### planning:reset

Emitted when planning page is reset to defaults.

| Field | Type | Description |
|-------|------|-------------|
| (none) | â€” | â€” |

---

## Error Events

### error:validation

Emitted when validation fails. UI can use this for error display.

| Field | Type | Description |
|-------|------|-------------|
| `table` | string | Which table |
| `field` | string | Which field failed |
| `message` | string | Human-readable error |

### error:database

Emitted on unexpected database errors.

| Field | Type | Description |
|-------|------|-------------|
| `operation` | string | What operation failed |
| `message` | string | Error message |

---

## Adding New Events

When creating a new event:

1. **Add it to this catalog first**
2. Follow naming convention: `entity:action` or `module:action`
3. Document all fields in the event data
4. Use consistent field names (e.g., always `id` for identifiers)

```markdown
### eventname:action

Description of when this event is emitted.

| Field | Type | Description |
|-------|------|-------------|
| `fieldName` | type | description |
```
