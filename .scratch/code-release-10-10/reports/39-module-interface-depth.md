# 39 — Module interface depth and Home composition boundary

**Status:** 8 of 8 boxes closed.
**Default verdict applied:** KEEP. Every REFACTOR/REMOVE below names the failure it prevents;
where no failure could be named the finding is recorded as KEEP with its evidence, not actioned.

---

## What changed

| Repo | Change | Kind |
|---|---|---|
| backend | 51 `exports:` tokens removed from 36 `*.module.ts` | interface reduction |
| backend | `src/modules/build/core/webhook-url-guard.ts` deleted | pass-through |
| backend | `src/modules/build/execution/iterations.service.ts` deleted | re-export shell |
| backend | `src/modules/hr/settings-hub/hr-settings-hub.constants.ts` deleted | duplicated constant |
| frontend | `types/crm.ts`, `types/hr.ts`, `types/projects.ts` deleted | directory-shadowing shells |
| frontend | 6 duplicate notification-channel catalogs collapsed to 1 | duplicated constant |
| frontend | `scripts/generate-home-manifest.mjs` backend path fixed | box-6 tooling defect |
| frontend | `features/dashboard/use-dashboard-access.ts` derives from the generated manifest | box-6 parallel registry |
| frontend | `lib/home/__tests__/home-sections.test.ts` — 3 new fail-closed assertions | box-6 gate |

### Before / after

| Metric | Before | After |
|---|---:|---:|
| Backend `*.module.ts` exported tokens | 363 | 312 |
| Backend exported tokens with no consumer outside their module (in scope) | 53 | 0 |
| Backend exported tokens with no consumer outside their module (out of territory) | 12 | 12 |
| Pass-through / shell files removed (backend) | — | 3 |
| Pass-through / shell files removed (frontend) | — | 3 |
| Duplicate notification-channel catalogs | 6 | 1 |
| Duplicate `HR_POLICY_TYPES` definitions | 2 | 1 |
| Frontend `index.ts` barrels | 65 | 65 (KEEP — see box 2) |
| Backend `index.ts` barrels | 36 | 36 (KEEP — see box 2) |
| Cross-feature *deep* imports, feature→feature, non-test | 36 | 36 (KEEP — see box 3) |

---

## Box 1 — pass-through wrappers deleted, depth retained

The deletion test applied was the ticket's: *if removing the layer changes nothing but the
import path, it is a pass-through.*

**REMOVED (6 files).**

1. `src/modules/build/core/webhook-url-guard.ts` — one line,
   `export { checkWebhookUrl } from "../../../common/security/ssrf-guard";`.
   Its **only** consumer was its own `webhook-url-guard.spec.ts`; zero production callers. Every
   real caller (chat, crm, hr, inventory, automation, webhooks, e-sign, outbound-request) already
   imports `common/security/ssrf-guard` directly. The spec was repointed at the real module, so no
   SSRF coverage was lost. This is the `boundDrain()` shape: a layer whose only reason to exist was
   a test import path.
2. `src/modules/build/execution/iterations.service.ts` — four `export {} from` lines left behind by
   an earlier file split; one consumer (`iterations.controller.ts`), now importing the four real
   service files. PRD §2.2 names "re-export shells" from splits explicitly.
3. `src/modules/hr/settings-hub/hr-settings-hub.constants.ts` — see box 7.
4-6. `frontend/types/crm.ts`, `types/hr.ts`, `types/projects.ts` — each is
   `export * from "./<name>/index";` beside a real `<name>/index.ts`. Under
   `moduleResolution: "bundler"` the `.ts` file *shadows* the directory barrel, so the shell exists
   only to add one resolution hop. Deleting it changes **nothing at all — not even the import
   path**: `@/types/hr` now resolves straight to `types/hr/index.ts`. 284 importing files
   (55 + 76 + 153) were left untouched and the frontend typecheck confirms every one still resolves.

**KEEP — layers that look like pass-throughs and are not.**

