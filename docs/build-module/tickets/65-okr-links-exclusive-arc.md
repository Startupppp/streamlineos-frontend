# 65 — A goal link points at exactly one thing, exactly once

**What to build:** Goal progress counts each linked item once. The link table carries a nullable ticket reference and a nullable project reference with no exclusivity, and its only uniqueness covers the goal and the ticket — so a link to nothing is representable, a link to both is representable, and because null never equals null in a unique index, **a goal can be linked to the same project unboundedly many times**. The progress rollup counts every duplicate, so a goal's percentage depends on how many times someone clicked.

Two constraints close it: exactly one of the two references must be present, and uniqueness must cover the project arm as well as the ticket arm.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A link with neither reference, or with both, is rejected by the database
- [ ] A goal cannot be linked to the same project twice
- [ ] Existing duplicate and malformed links are surveyed and reported before the constraints are added
- [ ] Goal progress is recomputed for any goal whose duplicates were removed, and the change in its percentage is expected rather than surprising
- [ ] The migration is journalled with a rollback authored
- [ ] Verified in a rolled-back transaction as the application role
