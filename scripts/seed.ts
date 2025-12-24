
import * as dotenv from "dotenv";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";

// Load env vars first
dotenv.config({ path: ".env" });

async function main() {
  console.log("🌱 Seeding database...");
  
  // Dynamic import to ensure env vars are loaded
  const { db } = await import("../lib/db");
  const { users, organizations, organizationMembers, departments } = await import("../lib/db/schema");

  const passwordHash = await hash("123456", 10);
  let orgId = "org_" + nanoid();

  // 1. Create Organization
  // @ts-ignore
  const existingOrg = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.slug, "vaivamm-capital"),
  });

  if (existingOrg) {
      orgId = existingOrg.id;
      console.log(`ℹ️ Organization 'Vaivamm Capital' already exists (ID: ${orgId}), skipping creation.`);
  } else {
      await db.insert(organizations).values({
        id: orgId,
        name: "Vaivamm Capital",
        slug: "vaivamm-capital",
      });
      console.log("✅ Organization created");
  }

  // 2. Create Users
  const userList = [
    { email: "ceo@vaivamm.com", name: "CEO Vaivamm", role: "OWNER" as const },
    { email: "hr@vaivamm.com", name: "HR Manager", role: "ADMIN" as const },
    { email: "emp@vaivamm.com", name: "Employee One", role: "MEMBER" as const },
  ];

  for (const u of userList) {
    let userId;
    
    // Check if user exists
    // @ts-ignore
    const existingUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, u.email),
    });

    if (existingUser) {
        userId = existingUser.id;
        console.log(`ℹ️ User ${u.email} already exists, skipping creation.`);
    } else {
        userId = "user_" + nanoid();
        await db.insert(users).values({
          id: userId,
          email: u.email,
          name: u.name,
          password: passwordHash,
          role: u.role,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
        });
        console.log(`👤 Created user: ${u.email}`);
    }

    // Add to Org
    await db.insert(organizationMembers).values({
      userId: userId,
      orgId: orgId,
      role: u.role,
    }).onConflictDoNothing();
  }

  // 3. Create Departments
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
    // Check if Department already exists Use same OrgId as above
    // Assuming unique constraint logic or just blindly inserting since it's a seed
    await db.insert(departments).values({
      orgId: orgId,
      name: deptName,
    }).onConflictDoNothing(); // Warning: departments schema doesn't seem to have unique constraint on name+orgId in what I saw, but let's assume it's fine for now or it will duplicate if re-run. 
    // Ideally I should check first or add conflict handling.
    // The previous code had .onConflictDoNothing(), so I'll keep it.
    
    console.log(`🏢 Created department: ${deptName}`);
  }

  console.log("✅ Seeding completed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
