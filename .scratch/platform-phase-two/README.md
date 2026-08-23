# Platform phase two — ticket set

Fifteen tickets across four independent streams, derived from four PRDs in `docs/specs/`, dated 2026-08-23.

## Progress — 2026-08-23

**Six done: 01, 05, 10 (backend, committed) · 03, 08, 13, 15 (frontend, uncommitted by request).** That is seven tickets; 13 landed partial and says so on its face.

**Five blocked by a concurrent session**, not by their blockers: 02, 04, 06, 07, 09, 12, 14. Another agent has been editing this tree throughout — `common/rbac/module-vocabulary.ts` (tickets 02, 06, 07), `common/rbac/module.guard.ts` (07), and the whole `entity-reference` / `build-entity` / `crm-entity` / `chat-messages` set (04, 09, 14). Stream B was clear when the tickets were written and was overtaken while stream A was being built.

**11 not started** — it is infrastructure-dependent and was flagged as such when ticketed.

### Verified state

- Backend: `tsc --noEmit` 0 errors. 59 suites / 539 tests green across access, rbac, module-access, delegations and organization.
- Frontend: `tsc --noEmit` 0 errors. **Full suite 76 suites / 432 tests green.**
- Nothing was run against a booted application. Several criteria are marked unmet for exactly that reason.

### Incident — commit 496d0404 in `streamlineos-api`

That commit is titled for ticket 10 and contains seven files belonging to it plus **24 files of the concurrent session's in-flight work**. Cause: `git add <paths>` followed by a bare `git commit`, which takes the whole index — and the index is shared. The staged count printed 31 against 7 expected and that signal was not acted on. Nothing was lost and the tree typechecks; the commit is mislabelled, not broken. History was left intact by decision, with commit `56fdde0c` recording exactly which files were swept in.

**The correct form is `git commit -m … -- <paths>`**, which commits only those paths whatever else is staged. Any future work in this tree should use it.

Every premise here was re-verified against the tree before ticketing. Three of the source review's claims did not survive that check and are corrected in the PRDs rather than carried into the tickets — see "Premises corrected" below.

## The streams

| Stream | PRD | Tickets | What it delivers |
|---|---|---|---|
| **A — Access version channel** | `2026-08-23-access-version-channel-prd.md` | 01, 05, 10, 11 | A revoked permission stops working on every instance within a stated window, not just the one that processed the revocation. |
| **B — Module registry** | `2026-08-23-module-registry-prd.md` | 02, 06, 07, 12 | One declaration of what a module is; the four disagreeing catalogs become derived views. |
| **C — List-view seam** | `2026-08-23-list-view-seam-prd.md` | 03, 08, 13, 15 | Build's filter machinery becomes the platform's, reachable from any module. |
| **D — Entity actions path** | `2026-08-23-entity-actions-path-prd.md` | 04, 09, 14 | A module contributes an action to chat by writing an adapter method, not a chat endpoint. |

The four streams do not block each other. Within a stream the order is prefactor → core slice → follow-ups.

Tickets 01, 02, 03 and 04 have no blockers and can all start immediately.

## Dependency order

```
01 ──▶ 05 ──┬──▶ 10
            └──▶ 11 (infra-dependent)

02 ──┬──▶ 06 ──┐
     ├──▶ 07 ──┼──▶ 12
     └─────────┘

03 ──▶ 08 ──▶ 13 ──▶ 15

04 ──▶ 09 ──▶ 14
```

## Premises corrected before ticketing

These are recorded because each one would have produced a ticket that built the wrong thing.

- **"Three to four transactions per request" is superseded.** The phase-one ticket set already fixed the warm path, and a request-cost gate exists pinning roughly one tenant transaction per request — the handler's own. Stream A is therefore sold on **correctness, not cost**: the five-second version poll is the entire cross-instance revocation mechanism, and it cannot be safely moved in either direction. Ticket 01 exists because that gate cannot see the cold path — a hundred-request run finishes inside the five-second window.
- **Cache pub/sub is not available.** The only client speaks HTTP and cannot hold a subscription. Ticket 05 uses a *shared counter* instead: coherence comes from the counter being shared, not from it being pushed. Any design that reaches for `SUBSCRIBE` here is unbuildable.
- **The list-view module already exists.** The source review specified building one; Build has roughly 2,400 lines of it. Stream C is a reshape and a move, not a build. It is also not the one-line move the review implied — the category union is closed and the URL hook takes no arguments, which is why ticket 08 exists between the fence and the move.
- **Stream D is not fixing an oversight.** The entity reference seam PRD deliberately froze the four Build-keyed endpoints as its behaviour-preservation control. This stream is the follow-up that boundary implied.

## Constraints carried from phase one

Decided already; do not reopen inside these tickets.

- **Platform billing is never delegated.** Organization owner and admins only. Billing joins the registry as `platform-admin` and must appear in neither the plan-gated nor the delegable derived view.
- **Universal means ungated, not defaulted.** A member default is revocable; a platform-core guarantee is not. Home and the communication surfaces are universal.
- **Six standings, no custom roles.** Organization owner, admin, member; per module owner, admin, member. Per-person grants narrow capability without inventing a role — and they land in the caches Stream A changes, so they inherit the same revocation window.
- **Measuring the guard chain has three traps**, each of which produced a confidently wrong number first: measure as a **non-owner** (an owner short-circuits before permission resolution, so the path under test never runs); count **in-process borrows**, not database statistics (whose background rate is the same magnitude as the signal); and issue requests **concurrently** so background work cannot dominate the window.

## Known hazards in this area

- A bare transaction mock never invokes its callback, so failure tests pass, success tests fail, and every security assertion inside proves nothing. Third sighting in this codebase.
- `e2e-spec` files are excluded from the default suite and run only under the e2e script — a route table added there is not executed coverage.
- The controller e2e harness stubs the access, entitlement and membership services. It proves authorization *outcomes* and cannot carry a cost assertion.
- Adding a database read to a service breaks every existing spec mock for it; the mock surface must move in the same change.
- Dead-code claims need a module-graph tool and a real build. A bare side-effect import is invisible to a from-based scan and has already cost one live file.

## Publication note

The repository has no configured issue tracker. These follow the phase-one convention: one file per ticket, triage state on the `Status:` line. Run `/setup-matt-pocock-skills` to publish to a real tracker instead.
