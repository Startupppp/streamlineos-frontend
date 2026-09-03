# 50 — Permission/route binding: generalising the git-connection defect

**Status:** DONE. Check built (`128a46a17`, `d203bf1d0`, `e999629f1`), findings
reported below before fixing (`fb937b608`), 23 hooks fixed and 4 documented as
deliberate (`2a3e3523a`). `pnpm check:permission-binding` exits 0 on head.
**Oracle:** the backend controllers (`@RequirePermission` read with the TypeScript AST),
NOT `contracts/openapi.json`. See §6.
**Date:** 2026-09-03.

---

## 1. What was wrong with the gate that existed

`scripts/check-route-access-contract.mjs` could not have caught the defect fixed in
`7166ce394`, for two independent reasons.

**Territory.** Its `SOURCE_DIRS` are `components/layout/sidebar` and
`lib/rbac/route-access`. It never opens `hooks/api/**`, where essentially every real
client gate lives. Measured: 1,707 `useGatedQuery`/`useAuthorizedMutation` call sites
and 654 `enabled`-bound raw reads are outside its walk.

**Semantics.** It asks whether a permission key EXISTS anywhere in the contract — a
ghost-key/spelling check. It never asks whether it is the key bound to the route the
hook calls. `settings:manage` is a perfectly real key, so `useGitConnections` passed
either way. That second gap is the important one: the check *looks* like it covers
permission correctness and cannot, by construction.

Both gates are kept. They answer different questions and the ghost-key job is real.

## 2. What the new check does

`frontend/scripts/check-permission-route-binding.mjs`
(`pnpm check:permission-binding`, `pnpm check:permission-binding:self-test`).

For every gated data hook it resolves the pair (permission key, HTTP method + path)
with the TypeScript AST and compares it against the `@RequirePermission` the backend
declares for that operation. Two binding classes, both structural:

| Class | Binding | Sites | Matched | Mismatched | Ambiguous |
|---|---|---|---|---|---|
| WRAPPER | `useGatedQuery(key, opts)` / `useAuthorizedMutation(key, opts)` — key is arg 0, calls live in arg 1 | 1,707 | 1,689 | 15 | 0 |
| ENABLED | raw `useQuery`/`useInfiniteQuery`/`useSuspenseQuery` whose `enabled` references a `useCan`/`usePermissionGate` local | 654 | 631 | 14 | 1 |

Backend index: 566 controllers, 3,635 routes, **0** handlers whose prefix, sub-path or
permission failed to resolve. Frontend: 438 files scanned.

Paths are normalised through the AST, never a regex:
`` `/build/${projectId}/tickets/${ticketId}/git-links` `` → `/build/*/tickets/*/git-links`,
matched against the Nest `:param` form and the OpenAPI `{param}` form reduced to the
same shape. A wildcard match is accepted only when every candidate route agrees on the
declared key, so a hook is never judged against an arbitrarily picked route.

**Anti-vacuity floors**, adopted from `check-route-access-contract.mjs`: zero backend
routes, zero wrapper sites, zero enabled sites or zero resolved bindings each FAIL
rather than report a clean tree.

## 3. Why every mismatch is a real divergence, not a style difference

`AccessService.scopeFor` (backend `src/modules/access/access.service.ts:467`) is an
exact map lookup — `resolvePrincipalScope` → `resolved.get(key) ?? "none"`. There is
**no implication hierarchy**: holding `hr:performance:manage` does not grant
`hr:performance:view`. So each mismatch strands two populations at once:

- a user holding the ROUTE key but not the HOOK key sends no request and sees an empty
  screen or a dead control, though the backend would have allowed it;
- a user holding the HOOK key but not the ROUTE key sees a live control whose request
  the backend 403s.

Which of those actually bites depends on who holds which key. Role membership below is
read from `src/modules/rbac/role-templates*.constants.ts` (13 system role templates).
"org owner only" means no system role template grants the key, so only the org owner
(who short-circuits to `all`) holds it out of the box.

## 4. Findings — 27 in release scope, 2 excluded

### 4.1 A whole feature is unusable for every non-owner (5 findings)

`hooks/api/hr/global.ts` — global contracts.

| Hook | Hook key | Route key | Holders (hook) | Holders (route) |
|---|---|---|---|---|
| `useContracts` :279 | `hr:employees:view` | `hr:contracts:view` | Branch HR, HR Administrator, Recruiter | org owner only |
| `useInternshipCertificate` :345 | `hr:employees:view` | `hr:contracts:view` | same | org owner only |
| `useCreateContract` :289 | `hr:compliance:manage` | `hr:contracts:manage` | Branch HR | org owner only |
| `useUpdateContract` :302 | `hr:compliance:manage` | `hr:contracts:manage` | Branch HR | org owner only |
| `useEndContract` :316 / `useConvertToEmployee` :330 | `hr:compliance:manage` | `hr:contracts:manage` | Branch HR | org owner only |

