# Task 07: UI/UX Overhaul — Make It "Crazy Good"

## Priority: HIGH | Effort: 6-8 days | Dependencies: Task 01 (Architecture) | Status: NOT STARTED

---

## PRD

### Problem Statement
The current UI is functional but lacks the premium, polished feel expected of an investment platform:
1. Metric cards are plain with no visual hierarchy or animations
2. Filter bars are basic dropdowns, not command-menu style
3. DataTable is custom (not TanStack Table) and lacks advanced features
4. Dashboard is one-size-fits-all, not role-optimized
5. Status badges are plain text with background colors
6. Loading states are basic skeletons, not matching page layout
7. No dark mode despite `next-themes` being installed
8. Empty states lack compelling illustrations and CTAs

### Goals
- Glassmorphic metric cards with animated counters and sparklines
- Command-menu style filter bar with saved views
- Enhanced DataTable with column pinning, export, inline editing
- Role-specific dashboard widgets
- Premium status badges with animations
- Dark mode with full color system
- Professional loading/empty states

### Non-Goals
- Complete redesign from scratch (enhance existing)
- New color palette (keep gold/blue brand colors)
- Custom icon library (keep Lucide)

### Success Criteria
- Visual quality matches top-tier SaaS products (Notion, Linear)
- Every page has polished loading, error, and empty states
- Dashboard loads role-specific widgets
- Dark mode fully functional
- Filter bar supports saved views with URL sync

## Rules to Follow
1. **Enhance, Don't Replace**: Build on existing components, don't create from scratch
2. **Performance Budget**: Animations must not degrade Lighthouse score
3. **Accessibility First**: All visual enhancements must maintain WCAG 2.1 AA
4. **Consistent Design Tokens**: All colors from CSS variables, no hardcoded hex values
5. **Mobile First**: Every enhancement must work on mobile
6. **Use Existing Libraries**: Recharts for charts, Framer Motion for animations (already installed)

---

## Implementation Steps

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

### 7.10 Accessibility Fixes

**Images without `alt` attributes** (7 `<img>` tags):
- `app/(dashboard)/chat/page.tsx`
- `app/(dashboard)/hr/expenses/create-expense-dialog.tsx`
- `app/(dashboard)/hr/expenses/page.tsx`
- `components/projects/ticket-details-dialog.tsx`
- `components/timesheets/log-time-dialog.tsx`

**5 Next.js `<Image>` components also lack `alt`**:
- `app/(dashboard)/ceo/qr-code/page.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
- `components/layout/app-sidebar.tsx`
- `components/timesheets/time-entry-detail-sheet.tsx`

**Raw `<img>` tags to migrate to `next/image`**:
- `app/(dashboard)/chat/page.tsx` — 4 instances
- `app/(dashboard)/hr/expenses/create-expense-dialog.tsx`
- `components/projects/ticket-details-dialog.tsx`
- `components/timesheets/log-time-dialog.tsx`

**14 form inputs without labels/ARIA**:
- File upload inputs and hidden inputs need `aria-label` for screen readers
- Key files: `chat/page.tsx`, `hr/expenses/`, `csv-upload-dialog.tsx`, `create-ticket-dialog.tsx`

**Non-interactive elements with onClick (2 files)**:
- `app/(dashboard)/projects/[id]/epics/page.tsx` — `<div onClick>` needs `role="button"` + `tabIndex`
- `components/expenses/receipt-viewer.tsx` — `<div onClick>` needs keyboard handler

### 7.11 Replace 181 Hardcoded Hex Colors

TSX files contain 181 hardcoded hex colors (e.g., `#3B82F6`, `#10B981`, `#EF4444` in Recharts, inline styles).

**Fix**: Create CSS variable mappings in `globals.css` and reference via `var(--chart-1)` etc.

---

## Checklist

- [ ] Rewrite `MetricCard` with glassmorphic design, animated counters, sparklines
- [ ] Create `FilterBar` with command-menu trigger, saved views, URL sync
- [ ] Enhance `DataTable` with column pinning, visibility toggle, export
- [ ] Add inline editing to DataTable for quick updates
- [ ] Redesign dashboard with role-specific widget layout
- [ ] Upgrade `StatusBadge` with pulse animations and icons
- [ ] Add entity/branch switcher to sidebar
- [ ] Add badge counts to sidebar items (notifications, approvals)
- [ ] Upgrade all loading.tsx with layout-matching skeletons
- [ ] Add top navigation progress bar during route transitions
- [ ] Upgrade empty states with illustrated SVGs and CTAs
- [ ] Implement dark mode CSS variables
- [ ] Add dark mode toggle in user settings
- [ ] Test all pages in dark mode
- [ ] Add `alt` attributes to all `<img>` and `<Image>` tags (12 files)
- [ ] Migrate raw `<img>` to `next/image` where applicable (7 files)
- [ ] Add `aria-label` to all form inputs without labels (14 inputs)
- [ ] Fix non-interactive `<div onClick>` with proper roles + keyboard handlers
- [ ] Replace 181 hardcoded hex colors with CSS variables
- [ ] Test responsive design at 320px, 768px, 1024px, 1440px
- [ ] Run Lighthouse audit, verify Performance > 90
- [ ] `pnpm build` passes

## Acceptance Criteria

1. Metric cards have glassmorphic design with animated counters
2. Filter bar supports saved views and URL sync
3. DataTable supports column pinning, export, inline edit
4. Dashboard shows role-specific widgets
5. Dark mode fully functional across all pages
6. All empty/loading states polished and consistent
7. Lighthouse Performance score > 90

## Testing Plan

1. **Visual**: Screenshot all pages before/after, verify improvement
2. **Dark Mode**: Toggle dark mode, verify all pages render correctly
3. **Responsive**: Test all pages at 320px, 768px, 1024px, 1440px
4. **Accessibility**: Run axe-core on all pages, verify zero critical issues
5. **Performance**: Run Lighthouse, verify no regressions
6. **Interactions**: Test all animations, hover effects, transitions
7. **Saved Views**: Save a filter view, reload page, verify view persists