- `src/modules/gdpr/gdpr-export-worker.service.ts` — a re-export shell that renames
  `GdprExportWorkerImplementation as GdprExportWorkerService`. `src/common/slo/slo-queues.ts` pins
  this **file path as a string** (`sourceFile: "src/modules/gdpr/gdpr-export-worker.service.ts"`)
  and `slo-catalogue.spec.ts` asserts `existsSync` on it. Deleting it on import evidence alone
  would have broken the SLO queue catalogue silently at the string, not at the compiler. It also
  supplies the stable DI name — an adaptation, not a pass-through.
- `frontend/features/hr/shared/hr-ui.tsx` lines 5-12 — aliases six `Rich*` surfaces to `Hr*`.
  A genuine alias shell, ~23 usages across `features/hr`. Removing it changes only import paths and
  local names; nothing breaks at any scale. **KEEP** — under this ticket's rule that is a
  naming-taste rewrite, not a depth defect.
- `frontend/hooks/api/build.ts`, `frontend/hooks/api/hr.ts` — the same directory-shadowing shells as
  the three `types/*.ts` above, and equally safe to delete. **Not touched: `hooks/api/` is ticket
  28's territory.** One-line deletions, no import changes needed. Routed to 28.
- `frontend/components/expenses/expense-export-dialog.tsx`,
  `frontend/features/build/settings/project-members-section.tsx`,
  `frontend/features/hr/work-logs/work-log-filters.tsx`,
  `frontend/hooks/api/build/tickets.ts`,
  `frontend/hooks/api/inventory/{sales-orders,stock}.ts` — split shells whose deletion *does* change
  the import path for their consumers. Out of territory (30 / build sibling / 28) or out of PRD
  scope. Reported, not touched.
- `src/db/schema/hrms-phase1-sql-managed.ts` — untouched by design; being unimported is the design.

## Box 2 — public interfaces and barrel surfaces reduced to verified consumers

**Backend — DONE, and this is the bulk of the ticket.** A NestJS module's `exports:` array *is* its
public interface. 216 modules declared 363 exported tokens; 65 of them had no reference anywhere
outside their own Nest module.

Failure this prevents, named: an exported-but-uninjected provider is a public API with no consumer.
It is what the *next* module reaches for instead of the module's authorised seam — `HrPeopleService`
exported from `hr-core` invites any module to read person rows directly rather than through the
scoped read services, and every such reach widens the module graph until a cycle appears and gets
papered over with `forwardRef`, which CLAUDE.md §9 bans in new code.

51 tokens were removed across 36 module files; 9 modules' `exports:` arrays became empty and the key
was dropped. **The gate bit twice during the work**: the first pass removed `AdmissionService` and
`AiCreditsPacksService`, and `check:module-di` Check A reported three undeclared constructor tokens
(`AdmissionGuard`, `AdmissionInterceptor`, `BillingMarketplaceController`) — consumers a
directory-based scan classified as "inside the module" because they are registered in a *different*
Nest module that happens to share a folder. Both were restored. Remaining in-scope unneeded
exports: **0**.

**Frontend barrels — KEEP, with evidence.** 65 `index.ts` barrels export 322 explicit names; 56 of
those names have no consumer that imports them *through the barrel* (every caller deep-imports the
implementation file — `AiUsageChip`, `RichPanel`, `IllustrationImage`, …). That is a real surface
reduction opportunity, **but** `scripts/check-dead-code.mjs` already classifies the five affected
barrels as `CONTRACT_BARRELS` and reports each entry as `RETAINED-BY-CONTRACT — named intentional
barrel` (28 entries). That is a recorded prior decision, not an oversight, and the PRD's closure
protocol forbids reopening a decision for a preferred pattern. Recorded here as a measured number
for whoever owns that contract next; not actioned.

One genuinely dead barrel entry found: `components/shared/index.ts:RichHero` has no consumer under
its own name — it is reached only through the `hr-ui.tsx` alias. Left in place with the alias
(box 1).

## Box 3 — deep imports across module ownership — KEEP

Measured: 1,183 cross-feature imports, 847 of which reach past a feature's top level. 811 of those
are `app/**` route files importing their own feature's page component — the repo's Next.js
convention and ticket 25's territory, not a module-ownership violation. That leaves **36
feature → feature deep imports**:

