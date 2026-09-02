# 20b — Cache correctness: key mismatches, no-op prefix deletes, unbounded GDPR read

Agent territory: `BE/src/common/cache/**`, the HR headcount cache path, `BE/src/modules/gdpr/gdpr-rectification.service.ts`.
All numbers below come from commands I ran and read. No git commands were run.

---

## 1. Verdict up front

| Item | Before | After |
|---|---|---|
| `hr:headcount` read/bump counters | 2 different Redis keys | 1 |
| In-scope `invalidate(prefix)` no-ops | 4 call sites / 2 namespaces | 0 |
| In-scope namespace-counter mismatches | 4 (`hr:headcount` ×1, `ownership:transfers` ×3) | 0 |
| `check:unbounded-reads` | FAIL — 1 unclassified (`gdpr-rectification:281`) | **my path resolved** — 754 unbounded / 0 actionable. Gate was OK at 17:22; it now fails on a *different* path a concurrent agent introduced at 17:34 (see F8) |
| Backend `tsc --noEmit -p tsconfig.json` | — | **exit 0, 0 errors** |
| `check:cache-invalidation` | PASS (while all of the above were broken) | PASS — **the gate is vacuous, see §6** |

---

## 2. Defect 1 — `hrHeadcountNamespace` read and invalidated two different counters

Confirmed exactly as ticket 07 reported.

- Read: `OrgStructureService.getHeadcount` → `cachedVersioned(CACHE_KEYS.hrHeadcountNamespace(orgId), …)`
  → generation counter `cache:namespace:hr:headcount:<org>:version`, on the **default** Redis.
- Bump: `OrgHierarchyCacheService.invalidateAfterMutation` → `invalidateNamespaceForOrg(orgId, "hr:headcount")`
  → generation counter `cache:namespace:<org>:hr:headcount:version`, on the **region-resolved** Redis.

Two counters and, under a region registry, two different Redis instances. Headcount was stale after every
hierarchy mutation until TTL, forever.

**Fix** (`org-structure.service.ts:123`): the read moves to the org-scoped family the invalidator already used —
`cachedVersionedForOrg(orgId, "hr:headcount", \`group:${query.groupBy}\`, …)`. Chosen over moving the *bump* to the
global family because the `*ForOrg` path is the region-aware one: it resolves the org's Redis cell, applies the
region cache-key prefix (the tenant dimension PRD §5 asks about) and applies TTL jitter. Its sibling
`org:hierarchy` in the same method already used it, and one namespace on the primary Redis while its sibling sits
on a regional one is the asymmetry that bred this bug.

`CACHE_KEYS.hrHeadcountNamespace` had no remaining caller and was removed. `check-cache-invalidation.mjs:303`
and `check-namespace-coverage.mjs:61` still carry stale lookup-map entries for it — harmless (they are lookup
maps, and the `hr:headcount:<orgId>` matrix entry is unchanged), noted for ticket 35.

### The spec, rewritten to assert observable state

`BE/src/common/cache/org-hierarchy-cache.service.spec.ts` and
`BE/src/modules/hr/directory/org-structure-headcount.service.spec.ts` previously asserted
`expect(cache.invalidateNamespaceForOrg).toHaveBeenCalledWith(…)` and
`expect(cache.cachedVersioned).toHaveBeenCalledWith(…)`. Both assertions are satisfied by a read whose counter no
writer ever touches — which is precisely what shipped.

Both are now driven by the **real `CacheService` over `InMemoryRedis`** and assert the value a second caller gets
back. Each file carries a negative control (`InMemoryRedis(true)` drops the `incr`, so the stale value is still
served — proving the positive test is not vacuous), a cross-tenant test, and the hierarchy spec carries a
**regression witness** that exercises the pre-fix wiring inline and asserts it serves stale, so nobody
"simplifies" the two families back into one.

### Proof it bites

