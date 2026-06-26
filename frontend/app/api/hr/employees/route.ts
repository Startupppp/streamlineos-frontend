import { withAbility, ok } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { getEmployees, getEmployeesPaginated } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAbility("read", "hr:employees", async (session) => {
    const { searchParams } = req.nextUrl;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search") ?? searchParams.get("q") ?? undefined;

    const branchCtx = {
      role: session.user.role ?? "",
      branchId: session.branchId,
      userId: session.user.id,
    };

    const branchKey = `${branchCtx.role}:${branchCtx.branchId ?? ""}:${branchCtx.userId}`;

    if (page || limit || search) {
      const pageN = page ? Number(page) : 1;
      const limitN = limit ? Number(limit) : 20;
      const key = `hr:employees:paginated:${session.orgId}:${branchKey}:${pageN}:${limitN}:${search ?? ""}`;
      const data = await cached(
        key,
        () => getEmployeesPaginated(session.orgId, pageN, limitN, search, branchCtx),
        { ttlSeconds: CACHE_TTL.SHORT },
      );
      return ok(data);
    }

    const key = `hr:employees:all:${session.orgId}:${branchKey}`;
    const data = await cached(
      key,
      () => getEmployees(session.orgId, branchCtx),
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );
    return ok(data);
  });
}
