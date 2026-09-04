# PRD-C105 — module and ownership inventory

Emitted by `frontend/scripts/check-inventory-counts.mjs`. Re-run it rather than trusting the numbers below;
every row states the rule that produced it so it can be re-derived.

| frontend | `7633c38b947a57b285403e70fd340e1c149b5fe6` (`release/v2-closeout`) |
|---|---|
| backend | `8f319495c2c4aa17b198581829ac956b9e2a2fbd` (`release/v2-closeout`) |
| measured | 2026-09-04 |

The counts are of the WORKING TREE; the SHAs above are of `HEAD`. On a clean checkout those are the
same corpus. In a shared checkout with uncommitted work they are not, and `--check` will report drift
for every file another change has added since this was emitted — which is the staleness it exists to catch.
| dimension | count | how it is counted |
|---|---:|---|
| backend module folders | **74** | immediate subdirectories of src/modules/ |
| backend controllers | **551** | *.controller.ts under src/, specs excluded — 568 @Controller( decorators |
| backend implementations | **1080** | *.service.ts under src/, specs excluded |
| backend DTO/Zod schemas | **821** | production files under src/ declaring z.object( — 166 dto/ directories · 2844 z.object( sites |
| backend database schema files | **350** | .ts under src/db/schema/ — 22 domain folders · 813 pgTable( declarations |
| backend migrations | **690** | migrations/*.sql — 685 journal entries · 5 .sql not journalled · 0 journal entries with no file |
| backend workers | **18** | production .ts under src/ whose basename contains 'worker' |
| backend cache keys | **131** | factory entries parsed out of src/common/cache/cache-keys.ts by the resolver check:cache-key-shapes uses |
| backend event consumers | **25** | production files declaring `readonly eventType =`, the same shape check:outbox-consumers gates on |
| backend tests | **2197** | *.spec.ts / *.e2e-spec.ts under src/ — 95 files under test/ |
| backend fixtures | **19** | paths under a fixtures/ directory or with 'fixture' in the basename |
| backend operational scripts | **447** | src/scripts/** and scripts/** |
| frontend routes | **600** | app/**/page.tsx — 40 layout.tsx · 2 route.ts |
| frontend components | **383** | .ts/.tsx under components/ — 35 top-level dirs · 2843 files under features/ in 48 dirs |
| frontend hooks | **599** | .ts/.tsx under hooks/ — 577 under hooks/api/ |
| frontend TanStack keys | **136** | two-space-indented members of the query-key factories in lib/**query-keys** — 19 partition files |
| frontend tests | **429** | *.test.ts(x) / *.spec.ts(x) and anything under __tests__/ |
| frontend fixtures | **19** | paths under fixtures/, __fixtures__/, mocks/, __mocks__/ or test-utils/, or with 'fixture' in the basename |
| frontend operational scripts | **53** | scripts/** |
| frontend authored source files | **5349** | .ts/.tsx under app, components, features, hooks, lib |
