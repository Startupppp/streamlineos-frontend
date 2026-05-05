import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { holidayWorkRequests, holidays } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import { z } from "zod";
import type { NextRequest } from "next/server";

const submitSchema = z.object({
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).optional(),
  compensationPreference: z.enum(["EXTRA_PAY", "COMP_OFF"]),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const userId = req.nextUrl.searchParams.get("userId");
    const status = req.nextUrl.searchParams.get("status");

    const whereUser = isAdmin && userId
      ? eq(holidayWorkRequests.userId, userId)
      : !isAdmin
      ? eq(holidayWorkRequests.userId, session.user.id)
      : undefined;

    const whereStatus = status ? eq(holidayWorkRequests.status, status) : undefined;
    const whereOrg = eq(holidayWorkRequests.orgId, session.orgId);

    const conditions = [whereOrg, whereUser, whereStatus].filter(Boolean) as Parameters<typeof and>;
    const rows = await db.query.holidayWorkRequests.findMany({
      where: and(...conditions),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        approver: { columns: { id: true, name: true } },
        holiday: { columns: { id: true, name: true, date: true, type: true } },
      },
      orderBy: [desc(holidayWorkRequests.createdAt)],
    });

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, submitSchema);

    const requestDate = new Date(body.requestDate + "T00:00:00");
    const dayOfWeek = requestDate.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    const holiday = await db.query.holidays.findFirst({
      where: and(
        eq(holidays.orgId, session.orgId),
        eq(holidays.date, body.requestDate)
      ),
      columns: { id: true, name: true },
    });

    if (!holiday && !isSunday && !isSaturday) {
      return err("The selected date is not a Saturday, Sunday, or holiday.", 400);
    }

    const type = holiday ? "HOLIDAY" : isSunday ? "SUNDAY" : "SATURDAY";

    const existing = await db.query.holidayWorkRequests.findFirst({
      where: and(
        eq(holidayWorkRequests.orgId, session.orgId),
        eq(holidayWorkRequests.userId, session.user.id),
        eq(holidayWorkRequests.requestDate, body.requestDate)
      ),
      columns: { id: true, status: true },
    });
    if (existing) {
      return err(`A request for ${body.requestDate} already exists (status: ${existing.status}).`, 409);
    }

    const [request] = await db.insert(holidayWorkRequests).values({
      orgId: session.orgId,
      userId: session.user.id,
      requestDate: body.requestDate,
      type,
      holidayId: holiday?.id ?? null,
      reason: body.reason ?? null,
      compensationPreference: body.compensationPreference,
      status: "PENDING",
    }).returning();

    void notifyByRoles(session.orgId, [ROLES.CEO, ROLES.HR], {
      title: "Holiday work request submitted",
      message: `${session.user.name ?? session.user.email} requested to work on ${
        type === "HOLIDAY" ? `holiday (${holiday?.name})` : type === "SUNDAY" ? "Sunday" : "Saturday"
      } on ${body.requestDate}. Preference: ${body.compensationPreference.replace("_", " ")}.`,
      link: "/hr/attendance",
      metadata: { requestId: request.id, userId: session.user.id },
    }).catch(() => {});

    return ok(request);
  });
}
