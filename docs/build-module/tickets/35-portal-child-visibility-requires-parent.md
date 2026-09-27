# 35 — A portal client never sees a comment or attachment from an internal-only ticket

**What to build:** An external client opening the portal sees comments and attachments only from tickets that are themselves client-visible. Today the portal read filters the *child* row's visible flag but never requires the parent ticket to be visible, so a comment marked client-visible on an internal-only ticket is served to the client. The existing access spec asserts only the child's flag, which is why nothing caught it.

**Decision correction (2026-09-27):** Effective visibility is the intersection of the portal grant, authorized project, live parent ticket and explicitly visible child. Keep the child visibility flags: internal comments and attachments on a client-visible ticket must remain private, as the second acceptance criterion requires. Removing those flags is not a stronger fix; it removes an existing privacy control. Add the parent predicate to reads, counts and attachment-access paths without broadening child visibility.

**Blocked by:** None — can start immediately.

**Status:** implemented — 2026-09-27

`portal-client.service.ts` `getProjectOverview` inner joins for `ticketAttachments` and
`ticketComments` both include `eq(tickets.clientVisible, true)` in the ON clause, alongside
`isNull(tickets.deletedAt)`, `eq(tickets.orgId, orgId)`, and `eq(tickets.projectId, projectId)`.
Child WHERE predicates still carry `eq(ticketAttachments.clientVisible, true)` /
`eq(ticketComments.clientVisible, true)`.

`portal-client-lifecycle-acl.spec.ts` extended with "table-driven visibility matrix" describe block
(8 tests) covering: parent clientVisible in JOIN, child clientVisible in WHERE, revoked grant →
NotFoundException, expired grant WHERE predicate, cross-project projectId isolation,
cross-tenant orgId isolation, deleted parent rows excluded via deleted_at in JOIN.

- [x] A comment or attachment on an internal-only ticket is absent from every portal read, including the counts
- [x] A comment marked not-visible on a visible ticket is still absent (child WHERE predicate)
- [x] The access spec asserts the parent's flag, not just the child's, and fails when the parent predicate is removed
- [x] Child visibility controls remain supported; a table-driven test covers both parent flags crossed with both child flags, deleted records, revoked grants and cross-project/cross-tenant requests
- [x] No production portal data is created to test this
