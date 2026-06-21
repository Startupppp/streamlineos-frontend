import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers, candidates, candidateApplications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

type RouteParams = { params: Promise<{ candidateId: string; offerId: string }> };

const HR_ROLES = ["CEO", "ADMIN", "HR", "BRANCH_HR"];

const updateOfferSchema = z.object({
  offerStatus: z.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "COUNTERED", "EXPIRED"]).optional(),
  offeredSalary: z.number().positive().optional(),
  offeredDesignation: z.string().min(1).optional(),
  joiningDate: z.string().optional(),
  offerLetterUrl: z.string().url().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  sentAt: z.string().optional(),
  viewedAt: z.string().optional(),
  respondedAt: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: cid, offerId: oid } = await params;
    const candidateId = Number(cid);
    const offerId = Number(oid);
    if (!Number.isFinite(candidateId) || !Number.isFinite(offerId)) return err("Invalid ID", 400);

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    const input = await parseBody(req, updateOfferSchema);
    

    const existing = await db.query.candidateOffers.findFirst({
      where: and(
        eq(candidateOffers.id, offerId),
        eq(candidateOffers.candidateId, candidateId),
        eq(candidateOffers.orgId, session.orgId),
      ),
      columns: { id: true, offerStatus: true, offeredSalary: true, joiningDate: true, validUntil: true },
    });
    if (!existing) return err("Offer not found", 404);

    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (input.offerStatus !== undefined) {
      updateData.offerStatus = input.offerStatus;
      if (input.offerStatus === "SENT" && !input.sentAt) updateData.sentAt = now;
      if (input.offerStatus === "VIEWED" && !input.viewedAt) updateData.viewedAt = now;
      if (["ACCEPTED", "DECLINED", "COUNTERED"].includes(input.offerStatus) && !input.respondedAt) {
        updateData.respondedAt = now;
      }
    }
    if (input.offeredSalary !== undefined) updateData.offeredSalary = String(input.offeredSalary);
    if (input.offeredDesignation !== undefined) updateData.offeredDesignation = input.offeredDesignation;
    if (input.joiningDate !== undefined) updateData.joiningDate = input.joiningDate;
    if (input.offerLetterUrl !== undefined) updateData.offerLetterUrl = input.offerLetterUrl;
    if (input.validUntil !== undefined) updateData.validUntil = input.validUntil;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.sentAt !== undefined) updateData.sentAt = new Date(input.sentAt);
    if (input.viewedAt !== undefined) updateData.viewedAt = new Date(input.viewedAt);
    if (input.respondedAt !== undefined) updateData.respondedAt = new Date(input.respondedAt);

    const [updated] = await db
      .update(candidateOffers)
      .set(updateData)
      .where(eq(candidateOffers.id, offerId))
      .returning();

    if (
      input.offerStatus === "SENT" ||
      input.offerStatus === "ACCEPTED" ||
      input.offerStatus === "DECLINED"
    ) {
      void import("@/lib/services/automation/engine").then(async ({ runAutomationsForEvent }) => {
        const [candidate, latestApp] = await Promise.all([
          db.query.candidates.findFirst({
            where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
            columns: { firstName: true, lastName: true, email: true },
          }),
          db.query.candidateApplications.findFirst({
            where: eq(candidateApplications.candidateId, candidateId),
            with: { jobPosting: { columns: { title: true } } },
            orderBy: (t, { desc }) => [desc(t.appliedAt)],
          }),
        ]);
        const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "";
        const candidateEmail = candidate?.email ?? "";
        const jobTitle = latestApp?.jobPosting?.title ?? "";

        if (input.offerStatus === "SENT" && existing.offerStatus !== "SENT") {
          await runAutomationsForEvent(session.orgId, "offer.sent", {
            offerId, candidateId, candidateName, candidateEmail, jobTitle,
            offeredSalary: updated.offeredSalary ?? "",
            joiningDate: updated.joiningDate ?? null,
            validUntil: updated.validUntil ?? null,
            sentAt: new Date().toISOString(),
          });
        } else if (input.offerStatus === "ACCEPTED") {
          await runAutomationsForEvent(session.orgId, "offer.accepted", {
            offerId, candidateId, candidateName, candidateEmail, jobTitle,
            decision: "ACCEPTED",
            respondedAt: new Date().toISOString(),
          });
        } else if (input.offerStatus === "DECLINED") {
          await runAutomationsForEvent(session.orgId, "offer.rejected", {
            offerId, candidateId, candidateName, candidateEmail, jobTitle,
            decision: "REJECTED",
            respondedAt: new Date().toISOString(),
          });
        }
      });
    }

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: cid, offerId: oid } = await params;
    const candidateId = Number(cid);
    const offerId = Number(oid);
    if (!Number.isFinite(candidateId) || !Number.isFinite(offerId)) return err("Invalid ID", 400);

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    const existing = await db.query.candidateOffers.findFirst({
      where: and(
        eq(candidateOffers.id, offerId),
        eq(candidateOffers.candidateId, candidateId),
        eq(candidateOffers.orgId, session.orgId),
      ),
      columns: { id: true },
    });
    if (!existing) return err("Offer not found", 404);

    await db.delete(candidateOffers).where(eq(candidateOffers.id, offerId));

    return ok({ success: true });
  });
}
