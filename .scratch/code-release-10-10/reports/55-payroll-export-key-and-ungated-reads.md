# 55 — The payroll CSV export key, 48 ungated permissioned reads, and a vacuous gate

**Status:** DONE for A (as a correction + coverage), B (35 of 35 in-scope fixed) and C.
**Date:** 2026-09-03.
**Commits:** backend `f1078b03`; frontend `4ecc568e1`, `726109bc8`.

---

## A. The ten payroll CSV routes are NOT guarded by `:view` only — the premise is wrong

**Correcting report 50 §4.9 and the ticket text derived from it.**

`GET /payroll/reports/*` and `GET /payroll/reports/journal` DO enforce
`payroll:reports:export` on the CSV branch. They have since `4855b581`
(2026-07-05), which is an ancestor of `main`.

`src/modules/payroll/insights/reports.controller.ts:47`

```ts
private async assertExport(u: CurrentUserContext): Promise<void> {
  const check = await authorize(this.access, u, "payroll:reports:export");
  if (!check.allow) throw new ForbiddenException("Permission denied: payroll:reports:export required");
}
```

called as the FIRST statement of every `if (q.format === "csv")` branch — 10 of
them in that file (summary, register, department-cost, cost-center, earnings,
deductions, reimbursements, tax, bank-payout **and variance**, which the ticket
text missed). `journal.controller.ts:49` does the same inline. Eleven CSV
branches, eleven checks, verified by `grep -c`: 10 and 1.

