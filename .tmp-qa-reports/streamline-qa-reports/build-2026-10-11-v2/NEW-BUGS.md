# New bugs — build-2026-10-11-v2

## NEW-03 — OTP send 503 gives no user-facing error (observed run 3)
- Steps: /signin, enter email, click Continue.
- Expected: after a failed send, show an error (e.g. "Couldn't send code, try again").
- Actual: button shows "Sending code...", then returns to the plain email form. No error text, no code step. Only the console shows 503 on POST api.streamlineos.in/auth/email-otp (3 of 3 tries).
- Evidence: evidence/build-2026-10-11-v2/02-otp-attempt3-503-signin.png

## NEW-02 (reproduced, see RETEST.md) — stale session hangs /signin and /dashboard
- Steps: have an old session cookie for www.streamlineos.in, open /signin.
- Actual: redirected to /dashboard, stuck on "Loading"; then "This is taking longer than it should" with Reload that does not clear it. Only clearing site data for the site recovers.
- Evidence: evidence/build-2026-10-11-v2/00b-stale-session-taking-longer.webp
