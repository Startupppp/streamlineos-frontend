# 01 — Errors reach a person

**What to build:** When the API throws, someone finds out — with the organisation, user, route and correlation id attached, grouped so one incident is one alert. Scrubbing comes with it, because an error report is an outbound channel.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A thrown handler error is reported with organisation, user, route and correlation id.
- [ ] An unhandled promise rejection is reported.
- [ ] Errors are grouped, and carry a release marker so a deploy can be implicated.
- [ ] An error carrying an authorization header, a token or a known personal-data field emits none of them.
- [ ] Scrubbing is asserted by test, not assumed.
- [ ] The tenant-context permission error class is reported distinctly, since it has caused real incidents here.

## Todo

- [ ] Add scrubbing in the same change as reporting — not as a follow-up
- [ ] Tag with the existing correlation id
- [ ] Assert the deny-list works before enabling in production
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
