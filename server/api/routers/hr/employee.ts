import { z } from "zod";
import { logger } from "../../../../lib/logger";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { isAdminOrOwner } from "../../../../lib/auth-helpers";
import {
  departments,
  users,
  organizationMembers,
  salaryStructures,
  payrolls,
  onboardingSteps,
  notifications,
} from "../../../../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { format } from "date-fns";
import { formatDateOnly, getTodayString } from "../../../../lib/date-utils";
import { TRPCError } from "@trpc/server";
import {
  createDepartmentInputSchema,
  updateProfileInputSchema,
  onboardEmployeeInputSchema,
} from "../../../../lib/validations/hr";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "../../../../lib/email";
import { initializeLeaveBalances } from "../../../actions/leave-actions";

export const employeeRouter = createTRPCRouter({
  getDepartments: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.departments.findMany({
      where: eq(departments.orgId, ctx.session.orgId),
    });
  }),

  getEmployees: protectedProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, ctx.session.orgId),
      with: {
        user: true,
      },
    });
    return members.map((m) => m.user).filter((u) => u.isActive !== false);
  }),

  createDepartment: protectedProcedure
    .input(createDepartmentInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(departments).values({
        name: input.name,
        orgId: ctx.session.orgId,
      });
    }),

  updateProfile: protectedProcedure
    .input(updateProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const targetMember = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, input.userId),
          eq(organizationMembers.orgId, ctx.session.orgId)
        ),
      });
      if (!targetMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User not found in your organization.",
        });
      }
      const isSelf = ctx.session.userId === input.userId;
      const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);
      if (!isSelf && !isOwnerOrAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own profile.",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (input.designation !== undefined) updateData.designation = input.designation;
      if (input.departmentId !== undefined) updateData.departmentId = input.departmentId;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.image !== undefined) updateData.image = input.image;

      if (Object.keys(updateData).length > 0) {
        await ctx.db
          .update(users)
          .set(updateData)
          .where(eq(users.id, input.userId));
      }

      return { success: true };
    }),

  onboardEmployee: protectedProcedure
    .input(onboardEmployeeInputSchema)
    .mutation(async ({ ctx, input }) => {
       const { user } = ctx.session;
       if (user.role !== "OWNER" && user.role !== "ADMIN") {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Only Admins and Owners can onboard new employees.",
         });
       }

       const existingUser = await ctx.db.query.users.findFirst({
         where: eq(users.email, input.email)
       });

       if (existingUser) {
          throw new TRPCError({
             code: "CONFLICT",
             message: "User with this email already exists."
          });
       }

       const userId = crypto.randomUUID();

       const rawPassword = input.password || crypto.randomUUID().slice(0, 16);
       const hashedPassword = await bcrypt.hash(rawPassword, 10);

       let finalDepartmentId = input.departmentId;
       if (input.departmentId && input.departmentId < 0) {
          const commonRoleNames: Record<number, string> = {
            [-1]: "Admin",
            [-2]: "HR",
            [-3]: "Sales",
            [-4]: "Customer Support",
            [-5]: "Graphic Designer",
            [-6]: "Digital Marketing",
            [-7]: "Social Media Manager",
            [-8]: "Engineering",
            [-9]: "Product",
            [-10]: "Design",
            [-11]: "Marketing",
            [-12]: "Finance",
            [-13]: "Operations",
          };

          const roleName = commonRoleNames[input.departmentId];
          if (roleName) {
            let existingDept = await ctx.db.query.departments.findFirst({
              where: and(
                eq(departments.name, roleName),
                eq(departments.orgId, ctx.session.orgId)
              ),
            });

            if (!existingDept) {
              const [newDept] = await ctx.db.insert(departments).values({
                name: roleName,
                orgId: ctx.session.orgId,
              }).returning();
              existingDept = newDept;
            }

            finalDepartmentId = existingDept.id;
          }
       }

       const employeeIdPrefix = "VC";
       const yearSuffix = new Date().getFullYear().toString().slice(-2);
       const maxIdResult = await ctx.db.select({
         maxId: sql<string>`COALESCE(MAX(${users.employeeId}), '')`
       }).from(users).where(eq(users.isActive, true));
       const lastId = maxIdResult[0]?.maxId || "";
       const lastNum = parseInt(lastId.replace(/\D/g, "").slice(-3)) || 0;
       const empNumber = lastNum + 1;
       const generatedEmployeeId = `${employeeIdPrefix}${yearSuffix}${empNumber.toString().padStart(3, "0")}`;

       const [newUser] = await ctx.db.insert(users).values({
          id: userId,
          email: input.email,
          name: `${input.firstName} ${input.lastName}`,
          firstName: input.firstName,
          lastName: input.lastName,
          gender: input.gender,
          phone: input.phone,
          whatsappNumber: input.whatsappSameAsPhone ? input.phone : input.whatsappNumber,
          whatsappSameAsPhone: input.whatsappSameAsPhone,
          role: input.role,
          designation: input.designation,
          departmentId: finalDepartmentId,
          joiningDate: formatDateOnly(input.joiningDate),
          experienceYears: input.experienceYears?.toString(),
          skills: input.skills ? input.skills.split(",").map(s => s.trim()) : [],
          taxId: input.taxId,
          bankDetails: input.bankDetails,
          monthlySalary: input.monthlySalary?.toString(),
          employeeId: generatedEmployeeId,
          password: hashedPassword,
          isPasswordChangeRequired: true,
          image: `${process.env.NEXT_PUBLIC_AVATAR_SERVICE_URL || "https://api.dicebear.com/7.x/avataaars/svg"}?seed=${input.firstName}`,
          createdAt: new Date(),
          updatedAt: new Date(),
       }).returning();

       try {
         await sendWelcomeEmail(
            input.email,
            input.firstName,
            rawPassword
         );
       } catch (error) {
         logger.error("Failed to send welcome email", { email: input.email, error });
       }

       await ctx.db.insert(organizationMembers).values({
          userId: newUser.id,
          orgId: ctx.session.orgId,
          role: input.role,
          joinedAt: new Date(),
       });

       const monthlySalary = input.monthlySalary || 0;
       const basicSalary = monthlySalary * 0.5;
       const hra = monthlySalary * 0.25;
       const specialAllowance = monthlySalary * 0.25;

        await ctx.db.insert(salaryStructures).values({
            orgId: ctx.session.orgId,
            userId: newUser.id,
            basicSalary: basicSalary.toString(),
            hraPercentage: "50",
            allowances: specialAllowance.toString(),
            deductions: "200",
            effectiveFrom: getTodayString(),
            isActive: true,
        });

       if (monthlySalary > 0) {
         const currentMonth = format(new Date(), "yyyy-MM");
         const grossSalary = basicSalary + hra + specialAllowance;
         const netSalary = grossSalary - 200;

         await ctx.db.insert(payrolls).values({
           orgId: ctx.session.orgId,
           userId: newUser.id,
           month: currentMonth,
           basicSalary: basicSalary.toString(),
           hra: hra.toString(),
           allowances: specialAllowance.toString(),
           deductions: "200",
           grossSalary: grossSalary.toString(),
           netSalary: netSalary.toString(),
           status: "DRAFT",
           generatedBy: ctx.session.userId,
         });
       }

       const defaultSteps = ["Profile Setup", "Document Submission", "IT Setup", "Introduction"];
       for (const step of defaultSteps) {
           await ctx.db.insert(onboardingSteps).values({
               orgId: ctx.session.orgId,
               userId: newUser.id,
               stepName: step,
               status: "PENDING",
           });
       }
       await initializeLeaveBalances(
         ctx.session.orgId,
         newUser.id,
         input.joiningDate,
       );

       const admins = await ctx.db.query.organizationMembers.findMany({
          where: and(
             eq(organizationMembers.orgId, ctx.session.orgId),

          ),
          with: {
             user: true
          }
       });


       const recipientIds = admins
          .filter(m => (m.role === "ADMIN" || m.role === "OWNER") && m.userId !== user.id)
          .map(m => m.userId);

        for (const recipientId of recipientIds) {

           await ctx.db.insert(notifications).values({
              orgId: ctx.session.orgId,
              userId: recipientId,
              type: "INFO",
              title: "New Employee Onboarded",
              message: `${input.firstName} ${input.lastName} has joined as ${input.designation}.`,
              link: "/hr/employees",
              isRead: false,
           });
        }

       return newUser;
    }),

  deleteEmployee: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
       const { user } = ctx.session;
       if (user.role !== "OWNER" && user.role !== "ADMIN") {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Only Admins and Owners can delete employees.",
         });
       }
       if (input.userId === user.id) {
         throw new TRPCError({
           code: "BAD_REQUEST",
           message: "You cannot delete your own account.",
         });
       }
       const targetMember = await ctx.db.query.organizationMembers.findFirst({
         where: and(
           eq(organizationMembers.userId, input.userId),
           eq(organizationMembers.orgId, ctx.session.orgId)
         ),
       });

       if (!targetMember) {
         throw new TRPCError({
           code: "NOT_FOUND",
           message: "Employee not found in your organization.",
         });
       }

       const targetUser = await ctx.db.query.users.findFirst({
         where: eq(users.id, input.userId),
       });

       if (!targetUser) {
         throw new TRPCError({
           code: "NOT_FOUND",
           message: "User not found.",
         });
       }
       if (user.role === "ADMIN" && (targetUser.role === "ADMIN" || targetUser.role === "OWNER")) {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Admins can only delete Member accounts.",
         });
       }
       if (user.role === "OWNER" && targetUser.role === "OWNER") {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Cannot delete another Owner account.",
         });
       }

       await ctx.db
         .update(users)
         .set({ isActive: false })
         .where(eq(users.id, input.userId));

       return { success: true, message: "Employee deactivated successfully." };
    }),
});
