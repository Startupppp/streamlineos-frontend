# 19c — Pass 6: the second grant writer, and a census that finds what the box's inventory could not

**Ticket:** 19 — module release matrix for authentication/identity/organization, RBAC and Settings.
**Boxes at start of pass:** 5 closed / 2 PARTIAL (box 3 and box 6).
**Boxes at end of pass:** 5 closed / 2 PARTIAL — **neither closed, both materially narrowed**, and one
finding fixed that neither box had recorded.
**Date:** 2026-09-03.

---

## 0. Three inherited findings, verified before acting. Two of them were wrong.

`reports/50-permission-route-binding.md` handed this pass three findings. I measured all three
against source and a run before touching anything.

### 0.1 "14 delegable backend, 10 in the frontend" — TRUE, and now fixed

Measured by parsing `streamlineos-backend/src/common/rbac/module-registry.ts`: **22 registry entries,
14 `ladder: "delegable"`**, matching the vendored `contracts/permission-catalog.json`
(`delegableModuleIds`, 14). `frontend/lib/rbac/permissions/module-access.ts` listed **10**. Missing:
`blog`, `directory`, `feedbucket`, `workflows`.

### 0.2 "…therefore no grantable access keys in the role editor" — **FALSE for three of the four**

The role editor does **not** read the frontend constant. `components/rbac/permission-matrix.tsx:58`
calls `usePermissionCatalog()`, which is `GET /rbac/permissions` — the live backend catalogue, all
**28** access keys. The frontend `PERMISSIONS` constant has **no UI consumer at all**; grep across
`app/ components/ features/ hooks/ lib/` finds it only in `lib/rbac/permissions/index.ts` and four
test files. So `blog`, `directory` and `workflows` were always grantable, and all three have
conforming `/<module>/access` pages and both union keys.

What was real, and sharper than the finding as stated:

