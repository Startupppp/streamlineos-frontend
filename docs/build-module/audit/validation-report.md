# Documentation validation report

Date: 2026-10-02, Asia/Calcutta
Status: documentation verified; product behavior Planned or Current unverified as labeled

## Checks performed

| Check | Result | Meaning |
|---|---|---|
| Route manifest vs actual page inventory | 75/75 | No missing current Build page entry |
| Route decision rows | 75/75, each exactly once | Keep/consolidate/rename/redirect specified |
| Detailed route sections | 75/75 existing Build routes, six proposed/compatibility destinations, and two external client-portal routes | Every existing route has a screen-specific contract; proposed destinations remain implementation work |
| Screen folder | 14 Markdown files | Index, shared contract, Build screen groups, activation, external client portal, and cross-module owning-product catalog |
| Original and architecture requirement coverage | 29 mappings | Prompt, prior-answer, architecture-review, and agent-coordination requirements map to specification and acceptance |
| Customer-value reasons | 100 sequential IDs | Each includes class, customer need, status, source, priority and proof |
| Original WOW source crosswalk | 120/120 original numbered rows mapped | Research numbering is independent of the new 100 customer-value reasons; conditional item 105 is retained |
| Research Markdown inventory | 155 scanned, 116 retained | 39 duplicates removed |
| Duplicate hash checks before deletion | 39/39 SHA-256 pairs matched | Exactly 31 mirrored copies and eight duplicated summaries |
| Generated specification consolidation | 7/7 removed with pre-deletion SHA-256 recorded | Repeated overview, role, navigation, route, flow, aggregate, and persona summaries now resolve to retained authorities |
| Remaining duplicate Markdown groups | 0 | No byte-identical retained copies |
| Evidence preservation | 183/183 non-Markdown files unchanged | Includes all 162 images plus source artifacts; hashes match original inventory |
| References rewritten | 26 initial research files, imported CI archive references, and canonical Build indexes | Retained authorities replace removed mirrors and summaries |
| Markdown links | All relative file/image links checked | Final check requires zero missing targets |
| Role/filter vocabulary | Reconciled | Org Viewer removed as structural role; one FilterEnvelope v1 |
| Whitespace | git diff --check passed | Changed tracked documentation has no whitespace errors |
| Source-aware implementation pack | 18 consolidated files | Existing implementation contracts plus coordination, package registry, behavior matrix, and work-claim ledger; product/role/navigation/route/flow authorities remain linked rather than copied |
| Current source census | 75 pages; 53 controllers; 354 HTTP verbs; 38 schema files/86 table declarations | Source anchors only; no runtime-complete claim |
| Implementation requirement ledger | 36/36 unique `BLD-*` IDs | Each requirement maps role, route, UI, interface, schema, permission, cache, events, tests, evidence and status |
| Architecture reconciliation | 16/16 decisions; 26/26 product areas; six access layers | Approved HTML decisions now have durable Markdown owners, dependencies, migration constraints, and acceptance |
| Cross-cutting behavior | 17 universal behaviors; 15 Ticket capabilities; Intake, activation, and portal flows | Comments, assignment, status, relations, files, effects, client projection, mobile, and lifecycle cannot be omitted silently |
| Agent coordination | claim ledger plus 17 work packages implementing 16 architecture decisions | Project Provision and Ticket Command are separate claims; one active owner per primary seam; prerequisite, path, handoff, merge, and evidence rules prevent duplicate work |
| Canonical/research Markdown | 57 canonical; 116 retained research; 173 total | Redundant generated summaries remain removed; implementation layer links existing authorities directly |

The counts above are the 2026-10-02 snapshot. The later [TODO index](../implementation/TODO-INDEX.md), two source-gap audits, and the [migration chain gap](./migration-chain-gap.md) bring the 2026-10-03 inventory to 61 canonical, 116 retained research, and 177 total Markdown files. The generated TODO index is the live count authority; these additions do not alter the dated validation result or the research cleanup manifest.