**Impact.** Branch HR, HR Administrator and Recruiter all see the Contracts screen with
its create button live. The list read 403s and renders as an empty state; every write
403s with a toast. Branch HR gets the full write UI and cannot use any of it. This is
the git-connection shape at feature scale.

**Direction.** The ROUTE is right — a contracts controller declaring `hr:contracts:*`
is correct module ownership. The HOOKS are wrong. Fixing them takes the screen away
from three roles, which is the honest outcome: they never had backend access.

**Cross-territory finding (not mine to fix).** `hr:contracts:view` and
`hr:contracts:manage` appear in **no** role template. After the hook fix, only the org
owner can use contracts at all. Either the keys belong in `HR_ADMINISTRATOR` /
`BRANCH_HR`, or contracts is deliberately owner-only. That is an RBAC product decision
for the backend/RBAC owner.

### 4.2 A live control that 403s for one role (1 finding)

`hooks/api/hr/leaves.ts:210` `useRevertLeave` gates `hr:leaves:manage`;
`PATCH /hr/leaves/:leaveId` (`leaves.controller.ts:224`, the approval controller)
declares `hr:leaves:approve`.

`hr:leaves:manage` → Branch HR, **HR Administrator**. `hr:leaves:approve` → Branch HR only.

**Impact.** HR Administrator sees an enabled "Revert to pending" control on every leave
row and every click 403s. Branch HR is unaffected. **Route is right; hook is wrong.**

### 4.3 Self-service writes blocked by an admin-only client gate (3 findings)

These three routes declare a `:view` key *deliberately* and narrow in service:

- `POST /hr/work-logs` (`work-logs.controller.ts:38`, `hr:attendance:view`) —
  `WorkLogsService.create` resolves the membership from `@CurrentUser().userId` and
  refuses any date but today. It can only ever write the caller's own log.
- `PATCH /hr/performance/reviews/:reviewId` (`performance.controller.ts:271`) and
  `PATCH /hr/performance/goals/:goalId` (`:103`), both `hr:performance:view`, both
  passing `await this.canManagePerformance(u)` into the service so a `:view` holder
  edits only their own record and a `:manage` holder edits anyone's.

The hooks gate all three on `:manage`.

**Impact.** With the default templates both `hr:attendance:view`/`:manage` and
`hr:performance:view`/`:manage` are held by the same two roles (Branch HR, HR
Administrator), so **no system role is affected today**. The defect bites a custom role
granted the `:view` half — exactly the "let employees update their own goal" role the
in-service narrowing was built for, which the client then blocks. **Routes are right;
hooks are wrong.**

### 4.4 Reads gated on the manage key of their own module (4 findings)

| Site | Hook key | Route key | Effect |
|---|---|---|---|
| `hooks/api/accounting/core-periods.ts:92` `usePeriodChecklist` | `accounting:periods:manage` | `accounting:periods:read` | both owner-only today |
| `hooks/api/accounting/expenses.ts:192` `useExpensePolicies` | `accounting:reimbursements:manage` | `accounting:reimbursements:read` | both owner-only today |
| `hooks/api/accounting/fin-settings.ts:88` `useSystemAccounts` | `accounting:settings:manage` | `accounting:settings:read` | both owner-only today |
| `hooks/api/payroll/policies.ts:96` `usePreviewPolicy` | `payroll:policies:manage` | `payroll:policies:view` | Branch HR + HR Admin hold both |

**Impact.** No default role is affected; a read-only custom role gets an empty panel.
**Routes are right** (a read declaring a read key, a preview declaring a view key);
hooks are wrong.

### 4.5 Reads gated on a neighbouring module key (5 findings)

| Site | Hook key | Route key |
|---|---|---|
| `hooks/api/accounting/core-periods.ts:142` `useOpeningBalance` | `accounting:accounts:read` | `accounting:journal:read` |
| `hooks/api/accounting/overview.ts:56` `useAccountingOverview` | `accounting:read` | `accounting:reports:read` |
| `hooks/api/build/advanced.ts:31` `useEpics` | `build:view` | `build:tickets:view` |
| `hooks/api/payments.ts:212` `useWebhookEvents` | `payments:providers:view` | `payments:webhooks:view` |
| `hooks/api/payments.ts:272` `usePaymentAudit` | `payments:providers:view` | `payments:audit:view` |

