import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { users, organizations, organizationMembers, invitations, passwordResetTokens, verificationTokens } from "../../../lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../../lib/email";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
});

const acceptInvitationSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const authRouter = createTRPCRouter({
  signUp: publicProcedure
    .input(signUpSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Generate verification token
      const verificationToken = nanoid(32);
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // 24 hours

      // Create user
      const userId = nanoid();
      const fullName = input.firstName && input.lastName
        ? `${input.firstName} ${input.lastName}`
        : input.firstName || input.lastName || null;
      
      await ctx.db.insert(users).values({
        id: userId,
        email: input.email,
        password: hashedPassword,
        name: fullName,
        firstName: input.firstName,
        lastName: input.lastName,
        emailVerified: null,
      });

      // Store verification token
      await ctx.db.insert(verificationTokens).values({
        identifier: input.email,
        token: verificationToken,
        expires,
      });

      // Send verification email
      await sendVerificationEmail(input.email, verificationToken);

      return { success: true, userId };
    }),

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

      // Update user email verification status
      await ctx.db
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.email, tokenRecord.identifier));

      // Delete verification token
      await ctx.db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, input.token));

      return { success: true };
    }),

  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
        // Don't reveal if user exists
        return { success: true };
      }

      // Generate reset token
      const resetToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

      // Store reset token
      await ctx.db.insert(passwordResetTokens).values({
        id: nanoid(),
        email: input.email,
        token: resetToken,
        expiresAt,
      });

      // Send reset email
      await sendPasswordResetEmail(input.email, resetToken);

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

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Update user password
      await ctx.db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, tokenRecord.email));

      // Delete reset token
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

      // Check if user already exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, invitation.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create user
      const userId = nanoid();
      const fullName = input.firstName && input.lastName
        ? `${input.firstName} ${input.lastName}`
        : input.firstName || input.lastName || null;
      
      await ctx.db.insert(users).values({
        id: userId,
        email: invitation.email,
        password: hashedPassword,
        name: fullName,
        firstName: input.firstName,
        lastName: input.lastName,
        emailVerified: new Date(), // Auto-verify for invited users
        role: invitation.role,
      });

      // Add user to organization
      await ctx.db.insert(organizationMembers).values({
        userId,
        orgId: invitation.orgId,
        role: invitation.role,
      });

      // Mark invitation as accepted
      await ctx.db
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invitation.id));

      return { success: true, userId };
    }),

  resendVerificationEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.emailVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email already verified",
        });
      }

      // Generate new verification token
      const verificationToken = nanoid(32);
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      // Delete old tokens
      await ctx.db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, input.email));

      // Store new token
      await ctx.db.insert(verificationTokens).values({
        identifier: input.email,
        token: verificationToken,
        expires,
      });

      // Send verification email
      await sendVerificationEmail(input.email, verificationToken);

      return { success: true };
    }),
});

