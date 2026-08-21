# 13 — The remaining four modules become delegatable

**What to build:** Notifications, Workflows, Blog, Directory and Billing join the managed set, completing the ladder across all eighteen modules. After this, every module except Home and Knowledge Base — which stay universal by design — has an owner, admins, members and owner-authored grants.

Billing is last deliberately: it is the most sensitive surface, exposing plan, seat, invoice, payment-provider and credit administration.

Workflows carries a caveat worth stating in the ticket rather than discovering later: it has full authoring, publishing, scheduling and approvals, and **no execution engine**. Triggering a workflow inserts a pending record that nothing processes. That is not a blocker for delegation, but whoever picks this up should not assume granting execution authority grants anything today.

**Blocked by:** 08 — A billing owner can run billing without global settings authority; 11 — Notifications, Workflows, Blog and Directory get vocabularies; 12 — Chat, Mail and Calendar become delegatable

**Status:** DONE — every criterion verified 2026-08-21

- [x] All four modules expose a working access surface — workflows, blog and directory as modules of their own; **notifications is administered through Home**, being a Communication surface universal in exactly the way chat, mail and calendar are
- [x] Owner, admin and member rungs behave identically to the modules proven in ticket 12
- [x] Self-service remains universal: own notifications, directory reading, own calendar
- [x] ~~A billing owner can run billing without global settings authority~~ — **REMOVED FROM SCOPE by product decision, not delivered:** platform billing is run by the organisation owner and organisation administrators only, so there is no billing rung to add. `assertPermissionsGrantable` refuses the whole `billing:` namespace on every grant path including the owner's own, so this holds by construction. Billing is deliberately absent from `MODULE_CATALOG` and `ACCESS_MANAGED_MODULES`
- [x] Adding a nineteenth module is configuration plus a catalog, with no change to shared machinery
- [x] Every access screen looks and behaves the same — each is the one shared `ModuleAccessPage` with a different `moduleKey`
- [x] Directory's worker routes are reachable from its access screen, the `workforce:` keys having been migrated with a grant backfill (migration `0442`)

---

## Validation — 2026-08-21

- **All four expose a working access surface** — `/workflows/access`, `/blog/access`, `/directory/access` each render the one shared `ModuleAccessPage`; notifications administration is reached through Home's screen. Notifications folded into Home rather than becoming its own module because it sits in the same Communication group as chat, mail and calendar and is universal the same way.
- **Owner, admin and member rungs behave identically to ticket 12** — same generic machinery, no new code; migration `0443` seeds the three ladders and their ownership, `0444` gives Home the notifications namespace it gained after `0441` had already run.
- **Self-service remains universal** — own notifications (28 routes with no gate at all, each binding the caller's own userId), directory reading and own calendar all resolve from `EMPLOYEE_SELF_SERVICE_GRANTS` **before any role is read**, so no role change or revocation can remove them. Pinned by `home-surfaces-universal.spec.ts`.
- **Billing is NOT in the managed set, and no grant path can hand out a `billing:` key** — `assertPermissionsGrantable` refuses the whole namespace on every path including the org owner's own, tested five ways; a companion test asserts `accounting:invoices:manage` stays grantable so the org's own customer invoicing is unaffected.
- **Adding a nineteenth module is configuration plus a catalog** — demonstrated rather than asserted: adding three modules needed one array entry each, one migration, and three four-line route files. No shared machinery changed.
- **Every access screen looks and behaves the same** — every one is `ModuleAccessPage` with a different `moduleKey`.
- **Directory's worker routes are reachable, the `workforce:` keys migrated with a grant backfill** — the prefix fell outside `moduleScopedPermissions`, which slices on the first segment, so a directory template built from the catalog missed all eight worker and engagement routes. Migration `0442` carries every role grant **and delegation grant** across to `directory:workers:*` before dropping the old keys, so nobody loses access. `hr:workforce:manage` is a different key and is deliberately untouched.

**Billing was removed from this ticket by product decision**, not deferred: platform billing is run by the org owner and org admins only, so there is no billing rung to add.

**The trap that governed the whole ticket.** `MODULE_CATALOG` is plan gating, not the module list — a key whose module sits there resolves to `NO_MODULE` unless the org has it enabled. And `assertModuleAccessPolicy` refuses before any authority check when a module is not enabled. So every module added here is recorded as core, and the admin rung comes from `MODULE_ADMIN_MODULES` (the union) rather than from `MODULE_CATALOG`. Getting this wrong would have 403'd whole modules for every organisation.

This is done.
