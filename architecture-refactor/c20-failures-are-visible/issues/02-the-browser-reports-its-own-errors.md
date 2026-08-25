# 02 — The browser reports its own errors

**What to build:** A crash in the web app is reported with the same grouping, release markers and scrubbing as the API, so a broken screen is not invisible until someone complains.

**Blocked by:** 01 — Errors reach a person

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A client-side error is reported with route and release.
- [ ] Personal data and tokens are scrubbed client-side too.
- [ ] The existing error boundaries still render their recoverable UI — reporting does not change what the user sees.
- [ ] Stale-deploy chunk-load errors stay classified as recoverable rather than becoming alert noise.

## Todo

- [ ] Reuse the scrub configuration
- [ ] Check the 197 error boundaries still behave identically
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
