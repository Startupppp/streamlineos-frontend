# FE1 Frontend Audit — 2026-08-30

Audit of the frontend against four tasks: boundary violations, contract drift, per-route completeness, and accessibility. Lane FE1.

---

## FIXED

### F-01 · vendor-payments: "Record Allocation" action unguarded

**File:** `frontend/app/(authenticated)/accounting/vendor-payments/page.tsx`

**What changed:** The page rendered the "Record Allocation" button to any authenticated user regardless of permissions. Added `useCan("accounting:payables:manage")` (same key used in `purchase-bills/page.tsx` for create) and conditionally shows the button. Import of `useCan` added.

```
+import { useCan } from "@/hooks/api/access";
+const canManage = useCan("accounting:payables:manage");
 actions={
-  <Button size="sm" variant="outline" onClick={handleOpenAllocationDialog}>
-    Record Allocation
-  </Button>
+  canManage ? (
+    <Button size="sm" variant="outline" onClick={handleOpenAllocationDialog}>
+      Record Allocation
+    </Button>
+  ) : undefined
 }
```

**Key confirmed in:** `frontend/lib/rbac/permissions/accounting.ts:27` and `permission-key-extended.ts:16`.

---

### F-02 · CRM pages: feature-local `formatCurrency` replaced with shared

**Files:**
- `frontend/app/(authenticated)/crm/leads/source-report/page.tsx:24`
- `frontend/app/(authenticated)/crm/deals/win-loss/page.tsx:26`

**What changed:** Both pages imported `formatCurrency` from `@/features/crm/lib/format-currency`, which duplicates `lib/format-utils.ts::formatCurrency` (an alias for `formatINRCompact`). Changed import to `@/lib/format-utils` in both files. The function signature and output are identical — `(val: number) => string` — so no call-sites change.

The source file `frontend/features/crm/lib/format-currency.ts` is now unused by these pages but is not deleted here (knip + build confirm before removal per §10 dead-code rules).

---

## FOUND — NOT FIXED

### Task 1 — Frontend/Backend Boundary

**T1-01 · No `lib/services/**` violations** (clean)
Pattern search confirms the directory does not exist. 0 violations.

**T1-02 · No frontend database access** (clean)
Search for `drizzle`, `@neondatabase`, `neon(` produced 0 actual matches in frontend source — false positives from the word "feedbucket" matching `import.*db.*from`. 0 violations.

**T1-03 · No client-sent actor IDs** (clean)
All occurrences of `createdById` / `actorId` / `authorId` / `userId` in frontend files are:
- API response type fields (read-only; received from backend, never sent back as own identity)
- Client-side comparisons (`msg.authorId === currentUserId`, `n.createdById !== myId`) — UI filtering, not sent to backend
- Observability context (`setSessionContext({ actorId })` in `components/providers/observability-provider.tsx`) — local Sentry-style error tracking, not a backend request
- Omit<..., "authorId"> in create types — explicitly excluding the field from payloads
- `?userId=` params on timesheet hooks pass a DIFFERENT user's ID for manager views (legitimate `widening permission` pattern, not self-read)

0 violations.

**T1-04 · No direct third-party OAuth** (clean)
No direct provider OAuth tokens or OAuth flows found in frontend code. 0 violations.

**T1-05 · Inline Zod schemas in page files** (rule: schemas live in `*-schema.ts`)

These schemas are defined in `page.tsx` or `route.tsx` files instead of a sibling `*-schema.ts`. This is not a security boundary violation but is a code-quality rule from CLAUDE.md §6 and is tracked here for completeness.

| File | Lines | Schema name(s) | Reason not fixed |
|---|---|---|---|
| `accounting/journal/new/page.tsx` | 59-72 | `lineSchema`, `formSchema` | Requires new `*-schema.ts` file creation; structural change outside a targeted fix |
| `accounting/coa/[accountId]/page.tsx` | 62-66 | `editAccountSchema` | Same |
| `accounting/assets/[assetId]/page.tsx` | 55-58 | `disposeAssetSchema` | Same |
| `accounting/assets/depreciation/page.tsx` | 47 | `runDepreciationSchema` | Same |
| `accounting/budgets/page.tsx` | 72-76 | `createBudgetSchema` | Same |
| `accounting/budgets/[budgetId]/page.tsx` | 62-65 | `duplicateSchema` | Same |
| `accounting/settings/page.tsx` | 46-53 | `companySchema`, `taxSchema` | Same |
| `app/(auth)/invitation/[token]/page.tsx` | 34-37 | `newUserSchema` | Same |

**8 files with inline schemas**. Recommendation: create `*-schema.ts` siblings for each, export schema + `z.infer` type, import in the page.

