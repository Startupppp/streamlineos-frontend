import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { userCalendarConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const schema = z.object({
  provider: z.enum(["GOOGLE", "MICROSOFT"]),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, schema);
    await db
      .delete(userCalendarConnections)
      .where(
        and(
          eq(userCalendarConnections.userId, session.user.id),
          eq(userCalendarConnections.provider, body.provider)
        )
      );
    return ok({ success: true });
  });
}
