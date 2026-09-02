# 17 — Application security tests across session, injection and transport surfaces

**What to build:** Executable coverage for the code-level security behaviours in §11: session lifecycle attacks, the injection family, and secret handling.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Session fixation and replay, revoked membership, invitations, password reset, MFA/recovery, brute force and credential stuffing each have a test asserting the correct rejection.
- [ ] Session revocation is proven to actually log the session out. A database flag alone revokes nothing while a valid token remains; the revocation must be enforced at token-check time.
- [ ] CSRF, XSS, SSRF, SQL injection, unsafe redirect, path traversal, CORS/CSP/header, payload-limit and rate-limit behaviours are each tested.
- [ ] The SSRF guard is the shared one, not a new local copy — a duplicate guard written from scratch missed IPv4-mapped IPv6 loopback.
- [ ] CORS is registered before the body parser; registered after, an oversized request returns a 413 with no CORS headers and surfaces to the client as an unexplained network error.
- [ ] Rate-limit tiers fail closed on an unknown tier, and any multiplier does not mask the 429 the test is asserting.
- [ ] Secret and PII redaction, secure cookies, generic authentication failures and key-rotation behaviour are verified.
