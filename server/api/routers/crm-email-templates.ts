import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { crmEmailTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const crmEmailTemplatesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ limit: z.number().max(100).default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(crmEmailTemplates)
        .where(eq(crmEmailTemplates.orgId, ctx.session.orgId))
        .orderBy(crmEmailTemplates.name)
        .limit(input.limit)
        .offset(input.offset);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(crmEmailTemplates)
        .where(and(eq(crmEmailTemplates.id, input.id), eq(crmEmailTemplates.orgId, ctx.session.orgId)));

      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      return template;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        subject: z.string().min(1),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .insert(crmEmailTemplates)
        .values({
          orgId: ctx.session.orgId,
          name: input.name,
          subject: input.subject,
          body: input.body,
          createdBy: ctx.session.userId,
        })
        .returning();
      return template;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(crmEmailTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(crmEmailTemplates.id, id), eq(crmEmailTemplates.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(crmEmailTemplates)
        .where(and(eq(crmEmailTemplates.id, input.id), eq(crmEmailTemplates.orgId, ctx.session.orgId)));
    }),

  interpolate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        variables: z.record(z.string(), z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(crmEmailTemplates)
        .where(and(eq(crmEmailTemplates.id, input.templateId), eq(crmEmailTemplates.orgId, ctx.session.orgId)));

      if (!template) throw new TRPCError({ code: "NOT_FOUND" });

      let subject = template.subject;
      let body = template.body;
      for (const [key, value] of Object.entries(input.variables)) {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        subject = subject.replace(pattern, value);
        body = body.replace(pattern, value);
      }

      return { subject, body };
    }),
});
