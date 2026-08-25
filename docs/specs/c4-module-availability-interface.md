# c4 · One interface answers "is this module available to this person"

**Status: shipped for the scoped c4 contract.** Verified at source 2026-08-26. `common/rbac/module-availability.ts` is the single decision function, and `EntitlementsService.buildModuleAvailabilityResolver()` is the canonical input assembly used by `ModuleGuard`, `authorize()`, `AccessSnapshotResolver`, and `CalendarSourceRegistry`. The parity suite covers core, org-disabled, plan-locked, and user-denied outcomes across the main callers.

## Problem Statement

The review's complaint was that six sources answered one question and the guard consulted four. That is fixed at the decision layer. It reappeared one level down, at the input layer.

The plan-lock resolver is now supplied by `EntitlementsService` on all production paths. Callers may provide cached module-map and deny inputs, but they do not replace the entitlement-owned core-module or plan-lock rules.

**As a user on a free plan clicking into a paid module**, that mislabelling is what I feel. The reason is meant to drive the difference between "upgrade your plan" and "an admin can enable this in Settings". `PermissionGuard` maps `NO_MODULE` to a 402 either way, so the status code survives — but the reason attached to it is wrong, and the moment any surface renders the reason rather than the status, it will tell a free-plan user to go ask their admin to enable something their plan does not include.

**`isCoreModule` has three different definitions**, all passed into the one seam:

| Caller | Definition of "core" |
|---|---|
| `moduleAvailabilityResolver` (guard, calendar) | `entitlements.isCoreModule(key)` |
| `authorize.ts:32` | `!isPlanGatedModule(key)` |
| `access-snapshot.resolver.ts:112` | `!isPlanGatedModule(key) \|\| !(key in effective)` |

Step 1 of the seam is "core modules are always available — no deny or org row can remove them". It is the earliest and most absolute branch, and three callers disagree about which modules take it. The snapshot's variant is the loudest: it treats *any* module absent from the effective map as core, so `/me/access` can report a module available that `authorize()` will refuse on the next request — the precise failure the snapshot's own comment says it exists to prevent (*"Same inputs `authorize` uses, so the snapshot cannot promise what a request then refuses"*).

**As a developer**, the review's deletion test now discriminates in a new place. Delete the seam and four callers fail to build — good. Delete `EntitlementsService.getPlanLockedModules` and two of them carry on unaffected, because they were never asking.

## Solution

The resolver is no longer assembled with competing production policy at each call site. `EntitlementsService` — which owns all four facts — exposes the canonical `ModuleAvailabilityResolver`; callers only supply request-local cached maps or denies where needed.

Where a caller genuinely cannot supply a fact, that remains a stated, tested exception with the consequence written down.

## User Stories

1. As a user on a plan that does not include a module, I want to be told my plan is the reason, so that I am pointed at billing rather than at an administrator who cannot help me.
2. As a user in an org that disabled a module I could otherwise use, I want to be told that, so that I ask the right person.
3. As a user individually denied a module, I want that reason to stay distinct, so that a per-person restriction is not presented as an org-wide one.
4. As a user, I want `/me/access` to agree with what the next request will actually allow, so that a navigation entry never leads to a 402.
5. As an org owner who enabled a paid module before downgrading, I want to keep it, so that the recorded decision in root §8 continues to hold.
6. As an org owner, I want that decision to be one explicit branch I can find and change my mind about, so that it is policy rather than an accident of where a check sits.
7. As a developer, I want one definition of "core module", so that four callers cannot disagree about the most absolute branch in the resolution order.
8. As a developer, I want `EntitlementsService` to hand me a ready resolver, so that adding a fifth caller cannot introduce a fifth assembly.
9. As a developer adding a module, I want it to be a registry entry, so that availability needs no new code.
10. As a developer, I want a caller that genuinely cannot supply a fact to say so explicitly, so that a stub is never mistaken for an implementation.
11. As a security reviewer, I want the snapshot and `authorize()` to resolve availability from identical inputs, so that the snapshot cannot promise access a request then refuses.
12. As a security reviewer, I want `user_module_access` denies honoured on every path, so that a per-person deny cannot be bypassed by reaching a module through a different caller.
13. As an operator, I want availability to add no per-request query, so that unifying the inputs does not cost latency.
14. As an operator, I want a plan change to be reflected without a deploy, so that plan-locked status is read, not compiled in.

## Implementation Decisions

