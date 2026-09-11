# ADR 0005 — A DataScope is spent through a scoped read, not carried as a string

**Status:** Accepted
**Date:** 2026-09-10
**Supersedes:** the enforcement half of `backend/src/scripts/check-scope-application.mjs`

## Context

`DataScope` (`common/rbac/data-scope.ts:3`) is the string `"all" | "team" | "own" | "none"`. It is produced by 40 `resolve*Scope` functions in 28 files and consumed at 153 sites across 55 production files. Resolution and application are a two-part protocol the caller completes by hand:

```ts
const scope = await resolveTicketsScope(this.access, u);
if (scope === "none") return [];
.where(and(eq(t.orgId, u.orgId), applyScope(scope, u.orgId, u.userId, cols)))
```

Three things can go wrong and none of them is a type error:

| Failure | What it looks like | What it costs |
|---|---|---|
| Resolved, never spent | `scope` only compared to `"none"` | `own` and `all` behave identically — the gate reads as present and admits everyone |
| Spent, tenant predicate omitted | `.where(applyScope(...))` with no `eq(t.orgId, …)` | cross-tenant read wherever RLS is not enabled on that table |
| Spent into a cache key only | `` `${scope}:${year}` `` | the cache is finer than the data; nothing is hidden |

The invariant was policed by `check-scope-application.mjs` — 329 lines of regex that classify source text to approximate "was it spent". It reports 153/153 applied today, so it is currently green; it is still a heuristic over text, it cannot see the tenant predicate at all, and it can only ever run after the fact.

Candidate C5 in the 2026-09-09 architecture review proposed returning an opaque branded predicate instead of a string. That is not by itself sufficient. TypeScript cannot prove a local value was consumed, so a branded value can still be resolved and dropped. Two of the three uses the scanner flags as illegitimate are in fact legitimate and must survive: `none` is a real deny decision that should terminate before the database, and the scope is a real cache discriminator that prevents one caller's scoped rows being served to the next.

## Options considered

**1. Branded scope / branded predicate value.** `resolveXScope()` returns `ScopePredicate` instead of `string`. Cheap; blocks the cache-key and literal-comparison misuses. Does not block dropping the value, does not carry the tenant predicate, and deletes the two legitimate uses along with the illegitimate one. Rejected: it is the review's own proposal and it does not close the failure that matters.

**2. An authorization result exposing a deny decision plus an executable predicate.** A value object with `denied`, a cache `discriminator`, and a `predicate(cols)`. Keeps the legitimate uses. Still lets a caller take the predicate and forget the tenant clause, and still lets a caller hold the object and query anyway. This shape already exists unused in the tree (`modules/access/object-access.ts:21`, zero production call sites). Rejected on its own; adopted as the base.

**3. A scoped read operation that executes only after tenant and scope are installed.** The value object of (2), but its only exit is a runner that builds the WHERE itself — tenant predicate, then DataScope predicate, then the caller's domain filters — and hands the caller an opaque clause token it cannot forge. **Chosen.**

## Decision

`ScopedRead` (`modules/access/scoped-read.ts`) is the one canonical scoped-query interface. It holds the resolved `DataScope` in a `#` field — not `private`, which is erased at runtime — so the string has no exit except the three named ones.

```ts
read.read(
  { tenant: deals.orgId, scope: { columns: { ownerColumn: deals.assignedToId } }, and: [isNull(deals.deletedAt)] },
  (where) => this.db.select().from(deals).where(where.sql),
  () => [],
)
```

- **`tenant` is a required field.** A scoped read with no tenant predicate does not compile. This is the arm the old scanner could not see at all.
- **`ScopedWhere` is nominal and unforgeable.** Its class binding is not exported — only its type is — and it carries a `private` field, so a structurally identical object literal is not assignable. The only producer is `ScopedRead`, and every clause it produces is `and(tenant, scope, ...domain)`.
- **`none` terminates before the database.** `read`/`compose` return `whenDenied()` without invoking the query. `applyScope("none")` still renders `false` underneath, so the deny is belt and braces, not either/or.
- **`discriminator` is the canonical cache key fragment**, and it fixes a defect the string form had: `own` and `team` select different rows for different people, so the actor id is part of the fragment. Keying them on the bare word let one member's scoped result answer the next member's request.
- **Domain ownership stays distinct from column ownership.** `scope: { own, team? }` lets a table whose ownership is a membership id, an approver, or a participation semi-join express that directly, instead of being forced through `ownerColumn` or branching on the literal. `all` and `none` are not expressible there — they are always `true` and `false` — so a domain predicate cannot accidentally widen them.
- **`rawScope(reason)` is the only escape hatch**, for a caller that must branch on the value itself. It is greppable, it takes a reason, and every call site is enumerated in the boundary gate.

`applyScope` keeps its signature and becomes internal to the access module: `scoped-read.ts` is its only permitted importer.

## How each concern is handled

