# Lane 3 — Managed products & Feedbucket

Read [`LANE-COMMON.md`](./LANE-COMMON.md) first. It is binding.

Migration range: **1250–1254**. Status file: `status/LANE-3-STATUS.md`. Requests: `requests/LANE-3.md`.

## Your page specs (9 — 63 checkboxes)

| Spec | Route |
|---|---|
| `docs/build-module/10-managed-products.md` | `/build/managed-products` |
| `docs/build-module/10-managed-products-product.md` | `/build/managed-products/[productId]` |
| `docs/build-module/10-managed-products-product-feedback.md` | `…/feedback` |
| `docs/build-module/10-managed-products-product-goals.md` | `…/goals` |
| `docs/build-module/10-managed-products-product-insights.md` | `…/insights` |
| `docs/build-module/10-managed-products-product-projects.md` | `…/projects` |
| `docs/build-module/10-managed-products-product-roadmap.md` | `…/roadmap` |
| `docs/build-module/10-project-feedbucket.md` | `/build/[projectId]/feedbucket` |
| `docs/build-module/10-project-feedbucket-submission.md` | `…/feedbucket/[submissionId]` |

## Territory

**Frontend features:** `frontend/features/build/{managed-products,feedbucket}/**`

**Frontend routes:** `frontend/app/(authenticated)/build/managed-products/**`, `frontend/app/(authenticated)/build/[projectId]/feedbucket/**`

**Frontend hooks:** `frontend/hooks/api/build/{managed-products,managed-products-schema,managed-products-schema.test}.*`, plus any `feedbucket*` / `feedback*` hook file no other brief names.

**Backend:** `backend/src/modules/build/managed-products/**`, `backend/src/modules/feedbucket/**`, and in `backend/src/modules/build/core/`: `projects-feedback.service.ts` + its specs.

> `modules/feedbucket` is a top-level backend module, not under `modules/build`. It is yours.

## Lane-specific hazards, measured

- **There is no managed-product fixture row in any reachable tenant.** This is the single named
  blocker on P1-8 and it will hit criterion 7 on all five product sub-specs. Do **not** create
  production business data to unblock it — the release rule is explicit that no production rows were
  created solely for testing. Record it as blocked and cite the measurement.
- Managed-product **roadmap** and **insights** already render recoverable states without console
  errors per the 2026-09-25 desktop sweep. Detail pages for products have no production fixture, so
  only the parent empty state was exercised.
- Feedbucket is **already server-side complete** for P1-5: `backend/src/modules/feedbucket/feedbucket-submissions.service.ts`
  evaluates owner/linked/duplicate/date/cursor predicates in SQL; `feedbucket-submissions-bulk.ts`
  re-evaluates the supplied filters inside a transaction and bounds the mutation; 76 tests pass
  across `feedbucket-list-filters.spec.ts`, `feedbucket-list-predicate.spec.ts`,
  `feedbucket-submissions-bulk.spec.ts`, `feedbucket-bulk-route-contract.spec.ts`. Verify and cite;
  do not rebuild.
- Feedbucket state is **intentionally not** on the shared URL-state hook (Inbox, Cycles, Reports and
  detail overlays are the same exemption). Criterion 3's query-parameter clause is satisfied by the
  spec's own parameter list, not by forcing the shared serializer. Do not migrate it without a
  request.
- Feedback creation and CRM reassignment persist tenant-validated `accountTierSnapshot` and
  `accountValueSnapshot`; migration `1204_build_feedback_account_snapshots.sql` is **applied to
  production** with its column, partial index and ledger hash read back. Do not re-add.
- Capture-stack note for the web-vitals/feedbucket scripts: a build bakes the production API URL
  into the bundle. If you touch anything under a capture path, the check is
  `grep -rl "api.streamlineos.in" .next/static/chunks | wc -l` must be 0 — but you may not run
  `pnpm build`, so this is a request.
- Bulk actions must be **bounded and idempotent**. `@Idempotent` is a breaking change to a route's
  contract; adding it to an existing endpoint is a request, not an edit.
