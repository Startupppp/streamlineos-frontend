import { type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { withAuth, withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { getDeal } from "@/server/queries/crm";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { invalidateSalesKpiCache } from "@/server/queries/sales-dashboard";
import { invalidateCachePattern, invalidateCache, CACHE_KEYS } from "@/lib/cache";
import { createAuditLog } from "@/lib/audit-log";
import { updateDeal, updateDealSchema } from "@/lib/services/deal-update";

type Ctx = { params: Promise<{ dealId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { dealId: rawDealId } = await ctx.params;
  const dealId = Number(rawDealId);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAuth(async (session) => {
    const deal = await getDeal(session.orgId, dealId);
    if (!deal) return err("Deal not found", 404);
    return ok(deal);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { dealId: rawDealId } = await ctx.params;
  const dealId = Number(rawDealId);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, updateDealSchema);

    const result = await updateDeal(
      session.orgId,
      session.user.id,
      session.user.name ?? "Team Member",
      dealId,
      input,
    );

    if (!result.ok) {
      if (result.reason === "version_conflict") {
        return err("Conflict: deal was updated by another request. Please refresh.", 409);
      }
      return err("Deal not found", 404);
    }

    void invalidateCachePattern(`deals:list:${session.orgId}:*`).catch(() => undefined);
    if (result.stageChanged) {
      void invalidateSalesKpiCache(session.orgId).catch(() => undefined);
    }

    if (input.stage === "WON") {
      void import("@/lib/inngest/dispatch-webhook").then(({ dispatchWebhook }) =>
        dispatchWebhook(session.orgId, "deal.won", {
          id: result.deal.id,
          name: result.deal.name,
          value: result.deal.value,
          assignedToId: result.deal.assignedToId,
        }),
      );
    }

    if (result.stageChanged) {
      void import("@/lib/services/automation/engine").then(({ runAutomationsForEvent }) =>
        runAutomationsForEvent(session.orgId, "deal.stage_changed", {
          id: result.deal.id,
          name: result.deal.name,
          value: result.deal.value,
          stage: result.deal.stage,
          previousStage: result.previousStage,
          assignedToId: result.deal.assignedToId,
        }),
      );
    }

    void createAuditLog({
      action: result.stageChanged ? "deal.stage_changed" : "deal.updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(dealId),
      targetType: "deal",
      metadata: { changedFields: Object.keys(input), newStage: input.stage },
    }).catch(() => {});

    return ok(result.deal);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { dealId: rawDealId } = await ctx.params;
  const dealId = Number(rawDealId);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAbility("delete", "crm:deals", async (session) => {
    await db.delete(deals).where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)));

    void Promise.all([
      invalidateCachePattern(`deals:list:${session.orgId}:*`),
      invalidateCache(CACHE_KEYS.dealsForecast(session.orgId)),
    ]).catch(() => undefined);

    void createAuditLog({
      action: "deal.deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(dealId),
      targetType: "deal",
    }).catch(() => {});

    return ok({ deleted: true });
  });
}
