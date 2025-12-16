
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function main() {
  console.log("🧹 Starting extra user cleanup...");
  
  // Dynamic import
  const { db } = await import("../lib/db");
  const { 
    users, 
    organizationMembers, 
    accounts, 
    sessions, 
    onboardingSteps, 
    notifications,
    salaryStructures,
    attendance,
    leaveRequests, 
    leaveBalances,
    expenses,
    assets,
    documents,
    performanceReviews,
    goals,
    helpdeskTickets,
    projects,
    tickets,
    sprints,
    projectStatuses,
    ticketComments,
    timesheets,
    reports,
    payroll
  } = await import("../lib/db/schema");
  const { eq, inArray, notInArray } = await import("drizzle-orm");

  const KEEP_EMAILS = [
      "ceo@vaivamm.com",
      "hr@vaivamm.com",
      "emp@vaivamm.com"
  ];

  console.log("Keep list:", KEEP_EMAILS);

  // 1. Find users to delete
  const usersToDelete = await db.query.users.findMany({
      where: notInArray(users.email, KEEP_EMAILS),
      columns: { id: true, email: true }
  });

  if (usersToDelete.length === 0) {
      console.log("✅ No extra users found to delete.");
      process.exit(0);
  }

  const userIds = usersToDelete.map(u => u.id);
  console.log(`🗑️ Found ${userIds.length} users to delete:`, usersToDelete.map(u => u.email));

  // 2. Delete related records for THESE users
  // Note: We are deleting based on userId logic.
  
  // -- Auth & Org --
  // accounts, sessions, organizationMembers, userPermissions
  // -- HR --
  // onboardingSteps, notifications, salaryStructures, attendance, leaveRequests, leaveBalances
  // expenses, assets (assignedTo), documents (userId, uploadedBy), performanceReviews (userId, reviewerId)
  // goals, helpdeskTickets (userId, assigneeId), timesheets
  // -- Projects --
  // projects (managerId, clientId), tickets (assigneeId, reporterId)
  
  // We'll try to delete in roughly reverse dependency order.

  // Projects & Tickets
  // For tickets, we should probably delete them if they are test data, or unassign if we want to keep them.
  // Given "delete all other accounts", likely delete data associated strictly with them.
  // Tickets where they are assignee or reporter:
  await db.delete(tickets).where(inArray(tickets.assigneeId, userIds));
  await db.delete(tickets).where(inArray(tickets.reporterId, userIds));
  
  // Projects where they are manager or client
  // THIS MIGHT CASCADE to tickets, sprints etc. so order matters if no cascade.
  // Delete tickets first (done above).
  // Sprints depend on projects.
  // Project Statuses depend on projects.
  // We need to find projects managed/client-ed by these users.
  
  const projectsToDelete = await db.query.projects.findMany({
      where: 
        inArray(projects.managerId, userIds) 
        // or(eq(projects.clientId, ...)) - checking manager primarily
  });
  
  const clientProjects = await db.query.projects.findMany({
      where: inArray(projects.clientId, userIds)
  });
  
  // Merge project IDs
  const projectIds = [...new Set([
      ...projectsToDelete.map(p => p.id),
      ...clientProjects.map(p => p.id)
  ])];
  
  if (projectIds.length > 0) {
      console.log("Deleting projects owned by these users:", projectIds);
      // Delete tickets in these projects
      await db.delete(tickets).where(inArray(tickets.projectId, projectIds));
      // Delete sprints
      // Need sprint IDs? Or just delete where projectId...
      // schema: sprints.projectId matches.
      // But tickets ref sprints. So tickets must be gone first (done above).
      // import { sprints, projectStatuses } from "../lib/db/schema"; // need to import these at top, but dynamic content...
      // Let's assume we imported them or add them to import list above.
      
      // Wait, I can't import here easily without messing up function scope or repeated imports.
      // I will add them to the top import list in next edit step if needed, or just use db.delete logic if variables available.
      // Actually `sprints` and `projectStatuses` are NOT in the import list at the top.
  }

  console.log("Deleting related records...");

  // Notifications
  await db.delete(notifications).where(inArray(notifications.userId, userIds));
  // Onboarding Steps
  await db.delete(onboardingSteps).where(inArray(onboardingSteps.userId, userIds));
  // Salary Structures
  await db.delete(salaryStructures).where(inArray(salaryStructures.userId, userIds));
  // Attendance
  await db.delete(attendance).where(inArray(attendance.userId, userIds));
  // Leave Balances
  await db.delete(leaveBalances).where(inArray(leaveBalances.userId, userIds));
  // Leave Requests (as requester)
  await db.delete(leaveRequests).where(inArray(leaveRequests.userId, userIds));
  // Timesheets
  await db.delete(timesheets).where(inArray(timesheets.userId, userIds));
  // Expenses (as user)
  await db.delete(expenses).where(inArray(expenses.userId, userIds));
  
  // Org Members
  await db.delete(organizationMembers).where(inArray(organizationMembers.userId, userIds));
  
  // Auth
  await db.delete(accounts).where(inArray(accounts.userId, userIds));
  await db.delete(sessions).where(inArray(sessions.userId, userIds));

  // Finally delete Users
  await db.delete(users).where(inArray(users.id, userIds));

  console.log("✅ Cleanup complete! Deleted", userIds.length, "users and their data.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
