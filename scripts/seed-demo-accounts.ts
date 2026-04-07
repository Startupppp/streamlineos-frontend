/**
 * Seed demo accounts for every role in the system.
 *
 * Run:  npx tsx scripts/seed-demo-accounts.ts
 *
 * All accounts use the password: Demo@1234
 * Emails follow the pattern: demo.<role>@vaivamm.demo
 */





import { db } from "../lib/db";
import { organizations } from "../lib/db/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const DEMO_PASSWORD = "Demo@1234";

const DEMO_ACCOUNTS = [
  { email: "demo.ceo@vaivamm.demo",             firstName: "Demo", lastName: "CEO",            role: "CEO",              designation: "Chief Executive Officer",       branchScoped: false },
  { email: "demo.hr@vaivamm.demo",              firstName: "Demo", lastName: "HR",             role: "HR",               designation: "HR Manager",                    branchScoped: false },
  { email: "demo.admin@vaivamm.demo",           firstName: "Demo", lastName: "Admin",          role: "ADMIN",            designation: "System Administrator",          branchScoped: false },
  { email: "demo.sales@vaivamm.demo",           firstName: "Demo", lastName: "Sales",          role: "SALES",            designation: "Sales Representative",          branchScoped: false },
  { email: "demo.engineering@vaivamm.demo",     firstName: "Demo", lastName: "Engineer",       role: "ENGINEERING",      designation: "Software Engineer",             branchScoped: false },
  { email: "demo.design@vaivamm.demo",          firstName: "Demo", lastName: "Designer",       role: "DESIGN",           designation: "UI/UX Designer",                branchScoped: false },
  { email: "demo.support@vaivamm.demo",         firstName: "Demo", lastName: "Support",        role: "CUSTOMER_SUPPORT", designation: "Customer Support Executive",     branchScoped: false },
  { email: "demo.videoeditor@vaivamm.demo",     firstName: "Demo", lastName: "VideoEditor",    role: "VIDEO_EDITOR",     designation: "Video Editor",                  branchScoped: false },
  { email: "demo.marketing@vaivamm.demo",       firstName: "Demo", lastName: "Marketing",      role: "DIGITAL_MARKETING",designation: "Digital Marketing Specialist",  branchScoped: false },
  { email: "demo.branchmanager@vaivamm.demo",   firstName: "Demo", lastName: "BranchManager",  role: "BRANCH_MANAGER",   designation: "Branch Manager",                branchScoped: true  },
  { email: "demo.branchhr@vaivamm.demo",        firstName: "Demo", lastName: "BranchHR",       role: "BRANCH_HR",        designation: "Branch HR Executive",           branchScoped: true  },
];

