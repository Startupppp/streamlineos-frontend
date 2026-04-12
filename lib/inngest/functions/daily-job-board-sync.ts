/**
 * Inngest cron: Daily job board sync at midnight UTC.
 * Iterates all active integrations across all orgs and triggers sync.
 * In production each platform branch would call the real API; here we
 * record the sync timestamp and leave the API call as a documented stub.
 */

import { inngest } from "../client";
import { db } from "@/lib/db";
import { candidateSources } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const dailyJobBoardSync = inngest.createFunction(
  { id: "daily-job-board-sync", name: "Daily Job Board Sync", triggers: { cron: "0 0 * * *" } },
  async ({ step }) => {
    // Step 1: fetch all active integrations that have an OAuth token
    const activeSources = await step.run("fetch-active-sources", async () => {
      return db
        .select({
          id: candidateSources.id,
          orgId: candidateSources.orgId,
          platform: candidateSources.platform,
        })
        .from(candidateSources)
        .where(
          and(
            eq(candidateSources.isActive, true),
            isNotNull(candidateSources.oauthToken)
          )
        );
    });

    if (activeSources.length === 0) {
      logger.info("[daily-job-board-sync] No active integrations found.");
      return { synced: 0 };
    }

    // Step 2: sync each integration
    let syncedCount = 0;

    for (const source of activeSources) {
      await step.run(`sync-${source.orgId}-${source.platform}`, async () => {
        try {
          // In production: call platform API here using stored oauthToken
          // e.g. for LinkedIn: await syncLinkedInApplications(source.orgId, source.oauthToken)
          // e.g. for Naukri: await syncNaukriApplications(source.orgId, source.oauthToken)

          await db
            .update(candidateSources)
            .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
            .where(eq(candidateSources.id, source.id));

          syncedCount++;
          logger.info(`[daily-job-board-sync] Synced ${source.platform} for org ${source.orgId}`);
        } catch (error) {
          logger.error(
            `[daily-job-board-sync] Failed to sync ${source.platform} for org ${source.orgId}: ${error}`
          );
        }
      });
    }

    return { synced: syncedCount, total: activeSources.length };
  }
);
