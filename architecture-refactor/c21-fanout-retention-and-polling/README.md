# c21 — Right models, right throughput — fan-out, retention and polling

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 6 tickets, 0 retired.

The models are correct: the realtime capability is per-channel with active revocation, the outbox relay claims rows safely, and chat unread uses a watermark. **What is wrong is what happens at volume** — a 50k announcement is a sequential insert loop that outlives the HTTP timeout, three tables grow forever, and polling alone is ~22,000 requests per second at 50k sessions with over half from one four-second widget.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Polling stops when realtime is live](issues/01-polling-stops-when-realtime-is-live.md) | — | ready-for-agent |
| 02 | [An announcement to everyone completes](issues/02-an-announcement-to-everyone-completes.md) | — | ready-for-agent |
| 03 | [Notifications page correctly, and mark-all-read is constant work](issues/03-notifications-page-correctly-and-mark-all-read-is-constant.md) | — | ready-for-agent |
| 04 | [Three growing tables are partitioned](issues/04-three-growing-tables-are-partitioned.md) | — | ready-for-agent |
| 05 | [Retention detaches rather than deletes](issues/05-retention-detaches-rather-than-deletes.md) | 04 | ready-for-agent |
| 06 | [The inbox renders from cached metadata](issues/06-the-inbox-renders-from-cached-metadata.md) | — | ready-for-agent |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
