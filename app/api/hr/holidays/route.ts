import { withAuth, ok, err } from "@/lib/api/helpers";
import { getHolidays } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

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

    const body = await req.json() as {
      name: string;
      date: string;
      message?: string;
    };

    if (!body.name || !body.date) {
      return err("name and date are required.", 400);
    }

    const [holiday] = await db
      .insert(holidays)
      .values({
        orgId: session.orgId,
        name: body.name,
        date: formatDateOnly(new Date(body.date)),
        message: body.message,
      })
      .returning();

    return ok({ success: true });
  });
}
