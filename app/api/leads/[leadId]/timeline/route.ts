import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getLeadTimeline } from "@/server/queries/leads";

type Ctx = { params: Promise<{ leadId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
    const timeline = await getLeadTimeline(session.orgId!, leadId, limit);
    return ok(timeline);
  });
}
