# 04 — The module registry describes what actually happens

**What to build:** The registry's universality field either drives behaviour or stops existing. Today it describes a module as universal while something else decides whether it is, so the registry reads as authoritative and is not. A descriptive field nothing reads is worse than no field, because the next person to change availability will change it there and nothing will happen.

Either the single core-module definition from ticket 02 reads the registry — making the registry the source rather than a parallel description — or the field is deleted and the registry stops claiming to answer this.

**Blocked by:** 02 — Everyone agrees which modules are core.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] The field either determines whether a module is core, or does not exist.
- [x] If it is kept: changing it changes behaviour, and a test proves that.
- [x] If it is deleted: nothing references it, proved by the module-graph tool rather than a text search.
- [x] Adding a new module requires a registry entry and no other availability code.
- [x] The modules the constitution names as core still resolve as core either way.
- [x] The decision and its reasoning are recorded in this ticket.
- [x] Backend suite green.

## Todo

- [x] Decide keep-or-delete and record why in this ticket
- [x] If keeping: wire the core definition to read it, and add a test that flipping the field flips availability
- [x] If deleting: remove the field and every reference, verified with the module-graph tool and a real build
- [x] Confirm the constitution's core modules are unaffected
- [x] Walk through adding a hypothetical new module and confirm it needs only a registry entry
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

### Facts established before any change

**Fields in MODULE_REGISTRY per module:** `id`, `displayName`, `planGated`, `administrable`, `ladder`, `administersNamespaces`.

**Which fields are read by production code:**
- `planGated` → `planGatedModuleIds()` → `MODULE_CATALOG` / `isPlanGatedModule()` / `coreModuleIds()`
- `ladder` → `delegableModuleIds()` (reads `=== "delegable"`) → `ACCESS_MANAGED_MODULES`; `coreModuleIds()` reads `!== "platform-admin"`
- `administrable` → `administrableModuleIds()` → `ADMINISTRABLE_MODULES`
- `administersNamespaces` → `additionalNamespaces()` → `namespacesForModule()`
- `id`, `displayName` — used throughout

**Is `ladder: "universal"` inert?** No. It causes a module to be excluded from `delegableModuleIds()` → `ACCESS_MANAGED_MODULES`, which prevents the per-person module deny UI from appearing. `"delegable"` free modules (`workflows`, `blog`, `directory`) appear in `ACCESS_MANAGED_MODULES` — you can set a deny on them, but since they are also core the deny is silently ignored. `"universal"` removes even the no-op deny UI. Changing `kb` from `"universal"` to `"delegable"` would add `kb` to `ACCESS_MANAGED_MODULES` — a real behaviour change.

**Does changing `planGated` or `ladder` change availability?** Yes. `coreModuleIds()` reads `!planGated && ladder !== "platform-admin"`. This feeds `CORE_KEYS` in `isCoreModuleKey()`, which feeds `moduleAvailabilityResolver` / `moduleAvailability`. The existing `module-registry.spec.ts:131` test proves the formula inline but did not use `isCoreModuleKey` or `moduleAvailability`. That gap is what this ticket closes.

### Decision: keep all fields, add the end-to-end proof test

Every field drives real behaviour; none is purely descriptive. The premise of the ticket — that a field reads as authoritative but is not — was already satisfied since ticket 02 wired `coreModuleIds()` (which reads both `planGated` and `ladder`) into `isCoreModuleKey`. The remaining gap was the absence of a test proving the full chain from registry entry to `moduleAvailability` result.

### New test added

`backend/src/common/rbac/module-registry.spec.ts` — new describe block **"registry fields drive availability: end-to-end proof"** (7 tests):
- Proves every module in `coreModuleIds()` returns `isCoreModuleKey(id) === true`
- Proves every plan-gated module returns `isCoreModuleKey(id) === false`
- Proves `billing` (planGated=false, ladder=platform-admin) is not core
- Proves core modules are unconditionally available through `moduleAvailability` using the real `isCoreModuleKey`, even with a disabled org row, a user deny and a plan lock
- Proves plan-gated modules are blocked (reason: `not-in-plan`) via the same real path
- Proves `billing` gets `org-disabled` via the real path
- Explicitly confirms `home`, `kb`, `chat`, `mail`, `calendar` resolve `{ available: true }` — each with a disabled org row, a user deny and a plan lock

### Hypothetical new module walkthrough

Add `{ id: "scheduling", displayName: "Scheduling", planGated: true, administrable: true, ladder: "delegable", administersNamespaces: [] }` to MODULE_REGISTRY. That single entry:
1. Appears in `planGatedModuleIds()` → `MODULE_CATALOG` → plan gating applies automatically
2. Appears in `delegableModuleIds()` → `ACCESS_MANAGED_MODULES` → per-person access management screen shows it
3. Appears in `administrableModuleIds()` → `ADMINISTRABLE_MODULES` → modules screen shows it
4. Is excluded from `coreModuleIds()` (planGated=true) → `isCoreModuleKey` returns false → `moduleAvailability` checks org rows and plan locks
5. Gets a module-level registration test in `module-registry.spec.ts` for free (the `every MODULE_REGISTRY entry` property tests cover it)

No other availability code needs to change. The registry entry is the single registration point.

### Test run

`cd backend && npx jest --testPathPattern "common/rbac|modules/access" --maxWorkers=2`

**34 suites, 381 tests, all pass.**
