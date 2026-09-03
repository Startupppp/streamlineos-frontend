# Ticket 26 — Dead-code and dependency-cycle contraction — audit at current head

**Audited:** 2026-09-03 · read-only, no repository file was modified.
**Backend head:** `66f09164f7056b377331bcc1fff5f128ada06b95` on `release/code-10-10-v2`
**Frontend head:** `26df21488854b5ca72b938802295965783f8b948` on `release/code-10-10-v2`
**Criteria:** PRD-C023, PRD-C024, PRD-C026, PRD-C028 (source `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md:195,196,198,200`)
**Prior report:** none. All evidence below was reconstructed from scratch.

**Verdict: PARTIALLY MET.** One criterion (C024) is met on its substance but fails an explicit
sub-clause; three (C023, C026, C028) are not met, and one of them — C023 — fails its own gate at
head with exit 1.

---

## 1. What I read, with numbers

### Corpus enumerated

| | Backend (`streamlineos-backend`) | Frontend (`streamlineos-frontend/frontend`) |
|---|---|---|
| Authored TS/TSX in scope | 5,720 `.ts` under `src/` | 5,364 `.ts`/`.tsx` (excl. `node_modules`, `.next*`, `feedbucket-widget`) |
| `.spec.ts` | 1,922 | — |
| `*.module.ts` | 218 | — |
| `*.controller.ts` | 550 | — |
| `*.service.ts` | 1,078 | — |
| worker services | 29 | — |
| `src/scripts/` (`.mjs` / `.ts`) | 208 / 152 | — |
| root `scripts/` | 56 files | 48 files |
| `test/` + `evals/` | 87 + 34 | — |
| `app/` route files | — | 1,224 files · **600 `page.tsx`** · 2 `route.ts` |
| `features/` | — | 2,793 files · 39 feature barrels |
| `components/` / `hooks/` / `lib/` / `types/` | — | 373 / 577 / 283 / 95 |
| `hooks/api/` | — | 524 files |
| query-key factories | — | 134 entity groups · **1,058 leaf factories** |
| **Shared packages** | `pnpm-workspace.yaml` exists in the backend repo only; **there is no shared package** in either repo. C023's "shared packages" dimension is vacuously satisfied — reported, not skipped. | |

### Gates executed (all run by me, this session)

| Command | Repo | Exit | Result |
|---|---|---|---|
| `pnpm check:dead-code` | backend | **0 PASS** | 0 unused files, 7 findings, 5 ledger verdicts (1 KEEP · 2 WIRE · 2 REMOVE); importer graph 9,905 files / 69,472 edges |
| `pnpm check:dead-code:self-test` | backend | **0 PASS** | 20 assertions |
| `pnpm check:cycles` | backend | **0 PASS** | 5,727 files, "No circular dependency found", **37 files skipped** |
| `pnpm check:module-di` | backend | **0 PASS** | 218 modules · 1,715 classes · 0 violations; Check-D: 1,745 decorated classes · **217 modules reachable from AppModule** · 1,778 registered · **0 unregistered** |
| `pnpm check:module-di:self-test` | backend | **0 PASS** | 54 assertions |
| `pnpm check:dead-code` | frontend | **1 FAIL** | knip raw files=4 exports=37 types=59; buckets DEAD 0 · OUT-OF-SCOPE 2 · RETAINED-BY-CONTRACT 55 · RETAINED-BY-CONVENTION 19 · KEEP 10 · EXCLUDED 12 · **UNCLASSIFIED 2** |
| `pnpm check:dead-code:self-test` | frontend | **0 PASS** | 21 assertions |
| `pnpm check:cycles` | frontend | **0 PASS** | 5,367 files, "No circular dependency found", 42 skipped (20 external subpath exports, 22 generated `page.js` refs) |

### Measurements I took beyond the gates

- Re-ran backend madge **with** `--ts-config tsconfig.json` and `test/` included: 5,808 files, **0 warnings, still zero cycles**.
- Built a synthetic cycle fixture in scratch (plain 2-file · barrel re-export · dynamic `import()` · Nest `forwardRef` module pair) and ran **both** repos' exact madge invocations against it — see §3.2.
- Full `@typescript-eslint/no-unused-vars` sweep at `{args:"all", caughtErrors:"all", vars:"all"}` over both repos (13.6 s backend / 10.1 s frontend).
- Reachability analysis of every `@Module` class in `src/`.
- Zero-reference analysis of all 416 backend script files and all 48 frontend script files.
- Dead-factory analysis of all 1,058 frontend query-key leaves.
- Intra/extra-file reference analysis of all 1,607 exported Zod schema constants in backend `*.schema(s).ts`.
- Cross-feature import census over all 2,793 files under `frontend/features/`.

---

## 2. PRD-C023 — fail-closed dead-code analysis · **NOT MET**

> *Run fail-closed dead-code analysis over the backend, frontend, shared packages, workers and
> scripts; require zero unclassified unused files, dependencies, exports and exported types in the
> in-scope code. CRM/Inventory and generated/vendor artifacts must be reported separately, not
> silently included or deleted.*

### 2.1 Dimension walk

| Dimension | State |
|---|---|
| backend | gate exists and passes — but over a corpus that is 58.4 % stale duplicate checkouts (F-1) |
| frontend | gate exists and **fails, exit 1, 2 unclassified exports** (F-2) |
| shared packages | none exist in either repo — vacuous, reported |
| workers | 29 backend worker services; all reachable from AppModule (`check:module-di` Check-D: 0 unregistered). Covered. |
| scripts | 416 backend + 48 frontend script files. The backend gate exempts **all 416** by rule (`EXECUTABLE_RE`), and **17 of them have zero reference anywhere in the repository** (F-6). |
| zero unclassified | **frontend = 2, not 0.** Hard fail. |
| CRM/Inventory reported separately | ✅ correct in both gates — backend `EXCLUDED` class, frontend `EXCLUDED` bucket with 12 entries. Nothing is silently deleted. |
| generated/vendor separate | ✅ backend `OUT_OF_SCOPE_SEGMENTS`, frontend `isExcludedScanDir` (dot-prefixed + explicit list, self-tested for the `.next-buildmart` regression). |

### 2.2 The gate's own corpus is unsound (F-1) — the headline

`src/scripts/check-dead-code.mjs:77-79` declares the out-of-scope set as an explicit allowlist:

```js
const OUT_OF_SCOPE_SEGMENTS = new Set([
  "node_modules", "dist", "coverage", ".git", "migrations", ".scratch", ".scan", "graphify-out",
]);
```

`.claude` is not in it, and `walkSource` (`:147-160`) starts at the repository root. Measured:

```
walkSource visits: 14,737 files   of which under .claude*: 8,608  (58.4 %)
breakdown: .claude 8608 · src 5927 · test 109 · scripts 56 · evals 34 · 3 root files
```

