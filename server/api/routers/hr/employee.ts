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
  roles,
  // notifications,
} from "../../../../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { format } from "date-fns";
import { formatDateOnly, getTodayString } from "../../../../lib/date-utils";
import { TRPCError } from "@trpc/server";
import {
  createDepartmentInputSchema,
  updateProfileInputSchema,
  changePasswordInputSchema,
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
    return members
      .map((m) => m.user)
      .filter((u) => u.isActive !== false)
      .map(({ password, bankDetails, taxId, ...safe }) => safe);
  }),

  createDepartment: protectedProcedure
    .input(createDepartmentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrOwner(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Admins and Owners can create departments.",
        });
      }
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
      if (input.name !== undefined) updateData.name = input.name;
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

  changePassword: protectedProcedure
    .input(changePasswordInputSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
      });

      if (!user?.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No password set for this account.",
        });
      }

      const isValid = await bcrypt.compare(input.currentPassword, user.password);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect.",
        });
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 12);
      await ctx.db
        .update(users)
        .set({ password: hashedPassword, isPasswordChangeRequired: false })
        .where(eq(users.id, ctx.session.userId));

      return { success: true };
    }),

  getNotificationPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
        columns: { metadata: true },
      });
      const meta = (user?.metadata as Record<string, unknown>) || {};
      return {
        emailNotifications: meta.emailNotifications !== false,
        leaveReminders: meta.leaveReminders !== false,
        projectUpdates: meta.projectUpdates !== false,
      };
    }),

  updateNotificationPreferences: protectedProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      leaveReminders: z.boolean().optional(),
      projectUpdates: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
        columns: { metadata: true },
      });
      const meta = (user?.metadata as Record<string, unknown>) || {};
      const updated = { ...meta, ...input };
      await ctx.db
        .update(users)
        .set({ metadata: updated })
        .where(eq(users.id, ctx.session.userId));
      return { success: true };
    }),

  onboardEmployee: protectedProcedure
    .input(onboardEmployeeInputSchema)
    .mutation(async ({ ctx, input }) => {
       const { user } = ctx.session;
       if (user.role !== "CEO" && user.role !== "ADMIN") {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Only Admins and Owners can onboard new employees.",
         });
       }

       // Validate that the role exists in the roles table for this org
       const roleRecord = await ctx.db.query.roles.findFirst({
         where: and(
           eq(roles.slug, input.role),
           eq(roles.orgId, ctx.session.orgId)
         ),
       });
       if (!roleRecord) {
         throw new TRPCError({
           code: "BAD_REQUEST",
           message: `Role "${input.role}" does not exist in your organization. Please select a valid role.`,
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

       try {
       const userId = crypto.randomUUID();

       function generateCompliantPassword(): string {
         const lower = "abcdefghijklmnopqrstuvwxyz";
         const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
         const digits = "0123456789";
         const special = "@$!%*?&";
         const all = lower + upper + digits + special;
         const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
         const required = [pick(lower), pick(upper), pick(digits), pick(special)];
         for (let i = 0; i < 12; i++) required.push(pick(all));
         return required.sort(() => Math.random() - 0.5).join("");
       }

       const rawPassword = input.password || generateCompliantPassword();
       const hashedPassword = await bcrypt.hash(rawPassword, 12);

       let finalDepartmentId = input.departmentId;
       if (input.departmentId && input.departmentId < 0) {
          const commonRoleNames: Record<number, string> = {
            [-1]: "Administration",
            [-2]: "Sales",
            [-3]: "Customer Support",
            [-4]: "Engineering",
            [-5]: "Design",
            [-6]: "Marketing",
            [-7]: "Finance",
            [-8]: "Operations",
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
       const finalEmployeeId = input.employeeId?.trim() || generatedEmployeeId;

       const newUser = await ctx.db.transaction(async (tx) => {
         const [createdUser] = await tx.insert(users).values({
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
            employeeId: finalEmployeeId,
            password: hashedPassword,
            isPasswordChangeRequired: true,
            image: `${process.env.NEXT_PUBLIC_AVATAR_SERVICE_URL || "https://api.dicebear.com/7.x/avataaars/svg"}?seed=${input.firstName}`,
            createdAt: new Date(),
            updatedAt: new Date(),
         }).returning();

         await tx.insert(organizationMembers).values({
            userId: createdUser.id,
            orgId: ctx.session.orgId,
            role: input.role,
            joinedAt: new Date(),
         });

         const monthlySalary = input.monthlySalary || 0;
         const basicSalary = monthlySalary * 0.5;
         const hra = monthlySalary * 0.25;
         const specialAllowance = monthlySalary * 0.25;

         await tx.insert(salaryStructures).values({
            orgId: ctx.session.orgId,
            userId: createdUser.id,
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

           await tx.insert(payrolls).values({
             orgId: ctx.session.orgId,
             userId: createdUser.id,
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
         await tx.insert(onboardingSteps).values(
           defaultSteps.map((step) => ({
             orgId: ctx.session.orgId,
             userId: createdUser.id,
             stepName: step,
             status: "PENDING" as const,
           }))
         );

         return createdUser;
       });

       await initializeLeaveBalances(
         ctx.session.orgId,
         newUser.id,
         input.joiningDate,
       );

       try {
         await sendWelcomeEmail(
            input.email,
            input.firstName,
            rawPassword
         );
       } catch (error) {
         logger.error("Failed to send welcome email", { email: input.email, error });
       }

       return { id: newUser.id, email: newUser.email, name: newUser.name, employeeId: newUser.employeeId };

       } catch (error) {
         if (error instanceof TRPCError) throw error;
         logger.error("Failed to onboard employee", { email: input.email, error });
         throw new TRPCError({
           code: "INTERNAL_SERVER_ERROR",
           message: "Failed to create employee. Please check the details and try again.",
         });
       }
    }),

  deleteEmployee: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
       const { user } = ctx.session;
       if (user.role !== "CEO" && user.role !== "ADMIN") {
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
       if (user.role === "ADMIN" && (targetUser.role === "ADMIN" || targetUser.role === "CEO")) {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Admins can only delete Member accounts.",
         });
       }
       if (user.role === "CEO" && targetUser.role === "CEO") {
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
