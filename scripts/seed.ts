
import * as dotenv from "dotenv";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
dotenv.config({ path: ".env" });

async function main() {
  const { db } = await import("../lib/db");
  const { users, organizations, organizationMembers, departments } = await import("../lib/db/schema");

  const passwordHash = await hash("123456", 10);
  let orgId = "org_" + nanoid();
  const existingOrg = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.slug, "vaivamm-capital"),
  });

  if (existingOrg) {
      orgId = existingOrg.id;
  } else {
      await db.insert(organizations).values({
        id: orgId,
        name: "Vaivamm Capital",
        slug: "vaivamm-capital",
      });
  }
  const userList = [
    { email: "ceo@vaivamm.com", name: "CEO Vaivamm", role: "OWNER" as const },
    { email: "hr@vaivamm.com", name: "HR Manager", role: "ADMIN" as const },
    { email: "emp@vaivamm.com", name: "Employee One", role: "MEMBER" as const },
  ];

  for (const u of userList) {
    let userId;
    const existingUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, u.email),
    });

    if (existingUser) {
        userId = existingUser.id;
    } else {
        userId = "user_" + nanoid();
        await db.insert(users).values({
          id: userId,
          email: u.email,
          name: u.name,
          password: passwordHash,
          role: u.role,
          image: `${process.env.NEXT_PUBLIC_AVATAR_SERVICE_URL || "https://api.dicebear.com/7.x/avataaars/svg"}?seed=${u.email}`,
        });
    }
    await db.insert(organizationMembers).values({
      userId: userId,
      orgId: orgId,
      role: u.role,
    }).onConflictDoNothing();
  }
  const departmentList = [
    "Engineering",
    "Product",
    "Design",
    "Marketing",
    "Sales",
    "HR / People",
    "Finance",
    "Operations",
    "Customer Support",
  ];

  for (const deptName of departmentList) {
    await db.insert(departments).values({
      orgId: orgId,
      name: deptName,
    }).onConflictDoNothing(); 
  }

  process.exit(0);
}

main().catch((err) => {
  process.exit(1);
});