Accounting pairs are both Accountant; build pairs are the same four roles; payments
keys are all owner-only. **No default role is affected**; each bites a custom role
holding one key and not the other. Hooks are wrong in all five.

### 4.6 Writes gated on a sibling key (2 findings)

- `hooks/api/payroll/runs.ts:58` `useCreateRun` gates `payroll:runs:manage`;
  `POST /payroll/runs` declares `payroll:runs:create`, which is the ONLY route that key
  guards. A custom "payroll operator" role granted `:create` alone sees a dead button.
- `hooks/api/payroll/settings.ts:16` `useUpdateFxRates` gates `payroll:settings:manage`;
  it PATCHes `/payroll/policies/:id`, which declares `payroll:policies:manage`. FX rates
  live on the policy, so the route key is right.

Both default-role sets are identical (Branch HR, HR Administrator). Hooks are wrong.

### 4.7 Surveys live sessions (2 findings)

`hooks/api/surveys/live-session.ts:59` `useLiveSession` gates
**`surveys:automations:manage`** — an unrelated key, and the clearest copy-paste error
in the set — and `:67` `useLiveSessionResults` gates `surveys:responses:view`. Both
routes declare `surveys:live:host`. All three keys are owner-only today, so no default
role is affected. Hooks are wrong.

### 4.8 Accounting reads an HR-owned route (2 findings) — NOT fixed, product decision

`hooks/api/accounting/expenses.ts:65` `useTeamExpenses` (`accounting:reimbursements:read`)
and `:175` `usePendingForBatch` (`accounting:reimbursements:manage`) both read
`GET /hr/expenses/page-data`, which declares `hr:expenses:view`
(Branch HR, Recruiter, Sales Representative).

Changing the hooks to `hr:expenses:view` would put the accounting reimbursement screen
in front of Sales Representatives; leaving them stricter keeps a custom
`accounting:reimbursements:*` role staring at an empty list. Neither is a client fix.
The correct fix is an accounting-owned endpoint, which is the accounting rewrite's
territory (`feat/accounting-module`). **Recorded as a documented deliberate divergence
in `DELIBERATE`, with both keys and the reason — not silently tolerated.**

### 4.9 Deliberately stricter than the route (2 findings) — NOT fixed

`hooks/api/payroll/reports.ts:150` `useExportPayrollReport` and `:166`
`useExportJournal` gate `payroll:reports:export`. Both hit
`GET /payroll/reports/<type>?format=csv`, which declares `payroll:reports:view`.

`payroll:reports:export` is a real key guarding five other export routes
(`/payroll/tax/export`, the four `/payroll/runs/export/jobs*`), but the CSV variants of
the eleven `/payroll/reports/*` routes are served by the same handler as the on-screen
report and require only `:view`.

**This is a backend under-declaration, and it is the more serious side.** A holder of
`payroll:reports:view` can fetch the CSV directly with `?format=csv`; the export key is
enforced only by the client, which is not enforcement. Recorded as `DELIBERATE` on the
client (loosening the hook to `:view` would remove the only check that exists) and
raised as a **cross-territory backend finding**: `GET /payroll/reports/*` should
require `payroll:reports:export` when `format` is set, or the export key should be
retired as decorative.

### 4.10 Out of release scope (2 findings, listed not failed)

- `hooks/api/crm/custom-fields.ts:46` `useCustomFields` gates
  `settings:custom-fields:manage`; `GET /settings/custom-fields` (a sunset-marked alias)
  declares `settings:custom-fields:view`. CRM.
- `hooks/api/inventory/valuation.ts:105` `useCostingProducts` gates
  `inventory:valuation:read`; `GET /inventory/products/variants` declares
  `inventory:products:read`. Inventory.

## 5. Adjacent finding the binding check surfaced but cannot fail on

48 reads call a **permissioned** route with an `enabled` that consults no permission at
all (`--list` prints every one). `check-gated-reads.mjs` reports `permissionedUngated: 0`
because its `SCAN_DIRS` is `["hooks/api"]` and its gate test is "the enclosing hook
mentions `useCan`/`useModuleEnabled`/`useScope` anywhere" — a module toggle or an
unrelated `useCan` in the same block counts as gated there, and `features/**` is not
scanned at all. The two numbers measure different sets; do not add or subtract them.

Two worth naming:

- **`hooks/api/ai.ts:263` `useAiUsage`** — `enabled: Boolean(access?.isOrgOwner)`, while
  `GET /settings/ai-usage` declares `ai:usage:view`. This is the git-connection defect
  in a different disguise: a role granted `ai:usage:view` sees a permanently empty AI
  usage panel because the client gates on ownership instead of the permission.