| Edge | Count | Verdict |
|---|---:|---|
| employee-self-service → hr | 10 | KEEP |
| chat → build/shared | 7 | KEEP |
| accounting → payments/components | 4 | KEEP |
| dashboard (Home) → hr | 4 | KEEP |
| hr/payroll/crm → shared | 5 | KEEP |
| party → crm, payroll → hr, support → wiki, wiki → build, build → command-palette | 6 | KEEP |

The edge worth a real investigation was **employee-self-service → hr** (and Home → hr), because ESS
is platform core under CLAUDE.md §8 and must work with the HR module disabled — an HR-module
component behind a universal page would 403 for a Build-only org. It does not: the HR components ESS
and Home import (`check-in-button`, `daily-history-table`, `attendance-regularization-dialog`,
`create-expense-dialog`, `upload-doc-sheet`) call hooks that already resolve to `/me/*` self routes,
and `hooks/api/hr/hr-core-query-access-matrix.test.ts` pins each hook to its endpoint, its
permission and whether it carries a module gate — `useHrAttendanceHistory → /me/attendance/history →
self:attendance → moduleGated: false`. The seam exists and is tested; only the *import path* is
deep. Adding barrels to hide it would create the re-export shells PRD §2.2 forbids without changing
any behaviour, so: KEEP.

## Box 4 — Home only composes

**Backend.** `DashboardModule` imports exactly one other feature module (`NotificationsModule`) and
calls exactly one method through it: `notificationsService.unreadCount(orgId, userId)` in
`dashboard-personal.service.ts`. Home does not touch a notification table. Chat, Calendar and Mail
are not imported at all — Home reaches them only through navigation.

**Frontend.** `features/dashboard` imports nothing from `features/chat`, `features/calendar` or
`features/inbox`. Its only Notifications import is `format-relative-time` (a date formatter, see
box 8). Each of the four keeps its own module, schema, hooks, cache keys and workers.

Verdict: **KEEP** — the boundary is already correct.

## Box 5 — Home holds universal work only

`components/layout/sidebar/sidebar-home-nav.ts` — four groups: Overview (`/dashboard`),
Communication (`/inbox`, `/mail`, `/calendar`, `/chat`, `/notifications`), For Me (`/me/*` ×7),
Company (announcements, `/directory`, `/directory/workers`). Every entry is on CLAUDE.md §8's
universal list. No recruitment, interview, payroll-run, policy or accounting destination appears.
`nav-surface-parity.test.ts` already proves sidebar, product switcher and command palette apply the
same permission predicate. Verdict: **KEEP**.

