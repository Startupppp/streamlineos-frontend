import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { contacts, crmOrganizations } from "@/lib/db/schema";
import { eq, and, or, count, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { safeIlike } from "@/lib/db/search-utils";

export const contactsRouter = createTRPCRouter({
  getContacts: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        organizationId: z.number().optional(),
        limit: z.number().max(100).default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(contacts.orgId, ctx.session.orgId)];
      if (input.organizationId) conditions.push(eq(contacts.organizationId, input.organizationId));
      if (input.search) {
        conditions.push(
          or(
            safeIlike(contacts.name, input.search),
            safeIlike(contacts.email, input.search),
            safeIlike(contacts.company, input.search)
          )!
        );
      }

      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(contacts)
        .where(and(...conditions));

      const items = await ctx.db
        .select()
        .from(contacts)
        .where(and(...conditions))
        .orderBy(contacts.name)
        .limit(input.limit)
        .offset(input.offset);

      return { items, total: totalResult?.count ?? 0 };
    }),

  getContactById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const contact = await ctx.db.query.contacts.findFirst({
        where: and(eq(contacts.id, input.id), eq(contacts.orgId, ctx.session.orgId)),
        with: { crmOrganization: true, lead: true, deal: true },
      });
      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
      return contact;
    }),

  createContact: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        title: z.string().optional(),
        department: z.string().optional(),
        company: z.string().optional(),
        organizationId: z.number().optional(),
        linkedinUrl: z.string().optional(),
        twitterUrl: z.string().optional(),
        leadId: z.number().optional(),
        dealId: z.number().optional(),
        tags: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [contact] = await ctx.db
        .insert(contacts)
        .values({
          name: input.name,
          email: input.email,
          phone: input.phone,
          title: input.title,
          department: input.department,
          company: input.company,
          organizationId: input.organizationId,
          linkedinUrl: input.linkedinUrl,
          twitterUrl: input.twitterUrl,
          leadId: input.leadId,
          dealId: input.dealId,
          tags: input.tags,
          orgId: ctx.session.orgId,
        })
        .returning();
      return contact;
    }),

  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        department: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        organizationId: z.number().nullable().optional(),
        linkedinUrl: z.string().nullable().optional(),
        twitterUrl: z.string().nullable().optional(),
        avatarUrl: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(contacts)
        .set({
          name: input.name,
          email: input.email,
          phone: input.phone,
          title: input.title,
          department: input.department,
          company: input.company,
          organizationId: input.organizationId,
          linkedinUrl: input.linkedinUrl,
          twitterUrl: input.twitterUrl,
          avatarUrl: input.avatarUrl,
          tags: input.tags,
          updatedAt: new Date(),
        })
        .where(and(eq(contacts.id, input.id), eq(contacts.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  deleteContact: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(contacts)
        .where(and(eq(contacts.id, input.id), eq(contacts.orgId, ctx.session.orgId)));
    }),

  getOrganizations: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().max(100).default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(crmOrganizations.orgId, ctx.session.orgId)];
      if (input.search) {
        conditions.push(
          or(
            safeIlike(crmOrganizations.name, input.search),
            safeIlike(crmOrganizations.domain, input.search)
          )!
        );
      }

      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(crmOrganizations)
        .where(and(...conditions));

      const items = await ctx.db
        .select()
        .from(crmOrganizations)
        .where(and(...conditions))
        .orderBy(crmOrganizations.name)
        .limit(input.limit)
        .offset(input.offset);

      return { items, total: totalResult?.count ?? 0 };
    }),

  getOrganizationById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.query.crmOrganizations.findFirst({
        where: and(eq(crmOrganizations.id, input.id), eq(crmOrganizations.orgId, ctx.session.orgId)),
        with: { contacts: true },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      return org;
    }),

  createOrganization: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        domain: z.string().optional(),
        industry: z.string().optional(),
        size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]).optional(),
        website: z.string().optional(),
        linkedinUrl: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [org] = await ctx.db
        .insert(crmOrganizations)
        .values({
          name: input.name,
          domain: input.domain,
          industry: input.industry,
          size: input.size,
          website: input.website,
          linkedinUrl: input.linkedinUrl,
          description: input.description,
          orgId: ctx.session.orgId,
        })
        .returning();
      return org;
    }),

  updateOrganization: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        domain: z.string().nullable().optional(),
        industry: z.string().nullable().optional(),
        size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]).nullable().optional(),
        website: z.string().nullable().optional(),
        linkedinUrl: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        healthScore: z.number().int().min(0).max(100).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(crmOrganizations)
        .set({
          name: input.name,
          domain: input.domain,
          industry: input.industry,
          size: input.size,
          website: input.website,
          linkedinUrl: input.linkedinUrl,
          description: input.description,
          healthScore: input.healthScore,
          updatedAt: new Date(),
        })
        .where(and(eq(crmOrganizations.id, input.id), eq(crmOrganizations.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  deleteOrganization: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(contacts)
        .set({ organizationId: null })
        .where(and(eq(contacts.organizationId, input.id), eq(contacts.orgId, ctx.session.orgId)));

      await ctx.db
        .delete(crmOrganizations)
        .where(and(eq(crmOrganizations.id, input.id), eq(crmOrganizations.orgId, ctx.session.orgId)));
    }),
});