- **`features/hr/asset-returns/asset-returns-page.tsx:86`** and
  **`features/hr/recruitment/headcount/headcount-page.tsx:320`** — page-level `useQuery`
  with no `enabled` at all, on `hr:assets:view` / `hr:employees:view` routes. Their
  `useCan("hr:employees:manage")` is used for rendering only and gates nothing.
  (An earlier, lexical version of this check reported these as three key mismatches.
  They are not; they are ungated reads. The check now refuses that inference — see the
  `WHY "ENABLED" AND NOT "ANY useCan"` block in the script header.)

Neither is a binding mismatch, so this gate does not fail on them. Recorded for the
`features/**` ungated-read owner.

## 6. Contract staleness — which findings depend on it

`contracts/openapi.json` disagrees with the controllers on **18 operations**, is missing
**23** routes the controllers define, and still carries **9** routes that no longer
exist. **Four of the 18 are the git-connection routes**: the contract says
`settings:manage` where the controllers say `integrations:git:view` /
`integrations:git:manage`. A contract-oracle check would therefore have reported the
already-FIXED `useGitConnections` as broken and the three already-correct mutations
beside it as broken too.

**None of the 27 findings above depend on the stale contract.** Every one was resolved
against the controller source and each is cited with its backend `file:line`. The
contract is used only as a second opinion and its disagreements print as staleness.

Full disagreement list is in the `--list` output; the ones that touch this ticket are
`GET|POST|PATCH|DELETE /settings/integrations/git*` (4), `GET /settings/ai-usage`,
`GET /settings/custom-fields`, and the three `/settings/api-keys` operations.

## 7. Sunset-marked `/settings/**` aliases still in use — SEPARATE WORK, NOT DONE HERE

Ten deprecated aliases exist (`settings-deprecated-routes.controller.ts`, all carrying
`@Deprecated({ sunset: SETTINGS_ALIAS_SUNSET })`). Four frontend files still call them.
**No route URL was migrated as part of this ticket**, deliberately: `apiClient.get<T>`
is a cast, not a validation, so a URL swap that ignores a shape change renders an empty
screen with both repos typechecking clean.

| Frontend call site | Alias | Canonical | Shape / contract difference |
|---|---|---|---|
| `hooks/api/git-integration.ts:61` | `GET /settings/integrations/git` | `GET /integrations/git/connections` | **Alias returns `page.data`, a bare array, truncated at `GIT_CONNECTION_ALIAS_PAGE_SIZE = 100`. Canonical returns the paginated envelope.** Swapping the URL under `apiClient.get<GitConnection[]>` renders an empty list. |
| `hooks/api/git-integration.ts:71,81,91` | `POST/PATCH/DELETE /settings/integrations/git[/:id]` | `.../integrations/git/connections[/:id]` | Same service, same body, same keys. Path only — but they must move together with the read or the list stops refreshing the right key. |
| `hooks/api/ai.ts:265` | `GET /settings/ai-usage` | `GET /ai/usage` | Identical: both call `AiUsageService.getOrgUsage(u)`, both `ai:usage:view`. **Safe path-only swap.** |
| `hooks/api/users/bulk-mutations.ts:65` | `POST /settings/users/:userId/role` | `PATCH /organization/members/:memberId` | **Three differences: verb POST→PATCH; path param is a `userId` on the alias and a `memberId` on the canonical route (different identifier, not a rename); permission `settings:rbac:manage` → `settings:organization:manage`.** The alias also returns `{ success, userId, role }`, the canonical returns whatever `updateMemberRole` returns. Needs an id lookup, not a URL edit. |
| `hooks/api/crm/custom-fields.ts:50,62,74,86` | `GET/POST/PATCH/DELETE /settings/custom-fields[/:id]` | `/crm/settings/custom-fields[/:id]` | Same service and same body, but the canonical routes carry `crm:custom-fields:*` and `@RequireModule("crm")` while the aliases carry `settings:custom-fields:*`. The controller comment says this is deliberate: re-gating today would take the screen from ORG_ADMIN/OWNER. CRM — out of release scope anyway. |

Recommended order for whoever picks this up: `ai.ts` first (free), then git (needs the
envelope handled in `useGitConnections` and its three mutations moved together), then
`users/bulk-mutations.ts` (needs the member id), then CRM when CRM re-enters scope.

## 8. Outcome and bite-proof

### 8.1 What was done

