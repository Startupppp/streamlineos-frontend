import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery, parseBody, err } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getTargets } from "@/server/queries/crm";
import { db } from "@/lib/db";
import { targets, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createNotification } from "@/server/actions/create-notification";
import { createAuditLog } from "@/lib/audit-log";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { z } from "zod";

const listSchema = z.object({
  userId: z.string().optional(),
  period: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const createSchema = z.object({
  userId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  metricType: z.string(),
  targetValue: z.string(),
  period: z.string().default("daily"),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().optional(),
  branchId: z.number().optional(),
  parentTargetId: z.number().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, listSchema);
    const orgId = session.orgId!;
    const key = `targets:list:${orgId}:${filters.userId ?? ""}:${filters.period ?? ""}:${filters.limit ?? ""}:${filters.offset ?? ""}`;
    const data = await cached(
      key,
      () => getTargets(orgId, filters),
      { ttlSeconds: CACHE_TTL.SHORT },
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);
    const role = session.user.role ?? "";
    const orgId = session.orgId!;
    const callerId = session.user.id;

    const resolvedUserIds = input.userIds?.length
      ? input.userIds
      : input.userId
        ? [input.userId]
        : [];

    if (resolvedUserIds.length === 0) {
      return err("At least one user is required", 400);
    }

    if (!ADMIN_ROLES.includes(role) && role !== "BRANCH_MANAGER") {
      const targetUsers = await db
        .select({ id: users.id, reportingTo: users.reportingTo })
        .from(users)
        .where(inArray(users.id, resolvedUserIds));
      const allManaged = targetUsers.every((u) => u.reportingTo === callerId);
      if (!allManaged) {
        return err("You can only set targets for your direct reports", 403);
      }
    }

    const created = await db.insert(targets).values(
      resolvedUserIds.map((uid) => ({
        orgId,
        userId: uid,
        metricType: input.metricType,
        targetValue: input.targetValue,
        period: input.period,
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes ?? null,
        setById: callerId,
        branchId: input.branchId,
        parentTargetId: input.parentTargetId,
      }))
    ).returning();

    const metricLabel = input.metricType.replace(/_/g, " ");
    for (const uid of resolvedUserIds) {
      if (uid === callerId) continue;
      await createNotification({
        orgId,
        userId: uid,
        type: "INFO",
        title: "New target assigned",
        message: `You have a new ${input.period} target: ${input.targetValue} ${metricLabel}`,
        link: "/crm/targets",
      });
    }

    for (const t of created) {
      await createAuditLog({
        action: "target.created",
        userId: callerId,
        orgId,
        targetId: String(t.id),
        targetType: "target",
        metadata: {
          assignedTo: t.userId,
          metricType: input.metricType,
          targetValue: input.targetValue,
          period: input.period,
        },
      });
    }

    await invalidateCachePattern(`targets:list:${orgId}:*`);

    return ok(created, 201);
  });
}