A throwaway spec containing the pre-fix wiring (`cachedVersioned(\`hr:headcount:${orgId}\`, …)` + the real
`invalidateAfterMutation`) was run and **failed** with the new assertion:

```
- Expected  - 1   "count": 13,
+ Received  + 1   "count": 12,
  at src/modules/hr/directory/zz-temp-bite-proof.spec.ts:32
```

The temp file was deleted immediately (verified: 0 files matching `zz-temp` remain). I deliberately did **not**
revert the production file to prove this — `in-memory-redis.test-double.ts:11` warns against it because five
agents share this working tree.

---

## 3. Defect 2 — "invalidation via parent prefix" does not exist

`CacheService.invalidate` is `redis.del(exactKey)`. There is no prefix mechanism anywhere in the repo
(`invalidatePattern`: 0 hits; no `redis.scan`, no `KEYS`). Every invalidation written as "delete the parent" is a
silent no-op.

### Repo-wide audit

I wrote a shape-resolving audit over all 3,500 `.ts` files: resolve every cache **write** key
(`cached` / `cachedForOrg` / `cachedForOrgWith` / `set` / `cachedVersioned*`) and every **invalidate** key
(`invalidate` / `del` / `invalidateForOrg` / `invalidateNamespace*`) through `CACHE_KEYS` and module-local key
factories, normalise `${…}` to `*`, then flag any invalidate shape that is a wildcard-aware **segment prefix** of
a write shape (a delete that cannot reach what was written), and any namespace bump whose namespace no versioned
read uses (a counter mismatch).

Results: 218 write sites / 188 distinct write shapes, 499 invalidate sites, 75 namespaces.

**False-prefix deletes — 4 sites, 2 namespaces, both in scope, both fixed:**

| Site | Deleted | Actually written | Fix |
|---|---|---|---|
| `hr/directory/employee-onboarding.service.ts:432`, `hr/lifecycle/termination-lifecycle.service.ts:107` | `hr:celebrations:<org>` | `hr:celebrations:<org>:<actor>:<scope>:<day>` | read → `cachedVersionedForOrg(orgId,"hr:celebrations", …)`, bump → `invalidateNamespaceForOrg` |
| `hr/directory/employee-onboarding.service.ts:429`, `hr/lifecycle/termination-lifecycle.service.ts:104` | `hr:analytics:<org>` | also `hr:analytics:attendance:<org>:<y>:<m>` and `hr:analytics:attrition:<org>:<y>` | all three reads → one `hr:analytics` namespace, bump → `invalidateNamespaceForOrg` |

The celebrations key never matched anything at all; the analytics one matched the overview key and silently
missed its two siblings. Post-fix audit: **falsePrefix = 0**.

**Namespace-counter mismatches — 4 sites, all fixed:**

`ownership:transfers` was read by `OwnershipTransfersService` via `cachedVersionedForOrg(orgId,"ownership:transfers", …)`
(counter `cache:namespace:<org>:ownership:transfers:version`) and bumped six times correctly from `modules/ownership/**`,
but **three sites in `modules/module-access/**` bumped `invalidateNamespace(\`ownership:transfers:${orgId}\`)`** — a
different counter on a different Redis. So an ownership change made through the module-access surface left the
transfers list stale. Aligned to `invalidateNamespaceForOrg`.

Also added while in the same hook: `hr:directory` (`OrgStructureService.getDirectory`, a per-actor per-scope key
cached 5 min) had **no invalidation of any kind and no matrix entry**. It is now a versioned namespace bumped by
`invalidateAfterMutation` alongside `org:hierarchy` and `hr:headcount`. Three new `CACHE_INVALIDATION_MATRIX`
entries (`hr:directory`, `hr:celebrations`, `hr:analytics`) bring the matrix to 142 entries / 107 `kind:"write"`,
and the table-driven `cache-invalidation-matrix.spec.ts` read-after-write suite now exercises them automatically.

### Chosen remedy: type-level, not a new prefix primitive

