# Architecture review 2026-08-23 — ticket programs

Nine candidates, nine specs in [`docs/specs/`](../docs/specs/README.md), 29 tickets here. Every candidate was re-verified at source on 2026-08-25 before its tickets were written; five had shipped in the ~85 commits since the review, so each ticket set covers only what actually remains.

| Candidate | Verified status | Tickets | Ready now |
|---|---|---|---|
| [c1 — KB visibility seam](c1-kb-visibility-seam/README.md) | shipped, one residue | 3 | 01 |
| [c2 — Calendar source registry](c2-calendar-source-registry/README.md) | shipped | 2 | 01 |
| [c3 — One representation of capability](c3-one-representation-of-capability/README.md) | half shipped | 6 | 01, 04, 05, 06 |
| [c4 — Module availability interface](c4-module-availability-interface/README.md) | seam shipped, inputs did not | 4 | 01 |
| [c5 — Payment provider adapter](c5-payment-provider-adapter/README.md) | **not started** | 4 | 01 |
| [c6 — Split help centre and wiki](c6-split-kb-help-centre-and-wiki/README.md) | shipped on the backend | 3 | 01, 02, 03 |
| [c7 — Chat message fan-out](c7-chat-message-fanout/README.md) | shipped | 3 | 01, 02 |
| [c8 — Frontend server-data seam](c8-frontend-server-data-seam/README.md) | seam built, rollout at 1 route | 3 | 01 |
| [c9 — Transactional outbox](c9-transactional-outbox-decision/README.md) | a decision, not a defect | 1 | 01 |

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
