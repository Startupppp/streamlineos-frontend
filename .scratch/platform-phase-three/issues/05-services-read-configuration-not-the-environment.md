# 05 — Services read configuration, not the environment

**What to build:** The reads that dependency injection can reach move onto the injected `AppConfig`.

Three files inject `APP_CONFIG` today. Ninety-one reads across fifty-six files in `src/modules` and `src/common` go straight to `process.env`, so they are untyped, unvalidated, and evaluated whenever the line happens to run rather than at boot.

Most are a substitution: a method body or a class-field initializer reading a variable the schema already has. `storage.service.ts` has seven, `realtime/web-push.service.ts` four, `email/dispatch/twilio.gateway.ts` three, `billing/core/razorpay.service.ts` three in per-property getters.

Do this in batches by module, each batch its own commit, because the constructor signature moves and every spec constructing that service moves with it.

**Blocked by:** 04 — A variable the code reads is a variable the schema validates.

**Status:** ready-for-agent

- [ ] Services in `src/modules/**` and `src/common/**` that can inject read configuration through `APP_CONFIG` rather than `process.env`.
- [ ] Each migrated service's spec constructs it with a plain configuration object rather than mutating `process.env`. This is what proves the migration did anything — the point is that the service no longer reaches global state.
- [ ] Behaviour is unchanged, including for an unset optional variable. A service that degraded quietly still degrades quietly; a service that threw still throws.
- [ ] The mock surface moves in the same change as the constructor. A spec that constructs a service with the old signature is the known trap here and it applies to every batch.
- [ ] Import-time reads are **not** in this ticket. `email/email.provider.ts` and `platform.service.ts` build module-scope constants before any provider runs and need restructuring, which is ticket 06.
- [ ] Scripts, seeds, `main.ts` and instrumentation are untouched — they run before or outside the injector.
- [ ] The remaining count is recorded when the ticket closes, so ticket 07 knows what the lint rule has to tolerate.
