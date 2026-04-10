import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

function occursInNextSevenDays(dateValue: Date | string | null | undefined, today: Date): boolean {
  if (!dateValue) return false;
  const source = new Date(dateValue);
  if (Number.isNaN(source.getTime())) return false;

  const eventThisYear = new Date(today.getFullYear(), source.getMonth(), source.getDate());
  const eventNextYear = new Date(today.getFullYear() + 1, source.getMonth(), source.getDate());

  const candidate = eventThisYear >= today ? eventThisYear : eventNextYear;
  const diffMs = candidate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

export async function GET() {
  return withAuth(async (session) => {
    // Get birthdays and work anniversaries coming up this week
    const data = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
        dateOfBirth: users.dateOfBirth,
        joiningDate: users.joiningDate,
      })
      .from(users)
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.userId, users.id),
          eq(organizationMembers.orgId, session.orgId)
        )
      )
      .where(
        and(
          eq(users.isActive, true),
          sql`(
            (
              ${users.dateOfBirth} IS NOT NULL
              AND (
                (
                  to_char(CURRENT_DATE, 'MM-DD') <= to_char(CURRENT_DATE + INTERVAL '7 days', 'MM-DD')
                  AND to_char(${users.dateOfBirth}::date, 'MM-DD') BETWEEN to_char(CURRENT_DATE, 'MM-DD') AND to_char(CURRENT_DATE + INTERVAL '7 days', 'MM-DD')
                )
                OR
                (
                  to_char(CURRENT_DATE, 'MM-DD') > to_char(CURRENT_DATE + INTERVAL '7 days', 'MM-DD')
                  AND (
                    to_char(${users.dateOfBirth}::date, 'MM-DD') >= to_char(CURRENT_DATE, 'MM-DD')
                    OR to_char(${users.dateOfBirth}::date, 'MM-DD') <= to_char(CURRENT_DATE + INTERVAL '7 days', 'MM-DD')
                  )
                )
              )
            )
            OR
            (
              ${users.joiningDate} IS NOT NULL
              AND (
                (
                  to_char(CURRENT_DATE, 'MM-DD') <= to_char(CURRENT_DATE + INTERVAL '7 days', 'MM-DD')
                  AND to_char(${users.joiningDate}::date, 'MM-DD') BETWEEN to_char(CURRENT_DATE, 'MM-DD') AND to_char(CURRENT_DATE + INTERVAL '7 days', 'MM-DD')
                )
                OR
                (
                  to_char(CURRENT_DATE, 'MM-DD') > to_char(CURRENT_DATE + INTERVAL '7 days', 'MM-DD')
                  AND (
                    to_char(${users.joiningDate}::date, 'MM-DD') >= to_char(CURRENT_DATE, 'MM-DD')
                    OR to_char(${users.joiningDate}::date, 'MM-DD') <= to_char(CURRENT_DATE + INTERVAL '7 days', 'MM-DD')
                  )
                )
              )
            )
          )`
        )
      );

    const results = data.map((u) => {
      const today = new Date();
      const isBirthday = occursInNextSevenDays(u.dateOfBirth, today);
      const isAnniversary = occursInNextSevenDays(u.joiningDate, today);
      const yearsOfService = u.joiningDate
        ? today.getFullYear() - new Date(u.joiningDate).getFullYear()
        : 0;

      return {
        ...u,
        isBirthday: !!isBirthday,
        isAnniversary: !!isAnniversary,
        yearsOfService,
      };
    });

    return ok(results);
  });
}
