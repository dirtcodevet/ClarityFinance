/**
 * Data Schemas for Clarity Finance
 * 
 * These Zod schemas validate all data before it enters the database.
 * If data doesn't match the schema, it's rejected with a clear error.
 * 
 * See docs/DATA_SCHEMAS.md for documentation.
 */

const { z } = require('zod');

// ============================================================
// Common Patterns
// ============================================================

// Date format: YYYY-MM-DD
const dateString = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format'
);

// JSON array stored as string
const jsonArrayString = z.string().refine(
  (val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  },
  'Must be a valid JSON array string'
);

// Positive number (for amounts)
const positiveNumber = z.number().positive('Amount must be positive');

// Non-negative number (for funded amounts that can be 0)
const nonNegativeNumber = z.number().min(0, 'Amount cannot be negative');

// Non-empty string
const nonEmptyString = z.string().min(1, 'This field is required');

// ============================================================
// Account Schema
// ============================================================

const accountTypes = ['checking', 'savings', 'credit', 'ira', 'other'];

const AccountSchema = z.object({
  bank_name: nonEmptyString,
  account_type: z.enum(accountTypes, {
    errorMap: () => ({ message: `Account type must be one of: ${accountTypes.join(', ')}` })
  }),
  starting_balance: z.number(),
  starting_balance_date: dateString.optional(), // Optional for backward compatibility
  effective_from: dateString.optional() // When this account becomes active
});

// For updates, all fields are optional
const AccountUpdateSchema = AccountSchema.partial();

// ============================================================
// Income Source Schema
// ============================================================

const incomeTypes = ['w2', '1099', 'investment', 'rental', 'other'];

const IncomeSourceSchema = z.object({
  source_name: nonEmptyString,
  income_type: z.enum(incomeTypes, {
    errorMap: () => ({ message: `Income type must be one of: ${incomeTypes.join(', ')}` })
  }),
  amount: positiveNumber,
  account_id: z.number().int().positive('Account ID must be a positive integer'),
  pay_dates: jsonArrayString,
  effective_from: dateString.optional() // When this income source becomes active
});

const IncomeSourceUpdateSchema = IncomeSourceSchema.partial();

// ============================================================
// Bucket Schema
// ============================================================

