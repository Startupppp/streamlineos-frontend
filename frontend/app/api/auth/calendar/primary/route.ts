import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { setPrimaryCalendar } from "@/lib/services/hr/calendar";
import { z } from "zod";
import type { NextRequest } from "next/server";

const schema = z.object({
  connectionId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, schema);
    const updated = await setPrimaryCalendar(session.user.id, body.connectionId);
    if (!updated) return err("Calendar connection not found", 404);
    return ok({ success: true });
  });
}
