import { TRPCError } from "@trpc/server";
import { rolePermissions, userPermissions } from "../db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import type { db as database } from "../db";

type DbClient = Pick<typeof database, "query">;

export function requirePermission(permissionName: string) {
  return async (opts: {
    ctx: { db: DbClient; session: { userId: string; orgId: string; role?: string } };
    next: () => Promise<unknown>;
  }) => {
    const { ctx, next } = opts;
    const { userId, orgId, role } = ctx.session;

    const hasPermission = await checkPermission(
      ctx.db,
      userId,
      orgId,
      role,
      permissionName
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission denied: ${permissionName}`,
      });
    }

    return next();
  };
}

export async function checkPermission(
  db: DbClient,
  userId: string,
  orgId: string,
  role?: string,
  permissionName?: string
): Promise<boolean> {
  if (!permissionName) return true;

  const userPerm = await db.query.userPermissions.findFirst({
    where: and(
      eq(userPermissions.userId, userId),
      eq(userPermissions.orgId, orgId),
      eq(userPermissions.granted, true)
    ),
    with: {
      permission: true,
    },
  });

  if (userPerm && userPerm.permission?.name === permissionName) {
    return true;
  }

  if (
    userPerm &&
    userPerm.permission?.name === permissionName &&
    !userPerm.granted
  ) {
    return false;
  }

  const VALID_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
  type ValidRole = typeof VALID_ROLES[number];
  if (role && VALID_ROLES.includes(role as ValidRole)) {
    const validRole: ValidRole = role as ValidRole;
    const rolePerm = await db.query.rolePermissions.findFirst({
      where: and(
        eq(rolePermissions.role, validRole),
        or(eq(rolePermissions.orgId, orgId), isNull(rolePermissions.orgId))
      ),
      with: {
        permission: true,
      },
    });

    if (rolePerm && rolePerm.permission?.name === permissionName) {
      return true;
    }
  }

  if (role === "OWNER") {
    return true;
  }

  return false;
}

export function hasAnyPermission(permissionNames: string[]) {
  return async (opts: {
    ctx: { db: DbClient; session: { userId: string; orgId: string; role?: string } };
    next: () => Promise<unknown>;
  }) => {
    const { ctx, next } = opts;
    const { userId, orgId, role } = ctx.session;

    const checks = await Promise.all(
      permissionNames.map((perm) =>
        checkPermission(ctx.db, userId, orgId, role, perm)
      )
    );

    if (!checks.some((has) => has)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission denied: requires one of ${permissionNames.join(
          ", "
        )}`,
      });
    }

    return next();
  };
}
