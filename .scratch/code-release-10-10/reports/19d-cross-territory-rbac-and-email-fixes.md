# 19d — The four cross-territory findings from report 19c, verified and fixed

**Worklist:** the "Handed off, not fixed" table of `reports/19c-grant-escalation-and-settings-census.md`
(F1, F2, P3, P4). P1 and P2 are product decisions and were not touched.
**Outcome:** **4 of 4 fixed and bite-proved.** One inherited claim was materially wrong and is corrected
below; the other three held.
**Date:** 2026-09-03. **Repo:** `streamlineos-backend` (branch `main`).
**No database was touched.** No `psql`, no scratch database created or dropped. Every proof is unit-level
against a double. **No email was sent anywhere** — `EmailService` is a recording double in every test, and
the one functional script that used to make a real external send no longer does (§1.5).

---

## 0. What each finding turned out to be

| # | inherited claim | verdict after measuring |
|---|---|---|
| P4 | `assertMayAssignRole` authorises from an unordered `.limit(500)` | **TRUE, and it is an authorization bypass, not only a determinism defect** |
| P3 | `getDiscoveryGrantable` is stricter than the write path | **TRUE**, and an existing test had encoded the divergence as an expectation |
| F1 | `POST /settings/email-templates/test` is an abusable send | **TRUE** — but the role template named in 19c and in my brief is **wrong**, see §1.1 |
| F2 | `GET /settings/permissions` is an uncalled duplicate under a weaker key | **TRUE**, and the exposure is wider than 19c stated — see §4.1 |

---

## 1. F1 — `POST /settings/email-templates/test`

### 1.1 Correction: the template is `BRANCH_HR`, not `HR_ADMIN`

Report 19c and my brief both say `settings:email-templates:manage` is carried by the **`HR_ADMIN`** role
template, citing `role-templates-crm-hr.constants.ts:221`. Line 221 is real, but it is **inside
`BRANCH_HR`**, which begins at line 175; `HR_ADMIN` spans 80–174 and does **not** carry the key.
Measured by executing `buildSeededRoleSpecs(new Set(ALL_PERMISSION_NAMES))` and `ROLE_TEMPLATES` in a
`git archive` tree:

```
settings:email-templates:manage
  seeded rungs (1): ORG_ADMIN
  role templates (1): BRANCH_HR
```

The finding is unchanged in substance and if anything slightly sharper — a **branch** HR administrator is
a lower rung than an org-wide HR administrator — but the citation was wrong and anyone re-deriving it
from `HR_ADMIN` would have concluded the finding was false.

### 1.2 What was wrong

`EmailTemplatesController.test()` took `@Body()` and nothing else: no `@CurrentUser()`, no `orgId`, no
rate limit, no audit. It rendered a `TEMPLATE_MAP` entry and called
`EmailService.sendEmail({ to: body.testEmail, … })` — an arbitrary address, from the platform's own mail
identity. `EmailOptions` carries an `organizationId`, and the outbox's `resolveScope` marks a send with
no org as `PLATFORM`; this route passed none, so it also never produced a tenant-attributable outbox row.
No tenant data crosses (the templates render from static input), so this is **not a BOLA** — the asset at
risk is the platform's deliverability.

### 1.3 The fix

- **Destination.** The send goes to the caller's own account address, resolved from `users` by
  `actor.userId` and compared with `canonicalEmail` (so case and surrounding space do not matter). A
  foreign address is a `403` and **sends nothing**. Ordered after the template lookup, so an unknown
  template is still a `404` and still sends nothing.
- **Tenant scope.** `sendEmail` now carries `organizationId: actor.orgId` and
  `recipientUserId: actor.userId`, so the outbox row is `TENANT`, not `PLATFORM`.
