import { rolePermissions, userPermissions, roles, organizationMembers } from "../db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import type { db as database } from "../db";

type DbClient = Pick<typeof database, "query">;

function parsePlatformAdminEmails(): ReadonlySet<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

const PLATFORM_ADMIN_EMAILS = parsePlatformAdminEmails();

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return PLATFORM_ADMIN_EMAILS.has(email.toLowerCase());
}

export function requirePermission(permissionName: string) {
  return async (opts: {
    ctx: { db: DbClient; session: { userId: string; orgId: string; role?: string; email?: string; isOrgOwner?: boolean } };
    next: () => Promise<unknown>;
  }) => {
    const { ctx, next } = opts;
    const { userId, orgId, role, email, isOrgOwner } = ctx.session;

    const hasPermission = await checkPermission(
      ctx.db,
      userId,
      orgId,
      role,
      permissionName,
      { email, isOrgOwner },
    );

    if (!hasPermission) {
      throw Object.assign(new Error(`Permission denied: ${permissionName}`), { code: "FORBIDDEN" });
    }

    return next();
  };
}

interface CheckOptions {
  email?: string | null;
  isOrgOwner?: boolean;
}

export async function checkPermission(
  db: DbClient,
  userId: string,
  orgId: string,
  role?: string,
  permissionName?: string,
  options?: CheckOptions,
): Promise<boolean> {
  if (!permissionName) return true;

  if (isPlatformAdminEmail(options?.email)) return true;

  if (options?.isOrgOwner) return true;

  if (options?.isOrgOwner === undefined) {
    const member = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, orgId)),
      columns: { isOwner: true },
    }).catch(() => null);
    if (member?.isOwner) return true;
  }

  const userPerms = await db.query.userPermissions.findMany({
    where: and(
      eq(userPermissions.userId, userId),
      eq(userPermissions.orgId, orgId)
    ),
    with: {
      permission: true,
    },
  });

  const matchingUserPerm = userPerms.find(
    (up) => up.permission?.name === permissionName
  );

  if (matchingUserPerm) {
    return matchingUserPerm.granted;
  }

  if (role) {
    const rolePerms = await db.query.rolePermissions.findMany({
      where: and(
        eq(rolePermissions.role, role),
        or(eq(rolePermissions.orgId, orgId), isNull(rolePermissions.orgId))
      ),
      with: {
        permission: true,
      },
    });

    const hasRolePerm = rolePerms.some(
      (rp) => rp.permission?.name === permissionName
    );

    if (hasRolePerm) {
      return true;
    }
  }

  if (role) {
    const dbRole = await db.query.roles.findFirst({
      where: and(eq(roles.slug, role), eq(roles.orgId, orgId)),
    });

    if (dbRole?.permissions && Array.isArray(dbRole.permissions)) {
      if ((dbRole.permissions as string[]).includes(permissionName)) {
        return true;
      }
    }
  }

  return false;
}

export function hasAnyPermission(permissionNames: string[]) {
  return async (opts: {
    ctx: { db: DbClient; session: { userId: string; orgId: string; role?: string; email?: string; isOrgOwner?: boolean } };
    next: () => Promise<unknown>;
  }) => {
    const { ctx, next } = opts;
    const { userId, orgId, role, email, isOrgOwner } = ctx.session;

    const checks = await Promise.all(
      permissionNames.map((perm) =>
        checkPermission(ctx.db, userId, orgId, role, perm, { email, isOrgOwner })
      )
    );

    if (!checks.some((has) => has)) {
      throw Object.assign(new Error(`Permission denied: requires one of ${permissionNames.join(", ")}`), { code: "FORBIDDEN" });
    }

    return next();
  };
}
