# 41: Make OpenAPI freshness reproducible in CI

**What to build:** CI can boot the application contract generator with secure region configuration and fail on unapproved backend/frontend API drift.

**Blocked by:** 26 and 28.

**Status:** ready-for-agent

- [ ] Contract generation has a documented non-production topology/configuration seam.
- [ ] OpenAPI freshness runs deterministically without undocumented local credentials.
- [ ] Timesheets and route-access changes appear in generated contracts.
- [ ] CI fails on stale or breaking unversioned contracts and passes on the current source.
