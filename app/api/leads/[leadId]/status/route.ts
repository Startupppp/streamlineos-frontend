import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { invalidateCachePattern } from "@/lib/cache";
import { createAuditLog } from "@/lib/audit-log";
import {
  transitionLeadStatus,
  transitionLeadStatusSchema,
} from "@/lib/services/lead-status";

type Ctx = { params: Promise<{ leadId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { leadId: rawLeadId } = await ctx.params;
  const leadId = Number(rawLeadId);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, transitionLeadStatusSchema);

    const result = await transitionLeadStatus(session.orgId, session.user.id, leadId, input);
    if (!result.ok) {
      if (result.reason === "already_converted") {
        return err("Lead has already been converted", 409);
      }
      return err(
        "Lead status has been updated by someone else, or lead not found. Please refresh.",
        409,
      );
    }

    await invalidateCachePattern(`leads:*:${session.orgId}:*`);

    void createAuditLog({
      action: "lead.status_changed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(leadId),
      targetType: "lead",
      metadata: { newStatus: input.status, lostReason: input.lostReason },
    }).catch(() => {});

    return ok(result.lead);
  });
}