23 hooks changed to the key their route declares (commit `2a3e3523a`); 4 recorded
as `DELIBERATE` with both keys and a >=60-character justification each — §4.8 and
§4.9. `pnpm check:permission-binding` now exits 0 with **2,349 bindings checked**.

Three stale entries in `hooks/api/hr/hr-gating-extensions.test.ts` (a source-text
table asserting each hook's key) and four stale test NAMES in
`hooks/api/__tests__/billing-hook-gates.test.tsx` were corrected in the same
commit. The jest run went from **exit 1 / 3 failures** to **exit 0 / 150 tests**.

### 8.2 Bite-proof — hermetic, never in the shared working tree

`git archive HEAD | tar -x` into a scratch directory, with `node_modules` and the
sibling backend symlinked in. 6,045 files. The shared tree was never touched;
`git status` after the run showed only the 17 intended modifications.

| Planted defect | Exit | What the gate said |
|---|---|---|
| baseline, nothing planted | **0** | 2,349 bindings checked |
| (a) `useGatedQuery("integrations:git:view"` → `"settings:manage"` — the ORIGINAL defect | **1** | 1 finding: `hooks/api/git-integration.ts:59 useGitConnections` hook `settings:manage` / route `integrations:git:view`, `GET /settings/integrations/git` [DEPRECATED ALIAS], backend `settings-deprecated-routes.controller.ts:87` |
| (a) restored | **0** | clean |
| (b) `useAuthorizedMutation` key swapped in `useRevertLeave` | **1** | 1 finding: `hooks/api/hr/leaves.ts:210`, route `hr:leaves:approve`, backend `leaves.controller.ts:224` |
| (b) restored | **0** | clean |
| (c) `enabled`-bound `useCan` key swapped in `useEpics` | **1** | 1 finding: `hooks/api/build/advanced.ts:31`, route `build:tickets:view`, backend `iterations.controller.ts:228` |
| (c) restored | **0** | clean |
| (d) `STREAMLINE_BACKEND_ROOT` pointed at an empty backend | **1** | `only 0 backend routes indexed (floor 3000)` + `only 0 bindings resolved to a route (floor 1500)` — refused to report a clean tree |
| (e) a `DELIBERATE` entry matching no finding | **1** | `1 stale DELIBERATE entry(entries) — they match no current finding; delete them` |
| (f) a `DELIBERATE` reason shortened to `"deliberate"` | **1** | `1 malformed DELIBERATE entry(entries) — an exception must justify itself and name both keys` |
| (g) everything restored | **0** | 2,349 bindings checked |

Case (a) is the point: the gate reproduces the exact defect `7166ce394` fixed,
names the hook, both keys, the route and the backend decorator's file and line,
and reports **exactly one** finding — no noise to hide it in.

### 8.3 Gates run

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | 0 | 0 errors |
| `node scripts/check-permission-route-binding.mjs` | 0 | 2,349 bindings |
| `node scripts/check-permission-route-binding.mjs --self-test` | 0 | 31 cases |
| `node scripts/check-route-access-contract.mjs` | 0 | 203 keys / 627 contract keys |
| `node scripts/check-route-access-contract.mjs --self-test` | 0 | — |
| `node scripts/check-gated-reads.mjs` | 0 | permissionedUngated at baseline 0 |
| `pnpm exec eslint <17 changed files>` | 0 | 0 errors, 11 pre-existing warnings |
| `jest --runInBand --testPathPattern="(billing-hook-gates\|hr-gating-extensions\|global-cursor-pagination)"` | 0 | 3 suites, 150 tests (was exit 1 / 3 failures before the table fix) |

## 9. What this method would MISS

Stated so the coverage number is falsifiable:

- a gate expressed as data — a permission read out of a config object, a registry or a
  route table — rather than as a literal at the call site;
- a permission passed into a hook as a parameter by its caller;
- a route reached through a helper more than two call hops away, or through an imported
  (not module-local) request factory;
- a raw `useMutation` guarded by an `if (!can) return` inside its `mutationFn`;
- whether any screen RENDERS a denied state — a different property, measured by
  `check-gated-reads`' `reportGateConsumption`;
- a route whose real authorization is narrowed IN SERVICE below its declared key: §4.3
  shows three of those, and the check can only compare against the DECLARED key, so it
  cannot tell a deliberate in-service narrowing from an under-declaration without a
  human reading the handler;
- 5 bindings whose route did not resolve against the controllers at all (all
  `hooks/api/inventory/quality.ts` and `hooks/api/users/queries.ts` `/v2/users`), and
  3 wrapper sites with no resolvable path. These are NOT known to be safe.
