# 06 — Nothing reads configuration before the application boots

**What to build:** The module-scope reads become providers.

`email/email.provider.ts` reads `RESEND_API_KEY`, `ZEPTOMAIL_API_URL`, `ZEPTOMAIL_TOKEN` and `EMAIL_PROVIDER` into file-level constants and constructs its provider clients from them at import time. `platform.service.ts:34` computes a file-level `BRAND_URL` from `APP_URL`.

These fire the moment the file is first imported — before any provider runs, before validation, and in whatever order the module graph happens to resolve. They read `undefined` in any test that has not pre-set the variable, they cannot be overridden, and a bad value cannot fail the boot in a way that names it.

This is the case the seam exists to prevent, so it gets restructured rather than added to an exception list.

**Blocked by:** 05 — Services read configuration, not the environment.

**Status:** ready-for-agent

- [ ] No file-level constant in `src/modules/**` or `src/common/**` is computed from `process.env`.
- [x] The email provider client is constructed by a factory provider from injected configuration, not by a module-scope constant. (`email/email.provider.ts:260-272` — `EmailProviderService` is `@Injectable()`, injects `APP_CONFIG`, builds `this.clients` from it in the constructor; `email.module.ts:15` is `@Global()`)
- [x] Provider selection (`EMAIL_PROVIDER`, and the fallback when it is unset) behaves exactly as before, including which provider wins when both are configured. Pin that with a test first if it is not already pinned — this is the one behaviour here a reader could not reconstruct from the code. (`email-provider-selection.spec.ts` — 8 tests covering explicit preference, unconfigured-provider fallback, both-configured default, none case; all pass)
- [ ] A test can supply configuration and get a client built from it, without touching `process.env`.
- [ ] Sending an email still works end to end. Verify by running it, not by the types compiling — a factory that is never registered compiles perfectly and is inert at runtime.
- [ ] No credential is logged, and no error message includes a token or key.
