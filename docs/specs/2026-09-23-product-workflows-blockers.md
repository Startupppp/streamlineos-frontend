# Product & external workflows — blockers index

Recorded 2026-09-23, branch `claude/build-product-workflows` (both repos).

## Decided 2026-09-23 — four blockers closed by the product owner

| Blocker | Decision | Migration |
|---|---|---|
| lane 2 B1 — duplicate filter | **Dropped, permanently.** Not built. `feedbucket-list-filters.spec.ts:106-111`, which asserts a `duplicate` param 400s, stays green as the record of that choice. Delivered filters are owner, linked, date and cursor. | none |
| lane 4 B1/B5 — CRM tier | **Explicit, human-entered tier on the account.** `free \| pro \| enterprise`, published on the CRM organization contract; roadmap score is weighted by the highest tier among the accounts of linked feedback. Deal revenue, the fuzzy-name rollup and `crm_companies.revenue` were all rejected as unverified and remain unused. | `1160_crm_account_tier` |
| lane 3 B5 — client financial visibility | **Per-project setting**, `summary \| raw`, defaulting to `summary`. A worker's raw timesheet note no longer reaches the client portal unless a project opts in. | `1161_build_project_invoice_line_detail` |
| lane 2 B2 — retention | **Media purged 30 days after soft delete.** The submission row is retained for audit; a bounded, resumable sweep deletes the stored objects and stamps `media_purged_at`. | `1162_feedbucket_media_retention` |

All three migrations were hand-authored, journalled, given rollbacks, dry-run,
applied to production one tag at a time, and verified against the live catalog
(14 checks, all passing). The production ledger was already at head beforehand —
915/915 applied, 0 pending — so nothing else was replayed.

**Still open:** billing/plan gating of bulk actions (lane 2 B5), intake and Change
Request cardinality (lane 3 B6), public roadmap score visibility (lane 4 B7), and
the pre-existing defects listed below.

Nineteen blockers across three lanes. Each is a **product or schema decision**, not
unfinished code. Per-lane detail, with file:line evidence and options, lives in:

- [lane 2 — Feedbucket](2026-09-23-product-workflows-blockers-lane2.md)
- [lane 3 — freelancer chain](2026-09-23-product-workflows-blockers-lane3.md)
- [lane 4 — CRM inputs & roadmap scoring](2026-09-23-product-workflows-blockers-lane4.md)

Lane 1 (ticket import/export) recorded none — nothing in it needed a decision.

## Two constraints that turned work into blockers

**No migration could ship.** BE-66 requires proving a migration by replaying it on
an empty database. No non-production Postgres is reachable from here, so any
blocker whose fix is a column is barred on evidence, not on effort.

**No permission key could be added.** BE-112 requires the backend and frontend
catalogues to change together; both are shared files under concurrent edit. Every
lane used existing keys only. Nothing here was actually blocked by this.

## By decision owner

### Product — the categories that were named as off-limits to guess

| Category | Blocker |
|---|---|
| Retention | lane 2 B2 — soft-deleting a submission leaves its media in storage; no sweep exists |
| Billing | lane 2 B5 — bulk actions have no rate-limit tier or plan gate |
| Visibility | lane 3 B5 — generated invoice lines embed the worker's raw timesheet text, and the detail contract already publishes it |
| Intake | lane 3 B6 — untouched, no decision available |
| Change Request cardinality | lane 3 B6 — untouched, no decision available |
| Public exposure | lane 4 B7 — should a prioritization score show on the public roadmap board |

### Schema — each needs a column, so each needs a provable migration first

| Blocker | What is missing |
|---|---|
| lane 2 B1 | no duplicate/merged-into column on `feedbucket_submissions`; an existing spec asserts the filter 400s |
| lane 2 B6 | no index matches the new keyset `ORDER BY` |
| lane 3 B1 | no `invoices.deal_id`; a deal is reachable only via the quote |
| lane 4 B1 | no tier / plan / segment / ARR / MRR / contract-value field on `business_parties` |
| lane 4 B5 | `roadmap_items` has no CRM-linking column |

### Defects found while surveying — real, and none of them ours

| Blocker | Finding |
|---|---|
| lane 4 B2 | `GET /crm/organizations/:id/roll-up` joins accounts to deals by `ILIKE '%name%'` on the deal's free-text title, and sums **all** stages. Its `totalDealValue` is an approximation, not recognised revenue. |
| lane 4 B3 | `crm_companies.revenue` has no write path anywhere in `backend/src` — reads and test fixtures only. |
| lane 4 B4 | `feedback_posts.crm_organization_id`, `.crm_contact_id`, `.account_value_snapshot` are never written, yet two are published in the response contract. |
| lane 3 B3 | `create-invoice-draft` strands entries at `INVOICE_DRAFTED` forever — it writes an export snapshot and no invoice, while `getUninvoiced` filters `= 'UNINVOICED'`. |
| lane 3 B4 | Voiding an invoice does not release the time it billed; those hours become permanently unbillable. |
| lane 3 B2 | `invoices.client_id` has no FK and two candidate id spaces (`projects.clientMembershipId` is a membership, `deals.clientId` is a CRM client). |

**Why B2/B3/B4 in lane 4 matter beyond their own rows:** they are why CRM
revenue/tier weighting was not wired into roadmap scoring. A column existing, or
even being echoed in a Zod response schema, is not evidence the data exists. Each
of those three fields looks available and is not.

## Not blocked, already applied

- lane 4 B8 — the `roadmap.itemSignals` query-key factory entry. Applied centrally
  in `frontend/lib/query-keys/knowledge-and-surveys.ts`.
- lane 2 B3 — offset pagination stays available when no cursor is sent, so the
  managed-products feedback page keeps its pager. Cursor requests are pure keyset
  with no fabricated total. A follow-up lane should finish the cutover.