**I made the misuse impossible at the type level. I did not add a SCAN or tracked-key-set primitive.** Reasons:

1. `BE/CLAUDE.md` §6 explicitly forbids it: *"Add no new request-path `invalidatePattern`/wildcard `SCAN` calls
   — that path is a compatibility fallback only."*
2. A real prefix primitive already exists and is strictly better: **namespace generation counters**. They are
   O(1), need no scan, and old generations expire naturally. Every defect in this report is a case of *not using
   it*, not of it being missing.
3. Adding a third mechanism beside `invalidate` and `invalidateNamespace` would multiply exactly the ambiguity
   ticket 07's P26 already flags ("two naming schemes for one cache is how the S-class stale-cache bugs happen").

The implementation is additive and breaks **zero** existing call sites — critical, since 8 modules are off-limits
to me and 263 invalidate sites exist:

```ts
declare const cacheNamespaceBrand: unique symbol;
export type CacheNamespace  = string & { readonly [cacheNamespaceBrand]: "namespace" };
export type ExactCacheKey   = string & { readonly [cacheNamespaceBrand]?: never };
```

The **optional-never** brand is the trick: a plain `string`, a template literal and a string literal are all
assignable to `ExactCacheKey`, but a `CacheNamespace` is not. All 45 `CACHE_KEYS.*Namespace` factories now return
`CacheNamespace`; `cached`, `get`, `set`, `invalidate`, `del`, `cachedForOrg`, `cachedForOrgWith`,
`invalidateForOrg` and `orgScopedKey` now take `ExactCacheKey`.

Verified with a throwaway probe compiled by the project's own `tsc` (then deleted): plain literals, template
literals and exact-key factories compile; `invalidate(CACHE_KEYS.finReportsNamespace(orgId))`,
`cached(CACHE_KEYS.invProductsNamespace(orgId), …)` and
`invalidateForOrg(orgId, CACHE_KEYS.crmOrganizationsListNamespace(orgId))` are all `TS2345`. A pre-check
confirmed 0 existing call sites violate this, so nothing outside my territory broke.

**Honest limit of the type fix.** It catches "a declared namespace reached an exact-key API". It cannot catch
"exact key A was used as a prefix of exact key B" (the `inv:reorder` / `hr:celebrations` shape), because nothing
in the type system knows that `inv:reorder:<org>` is a stem of `inv:reorder:paged:<org>:<hash>`. That residual
class is only reachable by a static gate — see §6, where I give ticket 35 the exact algorithm.

### Excluded Inventory sites — known, not silently ignored

This release excludes Inventory. These are real and remain broken; all are the same fallacy:

| Family | Written at | Invalidated by | Status |
|---|---|---|---|
| `inv:reorder:paged:<org>:<page>:<limit>` | `inventory/reports/inv-reports.service.ts:151` | `invalidate(CACHE_KEYS.invReorderReport(orgId))` — a different key | no-op (matrix claims "implicitly via inv:reorder parent", `cache-invalidation-inventory.ts:150`) |
| `inv:stock:summary-report:<org>:<scope>:<page>:<limit>` | `inv-reports.service.ts:102` | nothing | never invalidated |
| `inv:dashboard:<org>:<scopeKey>` | `inv-reports.service.ts:33` | `invalidate(CACHE_KEYS.invDashboard(orgId))` ×2 | no-op, base key never written |
| `inv:valuation:report:<org>:…` | `inv-reports-extended.service.ts:130` | nothing | never invalidated |
| `inv:slow-moving:<org>:…` | `inv-reports-extended.service.ts:213` | nothing | never invalidated |
| `inv:expiry:report:<org>:…` | `inv-reports-extended.service.ts:293` | nothing | never invalidated |

Consequence is staleness of aggregate reports until TTL, not a data leak and not preserved access. Whoever picks
up Inventory should apply the same conversion: one namespace per report family, `cachedVersionedForOrg` +
`invalidateNamespaceForOrg` in `StockEngineService.invalidateCaches`.

