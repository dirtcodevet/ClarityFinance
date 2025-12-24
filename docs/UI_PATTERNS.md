# UI Patterns Reference

> **IMPORTANT:** This document defines the exact HTML structure and visual patterns for all UI components. Following these patterns ensures visual consistency across modules built in different sessions.

---

## Design Philosophy

Clarity Finance uses a **modern flat design** with:
- Flat cards with vibrant, colorful headers
- High-contrast charts with glass-look effects
- Gradient fills and solid colors
- Shadow borders for depth
- Clean, professional typography

---

## Color Palette

### Primary Colors (Bucket Headers)

```css
:root {
  --color-blue: #3B82F6;      /* Major Fixed */
  --color-purple: #8B5CF6;    /* Major Variable */
  --color-green: #10B981;     /* Minor Fixed */
  --color-amber: #F59E0B;     /* Minor Variable */
  --color-pink: #EC4899;      /* Goals */
}
```

### UI Colors

```css
:root {
  /* Backgrounds */
  --bg-primary: #F8FAFC;      /* Main app background */
  --bg-card: #FFFFFF;         /* Card backgrounds */
  --bg-sidebar: #1E293B;      /* Sidebar background */
  --bg-input: #F1F5F9;        /* Input field background */
  
  /* Text */
  --text-primary: #0F172A;    /* Main text */
  --text-secondary: #64748B;  /* Secondary/muted text */
  --text-inverse: #FFFFFF;    /* Text on dark backgrounds */
  
  /* Borders */
  --border-light: #E2E8F0;    /* Card borders, dividers */
  --border-focus: #3B82F6;    /* Focused input border */
  
  /* Status */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  
  /* Gradients */
  --gradient-progress: linear-gradient(90deg, #F59E0B, #EC4899, #8B5CF6);
  --gradient-insight: linear-gradient(135deg, transparent, rgba(249, 115, 22, 0.2));
}
```

### Chart Colors

```css
:root {
  --chart-line-projected: #3B82F6;
  --chart-line-actual: #10B981;
  --chart-grid: #E2E8F0;
  --chart-label: #0F172A;
}
```

---

## Typography

```css
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-display: 'Plus Jakarta Sans', var(--font-primary);
  
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
}
```

---

## Spacing Scale

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
}
```

---

## Component: Card

Standard flat card with colored header.

### HTML Structure

```html
<div class="card">
  <div class="card-header header-blue">
    <h3 class="card-title">Card Title</h3>
    <div class="card-actions">
      <button class="btn-icon" data-action="edit" title="Edit">
        <svg><!-- edit icon --></svg>
      </button>
    </div>
  </div>
  <div class="card-body">
    <!-- Card content here -->
  </div>
