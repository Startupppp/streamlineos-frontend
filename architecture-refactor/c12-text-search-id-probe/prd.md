# c12 · Route text search through the id probe that already exists

**Status: mechanism shipped five times, global search does not use it.** Verified at source 2026-08-25. Five `SECURITY DEFINER` id-probe functions exist — `app.search_ticket_ids`, `app.search_kb_article_ids`, `app.search_chat_message_ids`, `app.search_lead_ids_by_company`, `app.search_party_ids_by_company` — each with exactly one caller, each with the bounded `cap + 1` fallback. Migration `0275` created four trigram indexes on `business_parties` and shipped the probe for them. **The global header search reads those same four columns with a plain `ILIKE`.**

## Problem Statement

**As a user, the search box is the slowest thing in the product.** Every keystroke that reaches the server fans out to five parallel queries, and under RLS each one is a sequential scan. The tables it scans are the ones that grow fastest.

**As a user, a search that finds nothing is the slowest search of all.** `LIMIT 10` bounds the result, not the work. A term that matches nothing scans every row before returning empty — so the worst experience is reserved for a typo.

**As a developer, the code says the opposite of the truth.** `search.service.ts` carries a header comment stating the trigram indexes "are what these ILIKEs land on now." Migration `0275`, part of the same programme, states that under RLS the planner "skips the GIN index entirely." Both cannot be true. The migration has the reasoning, the `REVOKE`/`GRANT` and a working implementation; the service comment is the wrong one — and it is why nobody re-checked.

**As a developer, the fix looks like it is already applied.** The indexes exist. The probe functions exist. The pattern is documented in the constitution. Everything needed is present, so the natural conclusion is that search is fine.

**As a security reviewer, every new probe is a place a tenant filter could be wrong.** This cuts the other way and is why the mechanism was deliberately kept targeted: a `SECURITY DEFINER` function runs as a `BYPASSRLS` owner, so a wrong `WHERE` is a cross-tenant leak rather than a bug.

## Solution

**Do not wrap all 213 `ilike()` call sites.** Targeted wrapping is a standing decision and it is the right one — most of those indexes are on tables that are near-empty, and every wrapper is a place a tenant filter can go wrong.

The defect is narrower and precise: **a table where a probe already exists, and a second module searches it raw anyway.** That is not a scale trade-off; it is two code paths against one table, one fast and one not, and the slow one is on the hottest surface in the product.

Route global search through the probes. Two of its five branches already have functions. Three more — deals, contacts, clients — follow the same twenty-line template against indexes `0275` already built.

Then delete the comment that says otherwise.

## User Stories

1. As a user, I want the search box to return within a keystroke's patience, so that search is usable while typing.
2. As a user, I want a term matching nothing to return quickly, so that a typo does not cost more than a hit.
3. As a user, I want search results to stay scoped to my organisation, so that speed never comes at the cost of isolation.
4. As a user, I want search to respect my data scope, so that I do not see records I could not open.
5. As a user, I want a very broad term to still return something quickly, so that searching "a" degrades rather than hangs.
6. As a user, I want search to keep working when a probe is unavailable, so that a database-side failure degrades rather than breaks the box.
7. As a user searching for a ticket by its key, I want an exact match found directly, so that the common case does not go through text search at all.
8. As a developer, I want one documented way to make a text search indexable under RLS, so that the sixth probe is written like the first five.
9. As a developer, I want a probe to return identifiers only, so that the bypass cannot widen what anyone sees.
10. As a developer, I want the caller's own query to keep its RLS and scope predicates, so that authorization is unchanged by the optimisation.
11. As a developer, I want a probe to take its organisation from the session GUC and never from a parameter, so that a missing context fails closed.
12. As a developer, I want a probe to be bounded, so that a broad term cannot make it slower than the scan it replaced.
13. As a developer, I want comments that contradict a migration to be corrected, so that the next reader is not talked out of looking.
14. As a security reviewer, I want `EXECUTE` revoked from `PUBLIC` and granted only to the application role, so that the probe is not a general-purpose bypass.
15. As a security reviewer, I want each probe covered by a cross-tenant test, so that a wrong predicate is caught by the suite.
16. As an operator, I want search cost bounded by a budget, so that a regression here fails the build.

