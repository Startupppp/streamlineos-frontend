import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { disconnectCalendarConnection } from "@/lib/services/hr/calendar";
import { z } from "zod";
import type { NextRequest } from "next/server";

const schema = z.object({
  connectionId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, schema);
    const removed = await disconnectCalendarConnection(session.user.id, body.connectionId);
    if (!removed) return err("Calendar connection not found", 404);
    return ok({ success: true });
  });
}
