# 12 — Chat, Mail and Calendar become delegatable

**What to build:** The first end-to-end proof of the product model on a phase-one module. An organisation owner appoints a chat owner; that owner appoints chat admins and members, and grants specific people specific chat capabilities. Those people see only the chat screens they hold, and controls they cannot use are hidden — while the handler still refuses them.

Today these three modules return not-found when asked for their access surface, because they are absent from the managed-module list. They are also the modules you named as phase-one surfaces.

The machinery already exists and is generic: the access API is generic on the module key across 21 routes, and the web interface is a single shared screen with thin per-module routes. This ticket adds the modules to the managed set and proves the ladder works end to end — it does not build new machinery.

**Blocked by:** 06 — Module owner and module admin answer one question; 10 — Chat, Mail and Calendar get real permission vocabularies

**Status:** ready-for-agent

- [ ] An organisation owner can appoint and change a module owner for each of the three
- [ ] A module owner can appoint module admins and add or remove module members
- [ ] A module owner can grant a specific capability to a specific person, and that person gains exactly it
- [ ] A module admin can manage members and grants but cannot transfer ownership
- [ ] A module member sees only the screens they hold; unheld controls are hidden and the handler still refuses them
- [ ] A member with no grants in these modules retains Home and Knowledge Base in full
- [ ] A module admin cannot grant anything outside their own module
- [ ] Cross-tenant: a module key or member id from another organisation returns not-found
- [ ] The ten already-working modules are unaffected
