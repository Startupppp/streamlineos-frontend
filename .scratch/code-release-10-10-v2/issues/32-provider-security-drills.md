# 32: Provider and deployed-security drills

**What to build:** Real providers and deployed security controls survive forgery, replay, outage, retry exhaustion, cancellation, suppression, and recovery.

**Blocked by:** 31 — One-commit code-release verification

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

**Human/deployment gate:** D04-D06 in `architecture-refactor/decisions/CODE-RELEASE-HUMAN-INPUTS.md`.

## Acceptance criteria

- [ ] **PRD-C162** — Run real payment, realtime, email and push sandbox replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios.
- [ ] **PRD-C163** — Verify deployed TLS, encryption at rest, infrastructure secret isolation and credential/key rotation.
- [ ] **PRD-C164** — Verify deployed edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
