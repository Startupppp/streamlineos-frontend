import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { organizations, organizationMembers, invitations, users } from "../../../lib/db/schema";
import { eq, and, gt, desc, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { sendInvitationEmail } from "../../../lib/email";

const inviteUserSchema = z.object({
  email: z.string().email(),
  orgId: z.string(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "CLIENT"]),
});

const updateMemberRoleSchema = z.object({
  userId: z.string(),
  orgId: z.string(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "CLIENT"]),
});

const createOrganizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export const organizationRouter = createTRPCRouter({
  getInvitationByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.query.invitations.findFirst({
        where: and(
          eq(invitations.token, input.token),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.acceptedAt)
        ),
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired invitation",
        });
      }

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, invitation.orgId),
      });

      return {
        email: invitation.email,
        organizationName: org?.name || "Unknown",
        role: invitation.role,
      };
    }),

  getOrganizations: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const memberships = await ctx.db.query.organizationMembers.findMany({
      where: eq(organizationMembers.userId, ctx.session.user.id),
      orderBy: [desc(organizationMembers.joinedAt)],
    });

    const orgIds = memberships.map((m) => m.orgId);
    const orgs = orgIds.length > 0 
      ? await ctx.db.select().from(organizations).where(inArray(organizations.id, orgIds))
      : [];

    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    return memberships.map((m) => {
      const org = orgMap.get(m.orgId);
      return {
        id: org?.id || m.orgId,
        name: org?.name || "Unknown",
        slug: org?.slug || "",
        role: m.role,
        joinedAt: m.joinedAt,
      };
    });
  }),

  createOrganization: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Check if slug is taken
      const existing = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Organization slug already exists",
        });
      }

      // Create organization
      const orgId = nanoid();
      await ctx.db.insert(organizations).values({
        id: orgId,
        name: input.name,
        slug: input.slug,
      });

      // Add creator as owner
      await ctx.db.insert(organizationMembers).values({
        userId: ctx.session.user.id,
        orgId,
        role: "OWNER",
      });

      return { id: orgId, name: input.name, slug: input.slug };
    }),

  inviteUser: protectedProcedure
    .input(inviteUserSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Verify user has permission to invite (ADMIN or OWNER)
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, ctx.session.user.id),
          eq(organizationMembers.orgId, input.orgId)
        ),
      });

      if (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to invite users",
        });
      }

      // Check if user already exists and is already a member
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        const existingMember = await ctx.db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.userId, existingUser.id),
            eq(organizationMembers.orgId, input.orgId)
          ),
        });

        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a member of this organization",
          });
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await ctx.db.query.invitations.findFirst({
        where: and(
          eq(invitations.email, input.email),
          eq(invitations.orgId, input.orgId),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.acceptedAt)
        ),
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An invitation has already been sent to this email",
        });
      }

      // Create invitation
      const invitationToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const invitationId = nanoid();
      await ctx.db.insert(invitations).values({
        id: invitationId,
        email: input.email,
        token: invitationToken,
        orgId: input.orgId,
        role: input.role,
        invitedBy: ctx.session.user.id,
        expiresAt,
      });

      // Get organization and inviter details
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.orgId),
      });

      const inviter = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });

      // Send invitation email
      await sendInvitationEmail(
        input.email,
        invitationToken,
        org?.name || "Unknown Organization",
        inviter ? `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() : undefined
      );

      return { success: true, invitationId };
    }),

  getInvitations: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Verify user has permission
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, ctx.session.user.id),
          eq(organizationMembers.orgId, input.orgId)
        ),
      });

      if (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view invitations",
        });
      }

      const orgInvitations = await ctx.db.query.invitations.findMany({
        where: and(
          eq(invitations.orgId, input.orgId),
          isNull(invitations.acceptedAt)
        ),
        orderBy: [desc(invitations.createdAt)],
      });

      return orgInvitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }));
    }),

  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string(), orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Verify user has permission
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, ctx.session.user.id),
          eq(organizationMembers.orgId, input.orgId)
        ),
      });

      if (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to cancel invitations",
        });
      }

      await ctx.db.delete(invitations).where(eq(invitations.id, input.invitationId));

      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Verify user has permission (only OWNER can change roles)
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, ctx.session.user.id),
          eq(organizationMembers.orgId, input.orgId)
        ),
      });

      if (!membership || membership.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners can update member roles",
        });
      }

      await ctx.db
        .update(organizationMembers)
        .set({ role: input.role })
        .where(
          and(
            eq(organizationMembers.userId, input.userId),
            eq(organizationMembers.orgId, input.orgId)
          )
        );

      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ userId: z.string(), orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Verify user has permission (ADMIN or OWNER, but can't remove themselves)
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself from the organization",
        });
      }

      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, ctx.session.user.id),
          eq(organizationMembers.orgId, input.orgId)
        ),
      });

      if (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to remove members",
        });
      }

      await ctx.db
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, input.userId),
            eq(organizationMembers.orgId, input.orgId)
          )
        );

      return { success: true };
    }),
});

