
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { db } from "../lib/db";
import { users, organizations, organizationMembers } from "../lib/db/schema";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";


async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await hash("123456", 10);
  const orgId = "org_" + nanoid();

  // 1. Create Organization
  await db.insert(organizations).values({
    id: orgId,
    name: "Vaivamm Capital",
    slug: "vaivamm-capital",
  }).onConflictDoNothing();

  console.log("✅ Organization created");

  // 2. Create Users
  const userList = [
    { email: "ceo@vaivamm.com", name: "CEO Vaivamm", role: "OWNER" as const },
    { email: "hr@vaivamm.com", name: "HR Manager", role: "ADMIN" as const }, // Mapping HR to Admin for now, or Member with specific permissions
    { email: "emp@vaivamm.com", name: "Employee One", role: "MEMBER" as const },
  ];

  for (const u of userList) {
    const userId = "user_" + nanoid();
    
    // Create User
    await db.insert(users).values({
      id: userId,
      email: u.email,
      name: u.name,
      password: passwordHash,
      role: u.role,
      image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
    }).onConflictDoNothing();

    // Add to Org
    await db.insert(organizationMembers).values({
      userId: userId,
      orgId: orgId,
      role: u.role,
    }).onConflictDoNothing();
    
    console.log(`👤 Created user: ${u.email}`);
  }

  console.log("✅ Seeding completed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
