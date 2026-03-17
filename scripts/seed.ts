
import * as dotenv from "dotenv";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
dotenv.config({ path: ".env" });

async function main() {
  const { db } = await import("../lib/db");
  const { users, organizations, organizationMembers, departments, roles } = await import("../lib/db/schema");
  const { ROLE_DEFAULT_PERMISSIONS } = await import("../lib/rbac/permissions");
  const { eq } = await import("drizzle-orm");

  // Admin password: Tarun@1234
  const passwordHash = await hash("Tarun@1234", 10);
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

  // Hardcoded admin (CEO) — email already verified
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const existingAdmin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, adminEmail),
  });

  let adminUserId: string;
  if (existingAdmin) {
    adminUserId = existingAdmin.id;
    // Ensure CEO role, active, and dashboard access
    await db.update(users).set({ role: "CEO", isActive: true, hasDashboardAccess: true }).where(eq(users.id, adminUserId));
  } else {
    adminUserId = "user_" + nanoid();
    await db.insert(users).values({
      id: adminUserId,
      email: adminEmail,
      name: "Tarun Chintakunta",
      firstName: "Tarun",
      lastName: "Chintakunta",
      password: passwordHash,
      role: "CEO",
      emailVerified: new Date(),
      isActive: true,
      hasDashboardAccess: true,
      isPasswordChangeRequired: false,
      image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminEmail}`,
    });
  }

  await db.insert(organizationMembers).values({
    userId: adminUserId,
    orgId: orgId,
    role: "CEO",
  }).onConflictDoNothing();

  // ─── Departments ───
  const departmentList = [
    "Engineering",
    "Design",
    "Marketing",
    "Sales",
    "Finance",
    "Operations",
    "Customer Support",
    "Administration",
  ];

  for (const deptName of departmentList) {
    await db.insert(departments).values({
      orgId: orgId,
      name: deptName,
    }).onConflictDoNothing();
  }

  // ─── System Roles (exactly 7) ───
  const systemRoles = [
    { name: "CEO", slug: "CEO" },
    { name: "HR", slug: "HR" },
    { name: "Sales", slug: "SALES" },
    { name: "Customer Support", slug: "CUSTOMER_SUPPORT" },
    { name: "Engineering", slug: "ENGINEERING" },
    { name: "Design", slug: "DESIGN" },
    { name: "Video Editor", slug: "VIDEO_EDITOR" },
    { name: "Digital Marketing", slug: "DIGITAL_MARKETING" },
  ];

  for (const role of systemRoles) {
    await db.insert(roles).values({
      name: role.name,
      slug: role.slug,
      orgId: orgId,
      isSystem: true,
      permissions: ROLE_DEFAULT_PERMISSIONS[role.slug] || [],
    }).onConflictDoNothing();
  }

  console.log("Seed complete!");
  console.log(`  Organization: Vaivamm Capital (${orgId})`);
  console.log(`  Admin: ${adminEmail} (CEO) — email verified, dashboard access ON`);
  console.log(`  Departments: ${departmentList.length} created`);
  console.log(`  Roles: ${systemRoles.length} system roles created`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
