import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  permissions,
  rolePermissions,
  userPermissions,
  users,
  organizationMembers,
} from "../../../lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from "../../../lib/rbac/permissions";
import { checkPermission } from "../../../lib/rbac/middleware";

export const rbacRouter = createTRPCRouter({
  getUserPermissions: protectedProcedure.query(async ({ ctx }) => {
    const { userId, orgId } = ctx.session;
    const user = await ctx.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });
    const role = user?.role;

    const userPerms = await ctx.db.query.userPermissions.findMany({
      where: and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.orgId, orgId),
        eq(userPermissions.granted, true)
      ),
      with: {
        permission: true,
      },
    });

    const rolePerms = role
      ? await ctx.db.query.rolePermissions.findMany({
          where: and(
            eq(rolePermissions.role, role as any),
            eq(rolePermissions.orgId, orgId)
          ),
          with: {
            permission: true,
          },
        })
      : [];

    const defaultPerms = role ? ROLE_DEFAULT_PERMISSIONS[role] ?? [] : [];

    const permissionSet = new Set<string>();

    userPerms.forEach((up) => {
      const perm = up.permission as { name: string } | null | undefined;
      if (perm?.name) {
        permissionSet.add(perm.name);
      }
    });

    rolePerms.forEach((rp) => {
      const perm = rp.permission as { name: string } | null | undefined;
      if (perm?.name) {
        permissionSet.add(perm.name);
      }
    });

    defaultPerms.forEach((perm) => permissionSet.add(perm));

    if (role === "OWNER") {
      PERMISSIONS.forEach((p) => permissionSet.add(p.name));
    }

    return Array.from(permissionSet);
  }),

  checkPermission: protectedProcedure
    .input(z.object({ permission: z.string() }))
    .query(async ({ ctx, input }) => {
      const { userId, orgId } = ctx.session;
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId),
      });
      const role = user?.role;
      return await checkPermission(
        ctx.db,
        userId,
        orgId,
        role,
        input.permission
      );
    }),

  getAllPermissions: protectedProcedure.query(async () => {
    return PERMISSIONS;
  }),

  getRolePermissions: protectedProcedure
    .input(z.object({ role: z.enum(["OWNER", "ADMIN", "MEMBER"]) }))
    .query(async ({ ctx, input }) => {
      const perms = await ctx.db.query.rolePermissions.findMany({
        where: and(
          eq(rolePermissions.role, input.role),
          eq(rolePermissions.orgId, ctx.session.orgId)
        ),
        with: {
          permission: true,
        },
      });

      return perms
        .map((rp) => {
          const perm = rp.permission as { name: string } | null | undefined;
          return perm?.name;
        })
        .filter(Boolean) as string[];
    }),

  assignRolePermission: protectedProcedure
    .input(
      z.object({
        role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
        permissionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.userId),
      });
      const role = user?.role;
      const hasAccess = await checkPermission(
        ctx.db,
        ctx.session.userId,
        ctx.session.orgId,
        role,
        "settings:rbac:manage"
      );

      if (!hasAccess) {
        throw new Error("Permission denied");
      }

      await ctx.db.insert(rolePermissions).values({
        role: input.role,
        permissionId: input.permissionId,
        orgId: ctx.session.orgId,
      });
    }),

  assignUserPermission: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        permissionId: z.number(),
        granted: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.userId),
      });
      const role = user?.role;
      const hasAccess = await checkPermission(
        ctx.db,
        ctx.session.userId,
        ctx.session.orgId,
        role,
        "settings:rbac:manage"
      );

      if (!hasAccess) {
        throw new Error("Permission denied");
      }

      const targetMember = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, input.userId),
          eq(organizationMembers.orgId, ctx.session.orgId)
        ),
      });

      if (!targetMember) {
        throw new Error("Target user is not a member of this organization");
      }

      await ctx.db
        .insert(userPermissions)
        .values({
          userId: input.userId,
          permissionId: input.permissionId,
          orgId: ctx.session.orgId,
          granted: input.granted,
        })
        .onConflictDoUpdate({
          target: [
            userPermissions.userId,
            userPermissions.permissionId,
            userPermissions.orgId,
          ],
          set: {
            granted: input.granted,
          },
        });
    }),
});
