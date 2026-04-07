import { withAuth, ok, err } from "@/lib/api/helpers";
import { getWfhRequests } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { wfhRequests } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getWfhRequests(session.orgId, session.user.id);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await req.json() as {
      date: string;
      reason?: string;
      approverId: string;
    };

    if (!body.date || !body.approverId) {
      return err("date and approverId are required.", 400);
    }

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
