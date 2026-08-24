# R02 — The registry decides which modules are core

> **BLOCKED. The ticket's central criterion is false and acting on it would change what customers get.**
>
> It says: "The derived set equals today's nine keys exactly." It does not. Three sources give three different answers, and no two agree:
>
> | Source | Set |
> |---|---|
> | `coreModuleKeys` — what is always-on at runtime | blog, calendar, chat, directory, home, kb, mail, notifications, workflows |
> | `ladder: "universal"` | calendar, chat, home, kb, mail, notifications |
> | `!planGated` | billing, blog, calendar, directory, mail, notifications, workflows |
>
> **Deriving from `ladder` would newly plan-gate workflows, blog and directory** — three modules every organisation currently gets for free. That is a pricing change wearing a refactor's clothes.
>
> The reason `ladder` is the wrong source is that it answers a different question. `ladder` is about **delegation** — can an owner appoint a module owner and admins? `planGated` is about **money** — must you pay for it? A module can be delegable *and* free, which is exactly what workflows, blog and directory are. The ticket conflated the two.
>
> **`planGated` is the right shape and its data is wrong.** It marks `chat` and `kb` as plan-gated, while `backend/CLAUDE.md` §5 states plainly that "`home`, `kb`, `chat`, `mail` and `calendar` are core". Those two are harmless today only because `coreModuleKeys` short-circuits before `planGated` is ever consulted — the contradiction is real and currently unreachable.
>
> **What was done instead.** `module-core-consistency.spec.ts` pins all three sets and both directions of disagreement, so a *sixteenth* contradiction is a decision rather than a discovery — the same pattern this repo already uses for the fifteen permission-owning namespaces that are not modules. Nothing about what customers receive was changed.
>
> **What unblocks this.** One answer: are `chat` and `kb` free or paid? Say that, correct `planGated` to match, and `coreModuleKeys` can then derive from `!planGated` in one line with the pin as its regression net.

> ### Attempted 2026-08-24, reverted — and the blocker is worse than recorded
>
> I tried to unblock this with evidence rather than a decision, on the reasoning that `backend/CLAUDE.md` §5 already says "`home`, `kb`, `chat`, `mail` and `calendar` are core", so correcting `planGated` for chat and kb is a data fix rather than a pricing change. Two supporting facts held up:
>
> - **`PLAN_LOCKED_MODULES` locks only `payroll` and `inventory`, on FREE.** Chat and KB are locked on no tier, so no customer pays for them today.
> - **The derivation works.** `!planGated && ladder !== "platform-admin"` yields exactly today's nine once chat and kb are corrected — and it avoids the trap the ticket identified, because deriving from `ladder` would plan-gate workflows, blog and directory.
>
> **It still has to be reverted, for a reason this ticket did not have.** `MODULE_CATALOG` is not only the plan-gating set — it is also what `EntitlementsService.listModules` iterates, and that is the administration modules screen. Removing chat and kb from it makes them **disappear from that screen**, when root §8 requires core products to appear there as disabled "Included" controls. Four tests caught it; two of them were the admin-list contract, not a stale pin.
>
> So `planGated` carries two meanings — "costs money" and "appears on the modules screen" — and they are not the same question. Splitting them is the real prerequisite, and it is a bigger change than this ticket.
>
> ### One thing worth fixing regardless, found while checking
>
> The ticket's last criterion says the stored `modules_catalog` rows have never been checked against the registry. **They now have been.** The database has `is_core = true` for eight modules — blog, calendar, chat, directory, home, kb, mail, workflows — and **`notifications` is missing.** The compile-time set has nine and includes it. The two disagree today and nobody would know, because `onModuleInit` merges them with a union and logs nothing. That union is why it is currently harmless. Reconciling loudly, as this ticket's third criterion already asks, is worth doing on its own and does not need the pricing answer.


**What to build:** `ladder: "universal"` in `MODULE_REGISTRY` produces the always-on behaviour, so the registry and `coreModuleKeys` cannot disagree.

The registry says `ladder: "universal"` for chat, home, mail, calendar and notifications. That field drives nothing. The always-on bypass in `isModuleEnabled` comes from `coreModuleKeys`, which is the union of `FALLBACK_CORE_MODULE_KEYS` — nine entries compiled into `entitlements.service.ts` — and whatever `modules_catalog.isCore` rows exist.

Delete `ladder: "universal"` today and no runtime behaviour changes. That is the test of a field with no teeth: it is a second description of a fact, and a second description drifts. Add a universal module to the registry without also editing the constant and it comes up plan-gated, contradicting its own entry.

**Owns (exclusive):**
- `backend/src/common/rbac/module-registry.ts`
- `backend/src/common/rbac/module-registry.spec.ts`

**Blocked by:** R01 — it owns `entitlements.service.ts`, where `FALLBACK_CORE_MODULE_KEYS` lives
**Wave:** 2
**Status:** BLOCKED — needs a pricing decision, not a refactor

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
