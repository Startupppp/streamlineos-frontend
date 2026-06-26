import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { oneOnOneMeetings } from "@/lib/db/schema";
import { eq, and, desc, gte, or } from "drizzle-orm";
import { createOneOnOneSchema } from "@/lib/validation/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const upcoming = req.nextUrl.searchParams.get("upcoming");

    const conditions = [
      eq(oneOnOneMeetings.orgId, session.orgId),
      or(
        eq(oneOnOneMeetings.managerId, session.user.id),
        eq(oneOnOneMeetings.employeeId, session.user.id)
      ),
    ];

    if (upcoming === "true") {
      conditions.push(gte(oneOnOneMeetings.scheduledAt, new Date()));
    }

    const data = await db.query.oneOnOneMeetings.findMany({
      where: and(...conditions),
      with: { manager: true, employee: true },
      orderBy: [desc(oneOnOneMeetings.scheduledAt)],
    });
    return ok(
      data.map((m) => ({
        ...m,
        scheduledAt: m.scheduledAt instanceof Date ? m.scheduledAt.toISOString() : m.scheduledAt,
      }))
    );
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createOneOnOneSchema);

    const scheduledTime = new Date(body.scheduledAt);
    const duplicate = await db.query.oneOnOneMeetings.findFirst({
      where: and(
        eq(oneOnOneMeetings.orgId, session.orgId),
        eq(oneOnOneMeetings.employeeId, body.employeeId),
        eq(oneOnOneMeetings.scheduledAt, scheduledTime),
      ),
      columns: { id: true },
    });
    if (duplicate) {
      return err("A 1-on-1 is already scheduled with this employee at this time.", 409);
    }

    const [meeting] = await db
      .insert(oneOnOneMeetings)
      .values({
        orgId: session.orgId,
        managerId: session.user.id,
        employeeId: body.employeeId,
        scheduledAt: scheduledTime,
        duration: body.duration ?? 30,
        agenda: body.agenda,
        meetingLink: body.meetingLink || undefined,
        status: "SCHEDULED",
      })
      .returning();

    return ok(meeting, 201);
  });
}
