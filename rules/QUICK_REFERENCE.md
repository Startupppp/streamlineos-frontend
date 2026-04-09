# QUICK REFERENCE CARD (Token-Efficient)
**Use this for task execution when the full prompt is context-heavy**

---

## 11 BUGS (Priority Fix Order)

| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 1 | 1-on-1 Scheduling: "Employee and date required" error with valid inputs | HIGH | Fix field binding + API payload validation. Add time field (required). Check form state vs actual values sent. |
| 2 | Asset Status Dropdown: Missing status selector (Available/Assigned/Maintenance) | MEDIUM | Add `<Select>` dropdown in Add Asset form. Required field. |
| 3 | Cycle Management: No preview/edit/delete actions visible | HIGH | Add action menu (3-dot or buttons) to cycle cards. Wire to mutations. Update cache. |
| 4 | Candidates "Apply to Job": Misplaced in wrong module | MEDIUM | Remove from Candidates profile. Move to Jobs module (if needed). Cleanup code. |
| 5 | Create Deal Modal: Cramped spacing, feels confined | MEDIUM | Replace modal with right-side sheet. Fix spacing: 16–24px gaps. Fixed footer. |
| 6 | Create Organization Modal: Same issue as Deal | MEDIUM | Replace with side sheet. Consistent spacing. |
| 7 | Payslip Download: No response on click | HIGH | Debug `/api/payroll/payslip`. Handle blob → download/preview. Show toast. |
| 8 | Helpdesk/Exit: Only HR & CEO can access (should be all employees) | HIGH | Remove role restriction. Enable for all employees. |
| 9 | Exit Workflow: Missing resignation flow + notifications + approvals | HIGH | Implement: submit form → HR notified → HR approves → employee notified. Auto-calc Last Working Day. |
| 10 | Termination Email: No email sent to terminated employee | HIGH | Add email trigger (background job/server action). Include termination date + HR contact. |
| 11 | Notice Period: Should be 60 days (fixed, not editable) + auto-calc Last Working Day | MEDIUM | Lock field (readonly). Auto-calculate: LWD = resignation_date + 60 days. Display clearly. |

---

## ARCHITECTURE RULES (Non-Negotiable)

### Code Structure
- **Max 500 lines/file** → split with `_components/` (routes) or `features/` (reusable)
- **No comments** → code should self-explain
- **No dead code** → delete unused imports, orphaned components
- **Strict typing** → no `any`, no assertions (`as Type`)
- **Named handlers** → no `() => {}` inline; use `useCallback` with names
- **Dynamic routes** → use descriptive params: `[employeeId]`, `[dealId]`, not `[id]`

### Next.js Patterns
- Use `<Link>` for internal nav (not `<a>`)
- Use `<Image>` for all images (not `<img>`)
- Use `layout.tsx` (not shell wrappers)
- Server components by default; `"use client"` only for hooks/interactivity
- Middleware for auth (not `useEffect` redirects)
- Server Actions for mutations
- Every route: `loading.tsx`, `error.tsx` (dynamic routes: `not-found.tsx`)

### React Patterns
- No unnecessary `useEffect` → use `useMemo` for derived state
- URL state for filters: `useSearchParams()` + `useRouter()`
- TanStack Query for all async (document cache strategy per mutation)
- `ScrollArea` for scroll regions (only content scrolls, header/footer fixed)
- `ConfirmDialog` for all destructive actions
- Proper `key` props in lists (never index; use unique ID)

### UI/UX Standards
- **PageWrapper consistency**: title, subtitle, actions, filters on every page
- **Spacing audit**: no overlapping padding (parent + child double-check)
- **Color palette**: shadcn only; fix text/background contrast
- **Shadcn components exclusively**: replace HTML date inputs, custom selects
- **Action density**: 1 action = inline button; 3+ = 3-dot menu with icons
- **Skeleton loading**: partial only (not full screen on any action)
- **Responsive**: Select/controls expand to available width; stack on mobile
- **No AI look**: remove unnecessary spacing, keep professional density

---

## QUICK FIXES

### Fix Validation Error
```typescript
// Check: form state, field binding, API payload match
// Add: time field with default or required
// Test: with actual data, empty data, null values
```

### Add Dropdown/Select
```typescript
// Use shadcn <Select> component
// Options: array or fetched from API
// Required validation in Zod schema
// Set default if needed
```

### Replace Modal with Side Sheet
```typescript
// Use <Sheet> from shadcn (Drawer or Sheet)
// Header: fixed (no scroll)
// Footer: fixed (buttons at bottom)
// Body: only content scrolls (use ScrollArea)
// Spacing: 16–24px between fields, consistent padding
```

### Add Action Menu
```typescript
// 1 action: inline <Button>Edit</Button>
// 3+ actions: <DropdownMenu> with icons
// Use <ConfirmDialog> before delete/destructive
// Wire to mutation + cache update
```

### Fix API/Download
```typescript
// Verify endpoint, payload, response format
// Handle blob: download or preview
// Show toast: success/error
// Test: network failure, invalid data
```

### Add Email Trigger
```typescript
// Background job (e.g., Bull, Node schedule) or server action
// Include template with required data
// Test email delivery (mock if no SMTP)
```

### Fix Scroll Regions
```typescript
// Header/footer: position fixed OR flex (not scrolled)
// Body: <ScrollArea> or max-h + overflow-y
// Test: tall forms, mobile screens
```

---

## MUTATION CACHE STRATEGY

For every mutation, decide:
- **Direct cache update** (fast, accurate): `queryClient.setQueryData(key, newData)`
- **Invalidate + refetch** (slower, safer): `queryClient.invalidateQueries({queryKey})`
- **Optimistic update** (instant, with rollback): update UI before API response

Example:
```typescript
const mutation = useMutation({
  mutationFn: createLead,
  onSuccess: (data) => {
    // Option 1: Update cache directly (if you know the shape)
    queryClient.setQueryData(['leads'], (old) => [...old, data]);
    
    // Option 2: Invalidate entire query (refetch happens automatically)
    // queryClient.invalidateQueries({queryKey: ['leads']});
    
    toast.success('Lead created');
  },
  onError: (err) => toast.error(err.message)
});
```

---

## FILE CHECKLIST (Before pushing)

- [ ] `pnpm build` passes (zero TS errors)
- [ ] `pnpm lint` passes (zero warnings)
- [ ] No file >500 lines
- [ ] No `any`, no `eslint-disable`, no `console.log`
- [ ] All links use `<Link>`, all images use `<Image>`
- [ ] All pages have `loading.tsx` + `error.tsx`
- [ ] All forms/modals refactored (tight spacing, proper scroll)
- [ ] All mutations have documented cache strategy
- [ ] All destructive actions use `ConfirmDialog`
- [ ] Mobile responsive (<640px tested)

---

## WHEN IN DOUBT

1. **Validation issue?** → Check form state binding + API payload + Zod schema
2. **API not working?** → Verify endpoint, method, auth, response format
3. **UI looks cramped?** → Audit padding/margin (remove doubles), use full width for controls
4. **Action not updating UI?** → TanStack Query cache: use `setQueryData` or `invalidateQueries`
5. **Modal feels claustrophobic?** → Replace with side sheet, fix spacing
6. **Permissions not working?** → Check role/permission check in middleware + component
7. **Email not sent?** → Verify background job trigger, email template, SMTP config
8. **Skeleton showing full page?** → Show skeleton only for affected section/component

---

**Keep this open while coding. Reference the full Master Prompt for detailed rules.**
