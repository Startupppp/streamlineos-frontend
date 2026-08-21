# 13 — The remaining five modules become delegatable

**What to build:** Notifications, Workflows, Blog, Directory and Billing join the managed set, completing the ladder across all eighteen modules. After this, every module except Home and Knowledge Base — which stay universal by design — has an owner, admins, members and owner-authored grants.

Billing is last deliberately: it is the most sensitive surface, exposing plan, seat, invoice, payment-provider and credit administration.

Workflows carries a caveat worth stating in the ticket rather than discovering later: it has full authoring, publishing, scheduling and approvals, and **no execution engine**. Triggering a workflow inserts a pending record that nothing processes. That is not a blocker for delegation, but whoever picks this up should not assume granting execution authority grants anything today.

**Blocked by:** 08 — A billing owner can run billing without global settings authority; 11 — Notifications, Workflows, Blog and Directory get vocabularies; 12 — Chat, Mail and Calendar become delegatable

**Status:** ready-for-agent

- [ ] All five modules expose a working access surface
- [ ] Owner, admin and member rungs behave identically to the modules proven in ticket 12
- [ ] Self-service remains universal: own notifications, directory reading, own calendar
- [ ] A billing owner can run billing without global settings authority
- [ ] Adding a nineteenth module is configuration plus a catalog, with no change to shared machinery
- [ ] All eighteen access screens look and behave the same