`.claude/worktrees/` holds **two full sibling checkouts of this same repository**
(`bold-napier-7a4a41`, `eager-robinson-08f763`). The gate's own PASS output names one of them as
the evidence for a retention:

```
[type] src/modules/ai/core/dto/request.schemas.ts:MeetingPrepInput
  — inferred type of `meetingPrepSchema`, which is parsed at a live boundary in
    .claude/worktrees/bold-napier-7a4a41/src/modules/ai/core/controllers/crm-ai.controller.ts
```

I verified against the real checkout: `meetingPrepSchema` and `MeetingPrepInput` appear **only** at
`src/modules/ai/core/dto/request.schemas.ts:64` and `:71`. Nothing in `src/` or `test/` parses with
it. `src/modules/ai/core/controllers/crm-ai.controller.ts` exists at head but does not reference it.

The gate's own doc comment (`:255-257`) states the intended behaviour: *"A schema nothing parses
with is a contract nobody enforces, and that stays a finding."* With `.claude` pruned,
`schemaNamesFor` still finds `meetingPrepSchema`, `buildSymbolIndex` returns no other user,
`inferredTypeOfLiveSchema` returns `null`, `classifyFinding` falls through to `UNCLASSIFIED`, and
`main()` exits 1 at `:593-597`. **The backend gate's PASS is produced by the contamination.**

The same walk feeds `buildImporterMap`, so `classifyFile` can answer "has a live importer" from a
stale checkout too. No file-level false retain is active today (knip reported 0 unused files), but
the mechanism is live and the scan floors (`graphFiles: 500`, `graphEdges: 2000`) are ~20× and ~35×
below the contaminated numbers, so they cannot detect it.

The frontend gate is immune: `isExcludedScanDir` returns true for any `name.startsWith(".")`
(`scripts/check-repo-paths.mjs:101-103`). The one-line fix for the backend is the same predicate.

### 2.3 The frontend gate is red at head (F-2)

```
UNCLASSIFIED (2):
  [export] hooks/api/id-cursor-page-schema.ts:idCursorPageContract
  [export] hooks/api/offset-page-schema.ts:offsetPageContract

FAIL: 2 unclassified export(s) — add a WIRE or KEEP entry to EXPORT_VERDICTS for each
```

Both are *values*, so the `DATA_LAYER_CONTRACT_RE` type exemption correctly does not cover them. The
gate is behaving exactly as designed; head is what is wrong. The two symbols are not cosmetic:

- `hooks/api/offset-page-schema.ts:23` `offsetPageContract` has **zero** consumers, while the type
  `OffsetPage<T>` it exists to validate is used at **18 call sites across 17 files** in the shape
  `apiClient.get<OffsetPage<X>>(...)` — a bare type assertion with no Zod parse. This is the
  unvalidated-boundary case the gate's own comment (`scripts/check-dead-code.mjs:42-44`) names.
- `hooks/api/id-cursor-page-schema.ts:19` `idCursorPageContract` is dead only because
  `hooks/api/module-access/module-access-schema.ts:117` declares a **private byte-equivalent
  duplicate** of it rather than importing the shared one.

### 2.4 "Zero unclassified" is measured against a structurally narrowed denominator

Both gates reach "zero unclassified" partly by rule rather than by evidence.

**Backend** — files matching `CONVENTION_FILE_RE` (`:63-64`), `EXECUTABLE_RE` (`:67`) or `SCHEMA_RE`
(`:74`) can never receive a `DEAD` verdict:

```
src files walked: 5,944
  CONVENTION_FILE_RE (*.module.ts, *.controller.ts, *.spec.ts, *.e2e-spec.ts, main.ts):  2,846
  EXECUTABLE_RE (src/scripts/):                                                             361
  SCHEMA_RE (src/db/schema|seeds):                                                          352
  union structurally exempt:                                                    3,526 (59.3 %)
```

**Frontend** — of the 55 `RETAINED-BY-CONTRACT` entries, **all 55** come from a blanket rule, none
from per-symbol evidence: 46 from `DATA_LAYER_CONTRACT_RE` (`:46`), 8 from `CONTRACT_BARRELS`
(`:19-25`), 1 from `FEATURE_BARREL_RE` (`:27`). A further 19 come from `TEST_INFRA_RE` (`:48`) and
`PRE_IMPLEMENTATION_CONTRACTS` (`:50-52`).

I classified all 46 `DATA_LAYER_CONTRACT_RE` retentions by what they actually are:

| Actual shape | Count | Matches the rule's stated justification? |
|---|---|---|
| `export type X = z.infer<typeof contract>` | 14 (30 %) | yes |
| pure re-export of a type declared elsewhere | **27 (59 %)** | no |
| local `export interface` / `export type`, not `z.infer` | 4 | no |
| other | 1 | no |

The rule's premise — *"the inferred shape of a live data-layer contract, reached through the hook's
return type"* — is false for 32 of 46. `hooks/api/hr/recruitment/interviews.ts:34,40` re-exports
`SlaReportStage`, `SlaReportMonth`, `SlaReportStageSummary` and `BusyBlock`, which are plain
interfaces declared in `types/hr/interview-management.ts:64,117`; they are unused re-exports, not
erased contracts.

### 2.5 `ignoreExportsUsedInFile: true` hides a whole class of dead symbol (F-8)

Both `knip.json` files set `ignoreExportsUsedInFile: true` (backend `:25`, frontend `:34`). Combined
with the house pattern `export const xSchema = z.…` + `export type X = z.infer<typeof xSchema>`, a
dead pair covers itself: the schema looks used (by its own `z.infer` line) and only the type is
reported. That is exactly why knip reported `MeetingPrepInput` but not `meetingPrepSchema`.

I swept all 1,607 exported Zod schema constants in backend `*.schema(s).ts` and isolated the ones
with **no external reference in any `src/` or `test/` file AND no intra-file use beyond their own
`z.infer` alias** — 12:

```
src/modules/access/dto/user-module-access.schemas.ts:userModuleAccessParamsSchema
src/modules/ai/core/dto/output.schemas.ts:EmailToneSchema
src/modules/ai/core/dto/output.schemas.ts:StaleDealSchema
src/modules/ai/core/dto/request.schemas.ts:meetingPrepSchema
src/modules/chat/dto/chat.schemas.ts:pollQuerySchema
src/modules/expenses/dto/expense-outbox.schemas.ts:expenseExportRequestedPayloadSchema
src/modules/finance/reports/dto/finance-report-export.schemas.ts:financeReportExportRequestedPayloadSchema
src/modules/kb/retrieval/dto/kb-ai.schemas.ts:kbDocAiActionSchema
src/modules/notifications/dto/provider-result.schemas.ts:providerValidationResultSchema   ← the only one the gate reports
src/modules/platform/dto/platform.schemas.ts:visitUsageResponseSchema
src/modules/platform/dto/platform.schemas.ts:listCustomersQuerySchema
src/modules/realtime/dto/realtime.schemas.ts:chatMessagePayloadSchema
```

