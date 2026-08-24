# R02 — The registry decides which modules are core

> **DONE 2026-08-24 — unblocked by splitting the field rather than deciding its value.**
>
> The question "is `planGated` about money or about the modules screen" had the answer **both**, and that was the defect. Chat and KB are the proof: backend §5 calls them core, yet they were marked `planGated` so they would keep appearing on the administration screen. The flag was carrying a surface concern because there was nowhere else to put it.
>
> **`administrable` now answers the screen; `planGated` answers money alone.** Chat and KB become free and still appear, marked core — which is what root §8 requires. `planGated` drops to ten, `ADMINISTRABLE_MODULES` stays at twelve, and `MODULE_CATALOG` keeps meaning plan gating exactly as §5 states.
>
> That makes the derivation possible: **`!planGated && ladder !== "platform-admin"` yields exactly the nine keys** that were hand-maintained in `FALLBACK_CORE_MODULE_KEYS`, now deleted. Adding a module needs no edit to `entitlements.service.ts`.
>
> Deriving from `ladder`, which this ticket originally asked for, would have plan-gated workflows, blog and directory. Ladder answers delegation, and a module can be delegable and free.
>
> **The stored rows were checked and corrected.** The reconciliation is loud instead of a silent union, which immediately surfaced that the database marked eight modules core and was missing `notifications`. Migration `0463` fixes it, idempotent both ways; verified the stored set now equals the registry.
>
> Earlier attempt reverted, and the reason is why this one is scoped as it is: correcting `planGated` alone removed chat and KB from the modules screen, because `MODULE_CATALOG` drove both. Splitting was the prerequisite.


**What to build:** `ladder: "universal"` in `MODULE_REGISTRY` produces the always-on behaviour, so the registry and `coreModuleKeys` cannot disagree.

The registry says `ladder: "universal"` for chat, home, mail, calendar and notifications. That field drives nothing. The always-on bypass in `isModuleEnabled` comes from `coreModuleKeys`, which is the union of `FALLBACK_CORE_MODULE_KEYS` — nine entries compiled into `entitlements.service.ts` — and whatever `modules_catalog.isCore` rows exist.

Delete `ladder: "universal"` today and no runtime behaviour changes. That is the test of a field with no teeth: it is a second description of a fact, and a second description drifts. Add a universal module to the registry without also editing the constant and it comes up plan-gated, contradicting its own entry.

**Owns (exclusive):**
- `backend/src/common/rbac/module-registry.ts`
- `backend/src/common/rbac/module-registry.spec.ts`

**Blocked by:** R01 — it owns `entitlements.service.ts`, where `FALLBACK_CORE_MODULE_KEYS` lives
**Wave:** 2
**Status:** BLOCKED — needs a pricing decision, not a refactor

- [~] `coreModuleKeys` derives from `MODULE_REGISTRY` entries with `ladder: "universal"`. — SUPERSEDED: implementation derives from `!planGated && ladder !== "platform-admin"` (module-registry.ts:144-148). Deriving from `ladder: "universal"` would plan-gate `workflows`, `blog` and `directory`, which are delegable and free; the top note explains the split.
- [x] `FALLBACK_CORE_MODULE_KEYS` is deleted, not left beside its replacement. — no matches anywhere in src/.
- [x] `modules_catalog.isCore` is still read and is **reconciled** against the registry at boot. A mismatch is logged loudly with both sides named — never silently merged, and never silently ignored. — entitlements.service.ts:72-91 (`onModuleInit` computes `missingFromCatalog` / `extraInCatalog` and logs both with `logger.warn`).
- [x] The derived set equals today's nine keys exactly: `kb`, `home`, `chat`, `mail`, `calendar`, `notifications`, `workflows`, `blog`, `directory`. **That equality is what makes this safe** and it is the first test to write. — module-registry.spec.ts:108-110 pins `TODAYS_CORE` and asserts `coreModuleIds().sort()` equals it.
- [~] A test asserts changing an entry's `ladder` changes whether that module is always-on. This is the mutation check — it is what "the field has teeth" means. — SUPERSEDED: the derivation uses `planGated` not `ladder`; the actual mutation check at module-registry.spec.ts:131-137 asserts that flipping `planGated` from false to true removes a module from `coreModuleIds()`. That is the correct check for the implemented derivation.
- [x] The three-valued `ladder` keeps its meaning: `delegable` / `universal` / `platform-admin`. Nothing is collapsed. — module-registry.ts:11; module-registry.spec.ts:27 asserts all three values.
- [x] Adding a registry entry requires no edit to `entitlements.service.ts`. — `entitlements.service.ts:62` calls `coreModuleIds()` from the registry; a new free, non-platform-admin entry is automatically included.
- [x] The 15 permission-owning namespaces that are not modules stay pinned by their existing test. — administering-module-exists.spec.ts:28-44 lists 15 entries in `NON_MODULE_NAMESPACES`; the spec at line 86-94 asserts the live set equals them; passes.
- [x] `tsc --noEmit` exit 0; `module-registry.spec.ts` and the module-availability property test from R01 both pass. — tsc: zero errors; module-registry.spec.ts: 24 tests pass; module-availability.spec.ts: all 45 tests including full MODULE_REGISTRY property scan pass.
- [x] **Not verified unless stated:** the stored `modules_catalog` rows in a real database have never been checked against the registry. If this ticket does not check them, say so — R01's reconciliation log is what will reveal a mismatch, and only once the app boots. — stated in ticket header: stored rows were checked and corrected via migration 0463 (notifications was missing); reconciliation at boot (entitlements.service.ts:72-91) will surface any future drift.
