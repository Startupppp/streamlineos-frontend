import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  deals,
  dealActivities,
  chatChannels,
  chatChannelMembers,
  users,
} from "@/lib/db/schema";
import { sendDealStageChangeEmail } from "@/lib/email";

export const dealStageEnum = z.enum([
  "LEAD",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
]);
export type DealStage = z.infer<typeof dealStageEnum>;

export const updateDealSchema = z.object({
  name: z.string().min(1).optional(),
  value: z.coerce.number().min(0).optional(),
  stage: dealStageEnum.optional(),
  probability: z.number().min(0).max(100).optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  assignedToId: z.string().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  actualCloseDate: z.string().nullable().optional(),
  lostReason: z.string().optional(),
  notes: z.string().optional(),
  version: z.string().datetime().optional(),
});
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

type DealRow = typeof deals.$inferSelect;

export type UpdateDealResult =
  | { ok: true; deal: DealRow; previousStage: DealStage | null; stageChanged: boolean }
  | { ok: false; reason: "version_conflict" | "not_found" };

async function maybeCreateNegotiationChannel(
  orgId: string,
  userId: string,
  dealId: number,
): Promise<void> {
  const alreadyLinked = await db.query.chatChannels.findFirst({
    where: eq(chatChannels.linkedDealId, dealId),
    columns: { id: true },
  });
  if (alreadyLinked) return;

  const dealRow = await db.query.deals.findFirst({
    where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)),
    columns: { name: true, assignedToId: true },
  });

  const channelName = dealRow ? `Deal: ${dealRow.name}` : `Deal #${dealId}`;

  const [newChannel] = await db
    .insert(chatChannels)
    .values({
      orgId,
      name: channelName,
      type: "GROUP",
      description: `Auto-created channel for deal #${dealId} entering Negotiation`,
      createdBy: userId,
      linkedDealId: dealId,
    })
    .returning({ id: chatChannels.id });

  const memberIds = [userId];
  if (dealRow?.assignedToId && dealRow.assignedToId !== userId) {
    memberIds.push(dealRow.assignedToId);
  }

  await db.insert(chatChannelMembers).values(
    memberIds.map((uid) => ({
      channelId: newChannel.id,
      userId: uid,
      role: uid === userId ? ("ADMIN" as const) : ("MEMBER" as const),
    })),
  );
}

async function sendStageChangeNotification(
  orgId: string,
  actorName: string,
  deal: DealRow,
  previousStage: DealStage,
  newStage: DealStage,
): Promise<void> {
  if (!deal.assignedToId) return;
  try {
    const assignee = await db.query.users.findFirst({
      where: eq(users.id, deal.assignedToId),
      columns: { email: true, name: true },
    });
    if (!assignee?.email) return;
    await sendDealStageChangeEmail(
      assignee.email,
      assignee.name ?? "Team Member",
      deal.name,
      previousStage,
      newStage,
      deal.value,
      actorName,
      deal.id,
    );
  } catch {
  }
}

const COLUMN_KEYS = new Set([
  "name",
  "value",
  "stage",
  "probability",
  "contactPerson",
  "contactEmail",
  "contactPhone",
  "assignedToId",
  "expectedCloseDate",
  "actualCloseDate",
  "lostReason",
  "notes",
]);

export async function updateDeal(
  orgId: string,
  userId: string,
  actorName: string,
  dealId: number,
  input: UpdateDealInput,
): Promise<UpdateDealResult> {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  let previousStage: DealStage | null = null;
  let stageChanged = false;

  if (input.stage !== undefined) {
    const existing = await db.query.deals.findFirst({
      where: and(eq(deals.id, dealId), eq(deals.orgId, orgId)),
      columns: { stage: true, updatedAt: true },
    });

    if (input.version && existing?.updatedAt) {
      const clientVersion = new Date(input.version).getTime();
      const serverVersion = new Date(existing.updatedAt).getTime();
      if (clientVersion < serverVersion) {
        return { ok: false, reason: "version_conflict" };
      }
    }

    if (input.stage === "WON") {
      updateData.actualCloseDate = new Date().toISOString().split("T")[0];
      updateData.probability = 100;
    } else if (input.stage === "LOST") {
      updateData.actualCloseDate = new Date().toISOString().split("T")[0];
      updateData.probability = 0;
    }

    if (existing && existing.stage !== input.stage) {
      previousStage = (existing.stage ?? null) as DealStage | null;
      stageChanged = true;
      await db.insert(dealActivities).values({
        orgId,
        dealId,
        type: "stage_change",
        previousValue: existing.stage,
        newValue: input.stage,
        subject: `Stage changed from ${existing.stage} to ${input.stage}`,
        userId,
      });

      if (input.stage === "NEGOTIATION") {
        await maybeCreateNegotiationChannel(orgId, userId, dealId);
      }
    }
  }

  for (const [key, val] of Object.entries(input)) {
    if (val === undefined || !COLUMN_KEYS.has(key)) continue;
    updateData[key] = key === "value" ? String(val) : val;
  }

  const [updated] = await db
    .update(deals)
    .set(updateData)
    .where(and(eq(deals.id, dealId), eq(deals.orgId, orgId)))
    .returning();

  if (!updated) return { ok: false, reason: "not_found" };

  if (stageChanged && previousStage && input.stage) {
    void sendStageChangeNotification(orgId, actorName, updated, previousStage, input.stage);
  }

  return { ok: true, deal: updated, previousStage, stageChanged };
}