- **`feedbucket` alone had no surface at all** — no `feedbucket:access:*` in the `PermissionKey`
  union (13 modules' worth of access keys were there, not 14), no `app/(authenticated)/feedbucket/`
  directory, no `route-access` entry, while the backend seeds `FEEDBUCKET_MODULE_ADMIN`/`_OWNER`/
  `_MEMBER` and generates both keys. Its registry entry is `route: null`, so it owns no product
  surface to hang an access screen off.
- **`catalog-sync.test.ts` was arranged around the drift.** It subtracted the generated
  `<module>:access:*` keys from *both* sides of its comparison and substituted the frontend's own
  list, and its ghost check carried an explicit `!/^[a-z0-9-]+:access:(view|manage)$/` exemption.
  That subtraction is precisely what stopped its phantom, union-coverage and ghost assertions from
  seeing any of this. The one file whose job was to catch the drift had been shaped so it could not.

### 0.3 "`hr:contracts:*` in no role template, so only org owners can use contracts" — **FALSE**

Executed `buildSeededRoleSpecs(new Set(ALL_PERMISSION_NAMES))` and `ROLE_TEMPLATES` directly
(ts-node, in a `git archive` tree):

```
hr:contracts:view    seeded rungs (3): HR_MODULE_ADMIN, HR_MODULE_OWNER, HR_MODULE_MEMBER
                     role templates (0): NONE
hr:contracts:manage  seeded rungs (2): HR_MODULE_ADMIN, HR_MODULE_OWNER
                     role templates (0): NONE
total seeded rungs: 44 | total templates: 13
```

`moduleScopedPermissions("hr")` returns every `hr:*` key, so the HR module rungs carry contracts
already and **every newly seeded organisation can delegate them today**. Report 50 read only
`role-templates*.constants.ts`, which is 13 of the 44 rungs a new org receives.

**The residual exposure, stated correctly:** the three HR *templates* — `HR_ADMIN`, `BRANCH_HR`,
`RECRUITER` — carry neither key, so a person given a template role rather than an HR module rung
cannot use contracts. Whether those templates should carry `hr:contracts:*` is a **product
decision**; I did not pick an answer. It is not a lockout and it is not owner-only.

---

## 1. Box 3 — "strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive
owner/descendant protection"

### 1.1 The escalation clause, proved rather than asserted — and a real hole

`grantability.spec.ts` (469 lines, ~40 cases) exercises `assertPermissionsGrantable` exhaustively **as
a pure function**. What a unit test of the shared predicate structurally cannot see is whether each
writer *calls* it, and with what. There are two writers over `role_permission_grants`:

| | `RolePermissionService.setRolePermissions` (`PUT /roles/:id/permissions`) | `RbacService.assignRolePermission` (`POST /rbac/role-permissions`) |
|---|---|---|
| loads the role | yes, scoped to `org_id` | **no — took `roleId` from the body** |
| `isImmutableSystemRole` | yes, before the owner short-circuit | **no** |
| actor `bestRank` / `allowedModules` | yes | **no** |
| target `{rank, moduleKey}` | yes | **no** |
| `permissionMeta` (module boundary) | yes | **no** |

Consequences, each measured by driving the real service:

1. **A role id from another tenant reached the insert.** The composite FK
   `(org_id, role_id) → roles(org_id, id)` catches it, so it surfaced as a **500**, not the **404** a
   cross-tenant miss owes (`backend/CLAUDE.md` §4).
2. **The org-level `ORG_ADMIN` and `MEMBER` rows were writable here.** `setRolePermissions` refuses
   them outright — "Organization-level system roles cannot be modified" — for the org owner too. A
   structural org admin could push `settings:manage` / `settings:rbac:manage` onto the `MEMBER`
   system role through this door and hand it to every member of the organisation.
3. **The rank and module-boundary rules never ran on this path**, because
   `assertPermissionsGrantable` was called with `target` and `permissionMeta` undefined, which is
   its documented backward-compat skip.

Reachability, stated honestly: the route is `@RequirePermission("settings:rbac:manage")` **and**
`isStructuralOrgAdmin`, so only the org owner or an actual `ORG_ADMIN` membership row reaches it, and
**no frontend code calls it** — grep across `hooks/ features/ app/ components/ lib/` finds callers of
`/rbac/permissions` only. It is an API-only surface reachable with a session cookie or a personal
token. That bounds the severity; it does not make two writers over one table with two different rule
sets acceptable.

**Fix.** `RbacService.resolveRoleInOrg` now resolves the role inside `actor.orgId` (404 on a miss),
refuses `isImmutableSystemRole`, and returns `{rank, moduleKey}` so both `assertPermissionsGrantable`
arguments the bulk writer passes are passed here too. Applied to **both** `assignRolePermission` and
`revokeRolePermission` — a revoke of a foreign role id had the same 500, and stripping grants off the
`MEMBER` system role is the same invariant from the other side.

**Proof.** New `src/modules/rbac/__tests__/grant-escalation.spec.ts` — **16 tests**, every one driving
a real service method, nothing asserted against the predicate:

| planted defect (in a `git archive HEAD` tree, never the shared tree) | exit | which assertions bit |
|---|---|---|
| baseline at head | **0** | 16 passed |
| `rbac.service.ts` reverted to `HEAD~1` (the pre-fix writer) | **1** | **6 failed / 10 passed** — the two 404s, the two immutable-system-role refusals (admin and owner), and the rank rule |
| `role-permission.service.ts`: `assertGrantable(…, target, permMeta)` → `(…, undefined, undefined)` | **1** | 2 failed — cross-module grant, peer-rank role in a different module |
| `role-permission.service.ts`: `isImmutableSystemRole` refusal deleted | **1** | 1 failed — the org-level system role, for the owner |
| everything restored | **0** | 16 passed |

Ten cases stay green against the pre-fix writer, so the suite is not simply failing everything; and
two cases are deliberate *allows* (a module admin configuring a peer in their **own** module; a held
key on a lower-rank role), so the deny is not a wall.

Paths tested directly, per the brief's clause: a non-owner cannot grant a key they do not hold to
themselves or a peer; cannot propagate `settings:rbac:manage` without holding `settings:manage`;
cannot grant outside their own module even holding the key; cannot reach a role at or above their own
rank; cannot escalate through a descendant role, because the descendant's grants are checked against
the actor's own set and its rank against the actor's; and cannot edit an org-level system role. The
per-person path (`UserPermissionGrantsService.setGrants`) was read and needs nothing: it refuses
self-grant explicitly, refuses a scope wider than the grantor's own via `SCOPE_RANK`, and constrains
every key to `moduleScopedPermissions(moduleKey)`.

### 1.2 Idempotency — natural, not merely fenced

The brief's caveat is right: `common/idempotency/command-fence-store.ts` swallows a failed completion
write by design, so a route safe only because of the fence is not safe on the path the fence itself
documents. Checked what the grant writers do **without** the fence:

- `assignRolePermission` inserts with `onConflictDoUpdate` on
  `(org_id, role_id, permission_key)` — the columns of `uniq_role_permission_grants_role_key`. Granting
  an already-granted permission is a scope-idempotent upsert: no error, no duplicate row. Pinned by a
  test that calls the service twice with identical input and asserts the conflict target has three
  columns.
- `revokeRolePermission` is a predicated `DELETE` — a replay deletes nothing.
- `UserPermissionGrantsService.setGrants` is delete-then-insert over one `(membership, module)`
  partition — a replay reproduces the same rows.
- `setRolePermissions` is deliberately **not** replay-safe: it is a compare-and-set on `roles.version`
  and a replay is a `409`. That is correct for a bulk replace and is pinned by
  `role-permission-cas.spec.ts`.

### 1.3 What still blocks box 3

Unchanged and not advanced this pass: **`pnpm openapi:check`** (A-12) — a regenerate-and-diff whose
55 differences already span at least six lanes, so it belongs at the release commit. Owner: release
orchestrator, 2026-09-08. **A-12b** (`pnpm check:contract-vendor`, exit 1 on one operation) rides the
same change. **My changes cannot drift the document**: `x-exposure` records the class not the key, no
`@Idempotent` was added or removed, and the one permission-key change is on the frontend side of the
vendored catalogue, which `pnpm check:permission-catalog` confirms is byte-identical to a fresh
regeneration (exit 0).

---

## 2. Box 6 — "global settings hold organization configuration and access governance only"

### 2.1 The criterion, stated first

An unstated criterion makes this box unfalsifiable, so it is now written in the source, at the top of
`src/modules/settings/settings-surface-census.spec.ts`:

> A route belongs at a global `/settings/*` path iff BOTH:
> **(a)** its subject is the **organisation itself** or the **access graph** over it — profile,
> structure, people as principals, roles/grants/delegations, enabled modules, plan, and the audit of
> those decisions; **or** it is the **viewer's own principal** (profile, password, MFA, personal
> tokens), which `frontend/CLAUDE.md` §17 names as universal at `/settings`; **and**
> **(b)** it is **configuration or governance** — it changes the rules under which work happens; it is
> not the work.

