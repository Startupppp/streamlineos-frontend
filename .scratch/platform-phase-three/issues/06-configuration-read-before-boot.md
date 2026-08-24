# 06 — Nothing reads configuration before the application boots

**What to build:** The module-scope reads become providers.

`email/email.provider.ts` reads `RESEND_API_KEY`, `ZEPTOMAIL_API_URL`, `ZEPTOMAIL_TOKEN` and `EMAIL_PROVIDER` into file-level constants and constructs its provider clients from them at import time. `platform.service.ts:34` computes a file-level `BRAND_URL` from `APP_URL`.

These fire the moment the file is first imported — before any provider runs, before validation, and in whatever order the module graph happens to resolve. They read `undefined` in any test that has not pre-set the variable, they cannot be overridden, and a bad value cannot fail the boot in a way that names it.

This is the case the seam exists to prevent, so it gets restructured rather than added to an exception list.

**Blocked by:** 05 — Services read configuration, not the environment.

**Status:** ready-for-agent

- [x] No file-level constant in `src/modules/**` or `src/common/**` is computed from `process.env`. Three remained and are now gone: `email/app-url.ts` (`export const appUrl = resolveAppUrl()` — the worst of them, it **threw during import**, so `nest start` without a preloaded env file died inside `templates/base.ts` before any provider ran), `templates/registry/_shared.ts`'s `BASE_URL` derived from it, and `chat-reply-reminders.service.ts`'s `REPLY_REMINDER_MS`. `appUrl` is now resolved on first call and memoised; `BASE_URL` re-exports it; the chat interval comes from injected `APP_CONFIG`. `hr/interviews/ics.util.ts` lost its `NOREPLY_EMAIL` constant — it is a pure util, so the value is passed in by its one caller, which injects config.

  **Two `NODE_ENV` reads are kept deliberately and are not covered by this criterion's intent:** `common/logger/logger.service.ts` and `common/ratelimit/rate-limit.service.ts`. `NODE_ENV` is the one variable that exists before the container by definition, the logger is imported at module scope by nearly everything (injecting config there inverts the dependency), and `effectiveRateLimit` is an exported pure function whose signature is depended on by tests. The nine `RBAC_E2E_DATABASE_URL` / `DATABASE_URL` reads are `*.e2e-spec.ts` skip guards deciding whether a suite can run at all — that decision cannot come from the container it is deciding whether to build.
- [x] The email provider client is constructed by a factory provider from injected configuration, not by a module-scope constant. (`email/email.provider.ts:260-272` — `EmailProviderService` is `@Injectable()`, injects `APP_CONFIG`, builds `this.clients` from it in the constructor; `email.module.ts:15` is `@Global()`)
- [x] Provider selection (`EMAIL_PROVIDER`, and the fallback when it is unset) behaves exactly as before, including which provider wins when both are configured. Pin that with a test first if it is not already pinned — this is the one behaviour here a reader could not reconstruct from the code. (`email-provider-selection.spec.ts` — 8 tests covering explicit preference, unconfigured-provider fallback, both-configured default, none case; all pass)
- [x] A test can supply configuration and get a client built from it, without touching `process.env`. (`email-provider-selection.spec.ts` constructs from a supplied config object; `chat-reply-reminders.service.spec.ts` now passes `{ CHAT_REPLY_REMINDER_MINUTES: 15 }` directly.)
- [~] Sending an email still works end to end. **Partially met — no mail was sent.** What was verified by running: the API boots clean (`Nest application successfully started`, RLS enforced as `streamline_app`) with the new `APP_CONFIG` injections resolving, so the factory is registered rather than inert — which is the failure mode this criterion names. Also verified that the import-time throw is gone: before this change `nest start` without a preloaded env file failed with `[email] APP_URL is not set` raised from `templates/base.ts:1:1`; it no longer does. Email + notification suites 14/14, 147 tests. Actually delivering a message still needs a provider credential and a recipient.
- [x] No credential is logged, and no error message includes a token or key. The one message this ticket's files emit names the **variable** (`APP_URL is not set`) and never a value; the localhost warning prints the resolved URL, which is not a secret.
