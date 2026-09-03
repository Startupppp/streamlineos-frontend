# Ticket 24 — Module ownership and cleanup inventory — audit at current head

**Ticket:** `.scratch/code-release-10-10-v2/issues/24-cleanup-detection-foundation.md`
**Criteria:** PRD-C025, PRD-C105, PRD-C106, PRD-C107
**Prior report:** none. All evidence below was reconstructed from scratch on 2026-09-03.

| | |
|---|---|
| frontend repo SHA | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`) |
| backend repo SHA | `45f8a2e99494483526e357e27f18c76961ebf266` (`release/code-10-10-v2`) |
| working tree | **DIRTY** — frontend 31 modified/untracked source files, backend 21. A concurrent wave is editing the same checkout. Where a measurement differs between committed HEAD and the working tree, both are given and labelled. |
| verdict | **not-met** — 0 of 4 criteria met; 1 partially met |

---

## 1. Corpus actually read

Numbers first, so a "0 violations" below can be told apart from "nothing was scanned".

### Backend (`streamlineos-backend`)

| dimension | measured |
|---|---:|
| `.ts` files under `src/` | 5,718 |
| `.ts` files under `src/modules/` | 4,752 (2,914 production / 1,838 spec) |
| module folders (`src/modules/*`) | **74** |
| `src/common/*` folders | 38 |
| top-level `src/` dirs | `@types, common, config, db, degradation, health, me, modules, scripts, test` (10) |
| Nest modules declared (`*.module.ts`) | 218 (220 `@Module(` decorators) |
| modules reachable from `AppModule` | 217 declared + AppModule; 216 per the outbox gate; **0 unreachable** |
| registered providers | 1,209 |
| controllers (`*.controller.ts`, non-spec) | **549** (566 `@Controller(` decorators incl. spec doubles; 546 inside `src/modules`) |
| distinct top-level HTTP route prefixes | **76** |
| services (`*.service.ts`, non-spec) | 1,076 |
| `dto/` directories | 166 |
| files declaring a Zod schema | 830 (2,853 `z.object(` sites) |
| `*.dto.ts` / `*.schema.ts` (outside `db/schema`) | 11 / 14 |
| DB schema files (`src/db/schema/**`) | 349 across 22 domain folders |
| `pgTable(` declarations | 813 |
| migrations (`migrations/*.sql`) | **677**, journal entries **677**, orphans **0**, journal entries with no file **0** |
| workers (`*worker*.ts`, non-spec) | 18 |
| outbox consumer files | 24 |
| emitted / declared / registered outbox event types | 24 / 29 / **29 — full coverage** |
| cache key factories (`src/common/cache/cache-keys.ts`) | 159 entries; 75 read namespaces, 76 bump namespaces |
| operational scripts | 208 in `src/scripts/*.mjs` + 56 in `scripts/` |
| spec/e2e files | 2,128 (+127 files under `test/`) |
| fixture files | 13 |
| `check:*` package scripts | **189** (100 gates per `check:gate-wiring`, 91 able to fail the job) |

### Frontend (`streamlineos-frontend/frontend`)

| dimension | measured |
|---|---:|
| authored `.ts`/`.tsx` under `app,components,features,hooks,lib` | 5,248 (5,354 walked incl. `types/`; 5,441 linted) |
| `app/**/page.tsx` | **600** |
| `app/**/layout.tsx` | 40 |
| `app/**/route.ts` | 2 (NextAuth + the allowlisted media handler) |
| route directories walked by `check:routes` | 655 |
| `features/*` top-level dirs | **48** |
| `components/*` top-level dirs | 35 |
| files under `features/` / `components/` / `hooks/` / `lib/` | 2,793 / 373 / 575 / 283 |
| `hooks/api/**` files | 522 (121 at the top level + 23 subdirs) |
| TanStack key partitions / factories / distinct key members | 16 files / 17 exported objects / **136 members** (139 top-level properties) |
| `queryKey:` sites / `useQuery*` / `useMutation` / `invalidateQueries` | 3,203 / 392 / 87 / 2,024 |
| tests | 362 |
| scripts | 51 (35 `check-*.mjs`, all wired to a package script) |
| `check:*` package scripts | 69 |
| import edges resolved (alias + relative) | 24,875 `@/` + 3,623 relative |

### Commands actually run

```
backend:  check:kebab-case, check:import-direction, check:module-registration,
          check:route-duplicates, check:namespace-coverage, check:cache-key-shapes,
          check:cache-key-shapes:self-test, check:gate-wiring, check:outbox-consumers,
          check:dead-code
          npx eslint "src/**/*.ts" "test/**/*.ts" "src/**/*.mjs" "scripts/**/*.mjs" -f json
          npx eslint "evals/**/*.ts" -f json
frontend: check:import-direction, check:module-manifest, check:routes, check:dead-code,
          check:query-scope, check:query-signal
          npx eslint -f json           (whole project, 2m04s)
psql:     scratch_head_1010 — pg_constraint / pg_indexes for support_ticket_drafts
```

---

## 2. Per-criterion assessment

### PRD-C025 — enforce TypeScript/ESLint unused-symbol checks — **NOT MET**

> *"Enable and enforce TypeScript/ESLint unused-symbol checks for imports, locals, parameters and private members. Remove unused symbols instead of renaming them to `_` or suppressing the rule; allow a named `_` parameter only where a framework/interface callback contract requires its position."*

Walked in the order the criterion names them.

**(a) TypeScript checks — not enabled anywhere.**
`noUnusedLocals` and `noUnusedParameters` appear in **zero** config files across both repos (`grep -rn "noUnusedLocals\|noUnusedParameters" --include='*.json' --include='*.mjs'` → the only hit is a prose mention in an old `.scratch` report). Confirmed by reading all four tsconfigs in full:
- `streamlineos-backend/tsconfig.json` — `strict`, `strictNullChecks`, `noImplicitAny`, `noFallthroughCasesInSwitch`; **no unused flags**
- `tsconfig.build.json`, `tsconfig.test.json` — both `extends` that file, add nothing
- `frontend/tsconfig.json` — `strict`, `noEmit`; **no unused flags**, and it `exclude`s every `*.test.*`/`*.spec.*`/`__tests__` path

**(b) ESLint checks — configured, but at `warn`, so they cannot fail anything.**

| repo | rule config | line |
|---|---|---|
| backend | `"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }]` | `eslint.config.mjs:68–75` |
| frontend | same shape | `eslint.config.mjs:20–23` |

Neither `lint` script passes `--max-warnings` (`backend/package.json:131`, `frontend/package.json:7`), and `--max-warnings` appears nowhere in either repo's `.github/workflows/`. Both CI jobs run a bare `pnpm lint` (`backend ci.yml:53`, `frontend frontend.yml:55`). **A `warn` is therefore invisible to every gate.**

**(c) Measured size of the unenforced surface** (full lint runs, this head):