- **Rate limit.** `@UseGuards(RateLimitGuard)` + `@UseRateLimit("settings:email-template-test")`, with a
  matching `TIERS` entry (5 / 3600s, keyed on the caller's `userId` by the guard).
- **Audit.** A successful send logs `settings.emailTemplate.test` against the caller and their org. A
  refused send logs nothing.

**Deliberate behaviour change:** "send a test to an arbitrary address" is gone. Justified because the
route has **no frontend caller** (grep across `app/ components/ features/ hooks/ lib/` finds
`/settings/email-templates` only in the vendored `contracts/openapi.json`), and the on-screen preview
that `GET .../preview` already serves covers the non-mail use.

Note on the brief's warning that "an unknown `@UseRateLimit` key silently disables the limit": that is
**no longer true at head**. `RateLimitService.check` was changed under SEC-004 to log and **deny** an
unregistered tier. The tier is registered regardless, and a test pins it (§1.4 case b).

### 1.4 Bite-proof — four surgical plants, in a `git archive HEAD` tree with the fix copied in

The shared working tree was never modified. `new src/modules/email/email-template-test-scoping.spec.ts`,
11 tests.

| plant | exit | tests | which assertions bit |
|---|---:|---|---|
| baseline, fix in place | **0** | 11 passed | — |
| (a) destination check deleted from the service | **1** | 5 failed / 6 | the 4 destination cases + "does not audit a refused send" |
| (b) tier renamed to an **unregistered** key | **1** | 1 failed / 10 | "the declared tier is REGISTERED" — and only that |
| (c) `organizationId`/`recipientUserId` dropped from the send | **1** | 1 failed / 10 | "stamps the caller's organisation on the send" |
| (d) `audit.log` removed from the controller | **1** | 1 failed / 10 | "audits the send against the caller and their organisation" |
| all restored | **0** | 11 passed | — |

Each of the four controls is pinned **independently** — (b), (c) and (d) each move exactly one test — so
the suite is not one assertion wearing four hats. Case (b) is the one worth keeping: it catches a tier
that is decorated but not declared, which is how three routes once ran unlimited.

### 1.5 The one real external send in the repository is gone

`scripts/functional/int-email.test.mjs` described itself as sending "AT MOST ONE real email" — the
`[TEST]` template to `CONTACT_NOTIFICATION_EMAIL`, through this very endpoint. That call would now `403`.
It is replaced by the two `403` assertions that prove the destination restriction (a **known** template
plus a **foreign** address — the case that used to send, and the case a `404` would not distinguish). The
script now triggers **zero** external sends and its header says so.

---

## 2. P4 — `assertMayAssignRole` authorised from an unordered sample

### 2.1 It is a bypass, not only nondeterminism

`assert-role-assignment.ts` read the target role's grants with `.limit(500)` and **no `ORDER BY`**, then
required every returned key to be one the actor may confer. Two consequences, and the second is the
serious one:

1. Postgres guarantees no ordering without `ORDER BY`, so two identical calls could return different
   500-row slices and reach different answers.
2. On a role with more than 500 grants, **every grant outside the slice was never checked at all**. A key
   the actor may not confer, sitting past the window, is silently authorised — the role is handed over
   and the recipient gains it.

**Reachability.** `setRolePermissionsSchema` caps `items` at 500 **per write**, not a role at 500 grants,
and `RbacService.assignRolePermission` adds one at a time with `onConflictDoUpdate`, so a role can
accumulate up to the catalogue size (704 keys). Both callers are live:
`role-member.service.ts:200` (assign a role to a member) and `principal-groups.service.ts:285` (assign a
role to a group). No **seeded** role is near the cap; a custom role reaches it by ordinary use of the API.

### 2.2 The fix

The read is ordered by `permission_key` and bounded at `MAX_EVALUABLE_ROLE_GRANTS + 1` (5000 + 1). If more
rows come back than the ceiling, the assignment is **refused outright** rather than decided from a partial
view. An authorization decision is either complete or it is a denial; it is never a sample. The `.limit()`
is retained deliberately so `check:unbounded-reads` still sees a bounded read — removing it would have
traded one gate for another.

### 2.3 The test that actually distinguishes sampled from complete

A role with a handful of grants cannot tell the two apart, so every case builds a role whose grant count
**crosses the window** and plants the single unconferrable key **beyond** it. The `db` double returns the
first *n* rows in insertion order — the friendliest planner an unordered `LIMIT` could have — so a defect
that bites here bites under every real plan. `new
src/modules/rbac/__tests__/role-assignment-grant-sampling.spec.ts`, 7 tests, including a vacuity guard
(the catalogue must yield >600 safe keys, or every other case is empty) and a negative control (a
600-grant role the actor *may* confer in full still resolves).

**Bite-proof — the pre-fix file, in a `git archive HEAD` tree:**

| | exit | result |
|---|---:|---|
| fixed (head) | **0** | 7 passed |
| pre-fix `assert-role-assignment.ts` | **1** | **5 failed / 2 passed** |

The decisive line in the failure output is
`expect(received).rejects.toBeInstanceOf() — Received promise resolved instead of rejected`. That is the
escalation itself: the unfixed code **authorised** a role assignment it should have refused. The two that
stay green are the vacuity guard and the negative control, so the suite is not simply failing everything.
The same case is repeated through the real caller `RoleMemberService.addRoleMember`, so this is not only
a proof about a helper.

---

## 3. P3 — the read advertised a stricter rule than the writer applies

`getDiscoveryGrantable` computed `assignableRanks` as a raw `rank > bestRank`. `canGrantToRank` — whose
own comment says "both sides must import it here rather than copy the check" — additionally allows the
**peer-`MODULE_ADMIN`** case: an admin at rank 20 may configure a `MODULE_ADMIN` role in a module they
administer. So `GET /rbac/discovery/grantable` told a module admin they could not do something
`setRolePermissions` and `RolesService.updateRole` would in fact have allowed.

Two independent pieces of evidence that the **read** was the odd one out, not the write:
`module-standing-roster.service.ts:401`, the sibling read path, already calls `canGrantToRank`; and
`grant-escalation.spec.ts` already asserts the writer *allows* a module admin editing a peer-rank role in
their own module.

**Fix.** The read calls `canGrantToRank`, evaluated over the modules the actor administers
(`allowedModules === null → [null]`, which reproduces the old answer exactly for an org-wide actor). The
result already returns `allowedModules`, so the scope of the peer exception is already communicated.

**An existing test had encoded the defect.** `grantable-discovery.spec.ts` asserted
`assignableRanks` "excludes MODULE_ADMIN rank and above". That expectation was the divergence written
down. It now derives its expectation from `canGrantToRank` itself, and asserts the org-level ranks are
excluded — which is the part that was actually load-bearing.

**New `src/modules/rbac/__tests__/discovery-write-path-agreement.spec.ts`, 12 tests.** For three actor
contexts × three candidate ranks it asks **both** surfaces the same question and requires the same
answer, the write side being the real `RolePermissionService.setRolePermissions` driven to the point
where the rank decision is the only thing that can differ.

**Bite-proof:** with `rbac.service.ts` at its pre-fix state, exit **1**, **4 failed / 18 passed** — and
the four are exactly the peer-`MODULE_ADMIN` cases. Nothing else moves.

Practical impact today is nil: `assignableRanks` is declared in `frontend/hooks/api/access-schema.ts` but
has no UI consumer. The value of the fix is that the contract is now self-consistent and cannot drift
back silently.

---

## 4. F2 — `GET /settings/permissions` deleted

### 4.1 The exposure, measured rather than described

19c said `settings:view` is carried by "three role templates plus `MODULE_ADMIN_EXTRA_KEYS.hr`". Executed
against `buildSeededRoleSpecs` and `ROLE_TEMPLATES`:

```
settings:view          seeded rungs (4): ORG_ADMIN, HR_MODULE_ADMIN, HR_MODULE_OWNER, HR_MODULE_MEMBER
                       role templates (3): HR_ADMIN, BRANCH_HR, RECRUITER
settings:rbac:manage   seeded rungs (1): ORG_ADMIN
                       role templates (0): NONE
```

Seven principals through the side door, one through the front — and `HR_MODULE_MEMBER`, the **lowest** HR
rung, is among them. The payload was also the poorer of the two: `RbacController.getPermissions()`
returns `DISCOVERABLE_PERMISSIONS`, which annotates `baselineScope`; the settings route returned the raw
`PERMISSIONS` constant.

### 4.2 Proving it uncalled before deleting — not from text search

Per root §10, three independent lines:

1. **Contract registry.** `contracts/api-contract-registry.json` classifies
   `GET /settings/permissions` as `"classification": "internal"` with `"consumers": []`. Architecture
   decision 12 permits internal routes to break, and `check-contract-breaking-change.mjs` exempts exactly
   that class. Removal is contract-permissible; this is not a judgement call I made.
2. **Frontend.** No module calls it. The role editor's `usePermissionCatalog()` goes to
   `GET /rbac/permissions` (`components/rbac/permission-matrix.tsx`). The only frontend hit for the path
   is the generated `contracts/openapi.json`.
3. **Module graph.** `pnpm exec knip --no-progress` before and after the deletion is **byte-identical**
   apart from knip's own rotating tip line — no symbol became newly unused, because the `PERMISSIONS`
   import went with the method. (knip exits 1 at head for pre-existing reasons: one unlisted dependency,
   three unused exports, three unused types. Unchanged by this work.)

Backend references were its own two tests (`settings.controller.e2e-spec.ts`,
`scripts/functional/admin-infra.test.mjs`), the census entry, and generated artifacts.

### 4.3 Why delete rather than re-key

Re-keying to `settings:rbac:manage` would leave two byte-identical routes behind identical gates: pure
duplication, no benefit, and the census keeps carrying it. Deleting leaves the catalogue with exactly one
door, at the right key, returning the richer payload. Root §10: leave less code than you found.

**Bite-proof:** re-adding the route to `settings.controller.ts` in a temp tree, without a census entry
→ exit **1**, 1 failed / 7 passed, the failure printing
`"GET /settings/permissions  (modules/settings/settings.controller.ts)"`. The census's stale-inventory
assertion is what proves the deletion is real rather than narrated.

---

## 5. Gates — command, exit code, number

Every one executed and its output read. `$?` captured directly (`${PIPESTATUS[0]}` is empty in this zsh).

| command | exit | number |
|---|---:|---|
| `pnpm typecheck` (after F1/P3/P4) | **0** | exit code, not a grep |
| `pnpm typecheck` (after the F2 deletion) | **0** | exit code, not a grep |
| `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| `pnpm check:owner-authority` | **0** | nothing fabricates ownership |
| `pnpm check:route-classification` | **0** | ALL ROUTES CLASSIFIED |
| `pnpm check:hardcoded-secrets` | **0** | 15,909 files, 0 committed credentials |
| `pnpm check:contract-registry` | **0** | 3,656 operations classified, 102 published |
| `pnpm check:route-duplicates` | **0** | 0 findings |
| `pnpm check:permission-keys` | **0** | every `@RequirePermission` key resolves both sides |
| `pnpm check:idempotent-commands` | **0** | every in-scope mutating handler carries `@Idempotent` |
| `pnpm check:module-di` | **0** | 218 modules · 1,714 classes · 0 violations |
| `pnpm check:authz-deny` | **0** | uncovered 2,337 vs ratchet 2,441 |
| `jest --runInBand --testPathPattern="src/modules/(rbac\|settings\|email)"` | **0** | **50 suites passed / 1 skipped · 421 tests passed / 4 skipped** |
| `jest … role-assignment-grant-sampling` | **0** | 7 tests |
| `jest … discovery-write-path-agreement` | **0** | 12 tests |
| `jest … email-template-test-scoping` | **0** | 11 tests |
| `jest … settings-surface-census` | **0** | 8 tests, now 25 routes / 4 controllers |
| `pnpm exec knip --no-progress` | 1 | **pre-existing**; output identical before and after |

### Two red gates, both pre-existing — falsified, not assumed

Rule 4 says a red gate may not be mine, so I measured it rather than asserting it. Both were run in a
`git archive` tree at **`afb0a1f1^`** — the commit immediately before my first — and produce the
**identical** failure:

| gate | at `afb0a1f1^` | at head | failing paths |
|---|---:|---:|---|
| `check:unbounded-reads` | **1** | **1** | 1 stale (`/settings/settings-custom-fields.service.ts`), 4 unclassified (chat, crm, cron, kb), 1 regression (`hr/performance/kpis.service.ts`) |
| `check:dead-code` | **1** | **1** | 1 stale verdict, `src/common/tenant/tenant-context.ts:getTenantAbortSignal` |

Not one names a file I touched. In particular `assert-role-assignment.ts` does **not** appear in
`check:unbounded-reads` — the retained `.limit()` is why.

---

## 6. Files changed and commits (`streamlineos-backend`, branch `main`)

| commit | what |
|---|---|
| `afb0a1f1` | `fix(rbac): stop deciding role assignment from an unordered 500-row sample` — `src/modules/rbac/assert-role-assignment.ts`, `src/modules/rbac/__tests__/role-assignment-grant-sampling.spec.ts` (new) |
| `30be04dc` | `fix(rbac): make discovery advertise the rank rule the writer actually applies` — `src/modules/rbac/rbac.service.ts`, `src/modules/rbac/__tests__/grantable-discovery.spec.ts`, `src/modules/rbac/__tests__/discovery-write-path-agreement.spec.ts` (new) |
| `5a0505af` | `fix(email): scope POST /settings/email-templates/test to the caller` — `src/modules/email/controllers/email-templates.controller.ts`, `src/modules/email/email-routes.service.ts`, `src/modules/email/email-template-test-scoping.spec.ts` (new), `src/common/ratelimit/rate-limit.service.ts`, `src/modules/settings/settings-surface-census.spec.ts`, `scripts/functional/int-email.test.mjs` |
| `8634cba3` | `refactor(settings): delete GET /settings/permissions, the duplicate catalogue door` — `src/modules/settings/settings.controller.ts`, `settings.service.ts`, `settings.controller.e2e-spec.ts`, `settings-surface-census.spec.ts`, `scripts/functional/admin-infra.test.mjs` |

`git show --stat` was read for each; every commit contains exactly the files listed and no others. All
four used an explicit **file** pathspec on `git commit` itself, never a directory.

---

## 7. What this work does NOT prove

Stated so the coverage claim is falsifiable.

- **Every proof is against a database double.** None of the four fixes was exercised against Postgres. For
  P4 this matters most: I proved the writer now evaluates the complete set, not that the SQL is
  tenant-scoped — the `org_id` predicate is unchanged and `check:tenant-isolation` was not re-run because
  no query predicate changed, only the ordering and the bound.
- **The rate limiter was not exercised end to end.** The test proves the route declares a tier, that the
  tier is registered in `TIERS`, and that `RateLimitGuard` is mounted. It does not fire 6 requests and
  observe a 429; that needs Redis or a live app.
- **`pnpm openapi:check` / `check:contract-vendor` not run** (A-12/A-12b, release-time, already 55
  differences across six lanes). Deleting `GET /settings/permissions` and adding a guard to
  `POST /settings/email-templates/test` will each add a difference there. `openapi.json` and
  `contracts/api-contract-registry.json` were **deliberately not regenerated** — they are shared
  release artifacts and regenerating them under five concurrent agents would be worse than one more known
  pending diff.
- **`src/scripts/baselines/authz-deny.json` still lists `GET /settings/permissions`.** The entry is inert:
  `uncoveredHandlers` is consulted only when the count exceeds the ratchet, and the gate is exit 0. Left
  alone rather than hand-edited, because it is a generated shared baseline another agent may regenerate.
- **`scripts/functional/*.mjs` were edited but not executed.** They need a live server and a database.
  `node --check` passes on both. The `int-email.test.mjs` change *removes* an external call, so the worst
  case of not running it is that a check I added does not fire, never that mail is sent.
- **Backend lint and `test:e2e` not run.** Frontend untouched — no frontend file was changed by this work.

---

## 8. Still open, and whose

| # | item | owner |
|---|---|---|
| P1 | `hr:contracts:view\|manage` on the 3 HR module rungs but on none of the 13 role templates | **product** |
| P2 | `feedbucket` is delegable + administrable with `route: null` — nowhere to administer it | **product** |
| R-12 | the 7 `/settings/automations*` routes need a rung; four costed options in report 19b | **product / release owner** |
| A-12 | `pnpm openapi:check` regenerate-and-diff, now +2 differences from this pass | **release orchestrator** |

Placement is untouched: both `/settings/email-templates/*` routes remain `PENDING-MOVE` in the census.
The **abuse** hole is closed; the question of whether platform transactional templates belong at a global
`/settings/*` path is a different question and still open. The census comment now says exactly that, so a
later reader does not mistake the fixed hole for the unmade decision.