**11 of 12 are invisible to `check:dead-code`.** Two of them are the same defect the ledger already
records once: an outbox payload contract nothing validates.
`src/modules/finance/reports/finance-report-export.consumer.ts:18-20` ignores `event.payload`
entirely (it only wakes a worker), and `src/modules/expenses/expense-outbox.consumer.ts` parses its
`submitted` and `decided` siblings at `:68` but never the `export.requested` payload. The ledger
names only the GDPR instance (`gdpr-export-outbox.schemas.ts:GdprExportRequestedPayload`, WIRE).

**Corpus honesty note:** none of these numbers is "0 violations over nothing". The backend gate's
knip pass produced 7 findings over a 5,944-file walk; the frontend's produced 100 over 5,364 files;
the eslint sweeps covered 5,851 and 5,362 files respectively; the schema sweep covered 1,607
constants; the query-key sweep covered 1,058 factories.

---

## 3. PRD-C024 — dependency cycles · **PARTIALLY MET**

> *Remove every in-scope compile-time and runtime dependency cycle across backend modules, frontend
> features, shared packages, barrels and NestJS DI. Replace cycles with correct ownership,
> dependency inversion or a neutral seam; do not hide them with `forwardRef`, lazy/dynamic imports,
> re-export indirection, duplicated types or an exception baseline. The cycle gate and a
> bite-proven self-test must report zero cycles.*

### 3.1 Dimension walk

| Dimension | Finding |
|---|---|
| backend modules (file graph) | **zero cycles**, confirmed twice: default invocation (5,727 files) and my re-run with `--ts-config` + `test/` (5,808 files, 0 unresolved) |
| frontend features (file graph) | **zero cycles** over 5,367 files |
| frontend features (feature graph) | **two mutual pairs** — `build ↔ chat`, `candidates ↔ hr` (F-5). madge measures files; the criterion names *features*. |
| shared packages | none exist |
| barrels | backend invocation is **blind to alias-closed barrel cycles** (F-4, bite-proved). Frontend invocation catches them. |
| NestJS DI | `check:module-di` clean: 218 modules · 1,715 classes · 0 violations; 217/217 app modules reachable from AppModule; 0 unregistered providers |
| `forwardRef` | **exactly 1 occurrence in the whole backend**: `src/modules/crm/consent/crm-consent.module.ts` — CRM, out of scope for this release. **In-scope code uses zero.** ✅ |
| lazy / dynamic imports | 5 non-spec `await import()` in `src/`, all legitimate lazy loads of heavy or node built-in modules (`pdf-parse`, `mammoth`, `node:crypto`, `@upstash/redis`). None breaks a cycle. ✅ |
| `ModuleRef` lazy resolution | 15 files; only **one** in production code — `src/common/admission/admission.guard.ts:110`, an optional hint-provider lookup with `{ strict: false }`, not a cycle break. ✅ |
| re-export indirection | not used to hide a cycle; it *is* used to hide dead code (see C026) |
| duplicated types | present (`PaginatedResult` ×4, `PayrollWorkerType` ×2, `idCursorPageContract` ×2) but none of them breaks a cycle — the shared originals import nothing that would close one |
| exception baseline | **none.** No `.madgerc` in either repo; both `check:cycles` are bare madge invocations with no ignore list, no baseline file, no allowlist. ✅ |
| **bite-proven self-test** | **absent in both repos** (F-3) |

### 3.2 I performed the bite proof the criterion asks for (F-3, F-4)

Neither repo ships a `check:cycles:self-test`. `check:dead-code`, `check:module-di`,
`check:module-lifecycle` and ~40 other backend gates all have one; the cycle gate does not. So I
built the fixture and ran both repos' exact invocations against it.

Fixture: (a) plain 2-file cycle `a↔b`; (b) cycle closed through a barrel, where `feat/y.ts` imports
`"src/feat"` (the alias) rather than `"./index"`; (c) cycle through `await import()`; (d) two Nest
modules importing each other via `forwardRef`.

| Invocation | plain | **barrel via alias** | dynamic | forwardRef | exit |
|---|---|---|---|---|---|
| backend `madge --circular --extensions ts src` | ✅ | **❌ MISSED** | ✅ | ✅ | 1 |
| frontend `madge --circular --ts-config tsconfig.json --extensions ts,tsx …` | ✅ | ✅ | ✅ | ✅ | 1 |
| control (no cycle) | — | — | — | — | 0 |

Both invocations bite on exit code (1 on cycles, 0 when clean), so the gate is a real gate. But the
backend invocation omits `--ts-config`, and `tsconfig.json:13-16` declares `paths: { "src/*": ["src/*"] }`.
It therefore drops every alias edge. On the real repository that is **37 skipped module specifiers**,
including `src/db/schema` (the root schema barrel), `src/app.module`, `src/modules/access/access.service`
and `src/common/auth/backend-claims`. C024 names *barrels* as a dimension and *re-export indirection*
as a banned hiding mechanism, and this is precisely the shape the backend gate cannot see.

**The blind spot is currently benign** — my `--ts-config` re-run resolved all 37 and still found
zero cycles — but the gate cannot be relied on to keep it that way.

### 3.3 Two frontend feature-level cycles stand (F-5)

Census over 2,793 files in `frontend/features/`: **216 cross-feature import statements across 39
distinct feature pairs**, of which two pairs are mutual:

**`build ↔ chat`**
- `features/build/project-detail/project-chat-page.tsx:13-16` → `@/features/chat/{ably-provider, message-panel, channel-info-panel, use-chat-mobile}`
- `features/chat/chat-bubble.tsx:38-39`, `chat-entity-pills.tsx:22-23`, `internal-link-preview.tsx:16-17`, `ticket-mention-picker.tsx:8` → `@/features/build/shared/{status-badge, format-ticket-key}`

**`candidates ↔ hr`**
- `features/candidates/candidate-sheets.tsx:12` → `@/features/hr/hr-sheet`
- `features/hr/recruitment/candidate-detail/candidate-detail-sidebar.tsx:4-6`, `candidate-detail-page.tsx:33`, `candidate-detail-tabs.tsx:17-19` → `@/features/candidates/*`

`madge --circular` reports zero because no single *file* closes a loop. Root `CLAUDE.md` §9 requires
one-directional flow and `frontend/CLAUDE.md` §3 bans feature→feature imports outright; C024 names
"frontend features" as a cycle dimension. The correct fix is the criterion's own prescription —
a neutral seam: promote `status-badge` / `format-ticket-key` and `HrSheet` to `components/shared`
(which `frontend/CLAUDE.md` §3 already mandates on a second consumer).

