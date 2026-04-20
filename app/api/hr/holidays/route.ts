import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getHolidays } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { holidays, users, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendBulkHolidayAnnouncement } from "@/lib/email";

const postHolidaySchema = z.object({
  name: z.string(),
  date: z.string(),
  message: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const yearParam = req.nextUrl.searchParams.get("year");
    const year = yearParam ? Number(yearParam) : new Date().getFullYear();
    const data = await getHolidays(session.orgId, year);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can add holidays.", 403);
    }

    const body = await parseBody(req, postHolidaySchema);

    const [holiday] = await db
      .insert(holidays)
      .values({
        orgId: session.orgId,
        name: body.name,
        date: formatDateOnly(new Date(body.date)),
        message: body.message,
        isPublic: body.isPublic ?? false,
      })
      .returning();

    void (async () => {
      const members = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(eq(organizationMembers.orgId, session.orgId));

      const emails: string[] = [];
      for (const m of members) {
        const u = await db.query.users.findFirst({
          where: eq(users.id, m.userId),
          columns: { email: true, isActive: true },
        });
        if (u?.email && u.isActive) emails.push(u.email);
      }

      if (emails.length > 0) {
        await sendBulkHolidayAnnouncement(
          emails,
          body.name,
          formatDateOnly(new Date(body.date)),
          body.message
        );
      }
    })().catch(() => {});

    return ok({ success: true });
  });
}
