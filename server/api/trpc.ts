import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "../../lib/auth";
import { db } from "../../lib/db";
import { organizationMembers } from "../../lib/db/schema";
import { eq } from "drizzle-orm";
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return {
    db,
    session,
    ...opts,
  };
};
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;
const enforceSession = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: {
        ...ctx.session,
        userId: ctx.session.user.id,
        user: ctx.session.user,
      },
    },
  });
});

/**
 * Reusable middleware that enforces users are logged in and in at least one org.
 * Gets the user's organization and adds orgId to the session context.
 */
const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const userMemberships = await ctx.db.query.organizationMembers.findMany({
    where: eq(organizationMembers.userId, ctx.session.user.id),
    limit: 1,
  });

  const orgId = userMemberships[0]?.orgId;

  if (!orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of any organization.",
    });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        userId: ctx.session.user.id,
        user: ctx.session.user,
        orgId,
      },
    },
  });
});

/** Procedure that only requires a valid session (e.g. for getOrganizations). */
export const sessionProcedure = t.procedure.use(enforceSession);
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
