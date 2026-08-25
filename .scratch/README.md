# Architecture review 2026-08-23 — ticket programs

Nine candidates, nine specs in [`docs/specs/`](../docs/specs/README.md), 29 tickets here. Every candidate was re-verified at source on 2026-08-25 before its tickets were written; five had shipped in the ~85 commits since the review, so each ticket set covers only what actually remains.

| Candidate | Tickets | Retired | Open | What is left |
|---|---|---|---|---|
| [c1 — KB visibility seam](c1-kb-visibility-seam/README.md) | 3 | **3** | 0 | — complete |
| [c2 — Calendar source registry](c2-calendar-source-registry/README.md) | 2 | **2** | 0 | — complete |
| [c4 — Module availability interface](c4-module-availability-interface/README.md) | 4 | **4** | 0 | — complete |
| [c7 — Chat message fan-out](c7-chat-message-fanout/README.md) | 3 | **3** | 0 | — complete |
| [c5 — Payment provider adapter](c5-payment-provider-adapter/README.md) | 4 | **4** | 0 | — complete |
| [c6 — Split help centre and wiki](c6-split-kb-help-centre-and-wiki/README.md) | 3 | **3** | 0 | — complete |
| [c3 — One representation of capability](c3-one-representation-of-capability/README.md) | 6 | 5 | 1 | ticket 04 **reopened** — first paint is false in server HTML |
| [c8 — Frontend server-data seam](c8-frontend-server-data-seam/README.md) | 3 | 2 | 1 | ticket 02 **reopened** — rows are not in the server HTML |
| [c9 — Transactional outbox](c9-transactional-outbox-decision/README.md) | 1 → 4 | 2 | 2 | 7 consumers (one product decision each) · unify notifications (held) |

**29 tickets → 26 retired, 4 open. Six candidates complete: c1, c2, c4, c5, c6, c7.**

The open count fell by four and rose by two: c5, c6 and c8-03 closed on live evidence, and **c3-04 and c8-02 were reopened because criteria had been ticked without proof and are false.** Reopening them is the result, not a setback — see the correction sections in both tickets.

## Verification state (2026-08-25)

- **backend** `tsc --noEmit` → **0 errors** · 6 shards → **591 suites / ~5,110 tests** green, except `hr-canonical-parity-preflight.spec.ts`, which fails to RUN because its SQL fixture was deleted in `f43d16b36` **before** this work.
- **frontend** `tsc --noEmit` → clean · `next build` → **passes, 455 static pages** · full suite → **99 suites / 564 tests** green.
- **The API booted for one window, then the credential rotated again.** It was reset from the owner connection and ran for roughly two hours, during which: the transaction-cost ceiling held on all three endpoints; `/me/access` was confirmed to carry no permissions array; a plan-locked module returned 402 with its moduleKey; calendar source toggles persisted and took effect; a private KB page was found by its author and by nobody else; chat send returned 201; the outbox relay flushed cleanly. Then `28P01` returned on its own — **something rotates that credential on a schedule**, which is why it was broken to begin with. Resetting it repeatedly would be fighting an automated process.

- **Running it found a bug nothing else did.** Enabling outbox dispatch made every flush die `42501` — a cross-org sweep on the ALS-proxied connection with no tenant context. Two more methods had the same defect. Typecheck, 5,000 unit tests and a clean build had all passed over it.
- **Responsive and navigation criteria became tests rather than glances.** There is no browser automation here (no Playwright/Puppeteer/Cypress), so "check at 375/768/1280" was never literally possible. The behaviour behind each is now asserted: Drawer-below-breakpoint both directions, the toolbar's non-wrapping row, the scope badge never hidden on mobile, and nav-surface parity across all three surfaces.
## Second runtime window (2026-08-25, later)

The credential was reset again and a second window used to run every outstanding check. What it settled:

- **Closed on live evidence:** the payment order round trip and forged-signature rejection (c5); help centre and wiki both loading after the 72-file rename (c6); the public article body server-rendered with the sanitiser stripping a real attack payload (c8-03); the outbox flush suppressing exactly the deliberately-unsubscribed types (c9-02).
- **Disproved:** server-rendered rows (c8-02) and server-HTML first paint (c3-04). Both tickets reopened. The prefetch work is not wasted — it removes the client fetch waterfall — but the shell serves `AppLoadingScreen` on every authenticated route, so nothing gated reaches the markup.

**Two ways this program produced false green, both now recorded in the tickets:**

1. **Tests that can only see the cache.** c8-02's test pair asserts the prefetch populates the query cache. No test could observe markup, so no test could fail when the shell refused to render. Passing tests plus a passing build read as done.
2. **Payload found ≠ control rendered.** c3-04 was marked PASS because the dehydrated snapshot was present in the HTML. It was present, with `status:"success"` and a matching hash — and the page still served a spinner.

**A third, milder one:** a flush returning `{"claimed":0}` against 18 PENDING rows looks like a broken query and is actually a config flag doing its job.

- **Fixed this pass:** the survey consumer's self-opened transaction, adopted because an agent believed `DealClosedConsumerService` had an exactly-once defect. Checking the relay showed it wraps `handle()` in `runInNewTenantTransaction` (`outbox-publisher.service.ts:155`), so the premise was false and the divergence is gone.

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
