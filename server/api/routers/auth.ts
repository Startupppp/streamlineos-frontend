import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  users,
  organizations,
  organizationMembers,
  invitations,
  passwordResetTokens,
  verificationTokens,
} from "../../../lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../../lib/email";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

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
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ),
});

const acceptInvitationSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const authRouter = createTRPCRouter({
  signUp: publicProcedure
    .input(signUpSchema)
    .mutation(async ({ ctx, input }) => {
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const verificationToken = nanoid(32);
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      const userId = nanoid();
      const fullName =
        input.firstName && input.lastName
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

      const orgName =
        fullName || input.email.split("@")[0] || "My Organization";
      const orgSlugBase = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      let orgSlug = orgSlugBase;
      let slugAttempts = 0;
      let existingOrg = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.slug, orgSlug),
      });

      while (existingOrg && slugAttempts < 10) {
        orgSlug = `${orgSlugBase}-${nanoid(4)}`;
        existingOrg = await ctx.db.query.organizations.findFirst({
          where: eq(organizations.slug, orgSlug),
        });
        slugAttempts++;
      }

      const orgId = nanoid();
      await ctx.db.insert(organizations).values({
        id: orgId,
        name: orgName,
        slug: orgSlug,
      });

      await ctx.db.insert(organizationMembers).values({
        userId,
        orgId,
        role: "OWNER",
      });

      await ctx.db.insert(verificationTokens).values({
        identifier: input.email,
        token: verificationToken,
        expires,
      });

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
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
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

      const hashedPassword = await bcrypt.hash(input.password, 10);

      await ctx.db
        .update(users)
        .set({ password: hashedPassword })
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
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const userId = nanoid();
      const fullName =
        input.firstName && input.lastName
          ? `${input.firstName} ${input.lastName}`
          : input.firstName || input.lastName || null;

      await ctx.db.insert(users).values({
        id: userId,
        email: invitation.email,
        password: hashedPassword,
        name: fullName,
        firstName: input.firstName,
        lastName: input.lastName,
        emailVerified: new Date(),
        role: invitation.role,
      });

      await ctx.db.insert(organizationMembers).values({
        userId,
        orgId: invitation.orgId,
        role: invitation.role,
      });

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
