import { withAuth, ok } from "@/lib/api/helpers";
import { getEmployees, getEmployeesPaginated } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search") ?? undefined;

    if (page || limit || search) {
      const data = await getEmployeesPaginated(
        session.orgId,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20,
        search
      );
      return ok(data);
    }

    const data = await getEmployees(session.orgId);
    return ok(data);
  });
}