| | backend | frontend | total |
|---|---:|---:|---:|
| files linted | 6,069 | 5,441 | 11,510 |
| errors | 258 | 4 | 262 |
| warnings | 458 | 906 | 1,364 |
| **`no-unused-vars` findings** | **403** | **752** | **1,155** |
| …of which in production (non-spec) files | 236 (174 `.ts` + 62 `.mjs`) | 725 | 899 |
| …`defined but never used` / `assigned but never used` | 284 / 118 | 728 / 24 | 1,012 / 142 |

**1,155 unused-symbol findings exist at head and not one of them fails a gate.** Three verified by hand:
- `src/common/audit/internal-audit.controller.ts:6` — `type AuditEntry` imported, never referenced anywhere in the file.
- `src/common/auth/principal.ts:130` — `principalAuditIdentity()` is a non-exported 20-line function with **zero references repo-wide**.
- `src/common/relocation/relocation-traffic-tracker.ts:23,75` — `trackedTargets` / `countRequestIfRelocationTarget` non-exported, no production caller; the only mention of the latter is a `jest.mock` factory key in `cron-org-purge-worker.spec.ts:17`, which is not an import.

**(d) The `_` escape the criterion forbids is configured, twice more broadly than allowed.**
The criterion permits a named `_` **parameter** only at a framework/interface callback position. The config also permits:
- `varsIgnorePattern: "^_"` — unused **locals** named `_x` (never allowed by the criterion)
- `caughtErrorsIgnorePattern: "^_"` — unused caught errors (never allowed)
- `argsIgnorePattern: "^_"` — blanket, with no restriction to framework positions

Measured actual use: **33 `_`-prefixed typed parameters in 21 non-spec backend files** (924 including specs, where they are legitimate `jest.fn` callback positions), and **3 in the frontend** (`use-chat-presence.ts:75` Web Locks callback, `chat-notifications.ts:122` handler, `restore-focus-on-close.ts:39` Radix `onOpenAutoFocus` — all three are genuine framework positions and comply). Zero `eslint-disable` of `no-unused-vars` in either repo, and zero `catch (_`.

Of the 33 backend cases, the following are **not** framework positions — they are the module's own service methods, so the criterion forbids them:

```
src/modules/support/core/support-drafts.service.ts:20,33,47      _userId
src/modules/support/core/support-macros.service.ts:49,70         _userId
src/modules/support/core/support-workspace.service.ts:79,97,113,132  _userId
src/modules/build/comment-drafts/comment-drafts.service.ts:26    _userId
src/modules/notifications/notification-preference-rules.service.ts:33,41  _userId
src/modules/notifications/notification-delivery-class.ts:115     _eventKey
```

**(e) Private members — checked by nothing.** `no-unused-private-class-members` is not configured in either repo, and it only covers `#private` fields anyway, not the TypeScript `private` modifier. With `noUnusedLocals` off, **4,567 non-static `private` class members across 1,224 backend files are covered by no check at all.** A conservative scan (member referenced exactly once in its own file = declaration only) finds **7 genuinely dead ones**, three verified by reading the file:

- `src/modules/payroll/payout/publishing.service.ts:37` — `private readonly efService: EmploymentFactsService` is constructor-injected and never used.
- `src/modules/kb/wiki/kb-page-status.service.ts:29` — `private async setStatus(...)` declared, never called in its 204 lines.
- `src/modules/billing/core/ai-credits-reservation.service.ts:32` — `private readonly logger` never used, in the service that reserves AI credits.

**Verdict: not-met.** TypeScript half absent; ESLint half present but non-blocking; the `_` escape is configured beyond what the criterion allows and is in live use on 12 non-framework parameters; private members unchecked.

---

### PRD-C105 — inventory the module surface — **PARTIALLY MET (as of this report)**

> *"Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, TanStack keys, tests, fixtures and operational scripts."*

**No inventory artifact exists at head.** Searched `architecture-refactor/`, `.scratch/code-release-10-10-v2/`, and both repos for a module release matrix, an ownership manifest, or a KEEP/REFACTOR/REMOVE ledger. The only such documents are the *previous* release's per-module reports (`.scratch/code-release-10-10/reports/19-*, 24-*`), which the v2 TRACEABILITY manifest explicitly states "remain historical evidence and do not own unfinished work." The v2 traceability manifest assigns C105/C106/C107 to ticket 24 and nothing has produced them.

§1 of this report **is** the inventory for every dimension the criterion names, with counts. It is complete for 16 of 16 dimensions. What it is not is a committed, machine-checkable artifact in the repo — which is what "Inventory" plus the ticket's "Completion evidence" section (record SHAs, commands, artifact locations, update the PRD checkbox and traceability manifest in the same commit) asks for. Marked partially-met on that basis: the measurement exists, the deliverable does not.

Two inventory facts worth pulling out of the table:

- Migrations are clean: 677 `.sql`, 677 journal entries, **0 orphans in either direction**. This is the failure mode memory records ("27 orphaned, all of Wave 4/5 missing") and it does not recur here.
- Outbox is clean: 24 emitted event types, all 24 have a consumer registered from `AppModule`; 29 declared and 29 registered.

---

### PRD-C106 — one canonical owner, kebab-case, import direction, no parallel location — **NOT MET**

> *"Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location."*

Walked in the four sub-dimensions the criterion names.

#### (i) Kebab-case naming — **backend enforced and clean; frontend unenforced but almost clean**

- Backend `check:kebab-case` — **exit 0**, "scanned 6,543 entries under `src` — 0 violations, 2 of 2 recorded exceptions still present." Real reach, real pass.
- The gate scans only `src/`. I measured the unscanned remainder myself: `test/` + `scripts/` = **0 non-kebab filenames**. `migrations/` — 1 of 677: `migrations/0117_invitation-events-org-fk.sql` uses hyphens where the other 676 use underscores.
- **The frontend has no kebab-case gate at all.** `frontend/scripts/` contains 35 `check-*.mjs` files and none mentions kebab. I measured it directly: 5,248 `.ts`/`.tsx` files and 1,186 directories under `app,components,features,hooks,lib` → **0 non-kebab filenames, 1 non-kebab directory**: `components/hr/_onboarding/` (6 files, imported by `components/hr/onboarding-wizard.tsx:21–25`).

#### (ii) Import direction — **backend gate is near-vacuous; frontend gate is red in the working tree**

