# Data Export Module

> **Status:** ✅ Complete (Phase 5)

## Purpose

The Data module provides:
- Tips and tricks for using the app
- Keyboard shortcuts reference
- Backup and export functionality
- Import and restore functionality with validation
- General budgeting advice

## Dependencies

- **Core:** database, events, config
- **Tables owned:** (none)
- **Tables read:** All tables (for export)
- **Events emitted:** `data:exported`, `data:imported`
- **Events listened:** (none)

## Public API

### exportAllData()

Exports all application data to a structured JSON object.

**Returns:** `{ ok: true, data: { version, exportDate, appName, data } }`

**Tables exported:**
- accounts
- income_sources
- buckets
- categories
- planned_expenses
- goals
- transactions
- planning_scenarios
- config

### validateBackup(backupData)

Validates backup file structure before import.

**Parameters:**
- `backupData` (object) - Parsed JSON backup object

**Returns:** `{ ok: true, data: { valid, version, exportDate, recordCount } }` or error

**Validation checks:**
- Version compatibility
- Required fields present
- All required tables exist
- Table data is array format

### importData(backupData)

Imports data from a validated backup file.

**Parameters:**
- `backupData` (object) - Validated backup object

**Returns:** `{ ok: true, data: { imported, skipped, errors } }` or error

**Process:**
1. Validates backup structure
2. Begins database transaction
3. Clears existing data (except system buckets)
4. Imports records table-by-table
5. Updates bucket names
6. Imports config settings
7. Commits transaction
8. Emits `data:imported` event

**Note:** Uses transactions to ensure atomic import - either all data imports successfully or none does.

## UI Components

### Backup & Restore Section
- **Export Backup button** - Saves all data to JSON file with timestamp
- **Import Backup button** - Opens file picker and imports backup
- **File input** - Hidden input for selecting backup JSON files

### Tips & Tricks Accordion
- **Getting Started** - Initial setup guide
- **Using the Ledger** - Transaction entry tips
- **Planning Your Budget** - Planning page guide
- **Keyboard Shortcuts** - Complete shortcut reference table
- **Best Practices** - Budgeting tips and recommendations

## Backup Format

```json
{
  "version": "1.0",
  "exportDate": "2024-12-21T16:30:00.000Z",
  "appName": "Clarity Finance",
  "data": {
    "accounts": [...],
    "income_sources": [...],
    "buckets": [...],
    "categories": [...],
    "planned_expenses": [...],
    "goals": [...],
    "transactions": [...],
    "planning_scenarios": [...],
    "config": [...]
  }
}
```

**File naming:** `clarity-finance-backup-YYYY-MM-DD-HHmmss.json`

**Format:** Pretty-printed JSON for human readability

## Implementation Notes

1. Export creates complete snapshot of all data including soft-deleted records
2. Import validation prevents corrupt backups from being loaded
3. Import shows confirmation modal before overwriting data
4. File dialogs use IPC handlers (`dialog:showSaveDialog`, `dialog:showOpenDialog`)
5. File I/O uses IPC handlers (`fs:writeFile`, `fs:readFile`) for security
6. Success/error feedback via toast notifications
7. Page reloads after successful import to reflect new data
8. Accordion uses single-panel-open pattern for better UX

## Session Log

| Date | Session | Notes |
|------|---------|-------|
| 2024-12-21 | Phase 5 | Initial implementation - complete |
