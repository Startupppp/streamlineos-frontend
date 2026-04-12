import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getWfhRequests } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { wfhRequests } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

const createWfhSchema = z.object({
  date: z.string(),
  reason: z.string().optional(),
  approverId: z.string(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await getWfhRequests(session.orgId, session.user.id);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createWfhSchema);

    const [request] = await db
      .insert(wfhRequests)
      .values({
        orgId: session.orgId,
        userId: session.user.id,
        date: formatDateOnly(new Date(body.date)),
        reason: body.reason,
        approverId: body.approverId,
        status: "PENDING",
      })
      .returning();

    return ok({ success: true });
  });
}