---

## 4. Defect 3 — `check:unbounded-reads` on `gdpr-rectification.service.ts:281`

The unbounded read was `select({id: hrPeople.id}).from(hrPeople).where(org, user, not-deleted)` with no bound,
feeding `inArray(hrEmployments.personId, personIds)` for a `.limit(1)` existence probe of the primary employment.

Fixed by removing the drain rather than capping it: the two queries collapse into one join using the repo's
canonical predicates from `modules/directory/employment-query.ts`:

```ts
const [employment] = await tx
  .select({ id: hrEmployments.id })
  .from(hrPeople)
  .innerJoin(hrEmployments, primaryEmploymentOfPerson(orgId))
  .where(livePersonOfUser(orgId, subjectUserId))
  .limit(1);
```

Behaviour-preserving: both former early-return branches produced the identical `{changed:false, …}` value.
No `.limit(N)` truncation was introduced — the surviving `.limit(1)` is an existence probe, as before.

```
pnpm -s check:unbounded-reads          # run at 17:22, immediately after the fix
  Scanned 2195 service files across 74 modules.
  unbounded reads : 754            (was 755)
  Actionable instance counts: offset 0 · unbounded 0
  OK — no gate violations
pnpm -s check:unbounded-reads:self-test → Self-tests passed.
```

**Re-run at 17:38 — the gate now FAILs again, on a path that is not mine.** `gdpr-rectification.service.ts`
no longer appears in the output at all (grep count 0); the single unclassified path is now
`/hr/recruitment/recruitment-automation.service.ts:321`, a cross-tenant candidate ownership check written by a
concurrent agent (file mtime 17:34, vs my last edit at 17:21). The unbounded total is still 754 and actionable is
still 0. Ownership of that one line belongs to whoever is doing the BOLA sweep — it needs a classification entry
or a bound. See F8.

---

## 5. Gate results (all run, output read)

| Command | Result |
|---|---|
| `pnpm -s check:cache-invalidation` | exit 0 — 1068 service files, "LOW-only — 0 documentation gaps" |
| `pnpm -s check:cache-invalidation:self-test` | exit 0 — all self-test cases pass |
| `node src/scripts/check-namespace-coverage.mjs` | PASS — 75 read namespaces, 76 bumps, **0 stale**, 1 dead bump, 4 unresolved |
| `node src/scripts/check-namespace-coverage.mjs --self-test` | exit 0 |
| `pnpm -s check:unbounded-reads` (+ `:self-test`) | OK — 0 violations |
| `tsc --noEmit -p tsconfig.json` (8 GB heap) | **exit 0, 0 errors** |
| `npx jest src/common/cache src/modules/hr src/modules/module-access src/modules/gdpr/gdpr-rectification src/modules/dashboard --maxWorkers=2` | **243 suites, 1892 tests, all pass** (17:30) |
| same, re-run at 17:40 excluding `assets-scope` (broken at 17:35 by another agent, F9) | **63 suites, 670 tests, all pass** |
| `npx jest src/modules/organization/hierarchy src/modules/branches --maxWorkers=2` | 19 suites, 70 tests, all pass |

---

## 6. The gate is vacuous. Here is the proof and the fix.

`check:cache-invalidation` passed green (exit 0, "0 documentation gaps") the entire time all four defects above
existed, and passes now. It did not catch them, and it structurally cannot. **I did not edit the script —
ticket 35 owns it.** Four findings, in ascending order of severity:

**(a) The main table→family loop is entirely dead.** `TABLE_TO_CACHE_FAMILIES` is 10 entries covering ~20 key
families — the bulk of the gate. `fileWritesToTable` tests regexes like `\.insert\s*\(\s*org_hierarchy\b`, i.e.
**snake_case Postgres table names**. Drizzle schema objects are camelCase. Measured across all of `src/`:

