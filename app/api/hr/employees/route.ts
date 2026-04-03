import { withAuth, ok } from "@/lib/api/helpers";
import { getEmployees, getEmployeesPaginated } from "@/server/queries/hr";
import type { NextRequest } from "next/server";
import type { Employee, PaginatedEmployees } from "@/types/hr";

export async function GET(req: NextRequest) {
  return withAuth<PaginatedEmployees | Employee[]>(async (session) => {
    const { searchParams } = req.nextUrl;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search") ?? undefined;

    const branchCtx = {
      role: session.user.role ?? "",
      branchId: session.branchId,
      userId: session.user.id,
    };

    if (page || limit || search) {
      const data = await getEmployeesPaginated(
        session.orgId,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20,
        search,
        branchCtx
      );
      return ok(data);
    }

    const data = await getEmployees(session.orgId, branchCtx);
    return ok(data);
  });
}
