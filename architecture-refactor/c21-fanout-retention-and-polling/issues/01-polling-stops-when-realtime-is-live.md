# 01 — Polling stops when realtime is live

**What to build:** An idle browser tab is nearly free. Today every client polls on fixed intervals regardless of whether the realtime connection is up — about 22,000 requests per second across 50k sessions, and the support widget alone at four seconds accounts for more than every other poll combined.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] While the realtime connection is live, polling does not fire.
- [ ] On disconnect, polling resumes as the fallback — both halves are tested; proving only the first leaves the fallback unproven.
- [ ] The support widget no longer polls every four seconds and is driven by realtime.
- [ ] Total request volume scales with activity rather than with session count.
- [ ] No screen loses liveness as a result.

## Todo

- [ ] Gate the polling hooks on connection state
- [ ] Raise the widget interval and drive it from the channel
- [ ] Measure request volume before and after
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
