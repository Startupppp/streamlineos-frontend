import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        dateOfBirth: users.dateOfBirth,
        joiningDate: users.joiningDate,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(eq(organizationMembers.orgId, session.orgId), eq(users.isActive, true)));

    const birthdays: typeof members = [];
    const anniversaries: (typeof members[0] & { years: number })[] = [];
    const upcomingBirthdays: typeof members = [];

    for (const m of members) {
      if (m.dateOfBirth) {
        const dob = new Date(m.dateOfBirth);
        const dobMonth = dob.getMonth() + 1;
        const dobDay = dob.getDate();
        if (dobMonth === month && dobDay === day) {
          birthdays.push(m);
        } else if (
          dobMonth === month && dobDay > day && dobDay <= day + 7
        ) {
          upcomingBirthdays.push(m);
        }
      }
      if (m.joiningDate) {
        const jd = new Date(m.joiningDate);
        const jdMonth = jd.getMonth() + 1;
        const jdDay = jd.getDate();
        if (jdMonth === month && jdDay === day) {
          const years = now.getFullYear() - jd.getFullYear();
          if (years > 0) {
            anniversaries.push({ ...m, years });
          }
        }
      }
    }

    return ok({
      todayBirthdays: birthdays,
      upcomingBirthdays,
      todayAnniversaries: anniversaries,
    });
  });
}
