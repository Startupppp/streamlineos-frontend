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
| [c3 — One representation of capability](c3-one-representation-of-capability/README.md) | 6 | **6** | 0 | — complete |
| [c8 — Frontend server-data seam](c8-frontend-server-data-seam/README.md) | 3 | **3** | 0 | — complete |
| [c9 — Transactional outbox](c9-transactional-outbox-decision/README.md) | 1 → 4 | **4** | 0 | — complete |

**29 tickets → 29 retired, 0 open. All nine candidates complete.**

## The defect the last ticket found

c9-04 was written to unify two durable write paths. Auditing its gate found that the dominant path was not durable at all: **`dispatch.emit()` ran after commit via `registerAfterCommit` and swallowed the error into a log**, so a crash between commit and drain lost the notification silently — across 49 call sites in 34 files, against 3 using the durable alternative.

`emit()` is now the one way to emit, and it is durable: it records the intent inside the caller's transaction, then drains it the moment that transaction commits, so nothing is lost and latency is unchanged. The 27 `void this.dispatch.emit({…})` call sites are `await` — the notification is part of the caller's unit of work and the code now says so.

**The unification landed on `notification_outbox`, not the domain bus.** The gate had identified two costs of routing notifications through `outbox_events` — recipients travelling in `payload` by convention, and TTL needing re-implementation. Both are costs of the destination rather than of unifying, and both vanish on the notification outbox, where `target_user_ids` is a real column and TTL is already applied downstream.

**Two defects surfaced while fixing it, each worse than the bug being fixed:** a stable dedupe key would have permanently swallowed the second comment on a ticket through `onConflictDoNothing`, because the unique index has no time component and rows are never deleted; and the drain marked its row on a handle with no tenant GUC, which RLS refuses `42501`, leaving the row to be re-dispatched as a genuine duplicate.

Proven on a booted app as `streamline_app` with RLS live, by **discarding the drain hook to simulate a crash** — the intent survived PENDING, the relay recovered it, a real notification appeared. Under the old code that emission left no row at all. 465 DELIVERED rows unchanged.

## The one defect worth remembering from this program

Two tickets were ticked, then falsified, then root-caused, then fixed, in that order — and the cause was a single line.

`query-provider.tsx:37` hashes every query key with the signed-in scope prefixed, as a tenant guard. All five prefetch factories built a plain `new QueryClient()` with the **default** hash. So `dehydrate()` wrote `["streamlineos","access","me",…]`, `hydrate()` inserted under it, and every lookup in the app computed `["authenticated:org:user",["streamlineos","access","me",…]]`.

The entry was in the cache, `status:"success"`, holding its data — and `getQueryData` on the identical key returned `undefined`. **Every server prefetch in the application was dead.** Nothing failed; the page refetched and looked fine.

Why it survived so long, and what each layer could not see:

- **Typecheck, `next build`, 99 suites** — all green. A hash mismatch is not a type error.
- **The prefetch tests** assert the cache gets populated. They never look at markup, so they cannot fail when the shell refuses to render.
- **The factory tests** mock the factory out entirely and assert the route's permission-check ordering. Not one of them ever ran a real factory.
- **A verification pass** marked it PASS on finding the snapshot in the first HTML with real scope keys. Data in the payload is not a control being rendered.

It is the exact failure c8-02's own criteria named — *"a hand-typed key hydrates an entry nothing reads, which looks exactly like success"* — reached by a route nobody checked: not a hand-typed key, a one-sided hash function.

**Fixed** by moving the scope string and hash into `lib/query-scope.ts`, carrying neither `"use client"` nor `"server-only"`, since both sides must hash identically. `createAppQueryClient` could not be reused on the server — it is in a `"use client"` module and throws from a Server Component, which is very likely how the factories came to use a plain client at all.

**Re-measured:** `aria-busy="true"` nodes 41 → **0** across five routes; scripts-stripped `<body>` 3,903 → 164,000–224,000 bytes; the org's single worker renders as a real cell with no JavaScript executed. The new test hydrates a server-dehydrated state into the app's own client, and reverting one factory was confirmed to fail it.

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

## What is left as a decision, not as work

- **`accounting.invoice.issued`** — the one held event type. "Send the invoice to the customer" is an outbound business action, not a notification, and no FK settles who sends it.
- **`OUTBOX_DISPATCH_ENABLED` is unset by default**, so the domain bus does not drain in production until someone turns it on. That is a deployment choice; the code is ready and was verified with the flag on.

## Conventions

- **On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row in that candidate's README.
- **Ticket bodies carry no file paths or line numbers.** Everything was verified at source on 2026-08-25 and cited as evidence in the specs, not as instructions. Re-read at source.
- **The review HTML is stale in places** — c3 especially, where the headline shipped the day after it was written. Work from these tickets, not from the review.
- Candidates the review deliberately did not raise are recorded decisions or already-disproved claims. Do not re-raise them.
