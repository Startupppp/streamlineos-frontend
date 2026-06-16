import { type NextRequest } from "next/server";
import { withAbility, ok, parseBody } from "@/lib/api/helpers";
import { getOrgHealthConfig, upsertOrgHealthConfig } from "@/lib/services/cs-health";
import { z } from "zod";

const weightSchema = z.object({
  sla: z.number().int().min(0).max(100),
  csat: z.number().int().min(0).max(100),
  activity: z.number().int().min(0).max(100),
  renewal: z.number().int().min(0).max(100),
  tickets: z.number().int().min(0).max(100),
});

const updateSchema = z
  .object({
    weights: weightSchema,
    thresholds: z.object({
      healthy: z.number().int().min(0).max(100),
      atRisk: z.number().int().min(0).max(100),
    }),
  })
  .refine(
    (val) => val.weights.sla + val.weights.csat + val.weights.activity + val.weights.renewal + val.weights.tickets > 0,
    { message: "At least one weight must be greater than zero", path: ["weights"] },
  )
  .refine((val) => val.thresholds.healthy > val.thresholds.atRisk, {
    message: "Healthy threshold must be greater than at-risk threshold",
    path: ["thresholds", "healthy"],
  });

export async function GET() {
  return withAbility("read", "crm:clients", async (session) => {
    const config = await getOrgHealthConfig(session.orgId);
    return ok(config);
  });
}

export async function PUT(req: NextRequest) {
  return withAbility("update", "crm:clients", async (session) => {
    const input = await parseBody(req, updateSchema);
    const updated = await upsertOrgHealthConfig(session.orgId, session.user.id, input.weights, input.thresholds);
    return ok(updated);
  });
}