---

## 4. PRD-C026 — unused symbols · **NOT MET**

> *Remove unused imports, variables, parameters, functions, classes, constants, enums, types,
> interfaces, Zod schemas, DTOs, hooks, query keys, context values, feature flags and re-exports. An
> exported symbol is not considered used merely because a barrel exports it.*

### 4.1 The barrel clause is contradicted by the frontend gate itself (F-7)

`frontend/scripts/check-dead-code.mjs:213-219`:

```js
if (CONTRACT_BARRELS.has(filePath))   return { cls: "RETAINED-BY-CONTRACT", reason: "named intentional barrel" };
if (FEATURE_BARREL_RE.test(filePath)) return { cls: "RETAINED-BY-CONTRACT", reason: "feature barrel extension point" };
```

That is the exact inverse of the criterion's last sentence. Nine findings are retained by it, and I
verified every one is a genuinely dead re-export:

- `components/shared/index.ts:12-19` re-exports `RichPanel`, `RichHero`, `RichQuickAction`,
  `RichSectionHeader`, `RichIconWell`, `RichPageContent`, `type RichTone`, `type RichWellTone`.
  All three real consumers (`features/settings/organization/organization-settings-page.tsx:5`,
  `org-settings-chrome.tsx:5`, `features/settings/webhooks/webhook-delivery-log.tsx:19`) import
  **directly from `@/components/shared/rich-surface`**, bypassing the barrel.
- `features/employee-self-service/index.ts:3` re-exports `MyAttendancePage`; the only consumer,
  `app/(authenticated)/me/attendance/page.tsx:1`, imports it directly from
  `./components/my-attendance-page`.

### 4.2 Unused imports / variables / parameters — measured (F-9)

`@typescript-eslint/no-unused-vars` at `{ args: "all", caughtErrors: "all", vars: "all",
ignoreRestSiblings: false }`, run by me over both repos:

| | files linted | files with findings | findings | naming a `_`-prefixed identifier |
|---|---|---|---|---|
| backend (`src/`+`test/`+`evals/`) | 5,851 | 909 | **2,125** | 1,706 (80.3 %) |
| frontend (`app`,`components`,`features`,`hooks`,`lib`,`types`,`test-utils`) | 5,362 | 1,005 | **2,087** | 1,308 (62.7 %) |
| **combined** | 11,213 | **1,914** | **4,212** | **3,014 (71.6 %)** |

Backend breakdown: 1,991 "defined but never used", 133 "assigned a value but never used", 2 other.

Nothing enforces this at head: `@typescript-eslint/no-unused-vars` is `"warn"` with
`argsIgnorePattern`/`varsIgnorePattern`/`caughtErrorsIgnorePattern` all `^_` in both repos
(`backend/eslint.config.mjs:68-75`, `frontend/eslint.config.mjs:20-23`), and
`noUnusedLocals`/`noUnusedParameters` are **absent from every tsconfig in both repos** (grep returned
nothing). That enforcement half is PRD-C025 / ticket 25 — but C026's *removal* half is measurably
undone, and this is the number that measures it.

I verified the worst offender is real, not a parser artefact:
`features/notifications/components/template-preview.tsx` is a 176-line file whose import block
declares **56 symbols that appear nowhere else in the file** — `useCallback` (`:3`), `Plus` (`:4`),
`motion`/`useReducedMotion` (`:5`), `useForm` (`:6`), `zodResolver` (`:7`), `PageWrapper` (`:9`),
`Button` (`:10`), … Confirmed by grep: `PageWrapper` and `Button` occur exactly once each, on their
import lines. Five sibling files in `features/notifications/` are in the same shape (50, 45, 44, 41,
41, 35, 33, 30 findings). All are live files with real importers — this is unused imports inside
live code, not dead files.

### 4.3 Query keys — 181 of 1,058 dead (F-10)

C026 names query keys explicitly. Census over `lib/query-keys/` (16 domain files, 134 entity groups,
1,058 leaf factories) against all 5,367 app files:

- **9 entity groups** have zero `queryKeys.<group>` reference outside `lib/query-keys/`:
  `recurringInvoices`, `playbook`, `aiCrm`, `platform`, `meetingsAi`, `reports`, `salesAnalytics`,
  `supportAiSettings`, **`featureFlags`** (the criterion names feature flags too).
- **181 leaf factories** have zero reference. Splitting out CRM/Inventory (out of scope):
  **145 in scope**, 36 excluded.

In-scope dead leaves by file: `human-resources.ts` 47 · `support-and-workflows.ts` 21 ·
`accounting-and-support.ts` 15 · `platform-core.ts` 13 · `access-and-crm.ts` 9 ·
`directory-and-ownership.ts` 9 · `knowledge-and-surveys.ts` 7 · `payroll.ts` 6 ·
`growth-and-sign.ts` 5 · `collaboration.ts` 4 · `hr-engagement.ts` 3 · `users-and-commerce.ts` 3 ·
`platform-hierarchy.ts` 2 · `build-work.ts` 1.

False-positive control: there is no `const { … } = queryKeys` destructuring anywhere in the app, and
I spot-checked `queryKeys.featureFlags`, `queryKeys.hr.leaveBalance`, `queryKeys.platform.admins`,
`queryKeys.reports`, `queryKeys.chat.search` — all return 0 references outside `lib/query-keys/`.

### 4.4 Duplicated types and constants (F-11)

- `PaginatedResult<T>` is declared **four times**: `hooks/api/module-access/types.ts:85` (exported,
  re-exported at `index.ts:15`, imported by nobody) plus private re-declarations at
  `hooks/api/hr/enterprise-ops-identity.ts:47` and `hooks/api/hr/enterprise-ops-event-stream.ts:27`.
- `PayrollWorkerType` is declared twice with two different definitions:
  `hooks/api/payroll/runs-schema.ts:153` as `z.infer<typeof payrollWorkerTypeContract>` and
  `types/payroll/runs.ts:14` as a hand-written union. Root `CLAUDE.md` §6: *"Type via `z.infer`,
  never a parallel `interface`."* Two sources for one union is a silent-drift shape.
- `idCursorPageContract` duplicated at `hooks/api/module-access/module-access-schema.ts:117`.

### 4.5 An uncalled seam the ledger already names but has not removed (F-12)

