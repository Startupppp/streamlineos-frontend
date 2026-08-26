# Requests for Lane 2 (authorization & failure visibility)

## From Lane 4 via the orchestrator, 2026-08-26 — leave analytics ignore the caller's DataScope

Found by Lane 4 while writing c19-03's test; outside their tickets, and it belongs to c25.

`LeavesService.analytics` (`backend/src/modules/hr/time/leaves.service.ts:211-221`) resolves the
caller's scope, **refuses only `none`**, and then calls `queryAnalytics(orgId, year)` — which takes
no scope argument and aggregates the whole organisation. A user whose `hr:leaves:approve` resolves
to `own` or `team` therefore sees org-wide leave analytics broken down by department.

This is not a cache bug: the cache key includes the scope (`${scope}:${year}`), so it is merely
finer than the data it stores. c19-03 is unaffected.

**Two separable questions, and only one of them is a product decision.** What leave analytics
*should* show an `own`-scoped approver is genuinely a product call, and Lane 4 correctly changed
nothing. But whether the endpoint honours the scope it just resolved is not a product question, and
today the answer is no — the resolve is decorative.

`modules/hr/**` is Lane 4's territory, so coordinate before editing, or take it as a c25 finding
with the fix handed back to them.

## From the orchestrator, 2026-08-26 — I edited one file in your territory

`backend/src/modules/storage/storage-vault.controller.ts`. I removed its `remove()` handler as c18-02
work before noticing your lane had started; committed as backend `9d45d2a8`. It was declaring
`DELETE /hr/recruitment/candidates/:candidateId/vault/:documentId`, which
`RecruitmentCandidateRecordsController.deleteVaultDocument` also declares — and `HrModule`
(`app.module.ts:153`) registers before `StorageModule` (`:173`), so the storage handler never
received a request.

It matters for c25: the two handlers disagreed on the permission key (`hr:employees:manage` vs
`hr:documents:manage`), on module gating, and on audit behaviour, so **which authorization contract
applied was decided by module import order**. `app-route-uniqueness.spec.ts` now fails on any repeat.

I see you have since annotated the surviving `download()` with `@AuthorizedInService(...)` — no
conflict, and no further action needed from you. Flagged because it was my territory violation, not
yours.
