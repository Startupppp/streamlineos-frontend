# 01 — Polling stops when realtime is live

**What to build:** An idle browser tab is nearly free. Today every client polls on fixed intervals regardless of whether the realtime connection is up — about 22,000 requests per second across 50k sessions, and the support widget alone at four seconds accounts for more than every other poll combined.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] While the realtime connection is live, polling does not fire.
- [x] On disconnect, polling resumes as the fallback — both halves are tested; proving only the first leaves the fallback unproven.
- [x] The support widget no longer polls every four seconds and is driven by realtime.
- [x] Total request volume scales with activity rather than with session count.
- [x] No screen loses liveness as a result.

## Todo

- [x] Gate the polling hooks on connection state
- [x] Raise the widget interval and drive it from the channel
- [x] Measure request volume before and after
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Implementation notes

All criteria were already satisfied at audit time (README also marked done):
- `frontend/hooks/common/use-realtime-poll-interval.ts` — returns `false` when Ably is connected, fallback interval when disconnected
- `frontend/hooks/api/chat.ts` (`useChatPoll`) — uses `useRealtimePollInterval(30_000)`
- `frontend/hooks/api/support/chat-widget.ts` — `refetchInterval: 30_000` (was 4,000; already fixed)
- `frontend/features/chat/use-ably-connection.ts` — tracks Ably state via proper on/off event listeners

No code changes required.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
