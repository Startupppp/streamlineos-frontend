# c21 · Right models, right throughput — fan-out, retention and polling

**Status: the models are correct; the throughput and the growth are not.** Verified at source 2026-08-25. The realtime capability is correctly per-channel with a one-hour TTL and active revocation — the old organisation-wide wildcard is fixed. The outbox relay claims rows with `FOR UPDATE SKIP LOCKED`, has bounded retry and a dead state. Chat unread uses a `lastReadAt` watermark, which is the right model. **What is wrong is what happens at volume**: a broadcast is a sequential insert loop, three tables grow forever with no retention, notification unread is a per-row boolean, and polling alone generates about 22,000 requests per second at 50k sessions.

## Problem Statement

**As an administrator, announcing to 50,000 people times out.** A broadcast inserts one notification row per recipient, in batches of a hundred, **sequentially, inside one transaction**. That holds a single database connection for minutes and exceeds the HTTP timeout. It also bypasses the dispatch pipeline entirely, so a broadcast gets no email delivery, no preference check and no quiet hours.

**As an operator, three tables grow forever.** The retention sweep covers the email outbox and notification deliveries only. Notifications, chat messages and the notification outbox have no retention and no partitioning. Projected at five million users over two years, that is roughly ten billion and thirty-six billion rows.

**As a user, "mark all read" on 50,000 notifications is 50,000 updates.** Chat uses a watermark and is correct. Notifications use a per-row boolean, so a bulk action is a bulk write.

**As a user, my notification list pages incorrectly.** It pages by id below a cursor while ordering by creation time descending. The two orderings disagree, so rows are skipped or repeated at page boundaries.

**As an operator, polling is the dominant cost.** At 50k concurrent sessions the fixed intervals total about 22,000 requests per second — and the support chat widget at a four-second interval alone accounts for 12,500 of them, more than every other poll combined. **None of it is suppressed when the realtime connection is live.**

**As a user, my inbox re-fetches from the provider on every render.** Mail is a pure bridge with nothing persisted, so each render round-trips to the provider: 100–500 ms, a billable call per view, exposure to per-project quotas, and **no search or threading without re-querying**.

## Solution

**Broadcasts become fan-out-on-read.** One broadcast row — the audience model already exists — plus a read-receipt row only when someone dismisses it. Per-user notifications stay fan-out-on-write, which is correct for them. The distinction is the whole design: a message to one person should be written once per person; a message to fifty thousand should not.

**Partition the three growing tables, then retain by detaching partitions.** Never a bulk delete.

**Move notification unread to a watermark**, matching chat. The id is already monotonic.

**Suppress polling when realtime is connected**, and fix the widget interval. This is the largest single cost reduction available anywhere in the review.

**Cache mail metadata only** — subject, sender, date, thread id, read state, labels — populated by provider push, with bodies fetched on demand. This makes search and threading possible without entering the mail-hosting business.

## User Stories

1. As an administrator, I want to announce to every member without the request timing out, so that a company-wide announcement is possible.
2. As an administrator, I want a broadcast to respect notification preferences, so that people are not messaged through channels they disabled.
3. As an administrator, I want a broadcast to respect quiet hours, so that an announcement does not wake anyone.
4. As an administrator, I want a broadcast to deliver by email where preferences ask for it, so that it reaches people who are not in the app.
5. As an administrator, I want to see how many people have seen a broadcast, so that I know whether it landed.
6. As a user, I want to dismiss a broadcast and have it stay dismissed, so that it does not reappear.
7. As a user, I want "mark all read" to be instant regardless of how many notifications I have, so that a full inbox is not a penalty.
8. As a user, I want my notification list to page without skipping or repeating, so that scrolling shows each item once.
9. As a user, I want my unread count to be correct without scanning every row, so that it stays fast as history grows.
10. As a user, I want chat and notifications to feel live without the app polling, so that the product is responsive and cheap to run.
11. As a user, I want polling to stop while realtime is connected, so that my client is not doing redundant work.
12. As a user, I want the support widget not to poll every four seconds, so that an idle tab is not the heaviest thing on the page.
13. As a user, I want my inbox to render from cached metadata, so that opening mail is instant.
14. As a user, I want to search my mail, so that I can find a message without opening the provider.
15. As a user, I want mail threading, so that a conversation reads as one item.
16. As a user, I want message bodies fetched on demand, so that my content is not stored where it need not be.
17. As an operator, I want notifications, chat messages and the notification outbox to have retention, so that they do not grow without bound.
18. As an operator, I want old data removed by detaching a partition, so that cleanup is not a long-running delete.
19. As an operator, I want a retention policy stated per table, so that deletion is a decision rather than an omission.
20. As an operator, I want realtime request volume to scale with activity rather than with session count, so that idle users are nearly free.
21. As an operator, I want provider API usage bounded, so that a quota is not exhausted by rendering.
22. As a security reviewer, I want realtime channel authorization scoped per channel, so that a token cannot subscribe beyond its grant.
23. As a security reviewer, I want cached mail metadata scoped to its owner, so that an inbox cache cannot cross users.

