# 34 — Version published contracts and reconcile every consumer-facing surface

**What to build:** Published customer and integration contracts carry a version or an explicit backward-compatible deprecation window. Internal frontend/backend contracts may break, but only within the same release commit.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Every published operation is versioned or has a stated deprecation window with a date.
  Evidence: `node src/scripts/check-api-contract-registry.mjs` → exit 0, "all 101 published operations carry a version or dated deprecation window, a named consumer, an idempotency/replay rule and a parameter baseline". `findPublishedContractGaps` is new and fails an entry with no version and no `deprecation.sunsetAt`, and fails a version that disagrees with its own `/vN/` path segment; self-test 25/25 pass.
- [~] REST/OpenAPI, webhooks, realtime events, exports and SDK-facing schemas are reconciled against consumer evidence.
  Evidence: 3,613 OpenAPI operations reconciled (`check-openapi-coverage` exit 0, 3613/3613 exposure-stamped); 24 outbox events; **23 outbound customer webhook event names newly catalogued** — before this ticket `registry.webhooks` was `{}` and no gate read them. The frontend's vendored copy is byte-identical to the backend artifact (`check-contract-vendor` exit 0, sha256 ae149514fa2887b8…). Each of the 58 published mutating operations names the handler file its rule was read from.

  **Downgraded `[x]` → `[~]` on 2026-09-03 by the orchestrator, with the measurement.** The work
  above is real and stands — it reconciled *exposure stamping*, the webhook catalogue and vendoring
  integrity. It did not reconcile **response shapes**, which is the half of this box's wording that
  says "SDK-facing schemas … against consumer evidence."

  Measured directly on `frontend/contracts/openapi.json`: **3,613 operations, 2 carrying any
  response schema, 6 `components.schemas` in total.** An independent sweep measured the same artifact
  as carrying a 2xx response schema for **1 of 3,613**. So there are effectively no response shapes
  in the published contract for a consumer to be reconciled against.

  This is not academic. **Seven user-visible bugs shipped through exactly that gap**, each one a
  backend emission shape disagreeing with the frontend type that reads it, with both repos
  typechecking clean throughout: chat channel members (Favourites permanently empty), huddle
  participants (every tile "Unknown", WebRTC mesh with no peer ids), **`Message.senderId` emitted by
  no read path at all** (your own messages render as someone else's; Edit and Delete never appear),
  saved messages ("Unknown" on every card), support watchers (unfollow unreachable), build watchers
  (un-watching unreachable), HR internal openings (department badge never rendered). Details in
  `reports/49-api-shape-divergence-sweep.md`.

  Contributing cause, also measured: **Drizzle's `with:` is not type-checked on this schema** —
  `findMany({ with: { x }, columns: { id: true } })` infers `{ id: number }[]`, the `with`
  contributing nothing. The backend does not infer the shape and the frontend casts, so nothing
  between them arbitrates.

  **Residue and owner:** response shapes are unreconciled. The instrument that works is `apiClient`'s
  `contract` option with `check:response-contracts`, at **59 of 2,662 seam calls (2.2%)** — every
  route in all seven findings was unvalidated. Adoption on identity-bearing reads is assigned and in
  flight. `openapi:check` cannot close this: it diffs the backend against itself.

- [x] Idempotency and replay rules are documented per published operation.
  Evidence: all 101 published operations carry an `idempotency {mode,key,replay,source}` block — 43 safe, 20 at-least-once-unfenced, 7 replayable-write, 6 natural-key-upsert, 6 advisory-dedup-unfenced, 6 single-use-token, 3 provider-signature-and-event-id, 3 single-use-token-racy, 3 no-persistence-rate-limited, 2 provider-signature-idempotent-effect, 1 optimistic-concurrency, 1 captcha-single-use. Declarations live in the hand-authored `contracts/published-contract-terms.json`; the gate fails any published mutating operation with no rule.
- [x] Removed-operation records are retained for breaking-change enforcement rather than deleted.
  Evidence: 12 retained operation tombstones survive regeneration (`check-api-contract-registry` REPORT block). Retention now extends to webhook event names, and the retention is no longer defeatable by mutation — see the next box.
- [x] The published set is treated as exactly what the registry classifies as published — the exposure marker is not itself the published contract, and an unknown operation fails closed.
  Evidence: probe against the real committed artifacts — an operation present in openapi.json but absent from the registry → 1 violation; with no `x-exposure` at all → 1 violation; a webhook event name a dispatcher emits but the registry has never seen → 1 violation. **Defect found and fixed:** a RETAINED entry was invisible to the completeness pass (which walks openapi.json) and `findBreakingRemovals` exempted anything not literally `"published"`, so corrupting a published tombstone's classification to `internl` / `null` / `"published "` silenced a real removal with both gates green. Now `findInvalidEntries` validates every entry including tombstones, and only the exact string `"internal"` buys an exemption. Probe: both counters were 0 before, are 1 after.
- [x] Duplicate controller class names are checked: two controllers sharing a name collide in the generated document and publish one another's contract.
  Evidence: 560 `@Controller`-decorated classes scanned, **0 duplicate class names**; `check:operation-ids` → 0 duplicate operationIds across 3,613 operations in 2,676 paths. (The header comment in check-api-contract-registry.mjs still claims "known defect: 28 ops"; that is stale — the live run reports none.)
- [x] The generated registry is regenerated by its own command, never hand-edited — re-serializing it reorders thousands of keys and produces a meaningless diff.
  Evidence: every change to `contracts/api-contract-registry.json` was made by changing `src/scripts/generate-api-contract-registry.mjs` and running it. Human declarations go in the new hand-authored **input** file `contracts/published-contract-terms.json`. Regeneration proved idempotent: two consecutive runs differ only in `generatedAt` (`IDEMPOTENT REGENERATION: True`).

## Defects found (both P1, both fixed)

1. **Retained tombstones failed OPEN.** As above — mutating a tombstone's classification silenced a published removal. The generator's own comment guards against *deleting* a tombstone; nothing guarded against *editing* one.
2. **The parameter-narrowing half of the breaking-change gate had never been able to fire.** `findBreakingNarrowings` reads `entry.knownParameters`, which the generator never wrote — 0 of 3,625 entries had it, so `registryParams.size === 0` short-circuited on every operation. Its self-test passed only because the fixtures hand-built a field the generator never produced. The generator now freezes a baseline on first classification for published operations (101/101 carry one); proved live by adding a required `orgId` to `GET /public/kb/{slug}` in a copy of the real document → 1 narrowing, and by dropping its parameters → 2 violations.

## Defect found and fixed on the webhook surface (P1)

3. **Six organization-scoped and eight project-scoped customer webhook event names were an unprotected published contract.** `registry.events` holds OutboxWriter events (internal — our own relay consumes them) and `registry.webhooks` was an empty `{}` the generator never wrote to, so renaming `deal.won` passed every gate in the repository. The generator now scans both dispatchers, the registry catalogues 23 names with scope/version/consumer/emitting file, and `findBreakingWebhookRemovals` fails a rename. Proved against the real registry: dropping `deal.won` from the scanned set → 1 breaking change; the new name → 1 unclassified (fail-closed).
