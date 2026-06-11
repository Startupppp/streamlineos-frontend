import * as dotenv from "dotenv";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { addDays, subDays, formatISO } from "date-fns";

dotenv.config({ path: ".env" });

const DEMO_ORG_SLUG = "demo-streamlineos";
const DEMO_ORG_NAME = "Demo · StreamlineOS";
const DEMO_OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL || "demo@streamlineos.in";
const DEMO_OWNER_PASSWORD = process.env.DEMO_OWNER_PASSWORD || "Demo@2026!";

interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  designation: string;
}

const DEMO_TEAM: DemoUser[] = [
  { email: "priya.hr@demo.streamlineos.in",      firstName: "Priya",  lastName: "Rao",    role: "HR_MANAGER",      designation: "HR Manager" },
  { email: "arjun.pm@demo.streamlineos.in",      firstName: "Arjun",  lastName: "Mehta",  role: "PROJECT_MANAGER", designation: "Project Manager" },
  { email: "neha.sales@demo.streamlineos.in",    firstName: "Neha",   lastName: "Iyer",   role: "SALES_REP",       designation: "Sales Executive" },
  { email: "rahul.eng@demo.streamlineos.in",     firstName: "Rahul",  lastName: "Verma",  role: "MEMBER",          designation: "Software Engineer" },
  { email: "sara.design@demo.streamlineos.in",   firstName: "Sara",   lastName: "Khan",   role: "MEMBER",          designation: "Product Designer" },
];

const DEMO_LEADS = [
  { name: "Acme Logistics",   email: "ceo@acme.test",     phone: "+91 98100 11122", company: "Acme Logistics",   designation: "CEO",       status: "QUALIFIED",  priority: "HOT",  source: "website",      potential: 850000 },
  { name: "Northwind Retail", email: "ops@northwind.test", phone: "+91 98100 22233", company: "Northwind Retail", designation: "COO",       status: "NEW",        priority: "WARM", source: "referral",     potential: 420000 },
  { name: "Pioneer Studios",  email: "hello@pioneer.test", phone: "+91 98100 33344", company: "Pioneer Studios",  designation: "Founder",   status: "CONTACTED",  priority: "WARM", source: "social_media", potential: 280000 },
  { name: "Vista Pharma",     email: "it@vista.test",      phone: "+91 98100 44455", company: "Vista Pharma",     designation: "IT Head",   status: "QUALIFIED",  priority: "HOT",  source: "campaign",     potential: 1200000 },
  { name: "Bluepeak Capital", email: "ops@bluepeak.test",  phone: "+91 98100 55566", company: "Bluepeak Capital", designation: "Director",  status: "NEW",        priority: "COLD", source: "other",        potential: 95000 },
];

const DEMO_DEALS = [
  { name: "Acme Logistics — Annual HRMS",  value: 850000, stage: "PROPOSAL",    probability: 60 },
  { name: "Vista Pharma — Enterprise Plan", value: 1200000, stage: "NEGOTIATION", probability: 75 },
];

const DEMO_TICKETS = [
  { title: "Set up Postgres replica",                  type: "TASK",  status: "IN_PROGRESS", priority: "HIGH" },
  { title: "Design onboarding empty-state",            type: "TASK",  status: "TODO",        priority: "MEDIUM" },
  { title: "Wire up Stripe webhook for subscriptions", type: "TASK",  status: "REVIEW",      priority: "HIGH" },
  { title: "Fix race condition in attendance check-in", type: "BUG",  status: "TODO",        priority: "URGENT" },
  { title: "Write blog post: launch announcement",     type: "TASK",  status: "DONE",        priority: "LOW" },
];

const DEMO_CANDIDATES = [
  { firstName: "Vikram", lastName: "Joshi",  email: "vikram.joshi@cand.test",  currentRole: "Senior Backend Engineer",  currentCompany: "Cloudops",   experienceYears: "6.5", status: "INTERVIEW" as const, skills: ["TypeScript", "Postgres", "AWS"] },
  { firstName: "Anita",  lastName: "Bhat",   email: "anita.bhat@cand.test",    currentRole: "Product Designer",         currentCompany: "Frontier",   experienceYears: "4.0", status: "SCREENING" as const, skills: ["Figma", "Prototyping", "Design Systems"] },
  { firstName: "Karan",  lastName: "Singh",  email: "karan.singh@cand.test",   currentRole: "Sales Lead",               currentCompany: "Velocity",   experienceYears: "8.0", status: "OFFER" as const,     skills: ["CRM", "Pipeline Management", "SaaS"] },
];

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
  } = schema;

  console.log("[seed-demo] Looking up existing demo org…");
  let demoOrg = await db.query.organizations.findFirst({
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
  let ownerUser = await db.query.users.findFirst({
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
    let u = await db.query.users.findFirst({ where: eq(users.email, member.email) });
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

  const existingDeal = await db.query.deals.findFirst({ where: eq(deals.orgId, orgId) });
  if (!existingDeal) {
    await db.insert(deals).values(
      DEMO_DEALS.map((d, i) => ({
        orgId,
        name: d.name,
        value: String(d.value),
        stage: d.stage as never,
        probability: d.probability,
        assignedToId: salesId,
        leadId: i === 0 ? firstLeadId ?? undefined : undefined,
        expectedCloseDate: formatISO(addDays(new Date(), 30 + i * 15), { representation: "date" }),
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
        priority: t.priority as never,
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
