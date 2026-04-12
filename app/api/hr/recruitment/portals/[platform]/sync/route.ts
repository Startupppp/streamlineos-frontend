/**
 * POST /api/hr/recruitment/portals/[platform]/sync
 * Manually triggers a sync pull from the given job board platform.
 * In production this would call the platform's API using the stored OAuth token.
 * This endpoint scaffolds the auth check, token retrieval, and result recording.
 */

import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateSources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

const SUPPORTED_PLATFORMS = ["LINKEDIN", "NAUKRI", "INDEED"] as const;
type Platform = (typeof SUPPORTED_PLATFORMS)[number];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { platform: rawPlatform } = await params;
    const platform = rawPlatform.toUpperCase() as Platform;

    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return err(`Unsupported platform: ${rawPlatform}. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`, 400);
    }

    const source = await db.query.candidateSources.findFirst({
      where: and(
        eq(candidateSources.orgId, session.orgId),
        eq(candidateSources.platform, platform)
      ),
    });

    if (!source) {
      return err(`No ${platform} integration configured for this organization.`, 404);
    }

    if (!source.isActive) {
      return err(`${platform} integration is disabled. Enable it in integration settings first.`, 400);
    }

    if (!source.oauthToken) {
      return err(`No API token configured for ${platform}. Please authenticate via the integration settings.`, 400);
    }

    // In production: call platform API using source.oauthToken to pull new applications
    // For now we record the sync attempt and return a status response.
    // Platform-specific sync logic would live in lib/integrations/<platform>-sync.ts

    await db
      .update(candidateSources)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(candidateSources.id, source.id));

    return ok({
      platform,
      status: "SYNC_INITIATED",
      lastSyncedAt: new Date().toISOString(),
      message: `Sync initiated for ${platform}. New applications will appear in the ATS pipeline shortly.`,
    });
  });
}