```
org_modules → 0 files      orgModules         → 2 files
inv_warehouses → 0         invWarehouses      → 2
role_assignments → 0       roleAssignments    → 9
organization_members → 0   organizationMembers→ 21
org_hierarchy → 0          (orgHierarchy / orgUnits)
module_ownerships → 0      moduleOwnerships   → 5
… all 10 table names: 0 matching files
```

Every one of the 10 entries matches zero of 1068 files, so **not a single family check ever executes**. The
`org_hierarchy → hr:headcount` row that was supposed to guard defect 1 has never run.

**(b) `KEY_MISMATCH_CHECKS = []`.** The section is literally named for this defect class, and its comment
describes the exact bug shape — *"a READ uses `cache.cached(CACHE_KEYS.factory(orgId))` producing key
`prefix:orgId` while the WRITER uses `invalidateForOrg(orgId,'prefix')` producing `orgId:prefix`. The two formats
never match; invalidation is a no-op."* — and then registers **zero** checks.

**(c) What actually blocks is four hand-written, file-specific checks:** `SCOPE_KEY_CHECKS` (1 entry, hardcoded
to `inv-warehouses.service.ts`), `MISSING_INVALIDATION_CHECKS` (2 entries, hardcoded to `clients.service.ts`),
and `checkModuleEnableSessionBust` (1 entry, hardcoded to `entitlements.service.ts`). The `matrix-gap` check is
LOW severity and never blocks. So the gate covers 4 named files out of 1068 and asserts nothing general.

**(d) Even where the family loop *would* run, its unit of comparison is wrong.** `fileHasPattern` regex-tests
whether a keyword *appears somewhere in the file*. The `hr:headcount` family accepts the substring
`"hr:headcount"` or `"invalidateAfterMutation"` — both present in the broken code. **A substring test can never
detect that the read key and the delete key are different strings.** The sibling `check-namespace-coverage.mjs`
has the same blind spot from the other direction: it normalises `hr:headcount:${orgId}` → `hr:headcount` and
`invalidateNamespaceForOrg(orgId,"hr:headcount")` → `hr:headcount`, declares them matched, and thereby *erases
the very org-prefix asymmetry that was the bug*.

### What the gate must assert instead (for ticket 35)

Compare **resolved key shapes**, not keyword presence. The algorithm below found all 4 in-scope defects plus the
6 excluded Inventory ones, with 0 false positives after two noise filters:

1. Resolve every cache **write** key to a shape: `cached`/`set` → arg 0; `cachedForOrg`/`cachedForOrgWith` →
   `<ORG>:` + arg 1; `cachedVersioned` → `<ns>:v*:<key>`; `cachedVersionedForOrg` → `<ORG>:<ns>:v*:<key>`.
   Resolve `CACHE_KEYS.*` by parsing `cache-keys.ts`, and module-local `const X = (a) => \`…\`` factories from
   the same file. Replace every `${…}` with `*`.
2. Resolve every **invalidate** key the same way (`invalidate`/`del` → arg 0, `invalidateForOrg` → `<ORG>:`+arg 1,
   `invalidateNamespace*` → the namespace).
3. **Fail** when an exact-key invalidate shape is a wildcard-aware *segment prefix* of some write shape
   (`segmentPrefix(p, c)`: split on `:`, `c` strictly longer, every position equal unless either side is `*`) —
   that is a delete that cannot reach what was written. Filter noise: skip shapes starting with `*`, and require
   the prefix to carry ≥2 literal segments.
4. **Fail** when a namespace bump's shape matches no `cachedVersioned*` read shape — that is a counter mismatch.
   Crucially, do **not** normalise `<ORG>:` away: the `*ForOrg` and global families produce genuinely different
   Redis keys and must not be treated as equal.
5. Keep the existing vacuity guard, and add one more: assert `TABLE_TO_CACHE_FAMILIES` matches ≥1 file per entry,
   or the table map silently rots again (it is 100% rotted today).

