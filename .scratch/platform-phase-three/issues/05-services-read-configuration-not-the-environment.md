# 05 — Services read configuration, not the environment

**What to build:** The reads that dependency injection can reach move onto the injected `AppConfig`.

Three files inject `APP_CONFIG` today. Ninety-one reads across fifty-six files in `src/modules` and `src/common` go straight to `process.env`, so they are untyped, unvalidated, and evaluated whenever the line happens to run rather than at boot.

Most are a substitution: a method body or a class-field initializer reading a variable the schema already has. `storage.service.ts` has seven, `realtime/web-push.service.ts` four, `email/dispatch/twilio.gateway.ts` three, `billing/core/razorpay.service.ts` three in per-property getters.

Do this in batches by module, each batch its own commit, because the constructor signature moves and every spec constructing that service moves with it.

**Blocked by:** 04 — A variable the code reads is a variable the schema validates.

**Status:** DONE — 19 reads migrated; boxes ticked 2026-08-24 against the tree rather than from memory.

- [x] Services in `src/modules/**` and `src/common/**` that can inject read configuration through `APP_CONFIG` rather than `process.env`. Nineteen reads moved across twilio, the notification worker, razorpay, contact, roadmap, platform, storage, KB, realtime and push. `ConfigModule` is `@Global()`, so no consumer module needed an import change.
- [x] Each migrated service's spec constructs it with a plain configuration object rather than mutating `process.env`. The newest instance is `chat-reply-reminders.service.spec.ts`, which passes `{ CHAT_REPLY_REMINDER_MINUTES: 15 }` directly.
- [x] Behaviour is unchanged, including for an unset optional variable. `email-provider-selection.spec.ts` pins which provider wins in all four configuration states — the one behaviour here a reader could not reconstruct from the code — and it was written **before** the refactor touched anything.
- [x] The mock surface moves in the same change as the constructor. The trap fired exactly as predicted on 2026-08-24: adding `APP_CONFIG` to `ChatReplyRemindersService` broke its spec with `Expected 3 arguments, but got 2` — caught by `tsc`, because that spec lives under `src/`. It would **not** have been caught under `test/`, which no tsconfig includes.
- [x] Import-time reads are **not** in this ticket — they were left to ticket 06, which has since closed them, including the `email/app-url.ts` constant that threw during import.
- [x] Scripts, seeds, `main.ts` and instrumentation are untouched — they run before or outside the injector.
- [x] The remaining count is recorded, so ticket 07 knows what the lint rule has to tolerate. **Measured 2026-08-24:** 167 `process.env` occurrences across 87 files in `src/modules/**` + `src/common/**` — but only **50 reads across 35 production files**; the other 117 are in 52 spec/e2e files, which the rule does not police. The eslint allowlist carries 29 entries after `chat-reply-reminders.service.ts` and `hr/interviews/ics.util.ts` were removed from it. `pnpm lint` is **0 errors, 36 warnings**.
