# PRD — One answer to "is this module available"

Status: **ready**
Date: 2026-08-23
Stream: R
Source: architecture review 2026-08-23, candidate 4

## Problem

Six sources answer one question, and no function assembles them.

| Source | Where | Consulted by `ModuleGuard` |
|---|---|---|
| `MODULE_REGISTRY[n].planGated` | `module-registry.ts:26` | indirectly |
| `FALLBACK_CORE_MODULE_KEYS` | `entitlements.service.ts:57` | yes |
| `modules_catalog.isCore` rows | `entitlements.service.ts:84` | yes |
| `org_modules.enabled` | `entitlements.service.ts:156` | yes |
| `PLAN_LOCKED_MODULES` | `plan-entitlements.constants.ts:74` | **no** — write-time only |
| `user_module_access` denies | `access.service.ts:452` | **no** — access screen only |

`isModuleEnabled` reads `coreModuleKeys`, then the org map. `PLAN_LOCKED_MODULES` is checked in `setModuleEnabled` and nowhere else. A caller wanting the full picture has to know which four the guard covers and re-derive the other two.

The registry's own `ladder` field is the clearest symptom: `ladder: "universal"` documents intent and drives nothing. `coreModuleKeys` produces the always-on behaviour, and it is the union of a nine-entry constant compiled into the binary and whatever `modules_catalog` rows exist. Delete `ladder: "universal"` and no runtime behaviour changes. A field with no teeth is a second description of a fact, and second descriptions drift.

## Solution

One function returns the answer and the reason.

```
moduleAvailability(orgId, userId, moduleKey)
  → { available: true }
  | { available: false; reason: "not-in-plan" | "org-disabled" | "user-denied" }
```

Every consumer — `ModuleGuard`, `authorize`, `/me/access`, the entitlements controller — asks it. The reason becomes a value, so choosing 402 (offer an upgrade) versus 403 (you lack the permission) stops being a guess made twice in two files.

The registry then becomes the source of `coreModuleKeys` rather than a parallel description of it.

## Goals

- One function assembles all six sources; nothing re-derives any of them.
- The denial reason is a value the caller reads, not an exception type it infers.
- `ladder` in the registry drives behaviour, so it cannot silently disagree with `coreModuleKeys`.
- A test asserts the guard and `/me/access` cannot disagree about any module.

## Non-Goals

- **Changing the downgrade policy.** Root §8 records that paid-only modules are blocked at `setModuleEnabled` on FREE and that *existing enablement is not revoked*. That decision stands. This stream makes it an explicit, named branch instead of an implicit consequence of where the check sits — so it can be reviewed, and changed deliberately if you ever want to.
- Adding billing to `MODULE_CATALOG` or `ACCESS_MANAGED_MODULES`. Platform billing is never delegated.
- Changing the module ladder, ownership, or any permission key.

## Implementation decisions

**Plan tier joins the read, behaviour unchanged.** `moduleAvailability` consults `PLAN_LOCKED_MODULES` and returns `not-in-plan` **only when there is no enabled `org_modules` row**. An org that enabled a module before a downgrade keeps it, exactly as today; the difference is that the rule is now written in one place with a name on it.

**Per-user denies join the read.** `user_module_access` rows already exist and already show on the access screen. Folding them in means a denied module is denied by the guard too, rather than only being hidden. `isCoreModule` still exempts core modules from denial, as it does now.

**`coreModuleKeys` derives from the registry.** `ladder: "universal"` becomes the source. `FALLBACK_CORE_MODULE_KEYS` is deleted; `modules_catalog.isCore` continues to be read and is reconciled against the registry at boot, with a mismatch logged loudly rather than silently merged.

**No new per-request cost.** All six inputs are already cached — the entitlement map on a 15-second local TTL, the tier through `PlanLimitsService`, denies on the access version. Assembling them adds no query. The request-transaction ceiling job is the guard against regression here.

**`@RequireModule` stays.** It remains correct for routes that gate on module status without a specific permission. On a route that also carries `@RequirePermission`, the two now consult the same function rather than two.

## Testing decisions

The property: **for every module in the registry and every combination of the six inputs, the guard and `/me/access` return the same availability.** Driven as a table over the registry, so module twenty-one is covered the day it is added.

Per-reason coverage: not-in-plan on a FREE org with no row; available on a FREE org with a pre-downgrade row (the recorded decision, pinned so it cannot be changed by accident); org-disabled; user-denied; core module never denied.

Mutation checks: drop the tier branch → the not-in-plan test fails. Drop the deny branch → the user-denied test fails. Point `coreModuleKeys` back at a hardcoded set → the registry-derivation test fails.

`module-registry.spec.ts` and the 15-namespace pin are the regression net.

## Out of scope

- The AI credit charge path, which bypasses `AiGatewayCreditHelper` in streaming chat. Real, separate, and belongs with the AI gateway.
- Seat and plan-limit enforcement on creation endpoints, which is a different invariant.
