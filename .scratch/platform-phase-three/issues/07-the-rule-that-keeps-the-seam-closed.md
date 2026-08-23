# 07 — A new direct read fails the build

**What to build:** The contract step. `process.env` stops being reachable from application code.

Everything before this ticket is reversible by one person in a hurry. `eslint.config.mjs` covers `no-explicit-any`, unused variables, empty blocks and `prefer-const`; nothing restricts `process.env`, and CI will not notice a new direct read anywhere.

The rule could not land first — it would have failed on ninety-one existing reads. By this point the count is low enough that the remaining ones are the deliberate exceptions.

**Blocked by:** 05 — Services read configuration, not the environment. 06 — Nothing reads configuration before the application boots.

**Status:** ready-for-agent

- [ ] A lint rule forbids `process.env` in `src/modules/**` and `src/common/**`. Its message names the alternative, so someone hitting it knows to inject `APP_CONFIG` rather than to add a disable comment.
- [ ] `src/config/**`, `src/scripts/**`, seeds, `main.ts`, instrumentation and test files are out of the rule's scope, by path rather than by inline suppression.
- [ ] Any remaining read inside the rule's scope carries an explicit suppression **with a reason on the same line**. A bare disable comment is the failure mode this ticket exists to prevent.
- [ ] `pnpm lint` passes.
- [ ] The rule runs in CI and a violation fails the build. A rule that only runs locally is a convention.
- [ ] The rule is verified by adding a direct read to a scratch file and watching lint fail, then removing it. A rule that matches nothing passes silently and reads exactly like a rule that works.
- [ ] The schema-completeness test from ticket 04 still passes, so the two guards agree rather than one quietly subsuming the other.