A bite proof for the gate: feed it a fixture where the read is `cachedVersioned(\`ns:${orgId}\`,…)` and the bump is
`invalidateNamespaceForOrg(orgId,"ns")`, and require a finding.

---

## 7. Findings outside my territory (not fixed)

| # | Finding | Location | Severity |
|---|---|---|---|
| F1 | 6 Inventory report cache families with unreachable invalidation — table in §3 | `modules/inventory/**` | P1, module excluded from release |
| F2 | `chat:unread` — 2 `invalidateNamespace` bumps, **zero readers** anywhere. Both guarded by specs that assert only that the mock fired (`chat-bola-proof.spec.ts:126`, `chat-read-cursor-monotonic.spec.ts:82`). Dead code presented as working invalidation. | `modules/chat/**` | P2 |
| F3 | **127 invalidations of keys nothing ever writes.** Confirmed by full-repo grep for 4 samples: `org:roles:<org>` invalidated at **13 sites** and read at none; `fin:payment-runs:<org>`, `hr:policies:list:<org>` (10 sites), `hr:salary-bands:<org>`, `hr:dashboard:payroll-summary:<org>`, `inv:stock:summary:<org>` (4 sites) — all write-free. This is ticket 07's P26 measured from the call sites. Harmless at runtime (a `del` on a missing key), but it is 127 places where a reader believes a cache is being invalidated. | repo-wide | P2 |
| F4 | `CACHE_TTL.VERY_LONG` = 1800s is **shorter** than `CACHE_TTL.HOUR` = 3600s (ticket 07 P29). Used 6× including 2 in `modules/rbac/**` (excluded), so I could not rename it safely. | `common/cache/cache-keys.ts:250` | P3 |
| F5 | `check-cache-invalidation.mjs` and `check-namespace-coverage.mjs` carry stale `hrHeadcountNamespace` map entries after I removed the dead factory. Harmless lookup-map rot; flagging so ticket 35 cleans it with the rest. | `src/scripts/**` | P3 |
| F6 | **Not mine:** `gdpr-subject-erasure.spec.ts`, `gdpr-subject-erasure-kb-erasure.spec.ts` and `gdpr-erasure-storage-sink.spec.ts` have 8 failing tests (`tablesAnonymised` contains `"users"`, `globalIdentityAnonymised` true≠false, KB chunk paging). `gdpr-subject-erasure.service.ts` was modified at 17:27, after my last edit and by another agent. I never touched that file; `gdpr-rectification*` specs all pass. | `modules/gdpr/gdpr-subject-erasure*` | flag to owner |
| F8 | **Not mine:** `check:unbounded-reads` now fails on `hr/recruitment/recruitment-automation.service.ts:321` — an unbounded `select({id: candidates.id})` inside a new cross-tenant ownership check (file mtime 17:34, after all my edits; the code is a BOLA fix, not cache work). Needs a classification entry or an `inArray`-sized bound from its author. | `modules/hr/recruitment/**` | flag to owner |
| F9 | **Not mine:** `hr/directory/assets-scope.spec.ts` fails ("returns all when permission is not scopable" — `isScopable` never called). `assets-scope.ts` mtime **17:35**, in the same batch as `goals-scope.ts` (17:35) — a concurrent agent refactoring `resolveXScope` across modules. This suite passed in my 17:30 sweep and fails at 17:40; nothing in my change touches `isScopable`. | `modules/hr/directory/assets-scope.ts` | flag to owner |
| F7 | `loadOrFetch` treats a `null` fetch result as a miss, so **there is no negative caching** — a legitimately-null read (missing settings row, absent record) hits the database on every request. Correctness-safe, worth knowing as the actual negative-cache policy. | `common/cache/cache.service.ts:120` | informational |

---

## 8. PRD section 5 — recommended, not ticked