## Implementation Decisions

**Already shipped — copy this, do not redesign it**

- **The probe shape, five conditions, all load-bearing.** Organisation comes from `app.current_org_id()` and never from a parameter, so a missing GUC fails closed. It returns ids, never row data. The caller's query still runs under RLS with its own scope predicate. `EXECUTE` is revoked from `PUBLIC` and granted to the app role. It takes a limit.
- **`leads-read.service.ts` is the reference caller**, including the part most likely to be dropped: it asks for `cap + 1` and **falls back to plain `ILIKE` when the cap is hit**. An unbounded set-returning function is materialised in full, which is *slower* than the sequential scan it replaced for a broad term. This fallback is not an optimisation; it is what stops the fix from being a regression.
- **`LEAKPROOF` is impossible here.** Neon grants no true superuser, and `ALTER FUNCTION … LEAKPROOF` fails even as owner. It is not the remedy and must not be proposed.
- **The mechanism is the operators, not the policy function.** Search operators are not leakproof, so the qual is demoted below the security qual and the GIN index cannot be used. Marking the policy's function leakproof would not have helped.

**To build**

- **Three more probes** — deals, contacts, clients — against indexes `0275` already created. Same template, same five conditions.
- **Global search calls probes for all five branches**, each keeping its existing `authorize` result and scope predicate. The authorization shape does not change; only how candidate rows are found.
- **The ticket branch uses the existing `app.search_ticket_ids`.** It is already written and already unused here.
- **An exact ticket-key lookup short-circuits text search.** A query shaped like a ticket key resolves directly, which is both faster and the common case.
- **Each branch keeps its own fallback.** A broad term falls back per branch, not globally — one broad branch should not force four narrow ones onto a slow path.
- **Correct the service comment.** It is a one-line change and the highest-value part of this spec for the next reader.
- **Register search under a read budget** from c11, so this cannot silently regress again.

## Testing Decisions

**What makes a good test here.** Assert results and isolation, not plans — plans belong in c11's budgets. The two properties that matter are that the probe returns the same rows the raw query did, and that it cannot cross a tenant.

- **Equivalence** — for a set of terms including empty, exact, partial, case-varied, punctuation-bearing and no-match, the probe path returns the same identifiers as the raw path. This is the test that makes the change safe to ship.
- **Cross-tenant isolation, per probe.** Seed two organisations with colliding text; assert each sees only its own. `SECURITY DEFINER` makes this the critical test — a wrong predicate here is a leak, not a bug.
- **Fails closed with no GUC** — invoking a probe without a tenant context raises rather than returning rows. Prior art exists in the RLS verification tooling.
- **Cap fallback** — past the cap, the branch falls back to `ILIKE` and still returns correct results. Assert the results, not the branch taken, so the test survives a change in strategy.
- **Scope is preserved** — a `team`- or `own`-scoped actor gets the same subset through the probe path as through the raw path. This is the assertion that proves the bypass did not widen anything.
- **Prior art**: the existing search and leads-read specs, and the RLS verification script's fail-closed checks.

## Out of Scope

- Wrapping the remaining `ilike()` sites. Targeted is the standing decision.
- Replacing trigram search with full-text or a vector index.
- Cross-module ranking or relevance scoring.
- Search-as-you-type infrastructure, debouncing or client caching.

## Further Notes

This is the clearest case in the review of a fix that was **built, proven, documented and then not applied where it was needed most**. The measured gap on this pattern elsewhere was 1 ms against 1,090 ms.

The reason it survived is worth recording: a comment in the consuming service asserted the opposite of the migration that created the mechanism. Everything else — indexes, functions, constitution rule — pointed the right way. One wrong sentence in the right file was enough to stop anyone looking for eleven days.
