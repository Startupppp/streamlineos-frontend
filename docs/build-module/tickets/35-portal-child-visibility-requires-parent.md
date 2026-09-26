# 35 — A portal client never sees a comment or attachment from an internal-only ticket

**What to build:** An external client opening the portal sees comments and attachments only from tickets that are themselves client-visible. Today the portal read filters the *child* row's visible flag but never requires the parent ticket to be visible, so a comment marked client-visible on an internal-only ticket is served to the client. The existing access spec asserts only the child's flag, which is why nothing caught it.

Visibility is a property of a subtree, not of each row. The strongest version of this fix removes the client-visible flag from the two child tables entirely and derives visibility from the parent, which makes the defect unwritable rather than merely absent. Decide between that and an added parent predicate on the join as part of the work, and say which was chosen and why.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A comment or attachment on an internal-only ticket is absent from every portal read, including the counts
- [ ] A comment marked not-visible on a visible ticket is still absent
- [ ] The access spec asserts the parent's flag, not just the child's, and fails when the parent predicate is removed
- [ ] If the child flags are dropped, no writer still sets them and no read still trusts them
- [ ] No production portal data is created to test this
