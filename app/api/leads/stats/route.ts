import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { getLeadStats } from "@/server/queries/leads";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const data = await getLeadStats(session.orgId!, {
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      role: session.user.role ?? undefined,
      userId: session.user.id,
      branch: {
        role: session.user.role ?? "",
        branchId: session.branchId,
        userId: session.user.id,
      },
    });
    return ok(data);
  });
}
