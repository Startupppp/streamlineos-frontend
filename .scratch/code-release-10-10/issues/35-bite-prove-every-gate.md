# 35 — Make every architecture and release gate bite-proven

**What to build:** Each gate is proven to fail against a known-bad fixture or mutation, for the intended reason. A gate that has never failed is an assertion about itself, not about the codebase — this repository has already shipped several.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every gate in both repositories has a self-test that constructs a known-bad fixture and confirms the gate rejects it for the right reason.
- [ ] Gates whose self-test only asserts their own constants are rewritten to actually run the scan.
- [ ] A gate that cannot currently measure anything reports INCONCLUSIVE or PARTIAL rather than OK. A probe whose failure is indistinguishable from its success proves nothing.
- [ ] Critical tests exercise transaction callbacks, authorization deny and cross-tenant paths, retries and failure branches.
- [ ] Zero silently skipped or quarantined tests, vacuous mocks, swallowed promise failures, or baselines raised merely to turn a regression green.
- [ ] Text-based scans are validated against a known defect before being trusted — they miss generated forms, typed branches and indirect references, and a scan that reports everything clean is usually broken.
- [ ] Coverage counts are honest: a path-filtered run that reports green while suites outside the filter are red is a false pass.
- [ ] Quoted globs are checked on this platform — a tree-scan spec whose glob matches nothing passes vacuously.