</div>
```

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.card` | Container with white background, border, shadow |
| `.card-header` | Header bar (add color class) |
| `.header-blue` | Blue header (#3B82F6) |
| `.header-purple` | Purple header (#8B5CF6) |
| `.header-green` | Green header (#10B981) |
| `.header-amber` | Amber header (#F59E0B) |
| `.header-pink` | Pink header (#EC4899) |
| `.card-title` | White text, bold |
| `.card-actions` | Right-aligned button container |
| `.card-body` | Padded content area |

### Variations

**Full-width card:**
```html
<div class="card card-full-width">
```

**Card with quick-add bar:**
```html
<div class="card">
  <div class="card-header header-blue">
    <h3 class="card-title">Income</h3>
  </div>
  <div class="quick-add-bar">
    <!-- Quick add inputs -->
  </div>
  <div class="card-body">
    <!-- List content -->
  </div>
</div>
```

---

## Component: Quick Add Bar

Input bar for rapidly adding items.

### HTML Structure

```html
<div class="quick-add-bar">
  <div class="quick-add-field">
    <label class="quick-add-label">Source</label>
    <input type="text" class="quick-add-input" placeholder="Income source...">
  </div>
  <div class="quick-add-field">
    <label class="quick-add-label">Amount</label>
    <input type="number" class="quick-add-input" placeholder="0.00">
  </div>
  <div class="quick-add-field">
    <label class="quick-add-label">Type</label>
    <select class="quick-add-select">
      <option value="w2">W2</option>
      <option value="1099">1099</option>
    </select>
  </div>
  <div class="quick-add-field">
    <label class="quick-add-label">Date</label>
    <input type="date" class="quick-add-input">
  </div>
  <button class="quick-add-submit" title="Add">
    <svg><!-- plus icon --></svg>
  </button>
</div>
```

### Keyboard Behavior

- **Tab**: Move to next field
- **Enter**: Submit and create new item, then focus first field
- **Ctrl+Z**: Undo last action

---

## Component: Modal

Pop-up window for editing items. NOT a system dialog.

### HTML Structure

```html
<div class="modal-overlay" data-modal="edit-account">
  <div class="modal">
    <div class="modal-header">
      <h3 class="modal-title">Edit Account</h3>
      <button class="modal-close" data-action="close">
        <svg><!-- X icon --></svg>
      </button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Bank Name</label>
        <input type="text" class="form-input" name="bank_name">
      </div>
      <div class="form-group">
        <label class="form-label">Account Type</label>
        <select class="form-select" name="account_type">
          <option value="checking">Checking</option>
          <option value="savings">Savings</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="cancel">Cancel</button>
      <button class="btn btn-primary" data-action="save">Save</button>
    </div>
  </div>
</div>
```

### Behavior

- Click overlay (outside modal) = close without saving
- Escape key = close without saving
- Enter key = submit (if form is valid)
- Modal should trap focus (tab stays within modal)

---

## Component: Data Table

Table displaying list of items with edit/delete actions.

### HTML Structure

```html
<div class="data-table-container">
  <table class="data-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
        <th>Date</th>
        <th class="col-actions">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr data-id="1">
        <td>Monthly rent</td>
        <td class="col-currency">$1,200.00</td>
        <td>2024-01-01</td>
        <td class="col-actions">
          <button class="btn-icon" data-action="edit" title="Edit">
            <svg><!-- edit icon --></svg>
          </button>
          <button class="btn-icon btn-icon-danger" data-action="delete" title="Delete">
            <svg><!-- trash icon --></svg>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Cell Types

| Class | Purpose |
|-------|---------|
| `.col-currency` | Right-aligned, formatted as currency |
| `.col-actions` | Right-aligned, contains action buttons |
| `.col-date` | Formatted date display |

---

## Component: Progress Bar

For goals showing funding progress.

### HTML Structure

```html
<div class="progress-container">
  <div class="progress-info">
    <span class="progress-label">Emergency Fund</span>
    <span class="progress-values">$1,250 / $5,000</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" style="width: 25%"></div>
  </div>
  <span class="progress-percent">25%</span>
</div>
```

### States

- Under 100%: Gradient fill (`--gradient-progress`)
- At 100%: Solid purple (`--color-purple`)

---

## Component: Sidebar Navigation

### HTML Structure

```html
<nav class="sidebar">
  <div class="sidebar-header">
    <span class="user-name">Mathew</span>
    <button class="btn-icon" data-action="edit-name" title="Edit name">
      <svg><!-- edit icon --></svg>
    </button>
  </div>
  
  <ul class="nav-list">
    <li class="nav-item active" data-page="dashboard">
      <svg class="nav-icon"><!-- dashboard icon --></svg>
      <span class="nav-label">Dashboard</span>
    </li>
    <li class="nav-item" data-page="ledger">
      <svg class="nav-icon"><!-- ledger icon --></svg>
      <span class="nav-label">Ledger</span>
    </li>
    <li class="nav-item" data-page="budget">
      <svg class="nav-icon"><!-- budget icon --></svg>
      <span class="nav-label">Budget</span>
    </li>
    <li class="nav-item" data-page="planning">
      <svg class="nav-icon"><!-- planning icon --></svg>
      <span class="nav-label">Planning</span>
    </li>
    <li class="nav-item" data-page="data">
      <svg class="nav-icon"><!-- data icon --></svg>
      <span class="nav-label">Data</span>
    </li>
  </ul>
</nav>
```

---

## Component: Header Bar

### HTML Structure

```html
<header class="header">
  <div class="header-left">
    <!-- Page title set by current page -->
    <h1 class="page-title">Dashboard</h1>
  </div>
  <div class="header-right">
    <div class="month-selector">
      <button class="btn-icon" data-action="prev-month">
        <svg><!-- left arrow --></svg>
      </button>
      <span class="current-month">January 2024</span>
      <button class="btn-icon" data-action="next-month">
        <svg><!-- right arrow --></svg>
      </button>
    </div>
    <button class="btn btn-primary" data-action="save">
      <svg><!-- save icon --></svg>
      Save
    </button>
  </div>
</header>
```

---

## Component: Button

### HTML Structure

```html
<!-- Primary button -->
<button class="btn btn-primary">Save Changes</button>

<!-- Secondary button -->
<button class="btn btn-secondary">Cancel</button>

<!-- Danger button -->
<button class="btn btn-danger">Delete</button>

<!-- Icon button -->
<button class="btn-icon" title="Edit">
  <svg><!-- icon --></svg>
</button>

<!-- Icon button (danger variant) -->
<button class="btn-icon btn-icon-danger" title="Delete">
  <svg><!-- icon --></svg>
</button>
```

---

## Component: Form Inputs

### HTML Structure

```html
<!-- Text input -->
<div class="form-group">
  <label class="form-label">Bank Name</label>
  <input type="text" class="form-input" placeholder="Enter bank name...">
  <span class="form-error">Bank name is required</span>
</div>

<!-- Select dropdown -->
<div class="form-group">
  <label class="form-label">Account Type</label>
  <select class="form-select">
    <option value="">Select type...</option>
    <option value="checking">Checking</option>
    <option value="savings">Savings</option>
  </select>
</div>

<!-- Date input -->
<div class="form-group">
  <label class="form-label">Due Date</label>
  <input type="date" class="form-input">
</div>

<!-- Currency input -->
<div class="form-group">
  <label class="form-label">Amount</label>
  <div class="input-with-prefix">
    <span class="input-prefix">$</span>
    <input type="number" class="form-input" step="0.01" placeholder="0.00">
  </div>
</div>
```

---

## Page Layout

### HTML Structure

```html
<div class="app">
  <nav class="sidebar">
    <!-- Sidebar content -->
  </nav>
  
  <main class="main-content">
    <header class="header">
      <!-- Header content -->
    </header>
    
    <div class="page-content">
      <!-- Current page content -->
    </div>
  </main>
</div>
```

### Layout Dimensions

```css
:root {
  --sidebar-width: 240px;
  --header-height: 64px;
  --content-padding: var(--space-6);
  --card-border-radius: 8px;
  --input-border-radius: 6px;
}
```

---

## Icons

Use inline SVGs for icons. Standard size: 20x20px.

### Required Icons

| Name | Used For |
|------|----------|
| dashboard | Nav: Dashboard |
| list | Nav: Ledger |
| wallet | Nav: Budget |
| trending-up | Nav: Planning |
| database | Nav: Data |
| edit | Edit buttons |
| trash | Delete buttons |
| plus | Add buttons |
| x | Close/cancel |
| chevron-left | Previous |
| chevron-right | Next |
| save | Save button |
| refresh | Reset/refresh |
| lightbulb | Insights |

---

## Confirmation Dialog

For delete confirmations.

### HTML Structure

```html
<div class="modal-overlay" data-modal="confirm-delete">
  <div class="modal modal-small">
    <div class="modal-body">
      <p class="confirm-message">Are you sure you want to delete this item?</p>
      <p class="confirm-warning">This action cannot be undone.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="cancel">No, Cancel</button>
      <button class="btn btn-danger" data-action="confirm">Yes, Delete</button>
    </div>
  </div>
</div>
```
