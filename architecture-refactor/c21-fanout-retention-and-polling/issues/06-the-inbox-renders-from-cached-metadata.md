# 06 — The inbox renders from cached metadata

**What to build:** Opening mail is instant and searchable. Today mail is a pure bridge with nothing persisted, so every render round-trips to the provider: 100–500ms, a billable call per view, exposure to per-project quotas, and no search or threading without re-querying.

**Blocked by:** None — can start immediately

**Status:** DECIDED 2026-08-26 — cache metadata only. Ready to build.

> **Decision (operator).** The inbox caches **metadata only** — subject, sender, date, thread id,
> read state, labels — populated by provider push webhooks. **Message bodies and attachments are
> never persisted**; they are fetched on demand.
>
> This was a genuine fork, not a defect, and the alternative was defensible: persisting nothing
> keeps the product out of mail hosting entirely and holds no per-user mail data. It was rejected
> because it makes search and threading impossible and bills a provider call per render.
>
> The cost accepted with this choice: a sync path to maintain, webhook plumbing, and per-user mail
> metadata now living in the database — which makes the per-user isolation test in the criteria
> below load-bearing rather than routine.

## Acceptance criteria

- [ ] Metadata — subject, sender, date, thread id, read state, labels — is cached and populated by provider push.
- [ ] Message bodies are fetched on demand and never persisted.
- [ ] Mail is searchable without querying the provider.
- [ ] A conversation reads as one threaded item.
- [ ] Cached metadata is keyed and authorized per user; two users in one organisation never share it.
- [ ] Provider API usage is bounded and no longer scales with renders.

## Todo

- [ ] This is a recorded architectural fork — confirm the decision before building
- [ ] Persist metadata only; do not enter the mail-hosting business
- [ ] Test the per-user isolation explicitly
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
