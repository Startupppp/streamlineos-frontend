# SPLIT3b — Lane Report

Date: 2026-08-30. Three files assessed; one split executed (3 → 3 files, same test count); two cohesive-exception decisions recorded; one dead file deleted.

---

## Madge circular check

```
✔ No circular dependency found!
```

Zero cycles before and after all changes.

---

## File 1 — `notification-events.catalog.ts` (1054 lines)

### Decision: Cohesive catalog exception — no split

**Justification.** The file is a flat, uniform registry of notification event definitions. Every entry uses the same `notificationEvent()` factory with the same options shape. There is no mixing of delivery logic, policy logic, dispatch behavior, or module-specific types — only data. CHAT and BUILD have already been factored into sibling catalog files because they are large standalone domains; the remaining 18 domain groups average ~55 lines each and share the same import set (`notification-event-channel-policy.ts`, `notification-event-factory.ts`). The exported barrel (`NOTIFICATION_EVENT_CATALOG`, `NotificationEventKey`, `isNotificationEventKey`, `NOTIFICATION_EVENT_MAP`) requires the assembled complete set — splitting it further would produce an import from inside its own barrel tree, which is banned. This qualifies for the CLAUDE.md §7 cohesive-catalog exception.

**ABANDONED SPLIT GUARD.** A previous lane created `notification-catalog-cohesive-exception.ts` (13 lines, zero importers) as a source-file record of this exception. That file was dead code. **It has been deleted.** The exception is recorded here — in the report only, not as a new source file.

**Files changed:**
- `backend/src/modules/notifications/notification-catalog-cohesive-exception.ts` — **deleted** (dead code, zero importers confirmed by grep and by `notification-catalog-integrity.spec.ts` continuing to pass: 10/10 tests green).

---

## File 2 — `access.service.spec.ts` (1102 lines before, now 565 lines)

### Decision: Split into 3 files by test-surface responsibility

**Before:** 52 tests, 1 file, 1102 lines.
**After:** 52 tests, 3 files, 1121 lines total (19 extra lines from per-file import sections).

| File | Lines | Tests | Responsibility |
|---|---|---|---|
| `access.service-utils.spec.ts` (new) | 223 | 27 | Pure exported utility functions: `broadest`, `moduleOf`, `isPlanGatedModule`, `evaluateMembershipGate`, `isActiveDelegation`, `isActiveAssignment` |
| `access.service.spec.ts` (shrinks) | 565 | 13 | `AccessService.resolveUserPermissions` — all four describe groups (basic, module ownership, version cache, unknown key filtering) |
| `access.service-members.spec.ts` (new) | 333 | 12 | `AccessService.membersWithPermission` — basic and pagination describe groups |

**Why the resolve file is 565 (above 500 hard review).** The four `resolveUserPermissions` describe blocks are one coherent unit sharing `makeSelectChain`, `withTenantTxMock`, `buildService` and `ACTIVE_MEMBER_BASELINE_PERMISSIONS` helpers (~84 lines). Splitting them further would duplicate those helpers across two files, adding ~84 lines of identical code and creating two files that cannot stand alone without the shared utilities. The reduction from 1102 to 565 is already significant; 565 is the natural floor for this surface.

**Jest run (after):**
```
PASS src/modules/access/access.service-members.spec.ts
PASS src/modules/access/access.service.spec.ts
PASS src/modules/access/access.service-utils.spec.ts
Test Suites: 3 passed, 3 total
Tests:       52 passed, 52 total
```

### Assertion-voiding patterns found

1. **`db.transaction` mock** — `withTenantTxMock` at line 46 of the new `access.service.spec.ts` correctly invokes its callback: `.mockImplementation(async (fn) => fn(db))`. The bare `jest.fn()` trap is NOT present. The version bump test at lines 237–248 also properly invokes its callback. No voided assertions.

2. **`jest.clearAllMocks()` queue drain** — NOT used in `access.service.spec.ts`. No `clearAllMocks` call is present; each test constructs a fresh `db` with fresh mocks. No `mockResolvedValueOnce` bleeds between tests.

3. **`JSON.stringify` on Drizzle conditions** — Not present in any of the three files.

4. **Probe whose failure mode equals success** — Not present.

---

## File 3 — `module-access.controller.e2e-spec.ts` (833 lines)

### Decision: Cohesive e2e suite exception — no split

**Justification.** This is a single-controller RBAC test suite. All describe blocks exercise one `ModuleAccessController` and share an identical 155-line setup block (mock objects, stubs, `createE2eApp` with overrides, `beforeAll`/`afterAll`/`beforeEach`). The D1 plan proposed a split into "grants" and "views" files, but looking at the actual controller surface, the boundary between grant mutations and view reads is not cleanly separable — the same handler stubs (`mockModuleAccessService`, `mockModuleAccessGroupsService`) serve both read and write tests.

Any split requires either:
- Duplicating the 155-line setup in each file (adding ~155 lines per file, net increase of ~310 lines)
- Extracting setup to a shared test helper (creating a new file with no production purpose)

Neither outcome is clearly better than a single 833-line file that Jest already handles correctly. The CLAUDE.md rule "A split that loses coverage is far worse than a long file" applies — the `describe.each([...ACCESS_MANAGED_MODULES])` matrix at the bottom generates a dynamic number of tests (17 delegable modules × 8 tests each = 136 tests) and any split must preserve that count.

**E2e runner status.** The e2e suite (`jest --config jest-e2e.json`) OOMs on this machine even with `NODE_OPTIONS=--max-old-space-size=8192` (8 GB heap). Before-count for file 3 is unverifiable in this environment. This is an additional reason to leave the file intact: a split that cannot be verified against a known baseline is not safe to make.

**Files changed:** none.

### Assertion-voiding patterns found in file 3

1. **`jest.clearAllMocks()` in `beforeEach` (line 134)** — The spec uses `jest.clearAllMocks()` which does NOT drain `mockResolvedValueOnce` queues. All `mockRejectedValueOnce` calls in this file are placed immediately before the HTTP call in the same `it()` block and consumed by that one call. No bleeding is present today, but any future test that sets up a `Once` mock in `beforeEach` and then fails before calling the mock would leak into the next test. **Latent risk — not a current bug.**

2. **`db.transaction` mock** — Not present (this is an e2e spec with `createE2eApp`; no manual db mocking).

3. **`JSON.stringify` on Drizzle conditions** — Not present.

4. **Probe whose failure mode equals success** — Not present.

---

## Summary of changes

| File | Before | After | Action |
|---|---|---|---|
| `notifications/notification-catalog-cohesive-exception.ts` | 13 lines | deleted | Dead code (zero importers) |
| `access/access.service.spec.ts` | 1102 lines, 52 tests | 565 lines, 13 tests | Shrunk |
| `access/access.service-utils.spec.ts` | (did not exist) | 223 lines, 27 tests | Created |
| `access/access.service-members.spec.ts` | (did not exist) | 333 lines, 12 tests | Created |
| `notifications/notification-events.catalog.ts` | 1054 lines | 1054 lines (unchanged) | Cohesive exception recorded |
| `module-access/__tests__/module-access.controller.e2e-spec.ts` | 833 lines | 833 lines (unchanged) | Cohesive exception recorded |

**Test count before (file 2):** 52  
**Test count after (file 2):** 52 ✓  
**Circular dependencies before/after:** 0 / 0 ✓
