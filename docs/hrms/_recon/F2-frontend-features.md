# F2 — Frontend Features Audit
> Lane F2 · READ-ONLY Phase-1 audit · 2026-07-31
> Scope: `features/hr/**` (456 files), `features/payroll/**` (149 files), `features/billing/**` (14 files)
> `features/recruitment/**` = 0 files (recruitment lives inside `features/hr/recruitment/`)

---

## 1. Shared-Primitive Catalogue

| Primitive | Exists? | Location | API / Notes |
|---|---|---|---|
| `PageWrapper` | YES | `components/ui/page-wrapper.tsx` | `title, subtitle, eyebrow, badge, backHref, actions, filters` props. Used widely across all three features. |
| `DataTable` | YES | `components/ui/data-table.tsx` | `DataTableColumn<T>` typed columns, `data`, `isLoading`, `pagination` props. Used in 83 files across scope. |
| `TablePagination` | YES | `components/ui/table-pagination.tsx` | `{ page, pageSize, total, onPageChange }`. Numbered pages + ellipsis. Used in only 3 HR files (under-used). |
| `DataTablePagination` | YES | `components/shared/data-table-pagination.tsx` | Adds page-size selector + first/last buttons on top of TablePagination. |
| `StatCard` / `StatCardGrid` | YES | `components/ui/stat-card.tsx` | `label, value, hint, tone, icon` props. `StatCardGrid` single-row scroll. Used in 29 files. |
| `LoadingButton` | YES | `components/ui/loading-button.tsx` | `isPending, loadingText` wraps Button. Used in 180 files but bypassed in ~20 sites (see §2). |
| `SemanticBadge` | YES | `components/ui/semantic-badge.tsx` | `tone: BadgeTone, label` props. Correctly used by payroll badge files; HR feature-level badges hand-roll CSS (see §2). |
| `EmployeePicker` | PARTIAL | `features/hr/shared/employee-picker.tsx` | Feature-scoped, NOT in `components/`. Imported in exactly 1 file (`onboarding-initiate-sheet.tsx:14`). Most forms select employees ad hoc without it. |
| `ResponsivePopover` | YES | `components/ui/responsive-popover.tsx` | Drawer `<md`, Popover on desktop. Used by payroll `MobileFilterDrawer` and 2 HR filters. Under-adopted (see §7). |
| `ResponsiveDialog` | **MISSING** | — | No mobile-Drawer-backed dialog primitive exists. Raw Dialog used everywhere. |
| `AnimatedIconButton` | YES | `components/ui/animated-icon-button.tsx` | Wires `useAnimatedIcon()` internally. Used in 350 files across scope, but 298 files also import raw `lucide-react` (many legitimate static uses). |
| `RouteErrorBoundary` | YES | `components/ui/route-error-boundary.tsx` | **NOT USED** in HR / payroll / billing. All features roll inline error states or use `ErrorState` from shared. |
| `AiActionsMenu` | YES | `components/ai/ai-actions-menu.tsx` | Sparkles dropdown → AI draft in sheet. Used in `employee-details-view.tsx:305` and `ess-payslips-section.tsx:121`. Correct pattern but barely adopted. |
| `AiUsageChip` | YES | `components/ai/ai-usage-chip.tsx` | Renders token/credit usage per AI call. **NOT USED** in any HR/payroll/billing AI surface. |
| Empty-state illustrations | YES | `components/illustrations/index.ts` | 60+ named SVG exports (`EmptyLeaveIllustration`, `EmptyPayroll`, `TravelIllustration`, etc.). Well-adopted in HR. |
| Money formatter | PARTIAL | `features/payroll/shared/payroll-format.ts` | `formatMoney(amount, currency)` + `formatMonth`. **Payroll uses it correctly; HR bypasses it entirely** (see §3). |
| Date formatter | **NONE** | — | No shared date formatter. `date-fns` `format()` used ubiquitously with inconsistent format strings. |
| `EntitlementGate` / paywall upsell | **MISSING** | — | `useEntitlements()` hook exists (`hooks/api/entitlements`) but no `<EntitlementGate>` wrapper component. Entitlement rendering is ad hoc; only `plan-usage-meters.tsx:73` calls the hook. |
| Confirm dialog | YES (×2) | `components/ui/confirm-dialog.tsx` + `components/ui/confirm-sheet.tsx` | Two primitives for the same job (confirm-sheet is more common in HR; billing's `invoice-detail.tsx` uses raw `AlertDialog`). |
| Date-range picker | YES | `components/ui/date-range-picker.tsx` | Exists but **not imported in scope**. Attendance email dialog and feedback cycles use two separate `DatePicker` components with manual `startDate`/`endDate` state — bypassing the shared primitive. |
| Org-tree picker | **MISSING** | — | No shared org-chart/tree picker. Dept/team filtering is done with plain `<Select>` throughout. |
| Approval-timeline | **MISSING (shared)** | — | Each module builds its own: `features/hr/exit/progress-timeline.tsx`, `features/payroll/runs/run-status-stepper.tsx`, `features/payroll/payout/run-stage-actions/approval-stage-panel.tsx`. No canonical `ApprovalTimeline` in `components/`. |

**Missing primitives summary (8):** `ResponsiveDialog`, `EntitlementGate`/paywall, shared money formatter (for HR), shared date formatter, org-tree picker, shared approval-timeline, `AiUsageChip` on AI surfaces, `DateRangePicker` adoption.

---

## 2. Duplication Census

### 2a. Status Badges (HIGHEST DUPLICATION — 18 files)
Payroll correctly wraps `SemanticBadge`; most HR badges hand-roll inline `className` strings.

| Canonical | Duplicate Call Sites | Notes |
|---|---|---|
| `components/ui/semantic-badge.tsx` | `leaves/components/leave-status-badge.tsx` (hand-rolls `bg-amber-100 text-amber-700…` CSS) | Should delegate to SemanticBadge |
| | `hr/shared/hr-ui.tsx:269` `HrStatusBadge` (hand-rolls CSS, not SemanticBadge) | |
| | `hr/recruitment/hiring-flows/round-type-badge.tsx` | Uses SemanticBadge ✓ |
| | `hr/cases/case-badges.tsx` | Uses SemanticBadge ✓ |
| | `hr/safety/incident-badges.tsx` | Uses SemanticBadge ✓ |
| | `hr/templates/template-kind-badge.tsx` | Uses SemanticBadge ✓ |
| | `hr/travel/travel-status-helpers.tsx` | Custom inline badge |
| | `payroll/bonuses/bonus-status-badge.tsx` | Uses SemanticBadge ✓ |
| | `payroll/components/component-type-badge.tsx` | — |
| | `payroll/ess/components/ess-status-badge.tsx` | — |
| | `payroll/fnf/fnf-status-badge.tsx` | — |
| | `payroll/inputs/period-status-chip.tsx` | — |
| | `payroll/loans/loan-status-badge.tsx` | — |
| | `payroll/reimbursements/reimbursement-status-badge.tsx` | — |
| | `payroll/runs/run-status-badge.tsx` | — |
| | `payroll/shared/payroll-status-badge.tsx` | Uses SemanticBadge ✓ |
| | `payroll/taxes/tax-window-status-badge.tsx` | — |
| | `billing/invoice-detail.tsx:38-53` | Inline `STATUS_BADGE` record with Tailwind classes (bypasses SemanticBadge) |

**Total:** 18 feature-level badge files/inline definitions vs 1 canonical SemanticBadge.

### 2b. Money Rendering (HIGH — ~22 bypass sites)
See full list in §3.

### 2c. Export/Download Buttons (MEDIUM — 4 implementations)
| Implementation | File |
|---|---|
| `export-assets.ts` | `features/hr/assets/export-assets.ts` |
| `export-employees.ts` | `features/hr/employees/export-employees.ts` |
| `work-log-export.ts` | `features/hr/work-logs/work-log-export.ts` |
| `export-csv-button.tsx` | `features/payroll/reports/export-csv-button.tsx` |

No shared `ExportCsvButton` primitive exists.

### 2d. Employee Selector (MEDIUM — many ad-hoc implementations)
`EmployeePicker` at `features/hr/shared/employee-picker.tsx` imported in 1 file only. All other employee-selection flows implement their own combobox or select.

### 2e. Confirm Dialogs (LOW — 2 primitives + 1 bypass)
- `ConfirmSheet` used in ~20 HR files
- `ConfirmDialog` used in `template-lifecycle-actions.tsx:6`
- Raw `AlertDialog` used in `billing/invoice-detail.tsx:23-29` (bypasses both primitives)

### 2f. Buttons with hand-rolled pending state (MEDIUM — ~20 sites)
Sites using `disabled={mutation.isPending}` without `LoadingButton`:
- `features/hr/attendance/manage-holidays-card.tsx:297,320,332`
- `features/hr/document-review/review-sheet.tsx:312,319`
- `features/hr/documents/template-table-cells.tsx:130,190`
- `features/hr/employees/detail/edit-employee-form.tsx:270`
- `features/hr/expenses/expense-item.tsx:296`
- Several more across HR (partial list above; 20+ occurrences total)

---

## 3. Money & Date Rendering

### Money

**Shared formatter:** `features/payroll/shared/payroll-format.ts` exports `formatMoney(amount, currency="INR")` using `Intl.NumberFormat`. Payroll uses it correctly (25+ call sites).

**HR bypasses (all violations):**

| Pattern | File:Line |
|---|---|
| `new Intl.NumberFormat("en-IN", { style: "currency" … })` | `hr/analytics/command-center-section.tsx:99-105` |
| `₹${(plan.premiumCents / 100).toLocaleString("en-IN")}` | `hr/benefits/benefit-plan-card.tsx:64` |
| `₹{(claim.amountCents / 100).toLocaleString("en-IN")}` | `hr/benefits/claim-review-sheet.tsx:139` |
| `${Number(item.netPayable).toLocaleString("en-IN")}` (×3) | `hr/fnf/fnf-page-client.tsx:132,137,142` |
| `₹${contract.stipendCents / 100).toLocaleString()}` | `hr/global/contingent-page-content.tsx:139` |
| `$${(budgetedCostCents / 100).toLocaleString()}` | `hr/governance/components/positions-table.tsx:97` |
| `new Intl.NumberFormat("en-IN"…).format(Number(val))` (×3) | `hr/recruitment/candidate-detail/offer-approval-sheet.tsx:17`, `offer-card.tsx:33`, `offer-negotiation-sheet.tsx:26` |
| `₹${parseFloat(referral.rewardAmount).toLocaleString()}` | `hr/recruitment/referrals/external-referrals-tab.tsx:202` |
| `₹${parseFloat(referral.bonusAmount).toLocaleString()}` | `hr/recruitment/referrals/internal-referrals-tab.tsx:129` |
| `${Number(req.budgetMin).toLocaleString()} – ${Number(req.budgetMax).toLocaleString()}` | `hr/recruitment/requisitions/requisition-card.tsx:229-232` |
| `${currency} ${values.salaryMin.toLocaleString()}` | `hr/recruitment/jobs/create-job-form/job-posting-preview.tsx:33` |
| `${(comp.comp-cycle budget / 100).toLocaleString("en-US")}` | `hr/enterprise/comp/comp-cycle-detail.tsx:33`, `comp-cycle-list.tsx:24` |
| `₹{Number(item.invoiceAmount).toLocaleString()}` | `hr/recruitment/vendors/submission-sheet.tsx:214,218` |
| inline `n.toLocaleString("en-IN", { style: "currency"…})` | `hr/assets/asset-constants.ts:3` |

**Billing bypasses:**
| Pattern | File:Line |
|---|---|
| local `fmt()` = `₹${Number(amount).toLocaleString("en-IN"…)}` | `billing/invoice-detail.tsx:71` |
| local `fmt()` | `billing/invoice-line-items.tsx:26` |
| local `fmt()` | `billing/record-payment-dialog.tsx:44` |
| `${symbol}${Number(amount).toLocaleString("en-IN")}` | `billing/components/payments-tab.tsx:23` |
| `₹${displayPrice.toLocaleString("en-IN")}` | `billing/components/plan-card.tsx:86,91` |

**Payroll bypasses (partial):**
| Pattern | File:Line |
|---|---|
| `₹{Number(row.amount).toLocaleString("en-IN")}` | `payroll/loans/loans-table.tsx:158` |
| `n.toLocaleString("en-IN", { style: "currency"…})` | `payroll/salary-structures/salary-structures-page.tsx:38` |
| `n.toLocaleString("en-IN", …)` (local fmt) | `payroll/salary-structures/salary-structure-template-sheet.tsx:72` |
| `new Intl.NumberFormat("en-IN", …)` | `payroll/inputs/inputs-section-tabs.tsx:207` |

**Currency without visible code:** `billing/invoice-detail.tsx`, `invoice-line-items.tsx`, and `record-payment-dialog.tsx` all render ₹ symbol directly without ISO currency code in the label. `features/hr/expenses/components/expense-form-schema.ts:60` embeds `₹99,99,99,999.99` in a Zod validation message.

### Date

No single shared date formatter. All scope files use `date-fns` `format()` directly. Format strings are inconsistent: `"MMM d, yyyy"` vs `"dd MMM yyyy"` vs `"yyyy-MM-dd"`. No violations per se (date-fns is the standard), but a single `formatDate(date)` util would enforce consistency.

---

## 4. Business Logic in the Frontend

**VIOLATIONS (§0 Cardinal Rule 4 + §6 Frontend↔Backend boundary):**

### BL-01 — Payroll arithmetic in salary-structure-template-sheet (P0)
**File:** `features/payroll/salary-structures/salary-structure-template-sheet.tsx:56-84`

`CtcPreview` component calculates:
```
hra = basic × hraPercent / 100
gross = basic + hra + special + medical + travel + other
pfDeduction = basic × pfPercent / 100
estimatedNet = gross - pfDeduction - profTax
```
This is real payroll/statutory arithmetic (PF = 12% of basic, HRA %). Even as a "preview," the formula matches the computation the backend should own. The UI should call `GET /payroll/salary-structures/preview` and display the server's result.

### BL-02 — Gross/net derivation in employee-detail-page (P0)
**File:** `features/payroll/employees/employee-detail-page.tsx:261-266`

```ts
const monthlyGross = earningSum > 0 ? earningSum : parseFloat(activeProfile.annualCtc) / 12;
const estimatedNet = monthlyGross - deductionSum;
```
Computes estimated monthly gross (annualCtc ÷ 12) and net in a UI component. This is payroll computation.

### BL-03 — Billing display-price arithmetic (LOW, borderline)
**File:** `features/billing/components/plan-card.tsx:53,55`

```ts
const displayPrice = billingCycle === "annual" ? getAnnualMonthlyPrice(config.monthlyPrice) : config.monthlyPrice;
const annualTotal = Math.round(config.monthlyPrice * 12 * 0.8);
```
`annualDiscountPct` comes from `lib/pricing.ts` which mirrors the backend catalog. The discount constant is maintained in sync via a test, so this is borderline acceptable UI display math — but `annualTotal` hard-codes `0.8` instead of using `PRICING.annualDiscountPct / 100`, which is a drift risk.

---

## 5. LOC Violations

### Hard review (>500 lines — must split)
| File | Lines |
|---|---|
| `features/billing/invoice-detail.tsx` | **592** |
| `features/hr/leaves/components/leaves-shared.tsx` | **540** |

### Soft cap zone (>300 ≤500 — many, select worst)
| File | Lines |
|---|---|
| `features/payroll/taxes/filings-tab.tsx` | 495 |
| `features/hr/performance/pip-tab.tsx` | 494 |
| `features/hr/announcements/announcement-form-sheet.tsx` | 488 |
| `features/billing/invoice-line-items.tsx` | 473 |
| `features/hr/performance/reviews-tab.tsx` | 473 |
| `features/hr/handbook/handbook-page-client.tsx` | 469 |
| `features/payroll/inputs/inputs-section-tabs.tsx` | 456 |
| `features/hr/performance/pip-form-fields.tsx` | 456 |
| `features/hr/forms/components/form-builder.tsx` | 455 |
| `features/hr/leave-policies/policy-form-sheet.tsx` | 451 |
| `features/hr/expenses/expense-list.tsx` | 451 |
| `features/hr/onboarding/bulk-onboard-template.ts` | 448 |
| `features/hr/fnf/fnf-page-client.tsx` | 447 |
| `features/hr/work-logs/work-log-entry-row.tsx` | 444 |
| `features/hr/attendance/attendance-email-dialog.tsx` | 442 |
| `features/payroll/team/team-page.tsx` | 439 |
| `features/payroll/runs/breakdown-sheet.tsx` | 438 |
| `features/hr/performance/cycles-tab.tsx` | 435 |
| `features/hr/documents/template-editor.tsx` | 433 |
| `features/hr/engagement/recognition-feed.tsx` | 425 |
| + 10 more files 300-424 lines | — |

Total: **2 over 500**, **~25 in 300-500**.

---

## 6. State Coverage

### Coverage classification (across 83 DataTable-using files + major list surfaces)

| Surface category | Skeleton | Empty+action | Error+retry | Upsell/not-entitled |
|---|---|---|---|---|
| HR list pages (employees, leaves, assets, bgv…) | ✓ (most) | ✓ (EmptyState + illustrations) | ✓ (ErrorState or inline) | ✗ (no EntitlementGate) |
| HR sub-panel tables (attendance daily, doc-review…) | ✓ partial (some use DataTable built-in skeleton) | ✓ (EmptyState) | ✗ (few have retry) | ✗ |
| Payroll list pages (runs, employees, loans…) | ✓ (most) | ✓ | ✓ | ✗ |
| Billing (plan-tab, payments, invoices) | ✓ (Skeleton) | ✓ (inline) | ✓ | — (billing IS the upsell surface) |

**Issues:**
- **No entitlement/upsell state** on any HR/payroll surface. No `EntitlementGate` component → if a module is disabled or plan limit exceeded, the user sees either a 403 or empty state without an upsell CTA.
- ~15 sub-panel empty states use icon-only `EmptyState` without an illustration (violation of §15 rule: main-region empty states must use `StateIllustration`).
- `features/hr/recruitment/referrals/external-referrals-tab.tsx:273` and `internal-referrals-tab.tsx:194` pass `onRetry={() => void refetch()}` — good. But `features/hr/governance/components/labor-tabs.tsx` (418 lines) shows no explicit error state in the code path.

---

## 7. Responsive

### Raw Popover/Sheet used for filter/menu without mobile Drawer path

| File:Line | Issue |
|---|---|
| `features/hr/work-logs/work-log-advanced-filters-sheet.tsx:151` | Raw `<Sheet>` used for multi-section "Advanced Filters" panel; `SheetContent` is `w-full sm:max-w-sm` but Sheet on mobile is still a side-slide, not a bottom Drawer. Should be `ResponsivePopover` or a proper `<Drawer>` on `<md`. |

All other HR filter bars use flat flex rows (compliant). Payroll uses `MobileFilterDrawer` (wraps `ResponsivePopover`) in `reimbursements-page.tsx` and `report-filters.tsx` — compliant.

**DateRangePicker bypass:** `attendance-email-dialog.tsx:333-353` uses two separate `<DatePicker>` fields with `startDate/endDate` state and manual validation; `feedback/cycles-tab.tsx:258-270` does the same. Both should use `<DateRangePicker>` from `components/ui/date-range-picker.tsx`.

**Fixed-width / mobile risks:**
- `features/hr/work-logs/work-log-filter-actions.tsx:156`: `ResponsivePopoverContent className="w-[240px] p-0"` — fixed 240px, will clip at 360px.
- `features/payroll/shared/mobile-filter-drawer.tsx` — correctly uses `ResponsivePopover`, safe.

---

## 8. Forms

- **Total form files using react-hook-form:** 211
- **With zodResolver:** ~194 (parent form files; field-component files inherit the form context)
- **Without zodResolver (form files, not field components):** 0 confirmed violations at the form-owner level. All standalone forms (`*-sheet.tsx`, `*-dialog.tsx`, `*-form.tsx`) that own a `useForm` call also import `zodResolver`.
- **Field-component files using useForm without zodResolver (17):** These are sub-components (`compensation-qualifications-sections.tsx`, `job-basics-sections.tsx`, etc.) that use `useFormContext()` from a parent — acceptable pattern.

**Pending state:**
- `LoadingButton` adopted in 180 files (strong adoption).
- ~20 buttons use `disabled={mutation.isPending}` without showing a spinner (e.g. `hr/documents/template-table-cells.tsx:130,190`, `hr/document-review/review-sheet.tsx:312,319`). These are inline action buttons in table cells — the `AnimatedIconButton`/`forwardRef` sub-component pattern should be used here.

**Unsaved-changes guard:**
- Applied on `edit-employee-form.tsx`, `hr-sheet.tsx` (the shared HR sheet wrapper), `leave-policies/policy-form-sheet.tsx`.
- **NOT applied** on `salary-structure-template-sheet.tsx` (300+ lines of form), payroll `setup-wizard.tsx` steps, `policy-upsert-sheet.tsx`, `automation-upsert-sheet.tsx`.

---

## 9. Type Safety

**Zero** `as any`, `: any`, `@ts-ignore`, `@ts-expect-error`, or `as unknown as` in the entire hr/payroll/billing scope.

Full grep across 619 files returned **0 matches**. Type safety is excellent.

---

## 10. Raw Network Calls

Only **one** `fetch()` call found in scope:

| File:Line | Classification |
|---|---|
| `features/hr/documents/document-table.tsx:73` | `fetch(doc.fileUrl)` — fetching a signed object-storage URL for document download. **Legitimate** (not an API business call). |

All other API calls go through TanStack Query hooks in `hooks/api/`. No `axios` usage found. **Clean.**

---

## 11. Accessibility Spot-Check

- **Icon-only buttons:** `TooltipIconButton` is widely used (20+ files) and provides accessible labels via tooltip. Most icon-only interactive buttons are compliant.
- **Bare icon buttons without label:** `features/hr/attendance/manage-holidays-card.tsx:297,320,332` — `<LoadingButton>` with only an `<Icon>` child and no `aria-label`. Also `features/hr/document-review/review-sheet.tsx:312,319` — `<Button>` with only icon.
- **Form controls without labels:** ~1,526 control usages without visible `<Label>` in the same line (many are wrapped in `<FormItem>/<FormLabel>` shadcn structure at the parent; can't confirm label absence without full tree walk, but this ratio warrants attention).
- **Dialog focus management:** `AlertDialog` in `billing/invoice-detail.tsx` uses Radix AlertDialog (focus managed). Standard shadcn `Dialog` sheets have focus traps built in. No custom modals bypass this.
- **`aria-hidden` on decorative icons:** HR analytics charts use `aria-hidden` on icons — compliant.

---

## 12. Top 25 Findings

| # | SEV | File:Line | Finding |
|---|---|---|---|
| 1 | **P0** | `payroll/salary-structures/salary-structure-template-sheet.tsx:56-84` | HRA/PF/gross/net payroll arithmetic in UI component — §4 violation; backend must own this. |
| 2 | **P0** | `payroll/employees/employee-detail-page.tsx:261-266` | Monthly gross (annualCtc÷12) and net computed in component — payroll business logic in frontend. |
| 3 | **HIGH** | `billing/invoice-detail.tsx` (592 LOC) | Over 500-line hard cap; inline `fmt()` duplicating `formatMoney`; raw `AlertDialog` bypassing `ConfirmDialog`/`ConfirmSheet`; inline STATUS_BADGE duplicating SemanticBadge. |
| 4 | **HIGH** | `hr/leaves/components/leaves-shared.tsx` (540 LOC) | Over 500-line hard cap; must split by responsibility. |
| 5 | **HIGH** | `hr/leaves/components/leave-status-badge.tsx` | Hand-rolls Tailwind color CSS instead of delegating to `SemanticBadge`. Pattern repeated in `HrStatusBadge` (`hr/shared/hr-ui.tsx:269`). |
| 6 | **HIGH** | `hr/analytics/command-center-section.tsx:99-105` | Local `formatCurrency()` duplicating `formatMoney`; renders `cents/100` division in UI (financial computation). |
| 7 | **HIGH** | `billing/components/plan-card.tsx:55` | `annualTotal = Math.round(config.monthlyPrice * 12 * 0.8)` hard-codes 0.8 discount instead of `PRICING.annualDiscountPct/100` — drift risk vs backend. |
| 8 | **HIGH** | Scope-wide (billing) | 4 separate local `fmt()` / `toLocaleString` formatters in `billing/invoice-detail.tsx:71`, `billing/invoice-line-items.tsx:26`, `billing/record-payment-dialog.tsx:44`, `billing/components/payments-tab.tsx:23` — none use `formatMoney`. |
| 9 | **HIGH** | `hr/` (15+ sites) | HR bypasses `formatMoney` entirely; inline `₹ … .toLocaleString("en-IN")` or `new Intl.NumberFormat` scattered across benefits, fnf, offers, referrals, comp cycles, assets. |
| 10 | **HIGH** | Scope-wide | No `EntitlementGate` component. Paywall/upsell state missing on ALL HR and payroll list surfaces. |
| 11 | **MED** | `hr/work-logs/work-log-advanced-filters-sheet.tsx:151` | Raw `<Sheet>` for multi-section filter panel — mobile Drawer path missing (§14 violation). |
| 12 | **MED** | `hr/attendance/attendance-email-dialog.tsx:333-353`, `hr/feedback/cycles-tab.tsx:258-270` | Two separate `<DatePicker>` fields for date ranges; shared `<DateRangePicker>` primitive exists but unused. |
| 13 | **MED** | `RouteErrorBoundary` | Exists in `components/ui/` but **never used** in HR/payroll/billing. Features use ad-hoc inline error states or `components/shared/error-state.tsx`. |
| 14 | **MED** | `AiUsageChip` | Exists in `components/ai/ai-usage-chip.tsx` but **never rendered** on any HR/payroll AI surface (`ess-payslips-section.tsx` uses `AiActionsMenu` but omits usage chip). |
| 15 | **MED** | 18 badge files | Proliferated feature-level status badge files instead of extending `SemanticBadge`. Payroll's `payroll-status-badge.tsx` is the correct pattern to generalize. |
| 16 | **MED** | `EmployeePicker` | Feature-scoped at `features/hr/shared/employee-picker.tsx`; imported in exactly 1 file. Employee selection elsewhere is ad hoc — this primitive is not surfaced as shared. |
| 17 | **MED** | `billing/invoice-detail.tsx:23-29` | Raw `AlertDialog` for delete confirmation instead of `ConfirmDialog`/`ConfirmSheet`. |
| 18 | **MED** | `payroll/taxes/filings-tab.tsx` (495 LOC), `hr/performance/pip-tab.tsx` (494 LOC) | Approach soft cap; both contain embedded sub-section rendering that can split. |
| 19 | **MED** | ~20 sites | Buttons with `disabled={mutation.isPending}` without `LoadingButton` (table-cell action buttons and icon-only actions). |
| 20 | **MED** | No shared approval-timeline | `hr/exit/progress-timeline.tsx`, `payroll/runs/run-status-stepper.tsx`, `payroll/payout/run-stage-actions/approval-stage-panel.tsx` all build independent approval progress UIs. |
| 21 | **LOW** | `billing/components/plan-card.tsx:55` | `annualTotal` uses `* 0.8` literal; should use `PRICING.annualDiscountPct`. |
| 22 | **LOW** | `hr/salary-structures/salary-structure-template-sheet.tsx` | No `UnsavedChangesGuard` on a 300+ line form. |
| 23 | **LOW** | `payroll/shared/payroll-format.ts` | `formatMoney` lives in `features/payroll/shared/` not `lib/` — HR cannot naturally discover/import it, causing HR to build inline alternatives. Move to `lib/format-money.ts`. |
| 24 | **LOW** | Date rendering | No shared `formatDate()` util. `format(date, "MMM d, yyyy")` vs `format(date, "dd MMM yyyy")` inconsistency across HR tables. |
| 25 | **LOW** | `hr/work-logs/work-log-filter-actions.tsx:156` | `ResponsivePopoverContent` has fixed `w-[240px]` — clips at 360px viewport. |

---

## Coverage Gaps

- **Recruitment module** is entirely inside `features/hr/recruitment/` (88 files); Lane F2's audit covered it as part of HR. If a separate recruitment audit lane is needed, it should target `features/hr/recruitment/**`.
- **`hooks/api/hr/**` and `hooks/api/payroll/**`** — Lane F3 owns hooks; not covered here.
- **`app/(authenticated)/hr/**` pages and route files** — Lane F1 owns app routes; not covered here.
- **State machine correctness** (whether TQ enabled gates are wired correctly per §11) — not verified here; requires cross-checking hook definitions (Lane F3 scope).
