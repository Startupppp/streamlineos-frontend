# Ticket 17 — application security tests (session S4)

**Result: all 7 boxes closed.** 7 new spec files, 133 tests, `nice -n 10 npx jest test/security/appsec --maxWorkers=2` → 7 suites passed, 133 passed, 0 failed.

Regression run over every area I touched: `nice -n 10 npx jest test/security/appsec src/common/auth src/common/security src/common/ratelimit src/modules/auth src/modules/sessions src/modules/hr/templates src/modules/feedbucket --maxWorkers=2` → **48 suites, 535 tests, 0 failures**.

---

## P1 — JWKS published the Ed25519 PRIVATE key under a plausible misconfiguration (found and FIXED)

`GET /auth/.well-known/jwks.json` is `@Public()`. `JwtKeyringService.loadKeys` did:

```ts
const publicKey = await importJWK(entry.publicKey, "EdDSA");
const rawPublicJwk = await exportJWK(publicKey);
const publicJwk: JWK = { ...rawPublicJwk, kid, alg: "EdDSA", use: "sig" };
```

`importJWK` accepts a private JWK exactly as readily as a public one, and `exportJWK` round-trips `d` straight back out. So if any `AUTH_SIGNING_KEYS` entry has the private half in its `publicKey` slot — the two fields sit adjacent, `.env.example` documents no shape, and nothing validated it — the service **serves the signing seed to the internet**, and anyone can forge a backend JWT for any user in any org. I confirmed it empirically before fixing: the published document contained `"d":"ZacGI10XGPVDINtdlgqRHDnCSEfsYSavDpxjRMrptxA"`.

Fixed in `src/common/auth/jwt-keyring.service.ts` (its owning file) by projecting onto an explicit public-member allowlist instead of spreading, plus a loud `logger.error` naming the misconfigured `kid`. I deliberately did **not** throw at boot — stripping fully closes the leak with zero deployment risk. **Recommend the orchestrator consider hard-failing instead, and treat any key configured this way as compromised and rotate it.** Regression pinned by `secrets-cookies-and-keys.spec.ts`.

## P2 — a second, weaker HTML sanitizer on an AI output path (FIXED)

`src/modules/feedbucket/feedbucket-ai.service.ts` had a private `sanitizeHtml` with **no tag allowlist at all** — it stripped `<script>`, `on*` and `javascript:` URLs but passed `<iframe>`, `<object>`, `<form>`, `<embed>` straight through into a stored, later-rendered description. The exact duplicate-guard shape CLAUDE.md §4 warns about for SSRF, applied to XSS. Replaced with an import of the shared `hr/templates/html-sanitizer`. All 12 feedbucket + hr-template suites still pass.

## P3 — the shared sanitizer scheme-checked `href` but not `src` (FIXED)

`src/modules/hr/templates/html-sanitizer.ts` allowed `img src` and only ran `DANGEROUS_HREF_PATTERN` against `href`, so `<img src="javascript:…">` and `<img src="data:text/html;…">` survived into rendered HR offer letters and contracts. Generalised to a `URL_BEARING_ATTRS` set covering `href` and `src`.

## FINDING (not fixed) — `src/common/security/application-security.spec.ts` is largely un-failable

196 lines that mostly cannot go red: `try { … } catch { /* skip */ }` around whole assertions, `if (content.includes("cors"))` guards, `expect(typeof revocationNote).toBe("string")`, and a "session revocation" test that reads `src/modules/auth/jwt.strategy.ts` — **a file that does not exist**, so the whole body is swallowed. It is a test-integrity liability, not coverage. My `test/security/appsec/**` covers every behaviour it gestures at, for real. **Recommend deleting it.** I did not, because it is not my territory and it is currently green.

---

## Neuter proofs — 5 protections broken, confirmed red, restored byte-identical (sha256 verified)

| # | Neutered | Result |
|---|---|---|
| 1 | `jwt-keyring.service.ts` — spread the raw exported JWK again | JWKS regression test red |
| 2 | `sessions.service.ts` — dropped `this.tombstone()` from `revokeCurrent` | 3 tests red (closed-loop + both invariant scans) |
| 3 | `ssrf-guard.ts` — made `mappedIpv4` miss the packed `::ffff:7f00:1` form | 2 tests red |
| 4 | `rate-limit.service.ts` — unknown tier returns `allowed: true` | 3 tests red |
| 5 | `main.ts` — swapped `enableCors` after `useBodyParser` | order assertion red |

`transport-hardening.spec.ts` additionally carries a **permanent** neuter: it boots a second real Nest app with the ordering reversed and proves that app's 413 has no CORS header, every run.

## Files written

- `backend/test/security/appsec/session-revocation-enforced.spec.ts` (13)
- `backend/test/security/appsec/session-fixation-replay-and-credentials.spec.ts` (21)
- `backend/test/security/appsec/injection-surfaces.spec.ts` (35)
- `backend/test/security/appsec/transport-hardening.spec.ts` (16)
- `backend/test/security/appsec/rate-limits-and-brute-force.spec.ts` (17)
- `backend/test/security/appsec/secrets-cookies-and-keys.spec.ts` (18)
- `backend/test/security/appsec/mfa-and-recovery-codes.spec.ts` (13)

## Source files changed (all fixes, all named above)

- `backend/src/common/auth/jwt-keyring.service.ts` — P1
- `backend/src/modules/feedbucket/feedbucket-ai.service.ts` — P2
- `backend/src/modules/hr/templates/html-sanitizer.ts` — P3
- `streamlineos-frontend/.scratch/code-release-10-10/issues/17-application-security-tests.md` — boxes + evidence

## Audit-first notes (extended rather than duplicated)

Already well covered, left alone: `jwt-guard-revocation.spec.ts` (guard-level revoked session + revoked membership), `auth-session-exchange.spec.ts` (proof forgery/expiry/nonce replay), `auth-otp-brute-force.spec.ts` (OTP lockout), `pii-redaction.spec.ts` / `redact.spec.ts` (PII redaction, 4 surfaces), `jwt-keyring.service.spec.ts` (rotation overlap at keyring level), `envelope-encryption.spec.ts`, `sensitive-field.spec.ts`, `ssrf-guard.spec.ts`, `mfa-attempt-limits.spec.ts`. My files add the closed loops those stop short of: revocation proven *at the token*, rotation proven *at the guard*, the tier/caller/guard **invariant scans** that catch a newly-added path, and the surfaces nobody had touched (CSRF posture, CORS ordering, payload limits, path traversal, unsafe redirect, XSS, SQL bind proof, MFA recovery codes).

## Belongs to other agents / not mine

- **`tsc --noEmit -p tsconfig.json` is red as I finish, with 5 errors that are not mine**: `src/modules/organization/core/org-purge.service.ts` (2, TS7022) and `src/modules/support/core/support-ticket-erasure.ts` (3, TS7022/TS7006). It was **exit 0 / 0 errors** immediately after my source edits; these appeared during a concurrent agent's in-flight work. My spec files typecheck clean (0 errors) under a temp config that includes `test/security/appsec/**`.
- `src/main.ts` gained a `shutdownGate` middleware from another agent mid-session; CORS is still before the body parser and my assertions still hold.
- `src/common/http/outbound-request.ts` gained a `withSpan` wrapper mid-session, which broke a literal `"await fetch("` assertion of mine — I made it structural instead. Flagging because it shows source-text assertions age badly under concurrent edits.
- `test/security/bola/**` (ticket 15), `src/modules/ai/**`, `src/modules/gdpr/**`, `migrations/**`, `src/db/schema/**` — untouched.
- No git commands were run.
