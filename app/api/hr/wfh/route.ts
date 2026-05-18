import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getWfhRequests } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { wfhRequests, users } from "@/lib/db/schema";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { sendWfhRequestEmail } from "@/lib/email/hr-leaves";
import { createNotification } from "@/server/actions/create-notification";
import { logger } from "@/lib/logger";

const createWfhSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD."),
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

    if (body.date < getTodayString()) {
      return err("Cannot submit a WFH request for a past date.", 400);
    }

    const approverMember = await db.query.users.findFirst({
      where: eq(users.id, body.approverId),
      columns: { id: true },
    });
    if (!approverMember) {
      return err("Approver not found.", 400);
    }

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

    const [approver, requester] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, body.approverId),
        columns: { email: true, name: true, firstName: true, lastName: true },
      }),
      db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { name: true, firstName: true, lastName: true },
      }),
    ]);

    const employeeName =
      requester?.name ||
      `${requester?.firstName ?? ""} ${requester?.lastName ?? ""}`.trim() ||
      session.user.name ||
      "An employee";

    const dateLabel = formatDateOnly(body.date);

    if (approver?.email) {
      const approverName =
        approver.name ||
        `${approver.firstName ?? ""} ${approver.lastName ?? ""}`.trim() ||
        "Approver";
      void sendWfhRequestEmail(
        approver.email,
        approverName,
        employeeName,
        dateLabel,
        body.reason ?? ""
      ).catch((e) => {
        logger.error("Failed to send WFH request email", {
          error: e instanceof Error ? e.message : "unknown",
        });
      });
    }

    void createNotification({
      orgId: session.orgId!,
      userId: body.approverId,
      type: "WARNING",
      title: "WFH request pending",
      message: `${employeeName} requested work from home on ${dateLabel}.`,
      link: "/hr/leaves",
      metadata: { kind: "wfh", requestId: request.id },
    }).catch((e) => {
      logger.error("Failed to create WFH notification", {
        error: e instanceof Error ? e.message : "unknown",
      });
    });

    return ok({ success: true });
  });
}
