// modules/data-export/service.js
// Service for exporting and importing all application data

const db = require('../../core/database');
const events = require('../../core/events');
const config = require('../../core/config');

/**
 * Export all data from the database
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function exportAllData() {
  try {
    // Define all tables to export
    const tables = [
      'accounts',
      'income_sources',
      'buckets',
      'categories',
      'planned_expenses',
      'goals',
      'transactions',
      'planning_scenarios',
      'config'
    ];

    const exportData = {};

    // Query each table and add to export data
    for (const table of tables) {
      const result = await db.query(table, {}, { includeDeleted: true });

      if (!result.ok) {
        return {
          ok: false,
          error: {
            code: 'EXPORT_ERROR',
            message: `Failed to export table '${table}': ${result.error.message}`
          }
        };
      }

      exportData[table] = result.data;
    }

    // Create export package with metadata
    const exportPackage = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      appName: 'Clarity Finance',
      data: exportData
    };

    // Emit export event
    events.emit('data:exported', {
      timestamp: exportPackage.exportDate,
      recordCount: Object.values(exportData).reduce((sum, arr) => sum + arr.length, 0)
    });

    return {
      ok: true,
      data: exportPackage
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'EXPORT_ERROR',
        message: `Unexpected error during export: ${error.message}`
      }
    };
  }
}

/**
 * Validate backup file structure
 * @param {object} backupData - The parsed backup JSON
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function validateBackup(backupData) {
  const validationErrors = [];

  // Check if backupData exists and is an object
  if (!backupData || typeof backupData !== 'object') {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid backup file: not a valid JSON object',
        details: []
      }
    };
  }

  // Check version
  if (!backupData.version) {
    validationErrors.push('Missing version field');
  } else if (backupData.version !== '1.0') {
    validationErrors.push(`Unsupported version: ${backupData.version} (expected 1.0)`);
  }

  // Check exportDate
  if (!backupData.exportDate) {
    validationErrors.push('Missing exportDate field');
  }

  // Check appName
  if (!backupData.appName || backupData.appName !== 'Clarity Finance') {
    validationErrors.push('Invalid or missing appName field');
  }

  // Check data object
  if (!backupData.data || typeof backupData.data !== 'object') {
    validationErrors.push('Missing or invalid data object');

    // Can't continue validation without data object
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Backup file is invalid',
        details: validationErrors
      }
    };
  }

  // Check required tables
  const requiredTables = [
    'accounts',
    'income_sources',
    'buckets',
    'categories',
    'planned_expenses',
    'goals',
    'transactions',
    'config'
  ];

  for (const table of requiredTables) {
    if (!backupData.data[table]) {
      validationErrors.push(`Missing required table: ${table}`);
    } else if (!Array.isArray(backupData.data[table])) {
      validationErrors.push(`Table '${table}' is not an array`);
    }
  }

  // If there are validation errors, return them
  if (validationErrors.length > 0) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Backup file validation failed',
        details: validationErrors
      }
    };
  }

  // Validation passed
  return {
    ok: true,
    data: {
      valid: true,
      version: backupData.version,
      exportDate: backupData.exportDate,
      recordCount: Object.values(backupData.data).reduce((sum, arr) => sum + arr.length, 0)
    }
  };
}

/**
 * Import data from backup file
 * @param {object} backupData - The validated backup data
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function importData(backupData) {
  try {
    // First validate the backup
    const validationResult = await validateBackup(backupData);
    if (!validationResult.ok) {
      return validationResult;
    }

    let totalImported = 0;
    let totalSkipped = 0;
    const importErrors = [];

    // Get the database connection (we need direct access for transaction)
    const dbConnection = db.getDb();

    if (!dbConnection) {
      return {
        ok: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database connection not available'
        }
      };
    }

    // Start transaction
    dbConnection.prepare('BEGIN TRANSACTION').run();

    try {
      // Delete existing data from all tables (preserve schema)
      const tablesToClear = [
        'transactions',
        'planning_scenarios',
        'goals',
        'planned_expenses',
        'categories',
        'income_sources',
        'accounts'
        // Note: We don't clear 'buckets' as they are system-defined
        // Note: We don't clear 'config' yet - will update selectively
      ];

      for (const table of tablesToClear) {
        dbConnection.prepare(`DELETE FROM ${table}`).run();
      }

      // Import data for each table
      const tables = [
        'accounts',
        'income_sources',
        'categories',
        'planned_expenses',
        'goals',
        'transactions',
        'planning_scenarios'
      ];

      for (const table of tables) {
        const records = backupData.data[table] || [];

        for (const record of records) {
          try {
            // Remove auto-generated fields that will be re-created
            const { id, created_at, updated_at, ...recordData } = record;

            // Insert the record
            const insertResult = await db.insert(table, recordData);

            if (insertResult.ok) {
              totalImported++;
            } else {
              totalSkipped++;
              importErrors.push({
                table,
                record: recordData,
                error: insertResult.error.message
              });
            }
          } catch (error) {
            totalSkipped++;
            importErrors.push({
              table,
              record: record,
              error: error.message
            });
          }
        }
      }

      // Update buckets (rename if different)
      const buckets = backupData.data.buckets || [];
      for (const bucket of buckets) {
        if (bucket.id && bucket.name) {
          // Only update the name, keep system bucket_key and color
          const updateResult = await db.update('buckets', bucket.id, {
            name: bucket.name
          });

          if (updateResult.ok) {
            totalImported++;
          } else {
            totalSkipped++;
          }
        }
      }

      // Import config (selective - don't overwrite all)
      const configRecords = backupData.data.config || [];
      for (const configRecord of configRecords) {
        if (configRecord.key && configRecord.value) {
          // Use config.set which handles updates properly
          await config.set(configRecord.key, JSON.parse(configRecord.value));
          totalImported++;
        }
      }

      // Commit transaction
      dbConnection.prepare('COMMIT').run();

      // Emit import event
      events.emit('data:imported', {
        timestamp: new Date().toISOString(),
        imported: totalImported,
        skipped: totalSkipped,
        errors: importErrors.length
      });

      return {
        ok: true,
        data: {
          imported: totalImported,
          skipped: totalSkipped,
          errors: importErrors.length > 0 ? importErrors : undefined
        }
      };

    } catch (error) {
      // Rollback on error
      dbConnection.prepare('ROLLBACK').run();
      throw error;
    }

  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'IMPORT_ERROR',
        message: `Failed to import data: ${error.message}`
      }
    };
  }
}

/**
 * Save data to local 'save data' folder
 * @returns {Promise<{ok: boolean, data?: {path: string}, error?: object}>}
 */
async function saveToFolder() {
  const fs = require('fs');
  const path = require('path');

  try {
    // Export all data
    const exportResult = await exportAllData();
    if (!exportResult.ok) {
      return exportResult;
    }

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `clarity-backup-${timestamp}.json`;

    // Create save data directory if it doesn't exist
    const saveDir = path.join(process.cwd(), 'save data');
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // Write file
    const savePath = path.join(saveDir, filename);
    fs.writeFileSync(savePath, JSON.stringify(exportResult.data, null, 2), 'utf8');

    events.emit('data:saved-to-folder', { path: savePath, timestamp });

    return {
      ok: true,
      data: { path: savePath, filename }
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'SAVE_ERROR',
        message: `Failed to save to folder: ${error.message}`
      }
    };
  }
}

module.exports = {
  exportAllData,
  validateBackup,
  importData,
  saveToFolder
};
