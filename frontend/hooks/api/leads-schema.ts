import { z } from "zod";

const leadPartySchema = z.object({
  id: z.number().int(),
  partyId: z.string(),
  orgId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  whatsappNumber: z.string().nullable(),
  source: z.string(),
  subSource: z.string().nullable(),
  campaignId: z.number().int().nullable(),
  status: z.string(),
  priority: z.string(),
  investmentInterest: z.string().nullable(),
  potentialValue: z.string().nullable(),
  notes: z.string().nullable(),
  assignedToId: z.string().nullable(),
  assignedById: z.string().nullable(),
  verifiedById: z.string().nullable(),
  assignedAt: z.string().nullable(),
  convertedAt: z.string().nullable(),
  lostReason: z.string().nullable(),
  company: z.string().nullable(),
  designation: z.string().nullable(),
  city: z.string().nullable(),
  referredBy: z.string().nullable(),
  tags: z.array(z.string()),
  score: z.number().int().nullable(),
  slaDeadline: z.string().nullable(),
  website: z.string().nullable(),
  followUpDate: z.string().nullable(),
  followUpNotes: z.string().nullable(),
  customData: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const assigneeSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

export const leadPartyContract = leadPartySchema;

export const leadDetailContract = leadPartySchema.extend({
  assignedTo: assigneeSchema.extend({ email: z.string().nullable() }).nullable(),
  assignedBy: z.object({ id: z.string(), name: z.string().nullable() }).nullable(),
  campaign: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  activities: z.array(
    z.object({
      id: z.number().int(),
      orgId: z.string(),
      leadId: z.number().int(),
      type: z.string(),
      date: z.string(),
      duration: z.number().int().nullable(),
      subject: z.string().nullable(),
      location: z.string().nullable(),
      locationLink: z.string().nullable(),
      messageSummary: z.string().nullable(),
      notes: z.string().nullable(),
      outcome: z.string().nullable(),
      userId: z.string().nullable(),
      createdAt: z.string(),
      user: z.object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable() }).nullable(),
    }),
  ),
});

export const leadListContract = z.object({
  leads: z.array(
    leadPartySchema.extend({
      assignedTo: assigneeSchema.nullable(),
      campaign: z.object({ id: z.number().int(), name: z.string() }).nullable(),
    }),
  ),
  totalCount: z.number().int().optional(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const leadBoardContract = z.record(
  z.string(),
  z.object({
    leads: z.array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        company: z.string().nullable(),
        source: z.string(),
        priority: z.string(),
        status: z.string(),
        score: z.number().int().nullable(),
        potentialValue: z.string().nullable(),
        slaDeadline: z.string().nullable(),
        createdAt: z.string(),
        assignedTo: assigneeSchema.nullable(),
      }),
    ),
    total: z.number().int(),
  }),
);

export const leadStatsContract = z.object({
  total: z.number().int(),
  byStatus: z.record(z.string(), z.number().int()),
  conversionRate: z.number(),
  totalPotentialValue: z.number(),
  unassigned: z.number().int(),
  thisMonth: z.number().int(),
});

export const leadActivityContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  leadId: z.number().int(),
  type: z.string(),
  date: z.string(),
  duration: z.number().int().nullable(),
  subject: z.string().nullable(),
  location: z.string().nullable(),
  locationLink: z.string().nullable(),
  messageSummary: z.string().nullable(),
  notes: z.string().nullable(),
  outcome: z.string().nullable(),
  userId: z.string().nullable(),
  createdAt: z.string(),
  user: z.object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable() }).nullable().optional(),
});

export const leadTimelineContract = z.array(
  z.object({
    id: z.number().int(),
    type: z.enum(["note", "task", "email", "activity"]),
    timestamp: z.string().nullable(),
    data: z.record(z.string(), z.unknown()),
  }),
);

export const leadScoreExplanationContract = z.object({
  score: z.number().int(),
  firedRules: z.array(
    z.object({
      name: z.string(),
      field: z.string(),
      operator: z.string(),
      value: z.string(),
      points: z.number().int(),
      dimension: z.string(),
    }),
  ),
  totalRules: z.number().int(),
  dimensionBreakdown: z.record(z.string(), z.number()),
});

export const leadsSourceReportContract = z.object({
  sources: z.array(
    z.object({
      source: z.string(),
      count: z.number().int(),
      converted: z.number().int(),
      conversionRate: z.number(),
      totalValue: z.number(),
    }),
  ),
  total: z.number().int(),
});

export const leadsDuplicateGroupsContract = z.object({
  groups: z.array(z.record(z.string(), z.unknown())),
  total: z.number().int(),
});

export const leadsCheckDuplicatesContract = z.object({
  duplicates: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    company: z.string().nullable(),
    status: z.string(),
    createdAt: z.string().nullable(),
  })),
});

export const leadsMergeContract = z.object({
  merged: z.literal(true),
  winner: leadPartySchema,
});

export const leadsBulkUpdateContract = z.object({
  updated: z.number().int(),
});

export const leadsBulkDeleteContract = z.object({
  deleted: z.number().int(),
  requested: z.number().int(),
});

export const leadsImportContract = z.object({
  imported: z.number().int(),
  skipped: z.number().int(),
  updated: z.number().int(),
  errors: z.array(z.unknown()),
  duplicatesFound: z.number().int(),
  distributed: z.number().int(),
  salesPeopleCount: z.number().int(),
});

export const leadsDistributeContract = z.object({
  distributed: z.number().int(),
  salesPeople: z.number().int(),
  totalSalesPeople: z.number().int(),
  absentCount: z.number().int(),
  absentNames: z.array(z.string()),
  summary: z.array(
    z.object({ userId: z.string(), name: z.string(), count: z.number().int() }),
  ),
});

export const leadsSlaAlertsContract = z.object({
  total: z.number().int(),
  leads: z.array(leadPartySchema),
});

export const leadsFollowUpsContract = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      company: z.string().nullable(),
      status: z.string(),
      priority: z.string(),
      followUpDate: z.string().nullable(),
      followUpNotes: z.string().nullable(),
      assignedToId: z.string().nullable(),
      assigneeName: z.string().nullable(),
    }),
  ),
  total: z.number().int(),
});

export const leadsAnalyticsContract = z.object({
  totalLeads: z.number().int(),
  totalLeadsPrevPeriod: z.number().int(),
  conversionRate: z.number(),
  conversionRatePrevPeriod: z.number(),
  totalRevenue: z.number(),
  conversionBySource: z.array(
    z.object({
      source: z.string(),
      count: z.number().int(),
      converted: z.number().int(),
      conversionRate: z.number(),
      totalValue: z.number(),
    }),
  ),
  monthlyRevenue: z.array(z.object({ month: z.string(), revenue: z.number() })),
  assignmentDistribution: z.array(
    z.object({ userId: z.string(), name: z.string(), count: z.number().int() }),
  ),
});

export const leadsDeleteContract = z.object({ success: z.boolean() });

export const leadsSalesLeaderboardContract = z.array(
  z.object({
    userId: z.string(),
    name: z.string().nullable(),
    count: z.number().int(),
  }),
);

export const leadsSalesTeamCapacityContract = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    activeLeads: z.number().int(),
  }),
);