Three corollaries, each of which has already caught something:

| test | statement | what it caught |
|---|---|---|
| **OWNERSHIP** | if exactly one module owns the rows read and written, the route is that module's | `custom_field_definitions` filtered to `lead\|deal\|contact` → CRM; `git_connections.project_id` → Build |
| **RUNG** | if the intended user must be handed a `settings:*` key to reach a surface their own module owns, the key and the path are both misnamed | `BUILD_MODULE_ADMIN` needing `settings:manage` for Build's git integrations |
| **OPERATION** | if the content changes as **work** happens rather than as **policy** changes, it is operational | `/settings/ai-usage` — usage is a meter reading |

### 2.2 The inventory method — and why the previous three passes' numbers were short

Every earlier pass enumerated `SettingsController` and stopped. `settings-route-gates.spec.ts`, which
is otherwise a strong file (it runs the real `PermissionGuard` over real metadata in both directions),
can only see controllers it **imports by name**, so it is structurally blind to a controller mounted
at `settings/*` from elsewhere in the tree.

I enumerated instead by walking all of `src/` for `*.controller.ts`, pre-filtering on the text
`@Controller("settings…")`, then `require`-ing the survivors and reflecting **real Nest metadata**
(`PATH_METADATA`, `METHOD_METADATA`, `REQUIRE_PERMISSION`) rather than parsing source.

**Result: 26 routes across 4 controllers.** Three had never been counted by this box:

| route | file | why it was missed |
|---|---|---|
| `POST /settings/automations/:ruleId/test` | `modules/automation/automation.controller.ts` | not on `SettingsController` |
| `GET /settings/email-templates/preview` | `modules/email/controllers/email-templates.controller.ts` | not on `SettingsController` |
| `POST /settings/email-templates/test` | same | not on `SettingsController` |