`src/modules/notifications/providers/notification-provider.interface.ts:11` declares
`validateConfig(config: unknown)`. It is implemented by **five** providers
(`sandbox.provider.ts:27`, `notification-whatsapp.provider.ts:128`,
`notification-web-push.provider.ts:29`, `notification-email.provider.ts:86`,
`notification-sms.provider.ts:125`) and **called by nothing anywhere in `src/`** — my grep returned
the interface declaration and the five implementations, and nothing else. Its Zod contract
`providerValidationResultSchema` is the gate's single reported `REMOVE`. The gate classified this
correctly; C026 requires it be *removed*, and it has not been.

### 4.6 Stale configuration

`backend/tsconfig.json:15` still maps `"@casl/ability": ["node_modules/@casl/ability/dist/types/index.d.ts"]`.
`backend/CLAUDE.md` §5 states CASL is fully removed from both repos; `@casl` is absent from
`package.json` and `node_modules/@casl` does not exist. A path mapping to a nonexistent package.

---

## 5. PRD-C028 — unused files and folders · **NOT MET**

> *Remove unused files and folders including abandoned routes, controllers, providers, modules,
> components, hooks, workers, jobs, adapters, tests, fixtures, mocks, scripts, assets and styles
> after proving that no static, dynamic, reflective, generated, CLI, package-script or side-effect
> entry point reaches them.*

### 5.1 Runtime-registration proof — this half is genuinely met ✅

The ticket headline demands "runtime-registration proof". `check:module-di` supplies it and I ran it:

```
Check-D: 1,745 decorated class(es) · 217 modules reachable from AppModule · 1,778 registered
         · 0 unregistered · exempt: 2 enhancer · 2 factory · 1 aliased · 1 base-class
```

I independently enumerated every `@Module` class in `src/`: **219 declared**, of which the two not
reachable from `AppModule` are `ArchitectureEvidenceModule` (`src/scripts/architecture-evidence.module.ts`)
and `EmploymentVerificationContextModule` (`src/scripts/employment-verification-context.ts`) —
standalone `createApplicationContext` bootstraps for CLI scripts, correctly outside the app graph.
That leaves **217 app modules, 217 reachable — no orphan module, no orphan controller, no orphan
provider.** The "abandoned routes / controllers / providers / modules / workers / jobs / adapters"
clauses are proven met.

Reflective/dynamic/side-effect entry points are also modelled: the backend gate's `buildImporterMap`
records `sideEffect`, `named`, `reexport` and `dynamic` edges separately (`:181-194`), and its
self-test asserts all four (assertions n/o/p/q).

### 5.2 Where the proof does not reach

`check:dead-code` cannot report `DEAD` on **59.3 % of the backend `src/` corpus** (§2.4). Of the
three exempt classes, the module/controller/provider portion is covered by `check:module-di`; the
`.spec.ts`/`.e2e-spec.ts` (1,922 files), `src/scripts/` (361) and `src/db/schema|seeds` (352)
portions are covered by nothing. C028 names "tests, fixtures, mocks, scripts" explicitly.

### 5.3 17 script files with zero entry point (F-6)

I checked all **223 non-spec `.mjs`** under `src/scripts/` + `scripts/` against every other file in
the repository (`package.json`, `.github/**`, `src/**`, `scripts/**`, `docs/**`). Seventeen have
**zero reference in any other file** — no package script, no workflow, no doc, no import. All are
git-tracked.

| File | Classification | Reason |
|---|---|---|
| `scripts/unregistered-injectables.mjs` | **REMOVE** | superseded by `check:module-di` Check-D, which does the same job (`@Injectable` classes no module provides), is wired into the gate suite, has 54 self-test assertions, and is strictly stronger (it also proves AppModule reachability). Its own header describes the exact defect Check-D now owns. |
| `src/scripts/apply-build-fk-migrations.mjs` | **REMOVE** | one-shot migration applier for a completed FK wave; reads `DATABASE_URL` directly and applies raw SQL outside the journal — running it now is a hazard, not a tool |
| `src/scripts/gen-build-fk-migrations.mjs` | **REMOVE** | generator half of the same completed one-shot |
| `src/scripts/backfill-org-regions.mjs` | **REMOVE** | one-shot backfill; region placement is now enforced by `check:placement-bypass` and `withNewOrgInRegion` |
| `scripts/apply-migration-file.mjs`, `scripts/apply-pending-migrations.mjs` | **REFACTOR** | real operator tools that duplicate `db:apply-one`; either give each a package script (so it has a CLI entry point and C028 is satisfied) or fold into the existing one |
| `scripts/backfill-public-object-urls.mjs` | **REFACTOR** | pairs with the live `check:public-object-urls` gate; needs a package script naming it as the remediation path |
| `src/scripts/compare-bootstraps.mjs` (306 lines), `src/scripts/browser-driver-auth.mjs`, `scripts/db-query.mjs`, `scripts/kb-seed-realistic.mjs`, `scripts/measure-hnsw-hybrid.mjs`, `scripts/measure-hnsw-plan.mjs`, `scripts/rls-audit.mjs`, `scripts/rls-find-data.mjs`, `scripts/rls-find-nonempty.mjs`, `scripts/seed-employment-read-scale.mjs` | **KEEP + REFACTOR** | genuine hand-run diagnostics referenced by `backend/CLAUDE.md` §3–§7 practice (benchmark as `streamline_app`, measure in buffers, cold-bootstrap parity). They are not dead — but C028 requires a *proven* entry point, and "someone runs it by hand" is not one. Add a `check:`/`db:` package script for each, then they are covered. |

The frontend's 48 script files are all referenced — **zero orphans**. This is a backend-only gap.

### 5.4 A dead file retained by a hand-written exemption (F-13)

`frontend/lib/backend-token-contract.ts` is a **two-line file** with **zero importers**:

```ts
export const INTERNAL_TOKEN_AUDIENCE = "streamlineos-api";
export const INTERNAL_TOKEN_ISSUER = "streamlineos-web";
```

Neither literal appears anywhere else in `app/`, `components/`, `features/`, `hooks/`, `lib/` or
`types/`. It is retained by `PRE_IMPLEMENTATION_CONTRACTS` (`scripts/check-dead-code.mjs:50-52`) with
the reason *"consumers are being written in the token-authority lane; no importers yet is the
expected state"*. C028 requires proving an entry point reaches a file; a promised future consumer is
not one, and the exemption carries no owner, no ticket and no removal date.

### 5.5 Two untracked scratch files at the frontend root

`.tmp-cookie.mjs` and `.tmp-decode-cookie.mjs` (created today, 22:17–22:18) sit at
`frontend/`, are **untracked and not gitignored**, and are picked up by knip's `project` glob
(`**/*.{ts,tsx,mjs,cjs}`). The gate classifies them `OUT-OF-SCOPE` correctly. Not a release defect —
but there is no `.gitignore` rule for `.tmp-*`, so a stray scratch file at that path is committable.

---

## 6. Findings

