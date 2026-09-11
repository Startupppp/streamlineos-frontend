# Five-area certification evidence — 2026-09-09

**Status: COMPLETE — all five areas pass the scoped code-level certification.**
The final test, typecheck, contract, database and dependency verification lanes are
complete. The ratings below apply to the stated acceptance scope, not to every
possible quality property or to production infrastructure.

Scope: Organization-level RBAC, Module-level RBAC, Organization, Settings/module
access, and platform Billing/payments. CRM, Inventory and production infrastructure
remain outside this certification. This is a delta verification against the
[September 8 evidence](CERTIFICATION-FIVE-AREAS-2026-09-08.md), not a claim that every
repository test or every page layout has been re-audited.

## Code state

Run manifests record starting root HEAD `d77f148a0f77a113acb5dedc438dd65491eb3dac`
and backend HEAD `62377322594060b9b8bd5af2315361693ab00d9f`.
The measured working tree was committed as the following source pair. The commits
record the verified contents; no further runtime implementation changes followed
the final test runs. The manifests retain their original starting HEAD values.

| Repository | Verified source commit |
|---|---|
| Root/frontend | `12fd9d3a877392ae552096362ce0e8f7cfa212a3` |
| Backend | `6b5d98ef678d4a14f36226cd6ce65a4004759249` |

The root commit adds the local verification runner and records frontend checks;
frontend product source is unchanged from the starting root HEAD. This certificate
is a subsequent documentation-only change. An existing untracked backend
`.claude/worktrees/` directory was preserved and excluded from test discovery.

## Changes made during this verification

- Razorpay order creation now makes one automatic attempt. A timeout or 5xx can
  follow an order that the provider already created; automatically replaying that
  POST without a verified idempotency guarantee could create another order.
  Adapter and recovery tests now enforce the single-attempt behavior. Controlled
  tests still cover failure followed by recovery on a later caller request.
- The two billing replay database specs create and remove their own tenant fixtures.
  They no longer rely on a populated application seed. Together with the hierarchy
  descendant-protection spec, all three are wired into an unconditional step of
  the existing database workflow job, rather than only its scheduled full-suite step.
- Both HTTP E2E configurations restrict Jest roots to `src` and `test`, preventing
  discovery from traversing unrelated workspace trees.
- The live Razorpay verification checks observed provider statuses and attempt counts;
  it does not infer one attempt from a fast elapsed time. Its adapter-import boundary
  snapshot was updated for the new regression-test importer.
- `frontend/PAGES.md` records the focused frontend verification without marking
  individual page layout audits complete.

## Completed measurements

All results in this table are completed measurements, not expected outcomes.
Artifact paths are relative to the workspace root; raw logs remain local artifacts.

| Measurement | Observed result | Evidence |
|---|---|---|
| Final Billing/quota unit run | 72 suites / 753 tests passed; exit 0 | `backend/.artifacts/five-areas-2026-09-09-final-unit/` |
| Seeded database lifecycle/isolation | 8 suites / 57 tests passed; zero skipped; exit 0; 329.897s | `backend/.artifacts/five-areas-2026-09-09-database/` |
| Billing/hierarchy real-database specs | 4 suites / 21 tests passed; zero skipped; exit 0; approximately 17.2s | Same directory; ledger replay, webhook precedence, hierarchy descendants and affiliate uniqueness |
| Organization/RBAC/Settings focused backend run | 195 suites / 1,901 tests passed; zero skipped or todo | `.artifacts/five-areas-2026-09-09/org-agent/unit-results.json` |
| Backend import graph | 6,406 files; zero cycles; 54 resolution warnings; native exit 0 | Same directory, `cycles-native-summary.json` and `cycles-native.log` |
| Frontend focused run | 52 suites / 474 tests passed; exit 0 | `frontend/.artifacts/five-areas-2026-09-09/frontend-agent/focused-jest.log` |
| Frontend import graph | 5,929 files; zero cycles; 20 resolution warnings; exit 0 | Same directory, `cycles.log` |
| Frontend query isolation gate | 5,933 files; zero violations | Same directory, `query-scope.log` |
| Navigation/contract access gate | 205 keys checked against 633 contract permissions; exit 0 | Same directory, `route-access-contract.log` |
| Permission catalog | 704 keys; byte-identical to fresh backend generation; exit 0 | Same directory, `permission-catalog.log` |
| Live Razorpay failure mapping | 3/3 passed; observed HTTP 401, 400, 401; one attempt each; exit 0 | `backend/.artifacts/five-areas-2026-09-09-provider/` |
| Fresh OpenAPI generation | Current; 3,666 operations, 3,661 carrying a Zod contract, 3,666 exposure-stamped | `backend/.artifacts/five-areas-2026-09-09-openapi/openapi-fresh.log` |
| Quota ordering | 38 direct, 6 delegated, zero order violations; all 9 candidate insert sites covered; all 6 member sites locked | `backend/.artifacts/five-areas-2026-09-09-gates/plan-limit-enforcement.log` |
| HTTP authorization/revocation sweep | 22 suites / 826 tests passed; exit 0; 20 suites / 654 tests belong to the named scope | `backend/.artifacts/five-areas-2026-09-09-http/` |
| HTTP log hygiene | Zero response-contract violations, email-send lines or workspace-discovery collisions | Same directory, `five-area-e2e.log` |
| Backend types | Source/spec-inclusive and test-tree typechecks passed | `backend/.artifacts/five-areas-2026-09-09-gates/` |
| Frontend types | `tsc --noEmit` passed | Same directory, `frontend-typecheck.log` |
| Tenant relationships | Current real PostgreSQL catalog; zero actionable findings | Same directory, `tenant-relationships.log` |
| Settings authorization coverage | 159/159 routes have measured E2E calls | Same directory, `settings-route-e2e-coverage.log` |
| Frontend response parsing | 2,674/2,674 calls parsed; 1,971/1,971 distinct routes; zero unparsed calls | Same directory, `frontend-response-contracts.log` |
| Frontend contracts/permissions | Vendor equality and drift gates passed; 2,425 bindings, zero unaccounted in-scope violations | Same directory, frontend contract/permission logs |
| OpenAPI coverage | 3,666/3,666 error shapes and response schemas; 1,396/1,396 mutating request schemas | Same directory, `openapi-coverage.log` |
| Additional guards | Type-assertion ratchet passed; 7 evidence seals / 106 files intact | `backend/.artifacts/five-areas-2026-09-09-gates-corrected/` |

