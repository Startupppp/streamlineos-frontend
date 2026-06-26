import { eq, and, count, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  leads,
  deals,
  projects,
  tickets,
  clients,
  clientAccounts,
  notifications,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { sendNotification } from "@/lib/notifications/send";

export const leadStatusEnum = z.enum([
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
]);

export const transitionLeadStatusSchema = z.object({
  status: leadStatusEnum,
  expectedStatus: leadStatusEnum.optional(),
  lostReason: z.string().optional(),
  estimatedInvestment: z.string().optional(),
  conversionNotes: z.string().optional(),
});

export type TransitionLeadStatusInput = z.infer<typeof transitionLeadStatusSchema>;
type LeadRow = typeof leads.$inferSelect;

export type TransitionLeadStatusResult =
  | { ok: true; lead: LeadRow }
  | { ok: false; reason: "already_converted" | "stale_or_missing" };

async function getNextCrmAssignee(orgId: string): Promise<string | null> {
  const csMembers = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.role, "CUSTOMER_SUPPORT"),
      ),
    );

  if (csMembers.length === 0) return null;

  const memberIds = csMembers.map((m) => m.userId);
  const grouped = await db
    .select({
      userId: clientAccounts.assignedCrmId,
      load: count(),
    })
    .from(clientAccounts)
    .where(
      and(
        eq(clientAccounts.orgId, orgId),
        inArray(clientAccounts.assignedCrmId, memberIds),
        sql`${clientAccounts.status} != 'INVESTED'`,
      ),
    )
    .groupBy(clientAccounts.assignedCrmId);

  const loadByUser = new Map<string, number>();
  for (const row of grouped) {
    if (row.userId) loadByUser.set(row.userId, Number(row.load));
  }

  let minCount = Infinity;
  let assignee: string | null = null;
  for (const m of csMembers) {
    const load = loadByUser.get(m.userId) ?? 0;
    if (load < minCount) {
      minCount = load;
      assignee = m.userId;
    }
  }
  return assignee;
}

async function ensureDealForLead(orgId: string, lead: LeadRow): Promise<void> {
  const existingDeal = await db.query.deals.findFirst({
    where: and(eq(deals.leadId, lead.id), eq(deals.orgId, orgId)),
  });
  if (existingDeal) return;
  await db.insert(deals).values({
    orgId,
    leadId: lead.id,
    name: `${lead.name}${lead.company ? " - " + lead.company : ""}`,
    value: lead.potentialValue || lead.investmentInterest || "0",
    stage: "LEAD",
    contactPerson: lead.name,
    contactEmail: lead.email,
    contactPhone: lead.phone,
    assignedToId: null,
  });
}

async function convertLeadToClient(
  orgId: string,
  userId: string,
  lead: LeadRow,
  input: TransitionLeadStatusInput,
  crmAssigneeId: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const existingClient = await tx.query.clients.findFirst({
      where: and(eq(clients.leadId, lead.id), eq(clients.orgId, orgId)),
    });
    if (!existingClient) {
      await tx.insert(clients).values({
        orgId,
        leadId: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        designation: lead.designation,
        city: lead.city,
        investmentValue: lead.potentialValue,
        accountManagerId: lead.assignedToId,
        status: "active",
      });
    }

    const existingClientAccount = await tx.query.clientAccounts.findFirst({
      where: and(eq(clientAccounts.leadId, lead.id), eq(clientAccounts.orgId, orgId)),
    });
    if (!existingClientAccount) {
      await tx.insert(clientAccounts).values({
        orgId,
        leadId: lead.id,
        salesRepId: lead.assignedToId ?? userId,
        assignedCrmId: crmAssigneeId,
        clientName: lead.name,
        clientEmail: lead.email,
        clientPhone: lead.phone,
        clientWhatsapp: lead.whatsappNumber,
        estimatedInvestment:
          input.estimatedInvestment ||
          lead.potentialValue ||
          lead.investmentInterest ||
          null,
        status: "ACCOUNT_OPENING",
        convertedAt: new Date(),
      });
    }

    if (input.conversionNotes || input.estimatedInvestment) {
      await tx
        .update(leads)
        .set({
          ...(input.conversionNotes ? { notes: input.conversionNotes } : {}),
          ...(input.estimatedInvestment
            ? { potentialValue: input.estimatedInvestment, investmentInterest: input.estimatedInvestment }
            : {}),
        })
        .where(eq(leads.id, lead.id));
    }
  });
}