- Backend `check:import-direction` — exit 0, but its own summary line (`src/scripts/check-import-direction.mjs:197`) reads: *"scanned **230 files under src/common** — 0 new violations, 0 of 0 baseline entries."* That is **4.0% of the 5,718 `.ts` files under `src/`**. The gate only checks the one direction `src/common → src/modules`. Cross-module deep imports (`src/modules/a` reaching into `src/modules/b`'s internals) — the direction PRD-C033 and this criterion actually care about — are checked by nothing.
- Frontend `check:import-direction` — **exit 1** in the working tree: `cross-feature-import: 179 violations (baseline 177) — REGRESSED`; `shared-imports-feature: 3/3 (at baseline)`.
  I attributed the +2. At committed HEAD, `features/build/shared/ticket-filter-bar.tsx:21,23` import from the barrel `@/features/shared/list-view` (one distinct module → counted once); in the working tree a concurrent lane changed them to deep imports `.../filter-chip` and `.../filter-types` (two distinct modules → counted twice). `features/party/parties/parties-page.tsx` went from 2 distinct `@/features/renderer` targets at HEAD to 3 in the tree. **Committed HEAD is at baseline 177 and exits 0; the working-tree regression is another lane's uncommitted deep-import change and must not be banked into the baseline.**
- The 177 baselined cross-feature imports are themselves 177 files with no single owner for the symbol they share. Representative: `features/accounting/settings/payment-providers-page.tsx → @/features/payments/components/provider-card`; `features/payroll/reimbursements/reimbursement-columns.tsx → @/features/hr/shared/approval-actions`; `features/support/components/knowledge-gap-card.tsx → @/features/wiki/lib/knowledge-routes`.
- **33 `hooks/**` files import `@/features/*`**, all `import type` (e.g. `hooks/api/timesheets-core/entries.ts:15 → @/features/timesheets/types`). Type-only, so harmless at runtime, but it means the domain's contract lives in `features/` while its data hook lives in `hooks/api/` — two owners for one contract. **5 `components/**` files import `@/features/*`**; 3 are lazy `import()` in layout shells (legitimate composition) and 2 are tests.
- Mixed import styles: 3,623 relative edges alongside 24,875 alias edges, including 60 that reach `../../` or deeper out of their directory (`app/(authenticated)/layout.tsx` reaches `../../components/feedbucket/feedbucket-embed`, `../../features/build/tickets/global-create-ticket-dialog`, and 7 more). This is not cosmetic: my own first-pass alias-only importer scan flagged `components/feedbucket/feedbucket-embed.tsx` as unreferenced precisely because its only importer uses the relative form.

#### (iii) Canonical domain owner + (iv) no parallel legacy location — **the substantive failure**

**Backend.** I mapped all 74 module folders to (a) the top-level route prefixes their controllers serve and (b) the `src/db/schema/*` folders they import.

- **76 distinct route prefixes; 14 of them (18%) are served by more than one module folder:**

| prefix | owning module folders |
|---|---|
| `/accounting` | **accounting, finance** |
| `/finance` | **accounting, finance** |
| `/hr` | email, expenses, hr, payroll, storage |
| `/me` | api-tokens, expenses, hr |
| `/crm` | activities, autonomy, crm, data-quality, ingress, issues |
| `/public` | ai, e-sign, feedbucket, hr, kb, public, storage, surveys |
| `/settings` | automation, email, settings |
| `/webhooks` | billing, calendar, email, webhooks |
| `/notifications` | email, notifications |
| `/access` | access, delegations |
| `/auth` | auth, mfa |
| `/chat` | ai, chat |
| `/cron` | cron, workflows |
| `/onboarding` | hr, storage |

  `/public` and `/webhooks` are defensible — they are protocol namespaces, not domains. The rest are ownership splits.

- **13 module folders serve no route prefix matching their own name** (`activities, agent-access, automation, autonomy, data-quality, delegations, e-sign, email, expenses, ingress, issues, mfa, record-layouts`), and **17 serve more than one prefix**.

- **The accounting/finance split is the largest single instance.** `src/modules/finance` is 232 files / 40 controllers and `src/modules/accounting` is 88 files / 14 controllers, and they interleave with no boundary:
  - **35 of finance's 40 controllers serve `accounting/*`**, e.g. `src/modules/finance/reports/overview.controller.ts:13 @Controller("accounting")`, `src/modules/finance/reports/statement-reports.controller.ts:17 @Controller("accounting/reports")`.
  - Conversely `src/modules/accounting/ai/accounting-ai.controller.ts:23 @Controller("finance/ai")` — the accounting folder owns a `finance/*` route.
  - The bare `accounting` prefix is served by **5 controllers across both folders**; `accounting/reports` by **5 controllers across both folders** (`accounting/core/accounting-gst.controller.ts`, `accounting/core/accounting-statements.controller.ts:20`, and three under `finance/reports/`).
  - Every other layer has already consolidated on `accounting`: all **46 accounting-family tables** live in `src/db/schema/accounting/`; the frontend has `features/accounting` (72 routes) and `hooks/api/accounting/` and **no `features/finance`, no `app/(authenticated)/finance`** — the 20 `/finance/*` API calls that remain are issued from `hooks/api/accounting/banking.ts` and `hooks/api/accounting/accounting-ai.ts`. The backend module folder is the only layer still split.
  - Residual half-migration inside the consolidated schema: **7 files under `src/db/schema/accounting/` are still named `finance-*.ts`** (`finance-ar-ap.ts`, `finance-assets.ts`, `finance-banking.ts`, `finance-expenses.ts`, `finance-planning.ts`, `finance-report-export-jobs.ts`, `finance-tax.ts`).

- **`src/modules/expenses` spans four ownership labels at once.** Folder name `expenses`; routes `hr/expenses`, `hr/expenses/categories`, `hr/expenses/import`, `hr/travel`, `me/expenses` (`src/modules/expenses/expenses.controller.ts:65`); tables `expenses` + `expense_categories` declared in `src/db/schema/payroll/claims-and-settlements.ts:30,52`, `travel_requests` in `src/db/schema/hr/travel.ts:4`, `expense_export_jobs` in `src/db/schema/payroll/expense-export-jobs.ts`. Meanwhile `src/modules/finance/expenses/` serves `accounting/expenses`, `accounting/expenses/policies`, `accounting/expenses/receipts`, `accounting/reimbursements` — a **second** expense implementation in a **second** module folder under a **third** route namespace.

**Frontend.** Route→owner is genuinely good; directory ownership is not.

- Of 640 route files, **547 (85%) import exactly one `@/features/*` owner**, 65 import none (thin shells), and **28 import more than one**. Of those 28, 22 are CRM and 3 are inventory (both out of scope), and the remaining 3 are `app/layout.tsx` (seo+analytics), `app/page.tsx` and `app/(public)/pricing/page.tsx` (landing+seo) — all defensible. **The in-scope frontend route surface has one canonical owner per route.** This is a real strength.
- **12 domain names exist as both `components/<x>` and `features/<x>`** (78 files in the `components/` half). Resolving each by measuring its actual external consumers:

| `components/<x>` | files | external consumers | verdict |
|---|---:|---|---|
| `hr` | 19 | only `features/hr`, `features/candidates` | single-domain → belongs under `features/hr` |
| `dashboard` | 7 | only `features/dashboard`, `hooks/api` | single-domain |
| `blog` | 10 | only `app/(public)` — while `features/blog` has 9 files | two blog UI homes |
| `settings` | 1 | only `app/(authenticated)` — `features/settings` has 84 files | stray |
| `inventory` | 5 | only `features/inventory` | out of scope, noted |
| `organization` | 5 | `features/settings`, `app/org-setup`, `components/layout` | borderline |
| `auth` | 2 | 15 features + 26 routes | genuinely shared — **KEEP** |
| `shared` | 19 | 44 distinct consumer dirs | genuinely shared — **KEEP** |
| `support` | 2 | `features/support`, `features/help-centre`, 1 route | borderline shared — KEEP |
| `billing`, `feedbucket` | 1, 1 | 3 `components/` files / `app/(authenticated)` | KEEP |

- **Four directories own candidate UI**: `features/candidates` (7 files), `features/hr/recruitment/candidates`, `features/hr/recruitment/candidates-list`, `features/hr/recruitment/candidate-detail`. Every importer of `features/candidates/*` is inside `features/hr/recruitment/candidate-detail/`, and it has no route. Its canonical owner is HR recruitment.
- **`features/payments` (11 files)** has exactly one consumer, `features/accounting/settings/payment-providers-page.tsx`, and no route. Its canonical owner is accounting.
- **`features/security/turnstile-widget.tsx` (1 file)** has exactly one consumer, `features/landing/contact-form.tsx`. A one-file "security" feature that is a landing-page CAPTCHA.
- **The TanStack key registry is partitioned by size, not by domain.** 16 partition files spread-merged into one `queryKeys` object (`lib/query-keys.ts:19–37`). Seven are named `X-and-Y`: `access-and-crm`, `accounting-and-support`, `directory-and-ownership`, `growth-and-sign`, `knowledge-and-surveys`, `support-and-workflows`, `users-and-commerce`. Support keys are owned by **two** partitions (`accounting-and-support` and `support-and-workflows`). I tested for the resulting hazard — a member name declared in two partitions would be silently shadowed by whichever spreads last, with no error — and found **0 collisions today**. The 267-line `lib/query-keys/key-factory-contract.test.ts` checks factory *shapes* and does **not** assert partition disjointness, so nothing prevents the first collision.

**Verdict: not-met.** Kebab-case holds; route ownership on the frontend holds; canonical domain ownership and "no parallel legacy location" do not, in 14 split backend route prefixes, one 320-file accounting/finance duplication, and 5 misplaced frontend directories.

---

### PRD-C107 — classify every file KEEP / REFACTOR / REMOVE — **NOT MET**

> *"Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict."*

**No classification artifact exists at head** (same search as C105). What exists is a partial, dead-code-scoped ledger inside `src/scripts/check-dead-code.mjs` covering **5 symbols** — 1 KEEP, 2 WIRE, 2 REMOVE — plus 2 retained-by-contract. That is 5 verdicts against a corpus of ~11,000 files.

**Baseline KEEP evidence is strong and I confirmed it.** Both dead-code gates pass over real corpora:
- backend: `knip: 0 unused files, 7 other findings | importer graph 9,904 files, 69,468 edges` → all 7 classified, 0 unclassified.
- frontend: `Baseline files=0 exports=0; Current files=0 exports=0`, 12 EXCLUDED (CRM/Inventory), 0 UNCLASSIFIED.

I tried to break the frontend result and failed, which is worth recording as a KEEP proof rather than a finding. Hypothesis: the 752 unused imports create phantom module-graph edges that keep otherwise-dead files alive. I classified all 752 — **383 are first-party `@/` import edges**, 333 npm, 36 non-import — then for all 2,121 distinct `@/` targets computed real vs phantom importers. **0 targets are reached only by phantom edges.** Every phantom-edge target (`@/components/ui/sheet` 42 phantom / 221 real, `@/lib/utils` 9 / 914, …) is heavily used elsewhere. Separately, the 6 files my importer index showed with no *external* importer (`components/blog/blog-card.tsx`, `components/shared/list-toolbar.tsx`, …) all turned out to have in-directory or barrel importers with real downstream consumers. **The frontend has no dead files. The classification would be KEEP for all of them.**

The classification that *can* be defended today, and which a later wave should commit:

**KEEP (default): every file with a proven live consumer** — 5,354 frontend and 5,718 backend `src/` files, minus the lists below. Proven by knip's module graph in both repos plus the 28,498-edge importer index built for this audit.

**REFACTOR — 9 groups, ~320 files, with the failure each one prevents:**

| # | files | verdict | concrete failure prevented |
|---|---:|---|---|
| R1 | `src/modules/finance/**` (232) → `src/modules/accounting/**` | REFACTOR | The `accounting/reports` prefix is served by 5 controllers in 2 folders. A new report added to `accounting/core/` and one added to `finance/reports/` cannot see each other's guards, caching or permission keys; `check:route-duplicates` reports 0 because the *paths* differ, so the split is invisible to every gate. |
| R2 | `src/db/schema/accounting/finance-*.ts` (7) | REFACTOR (rename) | Schema files named for a module that the schema layer has already retired. A drop-column or FK audit filtered by `finance` finds these and misses `accounting-core.ts`; filtered by `accounting` it finds the folder and reads the wrong 7 files' names as evidence of a second owner. |
| R3 | `src/modules/expenses/**` (30) | REFACTOR | One module answering `hr/*`, `me/*` and writing tables owned by `src/db/schema/payroll/` and `src/db/schema/hr/`, while a *second* expense implementation lives at `src/modules/finance/expenses/` under `accounting/*`. An expense-policy change lands in one of the two and the other keeps the old rule. |
| R4 | `frontend/features/candidates/**` (7) → `features/hr/recruitment/` | REFACTOR | Four directories own candidate UI. The next candidate-card change lands in whichever one the author finds first, and the other three keep rendering the old shape — while the move also clears 7 permanent `cross-feature-import` baseline entries. |
| R5 | `frontend/features/payments/**` (11) → `features/accounting/settings/` | REFACTOR | Single consumer, no route; it is the first entry in the `cross-feature-import` violation list. Leaving it means the accounting settings page can never be reasoned about without a second feature's internals. |
| R6 | `frontend/features/security/turnstile-widget.tsx` (1) | REFACTOR | A directory named `security` containing one landing-page CAPTCHA widget invites the next genuine security component to be filed beside it, where the landing-page lint relaxations (`no-raw-visual-values` with `skip: ["type","shadow","radius"]`) apply. |
| R7 | `frontend/components/{hr,dashboard,blog,settings}/**` (37) → their `features/` owner | REFACTOR | Two homes per domain. `components/hr` is imported by nothing but `features/hr` and `features/candidates`; `components/blog` is reached only from `app/(public)` while `features/blog` exists in parallel. A domain change must be applied twice or it is applied once. |
| R8 | `frontend/lib/query-keys/*-and-*.ts` (7 partitions) | REFACTOR + add a disjointness test | Support cache keys are owned by two partitions spread-merged into one object. The first duplicated member name is silently shadowed by spread order with no error — a mutation invalidates the losing family and the winning family serves a stale read forever. 0 collisions today; nothing prevents the next one. |
| R9 | `frontend/features/notifications/**` + `features/chat/chat-bubble.tsx` (12 files) | REFACTOR | **453 unused imports in 12 files** — 60% of the whole frontend total in 0.2% of its files. `template-preview.tsx` is 176 lines with **56** unused imports; `provider-row.tsx` 50; `event-row.tsx` 45. Commits `18fc95934`, `28a300bb4`, `ad0e0fc5f` split these pages and copied the entire import header into each fragment. Every one is a false dependency edge that a deletion proof (PRD-C034) has to be talked out of. |

**REMOVE — 6 groups, with the failure each one prevents:**

| # | target | verdict | concrete failure prevented |
|---|---|---|---|
| D1 | `frontend/.scratch/{admission-probe,admission-probe2,mint-session,probe-exchange,probe-exchange2}.mjs` — **5 files tracked in git** | REMOVE | `mint-session.mjs` forges a NextAuth session JWE and `admission-probe.mjs` exchanges it at the backend using `x-internal-secret` + `x-session-proof`. A working, committed session-forgery recipe lowers the cost of any repo leak or insider action against `/auth/exchange`. They are in knip's project glob and one already emits a lint warning; nothing tests them, nothing owns them. (4 further untracked `t26-*.mjs` sit beside them — the directory is being used as a dumping ground.) |
| D2 | `src/modules/notifications/providers/notification-provider.interface.ts:11 validateConfig` + its 5 implementations + `dto/provider-result.schemas.ts:providerValidationResultSchema` | REMOVE or WIRE | Verified by grep: `validateConfig` has **1 declaration, 5 implementations, 0 callers** in `src/`. A misconfigured SMS/WhatsApp/email provider is saved with no credential check, so the first symptom is an undeliverable notification in the delivery worker instead of a validation error at save time. |
| D3 | `src/common/auth/principal.ts:130 principalAuditIdentity` (+ its `PrincipalAuditIdentity` interface at :125 if it has no other consumer) | REMOVE | A function that computes the audit actor identity for every principal kind and is called by nothing. Either audit attribution is not using it (a gap) or it is dead weight that reads as if attribution is covered. |
| D4 | `src/common/relocation/relocation-traffic-tracker.ts:23,75` and `relocation-traffic.ts:67,105` | REMOVE | Four dead locals superseded by `with-tenant.ts` calling `recordTargetRequest` directly. `cron-org-purge-worker.spec.ts:17` mocks `countRequestIfRelocationTarget` — a spec asserting on a mock of a function nothing calls is a vacuous assertion (PRD-C104). |
| D5 | the 7 unused non-static `private` members (§C025(e)) | REMOVE | `publishing.service.ts:37` forces `EmploymentFactsService` to be resolvable in the payroll payout module's injector for a field nobody reads; `ai-credits-reservation.service.ts:32` declares a logger in the code path that spends money and never logs. |
| D6 | package scripts `check:cache-key-shapes` and `check:cache-key-shapes:self-test` (`backend/package.json:365–366`) | REMOVE or give the file an entrypoint | See F1 below. |

**Verdict: not-met.** No classification exists; the above is the first one. It covers ~330 files explicitly and KEEP-by-default for the rest, which is defensible but is not the per-file artifact the criterion and the ticket's completion-evidence section ask for.

---

## 3. Findings

| # | sev | file:line | summary |
|---|---|---|---|
| F1 | P1 | `streamlineos-backend/package.json:365` | `check:cache-key-shapes` is a library with no entrypoint — the gate and its self-test both check nothing and always exit 0, and CI runs both. |
| F2 | P1 | `streamlineos-backend/src/scripts/check-dead-code.mjs:78` | The dead-code importer graph walks `.claude/worktrees/`; **58.4%** of the files it scans locally are other agents' worktree copies. |
| F3 | P1 | `streamlineos-backend/eslint.config.mjs:68` | `no-unused-vars` is `warn` in both repos with no `--max-warnings`; 1,155 unused symbols pass every gate, and TS's own unused flags are off everywhere. |
| F4 | P1 | `streamlineos-backend/src/modules/finance/reports/overview.controller.ts:13` | The `accounting/*` route namespace is owned by two backend module folders (232 + 88 files); every other layer has already consolidated. |
| F5 | P2 | `streamlineos-backend/src/scripts/check-import-direction.mjs:197` | The backend import-direction gate reads 230 of 5,718 `src` files (4.0%) and checks only `common → modules`. |
| F6 | P2 | `streamlineos-frontend/frontend/features/notifications/components/template-preview.tsx:3` | 453 unused imports in 12 frontend files; 56 in one 176-line client component. |
| F7 | P2 | `streamlineos-frontend/frontend/.scratch/mint-session.mjs:6` | Five session-forgery / internal-secret probe scripts are tracked in git. |
| F8 | P2 | `streamlineos-backend/src/modules/notifications/providers/notification-provider.interface.ts:11` | `validateConfig` — 1 declaration, 5 implementations, 0 callers. |
| F9 | P2 | `streamlineos-frontend/frontend/lib/query-keys.ts:19` | 16 size-named query-key partitions spread-merged; two own support keys; no disjointness test. |
| F10 | P2 | `streamlineos-backend/src/modules/support/core/support-drafts.service.ts:20` | 12 non-framework parameters renamed to `_` rather than removed, in six services. |
| F11 | P2 | `streamlineos-backend/src/modules/payroll/payout/publishing.service.ts:37` | 7 unused non-static `private` members, including an injected service and a private method, on a surface no check covers (4,567 members / 1,224 files). |
| F12 | P2 | `streamlineos-frontend/frontend/components/hr/_onboarding/restricted-field-change.ts:1` | The frontend has no kebab-case gate; one directory violates it. |
| F13 | P2 | `streamlineos-frontend/frontend/features/candidates/candidate-profile-card.tsx:1` | Four directories own candidate UI; `features/candidates` has one consuming directory and no route. |
| F14 | P2 | `streamlineos-backend/package.json:131` | The backend `lint` glob omits `evals/**/*.ts`, which `eslint.config.mjs:64` configures deliberately. |
| F15 | P2 | `streamlineos-backend/src/common/auth/principal.ts:130` | `principalAuditIdentity` has zero references repo-wide. |

### Detail

**F1 — P1 — `streamlineos-backend/package.json:365` (`src/scripts/check-cache-key-shapes.mjs`)**
`check-cache-key-shapes.mjs` is 339 lines of exported functions with **no top-level statement, no `process.argv` handling, no `--self-test` branch, no main guard**. Verified: `grep -n "process.argv\|import.meta\|self-test"` → no matches; `grep -nE "^(process|console|if \(|await |main\(|run\()"` → no matches. Running either script produces **zero output and exit 0**.
*Failure scenario:* `.github/workflows/ci.yml:470–472` runs `pnpm check:cache-key-shapes:self-test && pnpm check:cache-key-shapes` as a named CI gate step ("Cache key shapes"). Both succeed unconditionally. Two of the 100 gates that `check:gate-wiring` counts as "able to FAIL the job" cannot fail for any input, and the release's "76 backend gates pass" figure includes one of them. If `check-cache-invalidation.mjs` ever stops importing this module, the shape comparison disappears with no red anywhere.
*Fix:* either delete both package scripts and the CI step (the real gate is `check:cache-invalidation`, which consumes this module and does run), or add `if (process.argv.includes("--self-test")) { … }` plus a main path that calls `resolveAllSites` and asserts. Do not leave a `check:*` name pointing at a library.

**F2 — P1 — `streamlineos-backend/src/scripts/check-dead-code.mjs:78`**
`OUT_OF_SCOPE_SEGMENTS` is `{node_modules, dist, coverage, .git, migrations, .scratch, .scan, graphify-out}` — it does **not** contain `.claude`. `buildImporterMap(ROOT)` and `buildSymbolIndex(ROOT, …)` both walk from the repo root via `walkSource`, so both descend into `.claude/worktrees/`, which holds **8,336 `.ts` files across two other agents' git worktrees**. Measured: `walkSource` yields **14,736** files as configured vs **6,128** with `.claude` excluded — **8,608 files, 58.4% of the graph, are not this checkout's code.**
The symptom is already printed in the gate's own output: the RETAINED-BY-CONTRACT reason for `MeetingPrepInput` reads *"parsed at a live boundary in `.claude/worktrees/bold-napier-7a4a41/src/modules/ai/core/controllers/crm-ai.controller.ts`"* — it selected a worktree file over the identical in-repo one, so worktree entries sort first in the importer list.
*Failure scenario:* delete the last real consumer of a `src/` file or schema constant, leave a stale worktree checked out, and `classifyFile` returns `RETAINED-BY-CONTRACT — named import from live file (.claude/worktrees/…)` instead of `DEAD`. The gate exits 0 over code that is genuinely unreachable in the build. In CI the directory does not exist, so CI and local disagree about what the dead-code gate says — and this ticket's entire C107 classification is built on the local answer.
*Fix:* add `".claude"` to `OUT_OF_SCOPE_SEGMENTS` (one line), and add a self-test assertion that a fixture importer under `.claude/` does **not** rescue a dead file. knip itself is unaffected — `knip.json` scopes `project` to `src/**`, `test/**`, `scripts/**`, `evals/**` — so the fix is confined to this script's own walker.

**F3 — P1 — `streamlineos-backend/eslint.config.mjs:68` and `streamlineos-frontend/frontend/eslint.config.mjs:20`**
Both repos set `"@typescript-eslint/no-unused-vars": ["warn", {argsIgnorePattern:"^_", varsIgnorePattern:"^_", caughtErrorsIgnorePattern:"^_"}]`. Neither `lint` script passes `--max-warnings` (`backend/package.json:131`, `frontend/package.json:7`) and the flag appears in no workflow file. `noUnusedLocals`/`noUnusedParameters` are absent from all four tsconfigs and from every config file in both repos.
*Failure scenario:* `pnpm lint` reports 403 backend + 752 frontend unused-symbol warnings and its exit code is decided entirely by unrelated `error`-level rules. Fix the backend's 258 `no-explicit-any`/`no-require-imports` errors and `pnpm lint` goes green with 403 unused symbols still in the tree — including a 20-line unreferenced function in `src/common/auth/principal.ts` and an injected-and-unused `EmploymentFactsService`. PRD-C025 is then reported as satisfied by a green lint that never checked the thing.
*Fix:* raise the rule to `"error"` in both configs; delete `varsIgnorePattern` and `caughtErrorsIgnorePattern` (the criterion permits neither); narrow `argsIgnorePattern` to `"^_"` only under an `overrides` block for the framework-callback file globs, or drop it and name the ~3 genuine framework positions individually. Add `noUnusedLocals: true` and `noUnusedParameters: true` to both tsconfigs, and `no-unused-private-class-members` for the `#private` half. Expect ~899 production removals; land them in batches with the affected package's tests, per PRD-C035.

**F4 — P1 — `streamlineos-backend/src/modules/finance/reports/overview.controller.ts:13`**
`@Controller("accounting")` in `src/modules/finance/`. 35 of finance's 40 controllers serve `accounting/*`; `src/modules/accounting/ai/accounting-ai.controller.ts:23` serves `finance/ai` in the other direction. `accounting/reports` is served by 5 controllers across both folders; the bare `accounting` prefix by 5 more across both folders. Schema (46 tables in `src/db/schema/accounting/`), frontend features, frontend hooks and frontend routes have all already consolidated on `accounting`.
*Failure scenario:* an authorization or caching change to the accounting reports surface is made in `src/modules/accounting/core/accounting-statements.controller.ts` and the three sibling handlers under `src/modules/finance/reports/` keep the old behaviour, on the same URL prefix, with no gate objecting — `check:route-duplicates` reports 0 findings because the concrete paths differ. The same split makes every ownership question ("who owns `accounting/reports`?") unanswerable from the tree.
*Fix:* absorb `src/modules/finance/**` into `src/modules/accounting/**` — per the standing rule that a rewrite absorbs the old module rather than standing beside it. Move `banking/` and `ai/` under `accounting/` too and decide whether `finance/bank-accounts`, `finance/bank-imports`, `finance/reconciliation/:id`, `finance/transfers` and `finance/ai` are renamed (breaking change, coordinate with `hooks/api/accounting/banking.ts` in the same commit per PRD-C019) or kept as versioned aliases. Rename the 7 `src/db/schema/accounting/finance-*.ts` files in the same change. Then add a gate asserting that each top-level route prefix maps to exactly one `src/modules/*` folder, with the `public`/`webhooks` protocol namespaces as named exceptions — nothing checks this today.

**F5 — P2 — `streamlineos-backend/src/scripts/check-import-direction.mjs:197`**
The gate's own summary states its reach: 230 files under `src/common`, 4.0% of `src/`. It enforces one edge (`common → modules`) and has an empty baseline.
*Failure scenario:* `src/modules/payroll/x.service.ts` deep-imports `src/modules/hr/internal/y.ts` — the exact "deep imports across module ownership" PRD-C033 forbids — and the gate is silent, because it never looks outside `src/common`. The frontend equivalent gate catches 177 of these; the backend catches none.
*Fix:* extend the scan to `src/modules/**`, classifying an import as a violation when it crosses a module folder boundary and does not resolve to that module's declared public interface. Seed a baseline from the measured count rather than failing on day one, and record the reach in the summary line so a future narrowing is visible.

**F6 — P2 — `streamlineos-frontend/frontend/features/notifications/components/template-preview.tsx:3`**
56 unused imports in a 176-line `"use client"` component, including `framer-motion`, `react-hook-form`, `@hookform/resolvers/zod`, `sonner`, `@/components/ui/sheet`, `@/components/ui/form`, `@/components/ui/alert-dialog` and `@/features/notifications/components/template-approval-dialog`. Twelve files carry 453 of the frontend's 752 unused symbols. Introduced by the page-splitting commits `18fc95934`, `28a300bb4`, `ad0e0fc5f`, which copied each page's whole import header into every fragment.
*Failure scenario:* 383 first-party unused imports are false edges in the module graph. Today none of them is load-bearing — I checked all 2,121 `@/` targets and **0** are reached only by a phantom edge — but every future deletion proof under PRD-C034 has to be argued past them, and `TemplateApprovalDialog` already shows the shape: imported by 3 files, referenced by fewer.
*Fix:* covered by F3's fix — raising the rule to `error` deletes all 453 mechanically. Prioritise these 12 files because they are also the largest inputs to the currently-failing `check:route-bundle-budget`.

**F7 — P2 — `streamlineos-frontend/frontend/.scratch/mint-session.mjs:6`**
`git ls-files frontend/.scratch` returns 5 tracked files. `mint-session.mjs` derives the Auth.js session-token key with HKDF from `NEXTAUTH_SECRET` and encrypts a JWE; `admission-probe.mjs:12` posts it to the backend with `x-internal-secret` and `x-session-proof` headers and captures the returned bearer token. No hardcoded secret values (all read from `process.env`), but the handshake is fully documented in runnable form.
*Failure scenario:* the repo is a working recipe for minting an authenticated session from the two env secrets. Anyone with read access to the repo plus either secret has a one-command path to a valid bearer token, and nothing tests, owns or reviews these files.
*Fix:* `git rm` all five, add `frontend/.scratch/` to `.gitignore` (4 more untracked `t26-*.mjs` are already accumulating there), and if the probe is needed keep it in a developer's own scratch directory.

**F8 — P2 — `streamlineos-backend/src/modules/notifications/providers/notification-provider.interface.ts:11`**
`validateConfig(config: unknown): Promise<ProviderValidationResult>` is declared once and implemented five times (`sandbox`, `notification-whatsapp`, `notification-web-push`, `notification-email`, `notification-sms`). `grep -rn "validateConfig" src` returns exactly those six lines — **no caller**. The dead-code ledger's REMOVE verdict on `providerValidationResultSchema` is the downstream symptom.
*Failure scenario:* an operator saves an SMS provider with a wrong account SID. Nothing validates it at save time, so the configuration is accepted and the first evidence is a failed delivery inside `notification-delivery-worker.service.ts` — after the notification was owed to a user.
*Fix:* decide the seam. Either wire it into the provider-save path in the notifications admin controller and keep the schema, or delete the interface member, the five implementations and the schema together.

**F9 — P2 — `streamlineos-frontend/frontend/lib/query-keys.ts:19`**
16 partitions spread-merged into one `queryKeys` object. Seven are `X-and-Y` bucket names; `accountingAndSupportQueryKeys` and `supportAndWorkflowsQueryKeys` both own support keys.
*Failure scenario:* two partitions declare the same member name. JavaScript spread resolves it silently by source order — `hrEngagementQueryKeys` wins over everything, `humanResourcesQueryKeys` loses to everything — with no TypeScript error, because both members are structurally compatible key factories. A mutation then invalidates the losing family while reads use the winning one, and the stale value is served until the page is reloaded. Measured today: **136 distinct members, 0 collisions**. `key-factory-contract.test.ts` (267 lines) checks factory shapes and does not check disjointness.
*Fix:* add one assertion to `key-factory-contract.test.ts` — sum the partitions' own key counts and assert it equals `Object.keys(queryKeys).length`. Then rename the seven `X-and-Y` files to their domain owner and move members accordingly.

**F10 — P2 — `streamlineos-backend/src/modules/support/core/support-drafts.service.ts:20`**
Twelve `_`-prefixed parameters sit on the module's own service methods, not on framework callbacks: `support-drafts.service.ts:20,33,47`; `support-macros.service.ts:49,70`; `support-workspace.service.ts:79,97,113,132`; `comment-drafts.service.ts:26`; `notification-preference-rules.service.ts:33,41`; and `notification-delivery-class.ts:115` (`resolveDeliveryClassForEvent(_eventKey)` ignores its only argument and always returns `PRODUCT_EVENT` — documented as intentional, but the parameter is then pure noise).
*Failure scenario:* every caller must still compute and pass a `userId` these methods discard, and the signature says the method is user-scoped when it is membership-scoped. A future reader adds a user-level check "back" and finds the parameter already threaded, so it looks safe to trust — while the actual scoping is `userMembershipId`. (I checked the adjacent risk and it does **not** fire: `support_ticket_drafts` has `UNIQUE (ticket_id, user_membership_id)` in the live catalog, matching the `onConflictDoUpdate` arbiter at `support-drafts.service.ts:39` exactly, so the upsert is inferable and correct.)
*Fix:* drop the parameter from the signature and from every caller.

**F11 — P2 — `streamlineos-backend/src/modules/payroll/payout/publishing.service.ts:37`**
Seven unused non-static `private` members, on a surface of 4,567 across 1,224 files that no configured check reaches. Verified individually: `publishing.service.ts:37 private readonly efService: EmploymentFactsService` (injected, never referenced), `kb-page-status.service.ts:29 private async setStatus(...)` (never called in its 204 lines), `ai-credits-reservation.service.ts:32 private readonly logger` (never used), plus unused `logger` fields in `data-quality-producers.service.ts`, `email-webhook.service.ts`, `kb-articles.service.ts`, `support-kb.service.ts`.
*Failure scenario:* `efService` forces `EmploymentFactsService` to remain resolvable in the payout module's injector for a field nobody reads — a DI edge that blocks moving or deleting that service and that no test would notice. `setStatus` reads as the page-status write path while the real one is elsewhere.
*Fix:* remove all seven; enabling `noUnusedLocals` (F3) makes the class permanently visible.

**F12 — P2 — `streamlineos-frontend/frontend/components/hr/_onboarding/restricted-field-change.ts:1`**
No kebab-case gate exists in the frontend; I measured 5,248 files and 1,186 directories and found exactly one violation, an underscore-prefixed directory imported from `components/hr/onboarding-wizard.tsx:21–25`.
*Failure scenario:* `_`-prefixed is a Next.js private-folder convention inside `app/`; using it under `components/` signals "excluded from routing" in a tree where routing never applied, and it is the only precedent a future author will copy. The absence of the gate means the 0-violation state is unprotected.
*Fix:* rename to `components/hr/onboarding-steps/` and update the five imports; port `check-kebab-case.mjs` to the frontend with Next.js route conventions (`(group)`, `[param]`, `@slot`) as declared exceptions.

**F13 — P2 — `streamlineos-frontend/frontend/features/candidates/candidate-profile-card.tsx:1`**
`features/candidates` (7 files) has no route and exactly three consuming files, all under `features/hr/recruitment/candidate-detail/`, while `features/hr/recruitment/{candidates,candidates-list,candidate-detail}` also exist.
*Failure scenario:* four directories own candidate UI. A change to the candidate card shape lands in one and the other three keep rendering the old one; the split also holds 7 permanent entries in the `cross-feature-import` baseline that can never be retired while the directory exists.
*Fix:* move the 7 files into `features/hr/recruitment/candidate-detail/`, delete `features/candidates`, and lower `BASELINE_CROSS_FEATURE` by the measured delta in the same commit. Same treatment for `features/payments` (11 files, one consumer) and `features/security/turnstile-widget.tsx` (1 file, one consumer).

**F14 — P2 — `streamlineos-backend/package.json:131`**
`"lint": "eslint \"src/**/*.ts\" \"test/**/*.ts\" \"src/**/*.mjs\" \"scripts/**/*.mjs\""` omits `evals/**/*.ts`, although `eslint.config.mjs:64` includes `evals/**/*.ts` in its rule block and lines 51–62 argue at length that evals is first-class code linted on the same terms as `src/`.
*Failure scenario:* the config change was made and the glob was not, so the rules apply to nothing. I linted `evals/**/*.ts` directly — 34 files, **0 errors, 0 warnings** — so this is latent, not live. It stops being latent the first time somebody edits an eval.
*Fix:* add `"evals/**/*.ts"` to the glob.

**F15 — P2 — `streamlineos-backend/src/common/auth/principal.ts:130`**
`function principalAuditIdentity(principal: Principal): PrincipalAuditIdentity` — a 20-line exhaustive switch over every principal kind, not exported, `grep -rn "principalAuditIdentity" src` returns only the declaration.
*Failure scenario:* it is the only place that maps a principal to `{actorKind, actorRef}` for audit. If audit records are meant to carry actor attribution for agent tokens and system jobs, the mapping exists and is not wired; if they are not, the function is dead weight that reads as if they are. Either way the reader cannot tell which from the code.
*Fix:* find the audit write path, and either call it there or delete it with its `PrincipalAuditIdentity` interface.

---

## 4. What head already gets right

Recorded because a truthful audit has to say where the ratchets held.

1. **Migrations are exactly consistent.** 677 `.sql` files, 677 journal entries, 0 orphaned files, 0 journal entries without a file. The failure this project has hit before (27 orphans, a whole wave unjournalled) does not recur.
2. **Nest module registration is complete.** 218 module classes declared, 217 reachable from `AppModule`, **0 unreachable**; 216 modules and 1,209 providers confirmed independently by the outbox gate.
3. **Outbox coverage is total.** 24 emitted event types, 29 declared, **29 registered consumers** — every emitted type has a consumer reachable from `AppModule`.
4. **Backend kebab-case is enforced over a real corpus.** 6,543 entries scanned under `src`, 0 violations, 2 of 2 recorded exceptions still present. I checked the unscanned remainder (`test/`, `scripts/`) myself: also 0.
5. **No dead files in either repo, and I tried hard to find some.** knip: 0 unused files backend (9,904-file graph, 69,468 edges), 0 unused files and 0 unused exports over baseline frontend. I built an independent 28,498-edge importer index and tested the strongest disproof available — that 383 phantom import edges hide dead files — and found **0 targets reachable only by phantom edges**. Six apparent orphans all turned out to have real barrel or in-directory consumers.
6. **Frontend route ownership is genuinely canonical.** 547 of 640 route files import exactly one feature; of the 28 multi-owner routes, 25 are CRM/inventory (out of scope) and the remaining 3 are `landing`+`seo` and `seo`+`analytics` compositions.
7. **`check:routes` now passes** — 655 route directories walked, 2 allowlisted handlers re-checked, exit 0. The PRD §2 note recording it as exit 1 on `api/media/image/route.ts` is stale.
8. **Query-key hygiene holds where it is gated.** `check:query-scope` exit 0 over 5,365 files; `check:query-signal` exit 0 over 1,056 `queryFn` blocks in 426 files; 136 key members with **0** cross-partition name collisions.
9. **Cache namespaces balance.** 75 read namespaces vs 76 bump namespaces over 1,076 service files, with 1 named dead bump (`chat:unread`) and 4 unresolved module-local factories — all reported, none hidden.
10. **`check:route-duplicates`, `check:module-manifest`, `check:gate-wiring`** all exit 0 with real output (0 operationId duplicates, 0 ambiguous param routes, 100 gates all invoked from a reachable job).
11. **The one ON CONFLICT I chased is correct.** `support-drafts.service.ts:39` arbitrates on `[ticketId, userMembershipId]` and the live catalog has `uniq_support_ticket_drafts_ticket_membership UNIQUE (ticket_id, user_membership_id)` — inferable, no runtime failure. Reported as a non-finding.

---

## 5. Not measured / blocked

- **Whether CI's dead-code result differs from local.** F2 makes them differ in principle (`.claude/worktrees` exists locally, not in CI) but I did not run the gate in a CI-shaped checkout. Measuring it needs a clean clone, which conflicts with this wave's read-only constraint on the shared tree.
- **Typecheck and build.** `tsc --noEmit`, `next build` and `nest build` were not run — explicitly excluded by the laptop budget. So the claim that removing the 899 production unused symbols compiles is **NOT MEASURED**; it needs one central `pnpm typecheck` in each repo after the cleanup batch (PRD-C035).
- **`--max-warnings 0` behaviour.** I measured warning counts but did not run `eslint --max-warnings 0` to confirm the exit code flips, because the counts settle it arithmetically.
- **Runtime effect of the 453 unused imports on bundle size.** Whether Next/webpack tree-shakes them out of the route chunks is **NOT MEASURED**; `pnpm check:route-bundle-budget` (currently failing for other reasons) after a `next build` with and without those imports is what would measure it.
- **`check:alert-ack`.** Still unrunnable — needs a real `ALERT_WEBHOOK_URL` and a human acknowledgement. Not in this ticket's scope; noted because it is the one remaining inconclusive backend gate.
- **A committed inventory artifact.** §1 and §C107 of this report are the inventory and the classification, but producing them as a repo artifact — plus flipping the PRD checkboxes and the traceability manifest in the same commit, as the ticket's completion-evidence section requires — is a write, which this wave forbids. That is the remaining deliverable for the execution wave, not an infrastructure blocker.
- **Working-tree contamination.** All frontend counts were taken against a tree with 31 uncommitted source changes from a concurrent lane. The one place it changed a verdict (`check:import-direction`, 179 vs 177) is attributed line by line above; the eslint counts may drift by a handful of symbols against a clean HEAD.

---

## 6. Criterion summary

| criterion | status | one-line basis |
|---|---|---|
| PRD-C025 | **not-met** | TS unused flags absent from all 4 tsconfigs; ESLint rule at `warn` with no `--max-warnings`; 1,155 unused symbols pass every gate; `varsIgnorePattern`/`caughtErrorsIgnorePattern` configure escapes the criterion forbids; 4,567 `private` members unchecked, 7 of them dead. |
| PRD-C105 | **partially-met** | All 16 named dimensions inventoried with counts in §1, but no artifact exists at head and none is committed. |
| PRD-C106 | **not-met** | Kebab-case and frontend route ownership hold; 14 of 76 backend route prefixes have >1 owning module folder, `accounting/*` is split across 320 files in 2 folders, 5 frontend directories are parallel locations, and the backend import-direction gate reads 4% of `src`. |
| PRD-C107 | **not-met** | No classification exists (5 symbol-level verdicts in the dead-code ledger vs ~11,000 files). §C107 above is the first one: KEEP-by-default, 9 REFACTOR groups (~320 files) and 6 REMOVE groups, each with the failure it prevents. |
