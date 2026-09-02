# 16 — Repair the page-gate test so it distinguishes a session gate from a permission gate

**What to build:** `page-level-gates.test.ts` cannot fail for the reason it exists. Its gate pattern accepts a bare session check, so a page with no permission gate at all satisfies it; its third case asserts a count is at least zero, which is unconditionally true; and it covers only five module directories, which is why the `sign` and `surveys` gaps sat outside it entirely.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The gate pattern distinguishes a permission gate from a session-only gate, and pages that are session-only by design are named explicitly rather than passing by pattern accident.
- [ ] The vacuous assertion is replaced with one that can fail.
- [ ] Coverage extends to every authenticated module directory, not the original five.
- [ ] The test is proven to bite: remove a known-present gate and confirm it goes red for the intended reason.
- [ ] Gated modules require a permission key; platform-core self-service surfaces require only a session, and the distinction is encoded rather than implied.
- [ ] Permission keys asserted by the test exist verbatim in both the backend and frontend catalogs — a key that exists in only one is either ungateable or permanently false.
