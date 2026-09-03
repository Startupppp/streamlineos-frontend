# 19e — Settings placement: A-13 closed, and R-12's recommended option is not adoptable

Pass 8 on ticket 19's one open box (line 101, Settings placement). **A-13 is closed and
bite-proved. R-12 is not, and this pass found the reason it cannot be adopted as written.**

Box 6 remains **OPEN**: 9 routes still sit at a global `/settings/*` path (7 automations,
2 email templates). What changed is that one of the box's two PARTIALs is gone and the other
is now a measured blocker rather than a described one.

---

## 1. A-13 — CLOSED. The coupling really had dissolved

Pass 4 recorded the Build sidebar one-liner as blocked: flipping
`sidebar-nav-groups-work-management.ts` from `settings:manage` to `integrations:git:view`
would fail `check:route-access-contract`, because that gate reads the generated contract and
`integrations:git:view` occurred **0 times** in either `streamlineos-backend/openapi.json` or
`frontend/contracts/openapi.json`. Owner was recorded as "whoever lands A-12".

A-12 landed in the ticket-08 lane. **Verified before acting, not transcribed:**

| check | result |
|---|---|
| `integrations:git:view` in `streamlineos-backend/openapi.json` | **4 occurrences** |
| `integrations:git:view` in `frontend/contracts/openapi.json` | **4 occurrences** |
| `pnpm -s check:contract-vendor` (A-12b) | **exit 0**, documents match |
| `pnpm -s check:route-access-contract` at head, before the flip | **exit 0**, 203 keys |

So the blocker was real and is gone. Flipped both sites — the route itself
(`:215`) and the Build group's admission list (`:160`, whose `settings:manage` entry existed
only to admit that one child and would otherwise have been a group key with no child).

**The flip is strictly widening, checked rather than assumed.** `ROLE_DEFAULT_PERMISSIONS`
gives `OWNER` and `ORG_ADMIN` `ALL_PERMISSION_NAMES`, so both already hold
`integrations:git:view`; **no role template carries `settings:manage` at all** (the only
occurrence in `src/modules/rbac/` is the catalog definition itself). No principal that could
see the item loses it, and `BUILD_MODULE_ADMIN` — which `MODULE_ADMIN_EXTRA_KEYS.build` grants
`integrations:git:view|manage` — gains it. Before this, that role held the key and still could
not see its own module's settings link; the page worked only by URL.

**Proof.**

| command | exit | number |
|---|---|---|
| `pnpm -s check:route-access-contract` (after) | **0** | **204** keys checked, up from 203 — the new key is contract-backed |
| `pnpm -s check:contract-vendor` | **0** | documents match |
| `jest --testPathPattern="components/layout"` | **0** | 18 suites / **126** tests |
| `pnpm type-check` (frontend) | **0** | 0 `error TS` |

`sidebar-nav-inventory.test.ts` is a sha256 lock over the whole ordered nav graph and it
**bit on the first run** (exit 1, 1 failed / 126) — which is the gate working. Digest updated
to `3f26f848…` with the dated reason the file's convention requires.

Commit **`3c45e63bb`** (`streamlineos-frontend`), 2 files.

---

## 2. R-12 — the recommended option is NOT adoptable today. New, and measured

`reports/19b-automations-rung-decision.md` costs four options and recommends **Option 2**:
move the routes to `/<module>/settings/automations` and resolve the module per row from
`triggerEvent`. It notes the mapping "already exists implicitly in the trigger vocabulary" and
warns that a new trigger with an unmapped prefix "must **fail closed**, not fall through to a
default."

**The mapping is not implicit — it exists, in the frontend, and it does exactly the thing 19b
warned against.** `components/automations/automation-trigger-data.ts`:

```ts
export function getModuleForTrigger(trigger: AutomationTrigger): TriggerModule {
  const entry = TRIGGER_META.find((t) => t.value === trigger);
  return entry?.module ?? "hr";
}
```

Three vocabularies, counted from source:

| vocabulary | source | size |
|---|---|---:|
| engine enum | `src/db/schema/automation/rules.ts` `AUTOMATION_TRIGGERS` | **55** |
| write API | `src/modules/settings/dto/settings.schemas.ts` `automationTriggerSchema` | **48** |
| frontend module map | `TRIGGER_META` across 5 `automation-trigger-data-*.ts` files | **33** |