One note routed elsewhere: the universal *Announcements* entry points at `/hr/announcements` — a
universal surface served from a module-namespaced route, with no permission and no module gate on
the nav entry. That is a route-ownership question (§8, ticket 26's `app/**`), not a Home-composition
one; the composition is correct either way.

## Box 6 — backend owns the manifest, frontend consumes a generated contract

Three defects found and fixed.

**(a) The generator could not run.** `pnpm generate:home-manifest` crashed with `ENOENT` on
`<frontend-repo>/backend/src/modules/dashboard/dashboard.controller.ts` — a path that does not exist
on a sibling checkout. `check-home-manifest.mjs` had already been converted to the marker-based
`BACKEND_ROOT` helper; the generator had not. The failure scenario is exact and severe: when a
backend controller changes, `check:home-manifest` fails and prints *"Regenerate: node
frontend/scripts/generate-home-manifest.mjs"* — and that command crashes, so the only remaining way
to update the contract is to hand-edit the "generated" JSON, which is precisely the hand-maintained
parallel registry this box forbids. Fixed to use `BACKEND_ROOT` / `backendAvailable` with an
explicit fail-closed message when the backend is unreachable.
**Proof:** `pnpm generate:home-manifest` → `✔ Written 17 sections`, and
`git diff --stat lib/home/home-manifest.generated.json` is empty — the generator reproduces the
checked-in contract byte-for-byte. `check:home-manifest` then re-passes against the backend
controller.

**(b) A hand-maintained parallel access registry.**
`features/dashboard/use-dashboard-access.ts` re-declared, as string literals, six of the exact
permission keys the generated manifest already carries for those sections
(`hr:leaves:view`, `hr:leaves:approve`, `hr:attendance:view`, `hr:analytics:read`,
`build:tickets:view`, `crm:leads:view`). Drift scenario: change `@RequirePermission` on
`/dashboard/pending-approvals`, regenerate, `check:home-manifest` goes green — and Home keeps gating
the widget on the *old* key, so it renders a section whose query 403s, or hides one the user can
read. The six now resolve through `homeSectionPermission(<section id>)`. The 12 remaining `can(...)`
literals in that hook are widget *action* gates with no manifest section behind them and are
unchanged.

**(c) No gate held (b) closed.** Three fail-closed assertions added to
`lib/home/__tests__/home-sections.test.ts`:
a vacuity floor (≥6 section permissions must exist), "the Home access hook keeps no hand-written
copy of a section permission", and "every `useCan` key in `hooks/api/dashboard.ts` is a permission
the manifest declares". **Bite-proven**: reverting one flag to `can("hr:leaves:view")` fails the
suite (1 failed, 14 passed); restored, 15 passed.

`hooks/api/dashboard.ts` still writes its `useCan("…")` keys as literals rather than reading
`homeSectionPermission`. That file is ticket 28's territory, so it was pinned by assertion (c)
rather than edited — drift is now a test failure, not a silent divergence.

## Box 7 — duplicated constants, canonical catalogs

Only two duplications met the bar (≥2 real callers sharing one invariant, a domain that owns it).

**Backend — `HR_POLICY_TYPES`, 15 policy-type strings, defined twice, byte-identical.**
Callers: `hr-policies.controller.ts` (as `z.enum(HR_POLICY_TYPES)` — the write contract) and
`hr-settings-hub.service.ts` (enumerating the settings hub). Failure: add a policy type to the Zod
enum and the settings hub silently omits it; remove one and the hub advertises a type every write
rejects with a 400. Fixed; the duplicate file was deleted, not re-exported.

**Frontend — the notification channel catalog, defined SIX times, byte-identical.**
`admin/notification-policy-state.ts` (`NOTIFICATION_POLICY_CHANNELS`),
`components/event-config.ts` (`CHANNELS`), and private `CHANNELS` copies in `provider-editor.tsx`,
`provider-row.tsx`, `template-preview.tsx`, `template-editor.tsx` — two of which were already dead,
and `event-row.tsx` imported `CHANNELS` without using it. Failure: the backend gains or drops a
delivery channel and five admin surfaces disagree — the template editor offers a channel the
provider sheet cannot label and the policy screen cannot enable. Collapsed to one domain-owned
catalog, `features/notifications/notification-channels.ts`, keyed by
`Record<NotificationChannel, string>` so a new member of the union is a **compile error** rather
than a silent omission.

**KEEP — duplications deliberately not merged:**
- `PRIORITY_STYLES` (`hr/recruitment/requisitions`) vs `PRIORITY_COLORS` (`support/portal`) —
  identical Tailwind class maps for *unrelated* domains (requisition urgency vs ticket priority).
  Hoisting them would create exactly the generic dumping ground box 7 forbids.
- `TOOLTIP_STYLE` (build) vs `CHART_TOOLTIP_STYLE` (crm) — CRM is out of PRD scope.
- `preferences-page.tsx:CHANNELS` — same word, different invariant (per-channel rows carrying
  descriptions and icons). Not merged.
- CRM-internal duplicates (`PERIOD_OPTIONS`, `STATUS_PIPELINE`/`LEAD_STATUSES`) — out of scope.

## Box 8 — which implementation is canonical

Named, explicitly:

| Invariant | Canonical | Retired |
|---|---|---|
| HR policy-type vocabulary | `src/modules/hr/policies/dto/hr-policy.schemas.ts:HR_POLICY_TYPES` — it is the Zod enum that validates writes; everything else is a reader | `hr-settings-hub.constants.ts` (deleted) |
| Notification channel catalog | `features/notifications/notification-channels.ts:NOTIFICATION_CHANNELS` — feature-root, exhaustive over `NotificationChannel` | 6 copies (5 deleted, 1 exported name retired) |
| SSRF webhook URL check | `src/common/security/ssrf-guard.ts:checkWebhookUrl` | `build/core/webhook-url-guard.ts` (deleted) |
| `features/build/execution` iteration services | the four real service files | `iterations.service.ts` (deleted) |
| `@/types/{hr,crm,projects}`, `@/hooks/api/{hr,build}` | the directory `index.ts` barrel | the shadowing `.ts` file (3 deleted; 2 routed to ticket 28) |
| Home section access metadata | `lib/home/home-manifest.generated.json`, generated from `backend/src/modules/dashboard/dashboard.controller.ts` | the literal keys in `use-dashboard-access.ts` |

**Relative-time formatting — canonical named, NOT actioned.** Three implementations exist:
`lib/date-utils.ts:formatRelativeTime` (Intl.RelativeTimeFormat, `now` injectable, NaN-safe — 2 CRM
callers), `features/notifications/format-relative-time.ts` (hand-rolled, en-US, unfrozen clock — 5
callers across notifications, inbox and **Home**), and a private copy inside
`features/module-access/components/audit-log-drawer.tsx` with a different day boundary. Canonical is
`lib/date-utils.ts` — it is the only one that is locale-correct, testable against a frozen clock and
domain-neutral, and Home/Inbox importing a *Notifications*-owned formatter is the ownership problem
box 3 describes. Unifying changes user-visible strings ("5m ago" → "5 minutes ago") on three
surfaces, which is a UX decision belonging to ticket 30 and `lib/` belonging to ticket 28. Decision
recorded; change routed, not made.

---

## Commands run

Backend (`streamlineos-backend`):

| Command | Exit | Result |
|---|---:|---|
| `pnpm check:module-di` | 0 | clean — 216 modules · 1703 classes · **0 violations** (bit 3 findings mid-work, then clean) |
| `pnpm check:module-di:self-test` | 0 | 23 assertions passed |
| `pnpm check:module-registration` | 0 | 216 declared, 215 reachable, 0 unreachable |
| `pnpm check:module-registration:self-test` | 0 | 13 passed |
| `pnpm check:import-direction` | 0 | 218 files under `src/common`, 0 violations, 0 baseline entries |
| `pnpm check:import-direction:self-test` | 0 | 11 passed |
| `pnpm check:kebab-case` | 1 | 6256 entries, **1 violation — not mine** (`src/scripts/.tmp-dcc-lib.mjs`, untracked, ticket 21) |
| `pnpm check:kebab-case:self-test` | 0 | 15 passed |
| `pnpm check:cycles` | 0 | 5476 files, **no circular dependency** |
| `$HEAVY 2 -- pnpm typecheck` | 2 | **1 error, not mine** — `src/modules/finance/ap/payment-run-executor.service.ts(157,17)` |
| `jest --runInBand --testPathPattern="webhook-url-guard\|settings-hub\|iterations\|gdpr\|party\|module-registration"` | 1 | 38 passed / 1 failed — **the failure is not mine** (see below) |

Frontend (`streamlineos-frontend/frontend`):

| Command | Exit | Result |
|---|---:|---|
| `pnpm generate:home-manifest` | 0 | 17 sections; artifact byte-identical to the checked-in file |
| `pnpm check:home-manifest` | 0 | 16 controller routes + 1 external, 17 manifest sections, consistent |
| `pnpm check:home-manifest:self-test` | 0 | 14 passed, 0 failed |
| `pnpm check:module-manifest` | 0 | consistent |
| `pnpm check:module-manifest:self-test` | 0 | 14 passed, 0 failed |
| `pnpm check:dead-code` | 1 | DEAD **0 files / 0 exports**; 9 unclassified — **none mine** (see below) |
| `pnpm check:dead-code:self-test` | 0 | all fixtures classified correctly |
| `pnpm check:routes` | 1 | **1 violation, pre-existing and not mine** — `app/api/media/image/route.ts` |
| `pnpm check:routes:self-test` | 0 | 7 passed |
| `pnpm check:cycles` | 0 | 5228 files, **no circular dependency** |
| `$HEAVY 2 -- pnpm type-check` | 2 | 1 error, **not mine** — `features/billing/components/payments-tab.tsx(125,9)` |
| `jest --runInBand --testPathPattern="(notifications\|dashboard\|lib/home)"` | 0 | **17 suites / 106 tests passed** |
| bite proof: revert one Home flag to a literal | — | `1 failed, 14 passed`; restored → `15 passed` |
| `npx eslint <12 changed files>` | 0 | **0 errors**, 243 warnings (all pre-existing unused imports in notification components, ticket 36) |

---

## Cross-territory findings (reported, not fixed)

1. **Backend typecheck is red on someone else's edit.** `src/modules/finance/ap/payment-run-executor.service.ts(157,17): TS2552 Cannot find name 'newStatus'`. It is one of 7 uncommitted `src/modules/finance/**` files. It is the *only* error in the whole backend, which is also the proof that all 51 export removals and both file deletions compile clean.
2. **Frontend typecheck is red on someone else's edit.** `features/billing/components/payments-tab.tsx(125,9): TS2322` (`amount: string | null` vs `string | number`). An earlier run in the same session showed two different errors in `features/hr/enterprise/ops/identity/identity-page-content.tsx` (a `handleTemplateDelete(templateId: number)` handler called with a string), which another agent has since fixed. Both files are modified-but-uncommitted by other lanes.
3. **`src/modules/party/legacy-reader-ratchet.spec.ts` fails (30 readers vs a ratchet of 29).** The new reader is `src/db/__tests__/connection-and-query-telemetry.spec.ts`, in a directory that is entirely **untracked** — a new spec another agent added this session. It must be added to `KNOWN_READERS` *and* to the `no-restricted-imports` ignores in `eslint.config.mjs` (the spec asserts the two lists are identical), or migrated onto `party-legacy-seam.ts`.
4. **`check:kebab-case` fails on `src/scripts/.tmp-dcc-lib.mjs`** — an untracked scratch file from the read-cost/db-call-count lane (ticket 21). Rename or delete it.
5. **`check:dead-code` fails with 9 unclassified exports, none of them mine:** `features/build/analytics/project-charts.tsx:CHART_COLORS`, `features/mail/mail-compose-sheet.tsx:MailComposeMode`, `app/api/media/image/media-image-schema.ts:MediaImageQuery`, and six from ticket 28's new `hooks/api/subscription.ts` / `hooks/api/subscription-schema.ts` pair. Each needs a WIRE/KEEP verdict in `EXPORT_VERDICTS` (ticket 36).
6. **`check:routes` fails on `app/api/media/image/route.ts`** — a non-NextAuth route handler. Ticket 26/33.
7. **Ticket 28:** `frontend/hooks/api/build.ts` and `frontend/hooks/api/hr.ts` are one-line directory-shadowing shells (`export * from "./build/index"`). Deleting each is a zero-consumer-change removal — `@/hooks/api/build` resolves to the directory barrel. 188 importing files stay untouched. Same proof as the three `types/*.ts` shells already removed.
8. **Ticket 28:** `hooks/api/dashboard.ts` still hardcodes 8 `useCan("…")` Home-section keys instead of reading `homeSectionPermission(id)`. Now pinned by a fail-closed test, but the literals remain.
9. **Ticket 28 / 30:** the three-way `formatRelativeTime` split (box 8). Canonical is `lib/date-utils.ts`; unifying changes user-visible strings on Home, Inbox and Notifications.
10. **12 unneeded module exports remain in territories held by other agents or out of PRD scope**, each proven to have no consumer outside its own Nest module: `crm-import.module.ts` (4), `payroll-setup.module.ts` (3), `crm-metadata.module.ts` (1), `kb-core.module.ts:KbTranslationsService`, `payroll-insights.module.ts:PeriodReconciliationService`, `payroll.module.ts:PayrollFilingsService`, `support-kb-gap.module.ts:SupportKbGapService`. Removing each is a one-line edit; `check:module-di` is the oracle.

## Honest gaps

- **Backend `pnpm typecheck` did not reach exit 0** — one pre-existing error in another agent's uncommitted finance file. My own changes produced zero errors in that same run.
- **Frontend `pnpm type-check` did not reach exit 0** — same situation in `features/billing`.
- `pnpm check:spec-typecheck`, `next build`, e2e and the full jest suites: **not run**.
- Backend lint: **not run**. Frontend lint: run only on the 12 files I changed (0 errors).
- The frontend barrel-surface reduction (56 entries) was measured but **not performed** — see box 2.
