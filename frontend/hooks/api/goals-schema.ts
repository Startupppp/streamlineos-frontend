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
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  parentGoalId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

/** `goalListItemSchema` — row + owner + keyResultCount. */
export const goalListItemContract = goalRowContract.extend({
  owner: goalOwnerContract.nullable(),
  keyResultCount: z.number().int(),
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
