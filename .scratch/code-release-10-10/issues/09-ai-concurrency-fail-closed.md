# 09 — Make the AI concurrency cap fail closed and land the bounds work

**What to build:** The per-organization AI concurrency cap was wired as an optional injection behind a truthiness guard, so an unresolved provider silently disabled the cap entirely — no error, no log, unbounded paid provider calls. The limiter must be a required dependency so the application fails at boot instead, and every exit path must return the slot it took.

**Blocked by:** None — can start immediately.

**Status:** implemented, uncommitted — needs verification and commit

- [x] The limiter is a required constructor dependency in both the chat assistant and the KB RAG service; an unresolved provider is a boot failure, not a silent bypass.
- [x] The truthiness guards and optional-chained releases are gone.
- [x] All three exit paths release the slot: success, client abort, and a synchronous setup throw. The setup-throw path in the RAG service was missing and leaked a slot per failure.
- [x] Prompt history, retrieved chunks and output tokens are bounded; streaming no longer bypasses the limiter.
- [x] Specs constructing these services directly pass a limiter stub; testing-module specs register the provider.
- [ ] Verify the reported result against the diff rather than the report, then commit. A delegated fix can land inert.
- [ ] Confirm the slot-leak tests actually bite — neuter the stub, not the source, and check the test goes red.

**Out of scope, recorded here so it is not lost:** `crm-copilot.service.phase2.spec.ts` carries 21 tests suppressed by six `describe.skip` blocks whose target methods all exist on the real services. These are suppressed coverage rather than environment-blocked skips, and §9's "zero silently skipped tests" would normally bite. They are CRM, which this release excludes — so they are logged as excluded, not fixed.
