/**
 * GET /api/chat/presence/online  — list users online in the org (last 60 s)
 */

import { withAuth, ok } from "@/lib/api/helpers";
import { getOnlineUsers } from "@/server/queries/chat";

export async function GET() {
  return withAuth(async (session) => {
    const online = await getOnlineUsers(session.orgId);
    return ok(online);
  });
}
