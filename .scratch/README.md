# Architecture review 2026-08-23 — ticket programs

Nine candidates, nine specs in [`docs/specs/`](../docs/specs/README.md), 29 tickets here. Every candidate was re-verified at source on 2026-08-25 before its tickets were written; five had shipped in the ~85 commits since the review, so each ticket set covers only what actually remains.

| Candidate | Tickets | Retired | Open | What is left |
|---|---|---|---|---|
| [c1 — KB visibility seam](c1-kb-visibility-seam/README.md) | 3 | **3** | 0 | — complete |
| [c2 — Calendar source registry](c2-calendar-source-registry/README.md) | 2 | 1 | 1 | a 375/768/1280 rendered check |
| [c3 — One representation of capability](c3-one-representation-of-capability/README.md) | 6 | 2 | 4 | browser-level gating checks only; all code shipped |
| [c4 — Module availability interface](c4-module-availability-interface/README.md) | 4 | **4** | 0 | — complete |
| [c5 — Payment provider adapter](c5-payment-provider-adapter/README.md) | 4 | 1 | 3 | a real webhook + order round trip against the booted API |
| [c6 — Split help centre and wiki](c6-split-kb-help-centre-and-wiki/README.md) | 3 | 2 | 1 | load both surfaces in a browser |
| [c7 — Chat message fan-out](c7-chat-message-fanout/README.md) | 3 | 2 | 1 | force a side-effect failure and see the audit trace |
| [c8 — Frontend server-data seam](c8-frontend-server-data-seam/README.md) | 3 | 1 | 2 | curl the HTML and grep for rows / article body |
| [c9 — Transactional outbox](c9-transactional-outbox-decision/README.md) | 1 → 4 | 1 | 3 | **decided and wired**; 3 follow-ups written (consumers, partitioning, unify) |

**29 tickets → 17 retired, 12 open, plus 3 new follow-ups from the c9 decision.**

Every open ticket's CODE is shipped, typechecked and unit-tested. What remains open is runtime or browser verification of specific flows — the honest reason each is still ticked open rather than closed.

## Verification state (2026-08-25)

- **backend** `tsc --noEmit` → **0 errors** · 6 shards → **591 suites / ~5,110 tests** green, except `hr-canonical-parity-preflight.spec.ts`, which fails to RUN because its SQL fixture was deleted in `f43d16b36` **before** this work.
- **frontend** `tsc --noEmit` → clean · `next build` → **passes, 455 static pages** · full suite → **99 suites / 564 tests** green.
- **The API now boots.** The app-role credential was reset from the owner connection, so runtime verification became possible for the first time this session. Confirmed against a live API: the transaction-cost ceiling holds on all three endpoints; `/me/access` carries no permissions array; a plan-locked module returns 402 with its moduleKey; calendar source toggles persist and take effect; a private KB page is found by its author and not by anyone else; chat send returns 201; the outbox relay flushes cleanly.
- **Running it found a bug nothing else did.** Enabling outbox dispatch made every flush die `42501` — a cross-org sweep on the ALS-proxied connection with no tenant context. Two more methods had the same defect. Typecheck, 5,000 unit tests and a clean build had all passed over it.
- **Still unverified:** browser-level rendering (first-paint gating, responsive breakpoints, view-source row checks) and the payment webhook/order round trip. The agent assigned to those hit a billing limit. Nothing about them is claimed.

## Working the frontier

Any ticket whose blockers are all done is grabbable. Thirteen are ready immediately. Three candidates have real chains that must be walked in order, and each uses expand → migrate → contract so the build stays green between steps:

- **c3** 01 → 02 → 03 (the flat permission array on the server)
- **c4** 01 → 02 → {03, 04} (the availability inputs)
- **c5** 01 → 02 → 03 → 04 (the money path)

## If you only do a few

1. **c3-04** — hydrate the access snapshot at the authenticated layout. One edit; ends the gated-control flash on every authenticated page; closes half of c3.
2. **c4-01 → 03** — two `async () => []` literals silently delete a branch of a state machine, and three definitions of "core module" feed one function.
3. **c5** — the only candidate that has not moved, and the only remaining gap on a money path.
4. **c6-01** — cheapest work in the review, highest legibility payoff.
5. **c9-01** — decide, with evidence, before any code moves.

## Conventions

- **On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row in that candidate's README.
- **Ticket bodies carry no file paths or line numbers.** Everything was verified at source on 2026-08-25 and cited as evidence in the specs, not as instructions. Re-read at source.
- **The review HTML is stale in places** — c3 especially, where the headline shipped the day after it was written. Work from these tickets, not from the review.
- Candidates the review deliberately did not raise are recorded decisions or already-disproved claims. Do not re-raise them.
