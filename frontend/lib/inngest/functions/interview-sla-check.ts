import { inngest } from "../client";
import { db } from "@/lib/db";
import { candidateSlaTracking, interviewSlas } from "@/lib/db/schema";
import { eq, ne, inArray } from "drizzle-orm";
import { notifyByRoles } from "@/server/actions/create-notification";

export const interviewSlaCheck = inngest.createFunction(
  { id: "interview-sla-check", name: "Interview SLA Check", triggers: { cron: "*/15 * * * *" } },
  async ({ step }) => {
    const results = await step.run("check-interview-sla-statuses", async () => {
      const now = new Date();

      const trackingRecords = await db
        .select()
        .from(candidateSlaTracking)
        .where(ne(candidateSlaTracking.status, "BREACHED"))
        .limit(500);

      if (trackingRecords.length === 0) return { updated: 0, breached: 0 };

      const orgIds = [...new Set(trackingRecords.map((r) => r.orgId))];

      const slaPolicies = await db
        .select()
        .from(interviewSlas)
        .where(inArray(interviewSlas.orgId, orgIds));

      const policyMap = new Map(
        slaPolicies.map((p) => [`${p.orgId}:${p.stage}`, p])
      );

      let updated = 0;
      let breached = 0;

      for (const record of trackingRecords) {
        const policy = policyMap.get(`${record.orgId}:${record.stage}`);
        if (!policy) continue;

        const elapsedHours =
          (now.getTime() - new Date(record.enteredAt).getTime()) / (1000 * 60 * 60);

        if (elapsedHours >= policy.maxHours) {
          await db
            .update(candidateSlaTracking)
            .set({ status: "BREACHED", breachedAt: now, updatedAt: now })
            .where(eq(candidateSlaTracking.id, record.id));

          await notifyByRoles(record.orgId, ["HR", "CEO"], {
            type: "WARNING",
            title: "Interview SLA Breached",
            message: `Candidate #${record.candidateId} has exceeded the ${policy.maxHours}h SLA for stage "${record.stage}".`,
            link: `/hr/recruitment/candidates/${record.candidateId}`,
            metadata: {
              candidateId: record.candidateId,
              stage: record.stage,
              elapsedHours: Math.round(elapsedHours),
            },
          });

          void import("@/lib/services/automation/engine").then(({ runAutomationsForEvent }) =>
            runAutomationsForEvent(record.orgId, "sla.breached", {
              candidateId: record.candidateId,
              candidateName: `Candidate #${record.candidateId}`,
              stage: record.stage,
              enteredAt: new Date(record.enteredAt).toISOString(),
              breachedAt: now.toISOString(),
              hoursInStage: Math.round(elapsedHours),
            })
          );

          breached++;
          updated++;
        } else if (elapsedHours >= policy.warningHours && record.status === "ON_TRACK") {
          await db
            .update(candidateSlaTracking)
            .set({ status: "AT_RISK", updatedAt: now })
            .where(eq(candidateSlaTracking.id, record.id));

          await notifyByRoles(record.orgId, ["HR"], {
            type: "INFO",
            title: "Interview SLA At Risk",
            message: `Candidate #${record.candidateId} is approaching the ${policy.maxHours}h SLA limit for stage "${record.stage}" (${Math.round(elapsedHours)}h elapsed).`,
            link: `/hr/recruitment/candidates/${record.candidateId}`,
            metadata: {
              candidateId: record.candidateId,
              stage: record.stage,
              elapsedHours: Math.round(elapsedHours),
            },
          });

          updated++;
        }
      }

      return { updated, breached };
    });

    return results;
  }
);