---

### Task 2 — Contract Drift

**T2-01 · All `useCan` keys present in `PermissionKey` type** (clean)
All `useCan(key)` calls checked against `FoundationPermissionKey | BusinessPermissionKey | ExtendedPermissionKey`. Every key used is in the union. TypeScript compilation enforces this at build time. 0 frontend-only-key violations.

**T2-02 · `hr/engagement/page.tsx` — inline hooks bypassing `hooks/api/`**

`frontend/app/(authenticated)/hr/engagement/page.tsx:69-84`

Two query hooks are defined inside the page file using `apiClient` directly:
```ts
function useRecognitions() { return useQuery({ queryFn: () => apiClient.get("/hr/recognition") }); }
function useCreateRecognition() { return useMutation({ mutationFn: (data) => apiClient.post("/hr/recognition", data) }); }
```
CLAUDE.md §2: "All client fetching goes through Query hooks in `lib/api/` / `hooks/api/`." These should be in `hooks/api/hr/recognition.ts` (or appended to `hooks/api/hr/engagement.ts`).

Not fixed: moving the hooks requires creating a new file and verifying query-key alignment; the impact is contained to this one page and is low security risk (keys are correctly defined and gated).

**T2-03 · `useCan("hr:engagement:manage")` — permission exists but is not enforced on write actions**

`frontend/app/(authenticated)/hr/engagement/page.tsx:115`

`hr:engagement:manage` resolves correctly in `useCan`. The flag is used to show/hide some UI, but `useCreateRecognition` has no `enabled: canManage` gate. The backend must enforce this. This is a UI inconsistency (non-manager users can technically invoke the mutation). Without backend confirmation of the guard, cannot add `mutationFn`-level gating client-side — flagged for backend audit.

---

### Task 3 — Per-route Completeness

**T3-01 · Filter state not URL-synced (Accounting module — high impact)**

CLAUDE.md §9: "Filters always update the URL."

| Page | Filter | How to fix |
|---|---|---|
| `accounting/journal/page.tsx:110-122` | `from`, `to`, `sourceType`, `statusFilter` — local `useState` | Replace with `useSearchParams` + `router.replace` |
| `accounting/purchase-bills/page.tsx:256-260` | `search`, `status` — local `useState` | Same pattern |
| `accounting/vendor-payments/page.tsx:34` | `vendorFilter` — local `useState` | Same pattern |

3 pages. Reason not fixed: requires extracting a `use-*-filters.ts` hook per page and wiring `useSearchParams`; changes are ~50-80 lines per page and need pagination-reset logic. Not a one-liner.

**T3-02 · Hardcoded pagination / no server pagination UI (Accounting module)**

CLAUDE.md §2: "Never hardcode pagination params in a hook. Hooks take `{ page, limit, status? }` and return the real `{ data, pagination }`."

| Page | Hardcoded | DataTable pagination prop |
|---|---|---|
| `accounting/journal/page.tsx:118` | `limit: 100` | Not passed |
| `accounting/purchase-bills/page.tsx:263` | `limit: 100` | Not passed |
| `accounting/vendor-payments/page.tsx:37-38` | `limit: 50` (twice) | Not passed |

3 pages. Reason not fixed: requires backend API to support `page` param (verify first) and adding `TablePagination` component. Structural.

**T3-03 · Date formatting using `toLocaleDateString()` (Accounting + Inventory — 30+ pages)**

CLAUDE.md §15 / §6: "Dates go through `lib/date-utils.ts` + `date-fns` `format` — never inline `toLocaleDateString`."

Confirmed at 30+ pages in `accounting/` and `inventory/`. Every page defines a local `formatDate` helper calling `d.toLocaleDateString()`. The shared `formatShortDate()` from `lib/date-utils.ts` does the correct thing with `en-IN` locale.

Representative files (accounting module only):
- `accounting/approvals/page.tsx:52`
- `accounting/budgets/page.tsx:88`
- `accounting/assets/depreciation/page.tsx:42`
- `accounting/assets/[assetId]/page.tsx:65`
- `accounting/credit-notes/page.tsx:42`
- `accounting/payments-received/page.tsx:60`
- `accounting/purchase-bills/page.tsx:72`
- `accounting/invoices/page.tsx:91`
- `accounting/payment-reminders/page.tsx:46`
- `accounting/recurring-invoices/page.tsx:61`
- `accounting/recurring-bills/page.tsx:61`
- `accounting/vendor-credits/page.tsx:44`
- `accounting/payment-runs/page.tsx:47`

Reason not fixed: 30+ files, each needing import of `formatShortDate` and replacement of local helper. Systematic but mechanical; should be a separate lane pass.

