# Clarity Finance - Single Source of Truth (SSOT) Definition

> **Last Updated:** Phase X Preparation (Pre-Implementation)
> **Status:** ACTIVE GOVERNANCE DOCUMENT

---

## Purpose

This document establishes the definitive hierarchy and authority of all documentation in the Clarity Finance project. It answers: **"Which document do I trust when there's conflicting information?"**

---

## SSOT Hierarchy

### **Tier 1: Strategic Truth (What We're Building)**

| Document | Role | Authority | Updated When |
|----------|------|-----------|--------------|
| **END_STATE_VISION.md** | Complete product specification | FINAL AUTHORITY on feature scope, success criteria, and product requirements | New features planned or requirements change |

**What it supersedes:** All other documents for questions about "Should we build this?" or "What does complete look like?"

**Questions this answers:**
- What features should Clarity Finance have?
- What does success look like for this project?
- What are the technical requirements?
- What is out of scope?

---

### **Tier 2: Tactical Truth (Where We Are, What's Broken)**

| Document | Role | Authority | Updated When |
|----------|------|-----------|--------------|
| **PROJECT_STATUS.md** | Master checklist and phase tracker | FINAL AUTHORITY on what's complete, what's in progress, what's next | After each development session |
| **KNOWN_ISSUES.md** | Bug registry with priorities and details | FINAL AUTHORITY on what's broken, bug severity, and fix requirements | When bugs are discovered or fixed |

**What PROJECT_STATUS supersedes:**
- All phase-specific task lists (it IS the consolidated task list)
- Any conflicting completion status in handoff documents
- Timeline or "what's next" in any other document

**What KNOWN_ISSUES supersedes:**
- Bug mentions in handoff documents (KNOWN_ISSUES has complete details)
- Bug priorities mentioned elsewhere
- Fix recommendations in other docs (use KNOWN_ISSUES as source of truth)

**Questions these answer:**
- Is feature X complete? → **PROJECT_STATUS.md**
- What phase are we in? → **PROJECT_STATUS.md**
- What bugs exist? → **KNOWN_ISSUES.md**
- What should I fix first? → **KNOWN_ISSUES.md** (priority levels)

---

### **Tier 3: Operational Truth (How We Build)**

| Document | Role | Authority | Updated When |
|----------|------|-----------|--------------|
| **MODULE_GUIDELINES.md** | Architecture patterns and module isolation rules | FINAL AUTHORITY on how modules should be structured | When architectural patterns change |
| **CODE_STANDARDS.md** | Coding conventions and style guide | FINAL AUTHORITY on naming, error handling, function patterns | When coding standards evolve |
| **DATA_SCHEMAS.md** | Database table schemas and validation rules | FINAL AUTHORITY on data structure | When schema changes occur |
| **EVENT_CATALOG.md** | Complete event registry | FINAL AUTHORITY on which events exist and their payloads | When new events are added |
| **UI_PATTERNS.md** | Component patterns and design system | FINAL AUTHORITY on UI implementation | When UI patterns are updated |
| **CORE_API.md** | Core system API reference | FINAL AUTHORITY on core functionality | When core API changes |
| **DECISIONS.md** | Architectural decisions and reasoning | FINAL AUTHORITY on "why we chose this approach" | When major decisions are made |

**What these supersede:**
- Implementation details in handoff documents (use operational docs as reference)
- Code patterns mentioned in phase docs (operational docs are authoritative)

**Questions these answer:**
- How should I structure a module? → **MODULE_GUIDELINES.md**
- What naming convention should I use? → **CODE_STANDARDS.md**
- What does the accounts table look like? → **DATA_SCHEMAS.md**
- Does event X exist? → **EVENT_CATALOG.md**
- How do I build a card component? → **UI_PATTERNS.md**
- What core functions are available? → **CORE_API.md**
- Why did we choose Electron? → **DECISIONS.md**

---

### **Tier 4: Historical Truth (Session Transitions)**

| Document | Role | Authority | Updated When |
|----------|------|-----------|--------------|
| **PHASE[1-5]_HANDOFF.md** | Session continuity and context transfer | REFERENCE ONLY - describes what was built and how to start next phase | At phase completion |

**What these supersede:** Nothing - they are historical records only

