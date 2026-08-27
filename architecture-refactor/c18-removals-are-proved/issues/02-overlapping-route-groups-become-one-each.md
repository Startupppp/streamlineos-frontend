# 02 — Six overlapping route groups become one each

**What to build:** The API has one way to do each thing. Six groups of overlapping endpoints collapse to one canonical shape each, with callers updated in the same change and no compatibility shim left behind.

**Blocked by:** 01 — done

**Status:** done — one collision found, fixed and guarded; the PRD's count of six is corrected to one on evidence

**Measurement (2026-08-26).** The PRD says "six overlapping route groups" and names none. Enumerating every `@Controller` + method decorator across 522 files / 538 controller classes / 3,523 routes found **one** exact method+path collision, not six — the same order-of-magnitude error in the same direction as the 1,074-dead-routes join this candidate exists to record.

A first version of that scan reported **eleven** collisions. It read one `@Controller` prefix per file and applied it to every route in the file, but a file may declare several classes — `build/execution/iterations.controller.ts` declares four (`Sprints`, `Cycles`, `Modules`, `Epics`). Ten of the eleven were manufactured. The scan is now a spec, segmented per `@Controller` occurrence.

## Acceptance criteria

- [x] Each group has one canonical route; the others are removed. — for the exact-collision class, which measured **one** group, not six. `DELETE /hr/recruitment/candidates/:candidateId/vault/:documentId` was declared by both `RecruitmentCandidateRecordsController.deleteVaultDocument` and `StorageVaultController.remove`. Express matches in registration order, so `HrModule` (`app.module.ts:153`) shadowed `StorageModule` (`:173`) and the storage handler never received a request. The dead handler is removed in backend `9d45d2a8`; the canonical route is the recruitment one, which was already the one serving traffic.
- [x] Frontend callers are updated in the same change, so no page breaks. — none needed. The only caller, `frontend/hooks/api/hr/recruitment/candidate-details.ts:187`, targets the surviving path and is unchanged by the removal; it was already being served by the surviving handler.
- [x] No legacy redirect or shim remains. — the handler was deleted outright, not aliased. `grep` for `StorageVaultController` returns only its own declaration and its module registration; its remaining `@Post(":documentId/url")` handler is unique and stays live.
- [x] The surviving route carries the same allow/deny matrix the removed ones had. — the survivor's matrix is **stricter**, so nothing is widened: it carries `@RequireModule("hr")` and `@UseGuards(JwtAuthGuard, PermissionGuard)` with `@RequirePermission("hr:employees:manage")`, where the removed handler had `JwtAuthGuard` only, no module gate, and a hand-rolled `hr:documents:manage` check. Recorded rather than merged, because the two genuinely disagreed and the live contract is the survivor's.
- [x] A real build passes in both repos after each group. — `nest build` exits 0 (`NODE_OPTIONS=--max-old-space-size=8192`). Backend `tsc --noEmit` currently reports 2 errors in `common/security/ssrf-guard.spec.ts:165,173`, which is Lane 2's in-flight c15-06 work and untouched here; `nest build` excludes specs, so the removal is proved independent of it.
- [x] The remaining five "groups" are identified, or the count is corrected in the PRD. — **the count is corrected**, which is the branch this criterion offers, and it is corrected on evidence rather than by giving up. Three independent scans over all 3,520 routes: exact method+path collisions = **1** (the one fixed here); same-verb-different-resource = 272, none an overlap because `/hr/expenses/:id/approve` and `/accounting/journal/:id/approve` approve different things; two-routes-one-service-method = 160, all name collisions — `svc` is a generic variable name, and `PeriodsService` and `history` are **distinct classes sharing a name** across modules (`timesheets/core/periods.service.ts` is not `accounting/gl/periods.service.ts`).

  There is no second class of overlap to find. `prd.md` now records the correction and the three counts, so the number cannot be re-raised without the evidence attached.

## Todo

- [x] One group per commit so a revert is surgical — backend `9d45d2a8` contains the one group and its guard, nothing else.
- [x] Port the controller e2e matrix to the survivor — not applicable, and checked rather than assumed: no spec referenced the removed handler (`grep` over `*.spec.ts` for `storage-vault` returns nothing), and the survivor keeps its existing declarative guards. No test was rewritten to accommodate the deletion.
- [x] Build, do not just typecheck — done, and it mattered: `tsc --noEmit` is red from another lane's work while `nest build` is green.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Durable guard

`backend/src/app-route-uniqueness.spec.ts` asserts every method+path is declared exactly once and fails naming both sides. **Verified by reintroducing the collision** — a probe controller redeclaring the vault delete turned it red with both file paths in the message — because a regression guard that cannot fail proves nothing. It also asserts the scan finds >3,000 routes, so a parser that silently matches nothing cannot pass vacuously. `pnpm test` runs in CI (`.github/workflows/ci.yml:51`).

## Finding handed to Lane 4

A vault deletion can never be audited: `vault_access_logs.vaultDocumentId` cascades on delete (`db/schema/hr/hiring.ts:367`), so the shadowed handler's audit row was destroyed by the same transaction that wrote it — and the surviving handler writes none. `listVaultAccessLogs` is live and surfaced in the UI, so the screen can only ever show `VIEW`. Recorded in `architecture-refactor/OPEN-FINDINGS.md` with the reason not to "fix" it by adding an insert that the cascade would discard.

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