`PRD-10-10-CODE-RELEASE-TODO.md:219-220` is outside my named territory and ticket 40 owns PRD reconciliation, so
per briefing rule 1 I did not edit it. Both criteria are now evidenced; the orchestrator can tick them:

- **L219 "cache keys include tenant, subject, permission and resource dimensions where applicable"** —
  `cache-key-collision.spec.ts` (D1–D6, each with a dimension-stripping negative control),
  `cache-key-dimension-registry.spec.ts`, the new observable viewer-isolation tests in
  `employee-directory-scope.spec.ts` and `org-hierarchy-cache.service.spec.ts`, plus a repo-wide shape audit that
  found **0** org-prefix asymmetries among 499 invalidation sites. Evidence: 243 suites / 1892 tests pass.
- **L220 "mutation/revocation invalidation, TTL/negative-cache policy, stampede protection, Redis degradation"** —
  mutation: `cache-invalidation-matrix.spec.ts` read-after-write over all **107** `kind:"write"` namespaces with a
  deaf-Redis negative control; revocation: `cache-key-collision.spec.ts` D5/D6 cross-process bump;
  stampede: `cache.service.spec.ts` in-process single-flight + distributed fill lease + `expect(redis.scan).not.toHaveBeenCalled()`;
  degradation: `degradation/redis.spec.ts` (REFUSED and hung Redis both degrade to the fetcher, rate limits still deny);
  TTL/negative-cache: matrix `kind:"ttl-only"` reasons asserted non-empty, nulls never cached (F7).
  **Caveat to record with the tick:** the regression gate for this criterion is vacuous (§6) and the 6 Inventory
  families in §3 remain broken but are out of release scope.

---

## 9. Files changed (all paths absolute under `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`)

Shared cache service
- `src/common/cache/cache-keys.ts` — brand types + 45 branded namespace factories; removed dead `hrHeadcountNamespace`
- `src/common/cache/cache.service.ts` — 10 exact-key signatures now take `ExactCacheKey`
- `src/common/cache/org-hierarchy-cache.service.ts` — also retires `hr:directory`
- `src/common/cache/cache-invalidation-matrix.ts` — +3 entries (142 total)
- `src/common/cache/cache-invalidation-matrix.spec.ts` — counts 139→142, 104→107
- `src/common/cache/org-hierarchy-cache.service.spec.ts` — rewritten: read-after-write, negative control, regression witness

HR headcount path
- `src/modules/hr/directory/org-structure.service.ts` — headcount and directory reads
- `src/modules/hr/directory/celebrations.service.ts` — versioned namespace read
- `src/modules/hr/lifecycle/hr-analytics.service.ts` — 3 sibling reads under one namespace
- `src/modules/hr/directory/employee-onboarding.service.ts` — 2 bumps → namespace
- `src/modules/hr/lifecycle/termination-lifecycle.service.ts` — 2 bumps → namespace
- `src/modules/hr/directory/org-structure-headcount.service.spec.ts` — rewritten observably
- `src/modules/hr/directory/employee-directory-scope.spec.ts` — key-string assertion → observable viewer isolation
- `src/modules/hr/directory/directory-tenant-isolation.spec.ts` — cache mock → real `CacheService` + `InMemoryRedis`
- `src/modules/hr/lifecycle/lifecycle-tenant-isolation.spec.ts` — same

Ownership transfers counter mismatch
- `src/modules/module-access/module-access-ownership.service.ts` — 2 bumps
- `src/modules/module-access/module-standing-mutations.service.ts` — 1 bump
- `src/modules/module-access/__tests__/standing-mutations.spec.ts`, `.../module-access-new-capabilities.spec.ts` — mocks

GDPR
- `src/modules/gdpr/gdpr-rectification.service.ts` — unbounded drain → join
- `src/modules/gdpr/gdpr-rectification.service.spec.ts`, `gdpr-rectification-auth-linked-fields.spec.ts` — mocks