async function dispatchConversionSideEffects(
  orgId: string,
  userId: string,
  lead: LeadRow,
  crmAssigneeId: string | null,
): Promise<void> {
  try {
    const firstProject = await db.query.projects.findFirst({
      where: eq(projects.orgId, orgId),
    });
    if (firstProject) {
      const ticketCountResult = await db
        .select({ count: count() })
        .from(tickets)
        .where(eq(tickets.projectId, firstProject.id));
      const nextTicketNumber = (ticketCountResult[0]?.count ?? 0) + 1;

      await db.insert(tickets).values({
        orgId,
        title: `Onboard converted lead: ${lead.name}`,
        description: `Lead "${lead.name}" has been converted.\nCompany: ${lead.company || "N/A"}\nEmail: ${lead.email || "N/A"}\nPhone: ${lead.phone || "N/A"}`,
        type: "TASK",
        status: "TODO",
        priority: "HIGH",
        projectId: firstProject.id,
        ticketNumber: nextTicketNumber,
        reporterId: userId,
      });
    }

    await db.insert(notifications).values({
      orgId,
      userId: lead.assignedToId || userId,
      type: "SUCCESS",
      title: "Lead Converted",
      message: `Lead "${lead.name}" has been converted to a client.${crmAssigneeId ? " A CRM executive has been assigned." : ""}`,
      link: `/crm/clients`,
    });

    if (crmAssigneeId) {
      await db.insert(notifications).values({
        orgId,
        userId: crmAssigneeId,
        type: "INFO",
        title: "New Client Assigned",
        message: `Client "${lead.name}" has been assigned to you for onboarding. Estimated investment: ${lead.potentialValue ?? "N/A"}.`,
        link: `/crm/clients`,
      });
    }

    const salesRep = await db.query.users.findFirst({
      where: eq(users.id, lead.assignedToId || userId),
      columns: { email: true, name: true },
    });
    if (salesRep?.email) {
      await sendNotification({
        orgId,
        userId: lead.assignedToId || userId,
        type: "SUCCESS",
        title: "Lead Converted",
        message: `Lead "${lead.name}" has been converted to a client.`,
        link: `/crm/clients`,
        channel: "email",
        recipientEmail: salesRep.email,
      });
    }

    if (crmAssigneeId) {
      const crmUser = await db.query.users.findFirst({
        where: eq(users.id, crmAssigneeId),
        columns: { email: true, name: true },
      });
      if (crmUser?.email) {
        await sendNotification({
          orgId,
          userId: crmAssigneeId,
          type: "INFO",
          title: "New Client Assigned",
          message: `Client "${lead.name}" has been assigned to you for onboarding.`,
          link: `/crm/clients`,
          channel: "email",
          recipientEmail: crmUser.email,
        });
      }
    }
  } catch {
  }
}

export async function transitionLeadStatus(
  orgId: string,
  userId: string,
  leadId: number,
  input: TransitionLeadStatusInput,
): Promise<TransitionLeadStatusResult> {
  if (input.status === "CONVERTED") {
    const existing = await db.query.leads.findFirst({
      where: and(eq(leads.id, leadId), eq(leads.orgId, orgId)),
      columns: { status: true },
    });
    if (existing?.status === "CONVERTED") {
      return { ok: false, reason: "already_converted" };
    }
  }

  const updateData: Record<string, unknown> = {
    status: input.status,
    updatedAt: new Date(),
  };
  if (input.status === "CONVERTED") updateData.convertedAt = new Date();
  if (input.status === "LOST" && input.lostReason) updateData.lostReason = input.lostReason;

  const conditions = [eq(leads.id, leadId), eq(leads.orgId, orgId)];
  if (input.expectedStatus) conditions.push(eq(leads.status, input.expectedStatus));

  const [updated] = await db
    .update(leads)
    .set(updateData)
    .where(and(...conditions))
    .returning();

  if (!updated) return { ok: false, reason: "stale_or_missing" };

  if (input.status === "INTERESTED" || input.status === "QUALIFIED") {
    await ensureDealForLead(orgId, updated);
  }

  if (input.status === "CONVERTED") {
    const crmAssigneeId = await getNextCrmAssignee(orgId);
    await convertLeadToClient(orgId, userId, updated, input, crmAssigneeId);
    void dispatchConversionSideEffects(orgId, userId, updated, crmAssigneeId);
  }

  return { ok: true, lead: updated };
}
