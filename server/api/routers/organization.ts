import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure, sessionProcedure } from "@/server/api/trpc";
import { organizations, organizationMembers, invitations, users } from "@/lib/db/schema";
import { eq, and, gt, desc, inArray, isNull, or, count, ilike } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { sendInvitationEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";
import { isAdminOrOwner, isCEO } from "@/lib/auth-helpers";

const inviteUserSchema = z.object({
  email: z.string().email(),
  orgId: z.string(),
  role: z.string().min(1),
});

const updateMemberRoleSchema = z.object({
  userId: z.string(),
  orgId: z.string(),
  role: z.string().min(1),
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

  getOrganizations: sessionProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    try {
      const memberships = await ctx.db.query.organizationMembers.findMany({
        where: eq(organizationMembers.userId, ctx.session.user.id),
        orderBy: [desc(organizationMembers.joinedAt)],
      });

      if (memberships.length === 0) {
        return [];
      }

      const orgIds = memberships.map((m) => m.orgId);
      const orgs =
        orgIds.length > 0
          ? await ctx.db
              .select()
              .from(organizations)
              .where(inArray(organizations.id, orgIds))
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
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch organizations",
        cause: error,
      });
    }
  }),

  getMembersPaginated: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, orgId } = input;
      const offset = (page - 1) * limit;

      const baseConditions = [
        eq(organizationMembers.orgId, orgId),
      ];

      const searchConditions = search
        ? [
            ...baseConditions,
            or(
              ilike(users.name, `%${search}%`),
              ilike(users.email, `%${search}%`)
            ),
          ]
        : baseConditions;

      const [dataResult, countResult] = await Promise.all([
        ctx.db
          .select({
            userId: organizationMembers.userId,
            role: organizationMembers.role,
            joinedAt: organizationMembers.joinedAt,
            name: users.name,
            email: users.email,
            image: users.image,
          })
          .from(organizationMembers)
          .innerJoin(users, eq(organizationMembers.userId, users.id))
          .where(and(...searchConditions))
          .orderBy(users.name)
          .limit(limit)
          .offset(offset),
        ctx.db
          .select({ total: count() })
          .from(organizationMembers)
          .innerJoin(users, eq(organizationMembers.userId, users.id))
          .where(and(...searchConditions)),
      ]);

      const total = countResult[0]?.total ?? 0;

      return {
        data: dataResult,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  createOrganization: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const existing = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Organization slug already exists",
        });
      }
      const orgId = nanoid();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(organizations).values({
          id: orgId,
          name: input.name,
          slug: input.slug,
        });
        await tx.insert(organizationMembers).values({
          userId: ctx.session.user.id,
          orgId,
          role: "CEO",
        });
      });

      return { id: orgId, name: input.name, slug: input.slug };
    }),

  inviteUser: protectedProcedure
    .input(inviteUserSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, ctx.session.user.id),
          eq(organizationMembers.orgId, input.orgId)
        ),
      });

      if (!membership || !isAdminOrOwner(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to invite users",
        });
      }
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
      const invitationToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

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
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.orgId),
      });
      await sendInvitationEmail(
        input.email,
        invitationToken,
        org?.name || "Unknown Organization"
      );

      await createAuditLog({
        action: "org.member_invited",
        userId: ctx.session.user.id,
        orgId: input.orgId,
        targetId: invitationId,
        targetType: "invitation",
        metadata: { email: input.email, role: input.role },
      });

      return { success: true, invitationId };
    }),

  getInvitations: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, ctx.session.user.id),
          eq(organizationMembers.orgId, input.orgId)
        ),
      });

      if (!membership || !isAdminOrOwner(membership.role)) {
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
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, ctx.session.user.id),
          eq(organizationMembers.orgId, input.orgId)
        ),
      });

      if (!membership || !isAdminOrOwner(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to cancel invitations",
        });
      }

      await ctx.db.delete(invitations).where(
        and(eq(invitations.id, input.invitationId), eq(invitations.orgId, input.orgId))
      );

      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, ctx.session.user.id),
          eq(organizationMembers.orgId, input.orgId)
        ),
      });

      if (!membership || !isCEO(membership.role)) {
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

      await createAuditLog({
        action: "org.member_role_changed",
        userId: ctx.session.user.id,
        orgId: input.orgId,
        targetId: input.userId,
        targetType: "user",
        metadata: { newRole: input.role },
      });

      return { success: true };
    }),

  updateOrganization: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const { user } = ctx.session;
      if (!isAdminOrOwner(user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Owners and Admins can update organization settings.",
        });
      }

      if (input.slug) {
        const existing = await ctx.db.query.organizations.findFirst({
          where: and(eq(organizations.slug, input.slug), eq(organizations.id, orgId)),
        });
        if (!existing) {
          const slugTaken = await ctx.db.query.organizations.findFirst({
            where: eq(organizations.slug, input.slug),
          });
          if (slugTaken) {
            throw new TRPCError({ code: "CONFLICT", message: "Slug already in use." });
          }
        }
      }

      const updateData: Record<string, string> = {};
      if (input.name) updateData.name = input.name;
      if (input.slug) updateData.slug = input.slug;

      if (Object.keys(updateData).length > 0) {
        await ctx.db.update(organizations).set(updateData).where(eq(organizations.id, orgId));
      }

      await createAuditLog({
        action: "settings.updated",
        userId: ctx.session.user.id,
        orgId,
        targetId: orgId,
        targetType: "organization",
        metadata: updateData,
      });

      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ userId: z.string(), orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
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

      if (!membership || !isAdminOrOwner(membership.role)) {
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

      await createAuditLog({
        action: "org.member_removed",
        userId: ctx.session.user.id,
        orgId: input.orgId,
        targetId: input.userId,
        targetType: "user",
      });

      return { success: true };
    }),
});