**19 of the 48 triggers the write API accepts do not resolve to the module that owns them.**
15 are unmapped and fall to the `?? "hr"` default; **4 more are explicitly mapped to `hr`**
(`sla.breached`, `expense.submitted`, `reimbursement.approved`, `reimbursement.rejected`) — so
the map is not merely incomplete, it is in part wrong, and completing it will not be a purely
mechanical fill-in.

Stated conservatively, using only triggers whose owning module is not arguable
(`expense.*` / `reimbursement.*` are left out — they fire from `modules/expenses` and
`modules/payroll/hr-payroll/reimbursements.service.ts`, so `hr` may well be deliberate there):

- **`lead.status_changed`, `lead.assigned`, `lead.score_updated`, `deal.created`, `deal.won`, `deal.lost`** — CRM triggers resolving to `hr`.
- **`ticket.assigned`, `ticket.status_changed`, `ticket.escalated`** — Support triggers defaulting to `hr`.
- **`sla.breached`** — a Support trigger *explicitly* mapped `hr`.
- **`invoice.paid`** — a finance trigger defaulting to `hr`.

### Why this matters today, not only under Option 2

`features/shared/automations/module-automations-settings.tsx` renders
`/support/settings/automations` and `/accounting/settings/automations`, and it filters on that
map:

```
:224  const moduleRules = (automationsData?.data ?? []).filter(
:225    (r) => getModuleForTrigger(r.triggerEvent) === sectionModule,
:228  const triggerOptions = NON_CRM_TRIGGER_META.filter((t) => t.module === sectionModule);
```

So the routing defect is already user-visible:

| screen | its module's triggers | resolve to it | invisible on it |
|---|---:|---:|---:|
| `/support/settings/automations` | 7 | 3 | **4** |
| `/accounting/settings/automations` | 6 | 1 | **5** |

`sectionModule` is only ever `support` or `finance` for this component (`/hr/settings/automations`
uses HR's own `/hr/automations` surface and table; `/crm/settings/automations` uses
`crmAutomationRules`). A rule on `ticket.escalated` or `invoice.paid` therefore appears on **no
screen at all**, and the create picker will not offer those triggers either.

**Consequence for the box.** Option 2 gates rows on this map. Adopting it as written would gate
`ticket.escalated` on the HR rung and `deal.won` on the HR rung — trading a too-high global key
for a *wrong-module* key, which is worse than the defect R-12 is trying to fix. **R-12 now has a
prerequisite: fix and close the map first.** That prerequisite is mechanical and testable; the
rung choice after it is still a product decision.

### Not fixed here, and why

