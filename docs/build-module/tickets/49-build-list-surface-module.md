# 49 — A Build list surface exists, and a list can be rendered without fetching

**What to build:** One module owns the assembly every Build list page repeats. The *pieces* are already extracted and heavily reused — the toolbar at 45 sites, the filter hook at 44, the page-state hook at 152, the cursor pager at 18. What is not extracted is the assembly: branch order, the retry callback, wiring the reset key into the pager, which empty state to show when filters are active, and where the fill panel goes. 73 files restate it, and the cost of getting one input wrong is already visible — two adjacent pages resolve their empty state differently because one passes an is-empty flag and the other does not.

The module takes what differs — read hook, query key, permission key, columns, filter definitions, empty copy — and owns what never differs: gate, toolbar, state branch, table, pager. It must also accept its rows directly, so a list can be rendered from fixtures without a fetch. That second property is what makes both the tests and the visual harness cheap.

Nine things an author must currently get right in order: the permission key matching the route's requirement, which access hook feeds the enabled flag, a stale-time band, a mutation key, forwarding the abort signal, attaching a contract, feeding the reset key to the pager, passing the error to the state hook, and deciding whether is-empty belongs there. Nine remembered steps is nine chances to ship a 402 as "Something went wrong".

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The module owns gate, toolbar, state branch, table and pager, and callers supply only what differs
- [ ] A list renders from rows passed as props, with no fetch
- [ ] The branch-order test is written once at the module: no-permission, loading, error, 402, empty, filtered-empty, rows
- [ ] Two pages adopt it with no visible change, one of them a page that currently has no test
- [ ] A 402 surfaces as the upgrade path per FE-41, and pagination state stays in the URL per FE-86
- [ ] Query keys come from the single factory per FE-18