## Implementation Decisions

**Already shipped — do not rebuild**

- **Realtime capability is per-channel** with a one-hour TTL and active revocation. One connection per user, one subscription per open conversation. The organisation-wide wildcard defect is fixed and must not be reintroduced.
- **The outbox relay is correct** — `FOR UPDATE SKIP LOCKED`, bounded retry, dead state.
- **Chat's `lastReadAt` watermark is the right model** and is the pattern notifications should adopt.
- **The notification-preference migration is safe** — routing reads only the rules table; there is no stale-blob-wins path.
- **The audience model for broadcasts already exists**, which is why fan-out-on-read is a change of write strategy rather than a new data model.

**To build**

- **Broadcasts: one row plus read receipts.** Unread state for a broadcast is the absence of a receipt. Delivery through the existing dispatch pipeline so preferences, quiet hours and email are applied.
- **Per-user notifications stay fan-out-on-write.** Stated explicitly so the change is not over-applied.
- **Partition notifications, chat messages and the notification outbox**, then retain by detaching. Partitioning is the prerequisite; a bulk delete on a table of this size is an outage.
- **A stated retention window per table**, recorded rather than implied.
- **Notification unread becomes a watermark.** The monotonic id is the cursor.
- **Fix the notification cursor**: page and order on the same column. Ordering by creation time and paging by id is the defect.
- **Add the tenant column to the chat unread index.** Under row-level security an index omitting it is skipped by the planner, so the index exists and does nothing.
- **Suppress polling while realtime is connected**, with polling as the fallback when it is not. Raise the support widget's interval and drive it from realtime.
- **Mail metadata cache, populated by provider push webhooks. Bodies are never persisted.** This bounds the change and keeps the product out of mail hosting.
- **Mail metadata is keyed and authorized per user**, not per organisation.

## Testing Decisions

**What makes a good test here.** Assert behaviour at volume and at boundaries — a fan-out test with three recipients proves nothing about fifty thousand, and a pagination test on one page never reaches the boundary where the cursor bug lives.

- **Broadcast to a large audience completes within the request budget**, and produces one broadcast row rather than N notification rows. Assert row counts, which is what distinguishes the two strategies.
- **Broadcast respects preferences and quiet hours** — a recipient who disabled a channel receives nothing on it. This is the capability the current path silently skips.
- **Dismissal is durable** and produces exactly one receipt under repeat dismissal.
- **Unread count and mark-all-read are constant-work** — assert the write count does not scale with notification count.
- **Notification pagination at the boundary** — with rows sharing a creation timestamp, assert no duplicates and no gaps across page boundaries. A single-page test passes today while the bug is live.
- **Retention detaches rather than deletes** — assert the partition is gone and that no long-running delete was issued.
- **Polling suppression** — with realtime connected, assert the poll does not fire; on disconnect, assert it resumes. Both halves matter; only testing the first leaves the fallback unproven.
- **Realtime authorization** — a token for one channel cannot subscribe to another, and cannot subscribe across organisations. This is the regression test for the fixed wildcard defect.
- **Mail metadata isolation** — two users in one organisation do not share cached metadata.
- **Prior art**: the existing chat, notification and outbox publisher specs, and the realtime capability tests.

## Out of Scope

- Replacing the realtime provider.
- Persisting mail bodies, or becoming a mail host.
- Migrating chat off its watermark, which is already correct.
- Redesigning notification preferences.
- Push notification delivery beyond what exists.
- The transactional outbox's own design, settled in c9.

## Further Notes

The polling table is the single clearest answer to the cost-efficiency requirement in the whole review: **about 22,000 requests per second at 50k sessions, from clients that are mostly idle**, with one four-second widget accounting for more than half. Suppressing polling while realtime is connected is a small change with a larger effect than any query optimisation in this set.

The inbox item is a genuine fork rather than a defect, and it is recorded here as a decision rather than a task. Persisting nothing is a defensible choice with real benefits — no mail content in the database, no synchronisation to maintain. It also makes search and threading impossible. Caching metadata only is the middle path, and it is the one worth taking, but the alternative is legitimate and should be rejected deliberately rather than by default.
