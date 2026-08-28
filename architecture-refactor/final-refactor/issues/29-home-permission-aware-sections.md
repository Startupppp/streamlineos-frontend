# 29: Make Home frontend sections independently permission-aware

**What to build:** Each Home section declares universal or exact permission behavior and handles its own loading, denied, failure and empty state.

**Blocked by:** 02 and 27.

**Status:** ready-for-agent

- [ ] Every Home query is enabled by exact universal/permission metadata.
- [ ] One failing or denied section does not fail or reveal another section.
- [ ] Query keys and invalidation match actor-aware backend cache semantics.
- [ ] Owner/admin/member/scope and partial-failure UI tests pass.
