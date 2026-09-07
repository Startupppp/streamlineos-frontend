import { z } from "zod";

const dealSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  value: z.string().nullable(),
  stage: z.string(),
  companyName: z.string().nullable(),
  contactName: z.string().nullable(),
  assignedToId: z.string().nullable(),
  salesRepId: z.number().int().nullable(),
  pipelineId: z.string().nullable(),
  probability: z.number().int().nullable(),
  expectedCloseDate: z.string().nullable(),
  actualCloseDate: z.string().nullable(),
  lastContactDate: z.string().nullable(),
  lostReason: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  customData: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const dealContract = dealSchema;

export const dealListContract = z.object({
  deals: z.array(dealSchema),
  total: z.number().int(),
  hasMore: z.boolean().optional(),
  nextCursor: z.string().nullable().optional(),
});

export const dealStatsContract = z.object({
  active: z.number().int(),
  pipelineValue: z.number(),
  wonValue: z.number(),
});

export const dealAgingContract = z.object({
  summary: z.object({
    total: z.number().int(),
    stale: z.number().int(),
    critical: z.number().int(),
  }),
  deals: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      value: z.string().nullable(),
      stage: z.string(),
      updatedAt: z.string(),
      createdAt: z.string(),
      assignedToId: z.string().nullable(),
      assigneeName: z.string().nullable(),
      daysInStage: z.number().int(),
      isStale: z.boolean(),
      isCritical: z.boolean(),
    }),
  ),
});

export const dealForecastContract = z.object({
  totalWeighted: z.number(),
  totalBestCase: z.number(),
  totalDeals: z.number().int(),
  byMonth: z.array(
    z.object({
      month: z.string(),
      weighted: z.number(),
      bestCase: z.number(),
      count: z.number().int(),
    }),
  ),
  byStage: z.array(
    z.object({
      stage: z.string(),
      count: z.number().int(),
      totalValue: z.number(),
      weightedValue: z.number(),
      avgProbability: z.number().int(),
    }),
  ),
});

const dealForecastSnapshotSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  period: z.string(),
  createdById: z.string().nullable(),
  overrideAmount: z.string().nullable(),
  overrideNote: z.string().nullable(),
  overriddenBy: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  capturedAt: z.string(),
});

export const dealForecastSnapshotsContract = z.object({
  snapshots: z.array(dealForecastSnapshotSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const dealForecastSnapshotContract = dealForecastSnapshotSchema;

export const dealWinLossContract = z.object({
  summary: z.object({
    won: z.number().int(),
    wonValue: z.number(),
    lost: z.number().int(),
    lostValue: z.number(),
    total: z.number().int(),
    winRate: z.number().int(),
  }),
  lostByReason: z.array(
    z.object({
      reason: z.string(),
      count: z.number().int(),
      totalValue: z.number(),
    }),
  ),
});

export const dealHealthContract = z.object({
  dealId: z.number().int(),
  score: z.number().int(),
  level: z.enum(["healthy", "at_risk", "critical"]),
  factors: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      impact: z.enum(["positive", "negative", "neutral"]),
      weight: z.number().int(),
    }),
  ),
  computedAt: z.string(),
});

export const dealApprovalContract = z.object({
  id: z.number().int(),
  dealId: z.number().int(),
  dealName: z.string().nullable(),
  dealValue: z.string().nullable(),
  requestedBy: z.string(),
  requesterName: z.string().nullable(),
  requestedStage: z.string(),
  status: z.string(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
});

export const dealApprovalsListContract = z.array(dealApprovalContract);

const dealStakeholderSchema = z.object({
  id: z.number().int(),
  dealId: z.number().int(),
  contactId: z.number().int(),
  roleKey: z.string().nullable(),
  influence: z.string().nullable(),
  isPrimary: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  contact: z.object({
    id: z.number().int(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    title: z.string().nullable(),
    company: z.string().nullable(),
  }),
});

export const dealStakeholdersListContract = z.array(dealStakeholderSchema);
export const dealStakeholderContract = dealStakeholderSchema;

const dealCompetitorSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  dealId: z.number().int(),
  name: z.string(),
  notes: z.string().nullable(),
  strength: z.string().nullable(),
  weakness: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const dealCompetitorsListContract = z.array(dealCompetitorSchema);
export const dealCompetitorContract = dealCompetitorSchema;

const dealMeetingSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  dealId: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().nullable(),
  location: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: z.object({ id: z.string(), name: z.string().nullable() }).nullable().optional(),
  attendees: z.array(z.string()),
});

export const dealMeetingsListContract = z.array(dealMeetingSchema);
export const dealMeetingContract = dealMeetingSchema;

export const dealActivityContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  dealId: z.number().int(),
  type: z.string(),
  subject: z.string().nullable(),
  previousValue: z.string().nullable(),
  newValue: z.string().nullable(),
  notes: z.string().nullable(),
  userId: z.string().nullable(),
  createdAt: z.string(),
});

export const dealStageTransitionsContract = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      dealId: z.number().int(),
      fromStage: z.string().nullable(),
      toStage: z.string(),
      userId: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

export const dealUpdateResultContract = z.union([
  dealSchema,
  z.object({
    approvalPending: z.literal(true),
    approvalId: z.number().int(),
    deal: dealSchema,
  }),
]);

export const dealDeleteContract = z.object({ success: z.boolean() });
export const dealBulkResultContract = z.object({ updated: z.number().int() });
export const dealBulkDeleteContract = z.object({ deleted: z.number().int() });
