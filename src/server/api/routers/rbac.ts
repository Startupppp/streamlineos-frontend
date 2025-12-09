import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { permissions, rolePermissions, userPermissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/middleware";

export const rbacRouter = createTRPCRouter({
  getUserPermissions: protectedProcedure.query(async ({ ctx }) => {
    const { userId, orgId, role } = ctx.session;

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
      if (up.permission) permissionSet.add(up.permission.name);
    });

    rolePerms.forEach((rp) => {
      if (rp.permission) permissionSet.add(rp.permission.name);
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
      const { userId, orgId, role } = ctx.session;
      return await checkPermission(ctx.db, userId, orgId, role, input.permission);
    }),

  getAllPermissions: protectedProcedure.query(async () => {
    return PERMISSIONS;
  }),

  getRolePermissions: protectedProcedure
    .input(z.object({ role: z.enum(["OWNER", "ADMIN", "MEMBER", "CLIENT"]) }))
    .query(async ({ ctx, input }) => {
      const perms = await ctx.db.query.rolePermissions.findMany({
        where: eq(rolePermissions.role, input.role),
        with: {
          permission: true,
        },
      });

      return perms.map((rp) => rp.permission?.name).filter(Boolean) as string[];
    }),

  assignRolePermission: protectedProcedure
    .input(
      z.object({
        role: z.enum(["OWNER", "ADMIN", "MEMBER", "CLIENT"]),
        permissionId: z.number(),
        orgId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hasAccess = await checkPermission(
        ctx.db,
        ctx.session.userId,
        ctx.session.orgId,
        ctx.session.role,
        "settings:rbac:manage"
      );

      if (!hasAccess) {
        throw new Error("Permission denied");
      }

      await ctx.db.insert(rolePermissions).values({
        role: input.role,
        permissionId: input.permissionId,
        orgId: input.orgId ?? ctx.session.orgId,
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
      const hasAccess = await checkPermission(
        ctx.db,
        ctx.session.userId,
        ctx.session.orgId,
        ctx.session.role,
        "settings:rbac:manage"
      );

      if (!hasAccess) {
        throw new Error("Permission denied");
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
          target: [userPermissions.userId, userPermissions.permissionId, userPermissions.orgId],
          set: {
            granted: input.granted,
          },
        });
    }),
});

