import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCache, invalidateCachePattern, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { getDeals } from "@/server/queries/crm";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { z } from "zod";

const listSchema = z.object({
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).optional(),
  assignedToId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  value: z.coerce.number().min(0).optional(),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).default("LEAD"),
  probability: z.number().min(0).max(100).optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  assignedToId: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  leadId: z.number().optional(),
  clientId: z.number().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, listSchema);
    const hash = Buffer.from(
      JSON.stringify({ ...filters, userId: session.user.id, role: session.user.role }),
    ).toString("base64");
    const data = await cached(
      CACHE_KEYS.dealsList(session.orgId, hash),
      () => getDeals(session.orgId!, { ...filters, role: session.user.role ?? undefined, userId: session.user.id }),
      { ttlSeconds: CACHE_TTL.SHORT },
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [deal] = await db.insert(deals).values({
      orgId: session.orgId!,
      name: input.name,
      value: String(input.value ?? 0),
      stage: input.stage,
      probability: input.probability ?? 0,
      contactPerson: input.contactPerson || null,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      assignedToId: input.assignedToId || session.user.id,
      expectedCloseDate: input.expectedCloseDate || null,
      notes: input.notes || null,
      leadId: input.leadId || null,
      clientId: input.clientId || null,
    }).returning();

    await Promise.all([
      invalidateCache(CACHE_KEYS.dealsForecast(session.orgId)),
      invalidateCachePattern(`deals:list:${session.orgId}:*`),
    ]);
    if (deal) {
      void createAuditLog({
        action: "deal.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(deal.id),
        targetType: "deal",
        metadata: { name: deal.name, stage: deal.stage, value: deal.value },
      }).catch(() => {});
    }
    return ok(deal, 201);
  });
}
