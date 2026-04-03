# Task 07: UI/UX Overhaul — Make It "Crazy Good"

## Priority: 🟠 HIGH

### 7.1 Glassmorphic Metric Cards

**File**: `components/shared/metric-card.tsx` (rewrite)

**Design**:
- Glass background with subtle gradient border
- Framer Motion hover lift (scale 1.02, shadow increase)
- Sparkline mini-chart in corner (recharts)
- Animated number counter on mount
- Trend indicator (↑12% green, ↓5% red)
- Status pulse dot for real-time data
- Gold accent line at top

---

### 7.2 Advanced Filter Bar

**New component**: `components/shared/filter-bar.tsx`

**Features**:
- Command menu style (cmdk trigger)
- Multi-select badges for status, priority, source
- Date range picker with presets (Today, This Week, This Month, This Quarter, Custom)
- Search input with real-time debounce
- Saved views toggle (load from `crmViews` table)
- Clear all / Reset filters
- URL sync (filters reflected in URL params)
- Filter count badge

---

### 7.3 Enhanced DataTable

**File**: `components/shared/data-table.tsx` (major upgrade)

**Features to add**:
- Column pinning (left/right sticky)
- Column visibility toggle
- Column reordering (drag-and-drop)
- Inline editing for quick updates
- Row selection with bulk action bar
- Export button (CSV, XLSX via exceljs)
- Infinite scroll with virtual rows
- Row hover preview tooltip
- Density toggle (compact/standard/comfortable)
- Column grouping headers

---

### 7.4 Dashboard Redesign

**File**: `app/(dashboard)/dashboard/page.tsx`

**Layout**:
```
┌──────────────────────────────────────────┐
│ Hero Section — Welcome + Key KPIs        │
│ (glassmorphic, gradient background)      │
├────────┬──────────┬──────────┬───────────┤
│ Leads  │ Revenue  │ Pipeline │ Tasks Due │
│ Card   │ Card     │ Card     │ Card      │
├────────┴──────────┴──────────┴───────────┤
│ Charts Row (2 columns)                    │
│ ┌─────────────────┐ ┌──────────────────┐ │
│ │ Pipeline Funnel  │ │ Revenue Trend    │ │
│ └─────────────────┘ └──────────────────┘ │
├───────────────────────────────────────────┤
│ Activity Feed      │ Calendar Preview    │
│ (real-time updates)│ (upcoming events)   │
└───────────────────────────────────────────┘
```

**Role-specific widgets**:
- CEO: Company-wide metrics, branch comparison
- Sales: Personal pipeline, targets, incentives
- HR: Attendance summary, pending approvals, upcoming reviews
- Support: Ticket queue, SLA status

---

### 7.5 Status Badges Upgrade

**File**: `components/shared/status-badge.tsx`

**Enhancements**:
- Pulse animation on active/pending statuses
- Color-coded with consistent palette per status type
- Icon prefix (check, clock, alert, x-circle)
- Size variants (sm, md, lg)
- Tooltip with last updated time

---

### 7.6 Sidebar Improvements

**File**: `components/layout/app-sidebar.tsx`

**Enhancements**:
- Role-based menu filtering (hide items user can't access)
- Module grouping with collapsible sections
- Active route highlighting with gold accent
- Badge counts on items (unread notifications, pending approvals)
- Entity/branch switcher at top
- Global search (Cmd+K) shortcut
- User avatar + quick profile card at bottom
- Keyboard navigation (arrow keys)

---

### 7.7 Loading States — Premium Skeletons

**Upgrade all loading.tsx files**:
- Consistent skeleton pattern matching the actual page layout
- Shimmer animation (already have keyframe)
- Staggered fade-in on data load
- Progress bar at top of page during navigation

---

### 7.8 Empty States

**File**: `components/shared/empty-state.tsx` (upgrade)

**Design**:
- Illustrated empty states with SVG art
- Action CTA button
- Helpful suggestion text
- Consistent across all modules

---

### 7.9 Dark Mode Theme

**Already have**: `next-themes` installed and `theme-provider.tsx`

**Fix**: Add proper dark mode CSS variables in `globals.css`:
```css
.dark {
  --background: #0f0f12;
  --foreground: #e4e4ed;
  --card: #1a1a22;
  --card-foreground: #e4e4ed;
  --primary: #d4a23a;
  --secondary: #1e40af;
  --muted: #2a2a35;
  --muted-foreground: #8b8ba0;
  --border: #2a2a35;
  --input: #2a2a35;
  /* ... all tokens */
}
```

**Acceptance Criteria**:
- Metric cards have glassmorphic design with animations
- Filter bar supports saved views and URL sync
- DataTable supports column pinning, export, inline edit
- Dashboard is role-specific with premium feel
- Dark mode fully functional
- All empty/loading states polished
