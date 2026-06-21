import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance, organizationMembers, users, departments } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { getTodayString } from "@/lib/date-utils";

export async function GET() {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can("manage", "hr:attendance")) {
      return err("Only admins can view team attendance.", 403);
    }

    const today = getTodayString();

    const members = await db
      .select({
        userId: organizationMembers.userId,
        userName: users.name,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userImage: users.image,
        isActive: users.isActive,
        departmentId: users.departmentId,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.orgId, session.orgId));

    const activeMembers = members.filter((m) => m.isActive !== false);

    const deptIds = [...new Set(activeMembers.map((m) => m.departmentId).filter(Boolean))] as number[];
    const deptMap = new Map<number, string>();
    if (deptIds.length > 0) {
      const deptRows = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(inArray(departments.id, deptIds));
      for (const d of deptRows) deptMap.set(d.id, d.name);
    }

    const userIds = activeMembers.map((m) => m.userId);
    const todayLogs =
      userIds.length > 0
        ? await db.query.attendance.findMany({
            where: and(
              eq(attendance.orgId, session.orgId),
              eq(attendance.date, today),
              inArray(attendance.userId, userIds)
            ),
          })
        : [];

    const logsByUser = new Map<string, (typeof todayLogs)[number]>();
    for (const log of todayLogs) {
      const existing = logsByUser.get(log.userId);
      if (!existing || (log.createdAt && existing.createdAt && log.createdAt > existing.createdAt)) {
        logsByUser.set(log.userId, log);
      }
    }

    const result = activeMembers.map((m) => {
      const log = logsByUser.get(m.userId);
      let status: "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT" = "OFFLINE";
      if (log) {
        if (log.checkOut) status = "CHECKED_OUT";
        else if (log.status === "ON_BREAK") status = "ON_BREAK";
        else status = "PRESENT";
      }

      const name =
        m.userName ||
        [m.userFirstName, m.userLastName].filter(Boolean).join(" ") ||
        m.userEmail;

      return {
        userId: m.userId,
        name,
        email: m.userEmail,
        image: m.userImage,
        department: m.departmentId ? (deptMap.get(m.departmentId) ?? null) : null,
        status,
        checkIn: log?.checkIn ?? null,
        checkOut: log?.checkOut ?? null,
        workHours: log?.workHours ?? null,
      };
    });

    result.sort((a, b) => {
      const order = { PRESENT: 0, ON_BREAK: 1, CHECKED_OUT: 2, OFFLINE: 3 };
      return order[a.status] - order[b.status];
    });

    return ok(result);
  });
}
