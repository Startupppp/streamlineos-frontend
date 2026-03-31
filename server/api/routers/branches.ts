import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc, count } from "drizzle-orm";
import { branches, users } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";

export const branchesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = ctx.session.orgId;
      return ctx.db.query.branches.findMany({
        where: eq(branches.orgId, orgId),
        orderBy: [desc(branches.createdAt)],
        with: {
          branchManager: { columns: { id: true, name: true, image: true } },
          branchHr: { columns: { id: true, name: true, image: true } },
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const branch = await ctx.db.query.branches.findFirst({
        where: and(eq(branches.id, input.id), eq(branches.orgId, orgId)),
        with: {
          branchManager: { columns: { id: true, name: true, image: true, email: true } },
          branchHr: { columns: { id: true, name: true, image: true, email: true } },
        },
      });
      if (!branch) throw new TRPCError({ code: "NOT_FOUND" });

      // Get employees in this branch
      const employees = await ctx.db.query.users.findMany({
        where: eq(users.branchId, input.id),
        columns: { id: true, name: true, image: true, role: true, isActive: true },
      });

      return { ...branch, employees };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      pincode: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      branchManagerId: z.string().optional(),
      branchHrId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";

      if (!["HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only HR/CEO can create branches" });
      }

      const [branch] = await ctx.db.insert(branches).values({
        orgId,
        ...input,
      }).returning();

      // Update branch users' branchId
      if (input.branchManagerId) {
        await ctx.db.update(users).set({ branchId: branch.id }).where(eq(users.id, input.branchManagerId));
      }
      if (input.branchHrId) {
        await ctx.db.update(users).set({ branchId: branch.id }).where(eq(users.id, input.branchHrId));
      }

      return branch;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      pincode: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      branchManagerId: z.string().optional(),
      branchHrId: z.string().optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";

      if (!["HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { id, ...data } = input;
      const [updated] = await ctx.db.update(branches)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(branches.id, id), eq(branches.orgId, orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  assignEmployee: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const role = ctx.session.user.role ?? "";
      if (!["HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [updated] = await ctx.db.update(users)
        .set({ branchId: input.branchId })
        .where(eq(users.id, input.userId))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});
