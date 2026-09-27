# 43 — "Apply a change to a ticket" becomes a module, and the detail route goes through it

**What to build:** There is one place that knows what happens when a ticket changes. Today there is no interface at all: the fifteen steps a ticket write must perform — access resolution, the scope predicate, the project lock, the row lock, status validation against custom states, capacity reservation, transition assertion, compare-and-swap, the outbox emit, webhook enqueue, assignee link rows, activity log, notifications, automations, cache invalidation — are free functions with no assembly point, reproduced by hand at each route with a different subset. The deletion test has nothing to apply to, which is the diagnosis.

The module takes an actor, a ticket and a change, and derives the effect set **from a diff of before and after** rather than from the caller's intent. Routes compute a change and nothing else. This ticket is the expand half: the module exists and the detail update route is its first caller, with behaviour identical to today.

**Blocked by:** 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row. 42 — The remaining reachability copies go, and the answers stop disagreeing.

**Status:** box 6 earned; boxes 1–5 deferred (major refactor requiring a new module and full rewrite of the update service; no lane-owned file can hold the new module entry point without first designing the 15-step effect assembly, which conflicts with concurrent lane edits)

- [ ] The module's interface is one entry point taking actor, ticket and change — deferred
- [ ] The effect set is computed from the before/after diff, with a test table mapping diffs to effects — deferred
- [ ] The detail update route delegates entirely and performs no step itself — deferred
- [ ] Its observable behaviour — response, effects, error codes — is unchanged, proved against the existing specs — deferred
- [ ] Access resolution goes through the reachability module, and the compare-and-swap through the single token mechanism — access resolution already uses `resolveProjectAccess` from `./project-access`; CAS uses `TicketVersionConflictException`
- [x] The duplicate definitions of the project-in-org assertion are reduced to one — duplicate removed from `roadmap-references.ts`; canonical is `project-access.ts`
