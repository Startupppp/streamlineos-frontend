# 01 — An outbound call cannot be untimed

**What to build:** A developer cannot write an outbound HTTP call without a deadline, because the shared helper requires one. It also validates the destination through the existing guard and records what happened.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The timeout is a required argument — an untimed call does not typecheck.
- [ ] The destination is validated through the existing SSRF guard; no second guard is written.
- [ ] Internal addresses, loopback in every encoding including the packed IPv6 form, link-local, and redirect-to-internal are all rejected.
- [ ] Provider, duration and outcome are recorded for each call.
- [ ] A server that accepts a connection and never responds is abandoned at the deadline.

## Todo

- [ ] List the shared security utilities before writing anything — the existing guard handles forms a fresh one will miss
- [ ] Test against a genuinely hanging server, not a mock that returns instantly
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
