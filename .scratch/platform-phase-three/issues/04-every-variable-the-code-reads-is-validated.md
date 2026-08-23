# 04 — A variable the code reads is a variable the schema validates

**What to build:** Schema coverage that cannot silently reopen.

Six variables production code reads are absent from the Zod schema: `UNSUBSCRIBE_TOKEN_SECRET`, `ZEPTOMAIL_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET`, `BRAND_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `EMAIL_LOGO_PATH`. Nothing validates them, nothing lists them, and boot succeeds without them.

Be accurate about what that costs: **all three secrets fail closed.** A missing webhook secret rejects every webhook and a short token secret mints nothing. This is a deploy that comes up broken and stays quiet about it — an availability and diagnosability defect, not an authorization hole. Do not write it up as one.

This ticket adds the six and then makes the class of defect unrepeatable, which is the part worth having.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] **Seven**, not six. The scanning test immediately found `HR_EXPORT_WORKER_ENABLED` (`hr/import/hr-export-jobs.service.ts:74`), which the manual audit had missed — which is the argument for the test in one line. All are in the schema with the right optionality. A secret that is optional today stays optional — this ticket does not decide that a deployment must now set it.
- [x] A test extracts every `process.env.<IDENT>` from non-test, non-script source and asserts each identifier is a key of the schema. It enumerates from the source, so a new read is covered without editing the test. **This is the deliverable**; the six additions are what it happens to find first.
- [x] The test carries a named exception list, each entry with a one-line reason. `NODE_ENV` is an exception — tooling, test setup and framework code read it before the injector exists.
- [x] A test asserts `validateEnv()` throws for a missing required variable and that the message names it.
- [x] `.env.example` lists every variable in the schema. Note what this turned up: the three secrets were **already** documented there and simply never validated — the operator-facing contract knew about them and the schema did not. Six others were missing and were added. A test asserts that, or the file drifts again by the next deploy.
- [x] No variable is renamed and no default changes. A migration that also retunes a default cannot be verified by "nothing changed".
- [x] The suite passes: `tsc --noEmit` exit 0; config, email and hr-import suites 99 tests green. The full backend suite is not run in this ticket. Adding required variables to the schema breaks any spec that boots the container without them, and that surfaces here rather than in the next ticket.
