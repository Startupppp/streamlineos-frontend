# 52 — Batch C: the project settings lists adopt the surface

**What to build:** The settings lists inside a project — fields, views, workflow, automations, integrations and webhooks, agents and credentials, access, retention, portal, iterations — render through the list surface.

These pages are the most permission-sensitive in Build, so the branch the module owns matters most here: a settings list must show a no-permission state, never an empty table, and must surface a 402 as the upgrade path rather than a generic failure.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [ ] Each settings list renders through the surface
- [ ] Every page in the batch shows a no-permission state for an actor without its permission key, never an empty table
- [ ] The permission key each page declares matches the one its route requires, asserted rather than assumed
- [ ] No page in the batch changes visibly for an actor who does hold the permission
- [ ] Files in the batch that exceeded 500 lines drop below it, per FE-57