async function main() {
  console.log("🔧 Seeding demo accounts for all roles...\n");

  // ── 1. Find or create org (minimal columns to avoid migration drift) ──
  const orgRows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .limit(1);

  let orgId: string;
  let orgName: string;

  if (orgRows.length === 0) {
    orgId = nanoid();
    await db.execute(
      sql`INSERT INTO organizations (id, name, slug, created_at, updated_at)
          VALUES (${orgId}, ${"Vaivamm Capital"}, ${"vaivamm-capital"}, now(), now())
          ON CONFLICT (slug) DO NOTHING`
    );
    orgName = "Vaivamm Capital";
    console.log("✅ Created organization: Vaivamm Capital");
  } else {
    orgId = orgRows[0].id;
    orgName = orgRows[0].name ?? orgId;
    console.log(`✅ Using existing organization: ${orgName} (${orgId})`);
  }

  // ── 2. Find first branch (for branch-scoped roles) ──
  let firstBranchId: number | null = null;
  try {
    const branch = await db.execute<{ id: number }>(
      sql`SELECT id FROM branches LIMIT 1`
    );
    // postgres-js returns results as a plain array (RowList), not { rows: [] }
    const branchRow = Array.isArray(branch) ? branch[0] : (branch as { rows?: { id: number }[] }).rows?.[0];
    firstBranchId = branchRow?.id ?? null;
    if (firstBranchId) {
      console.log(`✅ Found branch id=${firstBranchId} — assigning to BRANCH_MANAGER & BRANCH_HR`);
    } else {
      console.log("⚠️  No branches — BRANCH_MANAGER & BRANCH_HR will have branchId=null");
    }
  } catch {
    console.log("⚠️  Could not query branches — BRANCH_MANAGER & BRANCH_HR will have branchId=null");
  }

  // ── 3. Hash password once ──
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const today = new Date().toISOString().split("T")[0];

  // ── 4. Upsert all users in a single transaction ──
  const results: { email: string; role: string; status: string }[] = [];

  await db.transaction(async (tx) => {
    for (const account of DEMO_ACCOUNTS) {
      const userId = nanoid();
      const branchId = account.branchScoped ? firstBranchId : null;
      const fullName = `${account.firstName} ${account.lastName}`;

      // Upsert user (ON CONFLICT on email)
      const upsertResult = await tx.execute<{ id: string; xmax: string }>(
        sql`
          INSERT INTO users (
            id, email, password, email_verified, is_active, is_password_change_required,
            login_attempts, first_name, last_name, name, role, designation,
            has_dashboard_access, joining_date, branch_id, created_at, updated_at
          ) VALUES (
            ${userId}, ${account.email}, ${hashedPassword}, now(), true, false,
            0, ${account.firstName}, ${account.lastName}, ${fullName}, ${account.role},
            ${account.designation}, true, ${today}, ${branchId}, now(), now()
          )
          ON CONFLICT (email) DO UPDATE SET
            password                  = EXCLUDED.password,
            email_verified            = now(),
            is_active                 = true,
            is_password_change_required = false,
            login_attempts            = 0,
            locked_until              = null,
            first_name                = EXCLUDED.first_name,
            last_name                 = EXCLUDED.last_name,
            name                      = EXCLUDED.name,
            role                      = EXCLUDED.role,
            designation               = EXCLUDED.designation,
            has_dashboard_access      = true,
            branch_id                 = EXCLUDED.branch_id,
            updated_at                = now()
          RETURNING id, xmax::text
        `
      );

      // postgres-js returns results as RowList (plain array), not { rows: [] }
      const row = Array.isArray(upsertResult) ? upsertResult[0] : (upsertResult as { rows?: { id: string; xmax: string }[] }).rows?.[0];
      const actualUserId: string = (row as { id?: string } | undefined)?.id ?? userId;
      // xmax = 0 means INSERT, non-zero means UPDATE
      const wasInserted = (row as { xmax?: string } | undefined)?.xmax === "0";
      results.push({ email: account.email, role: account.role, status: wasInserted ? "created" : "updated" });

      // Upsert org membership
      await tx.execute(
        sql`
          INSERT INTO organization_members (user_id, org_id, role, joined_at)
          VALUES (${actualUserId}, ${orgId}, ${account.role}, now())
          ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role
        `
      );
    }
  });

  // ── 5. Print results table ──
  console.log("\n┌──────────────────────────────────────────────┬───────────────────┬─────────┐");
  console.log(  "│ Email                                         │ Role              │ Status  │");
  console.log(  "├──────────────────────────────────────────────┼───────────────────┼─────────┤");
  for (const r of results) {
    const email  = r.email.padEnd(45);
    const role   = r.role.padEnd(17);
    const status = r.status.padEnd(7);
    console.log(`│ ${email} │ ${role} │ ${status} │`);
  }
  console.log(  "└──────────────────────────────────────────────┴───────────────────┴─────────┘");
  console.log(`\n🔑 Password for all accounts: ${DEMO_PASSWORD}`);
  console.log(`\n📋 Quick login reference:`);
  for (const r of results) {
    console.log(`   ${r.role.padEnd(18)}  ${r.email}`);
  }
  console.log("\n🎉 Done! All demo accounts are ready.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});


  // ---                                                                                                   Password for all accounts: Demo@1234                                                                
                                                                                                      
  // ┌───────────────────┬─────────────────────────────────┐      
  // │       Role        │              Email              │
  // ├───────────────────┼─────────────────────────────────┤
  // │ CEO               │ demo.ceo@vaivamm.demo           │
  // ├───────────────────┼─────────────────────────────────┤
  // │ HR                │ demo.hr@vaivamm.demo            │
  // ├───────────────────┼─────────────────────────────────┤
  // │ ADMIN             │ demo.admin@vaivamm.demo         │
  // ├───────────────────┼─────────────────────────────────┤
  // │ SALES             │ demo.sales@vaivamm.demo         │
  // ├───────────────────┼─────────────────────────────────┤
  // │ ENGINEERING       │ demo.engineering@vaivamm.demo   │
  // ├───────────────────┼─────────────────────────────────┤
  // │ DESIGN            │ demo.design@vaivamm.demo        │
  // ├───────────────────┼─────────────────────────────────┤
  // │ CUSTOMER_SUPPORT  │ demo.support@vaivamm.demo       │
  // ├───────────────────┼─────────────────────────────────┤
  // │ VIDEO_EDITOR      │ demo.videoeditor@vaivamm.demo   │
  // ├───────────────────┼─────────────────────────────────┤
  // │ DIGITAL_MARKETING │ demo.marketing@vaivamm.demo     │
  // ├───────────────────┼─────────────────────────────────┤
  // │ BRANCH_MANAGER    │ demo.branchmanager@vaivamm.demo │
  // ├───────────────────┼─────────────────────────────────┤
  // │ BRANCH_HR         │ demo.branchhr@vaivamm.demo      │
  // └───────────────────┴─────────────────────────────────┘

  // The BRANCH_MANAGER and BRANCH_HR accounts were assigned to branch id=1. Re-run npx tsx
  // --env-file=.env scripts/seed-demo-accounts.ts anytime to reset all passwords and reactivate
  // accounts.