The [comprehensive recheck](./comprehensive-recheck-2026-10-02.md) records the source-by-source reconciliation, new screen/API corrections, and remaining runtime risks. This pass mechanically compared all 75 current Build routes, both external portal page files, six proposed destinations, 120 original WOW IDs, 100 new value rows, 16 architecture headings, and all local links. It found zero missing or duplicated current routes, zero unmapped original WOW rows, and zero broken local Markdown/image links.

The later start-readiness sample found three **failing normal gates** despite passing self-tests: the execution-plan gate still requires removed `docs/specs/build` files, the route-census snapshot is missing at its old path, and the generated Build contracts have a stale OpenAPI hash. The backend Build core surface gate passed. These failures are recorded in the comprehensive recheck and must be resolved before a feature package is marked integration-ready; they do not invalidate the Markdown link/route coverage checks above.

## Gate refresh — 2026-10-04 (BT-491467be038f)

Re-run of the three start-readiness static gates on the R6_INTAKE implementation revision (`codex/build-foundation-gates`). Self-tests were not re-run; they were passing on 2026-10-02 and the gate scripts were not replaced.

| Gate | Command | Result |
|---|---|---|
| Build execution plan | `node scripts/check-build-execution-plan.mjs` | **PASS** — 78 Build pages each map to one route decision and screen section; 29 coverage requirements, 36 implementation requirements, 16 architecture decisions, 18 work packages verified; active package claims and local links across 71 canonical Markdown files |
| Route census | `node scripts/build-route-census.mjs --check` | **PASS** — 87 route patterns (78 Build pages, 9 related routes); canonical sources and snapshot are current; 78 Build pages pass their own canonical pattern to `enforceRouteAccess` (0 weak cold-load gates) |
| Build contracts | `node scripts/check-build-contracts.mjs` (frontend) | **PASS** — 401 generated schemas and OPENAPI_HASH present; hash matches `contracts/openapi.json`; generated file equals a fresh generation over 320 hook-called operations |

Changes required to achieve passing state (all on this branch):
- `check:build-execution-plan` — migrated from removed `docs/specs/build` paths to `docs/build-module`; gate script corrected to skip parallel-slot (`@name`) dirs entirely (not recurse with unchanged segments); two routes registered in spec doc and screen contracts: `/build/[projectId]/bugs/[submissionId]`, `/build/programs/[programId]`; parallel intercept route `@panel/(.)tickets/[ticketKey]` removed — it is never a URL of its own.
- `check:route-census` — snapshot regenerated for 78 Build pages; `build-route-manifest.ts` updated with `bugs/[submissionId]`; walk() corrected to skip `@name` dirs entirely; cold-load exemption for `/(.)` patterns reverted (skipping `@name` dirs already prevents those files from reaching the audit).
- `check:build-contracts` — `build-contracts.generated.ts` regenerated via `generate:build-contracts` script; no manual edits made to the generated file.

## Source availability limitations

Historical sources mention QA ledgers/reports and deleted release documents that were not included in the supplied packs: original QA surface/role matrices, member/client pass reports, BUG-001 detail, BUILD-OS-BUGS, RELEASE-GATE and TESTING-SUMMARY. Their historical references are retained as unavailable original evidence, not converted into fabricated local proof. The referenced D-build.webp is absent; D-dashboard.webp and actual project screenshots remain available. Brace-group competitor path notation is shorthand, not a real file; actual competitor feature files are retained individually.

Only three representative Streamline screenshots were visually reviewed in the planning audit. The remaining images are inventoried and retained, not claimed visually/currently verified. Research ID extraction found 213 distinct textual IDs; reuse across lanes is disambiguated by source.

## Completion interpretation

The missing documentation decisions are filled: activation variants, per-route screens, persona flows, pane/history/redirection, exact card fields, typed filters, interfaces/projections, dashboard behavior, ownership, CRM/Timesheets/Accounting owning screens, cleanup/evidence, a paste-ready Claude implementation contract, all 16 approved architecture decisions, all 26 Build areas, cross-cutting record behavior, and agent work ownership. Existing plan catalog and permission keys stay authoritative. No high-impact implementation choice is intentionally left as “ask product later.”

The source-aware implementation layer additionally defines schema ownership, backend/frontend file seams, wire and error envelopes, cache/rate-limit policy, event/job contracts, negative security tests, evidence levels, migration gates, and independently verifiable vertical slices. `CONTEXT.md` now points at the existing architecture contract instead of the absent `docs/specs/build` path.

