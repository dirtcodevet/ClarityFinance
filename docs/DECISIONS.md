# Clarity Finance - Architectural Decisions Log

This document records significant architectural decisions and the reasoning behind them. Future sessions should consult this before making changes that might conflict with established decisions.

---

## Decision 001: V1 Sync Strategy - Local Only

**Date:** Phase 0
**Status:** Final

**Context:**
User requires cross-device sync via iCloud/OneDrive without paid servers. SQLite + cloud folder sync is risky due to:
- Conflicted copies when editing from multiple devices
- Potential corruption if sync catches file mid-write
- No built-in conflict resolution

**Decision:**
V1 is **local-only**. Database stored in app's local data folder, not in cloud-synced folder.

**Future Path:**
When implementing sync (Phase 6+), use append-only event log approach:
- Changes written as JSON events to a log file
- Log file syncs via iCloud/OneDrive (append-only = mergeable)
- Local SQLite rebuilt from event log
- Conflicts resolved by merging logs

**Schema Preparation:**
All tables include `created_at`, `updated_at`, `is_deleted` to support future sync.

**Consequences:**
- V1 works only on single device
- Export/import feature (Phase 5) allows manual data transfer
- Future sync is possible without schema changes

---

## Decision 002: Structured Error Returns (No Exceptions)

**Date:** Phase 0
**Status:** Final

**Context:**
Need consistent error handling across all modules. Two options:
1. Throw exceptions, catch in UI
2. Return structured results, check in caller

**Decision:**
All core functions return structured results:

```javascript
// Success
{ ok: true, data: <result> }

// Failure
{ ok: false, error: { code: 'ERROR_CODE', message: 'Human readable message' } }
```

**Reasoning:**
- Predictable behavior everywhere
- No try/catch scattered through modules
- Errors are data, not exceptions
- Easier to test
- Matches user's learning level (explicit > implicit)

**Consequences:**
- All core functions must follow this pattern
- Modules check `result.ok` before using `result.data`
- UI layer responsible for displaying error messages

---

## Decision 003: Zod Runtime Schema Validation

**Date:** Phase 0
**Status:** Final

**Context:**
Need to prevent "new code breaks old code" by validating data shapes at runtime.

**Decision:**
Use Zod library for schema validation. All data entering the database is validated against Zod schemas.

**Reasoning:**
- Runtime validation catches errors immediately
- Clear, specific error messages
- Schemas serve as documentation
- Works with plain JavaScript (no TypeScript required)
- Lightweight library

**Consequences:**
- All schemas defined in `core/schemas.js`
- Invalid data rejected with clear error before database write
- Modules cannot bypass validation

---

## Decision 004: Soft Deletes

**Date:** Phase 0
**Status:** Final

**Context:**
Hard deletes (removing rows) are:
- Irreversible
- Problematic for future sync (can't sync a deletion)
- Risky for user data

**Decision:**
All "deletes" set `is_deleted = 1` instead of removing the row.

**Implementation:**
- All tables have `is_deleted` column (default 0)
- `delete()` function sets `is_deleted = 1` and `updated_at = now`
- `query()` function excludes deleted records by default
- `query()` accepts `includeDeleted: true` option for recovery features

**Consequences:**
- Data is never truly lost
- Future sync can propagate deletions
- Database grows over time (acceptable for personal finance app)
- Recovery feature possible in future

---

## Decision 005: Module Isolation

**Date:** Phase 0
**Status:** Final

**Context:**
Prevent modules from creating hidden dependencies on each other.

**Decision:**
Modules cannot import from other modules. Only allowed imports:
- From `core/*`
- From own module folder
- From `ui/components/*` (shared UI)

**Communication Between Modules:**
- Emit/listen to events via `core/events.js`
- Query shared database tables via `core/database.js`

**Enforcement:**
- Folder structure makes violation obvious
- Code review / linting can catch violations
- Documented in CODE_STANDARDS.md

**Consequences:**
- Modules are truly independent
- Can build/test modules in isolation
- Clear data flow through core

---

## Decision 006: Tech Stack

**Date:** Phase 0
**Status:** Final

**Decision:**
- **UI Framework:** Electron (desktop app using web technologies)
- **Frontend:** Vanilla HTML/CSS/JavaScript (no React for V1)
- **Database:** SQLite via better-sqlite3
- **Validation:** Zod
- **Testing:** Jest

**Reasoning:**
- Electron: Mature, good documentation, future path to mobile patterns
- Vanilla JS: Simpler for learning, no build step, easier debugging
- SQLite: File-based, no server, well-supported
- Zod: Lightweight, excellent errors, works with plain JS

**Future Path:**
- Can add React later if UI complexity warrants it
- React Native for mobile would share patterns
- Core logic is UI-framework agnostic

---

## Decision 007: Filter Syntax Specification

**Date:** Phase 0
**Status:** Final

**Context:**
Vague filter syntax leads to modules inventing incompatible query dialects.

**Decision:**
Exact filter syntax defined and enforced. See CORE_API.md for complete specification.

**Supported Filters:**
- Exact match: `{ field: value }`
- Multiple match (AND): `{ field1: value1, field2: value2 }`
- In list: `{ field: { in: [values] } }`
- Comparisons: `{ field: { gt|gte|lt|lte: value } }`
- Between: `{ field: { between: [start, end] } }`

**Consequences:**
- Any filter not in this list is rejected by core
- Modules cannot invent new filter types
- Adding new filter types requires updating core + documentation

---

## Template for New Decisions

```markdown
## Decision XXX: Title

**Date:** Phase X
**Status:** Proposed | Final | Superseded by XXX

**Context:**
What problem are we solving? What constraints exist?

**Decision:**
What did we decide?

**Reasoning:**
Why this choice over alternatives?

**Consequences:**
What does this mean for the codebase?
```
