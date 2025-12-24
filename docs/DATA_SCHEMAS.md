# Data Schemas Reference

> **IMPORTANT:** This document defines the exact shape of all data in the application. All records must conform to these schemas. The core validates data against these schemas before any database write.

---

## Common Fields

All tables include these fields automatically:

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Auto-generated primary key |
| `created_at` | string | ISO 8601 timestamp when record was created |
| `updated_at` | string | ISO 8601 timestamp when record was last modified |
| `is_deleted` | integer | 0 = active, 1 = soft-deleted |

**Do not include these fields when inserting.** They are added automatically.

---

## Table: accounts

Stores bank accounts, credit cards, IRAs, etc.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `bank_name` | string | yes | min 1 char | Name of bank/institution |
| `account_type` | string | yes | enum | Type of account |
| `starting_balance` | number | yes | — | Initial balance when account was added |
| `effective_from` | string | no | YYYY-MM-DD | First month this account applies to |

**account_type enum values:**
- `checking`
- `savings`
- `credit`
- `ira`
- `other`

**Example:**
```javascript
{
  bank_name: 'Chase',
  account_type: 'checking',
  starting_balance: 1500.00
}
```

**Calculated Values (not stored):**
- `current_balance` = `starting_balance` + sum of income transactions - sum of expense transactions

---

## Table: income_sources

Stores planned/expected income.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `source_name` | string | yes | min 1 char | Name of income source (employer, client, etc.) |
| `income_type` | string | yes | enum | Type of income |
| `amount` | number | yes | positive | Expected amount per occurrence |
| `account_id` | integer | yes | valid account | Account where income is deposited |
| `pay_dates` | string | yes | JSON array | Array of dates (YYYY-MM-DD) |
| `effective_from` | string | no | YYYY-MM-DD | First month this income source applies to |

**income_type enum values:**
- `w2`
- `1099`
- `investment`
- `rental`
- `other`

**Example:**
```javascript
{
  source_name: 'RV Park',
  income_type: 'w2',
  amount: 1247.00,
  account_id: 1,
  pay_dates: '["2024-01-15", "2024-01-31"]'
}
```

**Note:** `pay_dates` is stored as a JSON string. Parse it when reading.

---

## Table: buckets

Stores expense bucket definitions. Pre-seeded, cannot be deleted.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | yes | min 1 char | Display name of bucket |
| `bucket_key` | string | yes | unique | System identifier |
| `color` | string | yes | hex color | Header color for UI |
| `sort_order` | integer | yes | — | Display order |

**Pre-seeded buckets:**
| bucket_key | Default Name | Color |
|------------|--------------|-------|
| `major_fixed` | Major Fixed Expense | #3B82F6 (blue) |
| `major_variable` | Major Variable Expense | #8B5CF6 (purple) |
| `minor_fixed` | Minor Fixed Expense | #10B981 (green) |
| `minor_variable` | Minor Variable Expense | #F59E0B (amber) |
| `goals` | Non-Standard Expense/Goals | #EC4899 (pink) |

**Note:** Users can rename buckets but cannot delete them or create new ones.

---

## Table: categories

Stores expense categories created by user.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | yes | min 1 char | Category name (e.g., "Groceries") |
| `bucket_id` | integer | yes | valid bucket | Which bucket this category belongs to |
| `effective_from` | string | no | YYYY-MM-DD | First month this category applies to |

**Example:**
```javascript
{
  name: 'Groceries',
  bucket_id: 2  // major_variable
}
```

---

## Table: planned_expenses

Stores budgeted/planned expenses within buckets.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `description` | string | yes | min 1 char | Description of expense |
| `amount` | number | yes | positive | Planned amount |
| `bucket_id` | integer | yes | valid bucket | Which bucket |
| `category_id` | integer | yes | valid category | Which category |
| `account_id` | integer | yes | valid account | Payment method |
| `due_dates` | string | yes | JSON array | Array of due dates (YYYY-MM-DD) |
| `effective_from` | string | no | YYYY-MM-DD | First month this expense applies to |

**Example:**
```javascript
{
  description: 'Monthly rent',
  amount: 1200.00,
  bucket_id: 1,  // major_fixed
  category_id: 5, // housing
  account_id: 1,
  due_dates: '["2024-01-01"]'
}
```

---

## Table: goals

Stores non-standard expenses and savings goals.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | yes | min 1 char | Goal name |
| `target_amount` | number | yes | positive | Amount needed to fully fund |
| `target_date` | string | yes | YYYY-MM-DD | Date goal should be funded by |
| `funded_amount` | number | no | >= 0 | Amount funded so far (default 0) |
| `effective_from` | string | no | YYYY-MM-DD | First month this goal applies to |

**Example:**
```javascript
{
  name: 'Emergency Fund',
  target_amount: 5000.00,
  target_date: '2024-12-31',
  funded_amount: 1250.00
}
```

**Calculated Values:**
- `progress_percent` = (`funded_amount` / `target_amount`) * 100

---

## Table: transactions

Stores actual income and expense transactions.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `date` | string | yes | YYYY-MM-DD | Transaction date |
| `type` | string | yes | enum | Income or expense |
| `amount` | number | yes | positive | Transaction amount (always positive) |
| `description` | string | no | — | User's note/description |
| `account_id` | integer | yes | valid account | Account affected |
| `bucket_id` | integer | conditional | valid bucket | Required if type = 'expense' |
| `category_id` | integer | conditional | valid category | Required if type = 'expense' |
| `income_source_id` | integer | conditional | valid source | Optional, links to income_sources |

**type enum values:**
- `income`
- `expense`

**Example (income):**
```javascript
{
  date: '2024-01-15',
  type: 'income',
  amount: 1247.00,
  description: 'Paycheck',
  account_id: 1,
  income_source_id: 1
}
```

**Example (expense):**
```javascript
{
  date: '2024-01-16',
  type: 'expense',
  amount: 129.43,
  description: 'Weekly groceries',
  account_id: 1,
  bucket_id: 2,
  category_id: 3
}
```

---

## Table: planning_scenarios

Stores saved planning page scenarios. Owned by Planning module.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | yes | min 1 char | Scenario name |
| `data` | string | yes | JSON | Complete scenario state |

**Note:** This table is owned by the Planning module. Other modules should not access it directly.

---

## Table: config

Stores application configuration. Key-value pairs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | yes | Configuration key (unique) |
| `value` | string | yes | Configuration value (JSON encoded) |

**System Keys:**
| Key | Type | Description |
|-----|------|-------------|
| `userName` | string | User's display name |
| `currentMonth` | string | Selected month (YYYY-MM) |
| `migrationVersion` | number | Last migration run |

---

## Validation Rules Summary

### String Fields
- Must be strings
- Required fields must have at least 1 character
- Trimmed of leading/trailing whitespace

### Number Fields
- Must be valid numbers
- `amount`, `starting_balance`, etc. can be decimals
- IDs must be positive integers

### Date Fields
- Must match format: `YYYY-MM-DD`
- Example: `2024-01-15`

### Enum Fields
- Must be exactly one of the allowed values
- Case-sensitive

### Foreign Keys
- Must reference an existing, non-deleted record
- Validation checks that referenced record exists

### JSON Array Fields
- Stored as JSON strings
- Must be valid JSON arrays
- Parse when reading: `JSON.parse(record.pay_dates)`
- Stringify when writing: `JSON.stringify(['2024-01-15'])`
