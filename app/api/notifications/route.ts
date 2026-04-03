import { type NextRequest } from "next/server";
import { withAuth, ok, err, toBool, toNumber } from "@/lib/api/helpers";
import { getNotifications } from "@/server/queries/notifications";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const unreadOnly = toBool(params.get("unreadOnly")) ?? false;
      const limit = toNumber(params.get("limit")) ?? 20;

      const data = await getNotifications(
        session.user.id,
        session.orgId,
        unreadOnly,
        limit
      );
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load notifications",
        500
      );
    }
  });
}
