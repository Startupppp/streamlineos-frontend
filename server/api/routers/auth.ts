import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  users,
  organizationMembers,
  invitations,
  passwordResetTokens,
  verificationTokens,
} from "@/lib/db/schema";
import { eq, and, gt, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

const verifyEmailSchema = z.object({
  token: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8)
    .max(15, "Password must be at most 15 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ),
});

const acceptInvitationSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8)
    .max(15, "Password must be at most 15 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const authRouter = createTRPCRouter({
  verifyEmail: publicProcedure
    .input(verifyEmailSchema)
    .mutation(async ({ ctx, input }) => {
      const tokenRecord = await ctx.db.query.verificationTokens.findFirst({
        where: and(
          eq(verificationTokens.token, input.token),
          gt(verificationTokens.expires, new Date())
        ),
      });

      if (!tokenRecord) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification token",
        });
      }

      await ctx.db
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.email, tokenRecord.identifier));

      await ctx.db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, input.token));

      return { success: true };
    }),

  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const normalizedEmail = input.email.toLowerCase().trim();
      const user = await ctx.db.query.users.findFirst({
        where: sql`lower(${users.email}) = ${normalizedEmail}`,
      });

      // Always perform similar work to prevent timing oracle (account enumeration)
      if (!user) {
        // Simulate similar latency to the real path
        await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
        return { success: true };
      }

      const resetToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await ctx.db.insert(passwordResetTokens).values({
        id: nanoid(),
        email: input.email,
        token: resetToken,
        expiresAt,
      });

      // Fire-and-forget to not block response
      sendPasswordResetEmail(input.email, resetToken).catch(() => {});

      return { success: true };
    }),

  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const tokenRecord = await ctx.db.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.token, input.token),
          gt(passwordResetTokens.expiresAt, new Date())
        ),
      });

      if (!tokenRecord) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      await ctx.db
        .update(users)
        .set({
          password: hashedPassword,
          isPasswordChangeRequired: false,
        })
        .where(eq(users.email, tokenRecord.email));

      await ctx.db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.token, input.token));

      return { success: true };
    }),

  acceptInvitation: publicProcedure
    .input(acceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.query.invitations.findFirst({
        where: and(
          eq(invitations.token, input.token),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.acceptedAt)
        ),
      });

      if (!invitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired invitation",
        });
      }

      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, invitation.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired invitation",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const userId = nanoid();
      const fullName =
        input.firstName && input.lastName
          ? `${input.firstName} ${input.lastName}`
          : input.firstName || input.lastName || null;

      await ctx.db.transaction(async (tx) => {
        await tx.insert(users).values({
          id: userId,
          email: invitation.email,
          password: hashedPassword,
          name: fullName,
          firstName: input.firstName,
          lastName: input.lastName,
          emailVerified: new Date(),
          role: invitation.role,
        });

        await tx.insert(organizationMembers).values({
          userId,
          orgId: invitation.orgId,
          role: invitation.role,
        });

        await tx
          .update(invitations)
          .set({ acceptedAt: new Date() })
          .where(eq(invitations.id, invitation.id));
      });

      return { success: true, userId };
    }),

  resendVerificationEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user || user.emailVerified) {
        return { success: true };
      }

      const verificationToken = nanoid(32);
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      await ctx.db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, input.email));

      await ctx.db.insert(verificationTokens).values({
        identifier: input.email,
        token: verificationToken,
        expires,
      });

      await sendVerificationEmail(input.email, verificationToken);

      return { success: true };
    }),
});
