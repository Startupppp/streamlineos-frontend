import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { invoices, clients, projects, users } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(1, "Quantity must be at least 1").max(999999),
  rate: z.number().positive("Rate must be greater than 0").max(999999999.99),
  amount: z.number().min(0).max(999999999.99),
});

export const invoiceRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
      clientId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      page: z.number().min(1).default(1),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const limit = input?.limit ?? 50;
      const offset = ((input?.page ?? 1) - 1) * limit;

      const conditions = [eq(invoices.orgId, orgId)];
      if (input?.status) conditions.push(eq(invoices.status, input.status));
      if (input?.clientId) conditions.push(eq(invoices.clientId, input.clientId));

      const [items, [countResult]] = await Promise.all([
        ctx.db.query.invoices.findMany({
          where: and(...conditions),
          orderBy: [desc(invoices.createdAt)],
          limit,
          offset,
          with: {
            client: { columns: { id: true, name: true } },
            project: { columns: { id: true, name: true } },
            creator: { columns: { id: true, name: true } },
          },
        }),
        ctx.db.select({ count: sql<number>`count(*)::int` })
          .from(invoices)
          .where(and(...conditions)),
      ]);

      return {
        items,
        total: countResult?.count ?? 0,
        page: input?.page ?? 1,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.query.invoices.findFirst({
        where: and(eq(invoices.id, input.id), eq(invoices.orgId, ctx.session.orgId)),
        with: {
          client: true,
          project: { columns: { id: true, name: true } },
          creator: { columns: { id: true, name: true } },
        },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      return invoice;
    }),

  create: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      projectId: z.number().optional(),
      lineItems: z.array(lineItemSchema).min(1),
      taxRate: z.number().min(0).max(100).default(0),
      discount: z.number().min(0).default(0),
      currency: z.string().default("INR"),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const subtotal = Number(input.lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
      const taxAmount = Number((subtotal * (input.taxRate / 100)).toFixed(2));
      const total = Number((subtotal + taxAmount - input.discount).toFixed(2));

      // Use transaction + advisory lock to prevent invoice number collision
      const [invoice] = await ctx.db.transaction(async (tx) => {
        // Lock on orgId hash to serialize invoice number generation per org
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'invoice'))`);

        const [countResult] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(invoices)
          .where(eq(invoices.orgId, orgId));
        const nextNum = (countResult?.count ?? 0) + 1;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;

        return tx.insert(invoices).values({
          orgId,
          clientId: input.clientId,
          projectId: input.projectId,
          invoiceNumber,
          lineItems: input.lineItems,
          subtotal: subtotal.toString(),
          taxRate: input.taxRate.toString(),
          taxAmount: taxAmount.toString(),
          discount: input.discount.toString(),
          total: total.toString(),
          currency: input.currency,
          dueDate: input.dueDate,
          notes: input.notes,
          createdBy: ctx.session.userId,
        }).returning();
      });

      return invoice;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientId: z.number().optional(),
      projectId: z.number().optional(),
      lineItems: z.array(lineItemSchema).optional(),
      taxRate: z.number().min(0).max(100).optional(),
      discount: z.number().min(0).optional(),
      currency: z.string().optional(),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.invoices.findFirst({
        where: and(eq(invoices.id, input.id), eq(invoices.orgId, ctx.session.orgId)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status !== "DRAFT") throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft invoices can be edited" });

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.clientId !== undefined) updateData.clientId = input.clientId;
      if (input.projectId !== undefined) updateData.projectId = input.projectId;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
      if (input.notes !== undefined) updateData.notes = input.notes;

      if (input.lineItems) {
        const subtotal = Number(input.lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
        const taxRate = input.taxRate ?? Number(existing.taxRate ?? 0);
        const discount = input.discount ?? Number(existing.discount ?? 0);
        const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
        const total = Number((subtotal + taxAmount - discount).toFixed(2));

        updateData.lineItems = input.lineItems;
        updateData.subtotal = subtotal.toString();
        updateData.taxRate = taxRate.toString();
        updateData.taxAmount = taxAmount.toString();
        updateData.discount = discount.toString();
        updateData.total = total.toString();
      }

      await ctx.db.update(invoices).set(updateData).where(eq(invoices.id, input.id));
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["SENT", "PAID", "OVERDUE", "CANCELLED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.invoices.findFirst({
        where: and(eq(invoices.id, input.id), eq(invoices.orgId, ctx.session.orgId)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const updateData: Record<string, unknown> = { status: input.status, updatedAt: new Date() };
      if (input.status === "SENT") updateData.sentAt = new Date();
      if (input.status === "PAID") updateData.paidAt = new Date();

      await ctx.db.update(invoices).set(updateData).where(eq(invoices.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.invoices.findFirst({
        where: and(eq(invoices.id, input.id), eq(invoices.orgId, ctx.session.orgId)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status === "PAID") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete paid invoices" });

      await ctx.db.delete(invoices).where(eq(invoices.id, input.id));
      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const results = await ctx.db
      .select({
        status: invoices.status,
        count: sql<number>`count(*)::int`,
        total: sql<number>`COALESCE(sum(${invoices.total}::numeric), 0)::float`,
      })
      .from(invoices)
      .where(eq(invoices.orgId, orgId))
      .groupBy(invoices.status);

    const stats = { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0, totalOutstanding: 0, totalPaid: 0 };
    for (const r of results) {
      const s = r.status.toLowerCase() as keyof typeof stats;
      if (s in stats) (stats as Record<string, number>)[s] = r.count;
      if (r.status === "SENT" || r.status === "OVERDUE") stats.totalOutstanding += r.total;
      if (r.status === "PAID") stats.totalPaid += r.total;
    }
    return stats;
  }),
});
