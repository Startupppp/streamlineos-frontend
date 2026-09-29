# 35 — A portal client never sees a comment or attachment from an internal-only ticket

**What to build:** An external client opening the portal sees comments and attachments only from tickets that are themselves client-visible. Today the portal read filters the *child* row's visible flag but never requires the parent ticket to be visible, so a comment marked client-visible on an internal-only ticket is served to the client. The existing access spec asserts only the child's flag, which is why nothing caught it.

**Decision correction (2026-09-27):** Effective visibility is the intersection of the portal grant, authorized project, live parent ticket and explicitly visible child. Keep the child visibility flags: internal comments and attachments on a client-visible ticket must remain private, as the second acceptance criterion requires. Removing those flags is not a stronger fix; it removes an existing privacy control. Add the parent predicate to reads, counts and attachment-access paths without broadening child visibility.

**Blocked by:** None — can start immediately.

**Status:** REOPENED 2026-09-29, then fixed — the 2026-09-27 evidence was earned against the wrong service

**Correction 2026-09-29.** The boxes below were checked on evidence from
`backend/src/modules/portal/client/portal-client.service.ts`. That file was fixed and is correct.
But it is not the service the finding named, and it is not the only one serving this shape.

There are **two** registered, routed portal services returning a project overview:

| Route | Controller | Service | State on 2026-09-27 |
|---|---|---|---|
| `GET /portal/v1/projects/:projectId/overview` | `modules/portal/client/portal-client.controller.ts:75` | `PortalClientService` | fixed — parent predicate present at `:183` and `:211` |
| `GET /build/portal/projects/:projectId/overview` | `modules/build/client-portal/client-portal.controller.ts:49` | `ClientPortalService` | **still leaking** |

`getProjectOverview` exists only in the Build-owned `ClientPortalService`; `PortalClientService`
has no method of that name. Both modules are registered — `build.module.ts:8` imports
`BuildClientPortalModule`, `portal.module.ts:4` imports `PortalClientModule` — so both routes were
live and one of them served a comment or attachment from an internal-only ticket to an external
client.

Fixed 2026-09-29 in commit `6b7a5adf5`: `eq(tickets.clientVisible, true)` added to the
`ticketAttachments` and `ticketComments` inner joins in **both** `getProjectOverview` and
`getPortalPreview`. The preview is included deliberately — it is the internal "what the client
sees" surface, so leaving it more permissive would have made it lie to staff about what is exposed.

Three assertions added to `client-portal-source-acl.spec.ts`: two capture the JOIN ON clause and
assert the parent predicate (both failed before the fix, for the right reason), and one paired
positive asserts the child flag is still enforced, so deleting either predicate fails the suite
(BE-141). `npx jest src/modules/build/client-portal/` → 8 suites, 100 tests, all passing.

**The transferable lesson:** the existing spec captured only `.where()` predicates, never the
`.innerJoin()` ON clause, so the leak lived in the one place the test harness could not see. The
fix extends the harness to capture join predicates.

---

Original 2026-09-27 evidence, retained because it is accurate about the file it names:

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
