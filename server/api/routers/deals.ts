import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { deals, users } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";

const dealStageValues = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

export const dealsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      stage: z.enum(dealStageValues).optional(),
      assignedToId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters = [eq(deals.orgId, orgId)];
      if (input?.stage) filters.push(eq(deals.stage, input.stage));
      if (input?.assignedToId) filters.push(eq(deals.assignedToId, input.assignedToId));

      return ctx.db.query.deals.findMany({
        where: and(...filters),
        with: {
          assignedTo: { columns: { id: true, name: true, image: true } },
          lead: { columns: { id: true, name: true } },
          client: { columns: { id: true, name: true } },
        },
        orderBy: [desc(deals.updatedAt)],
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const deal = await ctx.db.query.deals.findFirst({
        where: and(eq(deals.id, input.id), eq(deals.orgId, ctx.session.orgId)),
        with: {
          assignedTo: { columns: { id: true, name: true, image: true } },
          lead: { columns: { id: true, name: true, email: true, phone: true } },
          client: { columns: { id: true, name: true } },
        },
      });
      if (!deal) throw new TRPCError({ code: "NOT_FOUND" });
      return deal;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      value: z.string().optional().refine(
        (val) => !val || parseFloat(val) >= 0,
        { message: "Deal value cannot be negative" }
      ),
      stage: z.enum(dealStageValues).default("LEAD"),
      probability: z.number().min(0).max(100).optional(),
      contactPerson: z.string().optional(),
      contactEmail: z.string().email().optional().or(z.literal("")),
      contactPhone: z.string().optional(),
      assignedToId: z.string().optional(),
      expectedCloseDate: z.string().optional(),
      notes: z.string().optional(),
      leadId: z.number().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [deal] = await ctx.db.insert(deals).values({
        orgId: ctx.session.orgId,
        name: input.name,
        value: input.value || "0",
        stage: input.stage,
        probability: input.probability ?? 0,
        contactPerson: input.contactPerson || null,
        contactEmail: input.contactEmail || null,
        contactPhone: input.contactPhone || null,
        assignedToId: input.assignedToId || ctx.session.userId,
        expectedCloseDate: input.expectedCloseDate || null,
        notes: input.notes || null,
        leadId: input.leadId || null,
        clientId: input.clientId || null,
      }).returning();
      return deal;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      value: z.string().optional().refine(
        (val) => !val || parseFloat(val) >= 0,
        { message: "Deal value cannot be negative" }
      ),
      stage: z.enum(dealStageValues).optional(),
      probability: z.number().min(0).max(100).optional(),
      contactPerson: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      assignedToId: z.string().optional(),
      expectedCloseDate: z.string().nullable().optional(),
      actualCloseDate: z.string().nullable().optional(),
      lostReason: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) updateData[key] = val;
      }

      const [updated] = await ctx.db.update(deals)
        .set(updateData)
        .where(and(eq(deals.id, id), eq(deals.orgId, ctx.session.orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  updateStage: protectedProcedure
    .input(z.object({
      id: z.number(),
      stage: z.enum(dealStageValues),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        stage: input.stage,
        updatedAt: new Date(),
      };

      if (input.stage === "WON") {
        updateData.actualCloseDate = new Date().toISOString().split("T")[0];
        updateData.probability = 100;
      } else if (input.stage === "LOST") {
        updateData.actualCloseDate = new Date().toISOString().split("T")[0];
        updateData.probability = 0;
      }

      const [updated] = await ctx.db.update(deals)
        .set(updateData)
        .where(and(eq(deals.id, input.id), eq(deals.orgId, ctx.session.orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(deals)
        .where(and(eq(deals.id, input.id), eq(deals.orgId, ctx.session.orgId)));
      return { success: true };
    }),
});
