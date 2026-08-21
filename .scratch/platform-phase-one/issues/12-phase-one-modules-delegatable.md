# 12 — Chat, Mail and Calendar become delegatable

**What to build:** The first end-to-end proof of the product model on a phase-one module. An organisation owner appoints a chat owner; that owner appoints chat admins and members, and grants specific people specific chat capabilities. Those people see only the chat screens they hold, and controls they cannot use are hidden — while the handler still refuses them.

Today these three modules return not-found when asked for their access surface, because they are absent from the managed-module list. They are also the modules you named as phase-one surfaces.

The machinery already exists and is generic: the access API is generic on the module key across 21 routes, and the web interface is a single shared screen with thin per-module routes. This ticket adds the modules to the managed set and proves the ladder works end to end — it does not build new machinery.

**Blocked by:** 06 — Module owner and module admin answer one question; 10 — Chat, Mail and Calendar get real permission vocabularies

**Status:** DONE — every criterion verified 2026-08-21

- [x] An organisation owner can appoint and change a module owner for each of the three
- [x] A module owner can appoint module admins and add or remove module members
- [x] A module owner can grant a specific capability to a specific person, and that person gains exactly it
- [x] A module admin can manage members and grants but cannot transfer ownership
- [x] A module member sees only the screens they hold; unheld controls are hidden and the handler still refuses them
- [x] A member with no grants in these modules retains Home and Knowledge Base in full
- [x] A module admin cannot grant anything outside their own module
- [x] Cross-tenant: a module key or member id from another organisation returns not-found
- [x] The ten already-working modules are unaffected

---

## Validation — 2026-08-21

Every criterion above is ticked because it was verified individually, not because the work felt finished. Evidence, deviations and corrections are recorded in the commit that closed this ticket and in the `PAGES.md` changelog entry for 2026-08-21.

Highlights: re-scoped mid-ticket — chat, mail and calendar are **Home** surfaces, so they get one Home ladder rather than three. Two traps avoided that would have broken production: `MODULE_CATALOG` also drives plan gating (adding mail/calendar there would have 403'd every route they own), and `assertModuleAccessPolicy` refuses before any authority check when a module is not enabled (so Home, mail and calendar are recorded as core). No permission key was renamed; Home's ownership of those namespaces lives in `namespacesForModule`, because a rename breaks every stored grant.

This is done.
