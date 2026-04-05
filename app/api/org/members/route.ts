import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const members = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          name: users.name,
          email: users.email,
          image: users.image,
          role: users.role,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, session.orgId),
            eq(users.isActive, true)
          )
        )
        .orderBy(asc(users.firstName));
      return ok(members);
    } catch (error) {
      return err(error instanceof Error ? error.message : "Failed", 500);
    }
  });
}