`components/automations/**`, `features/shared/automations/**` and — for the union widening that
a complete map needs — `hooks/api/automations.ts` are outside ticket 19's territory
(`ORCHESTRATION.md:31` scopes it to `backend/src/modules/{rbac,auth,organization,settings}/**`;
`frontend/hooks/` is ticket 28's). The map cannot be completed without widening
`AutomationTrigger` from 33 to 48, because `TriggerMeta.value` is typed by that union.

**Recommended shape for whoever takes it:** replace the `?? "hr"` default with a total
`Record<AutomationTrigger, TriggerModule>`, so the compiler — not a test — refuses an unmapped
trigger. That is the fail-closed property 19b asked for, obtained for free once the union is
the real 48.

---

## 3. The census's email-templates verdict was wrong, and is corrected

The census recorded both `/settings/email-templates/*` routes as `PENDING-MOVE` with
`why: "owner: modules/email …"`. That reads as a mechanical hand-off. **It is not one**, and a
next pass acting on it would go looking for a move that does not exist.

Measured:

- `TEMPLATE_MAP` is **65 templates across 12 categories** (Auth, Organization, HR Leave,
  HR Expense, Projects, CRM, Recruitment, Interviews, Payroll, Platform, Reports/Meals/Travel,
  Notifications), assembled from 12 registry files.
- `EmailRoutesService.getTemplatePreviews()` takes **no `orgId`** and renders static entries.
  Nothing on this surface is organisation configuration.
- **Neither route has any frontend caller.** CRM and HR each already have their own
  email-template surfaces on their own module keys (`crm:email-templates:manage` at
  `/crm/settings/email-templates`, `hr:email-templates:manage` at `/hr/email-templates`), so
  the global pair is a third, API-only door beside two module-owned ones.
- Exposure, re-measured: `settings:email-templates:manage` is carried by the shipped
  **`BRANCH_HR`** role template (`role-templates-crm-hr.constants.ts:221`, inside `BRANCH_HR`
  which spans 175–279 — pass 7's correction of "HR_ADMIN" holds). An org HR role can read the
  platform's whole email vocabulary, Auth and Payroll templates included. No tenant data
  crosses (static templates) and the unscoped-send hole is separately closed.

So `modules/email` is where the code lives, not a module that owns a surface. The pair has
**R-12's shape**, not custom-fields' shape: OWNERSHIP does not resolve it. It differs from R-12
in that its subject is not the organisation *at all*, so the answer is probably platform
administration rather than a module rung — which is the same class of product decision, and was
not invented here.

**Pinned so it cannot rot.** New assertion: *the email-template catalogue is cross-module, so
OWNERSHIP cannot resolve that pair* — if the registry ever collapses to one category the move
becomes mechanical and the test says so. Bite-proved in a `git archive HEAD` tree (never the
shared tree):

| plant | result |
|---|---|
| every `category:` rewritten to one value | **exit 1**, 1 failed / 9, `Expected: > 1` |
| 36 of 65 templates hidden from the count | **exit 1**, 1 failed / 9, `Expected: >= 60 / Received: 29` |
| restored | **exit 0**, 9 passed / 9 |

`jest settings-surface-census` → **exit 0, 9 tests** (was 8).
`pnpm -s check:spec-typecheck` → **exit 0**.

Commit **`05e9ec60`** (`streamlineos-backend`), 1 file.

---

## 4. Re-verified, not transcribed

- **Frontend placement still PASSes on placement.** Re-enumerated from disk: **23**
  `/settings/*` pages, every one org configuration or access governance (the two that look
  suspect by name are not: `/settings/incoming-transfer` is ownership transfer, gated
  `ownership:transfer:respond`; `/settings/webhooks` is org-wide, gated
  `settings:webhooks:manage`). No global page owns a module surface.
  **But the PASS was over-stated in one respect** and §2 above is the correction: the
  automations screens are in module trees, and cannot serve their own modules.
- **The census is accurate at head**: 26 routes, 4 controllers, exit 0.
- **The global automation engine is live and genuinely cross-module** — I checked before
  reasoning about it as legacy. `AutomationService.runAutomationsForEvent` is called from
  `leads`, `deals`, `expenses`, `support`, `hr/*`, `payroll` and the `workflows` engine
  (`AUTOMATION_ACTION_RUNNER`). It is **not** a duplicate of `crmAutomationRules` /
  `/hr/automations`, which are separate tables. 19b's premise survives.

## 5. NEW — the moves passes 3 and 4 recorded as done are NOT done, and cannot be finished by a URL edit

The orchestrator's instruction for this box is explicit: *"A move is only done when every inbound
link, nav entry and redirect is updated - grep for the old path across both repos."* I did, and
**three of the four moved surfaces still have every frontend caller on the sunset alias.** The
census marks 10 routes `SUNSET-ALIAS`, i.e. "moved"; by the box's own standard **6 of those 10 are
dual-homed, not moved**. `SETTINGS_ALIAS_SUNSET` is **`2027-03-31`** — that is the date these break.

| caller | still calls | canonical | safe URL swap? |
|---|---|---|---|
| `hooks/api/git-integration.ts:61,71,81,91` | `/settings/integrations/git[…]` | `/integrations/git/connections[…]` | **NO — shape** |
| `hooks/api/ai.ts:264` | `/settings/ai-usage` | `/ai/usage` | **yes** |
| `hooks/api/users/bulk-mutations.ts:65` | `POST /settings/users/:userId/role` | `PATCH /organization/members/:memberId` | **NO — identity + key** |
| `hooks/api/crm/custom-fields.ts` | *(already repointed)* | `/crm/settings/custom-fields` | done |

**Git connections — the alias is not a redirect, it is a shape adapter.** `settings-deprecated-routes.controller.ts:90-95`:

```ts
const page = await this.gitConnections.listConnections(u.orgId, {
  limit: GIT_CONNECTION_ALIAS_PAGE_SIZE,          // 100
});
return page.data;                                  // unwraps the page to a bare array
```

The canonical route returns the keyset page. The hook declares `apiClient.get<GitConnection[]>`,
and `apiClient.get<T>` is a **cast, not a validation** — so swapping the URL alone typechecks
clean in both repos and renders a broken list. This is AGENT-BRIEF rule 11's exact defect class,
and it is why I did not "just" repoint it. The migration has to adopt the cursor at the same time.
Side note measured on the way: an organisation with more than **100** git connections silently
sees 100 through the alias today.

**User role — not a swap at all.** `POST /settings/users/:userId/role` (`settings:rbac:manage`)
against `PATCH /organization/members/:memberId` (`settings:organization:manage`): different verb,
**different path identity** — the caller holds a `userId` and the canonical route wants a
`memberId` it would first have to resolve — and a **different permission key**, so the set of
principals who can perform it changes. That is a migration with a product consequence, not an
edit.

**AI usage is the one clean swap**: the alias delegates straight through
(`return this.aiUsage.getOrgUsage(u)`) on the same `ai:usage:view` key.

**Not fixed here** — `hooks/api/**` is ticket 28's territory (`ORCHESTRATION.md:33`), and two of
the three need the owning screen re-tested, not a string replaced. Doing only the easy one would
leave the finding half-actioned in a way that reads as done. **Owner: whoever holds
`frontend/hooks/`, before 2027-03-31.**

## 6. Cross-territory findings, not fixed

1. **`app/(authenticated)/accounting/settings/automations/page.tsx` has no permission gate** —
   only `await requireSession()`, where its sibling `/support/settings/automations` calls
   `enforceRouteAccess`. `/accounting/settings/automations` is absent from the route-access map,
   which is presumably why. Not a data leak — `useAutomations` is client-gated on
   `settings:automations:view`, so a member sees an empty screen — but the page gate is
   inconsistent. **Owner: ticket 16 (page-level gates).**
2. **The trigger→module map, §2 above.** **Owner: whoever holds `frontend/hooks/` (ticket 28)
   for the union, plus `components/automations/**`.**
3. **7 `sign.*` triggers are in the engine enum but not in the write schema.** `AUTOMATION_TRIGGERS`
   carries `sign.envelope.*` / `sign.recipient.completed` / `sign.bulk_send.completed`;
   `automationTriggerSchema` does not, so no rule for them can be created through the API.
   They *are* fired — `sign-integrations.service.ts:74,83,91` call `runAutomationsForEvent`
   with a template-literal event name and `as AutomationTrigger`, a forced cast that shared
   `CLAUDE.md` §6 bans and that is what hides the mismatch from the compiler. So e-sign fires
   into a rule table that cannot hold a matching rule. **Owner: `modules/e-sign` / `modules/automation`.**
   *(I initially concluded these triggers never fire; that was wrong and the non-literal call
   sites are the correction.)*

## 7. Honest gaps

- **Box 6 is not closed and I did not close it.** 9 routes remain at a global `/settings/*`
  path. R-12 (7 routes) is a product decision now carrying a measured prerequisite; the email
  pair (2 routes) is a platform-administration decision. Neither was invented here.
- `pnpm -s check:file-sizes` is **exit 1 at head** on 9 files (`cache.service.ts` 578,
  `chat-huddles.service.ts` 571, `check-declaration-column-drift.ts` 534, and 6 more). **None
  is mine** — the census spec is 401 lines. Pre-existing, reported not fixed.
- Backend `type-check`, `lint` and any e2e suite: **not run** this pass. Frontend `type-check`
  was run (exit 0); the backend change is a spec file and was covered by
  `check:spec-typecheck` (exit 0).
- No database was measured this pass; nothing here needed one.
