import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import "@/lib/env";
import { ensureOrgMembership, isAdminOrOwner } from "@/lib/auth-helpers";

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
export const mergeRouters = t.mergeRouters;

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

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Check user is active in the database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, ctx.session.user.id),
    columns: { isActive: true },
  });

  if (!dbUser?.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account has been deactivated. Please contact your administrator.",
    });
  }

  // Auto-add to single org if not already a member
  const membership = await ensureOrgMembership(
    ctx.session.user.id,
    ctx.session.user.role
  );

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No organization found. Please contact your administrator.",
    });
  }

  // Validate explicit orgId header if provided
  const headerOrgId = ctx.headers.get("x-org-id");
  if (headerOrgId && headerOrgId !== membership.orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization mismatch. You do not have access to this organization.",
    });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        userId: ctx.session.user.id,
        user: ctx.session.user,
        orgId: membership.orgId,
      },
    },
  });
});

/** Role-gated middleware: restricts access to specific roles */
const requireRoles = (...allowedRoles: string[]) =>
  t.middleware(async ({ ctx, next }) => {
    const userRole = ctx.session?.user?.role;
    if (!userRole || (!allowedRoles.includes(userRole) && userRole !== "CEO")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      });
    }
    return next();
  });

export const sessionProcedure = t.procedure.use(enforceSession);
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

/** Admin-only procedure: CEO or HR role required */
export const adminProcedure = protectedProcedure.use(
  requireRoles("CEO", "HR")
);

/** Manager procedure: CEO or HR */
export const managerProcedure = protectedProcedure.use(
  requireRoles("CEO", "HR")
);
