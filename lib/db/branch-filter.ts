"server-only";

/**
 * Branch isolation utilities for BRANCH_MANAGER and BRANCH_HR roles.
 *
 * CEO and HR see all data across the organization.
 * BRANCH_MANAGER and BRANCH_HR see only data scoped to their branch.
 */

import { SQL, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { AnyColumn } from "drizzle-orm";

/** Roles that must see only their branch's data. */
const BRANCH_SCOPED_ROLES = new Set(["BRANCH_MANAGER", "BRANCH_HR"]);

/** Roles that see all data regardless of branch. */
const ORG_WIDE_ROLES = new Set(["CEO", "HR", "ADMIN"]);

export interface BranchContext {
  role: string;
  branchId: number | null;
  userId: string;
}

/**
 * Returns true if the user's role requires branch-scoped data filtering.
 */
export function isBranchScoped(ctx: BranchContext): boolean {
  return BRANCH_SCOPED_ROLES.has(ctx.role) && ctx.branchId !== null;
}

/**
 * Returns true if the user can see all org data (no branch restriction).
 */
export function isOrgWide(ctx: BranchContext): boolean {
  return ORG_WIDE_ROLES.has(ctx.role);
}

/**
 * For tables with a direct `branchId` column.
 * Returns a WHERE SQL condition to filter by branch, or `undefined` if no filtering needed.
 *
 * @example
 * const cond = branchIdFilter(clientAccounts.branchId, ctx);
 * const where = cond ? and(eq(clientAccounts.orgId, orgId), cond) : eq(clientAccounts.orgId, orgId);
 */
export function branchIdFilter(
  branchIdCol: AnyColumn,
  ctx: BranchContext
): SQL | undefined {
  if (!isBranchScoped(ctx) || ctx.branchId === null) return undefined;
  return eq(branchIdCol, ctx.branchId) as SQL;
}

/**
 * Fetches the IDs of all users belonging to a branch.
 * Use with `inArray(table.assignedToId, ids)` for tables that reference users.
 *
 * Returns null if no branch filtering is needed (CEO/HR see all).
 *
 * @example
 * const userIds = await getBranchUserIds(ctx);
 * if (userIds !== null) {
 *   where.push(inArray(leads.assignedToId, userIds.length ? userIds : ["__no_match__"]));
 * }
 */
export async function getBranchUserIds(
  ctx: BranchContext
): Promise<string[] | null> {
  if (!isBranchScoped(ctx) || ctx.branchId === null) return null;
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.branchId, ctx.branchId));
  return rows.map((r) => r.id);
}

/**
 * Build a list of SQL conditions for a query that references user assignment.
 * Pushes a branch filter onto the `where` array in-place.
 *
 * @example
 * const where = [eq(leads.orgId, orgId)];
 * await pushBranchAssigneeFilter(where, leads.assignedToId, ctx);
 */
export async function pushBranchAssigneeFilter(
  where: SQL[],
  assigneeIdCol: AnyColumn,
  ctx: BranchContext
): Promise<void> {
  const userIds = await getBranchUserIds(ctx);
  if (userIds === null) return; // no filtering needed
  // If branch has no members yet, return nothing (prevent data leak)
  const safeIds = userIds.length > 0 ? userIds : ["__no_match__"];
  where.push(inArray(assigneeIdCol, safeIds) as SQL);
}
