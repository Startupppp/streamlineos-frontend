# MASTER ENGINEERING PROMPT
**Last Updated**: April 09, 2026  
**Status**: Active Refactoring & Bug Fix Initiative  
**Scope**: Full-stack Next.js/React HR + CRM + Sales + Marketing Platform

---

## 🎯 PRIMARY OBJECTIVES (Priority Order)

### Phase 1: Critical Bug Fixes (11 Bugs)
1. **1-on-1 Scheduling**: Form validation error with valid inputs → Fix field binding & API payload
2. **Asset Status Dropdown**: Missing status selector in Add Asset form → Add dropdown with Available/Assigned/Maintenance
3. **Cycle Management**: No preview/edit/delete actions on cycles → Add action menu (3-dot or buttons)
4. **Candidates Module**: Misplaced "Apply to Job" button → Move to Jobs module, remove from Candidates
5. **Create Deal Modal**: Replace with side sheet, fix spacing/padding
6. **Create Organization Modal**: Replace with side sheet instead of centered dialog
7. **Payslip Download**: Download button non-functional → Debug API integration & add response handling
8. **Helpdesk/Exit Modules**: Visible only to HR/CEO → Enable for all employees via permissions
9. **Exit Workflow**: Missing resignation flow, notifications, approvals → Implement full workflow + notifications
10. **Termination Email**: No email sent to terminated employee → Add email notification via background job
11. **Notice Period**: Should be auto-fixed (60 days) and non-editable → Lock field, auto-calculate Last Working Day

### Phase 2: Architecture & Code Quality
- **Max 500 lines per file** → Split all oversized files
- **Refactor all pages with `PageWrapper`** → Consistent title/subtitle/actions/filters
- **Zero comments** → Self-documenting code only
- **Strict TypeScript** → No `any`, no assertions
- **Remove dead code** → Scan and delete orphaned components
- **Fix auth flows** → Use middleware, remove `useEffect`-based checks
- **Server components by default** → Only `"use client"` when needed
- **Named handlers** → No anonymous inline functions

### Phase 3: UI/UX Polish
- **Auth pages**: Left form + right animation (layout-level)
- **Landing page**: Animated, Framer Motion, crazy-looking
- **Dashboard**: Role-based analytics, optimized layout
- **Remove overlapping spacing** → Audit & normalize padding/margin/gaps
- **Color palette consistency** → Fix text/background contrast, use shadcn palette
- **Skeleton loading** → Only show skeletons for affected sections, not full screen
- **Filter redesign** → Remove excessive padding, use full width where applicable
- **Table actions** → 1 action = inline, 3+ actions = 3-dot menu with icons
- **Calendar component** → Replace HTML date inputs globally
- **Bottom sheet scrolling** → Fixed header/footer, only content scrolls
- **Responsive forms** → Select fields expand, paired fields on same row

---

## 📋 CRITICAL RULES (MUST FOLLOW)

### Next.js Rules
1. **Use `layout.tsx`** for shared structure (header, sidebar) — NO shell wrappers
2. **Use `<Link>` (not `<a>`)** for internal navigation
3. **Use `<Image>` (not `<img>`)** for all images
4. **Server Components by default** — only `"use client"` for interactivity/hooks
5. **Middleware for auth** — NO `useEffect` redirects in pages
6. **Server Actions for mutations** — prefer over API routes for form submissions
7. **Every route needs** `loading.tsx`, `error.tsx`, `not-found.tsx` (dynamic routes)
8. **Dynamic routes** → Use descriptive param names: `[employeeId]`, `[dealId]`, not `[id]`

### React Rules
9. **No unnecessary `useEffect`** → Use `useMemo` for derived state
10. **No anonymous inline handlers** → Use `useCallback` with named functions
11. **Proper `key` props** → Never use index, always use unique ID
12. **No prop drilling** → Use Context for 3+ levels, composition otherwise
13. **URL state for filters** → `useSearchParams` + `useRouter` for persistence
14. **TanStack Query** → Use for all async data; handle cache updates vs invalidation
15. **Proper typing** → No `as any`, use `InferSelectModel`, strict interfaces

