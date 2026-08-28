# 04: Replace Accounting legacy role authorization

**What to build:** Accounting routes use canonical module permissions rather than hard-coded session role strings, so effective RBAC is consistent with the backend.

**Blocked by:** 03 — Enforce the organization and module authority matrix.

**Status:** implemented

- [x] Accounting layout and route decisions use the shared server authorization seam.
- [x] No legacy or invented role string controls Accounting access.
- [x] Owner/admin/module-role/member allow/deny behavior matches backend permissions.
- [x] Direct URL, navigation and action visibility tests pass.

Evidence: the Accounting layout delegates to the shared server permission seam; permission and navigation structural checks pass.
