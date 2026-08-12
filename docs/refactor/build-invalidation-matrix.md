# Build — cache invalidation matrix

Closes the DoD item "invalidation matrix documented; no blanket `invalidateQueries()`".

Rule: a mutation invalidates the narrowest prefix that can have changed. `queryKeys` factories
live in `frontend/lib/query-keys.ts`; every key is rooted so a prefix invalidation is exact.

| Mutation | Invalidates | Deliberately NOT invalidated | Why |
|---|---|---|---|
| create / update / delete ticket | `tickets.list(projectId, filters)`, `tickets.detail(id)` | project analytics | Aggregates are recomputed by the daily snapshot cron; invalidating per edit re-runs a portfolio rollup on every keystroke |
| inline field edit (assignee, priority, points, labels, dates) | patched **optimistically in the exact cache the view renders from**; `onSettled` reconciles that key only | sibling views, analytics | §11: never invalidate a heavy aggregate on every field change |
| drag / reorder (`rankTicket`) | optimistic rank patch on the board's infinite-query pages | the whole `tickets` prefix | A reorder touches one row; blanket invalidation would refetch every page mid-drag |
| status change | ticket list + detail, and `projects:analytics:{org}:{project}` (Redis `del`) | other projects | Status is the only field feeding the open/done counters |
| sprint start / close | `sprints.*`, `tickets.list` for the project | closed sprint metrics | A closed sprint's numbers are frozen by design (`sprint_scope_events`) |
| create / archive project | `projects.all` prefix | tickets | Project rows carry no ticket data |
| merge feedback (`0428`) | `roadmap.all` prefix | — | Merge moves votes between two posts and changes list membership, so the whole roadmap surface is stale |
| workspace switch | nothing invalidated — the workspace id is **part of the key** | — | §11: the discriminator belongs in the key, not in an invalidation |
| org switch | `queryClient.clear()` | — | Until every key carries the org id, a full clear is the only safe boundary (§11) |

**Server-side.** Redis entries are versioned per tenant/resource namespace and read through
`cachedVersioned`; every writer bumps the namespace with `invalidateNamespace`. No new request-path
`invalidatePattern` (`SCAN`) calls — it exists only as a compatibility fallback.

**Never cached:** anything a billing or invoicing calculation reads. Timesheet rates and approved
entries are always read from the database.