const BucketSchema = z.object({
  name: nonEmptyString,
  bucket_key: nonEmptyString,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex color (e.g., #3B82F6)'),
  sort_order: z.number().int()
});

// Buckets can only update name (and color for customization)
const BucketUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

// ============================================================
// Category Schema
// ============================================================

const CategorySchema = z.object({
  name: nonEmptyString,
  bucket_id: z.number().int().positive('Bucket ID must be a positive integer')
});

const CategoryUpdateSchema = CategorySchema.partial();

// ============================================================
// Planned Expense Schema
// ============================================================

const PlannedExpenseSchema = z.object({
  description: nonEmptyString,
  amount: positiveNumber,
  bucket_id: z.number().int().positive('Bucket ID must be a positive integer'),
  category_id: z.number().int().positive('Category ID must be a positive integer'),
  account_id: z.number().int().positive('Account ID must be a positive integer'),
  due_dates: jsonArrayString,
  is_recurring: z.number().int().min(0).max(1).optional().default(0),
  recurrence_end_date: dateString.optional(),
  effective_from: dateString.optional() // When this planned expense becomes active
});

const PlannedExpenseUpdateSchema = PlannedExpenseSchema.partial();

// ============================================================
// Goal Schema
// ============================================================

const GoalSchema = z.object({
  name: nonEmptyString,
  target_amount: positiveNumber,
  target_date: dateString,
  funded_amount: nonNegativeNumber.optional().default(0),
  effective_from: dateString.optional() // When this goal becomes active
});

const GoalUpdateSchema = GoalSchema.partial();

// ============================================================
// Transaction Schema
// ============================================================

const transactionTypes = ['income', 'expense'];

const TransactionSchema = z.object({
  date: dateString,
  type: z.enum(transactionTypes, {
    errorMap: () => ({ message: `Transaction type must be one of: ${transactionTypes.join(', ')}` })
  }),
  amount: positiveNumber,
  description: z.string().optional(),
  account_id: z.number().int().positive('Account ID must be a positive integer'),
  bucket_id: z.number().int().positive('Bucket ID must be a positive integer').optional(),
  category_id: z.number().int().positive('Category ID must be a positive integer').optional(),
  income_source_id: z.number().int().positive('Income source ID must be a positive integer').optional()
}).refine(
  (data) => {
    // If type is 'expense', bucket_id and category_id are required
    if (data.type === 'expense') {
      return data.bucket_id !== undefined && data.category_id !== undefined;
    }
    return true;
  },
  {
    message: 'Expense transactions require bucket_id and category_id',
    path: ['bucket_id']
  }
);

const TransactionUpdateSchema = z.object({
  date: dateString.optional(),
  type: z.enum(transactionTypes).optional(),
  amount: positiveNumber.optional(),
  description: z.string().optional(),
  account_id: z.number().int().positive().optional(),
  bucket_id: z.number().int().positive().nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  income_source_id: z.number().int().positive().nullable().optional()
});

// ============================================================
// Planning Scenario Schema (owned by Planning module)
// ============================================================

const PlanningScenarioSchema = z.object({
  name: nonEmptyString,
  data: z.string() // JSON blob of scenario state
});

const PlanningScenarioUpdateSchema = PlanningScenarioSchema.partial();

// ============================================================
// Config Schema
// ============================================================

const ConfigSchema = z.object({
  key: nonEmptyString,
  value: z.string()
});

// ============================================================
// Schema Registry
// ============================================================

/**
 * Maps table names to their validation schemas.
 * Used by database.js to validate data before insert/update.
 */
const schemas = {
  accounts: {
    insert: AccountSchema,
    update: AccountUpdateSchema
  },
  income_sources: {
    insert: IncomeSourceSchema,
    update: IncomeSourceUpdateSchema
  },
  buckets: {
    insert: BucketSchema,
    update: BucketUpdateSchema
  },
  categories: {
    insert: CategorySchema,
    update: CategoryUpdateSchema
  },
  planned_expenses: {
    insert: PlannedExpenseSchema,
    update: PlannedExpenseUpdateSchema
  },
  goals: {
    insert: GoalSchema,
    update: GoalUpdateSchema
  },
  transactions: {
    insert: TransactionSchema,
    update: TransactionUpdateSchema
  },
  planning_scenarios: {
    insert: PlanningScenarioSchema,
    update: PlanningScenarioUpdateSchema
  },
  config: {
    insert: ConfigSchema,
    update: ConfigSchema.partial()
  }
};

/**
 * Validates data against a schema.
 * 
 * @param {string} table - Table name
 * @param {string} operation - 'insert' or 'update'
 * @param {object} data - Data to validate
 * @returns {{ ok: true, data: object } | { ok: false, error: { code: string, message: string } }}
 */
function validate(table, operation, data) {
  const tableSchemas = schemas[table];
  
  if (!tableSchemas) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Unknown table: ${table}`
      }
    };
  }
  
  const schema = tableSchemas[operation];
  
  if (!schema) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Unknown operation: ${operation}`
      }
    };
  }
  
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { ok: true, data: result.data };
  }
  
  // Format Zod errors into a readable message
  const errors = result.error.errors.map(e => {
    const path = e.path.join('.');
    return path ? `${path}: ${e.message}` : e.message;
  });
  
  return {
    ok: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: errors.join('; ')
    }
  };
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Individual schemas (for reference/testing)
  AccountSchema,
  IncomeSourceSchema,
  BucketSchema,
  CategorySchema,
  PlannedExpenseSchema,
  GoalSchema,
  TransactionSchema,
  PlanningScenarioSchema,
  ConfigSchema,
  
  // Schema registry
  schemas,
  
  // Validation function
  validate,
  
  // Enums for reference
  accountTypes,
  incomeTypes,
  transactionTypes
};