| # | Sev | File:line | Summary | Failure scenario | Proposed fix |
|---|---|---|---|---|---|
| F-1 | **P1** | `backend/src/scripts/check-dead-code.mjs:77` | `OUT_OF_SCOPE_SEGMENTS` omits `.claude`, so `walkSource` traverses two full sibling checkouts in `.claude/worktrees/`: 8,608 of 14,737 files (58.4 %) of the module graph and symbol index are stale duplicates | Live today: `MeetingPrepInput` is retained as `RETAINED-BY-CONTRACT` with the evidence `".claude/worktrees/bold-napier-7a4a41/…/crm-ai.controller.ts"`, yet `meetingPrepSchema` appears **only** at `src/modules/ai/core/dto/request.schemas.ts:64,71` in the real checkout. Remove the worktrees and the gate goes UNCLASSIFIED → exit 1. Conversely, any dead export whose name survives in a stale checkout is silently retained, and the scan floors (500 files / 2,000 edges) are 20×–35× too low to notice | Prune dot-directories in `walkSource`, exactly as the frontend does (`scripts/check-repo-paths.mjs:101-103`: `name.startsWith(".")`); raise `SCAN_FLOOR.graphFiles` to a value derived from `src/` alone (≈5,900) so contamination or collapse both trip it |
| F-2 | **P1** | `frontend/scripts/check-dead-code.mjs:517` (fail site); `frontend/hooks/api/offset-page-schema.ts:23`, `frontend/hooks/api/id-cursor-page-schema.ts:19` | `pnpm check:dead-code` exits 1 with 2 unclassified exports — a direct C023 breach at head | `offsetPageContract` has zero consumers while `OffsetPage<T>` is used at 18 `apiClient.get<OffsetPage<X>>(…)` call sites in 17 files with no Zod parse. If the backend renames `items`→`data` on any of those 21 offset routes, every one returns `{data:[…]}`, `.items` is `undefined`, and the screen throws `Cannot read properties of undefined (reading 'map')` instead of raising `CONTRACT_VIOLATION` | Import `offsetPageContract` at the 17 call sites (matching how `cursorPageContract` is used at `hooks/api/organization-schema.ts:40`, `roles-schema.ts`, `accounting/ar-schema.ts:52`); delete the private duplicate at `hooks/api/module-access/module-access-schema.ts:117` and import the shared `idCursorPageContract` |
| F-3 | **P1** | `backend/package.json:138`, `frontend/package.json:15` | C024 requires "a bite-proven self-test"; neither repo has `check:cycles:self-test`, while ~40 sibling backend gates do | A regression in the madge invocation (a wrong `--extensions`, a wrong root, a swallowed exit code) produces "No circular dependency found!" over an empty or truncated graph and reads identically to a clean codebase | Add `check:cycles:self-test` in both repos that runs the same invocation against a committed fixture containing a plain cycle, an alias-closed barrel cycle, a dynamic-import cycle and a `forwardRef` module cycle, asserting exit 1 and 4 reported cycles, plus a clean-fixture case asserting exit 0. My scratch fixture reproduces all five cases |
| F-4 | **P1** | `backend/package.json:138` | `check:cycles` omits `--ts-config tsconfig.json` while `tsconfig.json:13` declares `paths: {"src/*": ["src/*"]}`, so every alias edge is dropped — **37 module specifiers skipped** on the real run, including `src/db/schema`, `src/app.module`, `src/modules/access/access.service` | Bite-proved on a fixture: a cycle closed through a barrel where one member imports `"src/feat"` instead of `"./index"` is reported by the frontend invocation and **missed entirely** by the backend one. C024 names barrels and re-export indirection specifically. (Currently benign: my `--ts-config` re-run over 5,808 files found 0 cycles) | `madge --circular --ts-config tsconfig.json --extensions ts src test` — the run I performed; it resolves all 37 and stays green |
| F-5 | **P1** | `frontend/features/chat/chat-bubble.tsx:38`; `frontend/features/build/project-detail/project-chat-page.tsx:13`; `frontend/features/candidates/candidate-sheets.tsx:12`; `frontend/features/hr/recruitment/candidate-detail/candidate-detail-sidebar.tsx:4` | Two feature-level dependency cycles — `build ↔ chat` and `candidates ↔ hr` — inside 216 cross-feature imports across 39 pairs | `madge --circular` measures files and reports zero, so the gate certifies "zero cycles" while the criterion's own dimension ("frontend features") holds two. Deleting or moving `features/build/shared/status-badge.ts` breaks four chat components that no `build` maintainer would look at | Promote `getStatusBadgeClass`/`getStatusDotClass`/`formatTicketKey` and `HrSheet` to `components/shared` (already mandated by `frontend/CLAUDE.md` §3 on a second consumer); add a feature-granularity cycle check so the gate measures what the criterion names |
| F-6 | P2 | `backend/scripts/unregistered-injectables.mjs:1` (+16 more, §5.3) | 17 git-tracked backend script files have zero reference in any other repository file; the gate exempts all 416 script files by rule (`check-dead-code.mjs:67`) | `unregistered-injectables.mjs` is a stale reimplementation of `check:module-di` Check-D; a future agent runs it, gets a different answer from the wired gate, and trusts the wrong one. `apply-build-fk-migrations.mjs` applies raw SQL outside the Drizzle journal — the exact shape that orphaned 27 migrations before | REMOVE the 5 superseded/one-shot files; give each surviving operator tool a `package.json` script so it has the CLI entry point C028 demands |
| F-7 | P2 | `frontend/scripts/check-dead-code.mjs:214,217`; `frontend/components/shared/index.ts:12-19`; `frontend/features/employee-self-service/index.ts:3` | `CONTRACT_BARRELS` / `FEATURE_BARREL_RE` retain 9 dead re-exports, directly inverting C026's closing sentence | All three `Rich*` consumers import from `@/components/shared/rich-surface` directly, and `app/(authenticated)/me/attendance/page.tsx:1` imports `MyAttendancePage` directly — the barrel lines are unreachable. The rule guarantees no barrel re-export can ever be reported dead | Replace the two blanket rules with per-symbol evidence: retain a barrel re-export only when some file imports that symbol *through the barrel*. Then either delete the 9 lines or repoint the 4 consumers at the barrel |
| F-8 | P2 | `backend/knip.json:25`; `backend/src/modules/finance/reports/dto/finance-report-export.schemas.ts:44`; `backend/src/modules/expenses/dto/expense-outbox.schemas.ts:58` | `ignoreExportsUsedInFile: true` lets a `z.infer` alias vouch for its own schema; 12 exported Zod schemas are dead by measurement and **11 are invisible to the gate** | `financeReportExportRequestedPayloadSchema` guards an outbox payload that `finance-report-export.consumer.ts:18-20` never reads — `handle()` only calls `worker.wake()`. `expenseExportRequestedPayloadSchema` is never parsed while its siblings are (`expense-outbox.consumer.ts:68`). A malformed or cross-tenant payload reaches the worker unvalidated, and the gate says nothing | Report an export as unused when its only in-file consumer is its own `z.infer` alias (the backend gate already has `inferredTypeOfLiveSchema` machinery to invert); then classify all 12 — parse the two outbox payloads at their consumers, delete the rest |
| F-9 | P2 | `frontend/features/notifications/components/template-preview.tsx:3-10` (worst of 1,914 files) | 4,212 unused-symbol findings across 1,914 files (backend 2,125/909, frontend 2,087/1,005); 3,014 (71.6 %) name a `_`-prefixed identifier | `template-preview.tsx` is 176 lines with 56 imports referenced nowhere else in the file — `PageWrapper`, `Button`, `useCallback`, `Plus`, `motion`, `useReducedMotion`, `useForm`, `zodResolver`. Verified by grep: `PageWrapper` and `Button` occur exactly once each, on their import lines. Six sibling files in `features/notifications/` are in the same shape | Remove them, starting with the eight `features/notifications/**` files that account for 340 findings. Enforcement (C025/ticket 25) must land with the three `^_` patterns deleted, or the rule reports "on" over the 71.6 % it cannot see |
| F-10 | P2 | `frontend/lib/query-keys/human-resources.ts` (47 of the dead leaves) | 181 of 1,058 query-key leaf factories and 9 of 134 entity groups have zero reference outside `lib/query-keys/`; 145 leaves are in scope, 36 are CRM/Inventory | C026 names query keys and feature flags explicitly, and the dead `featureFlags` group covers both. A dead factory is live surface area: the next author writes `queryKeys.hr.leaveBalance()` believing something already invalidates it, and no mutation does | Delete the 145 in-scope dead leaves and the 8 in-scope dead groups; report the 36 CRM/Inventory ones separately per C023 |
| F-11 | P2 | `frontend/hooks/api/module-access/module-access-schema.ts:117`; `frontend/hooks/api/hr/enterprise-ops-identity.ts:47`; `frontend/hooks/api/hr/enterprise-ops-event-stream.ts:27`; `frontend/types/payroll/runs.ts:14` | Duplicated contracts and types: `idCursorPageContract` ×2, `PaginatedResult<T>` ×4, `PayrollWorkerType` ×2 with two different definitions | `PayrollWorkerType` exists as `z.infer<typeof payrollWorkerTypeContract>` (`hooks/api/payroll/runs-schema.ts:153`) *and* as a hand-written union (`types/payroll/runs.ts:14`). A backend enum widening updates the contract; the hand-written union silently keeps the old member set and every consumer typed against it accepts a value the contract now rejects at runtime | Delete the private duplicates and import the shared originals; delete the hand-written `PayrollWorkerType` (root `CLAUDE.md` §6: type via `z.infer`, never a parallel declaration) |
| F-12 | P2 | `backend/src/modules/notifications/providers/notification-provider.interface.ts:11` | `validateConfig` is declared on the provider interface and implemented five times, and called by nothing anywhere in `src/`; its Zod contract is the gate's one reported `REMOVE` | Five provider classes carry a method body nobody can reach, and `providerValidationResultSchema` guards a boundary that does not exist. A maintainer adding a sixth provider implements a method that will never run | Either wire the seam (call `validateConfig` from the provider-config write path in `notifications`) or delete the interface member, the five implementations and `provider-result.schemas.ts:14` together. The gate's REMOVE verdict is a classification, not a removal |
| F-13 | P2 | `frontend/lib/backend-token-contract.ts:1-2`; `frontend/scripts/check-dead-code.mjs:50` | A 2-line file with zero importers retained by a `PRE_IMPLEMENTATION_CONTRACTS` exemption with no owner, ticket or removal date | C028 requires proof that an entry point reaches a file; the exemption's reason is a promise about future work. Neither `"streamlineos-api"` nor `"streamlineos-web"` appears elsewhere in the app, so the constants are unused too | Delete the file and the exemption, or attach a named consumer and a removal date and put both in the reason string (root `CLAUDE.md` C027 pattern: named consumer + removal date + contract test) |
| F-14 | P2 | `frontend/scripts/check-dead-code.mjs:46` | `DATA_LAYER_CONTRACT_RE` blanket-retains 46 exported types under `hooks/api/**`; only 14 (30 %) match its stated justification. 27 are pure re-exports, 4 are plain local declarations | `hooks/api/hr/recruitment/interviews.ts:34,40` re-exports `SlaReportStage`, `SlaReportMonth`, `SlaReportStageSummary`, `BusyBlock` — plain interfaces from `types/hr/interview-management.ts:64,117`, not erased contracts. The rule certifies them as live under a reason that is factually false, and no future dead type in `hooks/api/**` can ever be reported | Narrow the rule to what it claims: retain only where the file actually declares `export type <name> = z.infer<typeof …>` and that contract constant is referenced from another file — the exact predicate the backend gate already implements at `check-dead-code.mjs:258-274` |
| F-15 | P2 | `backend/tsconfig.json:15` | `paths` still maps `"@casl/ability"` to `node_modules/@casl/ability/dist/types/index.d.ts`, which does not exist; `backend/CLAUDE.md` §5 records CASL as fully removed and `@casl` is absent from `package.json` | An agent reading `tsconfig.json` concludes CASL is still a dependency and reintroduces `@CheckAbility`/`AbilityGuard`, which §5 lists under NEVER | Delete the mapping |
| F-16 | P2 | `backend/src/scripts/check-dead-code.mjs:273` | The retention evidence string reports the *first* file `buildSymbolIndex` happened to walk, not the authoritative consumer — it named `__tests__/org-setup-completed-tenant-isolation.spec.ts` as the "live boundary" for `OrgSetupCompletedPayload` when the real consumer is `org-setup-completed-consumer.service.ts:106` | A reviewer reading the gate output concludes a DTO is test-only and deletes it, or accepts a genuinely test-only symbol believing production uses it. Compounded by F-1, the "live boundary" can be a stale worktree | Prefer a non-spec, non-worktree consumer when one exists; state how many consumers were found |
| F-17 | P2 | `frontend/package.json:15` | `--exclude "node_modules|\.next"` does not fully exclude the alternate `distDir` `.next-buildmart/`: madge processed 5,367 files against 5,364 authored, and the 22 skipped `…/page.js` specifiers trace to `.next-buildmart/dev/types/validator.ts`. Reproduced on a fixture | Generated build output sits inside the cycle corpus. Materiality today is 3 files; if the generated type surface grows, a fabricated or masked cycle becomes possible | Add `\.next-buildmart` (or `^\.` for all dot-dirs) to the exclude regex, matching what `isExcludedScanDir` already enforces for the dead-code gate |
| F-18 | P2 | `frontend/architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md:195,196,198,200` | The ticket's own "Completion evidence" is undone: PRD-C023/C024/C026/C028 are all still `- [ ]`, and `TRACEABILITY.md` carries no status for ticket 26 | The release cannot state which criteria are satisfied from its own manifest | Update both in the completion commit, with the commit SHAs, commands and pass/fail counts the ticket requires |

