import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Organization membership and tenancy — who is in this workspace, and which
 * workspace "this" is.
 *
 * `GET /organization/members` is KEYSET paginated. The client declared
 * `{ page, limit, total, totalPages }`, a shape the server has never sent:
 * `total` and `totalPages` were `undefined` at runtime and any page count
 * computed from them was fiction. The real page is `buildCursorPage`'s
 * `{ limit, hasMore, nextCursor }`.
 *
 * The request side is worse. `listMembersSchema` is `.strict()`, so the `page`
 * param the client sends is an `unrecognized_keys` error, not a silent strip —
 * the read 400s. The `page` argument is kept on the hook signature so its ~50
 * call sites still compile, but it is no longer put on the wire; paging is
 * `cursor`, and the cursor is scope-bound (change a filter and it 400s).
 *
 * `joinedAt` is a `timestamp` column, so it is an ISO STRING on the wire. It
 * was typed `Date`, and `member.joinedAt.getTime()` would have thrown.
 *
 * `role` is deliberately `z.string()`, not an enum: `organization_members.role`
 * is plain `text` with a "MEMBER" default and the RBAC catalog grows roles at
 * runtime, so an enum here would reject a legitimate role and lock the member
 * list out of the settings page.
 */

export const orgMemberContract = z.object({
  membershipId: z.number(),
  userId: z.string(),
  role: z.string(),
  joinedAt: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  totpEnabled: z.boolean(),
});

export const orgMembersPageContract = cursorPageContract(orgMemberContract);

export const userOrganizationContract = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: z.string(),
  /**
   * Nullable. The hot path reads `account_organization_index.joined_at`, which
   * is not NOT NULL, even though the cold fallback reads a column that is.
   */
  joinedAt: z.string().nullable(),
});

export const userOrganizationsContract = z.array(userOrganizationContract);

/** `outgoingOrgId` is destructured off before the response is returned. */
export const switchOrgResultContract = z.object({
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  role: z.string(),
});

export type OrgMember = z.infer<typeof orgMemberContract>;
export type OrgMembersPage = z.infer<typeof orgMembersPageContract>;
export type UserOrganization = z.infer<typeof userOrganizationContract>;
export type SwitchOrgResult = z.infer<typeof switchOrgResultContract>;
