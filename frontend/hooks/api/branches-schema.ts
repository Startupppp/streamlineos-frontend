import { z } from "zod";

/**
 * Contracts for `BranchesController` (`GET /branches`).
 *
 * The `/branches` endpoint used by the HR module returns a flat array of
 * branch list items, not a paginated cursor page.
 *
 * Note: this is the HR-module `branches` endpoint, NOT the org-hierarchy
 * `/org-hierarchy/branches` (those are in `org-hierarchy-schema.ts`).
 *
 * Timestamps are ISO strings over JSON. NOT `.strict()`.
 */

const branchStaffContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

export const branchListItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  code: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  pincode: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  branchManager: branchStaffContract.nullable(),
  branchHr: branchStaffContract.nullable(),
});

export const branchListContract = z.array(branchListItemContract);

export type BranchListItem = z.infer<typeof branchListItemContract>;