**No P0.** Nothing found here loses data, leaks across tenants, corrupts money, or 500s a route.
The two closest to a runtime defect are F-2 (an unvalidated response boundary on 21 list routes,
which fails as a crash or an empty list rather than a leak) and F-8 (two outbox payloads reaching
workers unparsed, where the org check is still enforced by the outbox row's own `organizationId`).

---

## 7. What head already gets right

1. **Runtime registration is genuinely proven, and independently.** `check:module-di` Check-D:
   1,745 decorated classes, 217/217 app modules reachable from `AppModule`, **0 unregistered**, with
   a 54-assertion self-test. My independent enumeration agrees (219 `@Module` classes, the 2
   non-reachable ones being CLI bootstraps in `src/scripts/`). This is the hardest half of C028 and
   it is done.
2. **The file-level import graph really is acyclic in both repos** — and I verified the backend's
   under a *stronger* invocation than the gate uses (5,808 files, `--ts-config`, `test/` included,
   0 unresolved specifiers, 0 cycles).
3. **`forwardRef` is used exactly once in the entire backend**, and that one is in
   `src/modules/crm/consent/crm-consent.module.ts` — CRM, out of scope. In-scope backend code uses
   zero. C024's hardest prohibition holds by measurement, not by assertion.
4. **No cycle exception baseline exists.** No `.madgerc`, no ignore list, no allowlist, no baseline
   file in either repo. Both `check:cycles` are bare invocations. C024's anti-baseline clause holds.
5. **Dynamic imports and `ModuleRef` are not used to hide cycles.** All 5 production `await import()`
   are legitimate lazy loads of heavy or built-in modules; the single production `ModuleRef.get`
   (`src/common/admission/admission.guard.ts:110`) is an optional-provider lookup with
   `{ strict: false }`.
6. **CRM/Inventory and generated artefacts are reported separately, never silently deleted** — the
   backend gate's `EXCLUDED`/`OUT-OF-SCOPE` classes and the frontend's `EXCLUDED` bucket (12
   entries) and `OUT-OF-SCOPE` bucket (2). Both are self-tested (backend assertions g/h/k; frontend
   e/m0/m1/m2, including the "an authored dir merely starting with `next-` must not be swallowed"
   case).
7. **Both dead-code gates are genuinely fail-closed by design.** Unclassified → exit 1; stale
   verdict → exit 1; below scan floor → exit 1. The frontend baseline is `{deadFiles: 0,
   deadExports: 0}` — zero tolerance, not a ratchet. Both self-tests explicitly assert the *bite*
   cases (backend i/l/t, frontend i/l/p/q/r), and both now count assertions rather than printing a
   literal.
8. **The backend gate refuses to call a schema file dead on knip's word alone** (`SCHEMA_RE`,
   self-test case d), preserving the spec-guarded `hrms-phase1-sql-managed.ts` arrangement.