**T3-04 · Money formatting using `.toFixed(2)` instead of `formatMoney`**

`accounting/purchase-bills/page.tsx:237`

```ts
cell: (bill) => Number(bill.total).toFixed(2),
```

Should be `<Money value={Number(bill.total)} />` or `formatMoneyCompact(Number(bill.total), orgDisplay)`. The same file already uses `FinanceStatusBadge` but not `Money` for this column. Reason not fixed: requires `useOrgDisplay()` call or a `Money` component import; minor but out of scope for this targeted pass.

**T3-05 · Route-ownership violations (reported in PAGES.md, confirmed)**

Confirmed from PAGES.md audit section:
- `/crm/calendar` — unified calendar rule (should be toggleable source in `/calendar`)
- `/payroll/me` — self-service pay duplicate (canonical: `/me/pay`)
- `/knowledge-base` — legacy orphan (canonical: `/knowledge/wiki`)
- `(portal)/projects` — Build module naming (should use `/build`)
- `/settings/directory` — module-settings rule (should be `/directory/settings`)

Not fixed: all require route deletion + redirect removal + link updates across multiple modules. Product decisions involved in timing.

---

### Task 4 — Accessibility

**T4-01 · Motion variants fully respect `prefers-reduced-motion`** (clean — already fixed)

`lib/motion-variants.ts` exports `useMotionVariants()` which returns reduced-motion-safe variants (opacity-only, no translate/scale) when `useReducedMotion()` returns true. All 55+ consumer files import `useMotionVariants`, not the raw variant constants.

`pm-chrome.tsx` and `projects-page.tsx` additionally import `useReducedMotion` directly from framer-motion to toggle inline `initial` animation values (bar widths, bar heights) that cannot be expressed as variant states — this is correct and intentional.

The `lib/motion-presets.ts` module likewise ships `fadeUp`/`fadeUpReduced`, `listItem`/`listItemReduced`, `stepSlide`/`stepSlideReduced`, and `viewSwap`/`viewSwapReduced` pairs, and the two consuming components select the correct pair via `useReducedMotion()`.

0 violations.

**T4-02 · Icon-only buttons in audited accounting module — all labelled** (clean)

All `size="icon"` `<Button>` and `<AnimatedIconButton>` elements in the accounting module carry explicit `aria-label` attributes:
- `accounting/invoices/page.tsx:127` — `aria-label="Actions"`
- `accounting/credit-notes/page.tsx:108` — `aria-label="Credit note actions"`
- `accounting/coa/page.tsx:150` — `aria-label="Account actions"`
- `accounting/vendor-credits/page.tsx:88` — `aria-label="Credit actions"`
- `accounting/purchase-bills/page.tsx:134` — `aria-label="Bill actions"`
- `accounting/journal/new/page.tsx:188-190` — `aria-label="Remove line"`
- `accounting/payment-reminders/page.tsx:92` — `aria-label="Policy actions"`
- `accounting/recurring-invoices/page.tsx:105` — `aria-label="Template actions"`
- `accounting/recurring-bills/page.tsx:99` — `aria-label="Template actions"`

0 violations in the accounting module. Broader scan across all 598 routes deferred — the `streamline/no-unlabelled-icon-button` ESLint rule enforces this at authoring time.

**T4-03 · Focus management — no regressions found in audited pages**

Dialogs (`AlertDialog`, `EntityFormDialog`, `ConfirmDialog`) use Radix UI primitives which handle focus trapping and restoration. Sheets use `SheetContent` from Radix. Custom controls (tab switchers, filter pills) use `<button type="button">` not `<div>`. No missing focus management found in audited pages.

---

## Summary Counts

| Category | Total found | Fixed in this pass | Not fixed (reported) |
|---|---|---|---|
| Boundary violations | 0 | — | — |
| DB access | 0 | — | — |
| Client-sent actor IDs | 0 | — | — |
| Third-party OAuth | 0 | — | — |
| Ungated mutation (vendor payments) | 1 | 1 | 0 |
| Duplicate feature-local formatter | 2 files | 2 | 0 |
| Inline Zod schemas | 8 files | 0 | 8 |
| Filter state not URL-synced | 3 pages | 0 | 3 |
| Hardcoded pagination | 3 pages | 0 | 3 |
| Date formatting (`toLocaleDateString`) | 30+ pages | 0 | 30+ |
| Money formatting (`.toFixed` instead of `Money`) | 1 | 0 | 1 |
| Inline hooks bypassing `hooks/api/` | 1 page | 0 | 1 |
| Route-ownership violations | 5 routes | 0 | 5 |
| Motion variants a11y | 0 | — | — |
| Icon-only button labels | 0 | — | — |
