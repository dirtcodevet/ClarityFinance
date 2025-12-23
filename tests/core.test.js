/**
 * Core Tests for Clarity Finance
 * 
 * Tests the core systems: database, validation, events.
 * Run with: npm test
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Use a temporary database for testing
const TEST_DB_PATH = path.join(os.tmpdir(), 'clarity-test-' + Date.now() + '.db');

// Clean up after tests
afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

// ============================================================
// Schema Validation Tests
// ============================================================

describe('Schema Validation', () => {
  const { validate, accountTypes, incomeTypes, transactionTypes } = require('../core/schemas');
  
  describe('Account validation', () => {
    test('accepts valid account data', () => {
      const result = validate('accounts', 'insert', {
        bank_name: 'Chase',
        account_type: 'checking',
        starting_balance: 1000
      });
      
      expect(result.ok).toBe(true);
      expect(result.data.bank_name).toBe('Chase');
    });
    
    test('rejects missing bank_name', () => {
      const result = validate('accounts', 'insert', {
        account_type: 'checking',
        starting_balance: 1000
      });
      
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('bank_name');
    });
    
    test('rejects invalid account_type', () => {
      const result = validate('accounts', 'insert', {
        bank_name: 'Chase',
        account_type: 'invalid_type',
        starting_balance: 1000
      });
      
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('Account type must be one of');
    });
    
    test('accepts all valid account types', () => {
      for (const type of accountTypes) {
        const result = validate('accounts', 'insert', {
          bank_name: 'Test Bank',
          account_type: type,
          starting_balance: 0
        });
        expect(result.ok).toBe(true);
      }
    });
  });
  
  describe('Transaction validation', () => {
    test('accepts valid income transaction', () => {
      const result = validate('transactions', 'insert', {
        date: '2024-01-15',
        type: 'income',
        amount: 1000,
        account_id: 1
      });
      
      expect(result.ok).toBe(true);
    });
    
    test('accepts valid expense transaction', () => {
      const result = validate('transactions', 'insert', {
        date: '2024-01-15',
        type: 'expense',
        amount: 50,
        account_id: 1,
        bucket_id: 1,
        category_id: 1
      });
      
      expect(result.ok).toBe(true);
    });
    
    test('rejects expense without bucket_id', () => {
      const result = validate('transactions', 'insert', {
        date: '2024-01-15',
        type: 'expense',
        amount: 50,
        account_id: 1,
        category_id: 1
      });
      
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('bucket_id');
    });
    
    test('rejects invalid date format', () => {
      const result = validate('transactions', 'insert', {
        date: '01/15/2024',
        type: 'income',
        amount: 1000,
        account_id: 1
      });
      
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('YYYY-MM-DD');
    });
    
    test('rejects negative amount', () => {
      const result = validate('transactions', 'insert', {
        date: '2024-01-15',
        type: 'income',
        amount: -100,
        account_id: 1
      });
      
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('positive');
    });
  });
  
  describe('Goal validation', () => {
    test('accepts valid goal', () => {
      const result = validate('goals', 'insert', {
        name: 'Emergency Fund',
        target_amount: 5000,
        target_date: '2024-12-31'
      });
      
      expect(result.ok).toBe(true);
      expect(result.data.funded_amount).toBe(0); // default
    });
    
    test('allows funded_amount of 0', () => {
      const result = validate('goals', 'insert', {
        name: 'Vacation',
        target_amount: 2000,
        target_date: '2024-06-01',
        funded_amount: 0
      });
      
      expect(result.ok).toBe(true);
    });
  });
  
  describe('Unknown table', () => {
    test('rejects unknown table name', () => {
      const result = validate('nonexistent_table', 'insert', {});
      
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('Unknown table');
    });
  });
});

// ============================================================
// Event System Tests
// ============================================================

describe('Event System', () => {
  const events = require('../core/events');
  
  beforeEach(() => {
    events.clear();
  });
  
  test('emits and receives events', () => {
    const callback = jest.fn();
    
    events.on('test:event', callback);
    events.emit('test:event', { value: 42 });
    
    expect(callback).toHaveBeenCalledWith({ value: 42 });
  });
  
  test('supports multiple listeners', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    
    events.on('test:event', callback1);
    events.on('test:event', callback2);
    events.emit('test:event', { data: 'test' });
    
    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });
  
  test('removes listeners with off()', () => {
    const callback = jest.fn();
    
    events.on('test:event', callback);
    events.off('test:event', callback);
    events.emit('test:event', {});
    
    expect(callback).not.toHaveBeenCalled();
  });
  
  test('counts listeners correctly', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    
    expect(events.listenerCount('test:event')).toBe(0);
    
    events.on('test:event', callback1);
    expect(events.listenerCount('test:event')).toBe(1);
    
    events.on('test:event', callback2);
    expect(events.listenerCount('test:event')).toBe(2);
    
    events.off('test:event', callback1);
    expect(events.listenerCount('test:event')).toBe(1);
  });
  
  test('recognizes cataloged events', () => {
    expect(events.isRegistered('account:created')).toBe(true);
    expect(events.isRegistered('transaction:deleted')).toBe(true);
    expect(events.isRegistered('made_up:event')).toBe(false);
  });
  
  test('allows registering new events', () => {
    expect(events.isRegistered('custom:event')).toBe(false);
    
    events.registerEvent('custom:event');
    
    expect(events.isRegistered('custom:event')).toBe(true);
  });
});

// ============================================================
// Database Tests
// ============================================================

describe('Database', () => {
  const db = require('../core/database');
  
  beforeAll(async () => {
    const result = await db.initialize(TEST_DB_PATH);
    expect(result.ok).toBe(true);
  });
  
  afterAll(() => {
    db.close();
  });
  
  describe('insert()', () => {
    test('inserts valid record and returns with id', () => {
      const result = db.insert('accounts', {
        bank_name: 'Test Bank',
        account_type: 'checking',
        starting_balance: 500
      });
      
      expect(result.ok).toBe(true);
      expect(result.data.id).toBeDefined();
      expect(result.data.bank_name).toBe('Test Bank');
      expect(result.data.created_at).toBeDefined();
      expect(result.data.updated_at).toBeDefined();
      expect(result.data.is_deleted).toBe(0);
    });
    
    test('rejects invalid record', () => {
      const result = db.insert('accounts', {
        account_type: 'checking',
        starting_balance: 500
        // missing bank_name
      });
      
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('getById()', () => {
    let testAccountId;
    
    beforeAll(() => {
      const result = db.insert('accounts', {
        bank_name: 'GetById Test',
        account_type: 'savings',
        starting_balance: 1000
      });
      testAccountId = result.data.id;
    });
    
    test('retrieves existing record', () => {
      const result = db.getById('accounts', testAccountId);
      
      expect(result.ok).toBe(true);
      expect(result.data.bank_name).toBe('GetById Test');
    });
    
    test('returns NOT_FOUND for missing record', () => {
      const result = db.getById('accounts', 99999);
      
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });
  });
  
  describe('update()', () => {
    let testAccountId;
    
    beforeAll(() => {
      const result = db.insert('accounts', {
        bank_name: 'Update Test',
        account_type: 'checking',
        starting_balance: 100
      });
      testAccountId = result.data.id;
    });
    
    test('updates existing record', () => {
      const result = db.update('accounts', testAccountId, {
        bank_name: 'Updated Name',
        starting_balance: 200
      });
      
      expect(result.ok).toBe(true);
      expect(result.data.bank_name).toBe('Updated Name');
      expect(result.data.starting_balance).toBe(200);
    });
    
    test('returns NOT_FOUND for missing record', () => {
      const result = db.update('accounts', 99999, { bank_name: 'New' });
      
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });
  });
  
  describe('delete()', () => {
    let testAccountId;
    
    beforeEach(() => {
      const result = db.insert('accounts', {
        bank_name: 'Delete Test',
        account_type: 'credit',
        starting_balance: 0
      });
      testAccountId = result.data.id;
    });
    
    test('soft deletes record', () => {
      const result = db.delete('accounts', testAccountId);
      
      expect(result.ok).toBe(true);
      expect(result.data.deleted).toBe(true);
      
      // Should not be found by default
      const getResult = db.getById('accounts', testAccountId);
      expect(getResult.ok).toBe(false);
      expect(getResult.error.code).toBe('NOT_FOUND');
    });
    
    test('deleted record visible with includeDeleted', () => {
      db.delete('accounts', testAccountId);
      
      const result = db.getById('accounts', testAccountId, { includeDeleted: true });
      
      expect(result.ok).toBe(true);
      expect(result.data.is_deleted).toBe(1);
    });
  });
  
  describe('query()', () => {
    beforeAll(() => {
      // Insert test transactions
      db.insert('accounts', {
        bank_name: 'Query Test Account',
        account_type: 'checking',
        starting_balance: 1000
      });
    });
    
    test('returns empty array when no matches', () => {
      const result = db.query('transactions', { type: 'nonexistent' });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
    });
    
    test('filters with exact match', () => {
      const result = db.query('accounts', { account_type: 'checking' });
      
      expect(result.ok).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every(a => a.account_type === 'checking')).toBe(true);
    });
    
    test('rejects unsupported filter operators', () => {
      const result = db.query('accounts', { 
        bank_name: { regex: '.*Test.*' } 
      });
      
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INVALID_FILTER');
      expect(result.error.message).toContain('Unsupported filter operator');
    });
    
    test('supports "in" operator', () => {
      const result = db.query('accounts', {
        account_type: { in: ['checking', 'savings'] }
      });
      
      expect(result.ok).toBe(true);
    });
    
    test('supports comparison operators', () => {
      const result = db.query('accounts', {
        starting_balance: { gte: 0 }
      });
      
      expect(result.ok).toBe(true);
    });
    
    test('excludes deleted records by default', () => {
      // Create and delete an account
      const created = db.insert('accounts', {
        bank_name: 'To Be Deleted',
        account_type: 'other',
        starting_balance: 0
      });
      db.delete('accounts', created.data.id);
      
      const result = db.query('accounts', { bank_name: 'To Be Deleted' });
      
      expect(result.ok).toBe(true);
      expect(result.data.length).toBe(0);
    });
  });
  
  describe('Buckets (pre-seeded)', () => {
    test('all 5 buckets exist', () => {
      const result = db.query('buckets', {});
      
      expect(result.ok).toBe(true);
      expect(result.data.length).toBe(5);
    });
    
    test('buckets have correct keys', () => {
      const result = db.query('buckets', {});
      const keys = result.data.map(b => b.bucket_key).sort();
      
      expect(keys).toEqual([
        'goals',
        'major_fixed',
        'major_variable',
        'minor_fixed',
        'minor_variable'
      ]);
    });
  });
});