**When to use:**
- Starting a new phase (read previous phase's handoff)
- Understanding why a decision was made in a specific phase
- Finding files created in a specific phase

**Questions these answer:**
- What did Phase 2 deliver? → **PHASE2_HANDOFF.md**
- What IPC channels were added in Phase 4? → **PHASE4_HANDOFF.md**
- What was deferred from Phase 3? → **PHASE3_HANDOFF.md**

⚠️ **Important:** If a handoff doc says "Issue X is P2" but KNOWN_ISSUES.md says "Issue X is P1", trust **KNOWN_ISSUES.md**.

---

### **Tier 5: Module Reference (API Documentation)**

Located in `docs/modules/`:

| Document | Role | Authority | Updated When |
|----------|------|-----------|--------------|
| **budget.md** | Budget module API and features | FINAL AUTHORITY on Budget module API | When Budget API changes |
| **ledger.md** | Ledger module API and features | FINAL AUTHORITY on Ledger module API | When Ledger API changes |
| **dashboard.md** | Dashboard module API and features | FINAL AUTHORITY on Dashboard module API | When Dashboard API changes |
| **planning.md** | Planning module API and features | FINAL AUTHORITY on Planning module API | When Planning API changes |
| **data-export.md** | Data module API and features | FINAL AUTHORITY on Data module API | When Data API changes |

**What these supersede:**
- Module implementation details in handoff documents
- Feature lists in other documents (module docs are authoritative for module-specific features)

**Questions these answer:**
- What functions does the Budget module export? → **budget.md**
- What events does the Ledger emit? → **ledger.md**
- What tables does Dashboard query? → **dashboard.md**

---

## Conflict Resolution Rules

### **When Documents Conflict:**

1. **Feature Scope Conflict:**
   - Example: END_STATE_VISION says "Activity log is optional" but PHASE_X_POLISH says "Activity log required"
   - **Resolution:** Trust **END_STATE_VISION.md** - it defines what's in scope

2. **Completion Status Conflict:**
   - Example: PHASE4_HANDOFF says "keyboard shortcuts complete" but PROJECT_STATUS says "keyboard shortcuts pending"
   - **Resolution:** Trust **PROJECT_STATUS.md** - it's the live tracker

3. **Bug Priority Conflict:**
   - Example: PHASE5_HANDOFF says "Issue #2 is P2" but KNOWN_ISSUES says "Issue #2 is P1"
   - **Resolution:** Trust **KNOWN_ISSUES.md** - priorities evolve based on testing

4. **Implementation Pattern Conflict:**
   - Example: PHASE2_HANDOFF shows inline editing pattern, but CODE_STANDARDS shows different pattern
   - **Resolution:** Trust **CODE_STANDARDS.md** - it's the living standard (but investigate if recent change)

5. **Schema Conflict:**
   - Example: Module doc says "accounts.balance" field exists, but DATA_SCHEMAS doesn't show it
   - **Resolution:** Trust **DATA_SCHEMAS.md** - it's the schema authority

---

## Document Update Responsibilities

### **Must Update Together:**

When you make these changes, update ALL documents in the group:

1. **Add a new feature:**
   - ✓ END_STATE_VISION.md (if changing scope)
   - ✓ PROJECT_STATUS.md (add to task list)
   - ✓ Relevant module doc (API changes)

2. **Complete a phase:**
   - ✓ Create PHASE[N]_HANDOFF.md
   - ✓ Update PROJECT_STATUS.md (mark tasks complete)
   - ✓ Update END_STATE_VISION.md (if scope changed)

3. **Discover a bug:**
   - ✓ Add to KNOWN_ISSUES.md (with priority)
   - ✓ Reference in PROJECT_STATUS.md (next phase tasks)

4. **Fix a bug:**
   - ✓ Move to "Resolved" in KNOWN_ISSUES.md
   - ✓ Mark complete in PROJECT_STATUS.md

5. **Change architecture:**
   - ✓ Add decision to DECISIONS.md
   - ✓ Update MODULE_GUIDELINES.md or CODE_STANDARDS.md
   - ✓ Update relevant module docs

---

## Quick Reference: "Where Do I Look?"

| Question | Document |
|----------|----------|
| Should we build feature X? | END_STATE_VISION.md |
| Is feature X complete? | PROJECT_STATUS.md |
| What bugs exist? | KNOWN_ISSUES.md |
| How do I structure a module? | MODULE_GUIDELINES.md |
| What naming convention? | CODE_STANDARDS.md |
| What's the accounts table schema? | DATA_SCHEMAS.md |
| Does event:xyz exist? | EVENT_CATALOG.md |
| How do I build a modal? | UI_PATTERNS.md |
| What did Phase 3 deliver? | PHASE3_HANDOFF.md |
| What functions does Budget export? | docs/modules/budget.md |
| Why did we choose SQLite? | DECISIONS.md |
| What core functions exist? | CORE_API.md |

---

## Deprecated/Superseded Documents

The following documents have been **deleted** or **consolidated** as of Phase X preparation:

| Document | Status | Superseded By | Reason |
|----------|--------|---------------|--------|
| PHASE_X_POLISH.md | **DELETED** | PROJECT_STATUS.md | Phase X tasks integrated into master checklist |
| PHASE_5_DATA_MODULE.md | **DELETED** | PHASE5_HANDOFF.md | Implementation plan for completed work |
| PHASE_5_IMPROVEMENTS.md | **DELETED** | PROJECT_STATUS.md + PHASE5_HANDOFF.md | Keyboard plan integrated into Phase X tasks |

---

## Document Count

**Total: 20 documentation files**

- Core Governance: 9 files
- Phase Handoffs: 5 files
- Quality Tracking: 1 file
- Module Docs: 5 files
- SSOT Definition: 1 file (this document)

---

## Summary: The Three Questions

When you're unsure which document to trust, ask:

1. **"What should we build?"** → END_STATE_VISION.md
2. **"Where are we now?"** → PROJECT_STATUS.md
3. **"What's broken?"** → KNOWN_ISSUES.md

Everything else supports these three sources of truth.

---

**This document is the definitive authority on documentation hierarchy. When in doubt, refer here.**