**Why the audit read it as unguarded.** The gate that produced the finding reads
`@RequirePermission` with the TypeScript AST. A conditional raise inside a
handler body is invisible to it — report 50 §9 lists exactly this limitation
("a route whose real authorization is narrowed IN SERVICE below its declared
key … the check can only compare against the DECLARED key"). §4.9 then drew
the inference the §9 caveat forbids, and in the more dangerous direction: it
concluded the export key was "enforced nowhere but the client".

**What was actually missing: coverage.** The behaviour was right and almost
untested. `payroll-insights.controller.e2e-spec.ts` asserted ONE of the eleven
routes (`summary`) in ONE direction (403), and nothing asserted that an
`:export` holder gets the CSV at all. Deleting `assertExport` from the other
ten would have been silent.

The spec now drives all 11 CSV routes x 4 assertions (44 new tests, 49 -> 93):

| Holder | `?format=csv` | no `format` |
|---|---|---|
| `payroll:reports:view` only | **403** `FORBIDDEN`, `content-type` not `text/csv` | 200 `application/json` |
| `:view` + `:export` | **200** `text/csv` + `content-disposition: attachment;` | 200 `application/json` |

**Bite-proof** (hermetic `git archive HEAD src test` into a temp tree, backend
`node_modules` symlinked; the shared working tree was never used):

| Planted | Spec | Exit | Failures |
|---|---|---|---|
| nothing | new | 0 | 93 passed |
| all 10 `await this.assertExport(u);` deleted from `reports.controller.ts` | new | 1 | **10** — one per route |
| restored; journal's inline check deleted instead | new | 1 | **1** — `journal?format=csv` |
| BOTH controllers stripped (all 11 branches unguarded) | **pre-change** spec | 1 | **1** of 11 — 50 tests total |
| BOTH controllers stripped | new spec | 1 | **11** |

The fourth row is the point: with every CSV route unguarded, the old spec
reported a single failure and the other ten regressions were invisible.

**Frontend record corrected.** The two `DELIBERATE` entries in
`check-permission-route-binding.mjs` asserted "a `:view` holder can already
fetch the CSV directly, so the export key is enforced nowhere but the client".
That is false. Both now cite `reports.controller.ts:47` / `journal.controller.ts:49`
and explain that the hook agrees with what the backend enforces, not with the
decorator the check can read.

**No backend authorization change was needed or made.** Raising the class-level
decorator to `:export` would have been the wrong fix — it would have taken
report VIEWING away from every `:view` holder, which is what the ticket warned
against and what the new `:view`-only-gets-JSON assertions now prevent.

---

## B. 48 permissioned reads whose `enabled` consults no permission

| Bucket | Count | Disposition |
|---|---|---|
| In release scope | **35** | **all fixed** — gated on the key the route declares |
| CRM (`hooks/api/leads.ts`) | 11 | out of scope; recorded in the new ratchet with a reason |
| Inventory (`inv-ai-explain.ts`, `features/inventory/.../export-tab.tsx`) | 2 | out of scope; recorded with a reason |

After: `check:permission-binding` reports **13 held back, 0 unaccounted**;
ENABLED gate sites 654 -> 689; bindings checked 2,349 -> 2,384; **mismatches
unchanged at 4**, i.e. no new gate disagrees with its route.

### B.1 Four gated on the wrong AXIS — the git-connection defect in disguise

| Hook | Was | Now (route's declared key) | Who it stranded |
|---|---|---|---|
| `hooks/api/ai.ts:260` `useAiUsage` | `Boolean(access?.isOrgOwner)` | `ai:usage:view` | any role granted `ai:usage:view` saw a permanently empty AI usage panel |
| `hooks/api/ownership.ts:68` `usePendingOrgTransfers` | `access?.isOrgOwner` | `ownership:modules:view` | same shape; its sibling `useIncomingOrgTransfers` already did it correctly |
| `hooks/api/renderer/layouts.ts:138` `useLayoutUsage` | `useCanAdjustLayouts()` = `settings:manage` | `settings:record-layouts:manage` | a role with the layout key but not `settings:manage` |
| `hooks/api/users/invitations.ts:63` `useInvitations` | `useCanManageOrganizationMembership()` | `settings:organization:manage` | see below |

`useCanManageOrganizationMembership` is **not a permission**. It resolves to
`isOwnerOrAdmin` — `member.isOwner === true || member.role === ORG_ADMIN`
(`access-permission.resolver.ts:388`), a membership-role column. The route
declares `settings:organization:manage`, which the **HR Administrator**
template grants (`role-templates-crm-hr.constants.ts:84`). So an HR
Administrator was refused the invitations list by the client on a route the
backend would have served. The same panel's own mutations
(`useResendInvite`, `useCancelInvitation`) already used
`useAuthorizedMutation("settings:organization:manage", ...)`, so its read was
stricter than its writes; `user-invitations-panel.tsx:65` moves with the hook.

### B.2 A route-ownership bug, not a client gate — `EmployeeDocumentsTab`

`features/hr/onboarding/onboarding-detail-sheet.tsx` is the employee's own
"My Documents" tab. `onboarding-list-page.tsx:191` renders it **only in the
`canManageOnboarding ? … : …` ELSE branch** — i.e. exclusively for users who do
NOT hold `hr:onboarding:manage`. It listed from `GET /hr/onboarding-docs` and
posted to `POST /hr/onboarding-docs`, both of which declare
`hr:onboarding:manage` (`hr-onboarding-docs-admin.controller.ts:69,83`).
**The tab 403'd for its entire audience.**

Gating it on `hr:onboarding:manage` would have disabled the only surface it
exists for. Repointed instead to the self-service routes that already exist:
`GET/POST /hr/onboarding-docs/me` (`onboarding-views.controller.ts:41,52`,
`self:onboarding-docs`). Shape-safe, not a blind URL swap:

- the `/me` list calls `onboardingViews.list(orgId, userId, false, query, "own")`;
  the admin list calls it with `isAdmin`/`scope` which for a non-admin resolve
  to exactly `false`/`"own"` — the identical envelope;
- the POST body `{ documentTypeId, fileUrl, fileName }` satisfies
  `createOwnOnboardingDocSchema`, which is `createOnboardingDocSchema.omit({ targetUserId })`
  and the frontend never sent `targetUserId`;
- the file link in this same feature (`onboarding-document-checklist-row.tsx:117`),
  `upload-doc-sheet.tsx:56` and `hooks/api/hr/documents.ts:125` already call the
  `/me` routes. This file was the outlier.

**Follow-up, not done here:** `hooks/api/hr/documents.ts:119` already exports a
correct `useMyOnboardingDocs` against `/me`. The sheet keeps a private duplicate
with a different query key (`queryKeys.hr.myOnboardingDocs()` vs
`queryKeys.hr.onboardingDocs(params)`) and a different element type. Unifying
them is a real refactor across two response types, not a rename, so it was not
attempted under an authorization ticket.

### B.3 The other 31 — deliberately ungated: none

Every remaining in-scope site was gated on the key its route declares. The
recruitment reads (`candidate-details.ts` x3, `candidates.ts`, `messages.ts`,
`offers.ts`) and `headcount-page.tsx` are the highest-exposure of them: their
route pages carry no `requirePermission` server guard either, so the client was
the only thing that could have suppressed the request and it did not.

Three sites deserve naming because a reader may think they were already safe
and they were not:

- `features/hr/forms/hr-forms-settings-page.tsx` computes
  `useCan("hr:forms:view")` and early-returns a `NoPermissionState` — but the
  hook runs at line 26, **before** the return at line 56, so the request fired
  anyway. A render-time gate is not request suppression.
- `features/hr/governance/**` — five files hold a `useCan("<module>:manage")`
  used purely for rendering while the list read beside it was ungated.
- `features/hr/custom-fields/**` was the one genuine false positive: its only
  caller already passed `{ enabled: canManage }` on the exact key. Gated in the
  hook anyway, so it no longer depends on every caller remembering.

---

## C. `check-gated-reads` reported 0 over 48 — both causes are properties of the scan

Neither is fixable by moving a baseline:

1. `SCAN_DIRS = ["hooks/api"]`. The `features/**` half of the set was never
   opened. A permissioned read on a page component is invisible to it.
2. `GATE_MARKERS` includes **`useModuleEnabled`** — a module toggle, which is
   org configuration, not a permission — and it scores a hook gated if a marker
   appears **anywhere in the enclosing block**, not if one is reached from
   `enabled`.

**`check:permission-binding` does cover it properly** — AST-resolved `enabled`,
oracle is the controllers (not the stale `contracts/openapi.json`, which
disagrees on 18 operations), 438 files across `hooks/api` AND `features/**`.
But it only **printed** the set, and only under `--list`. Printing is not a gate.

### C.1 It now enforces it

`UNGATED_HELD_BACK` is a per-file **ratchet**, not an allowlist: each entry
carries a count and a >=60-character reason. The gate fails on

- a permissioned ungated read in an unlisted file,
- a listed file that **grew** one (so a directory-shaped exemption is not a net),
- a listed file that dropped **below** its count (the number cannot rot upward),
- a stale entry, or an entry whose reason does not justify itself.

Today: 13 held back, 0 unaccounted.

### C.2 `check-gated-reads` keeps its narrower job and says so in its own output

Its `PASS` line now reads `… FOR THIS SCAN'S DEFINITION` and prints COVERS /
DOES NOT COVER / THE GATE THAT DOES, including the sentence
"measured 2026-09-03 it reported 0 while 48 existed". The header carries the
same warning above the scan definition.

And it refuses to pass if the sibling stops enforcing:
`assertSiblingEnforcement()` fails if `check-permission-route-binding.mjs` is
absent, or no longer contains `UNGATED_HELD_BACK` and its failure message. A
deferral that can silently stop being true is the same defect one level up.

### C.3 Bite-proof — hermetic (`git archive HEAD frontend`, node_modules symlinked, `STREAMLINE_BACKEND_ROOT` at the real backend)

| Planted | Gate | Exit | Message |
|---|---|---|---|
| nothing | permission-binding | **0** | 13 held back, 0 unaccounted; 2,384 bindings |
| one fix reverted (`fnf-page-client.tsx` `enabled` removed) | permission-binding | **1** | `1 read(s) call a permissioned route with no permission in enabled` |
| restored | permission-binding | **0** | clean |
| a 12th ungated read added to `hooks/api/leads.ts` | permission-binding | **1** | `1 held-back file(s) grew a new ungated permissioned read` |
| one `leads.ts` read GATED (count now 10 of 11) | permission-binding | **1** | `1 held-back file(s) are now BELOW their recorded count` |
| a held-back key pointed at a nonexistent file | permission-binding | **1** | stale entry + the now-unaccounted read, both reported |
| a reason shortened to `"out of scope"` | permission-binding | **1** | `1 UNGATED_HELD_BACK entry(entries) whose reason does not justify itself` |
| all restored | permission-binding | **0** | clean |
| nothing | gated-reads | **0** | PASS + the coverage statement |
| sibling script deleted | gated-reads | **1** | `check-permission-route-binding.mjs is gone …` |
| sibling keeps the file, `UNGATED_HELD_BACK` renamed away | gated-reads | **1** | `no longer enforces ungated permissioned reads (missing: UNGATED_HELD_BACK)` |
| restored | gated-reads | **0** | PASS |

---

## Gates run

| Command | Exit | Number |
|---|---|---|
| backend `pnpm typecheck` | **0** | 0 errors (exit code, not a grep) |
| backend `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| backend `jest --config jest-e2e.json --runInBand --testPathPattern="payroll-insights.controller.e2e-spec"` | **0** | 1 suite, **93** tests (was 49) |
| frontend `pnpm type-check` | **0** | 0 errors |
| frontend `check:permission-binding` | **0** | 2,384 bindings; 13 held back / 0 unaccounted |
| frontend `check:permission-binding --self-test` | **0** | 31 cases |
| frontend `check:gated-reads` | **0** | baseline 0 for its own scan |
| frontend `check:gated-reads --self-test` | **0** | fixtures passed |
| frontend `check-route-access-contract` + `--self-test` | **0** / **0** | — |
| frontend `eslint` over the 27 changed files | **0** | 0 errors, 12 pre-existing `useMutation` warnings |
| frontend `jest --runInBand` over 7 access/gating suites | **0** | 245 tests |

**Environment note.** The backend e2e suite cannot run on this machine as
checked out: `.env` carries no `AUTH_SIGNING_KEYS` and `test/helpers/sign-token.ts:45`
throws without it, which fails every spec that mints a token (132 of 193 on the
first attempt). Runs above used a **locally generated placeholder Ed25519
keyring passed as an environment variable** — never written to `.env`, never a
real credential. Also note `--testPathPattern` matches the nested worktrees under
`.claude/worktrees/`; add `--testPathIgnorePatterns "/.claude/worktrees/"` or the
run picks up stale copies of the spec.

---

## Referred onward — product decisions, not mine

1. **`hr:contracts:view` / `hr:contracts:manage` are in no role template.** After
   report 50's hook fix, only the org owner can use contracts at all. Either the
   keys belong in `HR_ADMINISTRATOR` / `BRANCH_HR`, or contracts is deliberately
   owner-only. Unchanged here. Owner: RBAC/backend.
2. **The frontend's app-wide 30s client timeout** affects all 601 routes; raising
   it is not a local decision. Unchanged here.
3. **`hooks/api/leads.ts` (11) and the two Inventory reads** are now recorded in
   `UNGATED_HELD_BACK` with reasons and exact counts. One line each the day CRM
   and Inventory re-enter scope.
4. **The duplicate `useMyOnboardingDocs`** (B.2) — two hooks, two query keys, two
   element types, one route. Needs a shape decision, not a rename.
