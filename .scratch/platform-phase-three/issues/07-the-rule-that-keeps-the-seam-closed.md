# 07 — A new direct read fails the build

**What to build:** The contract step. `process.env` stops being reachable from application code.

Everything before this ticket is reversible by one person in a hurry. `eslint.config.mjs` covers `no-explicit-any`, unused variables, empty blocks and `prefer-const`; nothing restricts `process.env`, and CI will not notice a new direct read anywhere.

The rule could not land first — it would have failed on ninety-one existing reads. By this point the count is low enough that the remaining ones are the deliberate exceptions.

**Blocked by:** 05 — Services read configuration, not the environment. 06 — Nothing reads configuration before the application boots.

**Status:** ready-for-agent

- [x] A lint rule forbids `process.env` in `src/modules/**` and `src/common/**`, in **both** the dot and bracket forms. The bracket form matters: `rg` on dot notation missed two files the AST selector caught, so grep would have shipped an escape hatch. Its message names the alternative, so someone hitting it knows to inject `APP_CONFIG` rather than to add a disable comment.
- [x] `src/config/**`, `src/scripts/**`, seeds, `main.ts`, instrumentation and test files are out of the rule's scope, by path rather than by inline suppression.
- [x] Landed as a **ratchet, not a blanket ban**: 31 files that predate the seam are listed by path with the rule off, so a **new** read anywhere fails while the existing ones stay visible and countable. A blanket error would have failed on 30 files, and my own ticket text assumed the count would be down to a handful by now - it is not. A bare disable comment is the failure mode this ticket exists to prevent.
- [x] `pnpm lint` passes - **0 errors, 32 warnings**. It did **not** pass before this ticket: `script.executor.ts:131` had a `require()` error, so the backend CI lint job was already red. Fixed with a suppression carrying its reason (the WASM module is CJS and `import()` of it fails under Jest).
- [x] The rule runs in CI and a violation fails the build. A rule that only runs locally is a convention.
- [x] Verified with a scratch probe: dot and bracket reads of a new variable both errored, and `NODE_ENV` in both forms did not. Probe removed. A rule that matches nothing passes silently and reads exactly like a rule that works.
- [x] The schema-completeness test from ticket 04 still passes, so the two guards agree rather than one quietly subsuming the other.
