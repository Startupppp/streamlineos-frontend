import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getHolidays } from "@/server/queries/hr";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { holidays, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendBulkHolidayAnnouncement } from "@/lib/email";

const postHolidaySchema = z.object({
  name: z
    .string()
    .min(2, "Holiday name must be at least 2 characters")
    .max(100, "Holiday name must be at most 100 characters")
    .refine((v) => /[a-zA-Z]/.test(v.trim()), "Holiday name must contain at least one letter")
    .refine((v) => !/\s{2,}/.test(v), "Holiday name cannot have consecutive spaces"),
  date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  message: z.string().max(500, "Message too long").optional(),
  isPublic: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const yearParam = req.nextUrl.searchParams.get("year");
    const year = yearParam ? Number(yearParam) : new Date().getFullYear();
    const key = `hr:holidays:${session.orgId}:${year}`;
    const data = await cached(
      key,
      () => getHolidays(session.orgId, year),
      { ttlSeconds: CACHE_TTL.HOUR },
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:attendance")) {
      return err("Only admins can add holidays.", 403);
    }

    const body = await parseBody(req, postHolidaySchema);

    const trimmedName = body.name.trim();
    const duplicate = await db.query.holidays.findFirst({
      where: and(
        eq(holidays.orgId, session.orgId),
        or(
          eq(holidays.date, body.date),
          sql`lower(trim(${holidays.name})) = ${trimmedName.toLowerCase()}`
        )
      ),
      columns: { id: true },
    });
    if (duplicate) return err("A holiday with this name or date already exists.", 409);

    const [holiday] = await db
      .insert(holidays)
      .values({
        orgId: session.orgId,
        name: trimmedName,
        date: formatDateOnly(body.date),
        message: body.message,
        isPublic: body.isPublic ?? false,
      })
      .returning();

    await invalidateCachePattern(`hr:holidays:${session.orgId}:*`);

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

    return ok({ success: true }, 201);
  });
}
