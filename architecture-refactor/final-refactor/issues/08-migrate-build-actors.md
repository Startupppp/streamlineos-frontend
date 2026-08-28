# 08: Migrate Build actors

**What to build:** Project members, ticket assignees, approvers and authors are organization-aware actors, preventing a multi-org user from being assigned through the wrong membership.

**Blocked by:** 06 — Expand the OrganizationActor compatibility seam.

**Status:** ready-for-agent

- [ ] Project and ticket actor writes use OrganizationActor references.
- [ ] Membership lookup includes organization and active status.
- [ ] Existing data is backfilled with an exception report for ambiguous rows.
- [ ] Project scope, cross-org and assignment tests pass.