### Code Organization
16. **Max 500 lines per file** → Split into `_components/` (routes) or `features/` (reusable)
17. **File naming** → `kebab-case.tsx` (components), `use-kebab-case.ts` (hooks), `kebab-case.ts` (utils)
18. **Handler naming** → `handle{Event}` (handlers), `on{Event}` (props), `is/has/can` (booleans)
19. **Extract utilities** → `lib/utils/format-date.ts`, `lib/utils/format-currency.ts`, etc.
20. **Consistent patterns** → Reference existing implementations (e.g., Projects tab structure for all modules)

### UI/UX Rules
21. **No overlapping padding** → Parent + child should not double padding (audit all section + nested pairs)
22. **Scroll regions** → Only intended content scrolls; header/footer stay fixed (use `ScrollArea`)
23. **Color palette only** → Use shadcn palette exclusively; fix all text/background contrast issues
24. **Shadcn components only** → Replace custom/HTML date inputs, selects, etc.
25. **Icon sizing** → 16px for inline, 24px max for decorative
26. **Responsive grids** → `Select` and similar controls grow to fill available width
27. **Bottom sheet layout** → Header fixed, footer fixed, only middle scrolls
28. **Action density** → 1 action = inline button; 3+ actions = 3-dot menu
29. **Confirmation dialogs** → Use existing `ConfirmDialog` for all destructive actions
30. **Logo branding** → Make bigger and bolder across platform

### Cleanup Rules
31. **No comments** → Code should be self-documenting
32. **No dead code** → Delete unused imports, functions, orphaned components
33. **No `eslint-disable`** → Fix the underlying issue
34. **No `console.log`** → Remove all debug logs
35. **No `as any` assertions** → Use proper typing

---

## 🐛 BUG FIX CHECKLIST

### 1-on-1 Scheduling (HIGH)
- [ ] Check form component binding (employee, date fields)
- [ ] Verify API payload includes both `employeeId` and `date`
- [ ] Add time field (required or with default)
- [ ] Update validation to check actual values, not just UI state
- [ ] Improve error message: "Please select employee, date, and time"
- [ ] Test with employee "Prazith Chinna"

### Asset Status Dropdown (MEDIUM)
- [ ] Add `<Select>` dropdown in Add Asset form
- [ ] Options: Available, Assigned, Maintenance
- [ ] Make it required field
- [ ] Store in API payload
- [ ] Validate before submission

### Cycle Management (HIGH)
- [ ] Add action menu to cycle cards
- [ ] Implement Preview (modal or drawer)
- [ ] Implement Edit (side sheet)
- [ ] Implement Delete (with `ConfirmDialog`)
- [ ] Wire to backend mutations
- [ ] Update cache after mutations

### Candidates Module (MEDIUM)
- [ ] Remove "Apply to Job" from Candidates profile
- [ ] Move feature to Jobs module if needed
- [ ] Verify no orphaned code left

### Create Deal Modal → Side Sheet (MEDIUM)
- [ ] Replace modal with side sheet (right panel)
- [ ] Fix spacing: 16–24px between fields
- [ ] Use 2-column grid where applicable
- [ ] Fixed footer with "Create Deal" button
- [ ] Only form content scrolls
- [ ] Test with long forms

### Create Organization Modal → Side Sheet (MEDIUM)
- [ ] Replace modal with side sheet
- [ ] Apply same spacing/layout rules as Deal form
- [ ] Keep organization list visible in background

### Payslip Download (HIGH)
- [ ] Debug API endpoint `/api/payroll/payslip`
- [ ] Verify payload (month, employeeId)
- [ ] Add response handling (blob → download or preview)
- [ ] Show success/error toast
- [ ] Test with different months and statuses

### Helpdesk/Exit Modules Visibility (HIGH)
- [ ] Check permission/role logic for visibility
- [ ] Enable for all employees (remove HR/CEO restriction)
- [ ] Test with non-admin account
- [ ] Verify both modules appear in sidebar

