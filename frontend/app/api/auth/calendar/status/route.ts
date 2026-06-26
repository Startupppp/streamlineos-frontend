import { withAuth, ok } from "@/lib/api/helpers";
import { getConnectedCalendars } from "@/lib/services/hr/calendar";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const connections = await getConnectedCalendars(session.user.id);
    return ok(connections);
  });
}
