import { z } from "zod";

/**
 * Response contracts for the goals module.
 * Derived from backend `goals-response.schemas.ts`.
 * wireDate() → z.string() on the wire.
 * NOT `.strict()`.
 */

const goalOwnerContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
});

const goalLevelContract = z.enum(["company", "team", "individual"]);
const goalStatusContract = z.enum([
  "not_started",
  "on_track",
  "at_risk",
  "off_track",
  "completed",
]);

/** `okr_goals` row. `POST /goals`, `PATCH /goals/:id` and check-in all answer this. */
export const goalRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  ownerMembershipId: z.number().int().nullable(),
  level: goalLevelContract,
  status: goalStatusContract,
  progress: z.number().int(),
  confidence: z.number().int().nullable(),
  version: z.number().int(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  parentGoalId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

/** `goalListItemSchema` — row + owner + keyResultCount + link counts + product linkage. */
export const goalListItemContract = goalRowContract.extend({
  target: z.string().nullable(),
  current: z.string().nullable(),
  owner: goalOwnerContract.nullable(),
  keyResultCount: z.number().int(),
  linkCount: z.number().int(),
  linkedTicketCount: z.number().int(),
  linkedProjectCount: z.number().int(),
  productLinkage: z
    .object({ managedProductId: z.number().int(), linkedAt: z.string() })
    .nullable()
    .default(null),
  linkedRoadmapItemCount: z.number().int().default(0),
  linkedOpportunityCount: z.number().int().default(0),
  outcomeReviews: z
    .object({
      scheduled: z.number().int(),
      completed: z.number().int(),
      latestResult: z.string().nullable(),
    })
    .nullable()
    .default(null),
  lastCheckInAt: z.string().nullable().default(null),
  checkInFreshness: z.enum(["fresh", "stale", "none"]).default("none"),
});

/** `goalsListResponseSchema` — offset page (no totalPages on this backend schema). */
export const goalsListContract = z.object({
  items: z.array(goalListItemContract),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

/** `goalStatsSchema` */
export const goalStatsContract = z.object({
  total: z.number().int(),
  byStatus: z.record(z.string(), z.number().int()),
  avgProgress: z.number(),
  atRisk: z.number().int(),
  completed: z.number().int(),
  staleCheckIns: z.number().int().default(0),
});

/**
 * `goalDetailSchema` — full goal with keyResults, updates, links. GET, PATCH,
 * and check-in for `/goals/:goalId` answer this shape.
 */
export const goalDetailContract = goalRowContract.extend({
  owner: goalOwnerContract.nullable(),
  project: z
    .object({ id: z.number().int(), name: z.string(), key: z.string() })
    .nullable(),
  keyResults: z.array(
    z.object({
      id: z.number().int(),
      orgId: z.string(),
      goalId: z.number().int(),
      title: z.string(),
      metricType: z.enum(["number", "percentage", "currency", "boolean"]),
      startValue: z.string(),
      targetValue: z.string(),
      currentValue: z.string(),
      unit: z.string().nullable(),
      status: goalStatusContract,
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  updates: z.array(
    z.object({
      id: z.number().int(),
      keyResultId: z.number().int().nullable(),
      note: z.string().nullable(),
      previousValue: z.string().nullable(),
      newValue: z.string().nullable(),
      createdAt: z.string(),
      userId: z.string().nullable(),
      userName: z.string().nullable(),
      userImage: z.string().nullable(),
    }),
  ),
  links: z.array(
    z.object({
      id: z.number().int(),
      ticketId: z.number().int().nullable(),
      projectId: z.number().int().nullable(),
      createdAt: z.string(),
      ticketTitle: z.string().nullable(),
      ticketProjectId: z.number().int().nullable(),
      projectName: z.string().nullable(),
      projectKey: z.string().nullable(),
    }),
  ),
  measurementSources: z
    .array(
      z.object({
        id: z.number().int(),
        title: z.string(),
        metric: z.string().nullable(),
        unit: z.string().nullable(),
        baseline: z.string().nullable(),
        target: z.string().nullable(),
        actual: z.string().nullable(),
        state: z.string(),
        result: z.string().nullable(),
        completedAt: z.string().nullable(),
      }),
    )
    .default([]),
  linkedRoadmapItems: z
    .array(
      z.object({
        id: z.number().int(),
        title: z.string(),
        horizon: z.string(),
        status: z.string(),
      }),
    )
    .default([]),
});

/** `goalProductLinkSchema` — POST /goals/:goalId/products/:managedProductId 201 body. */
export const goalProductLinkContract = z.object({
  id: z.number().int(),
  managedProductId: z.number().int(),
  linkedAt: z.string(),
});

/** `goalLinkCreatedSchema` */
export const goalLinkCreatedContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  goalId: z.number().int(),
  ticketId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  createdAt: z.string(),
});

/** `goalSuccessSchema` */
export const goalSuccessContract = z.object({ success: z.literal(true) });