### Exit Workflow (HIGH)
- [ ] Implement resignation submission form
- [ ] Add optional resignation template dropdown
- [ ] Send notification to HR/CEO (email + in-app)
- [ ] Create HR approval/rejection workflow
- [ ] Send confirmation email to employee after approval
- [ ] Mark employee status as "Resigned" pending approval
- [ ] Implement calendar/date for Last Working Day

### Termination Email (HIGH)
- [ ] Add email trigger when "Terminate" action executed
- [ ] Email content: termination date, access removal, HR contact
- [ ] Use background job or server action
- [ ] Add email template
- [ ] Test email delivery

### Notice Period Auto-Calculation (MEDIUM)
- [ ] Lock notice period field (read-only, hardcoded 60 days)
- [ ] Auto-calculate Last Working Day: `resignationDate + 60 days`
- [ ] Display clearly to employee
- [ ] Validate in backend

---

## 🎨 UI/UX REFACTORING CHECKLIST

### Auth Pages
- [ ] Refactor at layout level: left form, right animation
- [ ] Remove header from auth routes
- [ ] Only form scrolls, right side stays fixed
- [ ] Use Framer Motion for right-side animations
- [ ] Mobile responsive (stack on small screens)

### Landing Page
- [ ] Design with Framer Motion animations
- [ ] Crazy, modern feel (high contrast, motion)
- [ ] Feature showcases animated
- [ ] CTA buttons prominent
- [ ] Mobile responsive

### Dashboard
- [ ] Refactor for each role (Admin, HR, Manager, Employee)
- [ ] Add analytics cards (role-specific KPIs)
- [ ] Remove unnecessary components
- [ ] Use `PageWrapper` with title/subtitle/actions
- [ ] Optimize API calls (batch queries, cache)
- [ ] Mobile responsive

