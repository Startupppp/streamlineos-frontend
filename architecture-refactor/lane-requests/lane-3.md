# Lane 3 requests — one contract for every list

Written by Lane 3 (c13 · c12-02 · c16-04 · c19-01 · c19-04). Lane 3 does not apply any of these:
each one touches a file four sessions collide on, or a module outside this lane's territory.

---

## 1. Migration `0478` is missing from the journal and will never run

**Act on this one.** `backend/migrations/0478_invoice_line_items_column_drop.sql` exists on disk but has
no entry in `backend/migrations/meta/_journal.json`. A `.sql` file absent from the journal never
applies, and `db:migrate` still reports success — so the `invoices.line_items` JSONB column would
silently survive a migration run that looked clean. `0477_invoice_items_backfill` **is** in the
journal, at `idx: 267`, so the backfill would run and the drop would not.

Append to `entries` (last entry today is `idx: 297`, `when: 1787830369441`; keep the timestamp
strictly increasing, and keep it after `0477`'s `1787779953441`):

```json
{
  "idx": 298,
  "version": "7",
  "when": 1787830370441,
  "tag": "0478_invoice_line_items_column_drop",
  "breakpoints": true
}
```

Sequence matters: `0477` (backfill) must be applied and reconciled before `0478` (drop) runs.
Neither is applied — no database has been touched in this program.

This is the blocker for **c16-04**, whose eight criteria all name 0477 or 0478. Nothing was built
against it.

---

## 2. Offset-only list modules outside Lane 3's territory — c13-03

143 files call `.offset()` directly. Lane 3 owns build, accounting, invoices, quotes, crm, chat, mail
and search — 19 of the 143. The other 124 are listed here. Nothing is ticked for them.

Converting these is **not** blanket work: the PRD puts all 143 out of scope and says offset is fine
for a page-numbered admin table. What follows is an inventory, not a work order.

**hr (42)** — `benefits/hr-benefits-claims`, `benefits/hr-benefits-plans`, `cases/hr-cases`,
`cases/hr-disciplinary`, `cases/hr-safety`, `core/hr-effective-changes`,
`core/hr-employee-record-lists`, `core/hr-timeline`, `enterprise-comp/comp-planning`,
`enterprise-comp/devices`, `enterprise-comp/equity`, `enterprise-comp/payroll-compliance`,
`enterprise-ops/accommodations/accommodations`, `enterprise-ops/emergency/emergency`,
`enterprise-ops/event-stream/event-stream`, `enterprise-ops/identity/identity`,
`enterprise-ops/simulator/simulator`, `forms/hr-forms`, `forms/hr-forms-submissions`,
`global/compliance-requirements`, `global/contracts`, `global/work-authorizations`,
`governance/delegations/delegations`, `governance/labor/labor`,
`governance/legal-holds/legal-holds`, `governance/positions/positions`,
`governance/retention/retention`, `helpdesk/hr-helpdesk`, `import/hr-import`,
`lifecycle/onboarding-views`, `lifecycle/termination`, `payroll-inputs/payroll-inputs`,
`performance/rich-documents`, `recruitment/recruitment-offers`,
`recruitment/recruitment-sourcing`, `recruitment/recruitment-talent-pools`,
`templates/hr-templates`, `time/attendance`, `time/attendance-summary`, `time/overtime`,
`workflows/hr-workflow-definitions`, `workflows/hr-workflow-instances` — all `.service.ts`.

**finance (24)** — `ap/payment-runs`, `ap/recurring-bills`, `ap/vendor-credits`,
`ap/vendor-payments-list`, `ar/ar-payments`, `ar/collections`, `ar/credit-notes`,
`ar/recurring-invoices`, `ar/reminders`, `assets/asset-categories`, `assets/assets`,
`assets/depreciation-runs`, `banking/bank-accounts`, `banking/imports`, `banking/reconciliation`,
`banking/transfers`, `controls/approval-policies`, `controls/approvals`, `controls/audit-surface`,
`controls/exchange-rates`, `planning/budgets`, `tax/tax-codes`, `tax/tax-payments`,
`tax/tax-reports`.

**inventory (14)** — `channels/channels`, `import-export/export`, `import-export/import`,
`products/inv-product-catalog`, `replenishment/inv-replenishment`,
`reports/inv-reports-extended`, `shipments/carriers`, `shipments/loads`, `shipments/packages`,
`shipments/shipments`, `traceability/inv-traceability`, `valuation/inv-valuation`,
`warehouses/inv-warehouses`, `webhooks/webhooks`.

**payroll (7)** — `hr-payroll/bonuses`, `hr-payroll/incentives`, `insights/journal-outbox`,
`runs/profiles`, `runs/runs`, `setup/components`, `setup/templates`.

**timesheets (5)** — `core/approvals`, `core/entries-read`, `core/exceptions`,
`core/timesheets-audit`, `payroll/payroll-export`.

**kb (3)** — `help-centre/kb-articles`, `help-centre/kb-verification`, `retrieval/kb-search`.

**two files each** — workflows (`workflows-crud`, `workflows-execution`), users
(`organization-users.reader`, `user-profile`), rbac (`principal-groups`, `roles`), organization
(`core/invitations-read`, `core/org-membership`), module-access (`module-access`,
`module-access-groups`), billing (`core/ai-credits-packs`, `core/enterprise-quotes`), api-tokens
(`core/api-tokens`, `user/user-api-tokens`).

**one file each** — `audit-log/audit-log`, `contacts/contacts`, `deals/deals-analytics`,
`delegations/delegations`, `leads/leads-read`, `offer-fulfillment/offer-fulfillment`,
`ownership/ownership-transfers`, `party/party`, `portal/access/portal-access`, `public/kb`,
`settings/settings`, `storage/storage-kb.controller`, `tasks/tasks`, `webhooks/webhooks`.

### The one confirmed sequential list count

`backend/src/modules/payroll/setup/components.service.ts:51-54` — `list()` awaits the page query and
then awaits a separate `count()`. No window, no `Promise.all`. Outside Lane 3's territory. This is
the **only** confirmed instance on a normal request path; the ticket claimed 241. Three other
apparent instances (`accounting/gl/general-ledger.service.ts:128`,
`accounting/core/accounting-payables-query.service.ts:108,199,202`,
`build/execution/workspace.service.ts:126`) are empty-page fallbacks behind a `count(*) OVER ()`
primary path, not routine double round trips.

**83 files remain unclassified** — they hold `.offset()`, `count()` and a `Promise.all` in the same
file, but the `Promise.all` may sit in a different method. Whoever picks this up must audit
per-method; a per-file classification is systematically wrong.

---

## 3. Remaining local pagination-schema copies outside Lane 3's territory — c13-06

The ticket says "16 duplicated local copies". Verified: `page: z.coerce.number()` appears **204
times across 135 files**. Sixteen of those files are in Lane 3's territory and are now migrated
onto `pageNumberField` / `pageSizeField` (26 occurrences → 0). **178 occurrences across 119 files
remain**, all outside this lane:

- **hr** — 24 files, ~40 copies (`core/dto/hr-core.schemas.ts` 4, `lifecycle/dto/hr-lifecycle.schemas.ts` 4, `enterprise-ops/dto/*` 5, `governance/*.dto.ts` 5, `recruitment/dto/*` 4, rest 1–2 each)
- **inventory** — 17 files, ~35 copies (`reports/dto` 5, `stock/dto` 5, `quality/dto` 3, `replenishment/dto` 3, `shipments/dto` 3, rest 1–2)
- **finance** — 14 files, 26 copies (`ar/dto/finance-ar.schemas.ts` 6, `ap/dto/finance-ap.schemas.ts` 4, `controls/dto/finance-controls.schemas.ts` 3, `assets/dto/assets.schemas.ts` 3)
- **payroll** — 4 files, 9 copies · **timesheets** — 5 files, 5 · **surveys** — 4 files, 4 · **kb** — 3 files, 3
- **users** — 1 file, 4 copies · **module-access** — 1 file, 3 copies
- **api-tokens · billing · rbac · webhooks · workflows · portal** — 2 each
- **audit-log · automation · clients · contacts · delegations · e-sign · expenses · feedbucket · goals · leads · offer-fulfillment · organization · ownership · party · public · settings · storage · support · tasks** — 1 each

`backend/src/common/pipes/zod-validation.pipe.spec.ts` also matches but is an inline test fixture,
not a list endpoint. Leave it.

**The helper to migrate onto** is `backend/src/common/pagination/list-query.schema.ts`:
`pageNumberField`, `pageSizeField(defaultSize, maxSize?)`, `baseListQuerySchema`, `withSortField`.
Two rules for whoever does it, both learned here:

1. **Preserve the published query key.** Some endpoints spell it `limit`, some `pageSize`. Renaming
   is a silent client-contract break and is not part of this ticket.
2. **Preserve a tighter local ceiling.** `campaignListSchema` was `.max(50)`; migrating it to the
   platform cap would have doubled its page size. `pageSizeField(20, 50)` keeps it. Widening a cap
   is a capability change nobody asked for.

---

## 4. Cursor conversions Lane 3 could not reach — c13-05

The first acceptance criterion names surfaces beyond this lane's territory. Chat's three surfaces
(`chat-messages.service.ts` `list` and `listThreadReplies`, `chat-saved.service.ts`) now share
`buildIdCursorPage` from `backend/src/common/pagination/cursor.ts`. Still open:

- `backend/src/modules/notifications/broadcasts.service.ts` — inline `lt(id, cursor)`, does not use
  the shared helper. Mechanically the same shape chat had; `buildIdCursorPage` fits it directly.
- `backend/src/modules/build/core/projects-tickets-read.service.ts` — the ticket list is still
  page-numbered offset. The PRD names it as a surface that should be cursor, but its published
  contract and the frontend are page-numbered, so converting it is an API change. Lane 3 deliberately
  did not start it mid-program with three other lanes in the same checkout.

---

## 5. Frontend type drift left by c13-02

`frontend/types/projects/tasks.ts` types the board ticket's `description` as `string | null`
(non-optional), but the backend list projection no longer returns the column — `TICKET_LIST_COLUMNS`
in `backend/src/modules/build/core/projects-tickets-read.service.ts` has no `description` entry, and
`backend/src/modules/build/core/board-projection.spec.ts` now fails if it is re-added. The field
should become `description?: string | null`. Recorded rather than changed: the frontend lane owns
that file.
