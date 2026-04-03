import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err, parseQuery, parseBody, toNumber } from "@/lib/api/helpers";
import { getLeads } from "@/server/queries/leads";
import { db } from "@/lib/db";
import { leads, leadActivities, notifications } from "@/lib/db/schema";
import { evaluateAssignmentRules, recalculateLeadScore, applySlaPolicy } from "@/server/api/routers/lead-auto-triggers";
import { logger } from "@/lib/logger";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  source: z.enum(["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"]).optional(),
  assignedToId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["name", "email", "company", "status", "priority", "source", "score", "potentialValue", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  source: z.enum(["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"]).default("other"),
  campaignId: z.number().optional(),
  investmentInterest: z.string().optional(),
  potentialValue: z.string().optional(),
  notes: z.string().optional(),
  company: z.string().optional(),
  designation: z.string().optional(),
  city: z.string().optional(),
  referredBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).default("WARM"),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, listSchema);
    const data = await getLeads(session.orgId!, {
      ...filters,
      role: session.user.role ?? undefined,
      userId: session.user.id,
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);
    const orgId = session.orgId!;
    const userId = session.user.id;

    const [newLead] = await db.insert(leads).values({
      orgId,
      name: input.name,
      email: input.email || null,
      phone: input.phone,
      whatsappNumber: input.whatsappNumber,
      source: input.source,
      campaignId: input.campaignId,
      priority: input.priority,
      investmentInterest: input.investmentInterest,
      potentialValue: input.potentialValue,
      notes: input.notes,
      company: input.company,
      designation: input.designation,
      city: input.city,
      referredBy: input.referredBy,
      tags: input.tags,
      assignedToId: input.assignedToId || null,
      assignedById: input.assignedToId ? userId : null,
      assignedAt: input.assignedToId ? new Date() : null,
    }).returning();

    if (input.assignedToId) {
      await db.insert(notifications).values({
        orgId,
        userId: input.assignedToId,
        type: "INFO",
        title: "New Lead Assigned",
        message: `You have been assigned a new lead: ${input.name}`,
        link: `/crm/leads`,
      });
    }

    if (!input.assignedToId) {
      try {
        await evaluateAssignmentRules(db, orgId, newLead.id);
      } catch (err) {
        logger.error("Auto-trigger: assignment rules failed", { leadId: newLead.id, error: err });
      }
    }

    try { await recalculateLeadScore(db, orgId, newLead.id); } catch (e) {
      logger.error("Auto-trigger: lead scoring failed", { leadId: newLead.id, error: e });
    }

    try { await applySlaPolicy(db, orgId, newLead.id); } catch (e) {
      logger.error("Auto-trigger: SLA policy failed", { leadId: newLead.id, error: e });
    }

    return ok(newLead, 201);
  });
}
