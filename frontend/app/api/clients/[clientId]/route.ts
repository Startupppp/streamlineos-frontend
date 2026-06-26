import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getClientAccount } from "@/server/queries/crm";
import { db } from "@/lib/db";
import { clientAccounts, clientAccountActivities, incentiveConfig, incentives, notifications, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { sendNotification } from "@/lib/notifications/send";

const updateStatusSchema = z.object({
  status: z.enum(["ACCOUNT_OPENING", "QUERIES", "PLAN_SELECTED", "INVESTED"]),
  investmentAmount: z.string().optional(),
  planName: z.string().optional(),
  investmentDate: z.string().optional(),
  transactionRef: z.string().optional(),
});

type Ctx = { params: Promise<{ clientId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { clientId: id } = await ctx.params;
  const accountId = Number(id);
  if (!Number.isFinite(accountId)) return err("Invalid client id", 400);

  return withAuth(async (session) => {
    const account = await getClientAccount(session.orgId!, accountId);
    if (!account) return err("Client account not found", 404);

    if (
      session.user.role === "SALES" &&
      account.salesRepId !== session.user.id
    ) {
      return err("You can only view your own converted clients", 403);
    }

    return ok(account);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { clientId: id } = await ctx.params;
  const accountId = Number(id);
  if (!Number.isFinite(accountId)) return err("Invalid client id", 400);

  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CUSTOMER_SUPPORT", "HR", "CEO"].includes(role)) {
      return err("Only CRM team can update client status", 403);
    }

    const input = await parseBody(req, updateStatusSchema);
    const orgId = session.orgId!;

    const account = await db.query.clientAccounts.findFirst({
      where: and(eq(clientAccounts.id, accountId), eq(clientAccounts.orgId, orgId)),
    });
    if (!account) return err("Client account not found", 404);

    const updateData: Record<string, unknown> = { status: input.status, updatedAt: new Date() };

    if (input.status === "INVESTED") {
      if (!input.investmentAmount) {
        return err("Investment amount is required for INVESTED status", 400);
      }
      updateData.investmentAmount = input.investmentAmount;
      updateData.planName = input.planName;
      updateData.investmentDate = input.investmentDate ? new Date(input.investmentDate) : new Date();
      updateData.transactionRef = input.transactionRef;
      updateData.investedAt = new Date();
    }

    const [updated] = await db.update(clientAccounts)
      .set(updateData)
      .where(and(eq(clientAccounts.id, accountId), eq(clientAccounts.orgId, orgId)))
      .returning();

    await db.insert(clientAccountActivities).values({
      clientAccountId: accountId,
      userId: session.user.id,
      activityType: "status_change",
      title: `Status changed to ${input.status}`,
      description:
        input.status === "INVESTED"
          ? `Investment: ${input.investmentAmount}, Plan: ${input.planName || "N/A"}`
          : undefined,
    });

    if (input.status === "INVESTED" && input.investmentAmount) {
      const config = await db.query.incentiveConfig.findFirst({
        where: and(eq(incentiveConfig.orgId, orgId), eq(incentiveConfig.isActive, true)),
        orderBy: [desc(incentiveConfig.effectiveFrom)],
      });
      if (config) {
        const amount = parseFloat(input.investmentAmount);
        const rate = parseFloat(config.incentiveRate);
        const calculated = (amount * rate) / 100;
        await db.insert(incentives).values({
          orgId,
          clientAccountId: accountId,
          salesRepId: account.salesRepId,
          investmentAmount: input.investmentAmount,
          incentiveRate: config.incentiveRate,
          calculatedAmount: String(calculated),
          branchId: account.branchId,
        });
      }

      await db.insert(notifications).values({
        orgId,
        userId: account.salesRepId,
        type: "SUCCESS",
        title: "Client Invested!",
        message: `${account.clientName} has invested ₹${parseFloat(input.investmentAmount).toLocaleString("en-IN")}. Your incentive is being processed.`,
        link: `/crm/clients/${account.id}`,
      });

      const hrMemberIds = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, "HR")));

      if (hrMemberIds.length > 0) {
        const investmentMsg = `${account.clientName} has invested ₹${parseFloat(input.investmentAmount).toLocaleString("en-IN")}. Sales rep: ${account.salesRepId ? "assigned" : "N/A"}.`;
        await db.insert(notifications).values(
          hrMemberIds.map((hr) => ({
            orgId,
            userId: hr.userId,
            type: "SUCCESS" as const,
            title: "Client Invested!",
            message: investmentMsg,
            link: `/crm/clients/${account.id}`,
          }))
        );
      }

      void (async () => {
        try {
          const [salesRep, hrUsers] = await Promise.all([
            db.query.users.findFirst({
              where: eq(users.id, account.salesRepId),
              columns: { email: true, name: true },
            }),
            hrMemberIds.length > 0
              ? db.select({ userId: users.id, email: users.email }).from(users).where(inArray(users.id, hrMemberIds.map((m) => m.userId)))
              : Promise.resolve([]),
          ]);

          await Promise.all([
            salesRep?.email
              ? sendNotification({
                  orgId,
                  userId: account.salesRepId,
                  type: "SUCCESS",
                  title: "Client Invested!",
                  message: `${account.clientName} has invested ₹${parseFloat(input.investmentAmount!).toLocaleString("en-IN")}. Your incentive is being processed.`,
                  link: `/crm/clients/${account.id}`,
                  channel: "email",
                  recipientEmail: salesRep.email,
                })
              : Promise.resolve(),
            ...hrUsers
              .filter((u) => u.email)
              .map((u) =>
                sendNotification({
                  orgId,
                  userId: u.userId,
                  type: "SUCCESS",
                  title: "Client Invested!",
                  message: `${account.clientName} has invested ₹${parseFloat(input.investmentAmount!).toLocaleString("en-IN")}. Sales rep: ${salesRep?.name ?? "N/A"}.`,
                  link: `/crm/clients/${account.id}`,
                  channel: "email",
                  recipientEmail: u.email!,
                })
              ),
          ]);
        } catch {
        }
      })();
    }

    void createAuditLog({
      action: "client.status_changed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(accountId),
      targetType: "client",
      metadata: { status: input.status, investmentAmount: input.investmentAmount },
    }).catch(() => {});

    return ok(updated);
  });
}