So **the automations surface is seven routes, not the six** report `19b` costed. The other 23 are the
13 on `SettingsController` and the 10 dated aliases on `SettingsDeprecatedRoutesController` — pass 3's
and pass 4's moves **verified by artifact**, not transcribed.

### 2.3 Verdict per surface

**Backend, 26 routes.** Full table in the spec; summary:

| verdict | count | routes |
|---|---:|---|
| `ORG-CONFIG` | 6 | `GET /settings/provenance`; `GET|POST /settings/api-keys`, `DELETE …/:keyId`; `GET|PATCH /settings/feature-flags` |
| `ACCESS-GOVERNANCE` | 1 | `GET /settings/permissions` |
| `SUNSET-ALIAS` | 10 | ai-usage, git ×4, users-role, custom-fields ×4 |
| `PENDING-MOVE` | 9 | automations ×7, email-templates ×2 |

**Frontend, 23 `/settings/*` pages — all PASS**, re-enumerated from disk this pass: `/settings`
(My Account: profile, password, MFA — the `SELF` class §17 sanctions), `/settings/api-tokens`
(personal tokens, same class), `audit-log`, `billing` ×2 (root §8 fixes these two exactly),
`delegations`, `incoming-transfer`, `modules`, `organization/*` ×9, `roles/*` ×4, `users`, `webhooks`.
No global page owns a module surface; the automations screens already live at
`/crm|/support|/accounting|/hr .../settings/automations`, so **only the backend path and key are
global**.

`/settings/webhooks` is a KEEP that deserves its reasoning stated: `webhook_endpoints` is org-scoped
with **no module FK** and free-form event names including `*` wildcards, so the ownership test finds
no owner but the organisation. Three module-owned **outbound** webhook controllers already live in
their own modules — `inventory/webhooks` (`inventory:webhooks:manage`), `hr/webhooks`
(`hr:integrations:manage`) and `build` (`build:manage`) — which is evidence the global one is the
org-level residual rather than an unmoved module surface. (The `email`, `billing` and `calendar`
webhook controllers are **inbound provider** callbacks, a different thing entirely.) Its delivery-log tab is
operational by a strict reading of the OPERATION test; it stays because it has no module owner and is
the only evidence a configured endpoint works.

### 2.4 Two new findings on the surfaces that stayed

**F1 — `POST /settings/email-templates/test` has no tenant scoping at all.** Cross-territory
(`src/modules/email/`), **not fixed**, reported here.

`EmailTemplatesController.test()` takes `@Body()` only — **no `@CurrentUser()`, no `orgId`** — and
calls `EmailRoutesService.sendTemplateTest(templateId, testEmail, locale)`, which renders a
`TEMPLATE_MAP` entry and calls `this.email.sendEmail({ to: testEmail, … })`. No org scoping, no
`@UseRateLimit`, no audit. `settings:email-templates:manage` is carried by the **`HR_ADMIN` role
template** (`role-templates-crm-hr.constants.ts:221`), so it is reachable from a shipped template, not
only by an owner. No tenant data crosses — the templates render from static input — so this is **not**
a BOLA; it is an **abusable send** from the platform's mail identity, which `backend/CLAUDE.md` §4
names ("Rate-limit abusable flows") and root §4 counts as a deliverability/reputation risk. Fix shape:
take `@CurrentUser()`, scope the send to the caller's own verified address or their org's domain, add
`@UseRateLimit`, and audit it. **Owner: the email module.**

**F2 — `GET /settings/permissions` is a duplicate door with a weaker key.** `SettingsService.getPermissions()`
returns the same `PERMISSIONS` constant that `RbacController.getPermissions()` returns, but behind
**`settings:view`** (carried by the `HR_ADMIN`, `BRANCH_HR` and `RECRUITER` templates and by
`MODULE_ADMIN_EXTRA_KEYS.hr`) rather than `settings:rbac:manage`. No frontend calls it. The catalogue
is static product data, so this leaks no tenant state; it is a second, wider-open door onto a
governance surface and a `knip`-plus-build deletion candidate. Recorded, not deleted — §10 forbids a
dead-code claim from text search alone, and this is a live public API route.

### 2.5 What still blocks box 6

