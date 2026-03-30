import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { expenses } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { TRPCError } from "@trpc/server";
import {
  createExpenseInputSchema,
  updateExpenseStatusInputSchema,
} from "@/lib/validations/hr";
import {
  createPaginatedResponse,
  getOffset,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/pagination";

export const expenseRouter = createTRPCRouter({
  getExpenses: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]).optional(),
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(100).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const page = input.page || DEFAULT_PAGE;
      const limit = input.limit || DEFAULT_LIMIT;
      const offset = getOffset(page, limit);

      const conditions = [eq(expenses.orgId, ctx.session.orgId)];
      // Non-admin users can only see their own expenses
      if (!isAdminOrOwner(ctx.session.user.role)) {
        conditions.push(eq(expenses.userId, ctx.session.userId));
      } else if (input.userId) {
        conditions.push(eq(expenses.userId, input.userId));
      }
      if (input.status) {
        conditions.push(eq(expenses.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(expenses.expenseDate, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(expenses.expenseDate, input.endDate));
      }
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(expenses)
        .where(and(...conditions));

      const total = Number(countResult?.count || 0);

      const data = await ctx.db.query.expenses.findMany({
        where: and(...conditions),
        orderBy: [desc(expenses.expenseDate)],
        limit,
        offset,
      });

      return createPaginatedResponse(data, total, page, limit);
    }),

  createExpense: protectedProcedure
    .input(createExpenseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [expense] = await ctx.db
        .insert(expenses)
        .values({
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          category: input.category,
          amount: input.amount.toString(),
          description: input.description,
          receiptUrl: input.receiptUrl,
          expenseDate: formatDateOnly(input.expenseDate),
          status: "PENDING",
        })
        .returning();
      return expense;
    }),

  updateExpenseStatus: protectedProcedure
    .input(updateExpenseStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrOwner(ctx.session.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update expense status" });
      }
      const result = await ctx.db
        .update(expenses)
        .set({
          status: input.status,
          approverId: ctx.session.userId,
          rejectionReason: input.rejectionReason,
        })
        .where(
          and(
            eq(expenses.id, input.expenseId),
            eq(expenses.orgId, ctx.session.orgId),
            eq(expenses.status, "PENDING")
          )
        )
        .returning({ id: expenses.id });
      if (result.length === 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Expense has already been processed" });
      }
    }),
});
