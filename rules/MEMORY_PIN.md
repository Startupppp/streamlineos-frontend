# 📌 MEMORY PIN - Rules & Context (Don't Repeat)

**Save this. Refer to this. Mention when starting new tasks.**

---

## CORE RULES (Never Change)

### Architecture
- **Max 500 lines per file** (split with `_components/` or `features/`)
- **Dynamic routes use descriptive params**: `[employeeId]`, `[dealId]`, `[leaveId]`, NOT `[id]`
- **Server components by default** (only `"use client"` for hooks/events/browser APIs)
- **Middleware for auth** (no `useEffect` redirects)
- **No shell wrapper components** (use `layout.tsx` instead)
- **TanStack Query for all async** (document cache strategy per mutation)
- **Named handlers only** (no `() => {}` inline; use `useCallback`)

### Code Quality
- **No `any` types** → use `InferSelectModel`, strict interfaces
- **No `as Type` assertions** → proper typing
- **No comments** (code should self-explain)
- **No dead code** (unused imports, orphaned components)
- **No `eslint-disable`** (fix the issue)
- **No `console.log`** (remove all debug)
- **No anonymous handlers** → `const handleX = useCallback(() => {}, [])`

### UI/UX Standards
- **PageWrapper on every page** (title, subtitle, actions, filters)
- **Shadcn components & color palette exclusively**
- **No overlapping padding** (parent + child audit)
- **Action density**: 1 action = inline; 3+ = 3-dot menu
- **Scroll regions**: only content scrolls (header/footer fixed via `ScrollArea`)
- **Skeleton loading**: partial only (not full screen)
- **ConfirmDialog for destructive actions**
- **Responsive**: Select/controls expand; stack on mobile

### Next.js Patterns
- `<Link>` for internal nav (not `<a>`)
- `<Image>` for all images (not `<img>`)
- `loading.tsx` + `error.tsx` on every route
- Server Actions for mutations (over API routes)
- `useSearchParams()` for filter state (not useState)

---

## CACHE STRATEGY TEMPLATE

Every mutation requires a decision:

```typescript
useMutation({
  mutationFn: action,
  onSuccess: (data) => {
    // STRATEGY 1: Direct update (fast, need to know shape)
    queryClient.setQueryData(['key'], (old) => [...old, data]);
    
    // STRATEGY 2: Invalidate + auto-refetch (slower, safer)
    // queryClient.invalidateQueries({queryKey: ['key']});
    
    toast.success('Done');
  }
});
```

**Document which strategy per mutation in code comments.**

---

## MUTATIONS TO AUDIT (Cache Strategy)

- Schedule 1-on-1 Meeting
- Create/Edit/Delete Asset
- Create/Edit/Delete Cycle
- Create Deal (modal → side sheet)
- Create Organization (modal → side sheet)
- Download Payslip
- Submit Resignation
- Approve/Reject Resignation
- Terminate Employee
- All CRUD operations

---

## 11 CRITICAL BUGS (Know These)

1. **1-on-1 Scheduling**: validation error with valid inputs → Fix field binding + time field
2. **Asset Status**: Missing dropdown → Add Select (Available/Assigned/Maintenance)
3. **Cycle Management**: No preview/edit/delete → Add action menu (3-dot)
4. **Candidates "Apply to Job"**: Wrong module → Move to Jobs
5. **Create Deal Modal**: Cramped → Replace with side sheet
6. **Create Organization Modal**: Cramped → Replace with side sheet
7. **Payslip Download**: Not working → Fix API + blob handling
8. **Helpdesk/Exit Visibility**: HR/CEO only → Enable for all employees
9. **Exit Workflow**: Missing steps → Implement resignation → HR notification → approval → employee notification
10. **Termination Email**: Not sent → Add background job trigger
11. **Notice Period**: Editable + no auto-calc → Lock field, auto-calculate Last Working Day (60 days from resignation)

---

## SPACING/PADDING AUDIT

**Pattern to remember:**
- Dashboard cards: 12px (not 20px+)
- Form sections: 16px gap (not double)
- List items: 12px vertical (consistent)
- Filters: no extra padding within PageWrapper
- Modals → Side sheets (fixes cramped feel)

**Always check**: parent + child not both adding same padding/margin.

---

## FILE SPLIT TRIGGERS

Split when >500 lines:
- `chat/page.tsx` → `chat-sidebar.tsx`, `chat-messages.tsx`, `chat-input.tsx`, `chat-header.tsx`
- `employees/page.tsx` → `employees-table.tsx`, `employees-filters.tsx`, `employee-dialogs.tsx`
- `deals/page.tsx` → `deals-table.tsx`, `deals-filters.tsx`, `deals-pipeline.tsx`

**Pattern**: `_components/` folder for route-scoped, `features/` for reusable across routes.

---

## WHEN STARTING A TASK

1. **Read the full Master Prompt** (linked at end)
2. **Check Quick Reference** for the specific bug/feature
3. **Reference this Memory** before coding
4. **Use Cache Strategy Template** for any mutation
5. **Verify Checklist** at end of task

---

## QUICK DECISION TREE

**"Should I split this file?"**
→ If >500 lines: YES. Use `_components/` or `features/`.

**"How should I fetch data?"**
→ TanStack Query with proper cache strategy documented.

**"Should I use useEffect?"**
→ Only for side effects (like listening to events). For derived state → `useMemo`.

**"Should I make this a separate component?"**
→ If it's reused 2+ times or >300 lines: YES.

**"How do I handle this modal?"**
→ Replace with side sheet (right panel). Header/footer fixed, only body scrolls.

**"What about spacing?"**
→ Audit parent + child (don't double). Use consistent 12–16px gaps. Make controls full width.

**"Should I use a comment?"**
→ NO. Name your function/variable to self-explain. Exception: complex algorithm.

**"How do I validate this form?"**
→ Zod schema + shadcn Form component. Display errors inline.

---

## LAST COMPLETED CONTEXT

- Auth pages still need refactoring (left form + right animation)
- Landing page needs Framer Motion animations
- Dashboard needs role-based redesign
- Most 99% of rules already in codebase; minor cleanup needed
- PageWrapper exists and should be used everywhere
- ConfirmDialog exists and should be used for destructive actions
- shadcn components available; replace custom components

---

## LINKS TO FULL DOCS

- **Full Master Prompt**: `rules/MASTER_ENGINEERING_PROMPT.md`
- **Quick Reference Card**: `rules/QUICK_REFERENCE.md`
- **This Memory**: `rules/MEMORY_PIN.md`

---

**When starting a task: "I'm following the Master Engineering Prompt rules. Here's my plan..."**