- **`EntitlementsService` exposes the canonical resolver.** A single method returns the `ModuleAvailabilityResolver` wired to its own four facts, with `AccessService` supplying `getUserDeniedModules`. `moduleAvailabilityResolver(...)` stays as the constructor; what changes is that nobody builds the object literal by hand any more.
- **`authorize.ts` and `access-snapshot.resolver.ts` take that resolver.** Both use the entitlement-owned plan-lock and core-module rules; request-local module maps and denies are passed only as cached inputs.
- **One `isCoreModule`, owned by `EntitlementsService`.** Reconcile the three definitions before switching callers over; they are not obviously equivalent and one of them is wrong. Specifically, resolve whether "absent from the effective module map" should mean core (the snapshot's reading) or not core (everyone else's). The snapshot's reading is the one that lets `/me/access` over-promise, so the burden of proof is on keeping it.
- **`authorize()` keeps its narrow module map.** It builds `getModuleMap` for a single module key rather than the whole map, which is a deliberate cost optimisation on the hot path and is not the problem. Only `isCoreModule` and `getPlanLockedModules` change.
- **The downgrade decision becomes an explicit branch.** Step 3 of the documented order — an enabled `org_modules` row grants access regardless of the current plan — is root §8's recorded decision. It is already correct and already commented; the point of this candidate is that it now lives in exactly one place where it can be changed deliberately.
- **`MODULE_REGISTRY.ladder` gains teeth or goes.** The review noted `ladder: "universal"` has no effect and `coreModuleKeys` drives the behaviour. Once `isCoreModule` has one owner, either that owner reads the registry field — making the registry the source rather than a parallel description — or the field is deleted. A descriptive field that nothing reads is worse than no field.
- **No new queries.** Every resolver method reads an already-cached source; the seam's own doc comment commits to this. Unifying the inputs must not break it.

## Testing Decisions

**What makes a good test here.** Drive `moduleAvailability` with a fake resolver and assert the verdict *and the reason*. The reason is the product of this candidate; a test asserting only `available: false` would pass under every bug described above.

- **Resolution order** — one case per documented step, including the two that are currently unreachable from two callers: no row + plan-locked → `not-in-plan`; no row + not plan-locked → `org-disabled`. These are the tests that fail today if pointed at `authorize()`'s inline resolver.
- **Core wins over everything** — a core module with a user deny and a disabled org row is still available. This is step 1 and it is absolute; if the three `isCoreModule` definitions disagree, this test run against each caller's resolver is what surfaces it.
- **Snapshot/authorize parity** — the highest-value test in this candidate. For a matrix of (plan, org row, user deny, module key), `/me/access` and `authorize()` return the same availability. The snapshot's own comment claims this property; nothing currently proves it. Prior art for the shape: `__tests__/warm-cold-parity.spec.ts`.
- **Canonical resolver is the only one** — a test that no production file constructs a `ModuleAvailabilityResolver` object literal. Cheap, and it is what stops the fifth assembly appearing.
- **Cost** — `access-resolution-cost.spec.ts` and the CI request-transaction ceiling already pin this; unifying inputs must leave both green.
- `module.guard` e2e coverage exists but runs only under `pnpm test:e2e`.

## Out of Scope

- **Changing the downgrade policy.** Root §8 says an already-enabled paid module is not revoked on downgrade. This candidate makes that decision locatable; it does not revisit it. The review said the same, in a callout, and it is worth repeating because the code change looks like a policy change.
- **Adding billing to `MODULE_CATALOG` or `ACCESS_MANAGED_MODULES`.** Platform billing is never delegated; `assertPermissionsGrantable` refuses the whole `billing:` namespace by construction.
- **The `MODULE_CATALOG` vs `enabled_modules` casing question.** A separate, known hazard.
- **Frontend entitlement rendering.** `useEntitlements` and `EntitlementGate` consume the reason; how they present it is a UI question for after the reason is correct.

## Further Notes

- **This is the candidate the review said you asked about**, and it is the one where the implementation went furthest and stopped shortest. The function is textbook — ordered, commented, discriminated. The wiring is four hand-assembled resolvers, two of which lie.
- **Resolver assembly is the regression guard.** The parity and resolver-assembly tests ensure a new caller cannot silently replace the entitlement-owned plan-lock or core-module rules with an empty stub.
- **Reconciling `isCoreModule` is the risky part, not the plumbing.** Three definitions means at least two are wrong, and "core" is the branch that bypasses every other check. Do it first, with the parity test in place, and treat any behaviour change it surfaces as a finding rather than a regression.
- **`CalendarSourceRegistry` is already a correct consumer** and its comment records why it uses `moduleAvailability` rather than `isModuleEnabled` — a person denied a module was still receiving its events. That is a worked example of what this seam is for.
