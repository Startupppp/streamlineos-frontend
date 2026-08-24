# Config seam — one way in, and a rule that keeps it that way

Status: ready-for-tickets · 2026-08-23 · derived from `architecture-review-20260820-1.html` candidate 7, re-verified against the tree.

## Problem Statement

`ConfigModule` is `@Global()`, provides a validated `AppConfig` under the `APP_CONFIG` token, and fails at boot with every Zod issue listed when a variable is missing or malformed. It is a correct module that almost nothing uses.

**Three files inject it.** `access/entitlements.service.ts`, `integrations/core/composio.gateway.ts` and `integrations/core/integrations.service.ts`. Every other consumer reads `process.env` directly — 91 reads across 56 non-test, non-script files.

Apply the deletion test: delete the config module and 91 call sites carry on working. It concentrates nothing, so it is not a seam — it is an option.

Two consequences follow, and they are different in kind.

**Six variables production code reads are absent from the schema entirely.** `UNSUBSCRIBE_TOKEN_SECRET`, `ZEPTOMAIL_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET`, `BRAND_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL` and `EMAIL_LOGO_PATH`. Nothing validates them, nothing lists them, and `.env.example` does not cover them. Deploy without one and boot succeeds.

To be precise about severity, because the shape of the reads invites overstating it: **all three secrets fail closed.** `email-webhook.service.ts` returns `false` when the secret is absent, and `unsubscribe-token.ts` returns `null` below 32 characters. A missing secret rejects every webhook and mints no tokens — it does not accept unsigned input. This is an availability and diagnosability defect, not an authorization hole, and the tickets should not claim otherwise.

**Some reads happen at import time, before any provider runs.** `email/email.provider.ts` builds `RESEND_API_KEY`, `ZEPTOMAIL_TOKEN` and `EMAIL_PROVIDER` into module-scope constants and constructs its provider clients from them at lines 20–23. `platform.service.ts:34` computes a file-level `BRAND_URL` from `APP_URL`. These cannot be reached by dependency injection without restructuring, and they read `undefined` in any test that has not pre-set the variable.

The rest — `storage.service.ts` (7 reads), `realtime/web-push.service.ts` (4), `email/dispatch/twilio.gateway.ts` (3), `billing/core/razorpay.service.ts` (3) and some forty others — read inside method bodies or class-field initializers, where injection is a straightforward substitution.

**No rule stops the next one.** `eslint.config.mjs` covers `no-explicit-any`, unused vars, empty blocks and `prefer-const`. There is no `no-restricted-syntax` for `process.env`, and CI will not notice a new direct read anywhere.

## Solution

Close the seam in the order that puts the durable guarantees first and the churn last.

1. **Make the schema complete and keep it complete.** Add the six variables, and add a test that reads the source, extracts every `process.env.X` in non-test code, and asserts each `X` appears in the schema. That test is the leverage: it makes schema coverage self-maintaining, so the gap cannot silently reopen, and it is worth more than any individual migration.
2. **Migrate the reads that dependency injection can reach**, in batches sized by module.
3. **Restructure the import-time reads**, which is the only part that is not a substitution.
4. **Add the lint rule** as the contract step, once the count is low enough for it to pass.

The order matters: the lint rule cannot land first because it would fail on 91 existing reads, and the migration is worth much less without the rule, because the seam refills.

## User Stories

1. As an operator, I want a missing variable to stop the deploy, so that I do not find out from a failed notification hours later.
2. As an operator, I want every variable the system reads to be listed in one place, so that I can prepare an environment without grepping the source.
3. As an operator, I want a malformed value rejected at boot with a message naming it, so that I can fix it before traffic arrives.
4. As an engineer, I want configuration to be typed, so that a renamed variable is a compile error rather than `undefined`.
5. As an engineer, I want a new direct read to fail the build, so that the seam stays closed without depending on review.
6. As an engineer, I want a test that fails when I read a variable I did not add to the schema, so that the two cannot drift.
7. As an engineer writing a test, I want to supply configuration as a value, so that I do not mutate global process state to exercise a service.
8. As a reviewer, I want the exceptions that genuinely cannot use injection to be listed and justified, so that "it reads process.env" is not the end of the discussion.
9. As an on-call engineer, I want a misconfigured webhook secret to be distinguishable from a provider outage, so that I do not debug the wrong system.

## Implementation Decisions

- **The existing `APP_CONFIG` token and `AppConfig` type stay.** This is not a new module; it is making the existing one load-bearing. `@nestjs/config` is not introduced — three services already use the direct-inject pattern and it works.
- **Schema coverage is enforced by a source-scanning test, not by discipline.** The test extracts `process.env.IDENT` occurrences from non-test source and asserts each identifier is a key of the schema. Its allowlist is the exception list, and every entry carries a reason.
- **`NODE_ENV` is an allowed exception.** It is read by tooling, test setup and framework code before the container exists, and forcing it through injection buys nothing.
- **Import-time reads are converted to factory providers rather than left as documented exceptions.** A module-scope constant that reads configuration is the case the seam exists to prevent — it cannot be tested, cannot fail at boot in a useful way, and cannot be overridden.
- **Scripts, seeds and `main.ts` are out of scope and stay on `process.env`.** They run before or outside the injector; the lint rule scopes to `src/modules/**` and `src/common/**`.
- **No variable is renamed and no default changes.** A migration that also retunes a default cannot be verified by "nothing changed".

## Testing Decisions

A good test here asserts the observable contract — that boot rejects a bad environment, and that a service returns what configuration says — rather than that a particular file injects a particular token.

- **Schema completeness** is the headline test, described above. It enumerates from source, so a new read is covered without editing it.
- **Boot rejection**: `validateEnv()` throws for a missing required variable and the message names it. Prior art exists in the config folder's own tests.
- **Per-service behaviour is proven by supplying configuration as a value.** A migrated service's spec constructs it with a plain `AppConfig`-shaped object and asserts behaviour; this is what proves the migration did something, since the point is that the service no longer reaches global state.
- Migrating a service breaks every existing spec that constructs it, because the constructor signature moves. The mock surface must move in the same change — this is the known trap in this codebase and it applies to each batch.

## Out of Scope

- Introducing `@nestjs/config`.
- Any change to what a variable means, defaults to, or is named.
- Secret rotation, secret storage, or moving secrets out of the environment.
- The frontend, which has its own `NEXT_PUBLIC_` rules.
- Scripts, seeds, `main.ts` and instrumentation.

## Further Notes

Counts verified 2026-08-23: 246 `process.env` lines across 123 files in total; 131 in spec and e2e files; 20 in `src/scripts`; 91 across 56 files in `src/modules` and `src/common`. The review's figure of 108 was measured differently and is neither wrong nor comparable — it is the non-spec, non-script total including `main.ts`, `db/` and `health/`.

The review called this "mechanical and low-risk". The schema-completeness half is. The migration half is mechanical but not low-risk, because it moves constructor signatures under a large body of specs, and the import-time half is not mechanical at all.