**R-12 stands and is now larger by one route.** Seven `/settings/automations*` routes, 48 triggers
across HR 27 / CRM 8 / Support 7 / Accounting 6 plus four support-only actions; no single module rung
fits and one was not invented. Four costed options in `reports/19b-automations-rung-decision.md`.
**Product decision. Owner: release owner (product). Deadline: 2026-09-10.**

**F1 is assignable, not a decision**, and belongs to the email module owner.

**A-13** (the `sidebar-nav-groups-work-management.ts:215` one-liner) is unchanged and still coupled to
A-12; re-verified this pass that `check:route-access-contract` is **exit 0** at head.

---

## 3. What changed

**Backend** (`streamlineos-backend`)

| path | change |
|---|---|
| `src/modules/rbac/rbac.service.ts` | `resolveRoleInOrg`; both single-key verbs now 404 a foreign role, refuse an org-level system role, and pass rank + module context |
| `src/modules/rbac/__tests__/grant-escalation.spec.ts` | new — 16 tests over the real writers |
| `src/modules/settings/settings-surface-census.spec.ts` | new — the criterion, the 26-route inventory, 8 assertions |

**Frontend** (`streamlineos-frontend`)

| path | change |
|---|---|
| `frontend/lib/rbac/permissions/module-access.ts` | `ACCESS_MANAGED_MODULES` 10 → 14 |
| `frontend/lib/rbac/permissions/permission-key-extended.ts` | `feedbucket:access:view|manage` added to the union |
| `frontend/lib/rbac/permissions/__tests__/catalog-sync.test.ts` | subtraction removed, `*:access:*` ghost exemption removed, 2 new assertions |
| `frontend/features/module-access/module-access-route-invariants.test.ts` | derived from `ACCESS_MANAGED_MODULES`, 10 → 13 pages, feedbucket exemption recorded |

## 4. Gates — command, exit code, number

Every one executed this pass and its output read. Nothing below is transcribed.