| Concern | Handling |
|---|---|
| `none` | Typed deny state (`denied`), short-circuits before execution, and renders `false` if it ever reached SQL |
| Tenant predicate | Required `tenant` field, installed by the runner, never by the caller |
| Cache-key variation | `discriminator`, actor-qualified for `own`/`team` |
| Raw SQL escape points | `rawScope(reason)` — named, allowlisted with a reason in `check-scope-boundary.mjs`, and covered by a test |
| Detached workers | Same `ScopedRead.of(...)`; a worker and a request produce an identical clause for the same actor and scope |
| Incremental migration | Per-module batches: each module's resolver flips to `Promise<ScopedRead>` together with its consumers, so every batch typechecks |

## Consequences

**`team` is inert today and this does not change that.** No production call site passes `teamColumn`/`teamIds` — the only occurrences are the parameter declarations in `apply-scope.ts` itself. Every `team` grant therefore renders exactly as `own`. That is the documented position in `backend/CLAUDE.md` §5 ("`team` ships only once materialised"), it is now pinned by a test rather than left to be rediscovered, and it is unchanged by this ADR.

**Cache keys change shape.** `own`/`team` fragments gain the actor id. Existing entries under the old keys are not read again; they expire on their TTL. This is a cold cache, not a migration.

**The old scanner is replaced, not merely deleted.** `check-scope-application.mjs` answered "was this string spent"; that question is now answered by the type. `check-scope-boundary.mjs` answers the questions the type cannot: who may import `applyScope`, who may call `ScopedRead.of`, and which `rawScope` call sites are declared. It is a boundary check over imports and call sites, not a classifier over source text.

**What is now NOT protected.** A caller can still receive a `ScopedWhere` and decline to put it in the query. Nothing in TypeScript prevents ignoring an argument. What is prevented is *building* a scoped query whose WHERE lacks the tenant predicate or the scope predicate, and *obtaining* the scope string outside the resolver layer. The residue is the `rawScope` allowlist, which is finite, named and tested.

## Measured outcome

| | Before | After |
|---|---|---|
| Production files spending a DataScope | 55 | 0 |
| Files carrying a `ScopedRead` | 0 | 123 |
| `applyScope` callers | 53 | 1 (`scoped-read.ts`) |
| Enforcement | 329-line text classifier, 153 sites | 4 structural rules + 14 declared escapes |
| Scanner self-test checks | 12 (over its own regexes) | 15 (each proved to bite) |

`unrestricted` and `broadest` were added during the migration, not designed up front.
Thirteen call sites independently wrote `rawScope(...) !== "all"` — the standing
question root `CLAUDE.md` §5 already names as the gate an optional `userId` filter
must pass — and two combined two resolved scopes by hand. Both are typed decisions
that keep the value private, so they belong beside `denied` rather than behind the
escape hatch.

## The residual raw consumers

Fourteen files read the value through `rawScope(reason)`. Each is enumerated with its
reason in `check-scope-boundary.mjs`; an unlisted call fails the gate. They fall into
four kinds, and none of them is a row predicate:

- **Persisted authorization snapshots.** The HR export pipeline (`hr-export.controller`,
  `hr-export-jobs.service`, `hr-export-worker.service`) and the expenses export
  controller store the scope on a job row so a worker can replay it, and compare a
  stored scope against a live one by rank.
- **Audit metadata.** `attendance-email-report.service` records which scope produced a
  report; the report's own rows are scoped by predicate.
- **A different answer shape per scope.** The Ably capability
  (`support-realtime.service`) is a channel wildcard or an id list; the agent-performance
  report (`support-reports.controller`) narrows its `GROUP BY` subject; the dashboard
  project sections pick a different membership query entirely; the payroll and workspace
  AI copilots answer self rows, a refusal, or an org summary.
- **An authorization gate on a subject rather than a row set.** GDPR export of another
  subject's data, dashboard stats collapsing attendance visibility to a flag, and one
  timesheets period read that authorises an already-fetched row — that last one also
  treats `team` as a bypass where every list treats it as `own`, a pre-existing
  difference this migration preserved rather than silently unified.

## What the type still cannot prove

A caller can receive a `ScopedWhere` and decline to put it in the query; nothing in
TypeScript prevents ignoring an argument. Nine handlers resolve a scope and spend it as
a *subject* gate rather than a predicate — `?userId=` widening on attendance, work logs
and timesheets, and the assignee/reporter check on build tickets, where `build:manage`
at `none` means "not a manager" and the participation check is the real authorization.
Those are classified, not defects: attendance and work-log self-reads are platform core
under root `CLAUDE.md` §8, and denying them would remove a universal surface.

The mutation checks that make this concrete: removing the scoped read from
`deals-import-export` fails exactly the `own`-predicate and `none`-no-query tests while
the tenant test still passes; removing it from `support-tickets.getTicket` fails the
three BOLA gate tests while the 404 tests still pass; and deleting the `tenant` field
from a spec is a compile error, not a test failure.

## What would reverse this decision

- Materialising `team` against `org_unit_members` in a way that needs a second resolution round-trip inside the predicate; `ScopeShape` would need to become async.
- Postgres RLS covering every tenant table, which would make the `tenant` field redundant rather than load-bearing. It does not today (`ADR 0001`).
- A move to a repository layer that owns table access outright, at which point `ScopedRead` becomes an argument to a repository method rather than a runner of its own.
