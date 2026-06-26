import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getOrgFeatureFlags, setOrgFeatureFlag, type OrgFeatureFlags } from "@/lib/org-features";
import { getSessionAbility } from "@/lib/abilities-server";
import { z } from "zod";

const updateSchema = z.object({
  flag: z.enum([
    "aiChat",
    "aiLeadScoring",
    "aiEmailDraft",
    "aiSmartNotifications",
    "aiWeeklyRecap",
  ] as const satisfies readonly (keyof OrgFeatureFlags)[]),
  enabled: z.boolean(),
});

export async function GET() {
  return withAuth(async (session) => {
    const flags = await getOrgFeatureFlags(session.orgId);
    return ok(flags);
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can("manage", "settings")) {
      return err("Forbidden", 403);
    }

    const { flag, enabled } = await parseBody(req, updateSchema);
    await setOrgFeatureFlag(session.orgId, flag, enabled);
    return ok({ success: true, flag, enabled });
  });
}
