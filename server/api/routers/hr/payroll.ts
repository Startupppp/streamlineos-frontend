import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  payrolls,
  salaryStructures,
  organizationMembers,
  users,
} from "../../../../lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatDateOnly } from "../../../../lib/date-utils";
import { TRPCError } from "@trpc/server";
import {
  generatePayrollInputSchema,
  createSalaryStructureInputSchema,
  generateEmployeePayslipInputSchema,
} from "../../../../lib/validations/hr";
import { sendPayslipGeneratedEmail } from "../../../../lib/email";

export const payrollRouter = createTRPCRouter({
  getPayrolls: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.payrolls.findMany({
      where: and(
        eq(payrolls.userId, ctx.session.userId),
        eq(payrolls.orgId, ctx.session.orgId)
      ),
      orderBy: [desc(payrolls.createdAt)],
    });
  }),

  generatePayroll: protectedProcedure
    .input(generatePayrollInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can generate payroll" });
      }
      const memberships = await ctx.db.query.organizationMembers.findMany({
        where: eq(organizationMembers.orgId, ctx.session.orgId),
      });

      for (const mem of memberships) {
        const uId = mem.userId;
        if (!uId) continue;

        const salaryStructure = await ctx.db.query.salaryStructures.findFirst({
          where: and(
            eq(salaryStructures.userId, uId),
            eq(salaryStructures.orgId, ctx.session.orgId),
            eq(salaryStructures.isActive, true)
          ),
        });

        const basic = salaryStructure
          ? parseFloat(salaryStructure.basicSalary)
          : 50000;
        const hraPercentage = salaryStructure
          ? parseFloat(salaryStructure.hraPercentage || "40")
          : 40;
        const hra = basic * (hraPercentage / 100);
        const allowances = salaryStructure
          ? parseFloat(salaryStructure.allowances || "0")
          : 5000;
        const deductions = salaryStructure
          ? parseFloat(salaryStructure.deductions || "0")
          : 2000;
        const gross = basic + hra + allowances;
        const net = gross - deductions;

        const existing = await ctx.db.query.payrolls.findFirst({
          where: and(
            eq(payrolls.userId, uId),
            eq(payrolls.month, input.month),
            eq(payrolls.orgId, ctx.session.orgId)
          ),
        });

        if (!existing) {
          await ctx.db.insert(payrolls).values({
            orgId: ctx.session.orgId,
            userId: uId,
            month: input.month,
            basicSalary: basic.toString(),
            hra: hra.toString(),
            allowances: allowances.toString(),
            deductions: deductions.toString(),
            grossSalary: gross.toString(),
            netSalary: net.toString(),
            status: "DRAFT",
            generatedBy: ctx.session.userId,
          });
        }
      }
    }),

  getSalaryStructures: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(salaryStructures.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(salaryStructures.userId, input.userId));
      }
      return await ctx.db.query.salaryStructures.findMany({
        where: and(...conditions),
        orderBy: [desc(salaryStructures.effectiveFrom)],
      });
    }),

  createSalaryStructure: protectedProcedure
    .input(createSalaryStructureInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can manage salary structures" });
      }
      const [structure] = await ctx.db.transaction(async (tx) => {
        await tx
          .update(salaryStructures)
          .set({ isActive: false })
          .where(
            and(
              eq(salaryStructures.userId, input.userId),
              eq(salaryStructures.orgId, ctx.session.orgId),
              eq(salaryStructures.isActive, true)
            )
          );

        return await tx
          .insert(salaryStructures)
          .values({
            orgId: ctx.session.orgId,
            userId: input.userId,
            basicSalary: input.basicSalary.toString(),
            hraPercentage: input.hraPercentage.toString(),
            allowances: input.allowances.toString(),
            deductions: input.deductions.toString(),
            effectiveFrom: formatDateOnly(input.effectiveFrom),
            effectiveTo: input.effectiveTo
              ? formatDateOnly(input.effectiveTo)
              : undefined,
            isActive: true,
          })
          .returning();
      });
      return structure;
    }),

  generateEmployeePayslip: protectedProcedure
    .input(generateEmployeePayslipInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const salaryStructure = await ctx.db.query.salaryStructures.findFirst({
        where: and(
          eq(salaryStructures.userId, input.userId),
          eq(salaryStructures.orgId, ctx.session.orgId),
          eq(salaryStructures.isActive, true)
        ),
      });

      const monthlySalary = user.monthlySalary ? parseFloat(user.monthlySalary) : 0;
      const workingDays = 30;
      const perDaySalary = monthlySalary / workingDays;
      const lopDeduction = (input.lopDays || 0) * perDaySalary;
      const halfDayDeduction = ((input.halfDays || 0) * perDaySalary) / 2;
      const basicSalary = salaryStructure ? parseFloat(salaryStructure.basicSalary) : monthlySalary * 0.5;
      const hra = salaryStructure ? (parseFloat(salaryStructure.basicSalary) * parseFloat(salaryStructure.hraPercentage || "40") / 100) : monthlySalary * 0.5;
      const bonus = input.bonus || 0;
      const overtimeAmount = input.overtimeAmount || 0;
      const professionalTax = 200;
      const otherDeductions = input.otherDeductions || 0;
      const totalDeductions = professionalTax + lopDeduction + halfDayDeduction + otherDeductions;

      const grossSalary = monthlySalary + bonus + overtimeAmount;
      const netSalary = grossSalary - totalDeductions;

      const existing = await ctx.db.query.payrolls.findFirst({
        where: and(
          eq(payrolls.userId, input.userId),
          eq(payrolls.month, input.month),
          eq(payrolls.orgId, ctx.session.orgId)
        ),
      });

      const payrollData = {
        basicSalary: basicSalary.toString(),
        hra: hra.toString(),
        allowances: bonus.toString(),
        deductions: totalDeductions.toString(),
        grossSalary: grossSalary.toString(),
        netSalary: netSalary.toString(),
        overtimeType: input.overtimeType || null,
        overtimeDays: (input.overtimeDays || 0).toString(),
        overtimeHours: (input.overtimeHours || 0).toString(),
        overtimeAmount: overtimeAmount.toString(),
        status: "DRAFT" as const,
        generatedBy: ctx.session.userId,
      };

      if (existing) {
        await ctx.db.update(payrolls)
          .set(payrollData)
          .where(eq(payrolls.id, existing.id));
        if (user.email) {
          const monthDate = new Date(input.month + "-01");
          const monthName = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
          const employeeName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.name || "Employee";

          sendPayslipGeneratedEmail(
            user.email,
            employeeName,
            monthName,
            netSalary.toLocaleString()
          ).catch(() => {});
        }

        return existing;
      }

      const [payroll] = await ctx.db.insert(payrolls).values({
        orgId: ctx.session.orgId,
        userId: input.userId,
        month: input.month,
        ...payrollData,
      }).returning();
      if (user.email) {
        const monthDate = new Date(input.month + "-01");
        const monthName = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        const employeeName = user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.name || "Employee";

        sendPayslipGeneratedEmail(
          user.email,
          employeeName,
          monthName,
          netSalary.toLocaleString()
        ).catch(() => {});
      }

      return payroll;
    }),

  getEmployeePayslips: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId || ctx.session.userId;

      if (targetUserId !== ctx.session.userId &&
          ctx.session.user.role !== "OWNER" &&
          ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      return await ctx.db.query.payrolls.findMany({
        where: and(
          eq(payrolls.userId, targetUserId),
          eq(payrolls.orgId, ctx.session.orgId)
        ),
        orderBy: [desc(payrolls.month)],
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              name: true,
              designation: true,
              email: true,
              joiningDate: true,
              taxId: true,
              bankDetails: true,
              employeeId: true,
            },
          },
        },
      });
    }),

  approvePayroll: protectedProcedure
    .input(z.object({ payrollId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await ctx.db.update(payrolls)
        .set({
          status: "APPROVED",
          approvedBy: ctx.session.userId,
        })
        .where(and(
          eq(payrolls.id, input.payrollId),
          eq(payrolls.orgId, ctx.session.orgId)
        ));

      return { success: true };
    }),

  markPayrollPaid: protectedProcedure
    .input(z.object({ payrollId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await ctx.db.update(payrolls)
        .set({ status: "PAID" })
        .where(and(
          eq(payrolls.id, input.payrollId),
          eq(payrolls.orgId, ctx.session.orgId)
        ));

      return { success: true };
    }),

  getAllPayrolls: protectedProcedure
    .input(z.object({ month: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const conditions = [eq(payrolls.orgId, ctx.session.orgId)];
      if (input.month) {
        conditions.push(eq(payrolls.month, input.month));
      }

      const results = await ctx.db.select({
        payroll: payrolls,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          designation: users.designation,
          employeeId: users.employeeId,
          bankDetails: users.bankDetails,
          joiningDate: users.joiningDate,
          taxId: users.taxId,
        },
      })
      .from(payrolls)
      .leftJoin(users, eq(payrolls.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(payrolls.month));

      return results.map(r => ({
        ...r.payroll,
        user: r.user,
      }));
    }),
});
