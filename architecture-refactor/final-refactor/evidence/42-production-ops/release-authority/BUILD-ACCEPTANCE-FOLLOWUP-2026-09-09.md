# Build acceptance follow-up — 2026-09-09

Scope: close the KB reaper isolation gap, decide synchronous timesheet totals,
regenerate matching OpenAPI documents, and attempt browser state/Web Vitals checks.
This supplements, rather than replaces, the earlier committed Build test results.

## Tenant isolation

The KB gap is closed by
`backend/test/kb/kb-stuck-source-reaper-isolation.seeded-e2e-spec.ts`, committed as
`3bdab55ce`. The API is booted against the isolated `scratch_build_review_20260909`
database. The production `reapOrgStuckSources` seam is exercised without mocked SQL.

- The owner connection first proves both tenants' fixtures are visible, preventing
  RLS from masking a missing service-level organization predicate.
- The application connection separately proves its role is neither superuser nor
  BYPASSRLS and executes through the production tenant-transaction wrapper.
- Only the selected tenant's stale processing source becomes failed. Another
  tenant's equally stale source remains unchanged.
- Fresh, exactly-at-cutoff, deleted, ready and already-failed sources retain complete
  snapshots. A repeated sweep returns zero. Public source reads verify visible state.
- Both cases passed against PostgreSQL and passed again after the test commit
  (46.930s suite run). Fixture cleanup succeeded; no production
  service, schema, credentials or external provider was changed.

The declaration gate now passes **946/946** tenant-owned services, with 781 isolation
test files. This static result proves test presence, not successful execution of
every service path. The new seeded suite is executed explicitly because the existing
`check:tenant-isolation:run` selector does not include seeded E2E files.

The broader runtime selection initially passed 468 suites and failed one because
the Chat huddle isolation test lacked a newly required `ComposioGateway` provider.
The test-only import and inert provider repair is committed as `b3cb96847`; its
unchanged authorization assertions passed all 11 tests. No Chat production code
was changed and the inert dependency cannot call an external provider.

Final broad runtime result: **469 suites / 1,992 tests passed**, zero failures;
see `backend/.artifacts/kb-reaper-global-isolation-final.json`.

Raw evidence:

- `backend/.artifacts/kb-reaper-isolation-green.log`
- `backend/.artifacts/kb-reaper-isolation-committed.log`
- `backend/.artifacts/kb-reaper-contract-final/tenant-isolation-coverage.log`
- `backend/.artifacts/kb-reaper-global-isolation.log` (initial failure retained)
- `backend/.artifacts/kb-reaper-chat-fixture-green.log`
- `backend/.artifacts/kb-reaper-global-isolation-final.log`

## Timesheet totals decision

**Retain synchronous exact totals for existing list/team contracts.** Do not add
asynchronous counts, approximate totals or another shared cache in this change.
This preserves compatibility and immediate correctness without introducing job
state or authorization/filter-sensitive cache invalidation.

The read-only measurement used the largest existing timesheet tenant in the scratch
copy: **4,393 rows**. The table has RLS enabled; the application role is
`streamline_app`, without BYPASSRLS, with its tenant context set.

| Query | Work | Shared blocks |
|---|---|---|
| Exact organization count | All 4,393 matching rows | 41 |
| Lightweight cursor projection | 51 rows through the date/id index | 11 |

Observed local execution varied between 3.244–3.663 ms for the count and
0.109–0.190 ms for the lightweight page. These are SQL observations, not HTTP
latency, load tests or production guarantees. Full JSON plans and the exact SQL
are captured in `backend/.artifacts/timesheet-totals-decision.log`; reproduction
script: `backend/.artifacts/build-review-20260909/timesheet-totals-readonly.cjs`.
Both fixture discovery and measurement use read-only transactions.

The accepted tradeoff remains explicit: counts are O(matching history), including
later cursor requests. The ticket-specific list currently discards returned totals
but still incurs the count. A future additive `includeTotal=false` path could avoid
that work without changing existing clients; it is not implemented or represented
as completed here. The current decision does not certify constant-cost responses.

## OpenAPI synchronization

The documents are regenerated from current backend source, not manually merged
from potentially stale snapshots. The first freshness check correctly detected a
concurrent support-KB revision-contract edit; regeneration was repeated afterward.
Retired Chat routes are removed from the frontend snapshot and current KB/cron and
integration contracts are synchronized from the authoritative generator.

The matching snapshots are committed as backend `b20dca13b` and root `9c4159d1d`.
Reading both documents from their committed Git objects proves exact byte equality,
SHA-256 `e1290b628d424f50d4ebbc5d21d589d189c45497d96a2ae7f915115a0a2c1594`.
Regeneration freshness passed against current working source: **3,669 operations**,
3,664 Zod contracts and 3,669 exposure stamps. All operations have response schemas
and declared path parameters; all 1,393 mutating operations have request schemas;
operation IDs are unique.

Whole-file vendor equality, response parsing and timesheet contract-drift checks
passed on the regenerated pair. The response seam scan covers **2,668/2,668**
parsed calls, with two unresolved route sites disclosed by that gate.

Raw evidence is under `backend/.artifacts/kb-reaper-post-review-final/`,
`kb-reaper-contract-drift.log` and `kb-reaper-response-contracts.log`.
The first strict test-tree scan raced with another workstream removing
`kb-hnsw-iterative-scan.spec.ts`; its TS6053 failure is retained, not counted as a pass.
The retry passed with zero strict test-tree errors, recorded separately in
`backend/.artifacts/kb-reaper-test-types-retry.log`. Backend source typecheck also
passed in the follow-up run.

Other workstreams' source changes remain owned by those workstreams. A matching
generated snapshot does not by itself certify a clean whole-product source tree.

## Browser verification and Web Vitals

**Blocked, not passed.** The Browser skill was loaded and the supported connection
and discovery flow was retried after the user's explicit request. Selection returned
`No browser is available`; inventory returned `[]`. The user was asked to connect a
browser through Settings → Computer use, open a signed-in local Build page, and
share its URL. No authentication/session stores or alternate browser-control path
were used.

Loading, empty, error, retry and responsive rendering at 375/768/1280 widths have
not been observed in a connected browser. No current Build LCP, CLS or INP values
were captured. Earlier component tests and local API timings are not substitutes
for this requested browser evidence. No zero-pending or 10/10 sign-off is issued.
