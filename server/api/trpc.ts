import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "../../lib/db";

// 1. CONTEXT
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return {
    db,
    session,
    ...opts,
  };
};

// 2. INITIALIZATION
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

// 3. ROUTER & PROCEDURE
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

/**
 * Reusable middleware that enforces users are logged in and have an Org ID.
 * Also syncs the user to the local database to ensure Foreign Key constraints are met.
 */
import { currentUser } from "@clerk/nextjs/server";
import { users } from "../../lib/db/schema";

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.userId || !ctx.session.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Sync User to DB
  try {
    const user = await currentUser();
    if (user) {
      const email =
        user.emailAddresses[0]?.emailAddress || "no-email@example.com";
      await ctx.db
        .insert(users)
        .values({
          id: user.id,
          email: email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: "MEMBER", // Default
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: email,
            firstName: user.firstName,
            lastName: user.lastName,
            updatedAt: new Date(),
          },
        });
    }
  } catch (e) {
    console.error("Failed to sync user to DB:", e);
    // Continue anyway, maybe the user exists or it's a transient error
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: ctx.session.userId,
        orgId: ctx.session.orgId,
      },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