### Spacing & Padding Audit
- [ ] Dashboard cards: reduce top/bottom padding
- [ ] Forms: audit nested padding (don't double)
- [ ] Filters: remove excessive gaps, use full width
- [ ] List items: consistent vertical spacing (12–16px)
- [ ] Sections: audit margin/padding overlap

### Color Palette
- [ ] Use shadcn palette exclusively
- [ ] Fix text/background contrast (use proper shades)
- [ ] Check no text is invisible on background
- [ ] Apply consistently across all components
- [ ] Create `lib/constants/colors.ts` if custom colors needed

### Skeleton Loading
- [ ] Show skeletons only for affected sections
- [ ] Full-page skeletons → partial loading (e.g., employee list action → only that row)
- [ ] Match final component dimensions
- [ ] Update skeleton designs to match current UI

### Filter Redesign
- [ ] Remove excessive padding/margins
- [ ] Make controls full width in their containers
- [ ] Use consistent spacing (12px gap between filters)
- [ ] Move to `PageWrapper` level where applicable
- [ ] Example: Employees page filters should be tight

### Table Action Density
- [ ] 1 action → inline button: `<Button>Edit</Button>`
- [ ] 2 actions → 2 inline buttons (if space)
- [ ] 3+ actions → 3-dot menu with `DropdownMenu`
- [ ] Icons for quick recognition

### Calendar Component
- [ ] Replace HTML `<input type="date">` globally
- [ ] Use shadcn calendar component
- [ ] Implement in forms, filters, date selectors

### Bottom Sheet Layout
- [ ] Header: fixed, not scrolled
- [ ] Footer (buttons): fixed, not scrolled
- [ ] Body: scrollable with `ScrollArea`
- [ ] Fix overlapping padding in form fields

### Responsive Forms
- [ ] `Select` fields expand to available width (not narrow)
- [ ] Paired fields (Gender + DOB) on same row (2-column)
- [ ] Single fields full width
- [ ] Stack on mobile (<640px)

### Employee Profile Tab
- [ ] Refactor `/hr/employees/[employeeId]?tab=profile`
- [ ] Make look professional and polished
- [ ] Use proper spacing, typography, sections
- [ ] Fix any alignment issues

### QR Code Screen
- [ ] Remove huge gaps between text, URL, and button
- [ ] Make cards look polished and modern
- [ ] Reduce unnecessary spacing
- [ ] Ensure tight, clean layout

### Attendee/Time Tracking
- [ ] Fix "Take a Break" timer (should pause)
- [ ] Make independent scroll regions (time tracking separate)
- [ ] Move to `features/attendance/time-tracking.tsx` (component-level API)
- [ ] Refactor entire attendance experience

### WFH/Leave Sheets
- [ ] Reduce excessive padding
- [ ] `Select` dropdowns full width
- [ ] Button at bottom (fixed footer)
- [ ] Only form scrolls

### Page Wrapper Consistency
- [ ] Every page uses `PageWrapper` (title, subtitle, actions, filters)
- [ ] Fix any stragglers with one-off typography

### Audit Log
- [ ] Implement pagination (page + limit)
- [ ] Add filters with proper width
- [ ] Use shadcn components only
- [ ] Refactor event details sheet (remove padding/margins)

### General UI Polish
- [ ] No AI-generated look (remove unnecessary spacing)
- [ ] Professional typography hierarchy
- [ ] Consistent button sizes and styles
- [ ] Proper hover/active states
- [ ] Smooth transitions (no jarring changes)

---

## 🔄 API & MUTATION CHECKLIST

### Data Fetching (TanStack Query)
- [ ] Every async operation uses React Query
- [ ] Proper `useQuery` with stale time, retry logic
- [ ] Cache keys consistent across app
- [ ] Handle loading, error, success states
- [ ] Pagination implemented (page/limit or cursor)

### Mutations (TanStack Query)
- [ ] Every mutation uses `useMutation`
- [ ] **Cache update strategy**: 
  - **Option A** (preferred): Update cache directly after mutation success
  - **Option B**: Invalidate query and refetch
  - **Avoid**: Invalidate entire query family unless necessary
- [ ] Optimistic updates where applicable (form submission)
- [ ] Show success/error toast via Sonner
- [ ] Handle network failures gracefully

### Backend Validation (Zod)
- [ ] Every API endpoint validates request body
- [ ] URL query params validated
- [ ] Route params validated
- [ ] Return consistent error format:
  ```json
  { "error": "message", "code": "INVALID_INPUT" }
  ```

### All Mutations (Verify Once)
- [ ] Schedule 1-on-1: POST `/api/performance/one-on-ones` → cache update
- [ ] Create Asset: POST `/api/hr/assets` → add to cache
- [ ] Create/Edit/Delete Cycle: POST/PATCH/DELETE `/api/performance/cycles` → cache update
- [ ] Create Deal: POST `/api/crm/deals` → cache update or invalidate
- [ ] Create Organization: POST `/api/crm/organizations` → cache update
- [ ] Download Payslip: GET `/api/hr/payroll/payslip?month=...` → blob handling
- [ ] Submit Resignation: POST `/api/hr/exit` → cache + notification
- [ ] Terminate Employee: PATCH `/api/hr/employees/[employeeId]` (isActive: false) → cache + email trigger
- [ ] All others: Verify cache strategy

---

## 📁 FILE STRUCTURE EXPECTATIONS

```
app/
├── (auth)/
│   ├── layout.tsx                # Refactored: left form + right animation
│   ├── signin/page.tsx
│   ├── signup/page.tsx
│   └── forgot-password/page.tsx
├── (dashboard)/
│   ├── layout.tsx               # Header, sidebar (NO shell wrapper)
│   ├── dashboard/
│   │   ├── page.tsx             # Use PageWrapper
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── hr/
│   │   ├── employees/
│   │   │   ├── page.tsx         # Use PageWrapper (refactored, <500 lines)
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   ├── _components/
│   │   │   │   ├── employees-table.tsx
│   │   │   │   ├── employees-filters.tsx
│   │   │   │   └── index.ts
│   │   │   └── _hooks/
│   │   │       └── use-employees-filters.ts
│   │   ├── leaves/...
│   │   └── ...
│   ├── crm/
│   │   ├── leads/...
│   │   ├── deals/...
│   │   └── organizations/...
│   ├── performance/
│   │   ├── cycles/...
│   │   ├── one-on-ones/...
│   │   └── ...
│   └── ...
├── api/
│   ├── hr/
│   │   └── employees/
│   │       ├── route.ts          # GET, POST
│   │       └── [employeeId]/
│   │           └── route.ts      # GET, PATCH, DELETE (isActive=false = terminate)
│   ├── crm/...
│   └── ...
└── (landing)/
    └── page.tsx                 # Animated, Framer Motion

features/
├── attendance/
│   ├── time-tracking.tsx        # Component-level, own API
│   ├── daily-log.tsx
│   └── hooks.ts
├── exit-management/
│   ├── resignation-form.tsx
│   ├── workflow.ts              # Notification + approval logic
│   └── types.ts
├── payroll/
│   ├── payslip-viewer.tsx
│   └── download.ts
└── ...

lib/
├── utils/
│   ├── format-date.ts
│   ├── format-currency.ts
│   ├── array.ts
│   └── ...
├── constants/
│   ├── roles.ts
│   ├── pipeline.ts
│   └── ...
├── api.ts                       # Shared API client, base URL
└── db/
    └── queries.ts               # Drizzle queries (not in components)

components/
├── ui/                          # shadcn components
└── shared/                      # App-level shared (PageWrapper, ConfirmDialog, etc.)
```

---

## ✅ VERIFICATION CHECKLIST (Before PR)

### Code Quality
- [ ] `pnpm build` passes (zero TypeScript errors)
- [ ] `pnpm lint` passes (zero warnings)
- [ ] All files ≤500 lines
- [ ] No `any` type assertions
- [ ] No `eslint-disable` comments
- [ ] No `console.log` statements
- [ ] No comments (except complex algorithms)
- [ ] No dead code, unused imports

### Next.js
- [ ] All internal links use `<Link>`
- [ ] All images use `<Image>`
- [ ] No shell wrapper components (layouts only)
- [ ] Server components by default
- [ ] All routes have `loading.tsx` and `error.tsx`
- [ ] Middleware handles auth (no `useEffect` redirects)

### React
- [ ] No anonymous inline handlers
- [ ] No unnecessary `useEffect`
- [ ] All lists have proper `key` props (not index)
- [ ] Named event handlers with `useCallback`
- [ ] URL state for filters/pagination

### API & Mutations
- [ ] All async operations use TanStack Query
- [ ] Cache strategy documented per mutation
- [ ] Zod validation on all endpoints
- [ ] Error handling implemented
- [ ] Network failures handled gracefully

### Bugs Fixed
- [ ] All 11 bugs resolved and tested
- [ ] Related features working end-to-end
- [ ] No regressions introduced

### UI/UX
- [ ] No overlapping padding/margins
- [ ] Color palette consistent
- [ ] Text/background contrast proper
- [ ] Skeletons only for affected sections
- [ ] Mobile responsive (tested at <640px)
- [ ] All forms scroll correctly (header/footer fixed where needed)
- [ ] Action density proper (1 inline, 3+ in menu)
- [ ] No AI-generated look

---

## 🚀 IMPLEMENTATION STRATEGY

### Phase 1: Planning (30 min)
1. List all 11 bugs with reproduction steps
2. Identify all oversized files (>500 lines)
3. Audit spacing/padding across pages
4. Document cache strategy per mutation

### Phase 2: Critical Bugs (2–3 hours)
1. Fix 1-on-1 scheduling (validation + API)
2. Fix asset status dropdown
3. Fix cycle management actions
4. Fix candidates "Apply to Job"
5. Fix payslip download

### Phase 3: Architecture (3–4 hours)
1. Split oversized files
2. Implement `PageWrapper` consistently
3. Fix spacing/padding globally
4. Replace modals with side sheets

### Phase 4: Workflows (2–3 hours)
1. Exit management workflow + notifications
2. Termination email trigger
3. Notice period auto-calculation
4. Helpdesk/Exit permissions

### Phase 5: UI Polish (2–3 hours)
1. Auth page refactor (left form + right animation)
2. Landing page animation
3. Dashboard role-based redesign
4. Calendar component swap
5. Skeleton loading updates

### Phase 6: Verification (1 hour)
1. Test all 11 bugs
2. Run `pnpm build` and `pnpm lint`
3. Manual QA on main flows
4. Mobile responsiveness check

---

## 📝 MEMORY & RULES TO RETAIN

### Key Rules (Don't Repeat)
- Max 500 lines per file → split with `_components/` or `features/`
- Describe param names: `[employeeId]`, not `[id]`
- No `any`, no assertions, strict TypeScript
- Named handlers only: `const handleClick = useCallback(() => {}, [])`
- URL state for filters: `useSearchParams()`
- TanStack Query for all async: document cache strategy per mutation
- Server components by default; `"use client"` only for interactivity
- Middleware for auth; no `useEffect` redirects
- `PageWrapper` for all pages (title, subtitle, actions, filters)
- Shadcn components and color palette exclusively
- No overlapping padding (parent + child audit)
- Scrollable regions: only content scrolls, header/footer fixed
- Action density: 1 inline, 3+ in 3-dot menu
- `ConfirmDialog` for destructive actions
- No comments, no dead code, no `console.log`

### Mutation Cache Strategy Template
```typescript
// Every mutation should document:
const mutation = useMutation({
  mutationFn: createEntity,
  onSuccess: (data) => {
    // Strategy: Update cache directly
    queryClient.setQueryData(['entities'], (old) => [...old, data]);
    // OR
    // Strategy: Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['entities'] });
    
    toast.success('Created successfully');
  },
  onError: (error) => {
    toast.error(error.message);
  }
});
```

### Spacing Audit Checklist
- [ ] Dashboard cards: 12px padding (not 20px+)
- [ ] Form sections: 16px gap (not double padding)
- [ ] List items: 12px vertical (consistent)
- [ ] Filters: no padding within `PageWrapper`
- [ ] Modals → Side sheets (fixes cramped feel)

### Permission/Visibility Rules
- Helpdesk: All employees
- Exit Management: All employees
- Payroll: HR + Employee (own data)
- Performance: Manager + HR
- CRM: Sales team

---

## 🎯 SUCCESS CRITERIA (Final Checklist)

- ✅ All 11 bugs fixed and tested
- ✅ No file >500 lines
- ✅ Zero TypeScript errors, zero lint warnings
- ✅ All pages use `PageWrapper`
- ✅ All spacing/padding audited and normalized
- ✅ Auth pages refactored (left form + right animation)
- ✅ Dashboard role-based and analytics-focused
- ✅ All modals replaced with side sheets
- ✅ Calendar component used globally (no HTML date inputs)
- ✅ Shadcn components exclusively
- ✅ Color palette consistent, no contrast issues
- ✅ Skeleton loading partial (not full screen)
- ✅ All mutations have documented cache strategy
- ✅ `ConfirmDialog` for all destructive actions
- ✅ Mobile responsive (tested <640px)
- ✅ No comments, no dead code
- ✅ Named handlers, no `useEffect` anti-patterns

---

## 📞 QUICK REFERENCE (Copy-Paste Rules)

### When fixing a bug:
1. Reproduce with exact steps
2. Check form validation logic
3. Verify API payload and response
4. Update TanStack Query cache
5. Show success/error toast
6. Test edge cases (empty, null, error states)

### When refactoring a page:
1. Wrap with `PageWrapper`
2. Split components if >500 lines
3. Use `_components/` folder
4. Replace modals with side sheets
5. Audit spacing (no doubles)
6. Fix skeleton loading (partial only)
7. Add `loading.tsx` and `error.tsx`
8. Mobile test at <640px

### When adding a feature:
1. Plan API contract (Zod validation)
2. Implement mutation (TanStack Query + cache strategy)
3. Add component with proper spacing
4. Use `ConfirmDialog` for destructive actions
5. Add success/error handling
6. Test network failure scenario

---

**End of Master Prompt**
