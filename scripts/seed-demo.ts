import * as dotenv from "dotenv";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { addDays, subDays, formatISO } from "date-fns";

import {
  DEMO_ORG_SLUG,
  DEMO_ORG_NAME,
  DEMO_OWNER_EMAIL,
  DEMO_OWNER_PASSWORD,
  DEMO_TEAM,
  DEMO_LEADS,
  DEMO_DEALS,
  DEMO_EXPENSES,
  DEMO_TICKETS,
  DEMO_CANDIDATES,
} from "./seed-demo-data";

dotenv.config({ path: ".env" });

async function main() {
  console.log("[seed-demo] Loading modules…");
  const { db } = await import("../lib/db");
  const schema = await import("../lib/db/schema");
  const { subscriptions } = await import("../lib/db/schema/shared");
  const { DEFAULT_ORG_ROLES } = await import("../lib/rbac/default-org-roles");
  const { eq, and } = await import("drizzle-orm");

  const {
    organizations,
    organizationMembers,
    users,
    roles,
    leaveTypes,
    leaveBalances,
    leaveRequests,
    attendance,
    leads,
    deals,
    projects,
    tickets,
    candidates,
    departments,
    departmentMembers,
    expenseCategories,
    expenses,
  } = schema;

  console.log("[seed-demo] Looking up existing demo org…");
  const demoOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, DEMO_ORG_SLUG),
  });

  let orgId: string;
  let isFreshOrg = false;
  if (demoOrg) {
    orgId = demoOrg.id;
    console.log(`[seed-demo] Reusing existing demo org: ${orgId}`);
  } else {
    orgId = randomUUID();
    await db.insert(organizations).values({
      id: orgId,
      name: DEMO_ORG_NAME,
      slug: DEMO_ORG_SLUG,
      timezone: "Asia/Kolkata",
      currency: "INR",
    });
    isFreshOrg = true;
    console.log(`[seed-demo] Created demo org: ${orgId}`);
  }

  console.log("[seed-demo] Upserting demo OWNER user…");
  const passwordHash = await hash(DEMO_OWNER_PASSWORD, 12);
  const ownerUser = await db.query.users.findFirst({
    where: eq(users.email, DEMO_OWNER_EMAIL),
  });
  let ownerId: string;
  if (ownerUser) {
    ownerId = ownerUser.id;
    await db.update(users).set({
      role: "OWNER",
      password: passwordHash,
      isActive: true,
      hasDashboardAccess: true,
      isPasswordChangeRequired: false,
      emailVerified: new Date(),
      firstName: "Demo",
      lastName: "Owner",
      name: "Demo Owner",
      designation: "Owner",
    }).where(eq(users.id, ownerId));
  } else {
    ownerId = randomUUID();
    await db.insert(users).values({
      id: ownerId,
      email: DEMO_OWNER_EMAIL,
      name: "Demo Owner",
      firstName: "Demo",
      lastName: "Owner",
      password: passwordHash,
      role: "OWNER",
      designation: "Owner",
      isActive: true,
      hasDashboardAccess: true,
      isPasswordChangeRequired: false,
      emailVerified: new Date(),
    });
  }

  await db.insert(organizationMembers).values({
    userId: ownerId,
    orgId,
    role: "owner",
    isOwner: true,
  }).onConflictDoNothing();

  if (isFreshOrg) {
    console.log("[seed-demo] Creating subscription…");
    await db.insert(subscriptions).values({
      orgId,
      plan: "PROFESSIONAL",
      status: "TRIAL",
      trialEndsAt: addDays(new Date(), 30),
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 30),
    });
  }

  console.log("[seed-demo] Seeding default org roles…");
  for (const role of DEFAULT_ORG_ROLES) {
    const existing = await db.query.roles.findFirst({
      where: and(eq(roles.slug, role.slug), eq(roles.orgId, orgId)),
    });
    if (!existing) {
      await db.insert(roles).values({
        name: role.name,
        slug: role.slug,
        orgId,
        isSystem: false,
        permissions: role.permissions,
      });
    }
  }

  console.log("[seed-demo] Seeding demo team users…");
  const teamUserIds: Record<string, string> = {};
  const teamPasswordHash = await hash("DemoTeam@2026!", 12);
  for (const member of DEMO_TEAM) {
    const u = await db.query.users.findFirst({ where: eq(users.email, member.email) });
    let uid: string;
    if (u) {
      uid = u.id;
      await db.update(users).set({
        role: member.role,
        designation: member.designation,
        isActive: true,
        hasDashboardAccess: true,
        emailVerified: new Date(),
      }).where(eq(users.id, uid));
    } else {
      uid = randomUUID();
      await db.insert(users).values({
        id: uid,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        name: `${member.firstName} ${member.lastName}`,
        password: teamPasswordHash,
        role: member.role,
        designation: member.designation,
        isActive: true,
        hasDashboardAccess: true,
        emailVerified: new Date(),
        isPasswordChangeRequired: false,
      });
    }
    await db.insert(organizationMembers).values({
      userId: uid,
      orgId,
      role: member.role,
    }).onConflictDoNothing();
    teamUserIds[member.role] = uid;
  }

  const hrId    = teamUserIds.HR_MANAGER;
  const pmId    = teamUserIds.PROJECT_MANAGER;
  const salesId = teamUserIds.SALES_REP;
  const engId   = teamUserIds.MEMBER;

  console.log("[seed-demo] Seeding departments…");
  const DEPARTMENT_NAMES = ["Engineering", "Sales", "Human Resources", "Design"] as const;
  const departmentIds: Record<string, number> = {};
  for (const name of DEPARTMENT_NAMES) {
    let dept = await db.query.departments.findFirst({
      where: and(eq(departments.orgId, orgId), eq(departments.name, name)),
    });
    if (!dept) {
      const [row] = await db.insert(departments).values({
        orgId,
        name,
        managerId: name === "Sales" ? salesId : name === "Human Resources" ? hrId : pmId,
      }).returning();
      dept = row;
    }
    departmentIds[name] = dept.id;
  }

  const departmentAssignments: Array<[string, string]> = [
    [pmId,    "Engineering"],
    [engId,   "Engineering"],
    [salesId, "Sales"],
    [hrId,    "Human Resources"],
    [teamUserIds.MEMBER, "Design"],
  ];
  for (const [uid, deptName] of departmentAssignments) {
    if (!uid || !departmentIds[deptName]) continue;
    await db.insert(departmentMembers).values({
      departmentId: departmentIds[deptName],
      userId: uid,
      role: "member",
    }).onConflictDoNothing();
  }

  console.log("[seed-demo] Seeding HR data (leave types, balances, recent leave & attendance)…");
  let casualLeaveType = await db.query.leaveTypes.findFirst({
    where: and(eq(leaveTypes.orgId, orgId), eq(leaveTypes.name, "Casual Leave")),
  });
  if (!casualLeaveType) {
    const [row] = await db.insert(leaveTypes).values({ orgId, name: "Casual Leave", daysPerYear: 12, carryForward: false }).returning();
    casualLeaveType = row;
  }
  let sickLeaveType = await db.query.leaveTypes.findFirst({
    where: and(eq(leaveTypes.orgId, orgId), eq(leaveTypes.name, "Sick Leave")),
  });
  if (!sickLeaveType) {
    const [row] = await db.insert(leaveTypes).values({ orgId, name: "Sick Leave", daysPerYear: 10, carryForward: false }).returning();
    sickLeaveType = row;
  }

  const currentYear = new Date().getFullYear();
  for (const uid of Object.values(teamUserIds)) {
    await db.insert(leaveBalances).values([
      { orgId, userId: uid, leaveTypeId: casualLeaveType.id, balance: "9", year: currentYear },
      { orgId, userId: uid, leaveTypeId: sickLeaveType.id,   balance: "7", year: currentYear },
    ]).onConflictDoNothing();
  }

  const existingLeave = await db.query.leaveRequests.findFirst({
    where: and(eq(leaveRequests.orgId, orgId), eq(leaveRequests.userId, engId)),
  });
  if (!existingLeave) {
    await db.insert(leaveRequests).values([
      {
        orgId, userId: engId, leaveTypeId: casualLeaveType.id,
        startDate: formatISO(addDays(new Date(), 5), { representation: "date" }),
        endDate:   formatISO(addDays(new Date(), 6), { representation: "date" }),
        reason: "Family wedding",
        status: "PENDING",
        approverId: hrId,
      },
      {
        orgId, userId: salesId, leaveTypeId: sickLeaveType.id,
        startDate: formatISO(subDays(new Date(), 3), { representation: "date" }),
        endDate:   formatISO(subDays(new Date(), 3), { representation: "date" }),
        reason: "Flu",
        status: "APPROVED",
        approverId: hrId,
      },
    ]);
  }

  const existingAttendance = await db.query.attendance.findFirst({
    where: eq(attendance.orgId, orgId),
  });
  if (!existingAttendance) {
    const attendanceRows: Array<typeof attendance.$inferInsert> = [];
    for (const uid of Object.values(teamUserIds)) {
      for (let i = 1; i <= 7; i++) {
        const day = subDays(new Date(), i);
        const checkIn  = new Date(day); checkIn.setHours(9, 30, 0, 0);
        const checkOut = new Date(day); checkOut.setHours(18, 45, 0, 0);
        attendanceRows.push({
          orgId, userId: uid,
          date: formatISO(day, { representation: "date" }),
          checkIn, checkOut,
          status: "PRESENT",
          workHours: "9.25",
        });
      }
    }
    await db.insert(attendance).values(attendanceRows);
  }

  console.log("[seed-demo] Seeding CRM leads and deals…");
  const existingLead = await db.query.leads.findFirst({ where: eq(leads.orgId, orgId) });
  let firstLeadId: number | null = null;
  if (!existingLead) {
    const rows = await db.insert(leads).values(
      DEMO_LEADS.map((l) => ({
        orgId,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        designation: l.designation,
        status: l.status as never,
        priority: l.priority as never,
        source: l.source as never,
        potentialValue: String(l.potential),
        assignedToId: salesId,
        assignedById: ownerId,
        assignedAt: new Date(),
      })),
    ).returning({ id: leads.id });
    firstLeadId = rows[0]?.id ?? null;
  } else {
    firstLeadId = existingLead.id;
  }

  for (let i = 0; i < DEMO_DEALS.length; i++) {
    const d = DEMO_DEALS[i];
    const existing = await db.query.deals.findFirst({
      where: and(eq(deals.orgId, orgId), eq(deals.name, d.name)),
    });
    if (existing) continue;
    const wonOrLost = d.stage === "WON" || d.stage === "LOST";
    await db.insert(deals).values({
      orgId,
      name: d.name,
      value: String(d.value),
      stage: d.stage as never,
      probability: d.probability,
      assignedToId: salesId,
      leadId: i === 0 ? firstLeadId ?? undefined : undefined,
      expectedCloseDate: formatISO(addDays(new Date(), wonOrLost ? -10 : 30 + i * 15), { representation: "date" }),
      actualCloseDate: wonOrLost ? formatISO(subDays(new Date(), 5 + i), { representation: "date" }) : undefined,
      lostReason: d.stage === "LOST" ? "Budget constraints — re-engaging Q3" : undefined,
    });
  }

  console.log("[seed-demo] Seeding expense categories + sample expenses…");
  const EXPENSE_CATEGORY_SEED = ["Travel", "Software", "Meals", "Equipment"];
  const expenseCategoryIds: Record<string, number> = {};
  for (const name of EXPENSE_CATEGORY_SEED) {
    let cat = await db.query.expenseCategories.findFirst({
      where: and(eq(expenseCategories.orgId, orgId), eq(expenseCategories.name, name)),
    });
    if (!cat) {
      const [row] = await db.insert(expenseCategories).values({
        orgId, name, isActive: true, budgetPeriod: "MONTHLY",
      }).returning();
      cat = row;
    }
    expenseCategoryIds[name] = cat.id;
  }

  const existingExpense = await db.query.expenses.findFirst({ where: eq(expenses.orgId, orgId) });
  if (!existingExpense) {
    await db.insert(expenses).values(
      DEMO_EXPENSES.map((e, i) => ({
        orgId,
        userId: i % 2 === 0 ? engId : salesId,
        categoryId: expenseCategoryIds[e.category],
        category: e.category,
        amount: e.amount,
        currency: "INR",
        description: e.description,
        merchant: e.merchant,
        paymentMethod: e.paymentMethod,
        status: e.status,
        approverId: e.status === "APPROVED" ? hrId : undefined,
        approvedAt: e.status === "APPROVED" ? subDays(new Date(), e.daysAgo - 1) : undefined,
        expenseDate: formatISO(subDays(new Date(), e.daysAgo), { representation: "date" }),
      })),
    );
  }

  console.log("[seed-demo] Seeding a demo project + tickets…");
  let demoProject = await db.query.projects.findFirst({
    where: and(eq(projects.orgId, orgId), eq(projects.key, "DEMO")),
  });
  if (!demoProject) {
    const [row] = await db.insert(projects).values({
      orgId,
      name: "Atlas Platform Rollout",
      description: "Reference customer rollout — internal demo project",
      key: "DEMO",
      managerId: pmId,
      status: "ACTIVE",
      startDate: subDays(new Date(), 30),
      endDate: addDays(new Date(), 60),
    }).returning();
    demoProject = row;
  }

  const existingTicket = await db.query.tickets.findFirst({
    where: and(eq(tickets.orgId, orgId), eq(tickets.projectId, demoProject.id)),
  });
  if (!existingTicket) {
    await db.insert(tickets).values(
      DEMO_TICKETS.map((t, i) => ({
        orgId,
        projectId: demoProject!.id,
        title: t.title,
        type: t.type,
        status: t.status,
        priority: t.priority,
        ticketNumber: i + 1,
        sequenceId: `DEMO-${i + 1}`,
        assigneeId: i % 2 === 0 ? engId : pmId,
        reporterId: pmId,
        order: i,
      })),
    );
  }

  console.log("[seed-demo] Seeding recruitment candidates…");
  const existingCandidate = await db.query.candidates.findFirst({ where: eq(candidates.orgId, orgId) });
  if (!existingCandidate) {
    await db.insert(candidates).values(
      DEMO_CANDIDATES.map((c) => ({
        orgId,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        currentRole: c.currentRole,
        currentCompany: c.currentCompany,
        experienceYears: c.experienceYears,
        status: c.status,
        skills: c.skills,
        source: "DIRECT",
        referredBy: hrId,
      })),
    );
  }

  console.log("");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("  ✓ Demo workspace ready");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`    Workspace: ${DEMO_ORG_NAME} (slug: ${DEMO_ORG_SLUG})`);
  console.log("");
  console.log(`    OWNER login:`);
  console.log(`      Email:    ${DEMO_OWNER_EMAIL}`);
  console.log(`      Password: ${DEMO_OWNER_PASSWORD}`);
  console.log("");
  console.log(`    Team logins (password: DemoTeam@2026!):`);
  for (const m of DEMO_TEAM) {
    console.log(`      ${m.role.padEnd(16)} ${m.email}`);
  }
  console.log("");
  console.log(`    Sign in:   http://localhost:3000/signin`);
  console.log("─────────────────────────────────────────────────────────────");

  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-demo] error:", err);
  process.exit(1);
});