9. **The ledger only shrinks.** Both gates fail on a stale verdict, so the classification file cannot
   accumulate into a graveyard.
10. **knip's ignore lists are narrow and justified** — 36 files (backend permission catalog), 36 + 3
    + 5 (frontend permission catalog, illustrations, 5 named shadcn primitives). Both catalogs are
    covered by the bidirectional `catalog-sync` tests `backend/CLAUDE.md` §5 describes.
11. **The frontend's 48 scripts have zero orphans**, and its scan-dir exclusion (`startsWith(".")`)
    is the correct predicate — it is the pattern the backend gate is missing.

---

## 8. NOT MEASURED / blocked

| Item | Why | What would measure it |
|---|---|---|
| Whether removing the 145 dead query keys, 12 dead schemas and 9 dead re-exports leaves the build green | `npm run build` / `typecheck` are excluded by the laptop budget (8–12 GB each, 26 concurrent agents) | The orchestrator's central `pnpm build` (backend `nest build`, frontend `next build`) after the removal wave. `tsc --noEmit` alone is insufficient — it does not notice a missing side-effect import (`backend/CLAUDE.md` §10) |
| Runtime confirmation that the 17 orphan scripts are unreachable through a shell alias, a runbook outside the repo, or a developer's muscle memory | Only textual reachability inside the two repositories was measurable here | A `git log --follow` on each file plus a maintainer sign-off; or add the package script and let non-use surface over a release |
| Whether the unused `framer-motion` / `react-hook-form` imports in the 8 `features/notifications/**` files reach the client bundle | Requires a production build with bundle analysis; `check:route-bundle-budget` is one of the 3 currently-red frontend gates and is ticket 29's territory | `next build` + `check:route-bundle-budget` before and after removing the 340 unused imports in those files |
| Whether a feature-granularity cycle check would find more than the 2 mutual pairs at deeper nesting (e.g. `features/hr/recruitment/**` vs `features/candidates/**` as separate units) | My census treats `features/<name>/` as the unit, matching `frontend/CLAUDE.md` §6 | A dedicated gate with a configurable unit boundary |
| `check:alert-ack` | Needs a real `ALERT_WEBHOOK_URL` and a human acknowledgement (per the shared context) | Not this ticket's concern |

**Nothing in this ticket is blocked on database infrastructure.** Every criterion here is static
analysis; the two scratch databases were not needed and were not used.

---

## 9. Summary

| Criterion | Verdict | One-line reason |
|---|---|---|
| **PRD-C023** | **not met** | Frontend gate fails at head (exit 1, 2 unclassified); backend gate passes only because 58.4 % of its corpus is stale worktrees, with a live false-retain proved |
| **PRD-C024** | **partially met** | Zero file-level cycles in both repos, zero in-scope `forwardRef`, no baseline, no lazy-import hiding — but no bite-proven self-test exists (explicitly required), the backend invocation is blind to alias-closed barrel cycles (bite-proved), and two frontend *feature*-level cycles stand |
| **PRD-C026** | **not met** | 4,212 unused symbols across 1,914 files; 145 in-scope dead query keys; 9 dead re-exports the gate retains *because* a barrel exports them — the exact inverse of the criterion's closing sentence |
| **PRD-C028** | **partially met → not met** | Runtime-registration proof is genuine and complete (0 unregistered, 217/217 modules reachable), but 17 script files have no entry point, a 2-line dead file is retained by a hand exemption, and 59.3 % of the backend corpus can never receive a DEAD verdict |
