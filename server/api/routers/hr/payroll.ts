import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { isAdminOrOwner } from "../../../../lib/auth-helpers";
import { logger } from "../../../../lib/logger";
import {
  payrolls,
  salaryStructures,
  organizationMembers,
  users,
  attendance,
} from "../../../../lib/db/schema";
import { eq, and, desc, inArray, sql, gte, lte } from "drizzle-orm";
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
      if (ctx.session.user.role !== "CEO" && ctx.session.user.role !== "HR") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can generate payroll" });
      }
      const memberships = await ctx.db.query.organizationMembers.findMany({
        where: eq(organizationMembers.orgId, ctx.session.orgId),
      });

      const memberUserIds = memberships.map((m) => m.userId).filter(Boolean) as string[];
      if (memberUserIds.length === 0) return;

      const [allSalaryStructures, existingPayrolls] = await Promise.all([
        ctx.db.query.salaryStructures.findMany({
          where: and(
            inArray(salaryStructures.userId, memberUserIds),
            eq(salaryStructures.orgId, ctx.session.orgId),
            eq(salaryStructures.isActive, true)
          ),
        }),
        ctx.db.query.payrolls.findMany({
          where: and(
            inArray(payrolls.userId, memberUserIds),
            eq(payrolls.month, input.month),
            eq(payrolls.orgId, ctx.session.orgId)
          ),
        }),
      ]);

      const salaryMap = new Map(allSalaryStructures.map((s) => [s.userId, s]));
      const existingPayrollUserIds = new Set(existingPayrolls.map((p) => p.userId));

      // Calculate working days in the payroll month
      const [yearStr, monthStr] = input.month.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const daysInMonth = new Date(year, month, 0).getDate();
      // Count weekdays (Mon-Fri) in the month as total business days
      let totalBusinessDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(year, month - 1, d).getDay();
        if (day !== 0 && day !== 6) totalBusinessDays++;
      }
      // Fallback to 22 if calculation yields something unexpected
      if (totalBusinessDays <= 0) totalBusinessDays = 22;

      // Fetch attendance records for all employees in this payroll month
      const monthStart = `${input.month}-01`;
      const monthEnd = `${input.month}-${String(daysInMonth).padStart(2, "0")}`;

      let attendanceMap = new Map<string, number>();
      try {
        const attendanceRecords = await ctx.db
          .select({
            userId: attendance.userId,
            daysPresent: sql<number>`count(*)`.as("days_present"),
          })
          .from(attendance)
          .where(
            and(
              eq(attendance.orgId, ctx.session.orgId),
              inArray(attendance.userId, memberUserIds),
              gte(attendance.date, monthStart),
              lte(attendance.date, monthEnd),
              sql`${attendance.status} IN ('PRESENT', 'HALF_DAY', 'LATE')`
            )
          )
          .groupBy(attendance.userId);

        for (const rec of attendanceRecords) {
          attendanceMap.set(rec.userId, Number(rec.daysPresent));
        }
      } catch (err) {
        logger.warn("Failed to fetch attendance data for payroll; proceeding without LOP", {
          error: err instanceof Error ? err.message : "Unknown",
          month: input.month,
        });
        // attendanceMap stays empty — no LOP will be applied
      }

      const newPayrolls = memberUserIds
        .filter((uId) => !existingPayrollUserIds.has(uId))
        .map((uId) => {
          const salaryStructure = salaryMap.get(uId);
          const basic = salaryStructure ? parseFloat(salaryStructure.basicSalary) : 50000;
          const hraPercentage = salaryStructure ? parseFloat(salaryStructure.hraPercentage || "40") : 40;
          const hra = basic * (hraPercentage / 100);
          const allowances = salaryStructure ? parseFloat(salaryStructure.allowances || "0") : 5000;
          let deductions = salaryStructure ? parseFloat(salaryStructure.deductions || "0") : 2000;
          const gross = basic + hra + allowances;

          // Calculate LOP from attendance data
          let lopDeduction = 0;
          const daysAttended = attendanceMap.get(uId);
          if (daysAttended !== undefined && daysAttended < totalBusinessDays) {
            const dailySalary = gross / totalBusinessDays;
            const absentDays = totalBusinessDays - daysAttended;
            lopDeduction = Math.round(dailySalary * absentDays * 100) / 100;
          }

          const totalDeductions = deductions + lopDeduction;
          const net = gross - totalDeductions;

          return {
            orgId: ctx.session.orgId,
            userId: uId,
            month: input.month,
            basicSalary: basic.toString(),
            hra: hra.toString(),
            allowances: allowances.toString(),
            deductions: totalDeductions.toString(),
            grossSalary: gross.toString(),
            netSalary: net.toString(),
            status: "DRAFT" as const,
            generatedBy: ctx.session.userId,
          };
        });

      if (newPayrolls.length > 0) {
        await ctx.db.insert(payrolls).values(newPayrolls);
      }
    }),

  getSalaryStructures: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = isAdminOrOwner(ctx.session.user.role);
      if (input.userId && input.userId !== ctx.session.userId && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }
      const conditions = [eq(salaryStructures.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(salaryStructures.userId, input.userId));
      } else if (!isAdmin) {
        conditions.push(eq(salaryStructures.userId, ctx.session.userId));
      }
      return await ctx.db.query.salaryStructures.findMany({
        where: and(...conditions),
        orderBy: [desc(salaryStructures.effectiveFrom)],
      });
    }),

  createSalaryStructure: protectedProcedure
    .input(createSalaryStructureInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "CEO" && ctx.session.user.role !== "HR") {
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
      if (ctx.session.user.role !== "CEO" && ctx.session.user.role !== "HR") {
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
          ).catch((err) => logger.warn("Failed to send payslip email", { error: err instanceof Error ? err.message : "Unknown" }));
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
        ).catch((err) => logger.warn("Failed to send payslip email", { error: err instanceof Error ? err.message : "Unknown" }));
      }

      return payroll;
    }),

  getEmployeePayslips: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId || ctx.session.userId;

      if (targetUserId !== ctx.session.userId &&
          ctx.session.user.role !== "CEO" &&
          ctx.session.user.role !== "HR") {
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
      if (ctx.session.user.role !== "CEO" && ctx.session.user.role !== "HR") {
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
      if (ctx.session.user.role !== "CEO" && ctx.session.user.role !== "HR") {
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
      if (ctx.session.user.role !== "CEO" && ctx.session.user.role !== "HR") {
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