Specification coverage does not certify the running product. No app code, route manifest, schema migration, production data, deployment, real invitations or payment actions were changed or verified here. Browser/DB/role/tenant/security/load/deployment evidence remains required by delivery and RBAC gates.

## Operational limitations

Automatic approval review rejected shell directory-cleanup commands with “blocked by policy.” File cleanup completed safely through explicit verified patches: 39 byte-identical research copies and seven generated summaries. Untracked empty local directories may remain; Git does not preserve them and they do not affect the documentation set. No permission request or destructive fallback was used.

The invoked to-spec skill's issue-tracker publication step is unconfigured: no tracker and ready-for-agent label configuration was supplied. This task's requested local specifications are complete; tracker publication was not claimed. Tracker setup uses /setup-matt-pocock-skills.

## Revalidation checklist

After future edits, compare page files to route decision table; verify every route has a detailed section; validate local file/image links; compare cleanup-manifest retained/deleted paths; verify 100 reason IDs and coverage targets; check filter/role ownership consistency; run git diff --check. A source status upgrade requires new environment/revision/actor/action evidence, not another documentation pass.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.
- [ ] Attach browser, role/tenant, target database, worker/cache, and deployment evidence before any product requirement is promoted to Current verified.

## Gate reconciliation 2026-10-04

Branch: `codex/build-foundation-gates`, commit `b01cbf927dd5f745`. CI unavailable (GitHub Actions billing lapsed). All gates run locally using `bash /d/agent-work/bt-queue/bin/heavy.sh jest pnpm <cmd>` from `/d/projects/personal/Streamlineos`. Historical 2026-10-02 failures are retained in [comprehensive-recheck-2026-10-02.md](./comprehensive-recheck-2026-10-02.md#final-start-readiness-gate-sample) and not modified here.

| Gate | 2026-10-02 result | 2026-10-04 result | Notes |
|---|---|---|---|
| `check:build-execution-plan:self-test` | Passed (5/5) | Passed (9/9) | Self-test expanded from 5 to 9 cases. |
| `check:build-execution-plan` | Failed (required removed `docs/specs/build` paths) | Passed (78 Build pages, 29 coverage reqs, 36 implementation reqs, 16 arch decisions, 18 work packages, 71 canonical Markdown files) | Fixed by migrating gate to canonical `docs/build-module` paths. |
| `check:route-census:self-test` | Passed | Passed (10 cases) | Unchanged. |
| `check:route-census` | Failed (expected snapshot absent; 84 patterns) | Passed (87 patterns, 78 Build pages, 0 weak cold-load gates) | Snapshot migrated to canonical location; page count grew from 75 to 78. |
| `pnpm -C frontend check:build-contracts:self-test` | Passed (34/34) | Passed (93/93) | Self-test expanded; all cases pass. |
| `pnpm -C frontend check:build-contracts` | Failed (stale OPENAPI_HASH) | Passed (405 generated schemas, hash matches `e5552f845f91…`, 323 hook-called operations) | Regenerated under ARCH-06. One note: no backend operation for hook request `get /build/all-work/ids`. |
| `pnpm -C backend check:build-core-surface:self-test` | Passed | Passed (426 sibling files, 9836 repo files, 1400 specifiers) | Unchanged. |
| `pnpm -C backend check:build-core-surface` | Passed (378 sibling files, 1186 specifiers, 0 violations) | **FAILED** (22 deep core imports in 426 scanned sibling files) | **New regression** introduced after `a5b8347fb`. The approvals module now imports directly from `build/core/` (services, controllers, params schemas). Exact violating files listed in run output above. This is a pre-existing defect in the current implementation branch, not a regression to the 2026-10-02 baseline. |

### Summary

The three gates that failed at `a5b8347fb` (build-execution-plan, route-census, frontend build-contracts) all pass on commit `b01cbf927dd5f745`. One gate that passed at `a5b8347fb` (backend build-core-surface) now fails with 22 deep-core boundary violations from the approvals module — this is a new regression requiring a code fix outside this lane's territory.
