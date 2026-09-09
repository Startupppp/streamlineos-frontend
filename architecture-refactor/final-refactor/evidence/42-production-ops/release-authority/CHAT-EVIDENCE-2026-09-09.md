# PRD-C127 Chat — Current-Head Executable Evidence 2026-09-09

Reconstruction of executable proof at current head. It supersedes the removed 2026-09-04
source-read note, which predated the huddle→Meet migration, the five mutation-auth
fixes, attachment membership-gating at every seam, invite expiry/caps, atomic unread counting,
the `/chat/saved` contract fix and the attachment-URL-expiry proof.

Environment: PostgreSQL 18.6 `scratch_local` (`D:\localstack\data18`, loopback, `sslmode=disable`),
**migration head 701** (the 2026-09-04 doc cited 685), `streamline_app` + `neondb_owner` roles,
899 RLS-enabled tables. Backend booted in production mode against `scratch_local`; mention probe
observed over the real Ably app. Local jest binary throughout (not `npx`).

> Note: the PG18 cluster was resetting every connection with Windows error 487 (shared-memory
> reservation failure under memory pressure); a `pg_ctl restart` re-based it and cleared it. See
> [[windows-postgres-dies-under-memory-pressure]].

---

## VERDICT: PASS with one remaining test-only finding (no product defect)

Every product dimension is proven at current head. The remaining failure is a fixture-sensitive
index assertion, not a product regression. The entity-channel harness finding is resolved below.

## Measured totals (this session)

| Suite | Result |
|---|---|
| Backend chat unit specs (`jest`, DB-free) | **53 suites / 503 tests PASS** |
| Backend chat real-DB specs (`jest-db.json`, `scratch_local`) | 4 suites — **3 PASS (17 tests) / 1 FAIL (1 test)** → Finding F1 |
| Backend chat controller e2e (`jest-e2e.json`) | Five previously green suites plus repaired entity-channel suite; focused rerun **12/12 PASS** |
| Frontend chat tests (`jest`) | **27 suites / 243 tests PASS** |
| Live mention delivery probe (booted API + Ably) | **2 / 2 runs PASS** |

## Sub-claim evidence (current head)

| Sub-claim | Result | Mechanism |
|---|---|---|
| Channel/thread/member/message/reaction/attachment schema, tenant-composite integrity | PASS | 13 `chat_*` tables (2 huddle) at head 701; tenant-isolation unit + `.db.spec` pass; RLS live |
| Channel & mutation authorization | PASS | Entity-channel controller E2E now 12/12; sibling suites cover guard-chain and mutation authorization |
| Cross-channel & cross-tenant denial | PASS | `chat-cross-tenant-404`, `chat-*-tenant-isolation`, `chat-bola-proof` unit specs pass; e2e returns 404 not 403 |
| Message ordering & concurrent position allocation | PASS | `chat-unread-concurrent-delivery.db.spec.ts` on real DB: `UPDATE … message_count+1 RETURNING` row-lock yields gapless, strictly-increasing `channel_position`; BITE (bare SELECT) duplicates, LOCK serializes |
| Fanout & unread counters | PASS | atomic unread proven above; `chat-fanout-outbox.consumer` + `outbox-backed-message-fanout.provider` unit specs pass |
| Bounded history & search | PASS | history cap + channel-history index-served (`idx_chat_messages_channel_position`, no Seq Scan) proven in `chat-read-path-hardening.db.spec.ts`; search unit specs pass |
| Reconnect / realtime / offline | PASS | `chat-reconnect-replay` unit; frontend realtime channel/sender-spoof/dedup/schema + offline UI (243 FE tests) |
| Attachment privacy & signed URLs | PASS | `chat-attachments` unit (3600s TTL); gated at every read seam (`28bd181b2`); URL-expiry storage proof (`21eecbbc3`) |
| Invitation expiration & usage limits | PASS | `chat-invite-link-expiry` + `chat-invite-links.service` unit specs (expire / cap uses / admit once) |
| Cache & realtime invalidation | PASS | unread namespace invalidation (deferred post-commit) unit-covered; FE query-key + realtime dedup |
| Provider/realtime outage, retry, recovery | PASS | outbox-consumer retry, realtime-revocation, huddle Composio/Meet-failure (412/503) unit specs |
| Live mention delivery | PASS | 2/2 probe runs: `@alex`→Alex 1 / Alexander 0 (no substring over-match); `@everyone`→Alex 1 / Alexander 1 (roster expansion); 2 persisted rows |
| Huddle WebRTC + ICE-route removal reconciled | PASS | see below |

## Huddle / ICE-server route reconciliation

The WebRTC mesh controls (`PATCH /chat/huddles/{id}/{mute,deafen,hand,screenshare}`,
`POST /chat/huddles/{id}/signal`) and `GET /realtime/ice-servers` were removed with the Google-Meet
migration. They are **correctly retained as `internal` entries** in
`backend/contracts/api-contract-registry.json` — the registry is a ledger of what was ever exposed so
`check:contract-breaking-change` can detect removals ([[retained-huddle-ice-registry-entries-are-the-removal-ledger]]).
`check:contract-breaking-change` is **green** (internal removals are not breaking); `openapi.json` no
longer serves them; `chat-huddles.controller.e2e-spec.ts` asserts `GET /realtime/ice-servers` now 404s
(**passed** this session). Nothing to delete or regenerate for chat.

- `check:contract-registry` is now green; the two former KB registry gaps were repaired after this evidence was first drafted.
- Stale governance docs still list the retired ICE/TURN flow as "DECISION REQUIRED"
  (`architecture-refactor/DATA-CATALOGUE.md:616`, `decisions/privacy-C185-provider-approvals.md:65`);
  flagged for reconciliation to "retired (no TURN relay after huddle→Meet)".

## Remaining finding (test-only, no product defect)

### F1 — `chat-read-path-hardening.db.spec.ts` due-reminder assertion is fixture-distribution-fragile
The due-reminder cron query (`org_id=? AND remind_at<=now() AND sent_at IS NULL AND cancelled_at IS NULL`)
asserts index `idx_chat_reply_reminders_pending`. That partial index **exists and matches the query
exactly**. On `scratch_local` the planner instead picks `(org_id, sender_membership_id)` for the tiny
`probe-org` slice (still an **index scan on the org slice, not a Seq Scan** — the anti-O(tenant) intent
holds), and a **Seq Scan** for the one seed org holding 309,380 of 312,800 rows as pending+due (≈99% of
the table matches, so the partial index is correctly not selective). Neither slice is a realistic
production distribution. **Fix:** seed `probe-org` with a realistic pending/sent mix, or assert
"index-served / no Seq Scan" rather than the exact index name.

### Resolved F2 — entity-channel controller harness
The harness now supplies the current access, placement, and database surfaces. The focused
`chat-entity-channel.controller.e2e-spec.ts` rerun passes **12/12**, including guarded negative
cases. Preserve the current worktree repair and bind it to the final backend revision before closing
the active Chat task.

## Metadata
- Date: 2026-09-09 · Auditor: current-head executable reconstruction
- DB: `scratch_local` PG18.6, migration head 701 · API booted prod-mode against it · Ably live
- Git commands run: read-only `log`/`grep` for the delta; no mutating git
