import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { roles } from "../../../lib/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ROLE_DEFAULT_PERMISSIONS, PERMISSIONS } from "../../../lib/rbac/permissions";
import { isAdminOrOwner } from "../../../lib/auth-helpers";

export const rolesRouter = createTRPCRouter({
  // List all roles for the current org
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgRoles = await ctx.db.query.roles.findMany({
      where: eq(roles.orgId, ctx.session.orgId),
      orderBy: (roles, { asc }) => [asc(roles.name)],
    });
    return orgRoles;
  }),

  // Get a single role by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const role = await ctx.db.query.roles.findFirst({
        where: and(eq(roles.id, input.id), eq(roles.orgId, ctx.session.orgId)),
      });
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }
      return role;
    }),

  // Create a new role (CEO or ADMIN can do this)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Role name is required").max(100),
      slug: z.string().min(1).max(50).regex(/^[A-Z_]+$/, "Slug must be uppercase with underscores"),
      permissions: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      if (!isAdminOrOwner(userRole)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only CEO or Admin can create roles" });
      }

      // Check slug uniqueness within org
      const existing = await ctx.db.query.roles.findFirst({
        where: and(eq(roles.slug, input.slug), eq(roles.orgId, ctx.session.orgId)),
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A role with this slug already exists" });
      }

      const [created] = await ctx.db.insert(roles).values({
        name: input.name,
        slug: input.slug,
        orgId: ctx.session.orgId,
        isSystem: false,
        permissions: input.permissions,
      }).returning();

      return created;
    }),

  // Update a role's permissions (system roles can have permissions updated, but not name/slug)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      permissions: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      if (!isAdminOrOwner(userRole)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only CEO or Admin can update roles" });
      }

      const existing = await ctx.db.query.roles.findFirst({
        where: and(eq(roles.id, input.id), eq(roles.orgId, ctx.session.orgId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      // System roles: can update permissions only, not name
      if (input.name && !existing.isSystem) updateData.name = input.name;
      if (input.permissions) updateData.permissions = input.permissions;

      await ctx.db.update(roles).set(updateData).where(and(eq(roles.id, input.id), eq(roles.orgId, ctx.session.orgId)));
      return { success: true };
    }),

  // Delete a role (only non-system roles)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      if (!isAdminOrOwner(userRole)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only CEO or Admin can delete roles" });
      }

      const existing = await ctx.db.query.roles.findFirst({
        where: and(eq(roles.id, input.id), eq(roles.orgId, ctx.session.orgId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }
      if (existing.isSystem) {
        throw new TRPCError({ code: "FORBIDDEN", message: "System roles cannot be deleted" });
      }

      await ctx.db.delete(roles).where(and(eq(roles.id, input.id), eq(roles.orgId, ctx.session.orgId)));
      return { success: true };
    }),

  // Get all available permissions (for the role editor UI)
  allPermissions: protectedProcedure.query(async () => {
    return PERMISSIONS;
  }),
});
