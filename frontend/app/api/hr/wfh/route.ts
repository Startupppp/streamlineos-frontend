import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getWfhRequests } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { wfhRequests } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

const createWfhSchema = z.object({
  date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine((v) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(`${v}T00:00:00`);
      return selected >= today;
    }, "WFH date cannot be in the past"),
  reason: z.string().optional(),
  approverId: z.string().min(1, "Approver is required"),
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
        date: formatDateOnly(body.date),
        reason: body.reason,
        approverId: body.approverId,
        status: "PENDING",
      })
      .returning();

    return ok({ success: true }, 201);
  });
}