The six delegated quota sites are CRM leads (3), CRM contacts (2), and CRM deals (1).
Their ordering remains unverified by this static gate. All are outside the named
certification scope; they are not counted as passing ordering proofs.
The permission-binding gate also retains two excluded CRM/Inventory mismatches
and four documented Accounting/Payroll divergences. Its passing result is not a
claim of zero discrepancies across every module in the repository.

## Consolidated gate disposition

| Required lane | Result | Evidence location |
|---|---|---|
| HTTP E2E, including authorization and revocation | PASS | `backend/.artifacts/five-areas-2026-09-09-http/summary.json` |
| 25 selected backend/static/frontend checks | All have passing executions; one runner-path typo required correction | `backend/.artifacts/five-areas-2026-09-09-gates/summary.json` plus `five-areas-2026-09-09-gates-corrected/summary.json` |
| Final source state | Recorded in the source pair above | Both tracked source trees committed |

The first tenant-isolation invocation referenced a nonexistent script name and
exited 1. The runner now calls `check-tenant-isolation-coverage.mjs`; its corrected
execution passed. The original failed manifest remains visible. This static gate
proves test presence; the focused unit and real-database runs supply execution proof.
An unknown-check negative probe also confirms the runner exits 1 instead of
reporting success for an empty selection.

The historical HTTP filename filter additionally selected e-sign (161 tests) and
Inventory settings (11 tests). These passed but are excluded from the 654 in-scope
HTTP checks and do not extend the certification to those modules.

## Interpretation and limits

The live provider run proves real sandbox 4xx mapping and one observed attempt per
scenario. Controlled adapter recovery tests prove application behavior with injected
failure/recovery responses. They do **not** prove a forced live Razorpay 5xx recovery:
the sandbox does not offer a mechanism to request that failure on demand.
The [Razorpay order API documentation](https://razorpay.com/docs/api/orders/create/)
requires a unique receipt but does not establish safe replay of an ambiguous POST.
The single-attempt policy avoids relying on that unverified guarantee. It does not
claim provider-side reconciliation or deduplication across independent caller requests.

The CI change and database lane prove workflow definition and local database test
behavior. They are not evidence of a completed hosted CI run. Trigger,
job and environment restrictions still apply to the workflow as a whole.

The first combined runner was stopped and replaced with separate lanes because of
orchestration/resource contention. Its partial manifest is not an aggregate passing
run. An initial Billing snapshot failure was corrected and superseded by the final
72-suite / 753-test passing run; the failed attempt is retained in
`backend/.artifacts/five-areas-2026-09-09/` for provenance.

Frontend Jest passed with existing Radix missing-description warnings from the
customer-invoice Record Payment dialog, an adjacent accounting surface. Madge's 20
resolution warnings are retained in its log. Neither is silently represented as a
warning-free visual or accessibility audit.
The organization unit command's PowerShell wrapper reported status 1 after native
stderr output; Jest's structured result explicitly records success with all 1,901
tests passing. That wrapper result is retained rather than relabeled as exit-zero proof.

No production deployment, secrets rotation, live payment collection, disaster recovery,
infrastructure readiness, or outside-scope CRM/Inventory certification is asserted.
No repository-wide full-suite pass is inferred by adding these focused counts together.

## Final disposition

### Verified done

The previous four certified areas remain green under the current focused,
database and HTTP checks. Billing's consolidated unit, HTTP, seeded database,
real-Postgres replay and live provider-failure verification is complete. The
enterprise affiliate/referral and quote response-contract tests now run through
the real contract interceptor. All enumerated in-scope quota creation paths have ordering
proof, and the replay/hierarchy database proofs are wired to run on pull requests.

### Regressed

No unresolved regressions were found within this certification scope.

### Still pending

No checks remain pending in the defined five-area code-level certification.
The production, hosted-CI, visual and provider-reconciliation limits above remain
outside that claim; they are not silently assigned passing results.

### New findings resolved

The ambiguous-order regression initially observed three created orders for one
adapter call in a controlled post-commit-failure scenario. It now observes one.
The live provider verifier can no longer mistake a network failure for a provider
rejection. Database fixtures no longer require seed data, and Jest discovery no
longer traverses the peer workspace tree. Each change has proportional proof above.

| Area | Code-level acceptance rating | Status |
|---|---|---|
| Organization-level RBAC | 10/10 | Certified |
| Module-level RBAC | 10/10 | Certified |
| Organization | 10/10 | Certified |
| Settings/module access | 10/10 | Certified |
| Billing/payments | 10/10 | Certified |

These are scoped acceptance ratings, not a mathematical guarantee that the code
contains no defects. Production infrastructure readiness remains a separate decision.
