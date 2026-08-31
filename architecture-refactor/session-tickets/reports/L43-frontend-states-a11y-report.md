# L43 — Frontend States, A11y, Responsive Report

**Status: COMPLETE** — All filtersActive + description conditionals, motion violations, and AP-7/AP-8 fixes applied across `features/**`.

## Surfaces with completed state matrix

| File | Loading | Error | Denied | Empty | Filter-empty | Fixed |
|---|---|---|---|---|---|---|
| `features/hr/work-logs/work-log-state-cards.tsx` | spinner→skeleton | present | — | present | — | AP-7 |
| `features/hr/cases/case-detail-sheet.tsx` | 2×spinner→skeleton | — | — | present | — | AP-7 |
| `features/hr/safety/burnout-flags-list.tsx` | spinner→skeleton | — | — | present | — | AP-7 |
| `features/hr/safety/wellness-trend-chart.tsx` | spinner→skeleton | — | — | present | — | AP-7 + AP-8 |
| `features/chat/saved-messages-panel.tsx` | spinner→skeleton | present | — | present | — | AP-7 |
| `features/chat/shared-files-panel.tsx` | spinner→skeleton | — | — | present | — | AP-7 |
| `features/support/inbox/ticket-list.tsx` | spinner→skeleton | — | — | present | — | AP-7 |
| `features/support/inbox/ticket-detail-sheet.tsx` | spinner→skeleton | — | — | — | — | AP-7 |
| `features/hr/helpdesk/queue-tab.tsx` | skeleton (ok) | **added ErrorState** | — | present | **added filtersActive** | missing isError |
| `features/wiki/components/knowledge-base-page.tsx` | ok | ok | — | — | — | AP-4: rounded-2xl→rounded-xl |

## filtersActive coverage (47 usages shipped)

All 27 pages with `filtersActive` now have **conditional `description`** — `description={isFiltered ? undefined : "data-empty copy"}` — so the data-empty copy never renders alongside the "Clear filters" button. Pages fixed this session (in addition to those from previous session):

- `features/build/bugs/bugs-page.tsx`
- `features/build/change-requests/change-requests-page.tsx`
- `features/build/approvals/project-approvals-page.tsx`
- `features/build/all-work/all-work-page.tsx`
- `features/build/forms/forms-list-page.tsx`
- `features/build/governance/decisions-page.tsx`
- `features/build/governance/risks-page.tsx`
- `features/build/incidents/incidents-page.tsx`
- `features/build/meetings/meetings-list-page.tsx`
- `features/build/managed-products/managed-products-page.tsx`
- `features/build/pm-workspaces/pm-workspaces-page.tsx`
- `features/build/portfolios/portfolios-page.tsx`
- `features/build/customers/project-customers-page.tsx`
- `features/crm/deals/deal-list.tsx`
- `features/crm/leads/leads-funnel-view.tsx`
- `features/hr/helpdesk/queue-tab.tsx`
- `features/inventory/components/traceability/lots-client.tsx`
- `features/inventory/components/traceability/serials-client.tsx`
- All 6 hierarchy pages (`branches`, `departments`, `teams`, `locations`, `cost-centers`, `business-units`)

## Motion violations fixed

- **`width` → `scaleX`**: `ticket-checklists.tsx`, `command-center-rows.tsx`, `module-card.tsx`
- **`width` → CSS `transform: scaleX()`**: `accounting/banking/reconciliation-match-panel.tsx`
- **`width` → `opacity + x` + fixed `w-80`**: `chat/message-panel-side-panels.tsx`
- **`width` → plain `style={{ width }}` (bar chart, no animation)**: `crm/leads/leads-funnel-view.tsx` (row animates via parent `opacity+x`)
- **`height` → `y` transform**: `build/settings/labels-settings.tsx`, `statuses-settings.tsx`, `custom-fields-settings.tsx`, `ticket-checklists.tsx`, `chat/message-input.tsx`
- **`height` → `opacity` only**: `build/views/workload-member-row.tsx`, `workload-view.tsx`
- **`width` → `opacity + x`**: `build/ticket-details/ticket-detail-right-panel.tsx`

## Unbounded collections

- `hooks/api/build/change-requests.ts` returns `ChangeRequest[]` with no pagination. **OUT-OF-OWNERSHIP** — hook is in `hooks/api/` (another lane). Needs `page`/`limit` params + `{ data, pagination }` return shape to enable server-mode `DataTable`.

## A11y findings

All gate checks pass: `check:icon-labels` ✓, `check:empty-states` ✓, `check:effect-fetches` ✓, `check:formatters` ✓, `check:colors` ✓, `check:query-scope` ✓, `check:dead-code` ✓ (within baseline).

## Anti-patterns removed

- **AP-7** (8 files): `Loader2`/`animate-spin` as panel loading state → Skeleton rows matching real layout
- **AP-4** (1 file): `rounded-2xl` on wiki shell card → `rounded-xl`
- **AP-8** (1 file): Recharts hardcoded hex → CSS tokens

## Test summary

`hierarchy-lifecycle-invariants.test.ts` regex updated from `/action=\{\s*canManage\s*\?/` to `/action=\{\s*canManage(\s*&&\s*[^?]*)?\s*\?/` to match `action={canManage && !serverSearch ? ...}` pattern introduced by hierarchy page fixes. All assertions pass.
