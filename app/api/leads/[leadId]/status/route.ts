import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  leads, deals, projects, tickets, clients, clientAccounts,
  notifications, organizationMembers, users,
} from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { sendNotification } from "@/lib/notifications/send";

const schema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]),
  expectedStatus: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
  lostReason: z.string().optional(),
  // Conversion extras — passed from the conversion modal
  estimatedInvestment: z.string().optional(),
  conversionNotes: z.string().optional(),
});

type Ctx = { params: Promise<{ leadId: string }> };

/**
 * Round-robin: pick the next CUSTOMER_SUPPORT user for CRM assignment.
 * Cycles through all CS members, assigning to whoever has the fewest active accounts.
 */
async function getNextCrmAssignee(orgId: string): Promise<string | null> {
  // Get all CUSTOMER_SUPPORT members
  const csMembers = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.role, "CUSTOMER_SUPPORT")
      )
    );

  if (csMembers.length === 0) return null;

  // Count active (non-INVESTED) accounts per CS member
  const counts: Record<string, number> = {};
  for (const m of csMembers) {
    const [result] = await db
      .select({ count: count() })
      .from(clientAccounts)
      .where(
        and(
          eq(clientAccounts.orgId, orgId),
          eq(clientAccounts.assignedCrmId, m.userId),
          sql`${clientAccounts.status} != 'INVESTED'`
        )
      );
    counts[m.userId] = result?.count ?? 0;
  }

  // Assign to the member with fewest active accounts (load-balanced round-robin)
  let minCount = Infinity;
  let assignee: string | null = null;
  for (const m of csMembers) {
    if (counts[m.userId] < minCount) {
      minCount = counts[m.userId];
      assignee = m.userId;
    }
  }

  return assignee;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const orgId = session.orgId!;
    const input = await parseBody(req, schema);

    const updateData: Record<string, unknown> = {
      status: input.status,
      updatedAt: new Date(),
    };
    if (input.status === "CONVERTED") updateData.convertedAt = new Date();
    if (input.status === "LOST" && input.lostReason) updateData.lostReason = input.lostReason;

    if (input.status === "CONVERTED") {
      const existing = await db.query.leads.findFirst({
        where: and(eq(leads.id, leadId), eq(leads.orgId, orgId)),
        columns: { status: true },
      });
      if (existing?.status === "CONVERTED") {
        return err("Lead has already been converted", 409);
      }
    }

    const conditions = [eq(leads.id, leadId), eq(leads.orgId, orgId)];
    if (input.expectedStatus) conditions.push(eq(leads.status, input.expectedStatus));

    const [updated] = await db.update(leads)
      .set(updateData)
      .where(and(...conditions))
      .returning();

    if (!updated) {
      return err("Lead status has been updated by someone else, or lead not found. Please refresh.", 409);
    }

    if (input.status === "INTERESTED" || input.status === "QUALIFIED") {
      const existingDeal = await db.query.deals.findFirst({
        where: and(eq(deals.leadId, updated.id), eq(deals.orgId, orgId)),
      });
      if (!existingDeal) {
        await db.insert(deals).values({
          orgId,
          leadId: updated.id,
          name: `${updated.name}${updated.company ? " - " + updated.company : ""}`,
          value: updated.potentialValue || updated.investmentInterest || "0",
          stage: "LEAD",
          contactPerson: updated.name,
          contactEmail: updated.email,
          contactPhone: updated.phone,
          assignedToId: null,
        });
      }
    }

    if (input.status === "CONVERTED") {
      // Get CRM assignee via round-robin before transaction
      const crmAssigneeId = await getNextCrmAssignee(orgId);

      // ── Critical: create client + client account (must succeed) ──
      await db.transaction(async (tx) => {
        // Create client record
        const existingClient = await tx.query.clients.findFirst({
          where: and(eq(clients.leadId, updated.id), eq(clients.orgId, orgId)),
        });
        if (!existingClient) {
          await tx.insert(clients).values({
            orgId,
            leadId: updated.id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            company: updated.company,
            designation: updated.designation,
            city: updated.city,
            investmentValue: updated.potentialValue,
            accountManagerId: updated.assignedToId,
            status: "active",
          });
        }

        // Create client account with CRM round-robin assignment
        const existingClientAccount = await tx.query.clientAccounts.findFirst({
          where: and(eq(clientAccounts.leadId, updated.id), eq(clientAccounts.orgId, orgId)),
        });
        if (!existingClientAccount) {
          await tx.insert(clientAccounts).values({
            orgId,
            leadId: updated.id,
            salesRepId: updated.assignedToId ?? session.user.id,
            assignedCrmId: crmAssigneeId,
            clientName: updated.name,
            clientEmail: updated.email,
            clientPhone: updated.phone,
            clientWhatsapp: updated.whatsappNumber,
            estimatedInvestment:
              input.estimatedInvestment ||
              updated.potentialValue ||
              updated.investmentInterest ||
              null,
            status: "ACCOUNT_OPENING",
            convertedAt: new Date(),
          });
        }

        // Update lead notes/investmentInterest from conversion modal if provided
        if (input.conversionNotes || input.estimatedInvestment) {
          await tx.update(leads)
            .set({
              ...(input.conversionNotes ? { notes: input.conversionNotes } : {}),
              ...(input.estimatedInvestment ? { potentialValue: input.estimatedInvestment, investmentInterest: input.estimatedInvestment } : {}),
            })
            .where(eq(leads.id, updated.id));
        }
      });

      // ── Non-critical side effects (don't block conversion) ──
      void (async () => {
        try {
          // Create onboarding ticket
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
              title: `Onboard converted lead: ${updated.name}`,
              description: `Lead "${updated.name}" has been converted.\nCompany: ${updated.company || "N/A"}\nEmail: ${updated.email || "N/A"}\nPhone: ${updated.phone || "N/A"}`,
              type: "TASK",
              status: "TODO",
              priority: "HIGH",
              projectId: firstProject.id,
              ticketNumber: nextTicketNumber,
              reporterId: session.user.id,
            });
          }

          // In-app notifications
          await db.insert(notifications).values({
            orgId,
            userId: updated.assignedToId || session.user.id,
            type: "SUCCESS",
            title: "Lead Converted",
            message: `Lead "${updated.name}" has been converted to a client.${crmAssigneeId ? " A CRM executive has been assigned." : ""}`,
            link: `/crm/clients`,
          });

          if (crmAssigneeId) {
            await db.insert(notifications).values({
              orgId,
              userId: crmAssigneeId,
              type: "INFO",
              title: "New Client Assigned",
              message: `Client "${updated.name}" has been assigned to you for onboarding. Estimated investment: ${updated.potentialValue ?? "N/A"}.`,
              link: `/crm/clients`,
            });
          }

          // Email notifications
          const salesRep = await db.query.users.findFirst({
            where: eq(users.id, updated.assignedToId || session.user.id),
            columns: { email: true, name: true },
          });
          if (salesRep?.email) {
            await sendNotification({
              orgId,
              userId: updated.assignedToId || session.user.id,
              type: "SUCCESS",
              title: "Lead Converted",
              message: `Lead "${updated.name}" has been converted to a client.`,
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
                message: `Client "${updated.name}" has been assigned to you for onboarding.`,
                link: `/crm/clients`,
                channel: "email",
                recipientEmail: crmUser.email,
              });
            }
          }
        } catch {
          // Non-critical — notifications and tickets don't block conversion
        }
      })();
    }

    void createAuditLog({
      action: "lead.status_changed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(leadId),
      targetType: "lead",
      metadata: { newStatus: input.status, lostReason: input.lostReason },
    }).catch(() => {});

    return ok(updated);
  });
}