| command | exit | number |
|---|---:|---|
| `pnpm -C streamlineos-backend typecheck` | **0** | 0 errors (exit code, not a grep) |
| `pnpm -C streamlineos-backend check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| `pnpm -C streamlineos-backend check:owner-authority` | **0** | 3587 files, 9/9 owner-only operations enforced, 12 reported shortcuts |
| `pnpm -C streamlineos-backend check:route-classification` | **0** | ALL ROUTES CLASSIFIED |
| `jest --runInBand --testPathPattern="src/modules/(rbac\|settings)"` | **0** | 38 suites, 275 passed / 4 skipped |
| `jest --runInBand --testPathPattern="grant-escalation"` | **0** | 16 tests |
| `jest --runInBand --testPathPattern="settings-surface-census"` | **0** | 8 tests, 26 routes / 4 controllers censused |
| `pnpm -C frontend type-check` | **0** | 0 errors |
| `pnpm -C frontend check:permission-catalog` | **0** | 704 permissions, 14 delegable modules, 627 route-bound keys; byte-identical to a fresh regeneration |
| `pnpm -C frontend check:permission-catalog:self-test` | **0** | 19 cases |
| `pnpm -C frontend check:permission-binding` | **0** | 2384 bindings |
| `pnpm -C frontend check:permission-binding:self-test` | **0** | 31 cases |
| `pnpm -C frontend check:route-access-contract` | **0** | every route-access permission names a generated operation |
| `jest --runInBand --testPathPattern="(lib/rbac\|hooks/api/access\|components/layout/sidebar\|features/module-access)"` | **0** | 29 suites, 265 tests |

**Not run:** `pnpm openapi:check` (A-12, release-time — see §1.3), `pnpm check:contract-vendor`
(A-12b), backend `test:e2e`, lint on either side, any browser run. No database was touched by this
pass — no `psql`, no scratch database created or dropped.

## 5. Bite-proofs

Ten planted defects, every one in a `git archive HEAD | tar -x` tree with `node_modules` symlinked.
**The shared working tree was never modified**; `git status` after each run showed only the intended
files.

| # | defect | exit | assertion that bit |
|---|---|---:|---|
| a | frontend `ACCESS_MANAGED_MODULES` back to 10 | 1 | the two new equality assertions, and only those |
| b | `feedbucket:access:*` removed from the union | 1 | backend-key coverage + `PERMISSIONS`-in-union |
| c | `kb:access:view` added to the union (a module with no ladder) | 1 | union-only ghosts — which the removed exemption would have hidden |
| d | backend `rbac.service.ts` reverted to `HEAD~1` | 1 | 6 failed / 10 passed |
| e | `assertGrantable(…, undefined, undefined)` in the bulk writer | 1 | cross-module grant, peer-rank in another module |
| f | `isImmutableSystemRole` refusal deleted from the bulk writer | 1 | org-level system role, owner case |
| g | a new `@Controller("settings/data-hub")` added elsewhere in `src/` | 1 | census named it **and its file** — `GET /settings/data-hub/exports (modules/dataquality/dq.controller.ts)` |
| h | `email-templates.controller.ts` removed | 1 | stale-inventory assertion |
| i | `@RequirePermission` stripped off `GET /settings/feature-flags` | 1 | "the census is not a bypass" |
| j | `workflows/access/page.tsx` deleted; `blog` page's key swapped to `settings:manage` | 1 | per-page shape + the has-a-page-or-a-reason assertion |
| — | all restored, both trees | **0** | — |

Case (g) is the one that matters: it reproduces exactly how the three uncounted routes got there, and
the census reports one finding naming the route and the file.

## 6. What this pass would still MISS

Stated so the coverage claim is falsifiable.

- The census `require`s only files whose text matches `@Controller("settings…")`. A prefix built from
  a constant or a template literal is invisible to it. Nothing in the tree does that today; a gate
  that did would need the AST approach `check-permission-route-binding.mjs` uses.
- It sees routes at a `settings` **prefix**. A module surface mounted at some other global path is
  out of its scope, and box 6 is only about `/settings/*`.
- `grant-escalation.spec.ts` drives services against a database double. It proves the writer applies
  the rule; it cannot prove the SQL is tenant-scoped — the `*-tenant-isolation.spec.ts` files do that,
  and `check:tenant-isolation` was not re-run this pass because no query predicate changed.
- The `assignRolePermission` fix was not exercised against a live database. `resolveRoleInOrg` uses
  `db.query.roles.findFirst`, the same call `RolePermissionService.getRole` already makes on the same
  table, so the risk is low — but "measured on a double" is not "measured on Postgres".
- `check:tenant-indexes`, `check:openapi-*`, `check:contract-registry` and lint were not run this
  pass; box 3 and box 4 cite them from earlier passes and no code I touched changes what they read.

## 7. Handed off, not fixed

| # | finding | owner |
|---|---|---|
| F1 | `POST /settings/email-templates/test`: no `orgId`, no `@CurrentUser`, no rate limit, no audit; sends a platform template to an arbitrary address; reachable from the `HR_ADMIN` template | email module |
| F2 | `GET /settings/permissions` duplicates `GET /rbac/permissions` behind `settings:view` instead of `settings:rbac:manage`; no caller | settings owner / dead-code sweep |
| P1 | `hr:contracts:view\|manage` are on the three HR module rungs but on **none** of the 13 role templates — a template-role HR administrator cannot use contracts | product |
| P2 | `feedbucket` is delegable + administrable with `route: null`: three seeded rungs and two generated keys, and nowhere in the product to administer them | product |
| P3 | `RbacService.getDiscoveryGrantable` computes `assignableRanks` as a raw `rank > bestRank`, not through `canGrantToRank`, so it omits the peer-`MODULE_ADMIN` exception the writer allows. The read is **stricter** than the write, so it under-advertises rather than over-advertises — but `canGrantToRank`'s own comment says both sides must import it, and one side does not | rbac owner |
| P4 | `assertMayAssignRole` (`assert-role-assignment.ts:27`) reads a role's grants under an unordered `.limit(500)` before checking them, so a role holding more than 500 grants is authorised on a sample. Reachable from both callers: `role-member.service.ts:200` (assign a role to a member) and `principal-groups.service.ts:285` (assign a role to a group). The catalogue's largest namespace is `hr` at 135 keys, so no **seeded** role reaches the cap; a custom role can hold up to 704 and `setRolePermissionsSchema` caps `items` at 500 per write, not per role. Same shape as the `access-permission.resolver.ts` unordered-limit drains box 4 closed | rbac owner |
