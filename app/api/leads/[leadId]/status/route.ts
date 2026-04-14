import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, deals, projects, tickets, clients, clientAccounts, notifications } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const schema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]),
  expectedStatus: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
  lostReason: z.string().optional(),
});

type Ctx = { params: Promise<{ leadId: string }> };

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
      await db.transaction(async (tx) => {
        const firstProject = await tx.query.projects.findFirst({
          where: eq(projects.orgId, orgId),
        });
        if (firstProject) {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(${firstProject.id})`);
          const ticketCountResult = await tx
            .select({ count: count() })
            .from(tickets)
            .where(eq(tickets.projectId, firstProject.id));
          const nextTicketNumber = (ticketCountResult[0]?.count ?? 0) + 1;

          await tx.insert(tickets).values({
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

        const existingClientAccount = await tx.query.clientAccounts.findFirst({
          where: and(eq(clientAccounts.leadId, updated.id), eq(clientAccounts.orgId, orgId)),
        });
        if (!existingClientAccount) {
          await tx.insert(clientAccounts).values({
            orgId,
            leadId: updated.id,
            salesRepId: updated.assignedToId ?? session.user.id,
            clientName: updated.name,
            clientEmail: updated.email,
            clientPhone: updated.phone,
            clientWhatsapp: updated.whatsappNumber,
            estimatedInvestment: updated.potentialValue ?? updated.investmentInterest ?? null,
            status: "ACCOUNT_OPENING",
            convertedAt: new Date(),
          });
        }

        await tx.insert(notifications).values({
          orgId,
          userId: updated.assignedToId || session.user.id,
          type: "SUCCESS",
          title: "Lead Converted",
          message: `Lead "${updated.name}" has been converted to a client.`,
          link: `/crm/leads/${updated.id}`,
        });
      });
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
