# 02 — One registry declares what a module is

**What to build:** A single declaration of the platform's modules, with every fact about a module held on one entry.

Today "module" has four answers: a plan-gated catalog of twelve, a delegable list of thirteen, a namespace map pointing at a module that exists in neither, and a stored projection in a different case. They disagree in both directions — Knowledge Base and Chat are plan-gated with no ladder; Workflows, Blog and Directory have ladders and are not plan-gated — and nothing forces them to agree. Adding a module means editing four places, and forgetting the fourth produces a not-found discovered weeks later in someone's browser.

This is the expand step. The lists keep their current values and become derived views, so nothing downstream changes yet.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A registry entry exists for every module the platform ships, carrying at least: stable identifier, display name, whether a plan gates it, its ladder policy, and any permission namespaces it administers beyond its own.
- [ ] Ladder policy is **three-valued** — delegable, universal, platform-admin — not a boolean. "No ladder" today conflates *universal* (every active member has it; there is no membership to appoint) with *organization administration* (governed by settings permissions, never delegated to a module owner). A boolean cannot express that, which is part of why the distinction was never written down. This shape came from the architecture review and encodes the decision:

  ```
  { id, displayName, planGated, ladder, administersNamespaces }
  ```

- [ ] The plan-gated catalog, the delegable list and the namespace map are computed from the registry rather than authored.
- [ ] The module identifier type is derived from the registry, so a module missing a required fact is a compile error.
- [ ] Every existing exported name keeps its current value. A test asserts the derived values equal what shipped before this change — that equality is what makes this step safe.
- [ ] Billing is `platform-admin` and appears in neither the plan-gated nor the delegable view. A test asserts it. This is a settled decision from phase one, not a default.
- [ ] A test asserts no namespace is administered by two modules.
- [ ] Tests enumerate the registry rather than a literal list, so a new module is covered without editing them.
- [ ] No stored module key, grant row or enablement row is migrated.
