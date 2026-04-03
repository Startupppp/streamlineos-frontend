import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { getLeadAnalytics } from "@/server/queries/leads";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const data = await getLeadAnalytics(session.orgId!, {
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });
    return ok(data);
  });
}
