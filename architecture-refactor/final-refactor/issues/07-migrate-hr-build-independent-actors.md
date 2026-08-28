# 07: Migrate HR, Payroll, Expenses and Timesheets actors

**What to build:** Employees, managers, approvers, authors and recipients in people and pay workflows resolve through organization membership/person identity.

**Blocked by:** 06 — Expand the OrganizationActor compatibility seam.

**Status:** ready-for-agent

- [ ] All in-scope actor writes use OrganizationActor references.
- [ ] Reads support the expand-period compatibility contract and return organization-correct actors.
- [ ] Backfill reports unmappable/ambiguous rows without guessing.
- [ ] Cross-organization, inactive-membership and representative workflow tests pass.
