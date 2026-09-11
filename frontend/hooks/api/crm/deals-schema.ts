import { z } from "zod";

const dealUserRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const dealSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  leadId: z.number().int().nullable(),
  clientId: z.number().int().nullable(),
  name: z.string(),
  value: z.string().nullable(),
  stage: z.string(),
  probability: z.number().nullable(),
  contactPerson: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  assignedToId: z.string().nullable(),
  lastContactDate: z.string().nullable(),
  expectedCloseDate: z.string().nullable(),
  actualCloseDate: z.string().nullable(),
  lostReason: z.string().nullable(),
  notes: z.string().nullable(),
  pipelineId: z.string().nullable(),
  partyId: z.string().nullable(),
  subjectId: z.string().nullable(),
  forecastCategory: z.string().nullable(),
  nextStep: z.string().nullable(),
  healthScore: z.number().nullable(),
  followUpNotes: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  assignedTo: dealUserRefSchema.nullable().optional(),
  lead: z.object({ id: z.number().int(), name: z.string(), email: z.string().nullable().optional(), phone: z.string().nullable().optional() }).nullable().optional(),
  client: z.object({ id: z.number().int(), name: z.string() }).nullable().optional(),
});

export const dealContract = dealSchema;

export const dealListContract = z.object({
  items: z.array(dealSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
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

const forecastSnapshotDataSchema = z.object({
  byCategory: z.array(z.object({
    category: z.string(),
    totalValue: z.number(),
    weightedValue: z.number(),
    dealCount: z.number().int(),
  })),
  byRep: z.array(z.object({
    repId: z.string(),
    repName: z.string(),
    totalValue: z.number(),
    weightedValue: z.number(),
    dealCount: z.number().int(),
  })),
  totalWeighted: z.number(),
  totalBestCase: z.number(),
  totalDeals: z.number().int(),
  period: z.string(),
});

const dealForecastSnapshotSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  period: z.string(),
  capturedAt: z.string(),
  createdById: z.string().nullable(),
  data: forecastSnapshotDataSchema,
  overrideAmount: z.string().nullable(),
  overrideNote: z.string().nullable(),
  overriddenBy: z.string().nullable(),
  createdAt: z.string(),
});

export const dealForecastSnapshotsContract = z.array(dealForecastSnapshotSchema);
export const dealForecastSnapshotContract = dealForecastSnapshotSchema;

export const dealWinLossContract = z.object({
  summary: z.object({
    won: z.number().int(),
    wonValue: z.number(),
    lost: z.number().int(),
    lostValue: z.number(),
    total: z.number().int(),
    winRate: z.number(),
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
  score: z.number(),
  level: z.enum(["healthy", "at_risk", "critical", "unknown"]),
  factors: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      impact: z.enum(["positive", "negative", "neutral"]),
      weight: z.number(),
    }),
  ),
  computedAt: z.string(),
});

export const dealApprovalContract = z.object({
  id: z.number().int(),
  dealId: z.number().int(),
  dealName: z.string().nullable(),
  dealValue: z.string().nullable(),
  requesterName: z.string().nullable(),
  requestedStage: z.string(),
  status: z.string(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
});

export const dealApprovalsListContract = z.array(dealApprovalContract);

const dealStakeholderSchema = z.object({
  id: z.string(),
  dealId: z.number().int(),
  contactId: z.number().int(),
  roleKey: z.string().nullable(),
  influence: z.string().nullable(),
  isPrimary: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  contact: z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string().nullable(),
    title: z.string().nullable(),
    company: z.string().nullable(),
  }),
});

export const dealStakeholdersListContract = z.array(dealStakeholderSchema);
export const dealStakeholderContract = dealStakeholderSchema;

const dealCompetitorSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  dealId: z.number().int(),
  competitorKey: z.string(),
  status: z.string(),
  notes: z.string().nullable(),
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
  scheduledAt: z.string(),
  durationMinutes: z.number().int(),
  attendees: z.array(z.string()).nullable(),
  agenda: z.string().nullable(),
  notes: z.string().nullable(),
  actionItems: z.string().nullable(),
  recordingLink: z.string().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: z.object({ id: z.string(), name: z.string().nullable() }).nullable().optional(),
});

export const dealMeetingsListContract = z.array(dealMeetingSchema);
export const dealMeetingContract = dealMeetingSchema;

export const dealActivityContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  dealId: z.number().int(),
  type: z.enum(["note", "call", "email", "meeting", "document", "stage_change"] as const),
  previousValue: z.string().nullable(),
  newValue: z.string().nullable(),
  subject: z.string().nullable(),
  notes: z.string().nullable(),
  duration: z.number().nullable(),
  userId: z.string(),
  createdAt: z.string().nullable(),
  user: dealUserRefSchema.nullable().optional(),
});

export const dealStageTransitionsContract = z.object({
  data: z.array(
    z.object({
      dealStageTransitionId: z.string(),
      fromStage: z.string().nullable(),
      toStage: z.string(),
      actorKind: z.enum(["human", "system"]),
      actorLabel: z.string().nullable(),
      actorName: z.string().nullable(),
      reason: z.string().nullable(),
      occurredAt: z.string(),
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
export const stakeholderDeleteContract = z.object({ deleted: z.boolean() });
export const dealBulkResultContract = z.object({ updated: z.number().int() });
export const dealBulkDeleteContract = z.object({ deleted: z.number().int() });
