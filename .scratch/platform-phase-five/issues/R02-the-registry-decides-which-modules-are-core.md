# R02 — The registry decides which modules are core

**What to build:** `ladder: "universal"` in `MODULE_REGISTRY` produces the always-on behaviour, so the registry and `coreModuleKeys` cannot disagree.

The registry says `ladder: "universal"` for chat, home, mail, calendar and notifications. That field drives nothing. The always-on bypass in `isModuleEnabled` comes from `coreModuleKeys`, which is the union of `FALLBACK_CORE_MODULE_KEYS` — nine entries compiled into `entitlements.service.ts` — and whatever `modules_catalog.isCore` rows exist.

Delete `ladder: "universal"` today and no runtime behaviour changes. That is the test of a field with no teeth: it is a second description of a fact, and a second description drifts. Add a universal module to the registry without also editing the constant and it comes up plan-gated, contradicting its own entry.

**Owns (exclusive):**
- `backend/src/common/rbac/module-registry.ts`
- `backend/src/common/rbac/module-registry.spec.ts`

**Blocked by:** R01 — it owns `entitlements.service.ts`, where `FALLBACK_CORE_MODULE_KEYS` lives
**Wave:** 2
**Status:** ready-for-agent

- [ ] `coreModuleKeys` derives from `MODULE_REGISTRY` entries with `ladder: "universal"`.
- [ ] `FALLBACK_CORE_MODULE_KEYS` is deleted, not left beside its replacement.
- [ ] `modules_catalog.isCore` is still read and is **reconciled** against the registry at boot. A mismatch is logged loudly with both sides named — never silently merged, and never silently ignored.
- [ ] The derived set equals today's nine keys exactly: `kb`, `home`, `chat`, `mail`, `calendar`, `notifications`, `workflows`, `blog`, `directory`. **That equality is what makes this safe** and it is the first test to write.
- [ ] A test asserts changing an entry's `ladder` changes whether that module is always-on. This is the mutation check — it is what "the field has teeth" means.
- [ ] The three-valued `ladder` keeps its meaning: `delegable` / `universal` / `platform-admin`. Nothing is collapsed.
- [ ] Adding a registry entry requires no edit to `entitlements.service.ts`.
- [ ] The 15 permission-owning namespaces that are not modules stay pinned by their existing test.
- [ ] `tsc --noEmit` exit 0; `module-registry.spec.ts` and the module-availability property test from R01 both pass.
- [ ] **Not verified unless stated:** the stored `modules_catalog` rows in a real database have never been checked against the registry. If this ticket does not check them, say so — R01's reconciliation log is what will reveal a mismatch, and only once the app boots.
