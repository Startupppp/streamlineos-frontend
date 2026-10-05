import { z } from "zod";

export const OPENAPI_HASH = "sha256:625d07220bcffc252da83208d6820047fe6612cfa983dff08cde0dfbb2cedf1b" as const;

export const agentTokensListResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  tokenPrefix: z.string(),
  scopes: z.array(z.string()),
  lastUsedAt: z.iso.datetime({ offset: true }).nullable(),
  expiresAt: z.iso.datetime({ offset: true }).nullable(),
  revokedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
}));
export type AgentTokensListResponse = z.infer<typeof agentTokensListResponseSchema>;

export const agentTokensCreateResponseSchema = z.object({
  token: z.string(),
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  tokenPrefix: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type AgentTokensCreateResponse = z.infer<typeof agentTokensCreateResponseSchema>;

export const agentTokensCreateBodySchema = z.strictObject({
  name: z.string(),
  expiresInDays: z.number().int().gte(1).lte(365).optional(),
  scopes: z.array(z.string()).optional(),
});
export type AgentTokensCreateBody = z.input<typeof agentTokensCreateBodySchema>;

export const projectsAiSummaryResponseSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  atRisk: z.boolean(),
  evidence: z.object({
    totalTasks: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    done: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    inProgress: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    blocked: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    overdue: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    sprintProgressPct: z.number().optional(),
  }),
});
export type ProjectsAiSummaryResponse = z.infer<typeof projectsAiSummaryResponseSchema>;

export const projectsAiImproveDraftDescriptionResponseSchema = z.object({
  description: z.string(),
});
export type ProjectsAiImproveDraftDescriptionResponse = z.infer<typeof projectsAiImproveDraftDescriptionResponseSchema>;

export const projectsAiImproveDraftDescriptionBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().optional(),
});
export type ProjectsAiImproveDraftDescriptionBody = z.input<typeof projectsAiImproveDraftDescriptionBodySchema>;

export const projectsAiSuggestDraftFieldsResponseSchema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "URGENT"]).optional(),
  points: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
  labelIds: z.array(z.number().int().gte(-9007199254740991).lte(9007199254740991)),
  labelNames: z.array(z.string()),
  rationale: z.string(),
});
export type ProjectsAiSuggestDraftFieldsResponse = z.infer<typeof projectsAiSuggestDraftFieldsResponseSchema>;

export const projectsAiSuggestDraftFieldsBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().optional(),
});
export type ProjectsAiSuggestDraftFieldsBody = z.input<typeof projectsAiSuggestDraftFieldsBodySchema>;

export const projectsAiSuggestDraftTitleResponseSchema = z.object({
  title: z.string(),
});
export type ProjectsAiSuggestDraftTitleResponse = z.infer<typeof projectsAiSuggestDraftTitleResponseSchema>;

export const projectsAiSuggestDraftTitleBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().optional(),
});
export type ProjectsAiSuggestDraftTitleBody = z.input<typeof projectsAiSuggestDraftTitleBodySchema>;

export const projectsAiGenerateTicketChecklistResponseSchema = z.object({
  title: z.string(),
  items: z.array(z.object({
    text: z.string(),
    completed: z.boolean().optional(),
  })),
});
export type ProjectsAiGenerateTicketChecklistResponse = z.infer<typeof projectsAiGenerateTicketChecklistResponseSchema>;

export const projectsAiTicketHandoffResponseSchema = z.object({
  currentState: z.string(),
  keyDecisions: z.array(z.string()),
  nextAction: z.string(),
  blockers: z.array(z.string()),
  citations: z.array(z.object({
    source: z.enum(["description", "comment", "decision"]),
    excerpt: z.string(),
  })),
});
export type ProjectsAiTicketHandoffResponse = z.infer<typeof projectsAiTicketHandoffResponseSchema>;

export const projectsAiImproveTicketDescriptionResponseSchema = z.object({
  description: z.string(),
});
export type ProjectsAiImproveTicketDescriptionResponse = z.infer<typeof projectsAiImproveTicketDescriptionResponseSchema>;

export const projectsAiImproveTicketDescriptionBodySchema = z.strictObject({
  draft: z.string().optional(),
});
export type ProjectsAiImproveTicketDescriptionBody = z.input<typeof projectsAiImproveTicketDescriptionBodySchema>;

export const projectsAiSuggestTicketSubtasksResponseSchema = z.object({
  subtasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
  })),
});
export type ProjectsAiSuggestTicketSubtasksResponse = z.infer<typeof projectsAiSuggestTicketSubtasksResponseSchema>;

export const projectsAiSummarizeTicketResponseSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  blockers: z.array(z.string()),
});
export type ProjectsAiSummarizeTicketResponse = z.infer<typeof projectsAiSummarizeTicketResponseSchema>;

export const projectsAiSummarizeTicketCommentsResponseSchema = z.object({
  summary: z.string(),
  themes: z.array(z.string()),
  openQuestions: z.array(z.string()),
});
export type ProjectsAiSummarizeTicketCommentsResponse = z.infer<typeof projectsAiSummarizeTicketCommentsResponseSchema>;

export const projectsListProjectsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    description: z.string().nullable(),
    key: z.string(),
    status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
    priority: z.string().nullable(),
    startDate: z.iso.datetime({ offset: true }).nullable(),
    endDate: z.iso.datetime({ offset: true }).nullable(),
    managedProductId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    manager: z.object({
      id: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      image: z.string().nullable(),
    }).nullable(),
    progress: z.object({
      total: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      done: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      percentage: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    }),
    health: z.enum(["on_track", "at_risk", "off_track"]),
    members: z.array(z.object({
      id: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      image: z.string().nullable(),
    })),
    teams: z.array(z.string()),
  })),
  hasMore: z.boolean(),
  nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type ProjectsListProjectsResponse = z.infer<typeof projectsListProjectsResponseSchema>;

export const projectsCreateProjectResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  key: z.string(),
  clientMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  managerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  startDate: z.iso.datetime({ offset: true }).nullable(),
  endDate: z.iso.datetime({ offset: true }).nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
  priority: z.string().nullable(),
  dealId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  managedProductId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budget: z.string().nullable(),
  budgetMinor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budgetCurrency: z.string().nullable(),
  settings: z.object({
    modules: z.object({
      sprints: z.boolean().optional(),
      epics: z.boolean(),
      timeTracking: z.boolean(),
      wiki: z.boolean(),
    }),
    projectType: z.string().optional(),
    workflow: z.string().optional(),
    features: z.record(z.string(), z.boolean()).optional(),
    iterations: z.object({
      defaultDurationWeeks: z.number(),
      namingPrefix: z.string(),
    }).optional(),
  }).nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProjectsCreateProjectResponse = z.infer<typeof projectsCreateProjectResponseSchema>;

export const projectsCreateProjectBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  key: z.string().optional(),
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  modules: z.object({
    sprints: z.boolean().optional(),
    epics: z.boolean(),
    timeTracking: z.boolean(),
    wiki: z.boolean(),
  }).optional(),
  projectType: z.string().optional(),
  workflow: z.string().optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  managedProductId: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type ProjectsCreateProjectBody = z.input<typeof projectsCreateProjectBodySchema>;

export const agentPulseGetTopSignalResponseSchema = z.object({
  type: z.enum(["overdue_approval", "blocked_milestone", "delivery_risk", "dependency_change", "comment_draft"]),
  entityId: z.number().int().gt(0).lte(9007199254740991),
  projectId: z.number().int().gte(0).lte(9007199254740991),
  title: z.string(),
  dueAt: z.string().nullable(),
  evidence: z.string().nullable().optional(),
  proposedChange: z.string().nullable().optional(),
  impact: z.string().nullable().optional(),
  confidence: z.number().int().gte(0).lte(100).nullable().optional(),
  affectedRecordIds: z.array(z.number().int().gte(-9007199254740991).lte(9007199254740991)).nullable().optional(),
  retryCount: z.number().int().gte(0).lte(9007199254740991).optional(),
}).nullable();
export type AgentPulseGetTopSignalResponse = z.infer<typeof agentPulseGetTopSignalResponseSchema>;

export const projectsTicketsGetAllWorkResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
    status: z.string(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullable(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    projectKey: z.string().nullable(),
    projectName: z.string().nullable(),
    ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    dueDate: z.string().nullable(),
    startDate: z.string().nullable(),
    points: z.number().nullable(),
    estimate: z.number().nullable(),
    rank: z.string().nullable(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    epicId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    assigneeId: z.string().nullable(),
    assignee: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string().nullable(),
      image: z.string().nullable(),
    }).nullable(),
    labels: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      name: z.string(),
      color: z.string(),
    })),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
});
export type ProjectsTicketsGetAllWorkResponse = z.infer<typeof projectsTicketsGetAllWorkResponseSchema>;

export const projectsTicketsGetAllWorkIdsResponseSchema = z.object({
  entries: z.array(z.object({
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    ids: z.array(z.number().int().gte(-9007199254740991).lte(9007199254740991)),
  })),
  total: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  capped: z.boolean(),
  cap: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ProjectsTicketsGetAllWorkIdsResponse = z.infer<typeof projectsTicketsGetAllWorkIdsResponseSchema>;

export const approvalsInboxGetInboxResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    revision: z.number().int().gt(0).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    projectName: z.string().nullable(),
    projectKey: z.string().nullable(),
    entityType: z.enum(["task", "milestone", "budget", "release", "change_request", "document", "timesheet", "client_approval"]),
    entityId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    status: z.enum(["requested", "pending", "approved", "rejected", "changes_requested", "escalated", "cancelled"]),
    level: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    dueAt: z.iso.datetime({ offset: true }).nullable(),
    requestedById: z.string().nullable(),
    decidedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gt(0).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ApprovalsInboxGetInboxResponse = z.infer<typeof approvalsInboxGetInboxResponseSchema>;

export const projectsRoadmapListChangelogResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    title: z.string(),
    content: z.string(),
    version: z.string().nullable(),
    type: z.enum(["feature", "improvement", "fix"]),
    isPublished: z.boolean(),
    linkedRoadmapItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsRoadmapListChangelogResponse = z.infer<typeof projectsRoadmapListChangelogResponseSchema>;

export const projectsRoadmapCreateChangelogResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  content: z.string(),
  version: z.string().nullable(),
  type: z.enum(["feature", "improvement", "fix"]),
  isPublished: z.boolean(),
  linkedRoadmapItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProjectsRoadmapCreateChangelogResponse = z.infer<typeof projectsRoadmapCreateChangelogResponseSchema>;

export const projectsRoadmapCreateChangelogBodySchema = z.strictObject({
  title: z.string(),
  content: z.string().optional(),
  version: z.string().optional(),
  type: z.enum(["feature", "improvement", "fix"]).optional(),
  isPublished: z.boolean().optional(),
  linkedRoadmapItemId: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type ProjectsRoadmapCreateChangelogBody = z.input<typeof projectsRoadmapCreateChangelogBodySchema>;

export const projectsRoadmapUpdateChangelogResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  content: z.string(),
  version: z.string().nullable(),
  type: z.enum(["feature", "improvement", "fix"]),
  isPublished: z.boolean(),
  linkedRoadmapItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProjectsRoadmapUpdateChangelogResponse = z.infer<typeof projectsRoadmapUpdateChangelogResponseSchema>;

export const projectsRoadmapUpdateChangelogBodySchema = z.strictObject({
  title: z.string().optional(),
  content: z.string().optional(),
  version: z.string().nullable().optional(),
  type: z.enum(["feature", "improvement", "fix"]).optional(),
  isPublished: z.boolean().optional(),
  linkedRoadmapItemId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
});
export type ProjectsRoadmapUpdateChangelogBody = z.input<typeof projectsRoadmapUpdateChangelogBodySchema>;

export const dashboardLayoutGetLayoutResponseSchema = z.object({
  layoutVersion: z.number().int().gte(0).lte(9007199254740991),
  config: z.object({
    widgets: z.array(z.object({
      type: z.enum(["my-issues", "projects", "approvals", "agent-runs", "risks", "releases", "blockers"]),
      position: z.object({
        col: z.number().int().gte(0).lte(9007199254740991),
        row: z.number().int().gte(0).lte(9007199254740991),
        w: z.number().int().gte(1).lte(12),
        h: z.number().int().gte(1).lte(8),
      }),
      config: z.record(z.string(), z.unknown()).optional(),
    })),
  }),
  updatedAt: z.string(),
});
export type DashboardLayoutGetLayoutResponse = z.infer<typeof dashboardLayoutGetLayoutResponseSchema>;

export const dashboardLayoutSaveLayoutResponseSchema = z.object({
  layoutVersion: z.number().int().gte(0).lte(9007199254740991),
  config: z.object({
    widgets: z.array(z.object({
      type: z.enum(["my-issues", "projects", "approvals", "agent-runs", "risks", "releases", "blockers"]),
      position: z.object({
        col: z.number().int().gte(0).lte(9007199254740991),
        row: z.number().int().gte(0).lte(9007199254740991),
        w: z.number().int().gte(1).lte(12),
        h: z.number().int().gte(1).lte(8),
      }),
      config: z.record(z.string(), z.unknown()).optional(),
    })),
  }),
  updatedAt: z.string(),
});
export type DashboardLayoutSaveLayoutResponse = z.infer<typeof dashboardLayoutSaveLayoutResponseSchema>;

export const dashboardLayoutSaveLayoutBodySchema = z.strictObject({
  layoutVersion: z.number().int().gte(0).lte(9007199254740991),
  config: z.strictObject({
    widgets: z.array(z.strictObject({
      type: z.enum(["my-issues", "projects", "approvals", "agent-runs", "risks", "releases", "blockers"]),
      position: z.strictObject({
        col: z.number().int().gte(0).lte(9007199254740991),
        row: z.number().int().gte(0).lte(9007199254740991),
        w: z.number().int().gte(1).lte(12),
        h: z.number().int().gte(1).lte(8),
      }),
      config: z.record(z.string(), z.unknown()).optional(),
    })),
  }),
});
export type DashboardLayoutSaveLayoutBody = z.input<typeof dashboardLayoutSaveLayoutBodySchema>;

export const commentDraftsReadByTicketResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  body: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}).nullable();
export type CommentDraftsReadByTicketResponse = z.infer<typeof commentDraftsReadByTicketResponseSchema>;

export const commentDraftsDeleteByTicketResponseSchema = z.object({
  deleted: z.boolean(),
});
export type CommentDraftsDeleteByTicketResponse = z.infer<typeof commentDraftsDeleteByTicketResponseSchema>;

export const commentDraftsListMineResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    body: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    ticket: z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
      title: z.string(),
      projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
      status: z.string(),
      ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      projectKey: z.string().nullable(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullable(),
      projectName: z.string().nullable(),
      assignee: z.object({
        id: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
        lastName: z.string().nullable(),
        firstName: z.string().nullable(),
      }).nullable(),
    }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type CommentDraftsListMineResponse = z.infer<typeof commentDraftsListMineResponseSchema>;

export const commentDraftsDeleteAllResponseSchema = z.object({
  deleted: z.boolean(),
});
export type CommentDraftsDeleteAllResponse = z.infer<typeof commentDraftsDeleteAllResponseSchema>;

export const commentDraftsUpsertResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  body: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type CommentDraftsUpsertResponse = z.infer<typeof commentDraftsUpsertResponseSchema>;

export const commentDraftsUpsertBodySchema = z.strictObject({
  body: z.string(),
});
export type CommentDraftsUpsertBody = z.input<typeof commentDraftsUpsertBodySchema>;

export const commentDraftsGenerateDraftResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  body: z.string(),
  evidence: z.string().nullable(),
  proposedChange: z.string().nullable(),
  impact: z.string().nullable(),
  confidence: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  affectedRecordIds: z.string().nullable(),
  retryCount: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  lastError: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  aiUsage: z.object({
    model: z.string(),
    promptTokens: z.number().int().gte(0).lte(9007199254740991),
    completionTokens: z.number().int().gte(0).lte(9007199254740991),
    totalTokens: z.number().int().gte(0).lte(9007199254740991),
    credits: z.number(),
    costUsd: z.number(),
  }),
});
export type CommentDraftsGenerateDraftResponse = z.infer<typeof commentDraftsGenerateDraftResponseSchema>;

export const commentDraftsDeleteOneResponseSchema = z.object({
  deleted: z.boolean(),
});
export type CommentDraftsDeleteOneResponse = z.infer<typeof commentDraftsDeleteOneResponseSchema>;

export const projectsRoadmapListFeedbackResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.enum(["open", "planned", "in_progress", "completed", "declined"]),
    category: z.string().nullable(),
    votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    submittedByName: z.string().nullable(),
    submittedByEmail: z.string().nullable(),
    crmContactId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    crmOrganizationId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    accountValueSnapshot: z.string().nullable(),
    accountTierSnapshot: z.enum(["free", "pro", "enterprise"]).nullable(),
    linkedRoadmapItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    duplicateOfId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    mergedAt: z.iso.datetime({ offset: true }).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsRoadmapListFeedbackResponse = z.infer<typeof projectsRoadmapListFeedbackResponseSchema>;

export const projectsRoadmapUpdateFeedbackResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["open", "planned", "in_progress", "completed", "declined"]),
  category: z.string().nullable(),
  votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  submittedByName: z.string().nullable(),
  submittedByEmail: z.string().nullable(),
  crmContactId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  crmOrganizationId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  accountValueSnapshot: z.string().nullable(),
  accountTierSnapshot: z.enum(["free", "pro", "enterprise"]).nullable(),
  linkedRoadmapItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  duplicateOfId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  mergedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ProjectsRoadmapUpdateFeedbackResponse = z.infer<typeof projectsRoadmapUpdateFeedbackResponseSchema>;

export const projectsRoadmapUpdateFeedbackBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["open", "planned", "in_progress", "completed", "declined"]).optional(),
  category: z.string().nullable().optional(),
  crmOrganizationId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  linkedRoadmapItemId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
});
export type ProjectsRoadmapUpdateFeedbackBody = z.input<typeof projectsRoadmapUpdateFeedbackBodySchema>;

export const projectsRoadmapMergeFeedbackResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["open", "planned", "in_progress", "completed", "declined"]),
  category: z.string().nullable(),
  votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  submittedByName: z.string().nullable(),
  submittedByEmail: z.string().nullable(),
  crmContactId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  crmOrganizationId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  accountValueSnapshot: z.string().nullable(),
  accountTierSnapshot: z.enum(["free", "pro", "enterprise"]).nullable(),
  linkedRoadmapItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  duplicateOfId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  mergedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ProjectsRoadmapMergeFeedbackResponse = z.infer<typeof projectsRoadmapMergeFeedbackResponseSchema>;

export const projectsRoadmapMergeFeedbackBodySchema = z.strictObject({
  targetPostId: z.number().int().gt(0).lte(9007199254740991),
});
export type ProjectsRoadmapMergeFeedbackBody = z.input<typeof projectsRoadmapMergeFeedbackBodySchema>;

export const projectsListLabelsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
}));
export type ProjectsListLabelsResponse = z.infer<typeof projectsListLabelsResponseSchema>;

export const projectsCreateLabelResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ProjectsCreateLabelResponse = z.infer<typeof projectsCreateLabelResponseSchema>;

export const projectsCreateLabelBodySchema = z.strictObject({
  name: z.string(),
  color: z.string().optional(),
});
export type ProjectsCreateLabelBody = z.input<typeof projectsCreateLabelBodySchema>;

export const projectsUpdateLabelResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ProjectsUpdateLabelResponse = z.infer<typeof projectsUpdateLabelResponseSchema>;

export const projectsUpdateLabelBodySchema = z.strictObject({
  name: z.string().optional(),
  color: z.string().optional(),
});
export type ProjectsUpdateLabelBody = z.input<typeof projectsUpdateLabelBodySchema>;

export const landingPreferenceGetPreferenceResponseSchema = z.object({
  destination: z.string().nullable(),
});
export type LandingPreferenceGetPreferenceResponse = z.infer<typeof landingPreferenceGetPreferenceResponseSchema>;

export const landingPreferenceSetPreferenceResponseSchema = z.object({
  destination: z.string().nullable(),
});
export type LandingPreferenceSetPreferenceResponse = z.infer<typeof landingPreferenceSetPreferenceResponseSchema>;

export const landingPreferenceSetPreferenceBodySchema = z.strictObject({
  destination: z.string(),
});
export type LandingPreferenceSetPreferenceBody = z.input<typeof landingPreferenceSetPreferenceBodySchema>;

export const managedProductsListManagedProductsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    name: z.string(),
    key: z.string(),
    description: z.string().nullable(),
    status: z.enum(["active", "archived"]),
    ownerId: z.string().nullable(),
    vision: z.string().nullable(),
    missionStatement: z.string().nullable(),
    targetCustomer: z.string().nullable(),
    differentiators: z.string().nullable(),
    currentPhase: z.string().nullable(),
    targetLaunchDate: z.iso.datetime({ offset: true }).nullable(),
    successMetrics: z.unknown(),
    ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    owner: z.object({
      id: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ManagedProductsListManagedProductsResponse = z.infer<typeof managedProductsListManagedProductsResponseSchema>;

export const managedProductsCreateManagedProductResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  status: z.enum(["active", "archived"]),
  ownerId: z.string().nullable(),
  vision: z.string().nullable(),
  missionStatement: z.string().nullable(),
  targetCustomer: z.string().nullable(),
  differentiators: z.string().nullable(),
  currentPhase: z.string().nullable(),
  targetLaunchDate: z.iso.datetime({ offset: true }).nullable(),
  successMetrics: z.unknown(),
  ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  owner: z.object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ManagedProductsCreateManagedProductResponse = z.infer<typeof managedProductsCreateManagedProductResponseSchema>;

export const managedProductsCreateManagedProductBodySchema = z.strictObject({
  name: z.string(),
  key: z.string(),
  description: z.string().optional(),
  ownerId: z.string().optional(),
});
export type ManagedProductsCreateManagedProductBody = z.input<typeof managedProductsCreateManagedProductBodySchema>;

export const managedProductsBulkUpdateManagedProductsResponseSchema = z.object({
  requested: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  succeeded: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  skipped: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  results: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    outcome: z.enum(["updated", "skipped"]),
    reason: z.string().nullable(),
  })),
});
export type ManagedProductsBulkUpdateManagedProductsResponse = z.infer<typeof managedProductsBulkUpdateManagedProductsResponseSchema>;

export const managedProductsBulkUpdateManagedProductsBodySchema = z.strictObject({
  ids: z.array(z.number().int().gt(0).lte(9007199254740991)),
  action: z.literal("update_status"),
  status: z.enum(["active", "archived"]).optional(),
});
export type ManagedProductsBulkUpdateManagedProductsBody = z.input<typeof managedProductsBulkUpdateManagedProductsBodySchema>;

export const managedProductsGetManagedProductResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  status: z.enum(["active", "archived"]),
  ownerId: z.string().nullable(),
  vision: z.string().nullable(),
  missionStatement: z.string().nullable(),
  targetCustomer: z.string().nullable(),
  differentiators: z.string().nullable(),
  currentPhase: z.string().nullable(),
  targetLaunchDate: z.iso.datetime({ offset: true }).nullable(),
  successMetrics: z.unknown(),
  ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  owner: z.object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ManagedProductsGetManagedProductResponse = z.infer<typeof managedProductsGetManagedProductResponseSchema>;

export const managedProductsUpdateManagedProductResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  status: z.enum(["active", "archived"]),
  ownerId: z.string().nullable(),
  vision: z.string().nullable(),
  missionStatement: z.string().nullable(),
  targetCustomer: z.string().nullable(),
  differentiators: z.string().nullable(),
  currentPhase: z.string().nullable(),
  targetLaunchDate: z.iso.datetime({ offset: true }).nullable(),
  successMetrics: z.unknown(),
  ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  owner: z.object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ManagedProductsUpdateManagedProductResponse = z.infer<typeof managedProductsUpdateManagedProductResponseSchema>;

export const managedProductsUpdateManagedProductBodySchema = z.strictObject({
  version: z.number().int().gte(1).lte(9007199254740991),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
});
export type ManagedProductsUpdateManagedProductBody = z.input<typeof managedProductsUpdateManagedProductBodySchema>;

export const managedProductsGetProductInsightsResponseSchema = z.object({
  linkedProjectCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectsByStatus: z.object({
    active: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    completed: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    archived: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
  submissionsByStatus: z.object({
    open: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    in_progress: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    resolved: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    archived: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
  roadmapItemCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  roadmapItemsByStatus: z.object({
    planned: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    in_progress: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    completed: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    cancelled: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
  feedbackByStatus: z.object({
    open: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    planned: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    in_progress: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    completed: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    declined: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
  linkedFeedbackVoteCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ageDays: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  confidenceScore: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  overrideReason: z.string().nullable(),
  overriddenBy: z.object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }).nullable(),
  overriddenAt: z.string().nullable(),
});
export type ManagedProductsGetProductInsightsResponse = z.infer<typeof managedProductsGetProductInsightsResponseSchema>;

export const buildMembersListResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    role: z.enum(["member", "admin"]),
    addedAt: z.iso.datetime({ offset: true }),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
    teams: z.array(z.string()),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type BuildMembersListResponse = z.infer<typeof buildMembersListResponseSchema>;

export const buildMembersAddResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  role: z.string(),
  addedAt: z.iso.datetime({ offset: true }),
});
export type BuildMembersAddResponse = z.infer<typeof buildMembersAddResponseSchema>;

export const buildMembersAddBodySchema = z.strictObject({
  userId: z.string(),
  role: z.enum(["member", "admin"]).optional(),
});
export type BuildMembersAddBody = z.input<typeof buildMembersAddBodySchema>;

export const projectResourcesListOrgCustomStatesResponseSchema = z.array(z.object({
  name: z.string(),
  color: z.string().nullable(),
  type: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]).nullable(),
}));
export type ProjectResourcesListOrgCustomStatesResponse = z.infer<typeof projectResourcesListOrgCustomStatesResponseSchema>;

export const clientPortalListPortalProjectsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  key: z.string(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
  startDate: z.iso.datetime({ offset: true }).nullable(),
  targetEndDate: z.iso.datetime({ offset: true }).nullable(),
}));
export type ClientPortalListPortalProjectsResponse = z.infer<typeof clientPortalListPortalProjectsResponseSchema>;

export const clientPortalListPortalChangeRequestsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  crNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  impact: z.string().nullable(),
  status: z.enum(["submitted", "under_review", "estimated", "awaiting_approval", "approved", "rejected", "in_progress", "completed"]),
  estimateMinutes: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budgetImpactCents: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  timelineImpactDays: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  decisionComment: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
}));
export type ClientPortalListPortalChangeRequestsResponse = z.infer<typeof clientPortalListPortalChangeRequestsResponseSchema>;

export const clientPortalCreatePortalChangeRequestResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  crNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  impact: z.string().nullable(),
  status: z.enum(["submitted", "under_review", "estimated", "awaiting_approval", "approved", "rejected", "in_progress", "completed"]),
  estimateMinutes: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budgetImpactCents: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  timelineImpactDays: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  decisionComment: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ClientPortalCreatePortalChangeRequestResponse = z.infer<typeof clientPortalCreatePortalChangeRequestResponseSchema>;

export const clientPortalCreatePortalChangeRequestBodySchema = z.strictObject({
  title: z.string(),
  description: z.string().optional(),
  impact: z.string().optional(),
  estimateMinutes: z.number().int().gte(0).lte(9007199254740991).optional(),
  budgetImpactCents: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
  timelineImpactDays: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
});
export type ClientPortalCreatePortalChangeRequestBody = z.input<typeof clientPortalCreatePortalChangeRequestBodySchema>;

export const clientPortalGetProjectOverviewResponseSchema = z.object({
  project: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    key: z.string(),
    status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
    startDate: z.iso.datetime({ offset: true }).nullable(),
    targetEndDate: z.iso.datetime({ offset: true }).nullable(),
  }),
  milestones: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    dueDate: z.string().nullable(),
    status: z.string(),
  })),
  tasks: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    status: z.string(),
    dueDate: z.string().nullable(),
  })),
  attachments: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    filename: z.string(),
    url: z.string(),
  })),
  comments: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    body: z.string(),
    authorName: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
  })),
});
export type ClientPortalGetProjectOverviewResponse = z.infer<typeof clientPortalGetProjectOverviewResponseSchema>;

export const portfoliosListPortfoliosResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    ownerId: z.string().nullable(),
    status: z.enum(["active", "on_hold", "completed", "archived"]),
    health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
    strategicGoal: z.string().nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    projectCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type PortfoliosListPortfoliosResponse = z.infer<typeof portfoliosListPortfoliosResponseSchema>;

export const portfoliosCreatePortfolioResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  strategicGoal: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type PortfoliosCreatePortfolioResponse = z.infer<typeof portfoliosCreatePortfolioResponseSchema>;

export const portfoliosCreatePortfolioBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  health: z.enum(["on_track", "at_risk", "off_track"]).optional(),
  strategicGoal: z.string().optional(),
});
export type PortfoliosCreatePortfolioBody = z.input<typeof portfoliosCreatePortfolioBodySchema>;

export const portfoliosGetPortfolioResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  strategicGoal: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  projects: z.object({
    data: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      name: z.string(),
      key: z.string(),
      status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
      openCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      doneCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    })),
    pagination: z.object({
      limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
  }),
  programs: z.object({
    data: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      name: z.string(),
      status: z.enum(["active", "on_hold", "completed", "archived"]),
    })),
    pagination: z.object({
      limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
  }),
});
export type PortfoliosGetPortfolioResponse = z.infer<typeof portfoliosGetPortfolioResponseSchema>;

export const portfoliosUpdatePortfolioResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  strategicGoal: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type PortfoliosUpdatePortfolioResponse = z.infer<typeof portfoliosUpdatePortfolioResponseSchema>;

export const portfoliosUpdatePortfolioBodySchema = z.strictObject({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable().optional(),
  strategicGoal: z.string().nullable().optional(),
});
export type PortfoliosUpdatePortfolioBody = z.input<typeof portfoliosUpdatePortfolioBodySchema>;

export const portfoliosLinkProjectResponseSchema = z.object({
  success: z.literal(true),
});
export type PortfoliosLinkProjectResponse = z.infer<typeof portfoliosLinkProjectResponseSchema>;

export const portfoliosLinkProjectBodySchema = z.strictObject({
  projectId: z.number().int().gt(0).lte(9007199254740991),
});
export type PortfoliosLinkProjectBody = z.input<typeof portfoliosLinkProjectBodySchema>;

export const programsListProgramsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    portfolioId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    name: z.string(),
    description: z.string().nullable(),
    ownerId: z.string().nullable(),
    status: z.enum(["active", "on_hold", "completed", "archived"]),
    health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    projectCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProgramsListProgramsResponse = z.infer<typeof programsListProgramsResponseSchema>;

export const programsCreateProgramResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  portfolioId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ProgramsCreateProgramResponse = z.infer<typeof programsCreateProgramResponseSchema>;

export const programsCreateProgramBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  portfolioId: z.number().int().gt(0).lte(9007199254740991).optional(),
  ownerId: z.string().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  health: z.enum(["on_track", "at_risk", "off_track"]).optional(),
});
export type ProgramsCreateProgramBody = z.input<typeof programsCreateProgramBodySchema>;

export const programsGetProgramResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  portfolioId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  projects: z.object({
    data: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      name: z.string(),
      key: z.string(),
      status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
      addedAt: z.iso.datetime({ offset: true }),
    })),
    pagination: z.object({
      limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
  }),
});
export type ProgramsGetProgramResponse = z.infer<typeof programsGetProgramResponseSchema>;

export const programsUpdateProgramResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  portfolioId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ProgramsUpdateProgramResponse = z.infer<typeof programsUpdateProgramResponseSchema>;

export const programsUpdateProgramBodySchema = z.strictObject({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  portfolioId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  ownerId: z.string().nullable().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable().optional(),
});
export type ProgramsUpdateProgramBody = z.input<typeof programsUpdateProgramBodySchema>;

export const projectsReleasesListOrgReleasesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    version: z.string(),
    rowVersion: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    description: z.string().nullable(),
    status: z.enum(["draft", "released", "archived"]),
    releaseDate: z.string().nullable(),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
    readiness: z.enum(["not_started", "in_progress", "ready", "blocked"]).nullable(),
    riskLevel: z.enum(["low", "medium", "high", "critical"]).nullable(),
    createdBy: z.string().nullable(),
    createdByUser: z.object({
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string().nullable(),
    }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    ticketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsReleasesListOrgReleasesResponse = z.infer<typeof projectsReleasesListOrgReleasesResponseSchema>;

export const risksListOrgRisksResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    riskNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    description: z.string().nullable(),
    probability: z.enum(["low", "medium", "high"]),
    impact: z.enum(["low", "medium", "high"]),
    status: z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]),
    ownerId: z.string().nullable(),
    mitigation: z.string().nullable(),
    linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  hasMore: z.boolean(),
  nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type RisksListOrgRisksResponse = z.infer<typeof risksListOrgRisksResponseSchema>;

export const projectsRoadmapListRoadmapResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    outcome: z.string().nullable(),
    status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
    category: z.string().nullable(),
    isPublic: z.boolean(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    epicTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    targetQuarter: z.string().nullable(),
    sortOrder: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    reach: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    impact: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    confidence: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    effort: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    owner: z.object({
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
    prioritization: z.object({
      method: z.literal("rice"),
      score: z.number().nullable(),
      isComplete: z.boolean(),
      missingInputs: z.array(z.enum(["reach", "impact", "confidence", "effort"])),
      unavailableReason: z.enum(["missing_inputs", "non_positive_effort"]).nullable(),
    }),
    tierWeighting: z.object({
      tierWeighted: z.boolean(),
      tier: z.enum(["free", "pro", "enterprise"]).nullable(),
      weight: z.number().nullable(),
      weightedScore: z.number().nullable(),
      unweightedReason: z.enum(["no_linked_feedback", "no_linked_account", "account_tier_unset", "score_unavailable"]).nullable(),
      linkedFeedbackCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      linkedAccountCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      linkedRevenue: z.number().nullable(),
      revenueKnownAccountCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
  total: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
});
export type ProjectsRoadmapListRoadmapResponse = z.infer<typeof projectsRoadmapListRoadmapResponseSchema>;

export const projectsRoadmapCreateRoadmapResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  outcome: z.string().nullable(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
  category: z.string().nullable(),
  isPublic: z.boolean(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  epicTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  targetQuarter: z.string().nullable(),
  sortOrder: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  reach: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  impact: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  confidence: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  effort: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  owner: z.object({
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  prioritization: z.object({
    method: z.literal("rice"),
    score: z.number().nullable(),
    isComplete: z.boolean(),
    missingInputs: z.array(z.enum(["reach", "impact", "confidence", "effort"])),
    unavailableReason: z.enum(["missing_inputs", "non_positive_effort"]).nullable(),
  }),
  tierWeighting: z.object({
    tierWeighted: z.boolean(),
    tier: z.enum(["free", "pro", "enterprise"]).nullable(),
    weight: z.number().nullable(),
    weightedScore: z.number().nullable(),
    unweightedReason: z.enum(["no_linked_feedback", "no_linked_account", "account_tier_unset", "score_unavailable"]).nullable(),
    linkedFeedbackCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    linkedAccountCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    linkedRevenue: z.number().nullable(),
    revenueKnownAccountCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
});
export type ProjectsRoadmapCreateRoadmapResponse = z.infer<typeof projectsRoadmapCreateRoadmapResponseSchema>;

export const projectsRoadmapCreateRoadmapBodySchema = z.strictObject({
  title: z.string(),
  description: z.string().optional(),
  outcome: z.string().nullable().optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  projectId: z.number().int().gt(0).lte(9007199254740991).optional(),
  epicTicketId: z.number().int().gt(0).lte(9007199254740991).optional(),
  targetQuarter: z.string().optional(),
  sortOrder: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
  reach: z.number().int().gte(0).lte(1000000).optional(),
  impact: z.number().int().gte(1).lte(5).optional(),
  confidence: z.number().int().gte(0).lte(100).optional(),
  effort: z.number().int().gte(1).lte(10000).optional(),
  ownerMembershipId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
});
export type ProjectsRoadmapCreateRoadmapBody = z.input<typeof projectsRoadmapCreateRoadmapBodySchema>;

export const projectsRoadmapReadRoadmapPublicationResponseSchema = z.object({
  token: z.string().nullable(),
  path: z.string().nullable(),
});
export type ProjectsRoadmapReadRoadmapPublicationResponse = z.infer<typeof projectsRoadmapReadRoadmapPublicationResponseSchema>;

export const projectsRoadmapPublishRoadmapResponseSchema = z.object({
  token: z.string().nullable(),
  path: z.string().nullable(),
});
export type ProjectsRoadmapPublishRoadmapResponse = z.infer<typeof projectsRoadmapPublishRoadmapResponseSchema>;

export const projectsRoadmapUpdateRoadmapResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  outcome: z.string().nullable(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
  category: z.string().nullable(),
  isPublic: z.boolean(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  epicTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  targetQuarter: z.string().nullable(),
  sortOrder: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  reach: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  impact: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  confidence: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  effort: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  owner: z.object({
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  prioritization: z.object({
    method: z.literal("rice"),
    score: z.number().nullable(),
    isComplete: z.boolean(),
    missingInputs: z.array(z.enum(["reach", "impact", "confidence", "effort"])),
    unavailableReason: z.enum(["missing_inputs", "non_positive_effort"]).nullable(),
  }),
  tierWeighting: z.object({
    tierWeighted: z.boolean(),
    tier: z.enum(["free", "pro", "enterprise"]).nullable(),
    weight: z.number().nullable(),
    weightedScore: z.number().nullable(),
    unweightedReason: z.enum(["no_linked_feedback", "no_linked_account", "account_tier_unset", "score_unavailable"]).nullable(),
    linkedFeedbackCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    linkedAccountCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    linkedRevenue: z.number().nullable(),
    revenueKnownAccountCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
});
export type ProjectsRoadmapUpdateRoadmapResponse = z.infer<typeof projectsRoadmapUpdateRoadmapResponseSchema>;

export const projectsRoadmapUpdateRoadmapBodySchema = z.strictObject({
  version: z.number().int().gt(0).lte(9007199254740991),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  outcome: z.string().nullable().optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
  category: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  projectId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  epicTicketId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  targetQuarter: z.string().nullable().optional(),
  sortOrder: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
  reach: z.number().int().gte(0).lte(1000000).nullable().optional(),
  impact: z.number().int().gte(1).lte(5).nullable().optional(),
  confidence: z.number().int().gte(0).lte(100).nullable().optional(),
  effort: z.number().int().gte(1).lte(10000).nullable().optional(),
  ownerMembershipId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
});
export type ProjectsRoadmapUpdateRoadmapBody = z.input<typeof projectsRoadmapUpdateRoadmapBodySchema>;

export const projectsRoadmapGetRoadmapSignalsResponseSchema = z.object({
  itemId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  prioritization: z.object({
    method: z.literal("rice"),
    score: z.number().nullable(),
    isComplete: z.boolean(),
    missingInputs: z.array(z.enum(["reach", "impact", "confidence", "effort"])),
    unavailableReason: z.enum(["missing_inputs", "non_positive_effort"]).nullable(),
  }),
  tierWeighting: z.object({
    tierWeighted: z.boolean(),
    tier: z.enum(["free", "pro", "enterprise"]).nullable(),
    weight: z.number().nullable(),
    weightedScore: z.number().nullable(),
    unweightedReason: z.enum(["no_linked_feedback", "no_linked_account", "account_tier_unset", "score_unavailable"]).nullable(),
    linkedFeedbackCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    linkedAccountCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    linkedRevenue: z.number().nullable(),
    revenueKnownAccountCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
  demand: z.object({
    votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    linkedFeedbackCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    openLinkedFeedbackCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
  delivery: z.object({
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    epicTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    source: z.enum(["epic_ticket", "project", "none"]),
    linkedTicketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    countedTicketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    completedTicketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    progressPercent: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  }),
});
export type ProjectsRoadmapGetRoadmapSignalsResponse = z.infer<typeof projectsRoadmapGetRoadmapSignalsResponseSchema>;

export const scopeDirectoryResolveResponseSchema = z.object({
  data: z.array(z.object({
    key: z.string(),
    type: z.enum(["product", "project"]),
    id: z.string(),
    name: z.string(),
    parentKey: z.string().nullable(),
    projectKey: z.string().nullable(),
    isArchived: z.boolean(),
    parentPath: z.string().nullable(),
    clientPortalEnabled: z.boolean().nullable(),
  })),
});
export type ScopeDirectoryResolveResponse = z.infer<typeof scopeDirectoryResolveResponseSchema>;

export const scopeDirectoryResolveBodySchema = z.strictObject({
  keys: z.array(z.string()),
});
export type ScopeDirectoryResolveBody = z.input<typeof scopeDirectoryResolveBodySchema>;

export const scopeDirectorySearchResponseSchema = z.object({
  data: z.array(z.object({
    key: z.string(),
    type: z.enum(["product", "project"]),
    id: z.string(),
    name: z.string(),
    parentKey: z.string().nullable(),
    projectKey: z.string().nullable(),
    isArchived: z.boolean(),
    parentPath: z.string().nullable(),
    clientPortalEnabled: z.boolean().nullable(),
  })),
  nextCursor: z.string().nullable(),
});
export type ScopeDirectorySearchResponse = z.infer<typeof scopeDirectorySearchResponseSchema>;

export const projectsTicketsSearchTicketsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectKey: z.string(),
  projectName: z.string(),
}));
export type ProjectsTicketsSearchTicketsResponse = z.infer<typeof projectsTicketsSearchTicketsResponseSchema>;

export const teamsListTeamsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    name: z.string(),
    key: z.string(),
    icon: z.string().nullable(),
    color: z.string().nullable(),
    isPrivate: z.boolean(),
    capacity: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    memberCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type TeamsListTeamsResponse = z.infer<typeof teamsListTeamsResponseSchema>;

export const teamsCreateTeamResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  isPrivate: z.boolean(),
  capacity: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type TeamsCreateTeamResponse = z.infer<typeof teamsCreateTeamResponseSchema>;

export const teamsCreateTeamBodySchema = z.strictObject({
  name: z.string(),
  key: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isPrivate: z.boolean().optional(),
  capacity: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type TeamsCreateTeamBody = z.input<typeof teamsCreateTeamBodySchema>;

export const teamsGetTeamResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  isPrivate: z.boolean(),
  capacity: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  members: z.array(z.object({
    userId: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
    role: z.string(),
  })),
});
export type TeamsGetTeamResponse = z.infer<typeof teamsGetTeamResponseSchema>;

export const teamsUpdateTeamResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  isPrivate: z.boolean(),
  capacity: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type TeamsUpdateTeamResponse = z.infer<typeof teamsUpdateTeamResponseSchema>;

export const teamsUpdateTeamBodySchema = z.strictObject({
  name: z.string().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  isPrivate: z.boolean().optional(),
  capacity: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
});
export type TeamsUpdateTeamBody = z.input<typeof teamsUpdateTeamBodySchema>;

export const teamsListTeamMembersResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    userId: z.string(),
    role: z.string(),
    joinedAt: z.iso.datetime({ offset: true }),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type TeamsListTeamMembersResponse = z.infer<typeof teamsListTeamMembersResponseSchema>;

export const teamsAddMemberResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  teamId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  role: z.string(),
  joinedAt: z.iso.datetime({ offset: true }),
});
export type TeamsAddMemberResponse = z.infer<typeof teamsAddMemberResponseSchema>;

export const teamsAddMemberBodySchema = z.strictObject({
  userId: z.string(),
  role: z.enum(["member", "lead"]).optional(),
});
export type TeamsAddMemberBody = z.input<typeof teamsAddMemberBodySchema>;

export const teamsUpdateMemberRoleResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  teamId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  role: z.string(),
  joinedAt: z.iso.datetime({ offset: true }),
});
export type TeamsUpdateMemberRoleResponse = z.infer<typeof teamsUpdateMemberRoleResponseSchema>;

export const teamsUpdateMemberRoleBodySchema = z.strictObject({
  role: z.enum(["member", "lead"]),
});
export type TeamsUpdateMemberRoleBody = z.input<typeof teamsUpdateMemberRoleBodySchema>;

export const teamsListTeamProjectsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  key: z.string(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
  addedAt: z.iso.datetime({ offset: true }),
}));
export type TeamsListTeamProjectsResponse = z.infer<typeof teamsListTeamProjectsResponseSchema>;

export const teamsAddProjectResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  teamId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  addedAt: z.iso.datetime({ offset: true }),
});
export type TeamsAddProjectResponse = z.infer<typeof teamsAddProjectResponseSchema>;

export const teamsAddProjectBodySchema = z.strictObject({
  projectId: z.number().int().gt(0).lte(9007199254740991),
});
export type TeamsAddProjectBody = z.input<typeof teamsAddProjectBodySchema>;

export const projectsTemplatesListTemplatesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.string(),
    createdBy: z.string().nullable(),
    customFieldsConfig: z.array(z.object({
      name: z.string(),
      fieldType: z.string(),
      options: z.array(z.object({
        label: z.string(),
        value: z.string(),
      })).nullable().optional(),
      isRequired: z.boolean(),
      displayOrder: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    })).nullable().optional(),
    savedViewsConfig: z.array(z.object({
      name: z.string(),
      filters: z.record(z.string(), z.unknown()),
      groupBy: z.string().nullable().optional(),
      orderBy: z.string().nullable().optional(),
      layoutType: z.string(),
      isPinned: z.boolean(),
    })).nullable().optional(),
    statusesConfig: z.array(z.object({
      name: z.string(),
      order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      color: z.string(),
      type: z.string(),
    })).nullable().optional(),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    tickets: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      templateId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      title: z.string(),
      description: z.string().nullable(),
      type: z.string(),
      priority: z.string(),
      estimatedHours: z.string().nullable(),
      order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      phase: z.string().nullable(),
    })),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsTemplatesListTemplatesResponse = z.infer<typeof projectsTemplatesListTemplatesResponseSchema>;

export const projectsTemplatesCreateTemplateResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  createdBy: z.string().nullable(),
  customFieldsConfig: z.array(z.object({
    name: z.string(),
    fieldType: z.string(),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })).nullable().optional(),
    isRequired: z.boolean(),
    displayOrder: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })).nullable().optional(),
  savedViewsConfig: z.array(z.object({
    name: z.string(),
    filters: z.record(z.string(), z.unknown()),
    groupBy: z.string().nullable().optional(),
    orderBy: z.string().nullable().optional(),
    layoutType: z.string(),
    isPinned: z.boolean(),
  })).nullable().optional(),
  statusesConfig: z.array(z.object({
    name: z.string(),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    color: z.string(),
    type: z.string(),
  })).nullable().optional(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  tickets: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    templateId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    description: z.string().nullable(),
    type: z.string(),
    priority: z.string(),
    estimatedHours: z.string().nullable(),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    phase: z.string().nullable(),
  })),
});
export type ProjectsTemplatesCreateTemplateResponse = z.infer<typeof projectsTemplatesCreateTemplateResponseSchema>;

export const projectsTemplatesCreateTemplateBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tickets: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    type: z.enum(["EPIC", "STORY", "TASK", "BUG"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    estimatedHours: z.number().gt(0).optional(),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
    phase: z.string().optional(),
  })).optional(),
  customFields: z.array(z.object({
    name: z.string(),
    fieldType: z.enum(["text", "number", "date", "user", "select", "multi_select", "checkbox", "url", "currency"]),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })).optional(),
    isRequired: z.boolean().optional(),
    displayOrder: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
  })).optional(),
  savedViews: z.array(z.object({
    name: z.string(),
    filters: z.record(z.string(), z.unknown()).optional(),
    groupBy: z.string().optional(),
    orderBy: z.string().optional(),
    layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]).optional(),
    isPinned: z.boolean().optional(),
  })).optional(),
  statuses: z.array(z.object({
    name: z.string(),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    color: z.string(),
    type: z.enum(["unstarted", "started", "completed", "cancelled"]),
  })).optional(),
});
export type ProjectsTemplatesCreateTemplateBody = z.input<typeof projectsTemplatesCreateTemplateBodySchema>;

export const projectsTemplatesApplyTemplateResponseSchema = z.object({
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  key: z.string(),
  ticketsCreated: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  customFieldsCreated: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  savedViewsCreated: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ProjectsTemplatesApplyTemplateResponse = z.infer<typeof projectsTemplatesApplyTemplateResponseSchema>;

export const projectsTemplatesApplyTemplateBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  managerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type ProjectsTemplatesApplyTemplateBody = z.input<typeof projectsTemplatesApplyTemplateBodySchema>;

export const workspaceViewsListWorkspaceViewsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  orgId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  filters: z.unknown(),
  groupBy: z.string().nullable(),
  orderBy: z.string().nullable(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]),
  isPinned: z.boolean(),
  visibility: z.enum(["private", "shared"]),
  displayOptions: z.unknown(),
  scope: z.enum(["project", "workspace"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}));
export type WorkspaceViewsListWorkspaceViewsResponse = z.infer<typeof workspaceViewsListWorkspaceViewsResponseSchema>;

export const workspaceViewsCreateWorkspaceViewResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  orgId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  filters: z.unknown(),
  groupBy: z.string().nullable(),
  orderBy: z.string().nullable(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]),
  isPinned: z.boolean(),
  visibility: z.enum(["private", "shared"]),
  displayOptions: z.unknown(),
  scope: z.enum(["project", "workspace"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type WorkspaceViewsCreateWorkspaceViewResponse = z.infer<typeof workspaceViewsCreateWorkspaceViewResponseSchema>;

export const workspaceViewsCreateWorkspaceViewBodySchema = z.strictObject({
  name: z.string(),
  filters: z.record(z.string(), z.unknown()).optional(),
  groupBy: z.string().optional(),
  orderBy: z.string().optional(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]).optional(),
  isPinned: z.boolean().optional(),
  visibility: z.enum(["private", "shared"]).optional(),
  displayOptions: z.record(z.string(), z.unknown()).optional(),
});
export type WorkspaceViewsCreateWorkspaceViewBody = z.input<typeof workspaceViewsCreateWorkspaceViewBodySchema>;

export const workspaceViewsUpdateWorkspaceViewResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  orgId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  filters: z.unknown(),
  groupBy: z.string().nullable(),
  orderBy: z.string().nullable(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]),
  isPinned: z.boolean(),
  visibility: z.enum(["private", "shared"]),
  displayOptions: z.unknown(),
  scope: z.enum(["project", "workspace"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type WorkspaceViewsUpdateWorkspaceViewResponse = z.infer<typeof workspaceViewsUpdateWorkspaceViewResponseSchema>;

export const workspaceViewsUpdateWorkspaceViewBodySchema = z.strictObject({
  name: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  groupBy: z.string().nullable().optional(),
  orderBy: z.string().nullable().optional(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]).optional(),
  isPinned: z.boolean().optional(),
  visibility: z.enum(["private", "shared"]).optional(),
  displayOptions: z.record(z.string(), z.unknown()).optional(),
});
export type WorkspaceViewsUpdateWorkspaceViewBody = z.input<typeof workspaceViewsUpdateWorkspaceViewBodySchema>;

export const projectsByIdGetProjectResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  key: z.string(),
  clientMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  managerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  startDate: z.iso.datetime({ offset: true }).nullable(),
  endDate: z.iso.datetime({ offset: true }).nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
  priority: z.string().nullable(),
  dealId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  managedProductId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budget: z.string().nullable(),
  budgetMinor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budgetCurrency: z.string().nullable(),
  settings: z.object({
    modules: z.object({
      sprints: z.boolean().optional(),
      epics: z.boolean(),
      timeTracking: z.boolean(),
      wiki: z.boolean(),
    }),
    projectType: z.string().optional(),
    workflow: z.string().optional(),
    features: z.record(z.string(), z.boolean()).optional(),
    iterations: z.object({
      defaultDurationWeeks: z.number(),
      namingPrefix: z.string(),
    }).optional(),
  }).nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  statuses: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    name: z.string(),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    color: z.string().nullable(),
    type: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]).nullable(),
    wipLimit: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  members: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    role: z.string(),
    user: z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string(),
        image: z.string().nullable(),
      }),
    }),
  })),
  crmClient: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
  }).nullable(),
});
export type ProjectsByIdGetProjectResponse = z.infer<typeof projectsByIdGetProjectResponseSchema>;

export const projectsByIdUpdateProjectResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  key: z.string(),
  clientMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  managerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  startDate: z.iso.datetime({ offset: true }).nullable(),
  endDate: z.iso.datetime({ offset: true }).nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
  priority: z.string().nullable(),
  dealId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  managedProductId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budget: z.string().nullable(),
  budgetMinor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budgetCurrency: z.string().nullable(),
  settings: z.object({
    modules: z.object({
      sprints: z.boolean().optional(),
      epics: z.boolean(),
      timeTracking: z.boolean(),
      wiki: z.boolean(),
    }),
    projectType: z.string().optional(),
    workflow: z.string().optional(),
    features: z.record(z.string(), z.boolean()).optional(),
    iterations: z.object({
      defaultDurationWeeks: z.number(),
      namingPrefix: z.string(),
    }).optional(),
  }).nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  statuses: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    name: z.string(),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    color: z.string().nullable(),
    type: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]).nullable(),
    wipLimit: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  members: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    role: z.string(),
    user: z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string(),
        image: z.string().nullable(),
      }),
    }),
  })),
  crmClient: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
  }).nullable(),
});
export type ProjectsByIdUpdateProjectResponse = z.infer<typeof projectsByIdUpdateProjectResponseSchema>;

export const projectsByIdUpdateProjectBodySchema = z.strictObject({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  managerId: z.string().nullable().optional(),
  clientId: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  memberIds: z.array(z.string()).optional(),
  reassignments: z.record(z.string(), z.string()).optional(),
  projectType: z.string().optional(),
  workflow: z.string().optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  invoiceLineDetail: z.enum(["summary", "raw"]).optional(),
});
export type ProjectsByIdUpdateProjectBody = z.input<typeof projectsByIdUpdateProjectBodySchema>;

export const projectsActivityFeedGetProjectActivityResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    action: z.enum(["created", "status_changed", "priority_changed", "assignee_changed", "title_changed", "sprint_changed", "due_date_changed", "comment_added", "comment_updated", "comment_deleted", "label_changed", "estimate_changed", "cycle_changed", "type_changed"]),
    label: z.string(),
    fromValue: z.string().nullable(),
    toValue: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    ticketTitle: z.string(),
    ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectKey: z.string(),
    user: z.object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      image: z.string().nullable(),
    }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsActivityFeedGetProjectActivityResponse = z.infer<typeof projectsActivityFeedGetProjectActivityResponseSchema>;

export const projectsReportsGetAnalyticsResponseSchema = z.object({
  stateDistribution: z.array(z.object({
    status: z.string(),
    count: z.number(),
  })),
  priorityBreakdown: z.array(z.object({
    priority: z.string().nullable(),
    count: z.number(),
  })),
  assigneeCompletion: z.array(z.object({
    assigneeId: z.string().nullable(),
    assigneeName: z.string().nullable(),
    total: z.number(),
    completed: z.number(),
  })),
  volumeOverTime: z.array(z.object({
    week: z.string(),
    count: z.number(),
  })),
  cycleVelocity: z.array(z.object({
    cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    cycleName: z.string(),
    completedPoints: z.number(),
  })),
  estimateVsActual: z.array(z.object({
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    estimated: z.string().nullable(),
    actual: z.number(),
  })),
  healthScore: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  healthStatus: z.enum(["NOT_STARTED", "EXCELLENT", "GOOD", "AT_RISK", "CRITICAL"]),
  healthBreakdown: z.object({
    completionPct: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    onTimePct: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    velocityScore: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    overdueTickets: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    totalTickets: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    openTickets: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
});
export type ProjectsReportsGetAnalyticsResponse = z.infer<typeof projectsReportsGetAnalyticsResponseSchema>;

export const projectsReportsGetTimeBudgetResponseSchema = z.object({
  loggedHours: z.number().gte(0),
  billableHours: z.number().gte(0),
  nonBillableHours: z.number().gte(0),
  costEntries: z.array(z.object({
    currency: z.string().nullable(),
    costMinor: z.number().int().gte(0).lte(9007199254740991),
    rateSources: z.array(z.string()),
  })),
  includedStatus: z.array(z.string()),
  glExpenseDebitMinor: z.number().gte(0),
  glFunctionalCurrency: z.string().nullable(),
  estimateBudgetMinor: z.number().gte(0).nullable(),
  budgetCurrency: z.string().nullable(),
  varianceMinor: z.number().nullable(),
  reconciliationStatus: z.enum(["unstarted", "gl_pending", "matched", "unmatched", "currency_mismatch"]),
});
export type ProjectsReportsGetTimeBudgetResponse = z.infer<typeof projectsReportsGetTimeBudgetResponseSchema>;

export const buildApprovalsListApprovalsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    revision: z.number().int().gt(0).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    entityType: z.enum(["task", "milestone", "budget", "release", "change_request", "document", "timesheet", "client_approval"]),
    entityId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    reason: z.string().nullable(),
    requestedById: z.string().nullable(),
    approverMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    status: z.enum(["requested", "pending", "approved", "rejected", "changes_requested", "escalated", "cancelled"]),
    level: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    dueAt: z.iso.datetime({ offset: true }).nullable(),
    decisionComment: z.string().nullable(),
    decidedAt: z.iso.datetime({ offset: true }).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gt(0).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type BuildApprovalsListApprovalsResponse = z.infer<typeof buildApprovalsListApprovalsResponseSchema>;

export const buildApprovalsCreateApprovalResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  revision: z.number().int().gt(0).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  entityType: z.enum(["task", "milestone", "budget", "release", "change_request", "document", "timesheet", "client_approval"]),
  entityId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  reason: z.string().nullable(),
  requestedById: z.string().nullable(),
  approverMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["requested", "pending", "approved", "rejected", "changes_requested", "escalated", "cancelled"]),
  level: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  decisionComment: z.string().nullable(),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type BuildApprovalsCreateApprovalResponse = z.infer<typeof buildApprovalsCreateApprovalResponseSchema>;

export const buildApprovalsCreateApprovalBodySchema = z.union([z.strictObject({
  entityId: z.number().int().gt(0).lte(2147483647),
  title: z.string(),
  approverId: z.string(),
  reason: z.string().optional(),
  dueAt: z.unknown().optional(),
  level: z.number().int().gte(1).lte(2147483647).optional(),
  entityType: z.literal("task"),
  expectedArtifactVersion: z.number().int().gt(0).lte(2147483647),
}), z.strictObject({
  entityId: z.number().int().gt(0).lte(2147483647),
  title: z.string(),
  approverId: z.string(),
  reason: z.string().optional(),
  dueAt: z.unknown().optional(),
  level: z.number().int().gte(1).lte(2147483647).optional(),
  entityType: z.enum(["milestone", "budget", "release", "change_request", "document", "timesheet", "client_approval"]),
})]);
export type BuildApprovalsCreateApprovalBody = z.input<typeof buildApprovalsCreateApprovalBodySchema>;

export const buildApprovalsGetApprovalResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  revision: z.number().int().gt(0).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  entityType: z.enum(["task", "milestone", "budget", "release", "change_request", "document", "timesheet", "client_approval"]),
  entityId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  reason: z.string().nullable(),
  requestedById: z.string().nullable(),
  approverMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["requested", "pending", "approved", "rejected", "changes_requested", "escalated", "cancelled"]),
  level: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  decisionComment: z.string().nullable(),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  artifact: z.union([z.object({
    state: z.enum(["unbound", "restricted", "unavailable"]),
  }), z.object({
    state: z.enum(["current", "stale"]),
    requestedArtifactVersion: z.number().int().gt(0).lte(2147483647),
    currentArtifactVersion: z.number().int().gt(0).lte(2147483647),
    capturedAt: z.iso.datetime({ offset: true }),
    digest: z.string(),
    snapshot: z.object({
      schemaVersion: z.literal(1),
      id: z.number().int().gt(0).lte(2147483647),
      projectId: z.number().int().gt(0).lte(2147483647),
      ticketNumber: z.number().int().gt(0).lte(9007199254740991),
      version: z.number().int().gt(0).lte(2147483647),
      title: z.string(),
      description: z.string().nullable(),
      type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
      status: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
      points: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
      originalEstimate: z.string().nullable(),
      startDate: z.iso.date().nullable(),
      dueDate: z.iso.date().nullable(),
    }),
  })]),
});
export type BuildApprovalsGetApprovalResponse = z.infer<typeof buildApprovalsGetApprovalResponseSchema>;

export const buildApprovalsUpdateApprovalResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  revision: z.number().int().gt(0).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  entityType: z.enum(["task", "milestone", "budget", "release", "change_request", "document", "timesheet", "client_approval"]),
  entityId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  reason: z.string().nullable(),
  requestedById: z.string().nullable(),
  approverMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["requested", "pending", "approved", "rejected", "changes_requested", "escalated", "cancelled"]),
  level: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  decisionComment: z.string().nullable(),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type BuildApprovalsUpdateApprovalResponse = z.infer<typeof buildApprovalsUpdateApprovalResponseSchema>;

export const buildApprovalsUpdateApprovalBodySchema = z.strictObject({
  expectedRevision: z.number().int().gt(0).lte(9007199254740991),
  approverId: z.string().optional(),
  dueAt: z.unknown().nullable().optional(),
  status: z.enum(["pending", "escalated", "cancelled"]).optional(),
});
export type BuildApprovalsUpdateApprovalBody = z.input<typeof buildApprovalsUpdateApprovalBodySchema>;

export const buildApprovalsSoftDeleteApprovalBodySchema = z.strictObject({
  expectedRevision: z.number().int().gt(0).lte(9007199254740991),
});
export type BuildApprovalsSoftDeleteApprovalBody = z.input<typeof buildApprovalsSoftDeleteApprovalBodySchema>;

export const buildApprovalsDecideApprovalResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  revision: z.number().int().gt(0).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  entityType: z.enum(["task", "milestone", "budget", "release", "change_request", "document", "timesheet", "client_approval"]),
  entityId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  reason: z.string().nullable(),
  requestedById: z.string().nullable(),
  approverMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["requested", "pending", "approved", "rejected", "changes_requested", "escalated", "cancelled"]),
  level: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  decisionComment: z.string().nullable(),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type BuildApprovalsDecideApprovalResponse = z.infer<typeof buildApprovalsDecideApprovalResponseSchema>;

export const buildApprovalsDecideApprovalBodySchema = z.strictObject({
  expectedRevision: z.number().int().gt(0).lte(9007199254740991),
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  decisionComment: z.string().optional(),
});
export type BuildApprovalsDecideApprovalBody = z.input<typeof buildApprovalsDecideApprovalBodySchema>;

export const projectsAutomationsListResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    triggerEvent: z.string(),
    isActive: z.boolean(),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
      value: z.string().optional(),
    })),
    actions: z.array(z.object({
      type: z.enum(["set_status", "set_assignee", "set_priority", "add_label", "add_comment", "request_approval"]),
      value: z.string(),
    })),
    createdBy: z.string().nullable(),
    createdByUser: z.object({
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string().nullable(),
    }).nullable(),
    lastRunAt: z.iso.datetime({ offset: true }).nullable(),
    lastFailureAt: z.iso.datetime({ offset: true }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsAutomationsListResponse = z.infer<typeof projectsAutomationsListResponseSchema>;

export const projectsAutomationsCreateResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  isActive: z.boolean(),
  triggerEvent: z.string(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
    value: z.string().optional(),
  })),
  actions: z.array(z.object({
    type: z.enum(["set_status", "set_assignee", "set_priority", "add_label", "add_comment", "request_approval"]),
    value: z.string(),
  })),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProjectsAutomationsCreateResponse = z.infer<typeof projectsAutomationsCreateResponseSchema>;

export const projectsAutomationsCreateBodySchema = z.strictObject({
  name: z.string(),
  triggerEvent: z.enum(["ticket.created", "ticket.updated", "ticket.status_changed", "ticket.assigned"]),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
    value: z.string().optional(),
  })).optional(),
  actions: z.array(z.union([z.object({
    type: z.literal("set_status"),
    value: z.string(),
  }), z.object({
    type: z.literal("set_assignee"),
    value: z.string(),
  }), z.object({
    type: z.literal("set_priority"),
    value: z.string(),
  }), z.object({
    type: z.literal("add_label"),
    value: z.string(),
  }), z.object({
    type: z.literal("add_comment"),
    value: z.string(),
  }), z.object({
    type: z.literal("request_approval"),
    value: z.string().optional(),
  })])),
  isActive: z.boolean().optional(),
});
export type ProjectsAutomationsCreateBody = z.input<typeof projectsAutomationsCreateBodySchema>;

export const projectsAutomationsDryRunResponseSchema = z.object({
  items: z.array(z.object({
    ruleId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    matched: z.boolean(),
    actions: z.array(z.object({
      type: z.string(),
      value: z.string(),
    })),
  })),
});
export type ProjectsAutomationsDryRunResponse = z.infer<typeof projectsAutomationsDryRunResponseSchema>;

export const projectsAutomationsDryRunBodySchema = z.strictObject({
  triggerEvent: z.enum(["ticket.created", "ticket.updated", "ticket.status_changed", "ticket.assigned"]),
  ticket: z.strictObject({
    ticketId: z.number().int().gt(0).lte(9007199254740991).optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assigneeId: z.string().nullable().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
  }),
});
export type ProjectsAutomationsDryRunBody = z.input<typeof projectsAutomationsDryRunBodySchema>;

export const projectsAutomationsListRunsResponseSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    automationId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    triggerEvent: z.string(),
    matched: z.boolean(),
    outcome: z.enum(["matched_success", "matched_partial_failure", "matched_failed", "not_matched", "blocked_loop_guard", "blocked_rate_limit", "error"]),
    errorMessage: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    actions: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      actionIndex: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      actionType: z.string(),
      outcome: z.enum(["success", "failure"]),
      errorMessage: z.string().nullable(),
      createdAt: z.iso.datetime({ offset: true }),
    })),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsAutomationsListRunsResponse = z.infer<typeof projectsAutomationsListRunsResponseSchema>;

export const projectsAutomationsReplayRunResponseSchema = z.object({
  replayedCount: z.number().int().gte(0).lte(9007199254740991),
  outcome: z.enum(["matched_success", "matched_partial_failure", "matched_failed", "not_matched", "blocked_loop_guard", "blocked_rate_limit", "error"]),
});
export type ProjectsAutomationsReplayRunResponse = z.infer<typeof projectsAutomationsReplayRunResponseSchema>;

export const projectsAutomationsUpdateResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  isActive: z.boolean(),
  triggerEvent: z.string(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
    value: z.string().optional(),
  })),
  actions: z.array(z.object({
    type: z.enum(["set_status", "set_assignee", "set_priority", "add_label", "add_comment", "request_approval"]),
    value: z.string(),
  })),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProjectsAutomationsUpdateResponse = z.infer<typeof projectsAutomationsUpdateResponseSchema>;

export const projectsAutomationsUpdateBodySchema = z.strictObject({
  name: z.string().optional(),
  triggerEvent: z.enum(["ticket.created", "ticket.updated", "ticket.status_changed", "ticket.assigned"]).optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
    value: z.string().optional(),
  })).optional(),
  actions: z.array(z.union([z.object({
    type: z.literal("set_status"),
    value: z.string(),
  }), z.object({
    type: z.literal("set_assignee"),
    value: z.string(),
  }), z.object({
    type: z.literal("set_priority"),
    value: z.string(),
  }), z.object({
    type: z.literal("add_label"),
    value: z.string(),
  }), z.object({
    type: z.literal("add_comment"),
    value: z.string(),
  }), z.object({
    type: z.literal("request_approval"),
    value: z.string().optional(),
  })])).optional(),
  isActive: z.boolean().optional(),
});
export type ProjectsAutomationsUpdateBody = z.input<typeof projectsAutomationsUpdateBodySchema>;

export const projectsAutomationsGetAiPolicyResponseSchema = z.object({
  model: z.string().nullable(),
  maxTokensPerRun: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  temperature: z.number().nullable(),
});
export type ProjectsAutomationsGetAiPolicyResponse = z.infer<typeof projectsAutomationsGetAiPolicyResponseSchema>;

export const projectsAutomationsPutAiPolicyResponseSchema = z.object({
  model: z.string().nullable(),
  maxTokensPerRun: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  temperature: z.number().nullable(),
});
export type ProjectsAutomationsPutAiPolicyResponse = z.infer<typeof projectsAutomationsPutAiPolicyResponseSchema>;

export const projectsAutomationsPutAiPolicyBodySchema = z.strictObject({
  model: z.string().optional(),
  maxTokensPerRun: z.number().int().gt(0).lte(100000).optional(),
  temperature: z.number().gte(0).lte(2).optional(),
});
export type ProjectsAutomationsPutAiPolicyBody = z.input<typeof projectsAutomationsPutAiPolicyBodySchema>;

export const projectsAutomationsGetHumanConfirmationResponseSchema = z.object({
  requireConfirmation: z.boolean(),
  actionTypes: z.array(z.enum(["set_status", "set_assignee", "set_priority", "add_label", "add_comment", "request_approval"])),
});
export type ProjectsAutomationsGetHumanConfirmationResponse = z.infer<typeof projectsAutomationsGetHumanConfirmationResponseSchema>;

export const projectsAutomationsPutHumanConfirmationResponseSchema = z.object({
  requireConfirmation: z.boolean(),
  actionTypes: z.array(z.enum(["set_status", "set_assignee", "set_priority", "add_label", "add_comment", "request_approval"])),
});
export type ProjectsAutomationsPutHumanConfirmationResponse = z.infer<typeof projectsAutomationsPutHumanConfirmationResponseSchema>;

export const projectsAutomationsPutHumanConfirmationBodySchema = z.strictObject({
  requireConfirmation: z.boolean(),
  actionTypes: z.array(z.enum(["set_status", "set_assignee", "set_priority", "add_label", "add_comment", "request_approval"])),
});
export type ProjectsAutomationsPutHumanConfirmationBody = z.input<typeof projectsAutomationsPutHumanConfirmationBodySchema>;

export const projectsAutomationsGetTokenQuotaResponseSchema = z.object({
  tokensUsedThisPeriod: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  quotaLimit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  resetAt: z.iso.datetime({ offset: true }),
});
export type ProjectsAutomationsGetTokenQuotaResponse = z.infer<typeof projectsAutomationsGetTokenQuotaResponseSchema>;

export const projectsAutomationsGetToolPermissionsResponseSchema = z.object({
  allowedTools: z.array(z.enum(["ticket.summarize", "ticket.improve-description", "ticket.suggest-subtasks", "ticket.suggest-fields", "ticket.generate-checklist", "ticket.suggest-title"])),
});
export type ProjectsAutomationsGetToolPermissionsResponse = z.infer<typeof projectsAutomationsGetToolPermissionsResponseSchema>;

export const projectsAutomationsPutToolPermissionsResponseSchema = z.object({
  allowedTools: z.array(z.enum(["ticket.summarize", "ticket.improve-description", "ticket.suggest-subtasks", "ticket.suggest-fields", "ticket.generate-checklist", "ticket.suggest-title"])),
});
export type ProjectsAutomationsPutToolPermissionsResponse = z.infer<typeof projectsAutomationsPutToolPermissionsResponseSchema>;

export const projectsAutomationsPutToolPermissionsBodySchema = z.strictObject({
  allowedTools: z.array(z.enum(["ticket.summarize", "ticket.improve-description", "ticket.suggest-subtasks", "ticket.suggest-fields", "ticket.generate-checklist", "ticket.suggest-title"])),
});
export type ProjectsAutomationsPutToolPermissionsBody = z.input<typeof projectsAutomationsPutToolPermissionsBodySchema>;

export const projectsBudgetGetBudgetResponseSchema = z.object({
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  plannedBudget: z.number(),
  actualCost: z.number(),
  remaining: z.number(),
  utilizationPct: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  currency: z.string().nullable(),
  totalHours: z.number(),
  unratedHours: z.number(),
  currencyMismatch: z.boolean(),
  excludedCurrencyHours: z.number(),
  memberBreakdown: z.array(z.object({
    userId: z.string(),
    hours: z.number(),
    cost: z.number(),
    unratedHours: z.number(),
  })),
});
export type ProjectsBudgetGetBudgetResponse = z.infer<typeof projectsBudgetGetBudgetResponseSchema>;

export const projectsBudgetUpdateBudgetResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  budget: z.number(),
  currency: z.string().nullable(),
});
export type ProjectsBudgetUpdateBudgetResponse = z.infer<typeof projectsBudgetUpdateBudgetResponseSchema>;

export const projectsBudgetUpdateBudgetBodySchema = z.strictObject({
  budget: z.number().gte(0),
});
export type ProjectsBudgetUpdateBudgetBody = z.input<typeof projectsBudgetUpdateBudgetBodySchema>;

export const bugsListBugsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  type: z.literal("BUG"),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reporterId: z.string().nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  qaState: z.enum(["new", "triaged", "assigned", "in_progress", "fixed", "ready_for_qa", "verified", "reopened", "closed"]).nullable(),
  severity: z.enum(["blocker", "critical", "major", "minor", "trivial"]).nullable(),
  stepsToReproduce: z.string().nullable(),
  expectedResult: z.string().nullable(),
  actualResult: z.string().nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  affectedReleaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  fixedReleaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  qaOwnerUserId: z.string().nullable(),
  qaOwnerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  linkedTestCaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reopenCount: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdByUserId: z.string().nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
}));
export type BugsListBugsResponse = z.infer<typeof bugsListBugsResponseSchema>;

export const bugsGetBugResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  type: z.literal("BUG"),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reporterId: z.string().nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  qaState: z.enum(["new", "triaged", "assigned", "in_progress", "fixed", "ready_for_qa", "verified", "reopened", "closed"]).nullable(),
  severity: z.enum(["blocker", "critical", "major", "minor", "trivial"]).nullable(),
  stepsToReproduce: z.string().nullable(),
  expectedResult: z.string().nullable(),
  actualResult: z.string().nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  affectedReleaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  fixedReleaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  qaOwnerUserId: z.string().nullable(),
  qaOwnerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  linkedTestCaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reopenCount: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdByUserId: z.string().nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type BugsGetBugResponse = z.infer<typeof bugsGetBugResponseSchema>;

export const changeRequestsListChangeRequestsResponseSchema = z.object({
  data: z.array(z.object({
    affectedItemCount: z.number().int().gte(0).lte(9007199254740991),
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    crNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    description: z.string().nullable(),
    impact: z.string().nullable(),
    estimateMinutes: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    budgetImpactCents: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    timelineImpactDays: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    status: z.enum(["submitted", "under_review", "estimated", "awaiting_approval", "approved", "rejected", "in_progress", "completed"]),
    requestedById: z.string().nullable(),
    approvalOwnerId: z.string().nullable(),
    approvalOwnerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    decisionComment: z.string().nullable(),
    decidedAt: z.iso.datetime({ offset: true }).nullable(),
    releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    clientVisible: z.boolean(),
    createdBy: z.string().nullable(),
    createdAt: z.union([z.iso.datetime({ offset: true }), z.string()]),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ChangeRequestsListChangeRequestsResponse = z.infer<typeof changeRequestsListChangeRequestsResponseSchema>;

export const changeRequestsCreateChangeRequestResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  crNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  impact: z.string().nullable(),
  estimateMinutes: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budgetImpactCents: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  timelineImpactDays: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["submitted", "under_review", "estimated", "awaiting_approval", "approved", "rejected", "in_progress", "completed"]),
  requestedById: z.string().nullable(),
  approvalOwnerId: z.string().nullable(),
  approvalOwnerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  decisionComment: z.string().nullable(),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  clientVisible: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ChangeRequestsCreateChangeRequestResponse = z.infer<typeof changeRequestsCreateChangeRequestResponseSchema>;

export const changeRequestsCreateChangeRequestBodySchema = z.strictObject({
  title: z.string(),
  description: z.string().optional(),
  impact: z.string().optional(),
  estimateMinutes: z.number().int().gte(0).lte(9007199254740991).optional(),
  budgetImpactCents: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
  timelineImpactDays: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
  releaseId: z.number().int().gt(0).lte(9007199254740991).optional(),
  clientVisible: z.boolean().optional(),
});
export type ChangeRequestsCreateChangeRequestBody = z.input<typeof changeRequestsCreateChangeRequestBodySchema>;

export const changeRequestsUpdateChangeRequestResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  crNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  impact: z.string().nullable(),
  estimateMinutes: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  budgetImpactCents: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  timelineImpactDays: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["submitted", "under_review", "estimated", "awaiting_approval", "approved", "rejected", "in_progress", "completed"]),
  requestedById: z.string().nullable(),
  approvalOwnerId: z.string().nullable(),
  approvalOwnerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  decisionComment: z.string().nullable(),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  clientVisible: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ChangeRequestsUpdateChangeRequestResponse = z.infer<typeof changeRequestsUpdateChangeRequestResponseSchema>;

export const changeRequestsUpdateChangeRequestBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().optional(),
  impact: z.string().optional(),
  estimateMinutes: z.number().int().gte(0).lte(9007199254740991).optional(),
  budgetImpactCents: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
  timelineImpactDays: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
  status: z.enum(["submitted", "under_review", "estimated", "awaiting_approval", "approved", "rejected", "in_progress", "completed"]).optional(),
  approvalOwnerId: z.string().optional(),
  decisionComment: z.string().optional(),
  releaseId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  clientVisible: z.boolean().optional(),
});
export type ChangeRequestsUpdateChangeRequestBody = z.input<typeof changeRequestsUpdateChangeRequestBodySchema>;

export const changeRequestAffectedItemsListAffectedTicketsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    changeRequestId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
    createdBy: z.string().nullable(),
    ticket: z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      title: z.string(),
      ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      status: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
      type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
    }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ChangeRequestAffectedItemsListAffectedTicketsResponse = z.infer<typeof changeRequestAffectedItemsListAffectedTicketsResponseSchema>;

export const changeRequestAffectedItemsLinkTicketResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  changeRequestId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
  createdBy: z.string().nullable(),
  ticket: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    status: z.string(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
  }),
});
export type ChangeRequestAffectedItemsLinkTicketResponse = z.infer<typeof changeRequestAffectedItemsLinkTicketResponseSchema>;

export const changeRequestAffectedItemsLinkTicketBodySchema = z.strictObject({
  ticketId: z.number().int().gt(0).lte(9007199254740991),
});
export type ChangeRequestAffectedItemsLinkTicketBody = z.input<typeof changeRequestAffectedItemsLinkTicketBodySchema>;

export const clientPortalManagementGetPreviewResponseSchema = z.object({
  project: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    key: z.string(),
    status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
    startDate: z.iso.datetime({ offset: true }).nullable(),
    targetEndDate: z.iso.datetime({ offset: true }).nullable(),
  }),
  milestones: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    dueDate: z.string().nullable(),
    status: z.string(),
  })),
  tasks: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    status: z.string(),
    dueDate: z.string().nullable(),
  })),
  attachments: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    filename: z.string(),
    url: z.string(),
  })),
  comments: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    body: z.string(),
    authorName: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
  })),
});
export type ClientPortalManagementGetPreviewResponse = z.infer<typeof clientPortalManagementGetPreviewResponseSchema>;

export const clientPortalManagementPublishPortalResponseSchema = z.object({
  portalPublishedAt: z.iso.datetime({ offset: true }).nullable(),
  grantCount: z.number().int().gte(0).lte(9007199254740991),
});
export type ClientPortalManagementPublishPortalResponse = z.infer<typeof clientPortalManagementPublishPortalResponseSchema>;

export const clientPortalManagementGetSettingsResponseSchema = z.object({
  portalPublishedAt: z.iso.datetime({ offset: true }).nullable(),
  grantCount: z.number().int().gte(0).lte(9007199254740991),
});
export type ClientPortalManagementGetSettingsResponse = z.infer<typeof clientPortalManagementGetSettingsResponseSchema>;

export const clientPortalManagementUnpublishPortalResponseSchema = z.object({
  portalPublishedAt: z.iso.datetime({ offset: true }).nullable(),
  grantCount: z.number().int().gte(0).lte(9007199254740991),
});
export type ClientPortalManagementUnpublishPortalResponse = z.infer<typeof clientPortalManagementUnpublishPortalResponseSchema>;

export const clientVisibilityGetVisibilitySummaryResponseSchema = z.object({
  tickets: z.object({
    data: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      title: z.string(),
      type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
      clientVisible: z.boolean(),
      version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    })),
    pagination: z.object({
      limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
  }),
  milestones: z.object({
    data: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      name: z.string(),
      clientVisible: z.boolean(),
    })),
    pagination: z.object({
      limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
  }),
});
export type ClientVisibilityGetVisibilitySummaryResponse = z.infer<typeof clientVisibilityGetVisibilitySummaryResponseSchema>;

export const clientVisibilityToggleMilestoneVisibilityResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  clientVisible: z.boolean(),
});
export type ClientVisibilityToggleMilestoneVisibilityResponse = z.infer<typeof clientVisibilityToggleMilestoneVisibilityResponseSchema>;

export const clientVisibilityToggleMilestoneVisibilityBodySchema = z.strictObject({
  clientVisible: z.boolean(),
  version: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type ClientVisibilityToggleMilestoneVisibilityBody = z.input<typeof clientVisibilityToggleMilestoneVisibilityBodySchema>;

export const clientVisibilityToggleTicketVisibilityResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  clientVisible: z.boolean(),
});
export type ClientVisibilityToggleTicketVisibilityResponse = z.infer<typeof clientVisibilityToggleTicketVisibilityResponseSchema>;

export const clientVisibilityToggleTicketVisibilityBodySchema = z.strictObject({
  clientVisible: z.boolean(),
  version: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type ClientVisibilityToggleTicketVisibilityBody = z.input<typeof clientVisibilityToggleTicketVisibilityBodySchema>;

export const projectsCustomFieldsListFieldsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  name: z.string(),
  type: z.string(),
  options: z.array(z.string()).nullable(),
  required: z.boolean().nullable(),
  position: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
}));
export type ProjectsCustomFieldsListFieldsResponse = z.infer<typeof projectsCustomFieldsListFieldsResponseSchema>;

export const projectsCustomFieldsCreateFieldResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  name: z.string(),
  type: z.string(),
  options: z.array(z.string()).nullable(),
  required: z.boolean().nullable(),
  position: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ProjectsCustomFieldsCreateFieldResponse = z.infer<typeof projectsCustomFieldsCreateFieldResponseSchema>;

export const projectsCustomFieldsCreateFieldBodySchema = z.strictObject({
  name: z.string(),
  type: z.enum(["text", "number", "date", "user", "select", "multi_select", "checkbox", "url", "currency"]).optional(),
  options: z.array(z.string()).nullable().optional(),
  required: z.boolean().optional(),
  position: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
});
export type ProjectsCustomFieldsCreateFieldBody = z.input<typeof projectsCustomFieldsCreateFieldBodySchema>;

export const projectsCustomFieldsUpdateFieldResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  name: z.string(),
  type: z.string(),
  options: z.array(z.string()).nullable(),
  required: z.boolean().nullable(),
  position: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ProjectsCustomFieldsUpdateFieldResponse = z.infer<typeof projectsCustomFieldsUpdateFieldResponseSchema>;

export const projectsCustomFieldsUpdateFieldBodySchema = z.strictObject({
  name: z.string().optional(),
  type: z.enum(["text", "number", "date", "user", "select", "multi_select", "checkbox", "url", "currency"]).optional(),
  options: z.array(z.string()).nullable().optional(),
  required: z.boolean().optional(),
  position: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
});
export type ProjectsCustomFieldsUpdateFieldBody = z.input<typeof projectsCustomFieldsUpdateFieldBodySchema>;

export const projectResourcesListCustomStatesResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  color: z.string().nullable(),
  type: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]).nullable(),
  wipLimit: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}));
export type ProjectResourcesListCustomStatesResponse = z.infer<typeof projectResourcesListCustomStatesResponseSchema>;

export const projectResourcesCreateCustomStateResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  color: z.string().nullable(),
  type: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]).nullable(),
  wipLimit: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProjectResourcesCreateCustomStateResponse = z.infer<typeof projectResourcesCreateCustomStateResponseSchema>;

export const projectResourcesCreateCustomStateBodySchema = z.strictObject({
  name: z.string(),
  color: z.string(),
  order: z.number().int().gte(0).lte(9007199254740991).optional(),
  type: z.enum(["unstarted", "started", "completed", "cancelled"]).optional(),
});
export type ProjectResourcesCreateCustomStateBody = z.input<typeof projectResourcesCreateCustomStateBodySchema>;

export const projectResourcesBulkReorderCustomStatesResponseSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
});
export type ProjectResourcesBulkReorderCustomStatesResponse = z.infer<typeof projectResourcesBulkReorderCustomStatesResponseSchema>;

export const projectResourcesBulkReorderCustomStatesBodySchema = z.strictObject({
  items: z.array(z.strictObject({
    stateId: z.number().int().gt(0).lte(9007199254740991),
    order: z.number().int().gte(0).lte(9007199254740991),
    expectedOrder: z.number().int().gte(0).lte(9007199254740991).optional(),
  })),
});
export type ProjectResourcesBulkReorderCustomStatesBody = z.input<typeof projectResourcesBulkReorderCustomStatesBodySchema>;

export const projectResourcesUpdateCustomStateResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  color: z.string().nullable(),
  type: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]).nullable(),
  wipLimit: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProjectResourcesUpdateCustomStateResponse = z.infer<typeof projectResourcesUpdateCustomStateResponseSchema>;

export const projectResourcesUpdateCustomStateBodySchema = z.strictObject({
  name: z.string().optional(),
  color: z.string().optional(),
  order: z.number().int().gte(0).lte(9007199254740991).optional(),
  type: z.enum(["unstarted", "started", "completed", "cancelled"]).optional(),
});
export type ProjectResourcesUpdateCustomStateBody = z.input<typeof projectResourcesUpdateCustomStateBodySchema>;

export const cyclesListCyclesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    description: z.string().nullable(),
    goal: z.string().nullable(),
    capacity: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    startDate: z.string(),
    endDate: z.string(),
    status: z.enum(["draft", "active", "completed"]),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdBy: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    totalItems: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    completedItems: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    progress: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  pagination: z.object({
    limit: z.number().int().gt(0).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type CyclesListCyclesResponse = z.infer<typeof cyclesListCyclesResponseSchema>;

export const cyclesCreateCycleResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  description: z.string().nullable(),
  goal: z.string().nullable(),
  capacity: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["draft", "active", "completed"]),
  startDate: z.string(),
  endDate: z.string(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdBy: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type CyclesCreateCycleResponse = z.infer<typeof cyclesCreateCycleResponseSchema>;

export const cyclesCreateCycleBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  capacity: z.number().int().gte(0).lte(9007199254740991).optional(),
});
export type CyclesCreateCycleBody = z.input<typeof cyclesCreateCycleBodySchema>;

export const cyclesUpdateCycleResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  description: z.string().nullable(),
  goal: z.string().nullable(),
  capacity: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["draft", "active", "completed"]),
  startDate: z.string(),
  endDate: z.string(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdBy: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type CyclesUpdateCycleResponse = z.infer<typeof cyclesUpdateCycleResponseSchema>;

export const cyclesUpdateCycleBodySchema = z.strictObject({
  version: z.number().int().gt(0).lte(9007199254740991),
  name: z.string().optional(),
  description: z.string().optional(),
  goal: z.string().optional(),
  capacity: z.number().int().gte(0).lte(9007199254740991).nullable().optional(),
  status: z.enum(["draft", "active", "completed"]).optional(),
  startDate: z.union([z.literal(""), z.string()]).optional(),
  endDate: z.union([z.literal(""), z.string()]).optional(),
  carryForwardCycleId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
});
export type CyclesUpdateCycleBody = z.input<typeof cyclesUpdateCycleBodySchema>;

export const decisionsListDecisionsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    decisionNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    context: z.string().nullable(),
    decision: z.string().nullable(),
    optionsConsidered: z.string().nullable(),
    status: z.enum(["proposed", "accepted", "superseded", "revisit"]),
    ownerId: z.string().nullable(),
    decidedAt: z.iso.datetime({ offset: true }).nullable(),
    revisitAt: z.iso.datetime({ offset: true }).nullable(),
    linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  hasMore: z.boolean(),
  nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type DecisionsListDecisionsResponse = z.infer<typeof decisionsListDecisionsResponseSchema>;

export const decisionsCreateDecisionResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  decisionNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  context: z.string().nullable(),
  decision: z.string().nullable(),
  optionsConsidered: z.string().nullable(),
  status: z.enum(["proposed", "accepted", "superseded", "revisit"]),
  ownerId: z.string().nullable(),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  revisitAt: z.iso.datetime({ offset: true }).nullable(),
  linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type DecisionsCreateDecisionResponse = z.infer<typeof decisionsCreateDecisionResponseSchema>;

export const decisionsCreateDecisionBodySchema = z.strictObject({
  title: z.string(),
  context: z.string().optional(),
  decision: z.string().optional(),
  optionsConsidered: z.string().optional(),
  status: z.enum(["proposed", "accepted", "superseded", "revisit"]).optional(),
  ownerId: z.string().optional(),
  decidedAt: z.unknown().optional(),
  revisitAt: z.unknown().optional(),
  linkedTicketId: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type DecisionsCreateDecisionBody = z.input<typeof decisionsCreateDecisionBodySchema>;

export const decisionsUpdateDecisionResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  decisionNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  context: z.string().nullable(),
  decision: z.string().nullable(),
  optionsConsidered: z.string().nullable(),
  status: z.enum(["proposed", "accepted", "superseded", "revisit"]),
  ownerId: z.string().nullable(),
  decidedAt: z.iso.datetime({ offset: true }).nullable(),
  revisitAt: z.iso.datetime({ offset: true }).nullable(),
  linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type DecisionsUpdateDecisionResponse = z.infer<typeof decisionsUpdateDecisionResponseSchema>;

export const decisionsUpdateDecisionBodySchema = z.strictObject({
  title: z.string().optional(),
  context: z.string().nullable().optional(),
  decision: z.string().nullable().optional(),
  optionsConsidered: z.string().nullable().optional(),
  status: z.enum(["proposed", "accepted", "superseded", "revisit"]).optional(),
  ownerId: z.string().nullable().optional(),
  decidedAt: z.unknown().nullable().optional(),
  revisitAt: z.unknown().nullable().optional(),
  linkedTicketId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
});
export type DecisionsUpdateDecisionBody = z.input<typeof decisionsUpdateDecisionBodySchema>;

export const epicsListEpicsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
    status: z.string(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    epicId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    points: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    storyPoints: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    startDate: z.string().nullable(),
    dueDate: z.string().nullable(),
    estimate: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    completionPercentage: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    rank: z.string(),
    timeSpent: z.string(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    dependencyCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    assignee: z.object({
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        image: z.string().nullable(),
        email: z.string(),
      }),
    }).nullable().optional(),
  })),
  pagination: z.object({
    limit: z.number().int().gt(0).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type EpicsListEpicsResponse = z.infer<typeof epicsListEpicsResponseSchema>;

export const filesListFilesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    uploadedByMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    fileName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type FilesListFilesResponse = z.infer<typeof filesListFilesResponseSchema>;

export const filesUploadFileResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  uploadedByMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type FilesUploadFileResponse = z.infer<typeof filesUploadFileResponseSchema>;

export const filesUploadFileBodySchema = z.strictObject({
  fileName: z.string(),
  mimeType: z.string(),
  contentBase64: z.string(),
});
export type FilesUploadFileBody = z.input<typeof filesUploadFileBodySchema>;

export const filesGetSignedUrlResponseSchema = z.object({
  url: z.string(),
  expiresIn: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type FilesGetSignedUrlResponse = z.infer<typeof filesGetSignedUrlResponseSchema>;

export const formsListFormsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    formNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    description: z.string().nullable(),
    type: z.enum(["task_request", "bug_report", "feature_request", "change_request", "client_approval", "risk_report", "qa_issue", "generic"]),
    fields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["text", "long_text", "number", "date", "dropdown", "multiselect", "checkbox", "url", "user", "currency", "rating"]),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
    })),
    actions: z.array(z.object({
      type: z.string(),
      config: z.record(z.string(), z.unknown()).optional(),
    })),
    isActive: z.boolean(),
    isPublic: z.boolean(),
    publicToken: z.string().nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gt(0).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type FormsListFormsResponse = z.infer<typeof formsListFormsResponseSchema>;

export const formsCreateFormResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  formNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(["task_request", "bug_report", "feature_request", "change_request", "client_approval", "risk_report", "qa_issue", "generic"]),
  fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(["text", "long_text", "number", "date", "dropdown", "multiselect", "checkbox", "url", "user", "currency", "rating"]),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  publicToken: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type FormsCreateFormResponse = z.infer<typeof formsCreateFormResponseSchema>;

export const formsCreateFormBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["task_request", "bug_report", "feature_request", "change_request", "client_approval", "risk_report", "qa_issue", "generic"]).optional(),
  fields: z.array(z.strictObject({
    key: z.string(),
    label: z.string(),
    type: z.string(),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
    conditionalLogic: z.strictObject({
      action: z.enum(["show", "hide"]),
      match: z.enum(["all", "any"]),
      conditions: z.array(z.strictObject({
        fieldKey: z.string(),
        operator: z.enum(["eq", "neq", "contains", "not_contains", "gt", "lt", "is_empty", "is_not_empty"]),
        value: z.unknown().optional(),
      })),
    }).optional(),
  })),
  actions: z.array(z.strictObject({
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});
export type FormsCreateFormBody = z.input<typeof formsCreateFormBodySchema>;

export const formsGetFormResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  formNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(["task_request", "bug_report", "feature_request", "change_request", "client_approval", "risk_report", "qa_issue", "generic"]),
  fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(["text", "long_text", "number", "date", "dropdown", "multiselect", "checkbox", "url", "user", "currency", "rating"]),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  publicToken: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type FormsGetFormResponse = z.infer<typeof formsGetFormResponseSchema>;

export const formsUpdateFormResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  formNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(["task_request", "bug_report", "feature_request", "change_request", "client_approval", "risk_report", "qa_issue", "generic"]),
  fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(["text", "long_text", "number", "date", "dropdown", "multiselect", "checkbox", "url", "user", "currency", "rating"]),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  publicToken: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type FormsUpdateFormResponse = z.infer<typeof formsUpdateFormResponseSchema>;

export const formsUpdateFormBodySchema = z.strictObject({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  type: z.enum(["task_request", "bug_report", "feature_request", "change_request", "client_approval", "risk_report", "qa_issue", "generic"]).optional(),
  fields: z.array(z.strictObject({
    key: z.string(),
    label: z.string(),
    type: z.string(),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
    conditionalLogic: z.strictObject({
      action: z.enum(["show", "hide"]),
      match: z.enum(["all", "any"]),
      conditions: z.array(z.strictObject({
        fieldKey: z.string(),
        operator: z.enum(["eq", "neq", "contains", "not_contains", "gt", "lt", "is_empty", "is_not_empty"]),
        value: z.unknown().optional(),
      })),
    }).optional(),
  })).optional(),
  actions: z.array(z.strictObject({
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  version: z.iso.datetime({ offset: true }).optional(),
});
export type FormsUpdateFormBody = z.input<typeof formsUpdateFormBodySchema>;

export const submissionsListSubmissionsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    formId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    values: z.record(z.string(), z.unknown()),
    status: z.enum(["submitted", "processed", "rejected"]),
    submittedByName: z.string().nullable(),
    submittedById: z.string().nullable(),
    convertedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
  })),
  pagination: z.object({
    limit: z.number().int().gt(0).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type SubmissionsListSubmissionsResponse = z.infer<typeof submissionsListSubmissionsResponseSchema>;

export const submissionsCreateSubmissionResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  formId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  values: z.record(z.string(), z.unknown()),
  status: z.enum(["submitted", "processed", "rejected"]),
  submittedByName: z.string().nullable(),
  submittedById: z.string().nullable(),
  convertedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  createdTicketIds: z.array(z.number().int().gte(-9007199254740991).lte(9007199254740991)),
  executedActionTypes: z.array(z.string()),
  skippedActionTypes: z.array(z.string()),
});
export type SubmissionsCreateSubmissionResponse = z.infer<typeof submissionsCreateSubmissionResponseSchema>;

export const submissionsCreateSubmissionBodySchema = z.strictObject({
  values: z.record(z.string(), z.unknown()),
  submittedByName: z.string().optional(),
});
export type SubmissionsCreateSubmissionBody = z.input<typeof submissionsCreateSubmissionBodySchema>;

export const submissionsUpdateSubmissionResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  formId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  values: z.record(z.string(), z.unknown()),
  status: z.enum(["submitted", "processed", "rejected"]),
  submittedByName: z.string().nullable(),
  submittedById: z.string().nullable(),
  convertedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type SubmissionsUpdateSubmissionResponse = z.infer<typeof submissionsUpdateSubmissionResponseSchema>;

export const submissionsUpdateSubmissionBodySchema = z.strictObject({
  status: z.enum(["submitted", "processed", "rejected"]),
});
export type SubmissionsUpdateSubmissionBody = z.input<typeof submissionsUpdateSubmissionBodySchema>;

export const ticketImportExportCommitImportResponseSchema = z.object({
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  format: z.enum(["csv", "json"]),
  mode: z.enum(["atomic", "partial"]),
  idempotencyKey: z.string().nullable(),
  jobId: z.string().nullable().optional(),
  replayed: z.boolean(),
  confirmationToken: z.string(),
  summary: z.object({
    attempted: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    imported: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    skipped: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    failed: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    rolledBack: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
  rows: z.array(z.object({
    rowNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    outcome: z.enum(["IMPORTED", "SKIPPED", "FAILED", "ROLLED_BACK"]),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    message: z.string().nullable(),
  })),
  issues: z.array(z.object({
    rowNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    field: z.string().nullable(),
    kind: z.enum(["INVALID", "DUPLICATE_IN_FILE", "DUPLICATE_EXISTING"]),
    message: z.string(),
  })),
});
export type TicketImportExportCommitImportResponse = z.infer<typeof ticketImportExportCommitImportResponseSchema>;

export const ticketImportExportCommitImportBodySchema = z.strictObject({
  format: z.enum(["csv", "json"]),
  content: z.string(),
  confirmationToken: z.string(),
  mode: z.enum(["atomic", "partial"]).optional(),
  adapterType: z.enum(["clickup", "trello", "jira-csv", "jira-xml", "asana", "linear"]).optional(),
});
export type TicketImportExportCommitImportBody = z.input<typeof ticketImportExportCommitImportBodySchema>;

export const ticketImportExportExportTicketsResponseSchema = z.object({
  format: z.enum(["csv", "json"]),
  filename: z.string(),
  contentType: z.string(),
  rowCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  content: z.string(),
});
export type TicketImportExportExportTicketsResponse = z.infer<typeof ticketImportExportExportTicketsResponseSchema>;

export const ticketImportExportPreviewExportResponseSchema = z.object({
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  availableCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  cappedAt: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  columns: z.array(z.string()),
});
export type TicketImportExportPreviewExportResponse = z.infer<typeof ticketImportExportPreviewExportResponseSchema>;

export const ticketImportExportPreviewImportResponseSchema = z.object({
  format: z.enum(["csv", "json"]),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  fileError: z.string().nullable(),
  summary: z.object({
    totalRows: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    importable: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    invalid: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    duplicateInFile: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    duplicateExisting: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  }),
  rows: z.array(z.object({
    rowNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    values: z.object({
      title: z.string(),
      status: z.string(),
      description: z.string().nullable().optional(),
      type: z.enum(["EPIC", "STORY", "TASK", "BUG"]).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      startDate: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      points: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable().optional(),
      storyPoints: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable().optional(),
      estimate: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable().optional(),
      completionPercentage: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
      clientVisible: z.boolean().optional(),
      link: z.string().nullable().optional(),
    }),
  })),
  issues: z.array(z.object({
    rowNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    field: z.string().nullable(),
    kind: z.enum(["INVALID", "DUPLICATE_IN_FILE", "DUPLICATE_EXISTING"]),
    message: z.string(),
  })),
  confirmationToken: z.string().nullable(),
});
export type TicketImportExportPreviewImportResponse = z.infer<typeof ticketImportExportPreviewImportResponseSchema>;

export const ticketImportExportPreviewImportBodySchema = z.strictObject({
  format: z.enum(["csv", "json"]),
  content: z.string(),
  adapterType: z.enum(["clickup", "trello", "jira-csv", "jira-xml", "asana", "linear"]).optional(),
});
export type TicketImportExportPreviewImportBody = z.input<typeof ticketImportExportPreviewImportBodySchema>;

export const incidentsListIncidentsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    incidentNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    description: z.string().nullable(),
    severity: z.enum(["critical", "high", "medium", "low"]),
    status: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]),
    impact: z.string().nullable(),
    ownerId: z.string().nullable(),
    rootCause: z.string().nullable(),
    customerComms: z.string().nullable(),
    detectedAt: z.iso.datetime({ offset: true }).nullable(),
    respondedAt: z.iso.datetime({ offset: true }).nullable(),
    resolvedAt: z.iso.datetime({ offset: true }).nullable(),
    responseDueAt: z.iso.datetime({ offset: true }).nullable(),
    resolutionDueAt: z.iso.datetime({ offset: true }).nullable(),
    linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gt(0).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type IncidentsListIncidentsResponse = z.infer<typeof incidentsListIncidentsResponseSchema>;

export const incidentsCreateIncidentResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  incidentNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  status: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]),
  impact: z.string().nullable(),
  ownerId: z.string().nullable(),
  rootCause: z.string().nullable(),
  customerComms: z.string().nullable(),
  detectedAt: z.iso.datetime({ offset: true }).nullable(),
  respondedAt: z.iso.datetime({ offset: true }).nullable(),
  resolvedAt: z.iso.datetime({ offset: true }).nullable(),
  responseDueAt: z.iso.datetime({ offset: true }).nullable(),
  resolutionDueAt: z.iso.datetime({ offset: true }).nullable(),
  linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type IncidentsCreateIncidentResponse = z.infer<typeof incidentsCreateIncidentResponseSchema>;

export const incidentsCreateIncidentBodySchema = z.strictObject({
  title: z.string(),
  description: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]).optional(),
  impact: z.string().optional(),
  ownerId: z.string().optional(),
  rootCause: z.string().optional(),
  customerComms: z.string().optional(),
  detectedAt: z.unknown().optional(),
  responseDueAt: z.unknown().optional(),
  resolutionDueAt: z.unknown().optional(),
  linkedTicketId: z.number().int().gt(0).lte(9007199254740991).optional(),
  releaseId: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type IncidentsCreateIncidentBody = z.input<typeof incidentsCreateIncidentBodySchema>;

export const incidentsGetIncidentResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  incidentNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  status: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]),
  impact: z.string().nullable(),
  ownerId: z.string().nullable(),
  rootCause: z.string().nullable(),
  customerComms: z.string().nullable(),
  detectedAt: z.iso.datetime({ offset: true }).nullable(),
  respondedAt: z.iso.datetime({ offset: true }).nullable(),
  resolvedAt: z.iso.datetime({ offset: true }).nullable(),
  responseDueAt: z.iso.datetime({ offset: true }).nullable(),
  resolutionDueAt: z.iso.datetime({ offset: true }).nullable(),
  linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  updates: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    incidentId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    message: z.string(),
    newStatus: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    createdByName: z.string().nullable(),
    createdByEmail: z.string().nullable(),
  })),
  decisions: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    incidentId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    decision: z.string(),
    rationale: z.string().nullable(),
    decidedBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
  })),
  followUpActions: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    incidentId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    description: z.string().nullable(),
    ownerId: z.string().nullable(),
    status: z.enum(["open", "in_progress", "done", "cancelled"]),
    dueAt: z.iso.datetime({ offset: true }).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  childrenPagination: z.object({
    updates: z.object({
      limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      hasMore: z.boolean(),
      nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    }),
    decisions: z.object({
      limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      hasMore: z.boolean(),
      nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    }),
    followUpActions: z.object({
      limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      hasMore: z.boolean(),
      nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    }),
  }),
});
export type IncidentsGetIncidentResponse = z.infer<typeof incidentsGetIncidentResponseSchema>;

export const incidentsUpdateIncidentResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  incidentNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  status: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]),
  impact: z.string().nullable(),
  ownerId: z.string().nullable(),
  rootCause: z.string().nullable(),
  customerComms: z.string().nullable(),
  detectedAt: z.iso.datetime({ offset: true }).nullable(),
  respondedAt: z.iso.datetime({ offset: true }).nullable(),
  resolvedAt: z.iso.datetime({ offset: true }).nullable(),
  responseDueAt: z.iso.datetime({ offset: true }).nullable(),
  resolutionDueAt: z.iso.datetime({ offset: true }).nullable(),
  linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type IncidentsUpdateIncidentResponse = z.infer<typeof incidentsUpdateIncidentResponseSchema>;

export const incidentsUpdateIncidentBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]).optional(),
  impact: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  rootCause: z.string().nullable().optional(),
  customerComms: z.string().nullable().optional(),
  detectedAt: z.unknown().nullable().optional(),
  responseDueAt: z.unknown().nullable().optional(),
  resolutionDueAt: z.unknown().nullable().optional(),
  linkedTicketId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  releaseId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  followUpWaiverReason: z.string().optional(),
});
export type IncidentsUpdateIncidentBody = z.input<typeof incidentsUpdateIncidentBodySchema>;

export const incidentsAddDecisionResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  incidentId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  decision: z.string(),
  rationale: z.string().nullable(),
  decidedBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type IncidentsAddDecisionResponse = z.infer<typeof incidentsAddDecisionResponseSchema>;

export const incidentsAddDecisionBodySchema = z.strictObject({
  decision: z.string(),
  rationale: z.string().optional(),
});
export type IncidentsAddDecisionBody = z.input<typeof incidentsAddDecisionBodySchema>;

export const incidentsAddFollowUpActionResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  incidentId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type IncidentsAddFollowUpActionResponse = z.infer<typeof incidentsAddFollowUpActionResponseSchema>;

export const incidentsAddFollowUpActionBodySchema = z.strictObject({
  title: z.string(),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  dueAt: z.unknown().optional(),
});
export type IncidentsAddFollowUpActionBody = z.input<typeof incidentsAddFollowUpActionBodySchema>;

export const incidentsUpdateFollowUpActionResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  incidentId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type IncidentsUpdateFollowUpActionResponse = z.infer<typeof incidentsUpdateFollowUpActionResponseSchema>;

export const incidentsUpdateFollowUpActionBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
  dueAt: z.unknown().nullable().optional(),
});
export type IncidentsUpdateFollowUpActionBody = z.input<typeof incidentsUpdateFollowUpActionBodySchema>;

export const incidentsAddUpdateResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  incidentId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  message: z.string(),
  newStatus: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type IncidentsAddUpdateResponse = z.infer<typeof incidentsAddUpdateResponseSchema>;

export const incidentsAddUpdateBodySchema = z.strictObject({
  message: z.string(),
  newStatus: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]).optional(),
  followUpWaiverReason: z.string().optional(),
});
export type IncidentsAddUpdateBody = z.input<typeof incidentsAddUpdateBodySchema>;

export const intakeListIntakeResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    orgId: z.string(),
    title: z.string(),
    description: z.unknown(),
    source: z.enum(["manual", "web_form", "email", "feedbucket", "portal_client"]),
    status: z.enum(["pending", "accepted", "declined", "duplicate"]),
    submitterEmail: z.string().nullable(),
    submitterName: z.string().nullable(),
    priority: z.string().nullable(),
    requestType: z.string().nullable(),
    linkedWorkItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    declineReason: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type IntakeListIntakeResponse = z.infer<typeof intakeListIntakeResponseSchema>;

export const intakeCreateIntakeResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  orgId: z.string(),
  title: z.string(),
  description: z.unknown(),
  source: z.enum(["manual", "web_form", "email", "feedbucket", "portal_client"]),
  status: z.enum(["pending", "accepted", "declined", "duplicate"]),
  submitterEmail: z.string().nullable(),
  submitterName: z.string().nullable(),
  priority: z.string().nullable(),
  requestType: z.string().nullable(),
  linkedWorkItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  declineReason: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type IntakeCreateIntakeResponse = z.infer<typeof intakeCreateIntakeResponseSchema>;

export const intakeCreateIntakeBodySchema = z.strictObject({
  title: z.string(),
  description: z.unknown().optional(),
  source: z.enum(["manual", "web_form", "email"]).optional(),
  submitterEmail: z.string().optional(),
  submitterName: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  requestType: z.enum(["bug", "feature", "task", "question", "other"]).optional(),
});
export type IntakeCreateIntakeBody = z.input<typeof intakeCreateIntakeBodySchema>;

export const intakeUpdateIntakeResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  orgId: z.string(),
  title: z.string(),
  description: z.unknown(),
  source: z.enum(["manual", "web_form", "email", "feedbucket", "portal_client"]),
  status: z.enum(["pending", "accepted", "declined", "duplicate"]),
  submitterEmail: z.string().nullable(),
  submitterName: z.string().nullable(),
  priority: z.string().nullable(),
  requestType: z.string().nullable(),
  linkedWorkItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  declineReason: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type IntakeUpdateIntakeResponse = z.infer<typeof intakeUpdateIntakeResponseSchema>;

export const intakeUpdateIntakeBodySchema = z.strictObject({
  status: z.enum(["accepted", "declined", "duplicate"]).optional(),
  declineReason: z.string().optional(),
  linkedWorkItemId: z.number().int().gt(0).lte(2147483647).optional(),
  state: z.string().optional(),
  assigneeId: z.string().optional(),
  cycleId: z.number().int().gt(0).lte(2147483647).optional(),
  moduleId: z.number().int().gt(0).lte(2147483647).optional(),
});
export type IntakeUpdateIntakeBody = z.input<typeof intakeUpdateIntakeBodySchema>;

export const projectsGetInvoiceLineDetailResponseSchema = z.object({
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  invoiceLineDetail: z.enum(["summary", "raw"]),
});
export type ProjectsGetInvoiceLineDetailResponse = z.infer<typeof projectsGetInvoiceLineDetailResponseSchema>;

export const projectResourcesListProjectLabelsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
}));
export type ProjectResourcesListProjectLabelsResponse = z.infer<typeof projectResourcesListProjectLabelsResponseSchema>;

export const meetingsListMeetingsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    meetingNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    type: z.enum(["meeting", "standup", "retro", "planning", "review"]),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
    agenda: z.string().nullable(),
    notes: z.string().nullable(),
    scheduledAt: z.iso.datetime({ offset: true }).nullable(),
    endAt: z.iso.datetime({ offset: true }).nullable(),
    durationMinutes: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    timezone: z.string().nullable(),
    recurrenceRule: z.unknown(),
    cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
    attendeeCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    actionItemCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    unresolvedActionItemCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type MeetingsListMeetingsResponse = z.infer<typeof meetingsListMeetingsResponseSchema>;

export const meetingsCreateMeetingResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  meetingNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  type: z.enum(["meeting", "standup", "retro", "planning", "review"]),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  agenda: z.string().nullable(),
  notes: z.string().nullable(),
  scheduledAt: z.iso.datetime({ offset: true }).nullable(),
  endAt: z.iso.datetime({ offset: true }).nullable(),
  durationMinutes: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  timezone: z.string().nullable(),
  recurrenceRule: z.unknown(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type MeetingsCreateMeetingResponse = z.infer<typeof meetingsCreateMeetingResponseSchema>;

export const meetingsCreateMeetingBodySchema = z.strictObject({
  title: z.string(),
  type: z.enum(["meeting", "standup", "retro", "planning", "review"]).optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  agenda: z.string().optional(),
  notes: z.string().optional(),
  scheduledAt: z.unknown().optional(),
  endAt: z.unknown().optional(),
  durationMinutes: z.number().int().gt(0).lte(9007199254740991).optional(),
  cycleId: z.number().int().gt(0).lte(9007199254740991).optional(),
  attendeeUserIds: z.array(z.string()).optional(),
  recurrenceRule: z.object({
    frequency: z.enum(["daily", "weekly", "biweekly", "custom"]),
    weekdays: z.array(z.number().int().gte(0).lte(6)).optional(),
    endDate: z.string().optional(),
    occurrences: z.number().int().gt(0).lte(9007199254740991).optional(),
  }).optional(),
  timezone: z.string().optional(),
});
export type MeetingsCreateMeetingBody = z.input<typeof meetingsCreateMeetingBodySchema>;

export const meetingsGetMeetingResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  meetingNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  type: z.enum(["meeting", "standup", "retro", "planning", "review"]),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  agenda: z.string().nullable(),
  notes: z.string().nullable(),
  scheduledAt: z.iso.datetime({ offset: true }).nullable(),
  endAt: z.iso.datetime({ offset: true }).nullable(),
  durationMinutes: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  timezone: z.string().nullable(),
  recurrenceRule: z.unknown(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  attendees: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    meetingId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    userId: z.string(),
    attended: z.boolean(),
    createdAt: z.iso.datetime({ offset: true }),
  })),
  actionItems: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    meetingId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    description: z.string().nullable(),
    assigneeId: z.string().nullable(),
    dueDate: z.string().nullable(),
    status: z.enum(["open", "in_progress", "done", "converted", "cancelled"]),
    convertedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  standupEntries: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    meetingId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    userId: z.string(),
    membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    yesterday: z.string().nullable(),
    today: z.string().nullable(),
    blockers: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
});
export type MeetingsGetMeetingResponse = z.infer<typeof meetingsGetMeetingResponseSchema>;

export const meetingsUpdateMeetingResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  meetingNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  type: z.enum(["meeting", "standup", "retro", "planning", "review"]),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  agenda: z.string().nullable(),
  notes: z.string().nullable(),
  scheduledAt: z.iso.datetime({ offset: true }).nullable(),
  endAt: z.iso.datetime({ offset: true }).nullable(),
  durationMinutes: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  timezone: z.string().nullable(),
  recurrenceRule: z.unknown(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type MeetingsUpdateMeetingResponse = z.infer<typeof meetingsUpdateMeetingResponseSchema>;

export const meetingsUpdateMeetingBodySchema = z.strictObject({
  title: z.string().optional(),
  type: z.enum(["meeting", "standup", "retro", "planning", "review"]).optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  agenda: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  scheduledAt: z.unknown().nullable().optional(),
  endAt: z.unknown().nullable().optional(),
  durationMinutes: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  cycleId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  recurrenceRule: z.object({
    frequency: z.enum(["daily", "weekly", "biweekly", "custom"]),
    weekdays: z.array(z.number().int().gte(0).lte(6)).optional(),
    endDate: z.string().optional(),
    occurrences: z.number().int().gt(0).lte(9007199254740991).optional(),
  }).nullable().optional(),
  timezone: z.string().nullable().optional(),
});
export type MeetingsUpdateMeetingBody = z.input<typeof meetingsUpdateMeetingBodySchema>;

export const actionItemsCreateItemResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  meetingId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
  status: z.enum(["open", "in_progress", "done", "converted", "cancelled"]),
  convertedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ActionItemsCreateItemResponse = z.infer<typeof actionItemsCreateItemResponseSchema>;

export const actionItemsCreateItemBodySchema = z.strictObject({
  title: z.string(),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.unknown().optional(),
});
export type ActionItemsCreateItemBody = z.input<typeof actionItemsCreateItemBodySchema>;

export const actionItemsUpdateItemResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  meetingId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
  status: z.enum(["open", "in_progress", "done", "converted", "cancelled"]),
  convertedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ActionItemsUpdateItemResponse = z.infer<typeof actionItemsUpdateItemResponseSchema>;

export const actionItemsUpdateItemBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.unknown().nullable().optional(),
  status: z.enum(["open", "in_progress", "done", "converted", "cancelled"]).optional(),
});
export type ActionItemsUpdateItemBody = z.input<typeof actionItemsUpdateItemBodySchema>;

export const actionItemsConvertToTaskResponseSchema = z.object({
  actionItem: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    meetingId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    description: z.string().nullable(),
    assigneeId: z.string().nullable(),
    dueDate: z.string().nullable(),
    status: z.enum(["open", "in_progress", "done", "converted", "cancelled"]),
    convertedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  }),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ActionItemsConvertToTaskResponse = z.infer<typeof actionItemsConvertToTaskResponseSchema>;

export const meetingsAddAttendeeResponseSchema = z.object({
  meetingId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  userId: z.string(),
});
export type MeetingsAddAttendeeResponse = z.infer<typeof meetingsAddAttendeeResponseSchema>;

export const meetingsAddAttendeeBodySchema = z.strictObject({
  userId: z.string(),
});
export type MeetingsAddAttendeeBody = z.input<typeof meetingsAddAttendeeBodySchema>;

export const meetingsUpsertStandupResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  meetingId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  userId: z.string(),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  yesterday: z.string().nullable(),
  today: z.string().nullable(),
  blockers: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type MeetingsUpsertStandupResponse = z.infer<typeof meetingsUpsertStandupResponseSchema>;

export const meetingsUpsertStandupBodySchema = z.strictObject({
  yesterday: z.string().optional(),
  today: z.string().optional(),
  blockers: z.string().optional(),
});
export type MeetingsUpsertStandupBody = z.input<typeof meetingsUpsertStandupBodySchema>;

export const projectResourcesListMembersResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    image: z.string().nullable(),
    email: z.string(),
    role: z.string(),
    joinedAt: z.iso.datetime({ offset: true }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectResourcesListMembersResponse = z.infer<typeof projectResourcesListMembersResponseSchema>;

export const projectResourcesAddMemberResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  role: z.string(),
  hourlyRate: z.string(),
  hourlyRateMinor: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  rateCurrency: z.string().nullable(),
  joinedAt: z.iso.datetime({ offset: true }),
});
export type ProjectResourcesAddMemberResponse = z.infer<typeof projectResourcesAddMemberResponseSchema>;

export const projectResourcesAddMemberBodySchema = z.strictObject({
  userId: z.string(),
  role: z.string().optional(),
});
export type ProjectResourcesAddMemberBody = z.input<typeof projectResourcesAddMemberBodySchema>;

export const projectResourcesUpdateMemberRoleResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  role: z.string(),
  userId: z.string(),
});
export type ProjectResourcesUpdateMemberRoleResponse = z.infer<typeof projectResourcesUpdateMemberRoleResponseSchema>;

export const projectResourcesUpdateMemberRoleBodySchema = z.strictObject({
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});
export type ProjectResourcesUpdateMemberRoleBody = z.input<typeof projectResourcesUpdateMemberRoleBodySchema>;

export const milestonesListMilestonesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    orgId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    targetDate: z.string().nullable(),
    status: z.string().nullable(),
    createdBy: z.string().nullable(),
    ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    owner: z.object({
      membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      image: z.string().nullable(),
    }).nullable(),
    linkedTicketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    completedTicketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    clientVisible: z.boolean(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type MilestonesListMilestonesResponse = z.infer<typeof milestonesListMilestonesResponseSchema>;

export const milestonesCreateMilestoneResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  targetDate: z.string().nullable(),
  status: z.string().nullable(),
  createdBy: z.string().nullable(),
  ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  owner: z.object({
    membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    image: z.string().nullable(),
  }).nullable(),
  linkedTicketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  completedTicketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  clientVisible: z.boolean(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type MilestonesCreateMilestoneResponse = z.infer<typeof milestonesCreateMilestoneResponseSchema>;

export const milestonesCreateMilestoneBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  targetDate: z.string(),
  status: z.enum(["PENDING", "ACHIEVED", "MISSED"]).optional(),
  ownerMembershipId: z.number().int().gte(1).lte(9007199254740991).nullable().optional(),
});
export type MilestonesCreateMilestoneBody = z.input<typeof milestonesCreateMilestoneBodySchema>;

export const milestonesUpdateMilestoneResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  targetDate: z.string().nullable(),
  status: z.string().nullable(),
  createdBy: z.string().nullable(),
  ownerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  owner: z.object({
    membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    image: z.string().nullable(),
  }).nullable(),
  linkedTicketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  completedTicketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  clientVisible: z.boolean(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type MilestonesUpdateMilestoneResponse = z.infer<typeof milestonesUpdateMilestoneResponseSchema>;

export const milestonesUpdateMilestoneBodySchema = z.strictObject({
  version: z.number().int().gt(0).lte(9007199254740991),
  name: z.string().optional(),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  status: z.enum(["PENDING", "ACHIEVED", "MISSED"]).optional(),
  ownerMembershipId: z.number().int().gte(1).lte(9007199254740991).nullable().optional(),
});
export type MilestonesUpdateMilestoneBody = z.input<typeof milestonesUpdateMilestoneBodySchema>;

export const modulesListModulesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    orgId: z.string(),
    status: z.enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"]),
    leadId: z.string().nullable(),
    endDate: z.string().nullable(),
    startDate: z.string().nullable(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdBy: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    description: z.string().nullable(),
    totalItems: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    completedItems: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    progress: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  pagination: z.object({
    limit: z.number().int().gt(0).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ModulesListModulesResponse = z.infer<typeof modulesListModulesResponseSchema>;

export const modulesCreateModuleResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"]),
  leadId: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdBy: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ModulesCreateModuleResponse = z.infer<typeof modulesCreateModuleResponseSchema>;

export const modulesCreateModuleBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"]).optional(),
  leadId: z.string().optional(),
  startDate: z.union([z.literal(""), z.string()]).optional(),
  endDate: z.union([z.literal(""), z.string()]).optional(),
});
export type ModulesCreateModuleBody = z.input<typeof modulesCreateModuleBodySchema>;

export const modulesUpdateModuleResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"]),
  leadId: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdBy: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ModulesUpdateModuleResponse = z.infer<typeof modulesUpdateModuleResponseSchema>;

export const modulesUpdateModuleBodySchema = z.strictObject({
  version: z.number().int().gt(0).lte(9007199254740991),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"]).optional(),
  leadId: z.string().nullable().optional(),
  startDate: z.union([z.literal(""), z.string()]).nullable().optional(),
  endDate: z.union([z.literal(""), z.string()]).nullable().optional(),
});
export type ModulesUpdateModuleBody = z.input<typeof modulesUpdateModuleBodySchema>;

export const projectsReleasesListReleasesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    version: z.string(),
    rowVersion: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    description: z.string().nullable(),
    status: z.enum(["draft", "released", "archived"]),
    releaseDate: z.string().nullable(),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
    readiness: z.enum(["not_started", "in_progress", "ready", "blocked"]).nullable(),
    riskLevel: z.enum(["low", "medium", "high", "critical"]).nullable(),
    createdBy: z.string().nullable(),
    createdByUser: z.object({
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string().nullable(),
    }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    ticketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsReleasesListReleasesResponse = z.infer<typeof projectsReleasesListReleasesResponseSchema>;

export const projectsReleasesCreateReleaseResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  version: z.string(),
  rowVersion: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  description: z.string().nullable(),
  status: z.enum(["draft", "released", "archived"]),
  releaseDate: z.string().nullable(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  readiness: z.enum(["not_started", "in_progress", "ready", "blocked"]).nullable(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).nullable(),
  createdBy: z.string().nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  ticketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ProjectsReleasesCreateReleaseResponse = z.infer<typeof projectsReleasesCreateReleaseResponseSchema>;

export const projectsReleasesCreateReleaseBodySchema = z.strictObject({
  name: z.string(),
  version: z.string(),
  description: z.string().nullable().optional(),
  status: z.enum(["draft", "released", "archived"]).optional(),
  releaseDate: z.union([z.literal(""), z.string()]).nullable().optional(),
  readiness: z.enum(["not_started", "in_progress", "ready", "blocked"]).nullable().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
});
export type ProjectsReleasesCreateReleaseBody = z.input<typeof projectsReleasesCreateReleaseBodySchema>;

export const projectsReleasesUpdateReleaseResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  version: z.string(),
  rowVersion: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  description: z.string().nullable(),
  status: z.enum(["draft", "released", "archived"]),
  releaseDate: z.string().nullable(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  readiness: z.enum(["not_started", "in_progress", "ready", "blocked"]).nullable(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).nullable(),
  createdBy: z.string().nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  ticketCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ProjectsReleasesUpdateReleaseResponse = z.infer<typeof projectsReleasesUpdateReleaseResponseSchema>;

export const projectsReleasesUpdateReleaseBodySchema = z.strictObject({
  rowVersion: z.number().int().gt(0).lte(9007199254740991),
  name: z.string().optional(),
  version: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["draft", "released", "archived"]).optional(),
  releaseDate: z.union([z.literal(""), z.string()]).nullable().optional(),
  readiness: z.enum(["not_started", "in_progress", "ready", "blocked"]).nullable().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
  previewConfirmed: z.boolean().optional(),
});
export type ProjectsReleasesUpdateReleaseBody = z.input<typeof projectsReleasesUpdateReleaseBodySchema>;

export const projectsReportsBurnupResponseSchema = z.array(z.object({
  date: z.string(),
  scope: z.number(),
  completed: z.number(),
}));
export type ProjectsReportsBurnupResponse = z.infer<typeof projectsReportsBurnupResponseSchema>;

export const projectsReportsCfdResponseSchema = z.object({
  dates: z.array(z.string()),
  groups: z.array(z.string()),
  series: z.array(z.object({
    date: z.string(),
    backlog: z.number(),
    unstarted: z.number(),
    started: z.number(),
    completed: z.number(),
    cancelled: z.number(),
  })),
});
export type ProjectsReportsCfdResponse = z.infer<typeof projectsReportsCfdResponseSchema>;

export const projectsReportsCriticalPathResponseSchema = z.object({
  criticalPath: z.array(z.object({
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    estimate: z.number(),
    earliestStart: z.number(),
    earliestFinish: z.number(),
  })),
  totalDuration: z.number(),
  nodeCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  edgeCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  hasCycle: z.boolean(),
});
export type ProjectsReportsCriticalPathResponse = z.infer<typeof projectsReportsCriticalPathResponseSchema>;

export const projectsReportsGetCycleTimeResponseSchema = z.array(z.object({
  week: z.string(),
  avgDays: z.number(),
  count: z.number().int().gte(-9007199254740991).lte(9007199254740991),
}));
export type ProjectsReportsGetCycleTimeResponse = z.infer<typeof projectsReportsGetCycleTimeResponseSchema>;

export const projectsReportsGetLeadTimeResponseSchema = z.array(z.object({
  week: z.string(),
  avgDays: z.number(),
  p50Days: z.number(),
  p90Days: z.number(),
  count: z.number().int().gte(-9007199254740991).lte(9007199254740991),
}));
export type ProjectsReportsGetLeadTimeResponse = z.infer<typeof projectsReportsGetLeadTimeResponseSchema>;

export const projectsReportsSnapshotResponseSchema = z.object({
  captured: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ProjectsReportsSnapshotResponse = z.infer<typeof projectsReportsSnapshotResponseSchema>;

export const projectsReportsVelocityResponseSchema = z.object({
  data: z.array(z.object({
    cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    committedPoints: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    completedPoints: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    committedCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    completedCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsReportsVelocityResponse = z.infer<typeof projectsReportsVelocityResponseSchema>;

export const risksListRisksResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    riskNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    description: z.string().nullable(),
    probability: z.enum(["low", "medium", "high"]),
    impact: z.enum(["low", "medium", "high"]),
    status: z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]),
    ownerId: z.string().nullable(),
    mitigation: z.string().nullable(),
    linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  hasMore: z.boolean(),
  nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type RisksListRisksResponse = z.infer<typeof risksListRisksResponseSchema>;

export const risksCreateRiskResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  riskNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  probability: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]),
  ownerId: z.string().nullable(),
  mitigation: z.string().nullable(),
  linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type RisksCreateRiskResponse = z.infer<typeof risksCreateRiskResponseSchema>;

export const risksCreateRiskBodySchema = z.strictObject({
  title: z.string(),
  description: z.string().optional(),
  probability: z.enum(["low", "medium", "high"]).optional(),
  impact: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]).optional(),
  ownerId: z.string().optional(),
  mitigation: z.string().optional(),
  linkedTicketId: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type RisksCreateRiskBody = z.input<typeof risksCreateRiskBodySchema>;

export const risksGetRiskStatsResponseSchema = z.object({
  total: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  open: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  closed: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  highCritical: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  matrix: z.array(z.object({
    probability: z.enum(["low", "medium", "high"]),
    impact: z.enum(["low", "medium", "high"]),
    openCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
});
export type RisksGetRiskStatsResponse = z.infer<typeof risksGetRiskStatsResponseSchema>;

export const risksUpdateRiskResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  riskNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  probability: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]),
  ownerId: z.string().nullable(),
  mitigation: z.string().nullable(),
  linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type RisksUpdateRiskResponse = z.infer<typeof risksUpdateRiskResponseSchema>;

export const risksUpdateRiskBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  probability: z.enum(["low", "medium", "high"]).optional(),
  impact: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]).optional(),
  ownerId: z.string().nullable().optional(),
  mitigation: z.string().nullable().optional(),
  linkedTicketId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
});
export type RisksUpdateRiskBody = z.input<typeof risksUpdateRiskBodySchema>;

export const projectResourcesGetRosterResponseSchema = z.object({
  teams: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    key: z.string(),
  })),
  members: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  })),
});
export type ProjectResourcesGetRosterResponse = z.infer<typeof projectResourcesGetRosterResponseSchema>;

export const projectsSettingsIterationsGetSettingsResponseSchema = z.object({
  defaultDurationWeeks: z.number().int().gte(1).lte(4),
  namingPrefix: z.string(),
});
export type ProjectsSettingsIterationsGetSettingsResponse = z.infer<typeof projectsSettingsIterationsGetSettingsResponseSchema>;

export const projectsSettingsIterationsUpdateSettingsResponseSchema = z.object({
  defaultDurationWeeks: z.number().int().gte(1).lte(4),
  namingPrefix: z.string(),
});
export type ProjectsSettingsIterationsUpdateSettingsResponse = z.infer<typeof projectsSettingsIterationsUpdateSettingsResponseSchema>;

export const projectsSettingsIterationsUpdateSettingsBodySchema = z.strictObject({
  defaultDurationWeeks: z.number().int().gte(1).lte(4).optional(),
  namingPrefix: z.string().optional(),
});
export type ProjectsSettingsIterationsUpdateSettingsBody = z.input<typeof projectsSettingsIterationsUpdateSettingsBodySchema>;

export const projectsRetentionSettingsGetSettingsResponseSchema = z.object({
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  inheritOrgPolicy: z.boolean(),
  closedTicketRetentionDays: z.number().int().gt(0).lte(9007199254740991).nullable(),
  attachmentRetentionDays: z.number().int().gt(0).lte(9007199254740991).nullable(),
  auditLogRetentionDays: z.number().int().gt(0).lte(9007199254740991).nullable(),
  legalHold: z.boolean(),
  legalHoldReason: z.string().nullable(),
  legalHoldSetAt: z.string().nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  updatedAt: z.string(),
});
export type ProjectsRetentionSettingsGetSettingsResponse = z.infer<typeof projectsRetentionSettingsGetSettingsResponseSchema>;

export const projectsRetentionSettingsUpdatePolicyResponseSchema = z.object({
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  inheritOrgPolicy: z.boolean(),
  closedTicketRetentionDays: z.number().int().gt(0).lte(9007199254740991).nullable(),
  attachmentRetentionDays: z.number().int().gt(0).lte(9007199254740991).nullable(),
  auditLogRetentionDays: z.number().int().gt(0).lte(9007199254740991).nullable(),
  legalHold: z.boolean(),
  legalHoldReason: z.string().nullable(),
  legalHoldSetAt: z.string().nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  updatedAt: z.string(),
});
export type ProjectsRetentionSettingsUpdatePolicyResponse = z.infer<typeof projectsRetentionSettingsUpdatePolicyResponseSchema>;

export const projectsRetentionSettingsUpdatePolicyBodySchema = z.strictObject({
  inheritOrgPolicy: z.boolean(),
  closedTicketRetentionDays: z.number().int().gt(0).lte(9007199254740991).nullable(),
  attachmentRetentionDays: z.number().int().gt(0).lte(9007199254740991).nullable(),
  auditLogRetentionDays: z.number().int().gt(0).lte(9007199254740991).nullable(),
});
export type ProjectsRetentionSettingsUpdatePolicyBody = z.input<typeof projectsRetentionSettingsUpdatePolicyBodySchema>;

export const projectsRetentionSettingsSetLegalHoldBodySchema = z.strictObject({
  active: z.boolean(),
  reason: z.string().optional(),
});
export type ProjectsRetentionSettingsSetLegalHoldBody = z.input<typeof projectsRetentionSettingsSetLegalHoldBodySchema>;

export const testCasesListCasesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    suiteId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    caseNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    preconditions: z.string().nullable(),
    steps: z.array(z.object({
      action: z.string(),
      expected: z.string(),
    })).nullable(),
    expectedResult: z.string().nullable(),
    priority: z.enum(["low", "medium", "high"]),
    component: z.string().nullable(),
    linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    automationStatus: z.enum(["manual", "automated", "planned"]),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  hasMore: z.boolean(),
  nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type TestCasesListCasesResponse = z.infer<typeof testCasesListCasesResponseSchema>;

export const testCasesCreateCaseResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  suiteId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  caseNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  preconditions: z.string().nullable(),
  steps: z.array(z.object({
    action: z.string(),
    expected: z.string(),
  })).nullable(),
  expectedResult: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  component: z.string().nullable(),
  linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  automationStatus: z.enum(["manual", "automated", "planned"]),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type TestCasesCreateCaseResponse = z.infer<typeof testCasesCreateCaseResponseSchema>;

export const testCasesCreateCaseBodySchema = z.strictObject({
  suiteId: z.number().int().gt(0).lte(9007199254740991).optional(),
  title: z.string(),
  preconditions: z.string().optional(),
  steps: z.array(z.object({
    action: z.string(),
    expected: z.string(),
  })).optional(),
  expectedResult: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  component: z.string().optional(),
  linkedTicketId: z.number().int().gt(0).lte(9007199254740991).optional(),
  automationStatus: z.enum(["manual", "automated", "planned"]).optional(),
});
export type TestCasesCreateCaseBody = z.input<typeof testCasesCreateCaseBodySchema>;

export const testCasesUpdateCaseResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  suiteId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  caseNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  preconditions: z.string().nullable(),
  steps: z.array(z.object({
    action: z.string(),
    expected: z.string(),
  })).nullable(),
  expectedResult: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  component: z.string().nullable(),
  linkedTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  automationStatus: z.enum(["manual", "automated", "planned"]),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type TestCasesUpdateCaseResponse = z.infer<typeof testCasesUpdateCaseResponseSchema>;

export const testCasesUpdateCaseBodySchema = z.strictObject({
  suiteId: z.number().int().gt(0).lte(9007199254740991).optional(),
  title: z.string().optional(),
  preconditions: z.string().optional(),
  steps: z.array(z.object({
    action: z.string(),
    expected: z.string(),
  })).optional(),
  expectedResult: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  component: z.string().optional(),
  linkedTicketId: z.number().int().gt(0).lte(9007199254740991).optional(),
  automationStatus: z.enum(["manual", "automated", "planned"]).optional(),
});
export type TestCasesUpdateCaseBody = z.input<typeof testCasesUpdateCaseBodySchema>;

export const testRunsListRunsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    runNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    environment: z.string().nullable(),
    browserDevice: z.string().nullable(),
    testerId: z.string().nullable(),
    testerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    status: z.enum(["not_started", "in_progress", "completed", "aborted"]),
    startedAt: z.iso.datetime({ offset: true }).nullable(),
    completedAt: z.iso.datetime({ offset: true }).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
    passCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    failCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    blockedCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    notRunCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    skippedCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })),
  hasMore: z.boolean(),
  nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type TestRunsListRunsResponse = z.infer<typeof testRunsListRunsResponseSchema>;

export const testRunsCreateRunResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  runNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  testerId: z.string().nullable(),
  testerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["not_started", "in_progress", "completed", "aborted"]),
  startedAt: z.iso.datetime({ offset: true }).nullable(),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type TestRunsCreateRunResponse = z.infer<typeof testRunsCreateRunResponseSchema>;

export const testRunsCreateRunBodySchema = z.strictObject({
  name: z.string(),
  cycleId: z.number().int().gt(0).lte(9007199254740991).optional(),
  releaseId: z.number().int().gt(0).lte(9007199254740991).optional(),
  environment: z.string().optional(),
  browserDevice: z.string().optional(),
  testerId: z.string().optional(),
  caseIds: z.array(z.number().int().gt(0).lte(9007199254740991)).optional(),
  suiteId: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type TestRunsCreateRunBody = z.input<typeof testRunsCreateRunBodySchema>;

export const testRunsGetRunResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  runNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  testerId: z.string().nullable(),
  testerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["not_started", "in_progress", "completed", "aborted"]),
  startedAt: z.iso.datetime({ offset: true }).nullable(),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  results: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    runId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    testCaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    status: z.enum(["not_run", "passed", "failed", "blocked", "skipped"]),
    notes: z.string().nullable(),
    executedBy: z.string().nullable(),
    executedAt: z.iso.datetime({ offset: true }).nullable(),
    linkedWorkItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    testCase: z.object({
      caseNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      title: z.string(),
      priority: z.enum(["low", "medium", "high"]),
    }),
  })),
});
export type TestRunsGetRunResponse = z.infer<typeof testRunsGetRunResponseSchema>;

export const testRunsUpdateRunResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  runNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  releaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  testerId: z.string().nullable(),
  testerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  status: z.enum(["not_started", "in_progress", "completed", "aborted"]),
  startedAt: z.iso.datetime({ offset: true }).nullable(),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type TestRunsUpdateRunResponse = z.infer<typeof testRunsUpdateRunResponseSchema>;

export const testRunsUpdateRunBodySchema = z.strictObject({
  name: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed", "aborted"]).optional(),
  environment: z.string().optional(),
  browserDevice: z.string().optional(),
  testerId: z.string().optional(),
  cycleId: z.number().int().gt(0).lte(9007199254740991).optional(),
  releaseId: z.number().int().gt(0).lte(9007199254740991).optional(),
  version: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type TestRunsUpdateRunBody = z.input<typeof testRunsUpdateRunBodySchema>;

export const testRunsUpdateResultResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  runId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  testCaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  status: z.enum(["not_run", "passed", "failed", "blocked", "skipped"]),
  notes: z.string().nullable(),
  executedBy: z.string().nullable(),
  executedAt: z.iso.datetime({ offset: true }).nullable(),
  linkedWorkItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type TestRunsUpdateResultResponse = z.infer<typeof testRunsUpdateResultResponseSchema>;

export const testRunsUpdateResultBodySchema = z.strictObject({
  status: z.enum(["not_run", "passed", "failed", "blocked", "skipped"]),
  notes: z.string().optional(),
});
export type TestRunsUpdateResultBody = z.input<typeof testRunsUpdateResultBodySchema>;

export const testRunsCreateBugFromResultResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  description: z.string().nullable(),
  type: z.literal("BUG"),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reporterId: z.string().nullable(),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  qaState: z.enum(["new", "triaged", "assigned", "in_progress", "fixed", "ready_for_qa", "verified", "reopened", "closed"]).nullable(),
  severity: z.enum(["blocker", "critical", "major", "minor", "trivial"]).nullable(),
  stepsToReproduce: z.string().nullable(),
  expectedResult: z.string().nullable(),
  actualResult: z.string().nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  affectedReleaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  fixedReleaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  qaOwnerUserId: z.string().nullable(),
  qaOwnerMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  linkedTestCaseId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reopenCount: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdByUserId: z.string().nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type TestRunsCreateBugFromResultResponse = z.infer<typeof testRunsCreateBugFromResultResponseSchema>;

export const testRunsCreateBugFromResultBodySchema = z.strictObject({
  title: z.string().optional(),
  severity: z.enum(["blocker", "critical", "major", "minor", "trivial"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  description: z.string().optional(),
  expectedResult: z.string().optional(),
  actualResult: z.string().optional(),
  environment: z.string().optional(),
  browserDevice: z.string().optional(),
});
export type TestRunsCreateBugFromResultBody = z.input<typeof testRunsCreateBugFromResultBodySchema>;

export const testSuitesListSuitesResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  description: z.string().nullable(),
  parentId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  position: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  caseCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
}));
export type TestSuitesListSuitesResponse = z.infer<typeof testSuitesListSuitesResponseSchema>;

export const projectsTicketsListTicketsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    title: z.string(),
    type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
    status: z.string(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    epicId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    reporterId: z.string().nullable(),
    points: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    storyPoints: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    link: z.string().nullable(),
    rank: z.string(),
    parentTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    originalEstimate: z.string().nullable(),
    timeSpent: z.string(),
    startDate: z.string().nullable(),
    dueDate: z.string().nullable(),
    moduleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    sequenceId: z.string().nullable(),
    estimate: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    descriptionExcerpt: z.string(),
    assigneeId: z.string().nullable(),
    assignee: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
    assignees: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      assignedAt: z.iso.datetime({ offset: true }),
      assignedBy: z.string().nullable(),
      userId: z.string(),
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string(),
        image: z.string().nullable(),
      }),
    })),
    labels: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      labelId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      createdAt: z.iso.datetime({ offset: true }),
      label: z.object({
        id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
        orgId: z.string(),
        name: z.string(),
        color: z.string(),
        createdAt: z.iso.datetime({ offset: true }),
      }),
    })),
    cycle: z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      name: z.string(),
      status: z.enum(["draft", "active", "completed"]),
      startDate: z.string(),
      endDate: z.string(),
    }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsTicketsListTicketsResponse = z.infer<typeof projectsTicketsListTicketsResponseSchema>;

export const projectsTicketsCreateTicketResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  epicId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reporterId: z.string().nullable(),
  reporterMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  points: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  storyPoints: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  link: z.string().nullable(),
  rank: z.string(),
  parentTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  originalEstimate: z.string().nullable(),
  timeSpent: z.string(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  moduleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  sequenceId: z.string().nullable(),
  estimate: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  completionPercentage: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  clientVisible: z.boolean(),
  isRecurring: z.boolean(),
  recurrenceRule: z.unknown(),
  recurrenceParentId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  recurrenceNextRunAt: z.iso.datetime({ offset: true }).nullable(),
  customerId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProjectsTicketsCreateTicketResponse = z.infer<typeof projectsTicketsCreateTicketResponseSchema>;

export const projectsTicketsCreateTicketBodySchema = z.strictObject({
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  reporterId: z.string().optional(),
  epicId: z.number().optional(),
  cycleId: z.number().optional(),
  points: z.number().int().gte(0).lte(9007199254740991).optional(),
  link: z.string().optional(),
  originalEstimate: z.number().gte(0).optional(),
  parentTicketId: z.number().optional(),
  status: z.string().optional(),
  dueDate: z.iso.date().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    interval: z.number().int().gte(1).lte(99),
    daysOfWeek: z.array(z.number().int().gte(0).lte(6)).optional(),
    endDate: z.string().nullable().optional(),
  }).nullable().optional(),
});
export type ProjectsTicketsCreateTicketBody = z.input<typeof projectsTicketsCreateTicketBodySchema>;

export const projectsTicketsBulkUpdateResponseSchema = z.object({
  updated: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketIds: z.array(z.number().int().gte(-9007199254740991).lte(9007199254740991)),
  blocked: z.array(z.object({
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    reason: z.string(),
    dependencyCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  })).optional(),
});
export type ProjectsTicketsBulkUpdateResponse = z.infer<typeof projectsTicketsBulkUpdateResponseSchema>;

export const projectsTicketsBulkUpdateBodySchema = z.strictObject({
  ticketIds: z.array(z.number().int().gt(0).lte(9007199254740991)),
  assigneeId: z.string().optional(),
  status: z.string().optional(),
  cycleId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  parentTicketId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  labelIds: z.array(z.number().int().gt(0).lte(9007199254740991)).optional(),
  archive: z.boolean().optional(),
  versions: z.record(z.string(), z.number().int().gt(0).lte(9007199254740991)).optional(),
});
export type ProjectsTicketsBulkUpdateBody = z.input<typeof projectsTicketsBulkUpdateBodySchema>;

export const projectsTicketsGetColumnCountsResponseSchema = z.record(z.string(), z.number().int().gte(-9007199254740991).lte(9007199254740991));
export type ProjectsTicketsGetColumnCountsResponse = z.infer<typeof projectsTicketsGetColumnCountsResponseSchema>;

export const projectsTicketsGetTicketByKeyResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  epicId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reporterId: z.string().nullable(),
  reporterMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  points: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  storyPoints: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  link: z.string().nullable(),
  rank: z.string(),
  parentTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  originalEstimate: z.string().nullable(),
  timeSpent: z.string(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  moduleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  sequenceId: z.string().nullable(),
  estimate: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  completionPercentage: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  clientVisible: z.boolean(),
  isRecurring: z.boolean(),
  recurrenceRule: z.unknown(),
  recurrenceParentId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  recurrenceNextRunAt: z.iso.datetime({ offset: true }).nullable(),
  customerId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  project: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    key: z.string(),
    orgId: z.string(),
  }).nullable(),
  epic: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
  }).nullable(),
  assignee: z.object({
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
  }).nullable(),
  reporter: z.object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
  assignees: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    assignedAt: z.iso.datetime({ offset: true }),
    assignedBy: z.string().nullable(),
    user: z.object({
      userId: z.string(),
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string(),
        image: z.string().nullable(),
      }).nullable(),
    }),
  })),
  members: z.array(z.object({
    user: z.object({
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string(),
        image: z.string().nullable(),
      }).nullable(),
    }),
  })),
  watchers: z.array(z.object({
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
  })),
  attachments: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    filename: z.string(),
    url: z.string(),
    mimeType: z.string().nullable(),
    uploader: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
  })),
  labels: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    color: z.string(),
  })),
  comments: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    userId: z.string(),
    content: z.string(),
    parentCommentId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
    reactions: z.array(z.object({
      emoji: z.string(),
      userId: z.string(),
    })).optional(),
  })).optional(),
});
export type ProjectsTicketsGetTicketByKeyResponse = z.infer<typeof projectsTicketsGetTicketByKeyResponseSchema>;

export const projectsTicketsGetTicketResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  epicId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reporterId: z.string().nullable(),
  reporterMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  points: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  storyPoints: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  link: z.string().nullable(),
  rank: z.string(),
  parentTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  originalEstimate: z.string().nullable(),
  timeSpent: z.string(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  moduleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  sequenceId: z.string().nullable(),
  estimate: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  completionPercentage: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  clientVisible: z.boolean(),
  isRecurring: z.boolean(),
  recurrenceRule: z.unknown(),
  recurrenceParentId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  recurrenceNextRunAt: z.iso.datetime({ offset: true }).nullable(),
  customerId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  project: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    key: z.string(),
    orgId: z.string(),
  }).nullable(),
  epic: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
  }).nullable(),
  assignee: z.object({
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
  }).nullable(),
  reporter: z.object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
  assignees: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    assignedAt: z.iso.datetime({ offset: true }),
    assignedBy: z.string().nullable(),
    user: z.object({
      userId: z.string(),
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string(),
        image: z.string().nullable(),
      }).nullable(),
    }),
  })),
  members: z.array(z.object({
    user: z.object({
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string(),
        image: z.string().nullable(),
      }).nullable(),
    }),
  })),
  watchers: z.array(z.object({
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
  })),
  attachments: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    filename: z.string(),
    url: z.string(),
    mimeType: z.string().nullable(),
    uploader: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
  })),
  labels: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    color: z.string(),
  })),
  comments: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    userId: z.string(),
    content: z.string(),
    parentCommentId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
    reactions: z.array(z.object({
      emoji: z.string(),
      userId: z.string(),
    })).optional(),
  })).optional(),
});
export type ProjectsTicketsGetTicketResponse = z.infer<typeof projectsTicketsGetTicketResponseSchema>;

export const projectsTicketsUpdateTicketResponseSchema = z.object({
  updated: z.literal(true),
  updatedAt: z.string(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ProjectsTicketsUpdateTicketResponse = z.infer<typeof projectsTicketsUpdateTicketResponseSchema>;

export const projectsTicketsUpdateTicketBodySchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG"]).optional(),
  status: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  epicId: z.number().nullable().optional(),
  moduleId: z.number().nullable().optional(),
  points: z.number().int().gte(0).lte(9007199254740991).nullable().optional(),
  originalEstimate: z.number().gte(0).nullable().optional(),
  startDate: z.iso.date().nullable().optional(),
  dueDate: z.iso.date().nullable().optional(),
  cycleId: z.number().nullable().optional(),
  expectedUpdatedAt: z.string().optional(),
  version: z.number().int().gt(0).lte(9007199254740991),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    interval: z.number().int().gte(1).lte(99),
    daysOfWeek: z.array(z.number().int().gte(0).lte(6)).optional(),
    endDate: z.string().nullable().optional(),
  }).nullable().optional(),
  customerId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  parentTicketId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable().optional(),
});
export type ProjectsTicketsUpdateTicketBody = z.input<typeof projectsTicketsUpdateTicketBodySchema>;

export const projectsTicketsGetActivityResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    action: z.enum(["created", "status_changed", "priority_changed", "assignee_changed", "title_changed", "sprint_changed", "due_date_changed", "comment_added", "comment_updated", "comment_deleted", "label_changed", "estimate_changed", "cycle_changed", "type_changed"]),
    label: z.string(),
    fromValue: z.string().nullable(),
    toValue: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    user: z.object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      image: z.string().nullable(),
    }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ProjectsTicketsGetActivityResponse = z.infer<typeof projectsTicketsGetActivityResponseSchema>;

export const projectsTicketAssociationsAddAttachmentResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ProjectsTicketAssociationsAddAttachmentResponse = z.infer<typeof projectsTicketAssociationsAddAttachmentResponseSchema>;

export const projectsTicketAssociationsAddAttachmentBodySchema = z.strictObject({
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});
export type ProjectsTicketAssociationsAddAttachmentBody = z.input<typeof projectsTicketAssociationsAddAttachmentBodySchema>;

export const projectsTicketChecklistsGetChecklistsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  position: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  items: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    checklistId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    text: z.string(),
    isCompleted: z.boolean(),
    assigneeId: z.string().nullable(),
    dueDate: z.string().nullable(),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
  })).optional(),
}));
export type ProjectsTicketChecklistsGetChecklistsResponse = z.infer<typeof projectsTicketChecklistsGetChecklistsResponseSchema>;

export const projectsTicketChecklistsCreateChecklistResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  position: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  items: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    checklistId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    text: z.string(),
    isCompleted: z.boolean(),
    assigneeId: z.string().nullable(),
    dueDate: z.string().nullable(),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
  })).optional(),
});
export type ProjectsTicketChecklistsCreateChecklistResponse = z.infer<typeof projectsTicketChecklistsCreateChecklistResponseSchema>;

export const projectsTicketChecklistsCreateChecklistBodySchema = z.strictObject({
  title: z.string().optional(),
});
export type ProjectsTicketChecklistsCreateChecklistBody = z.input<typeof projectsTicketChecklistsCreateChecklistBodySchema>;

export const projectsTicketChecklistsUpdateChecklistResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  title: z.string(),
  position: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  items: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    checklistId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    text: z.string(),
    isCompleted: z.boolean(),
    assigneeId: z.string().nullable(),
    dueDate: z.string().nullable(),
    order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
  })).optional(),
});
export type ProjectsTicketChecklistsUpdateChecklistResponse = z.infer<typeof projectsTicketChecklistsUpdateChecklistResponseSchema>;

export const projectsTicketChecklistsUpdateChecklistBodySchema = z.strictObject({
  title: z.string(),
});
export type ProjectsTicketChecklistsUpdateChecklistBody = z.input<typeof projectsTicketChecklistsUpdateChecklistBodySchema>;

export const projectsTicketChecklistsCreateChecklistItemResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  checklistId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  text: z.string(),
  isCompleted: z.boolean(),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
  order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ProjectsTicketChecklistsCreateChecklistItemResponse = z.infer<typeof projectsTicketChecklistsCreateChecklistItemResponseSchema>;

export const projectsTicketChecklistsCreateChecklistItemBodySchema = z.strictObject({
  text: z.string(),
  assigneeId: z.string().optional(),
  dueDate: z.union([z.literal(""), z.string()]).nullable().optional(),
  order: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
});
export type ProjectsTicketChecklistsCreateChecklistItemBody = z.input<typeof projectsTicketChecklistsCreateChecklistItemBodySchema>;

export const projectsTicketChecklistsUpdateChecklistItemResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  checklistId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  text: z.string(),
  isCompleted: z.boolean(),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
  order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ProjectsTicketChecklistsUpdateChecklistItemResponse = z.infer<typeof projectsTicketChecklistsUpdateChecklistItemResponseSchema>;

export const projectsTicketChecklistsUpdateChecklistItemBodySchema = z.strictObject({
  text: z.string().optional(),
  isCompleted: z.boolean().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.union([z.literal(""), z.string()]).nullable().optional(),
  order: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
});
export type ProjectsTicketChecklistsUpdateChecklistItemBody = z.input<typeof projectsTicketChecklistsUpdateChecklistItemBodySchema>;

export const projectsTicketCommentsAddCommentResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  body: z.string(),
  clientVisible: z.boolean(),
  isEdited: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  author: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    email: z.string().nullable(),
  }).nullable(),
});
export type ProjectsTicketCommentsAddCommentResponse = z.infer<typeof projectsTicketCommentsAddCommentResponseSchema>;

export const projectsTicketCommentsAddCommentBodySchema = z.strictObject({
  content: z.string(),
  parentCommentId: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type ProjectsTicketCommentsAddCommentBody = z.input<typeof projectsTicketCommentsAddCommentBodySchema>;

export const projectsTicketCommentsGetCommentResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  body: z.string(),
  clientVisible: z.boolean(),
  isEdited: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  author: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    email: z.string().nullable(),
  }).nullable(),
});
export type ProjectsTicketCommentsGetCommentResponse = z.infer<typeof projectsTicketCommentsGetCommentResponseSchema>;

export const projectsTicketCommentsEditCommentResponseSchema = z.object({
  updated: z.literal(true),
});
export type ProjectsTicketCommentsEditCommentResponse = z.infer<typeof projectsTicketCommentsEditCommentResponseSchema>;

export const projectsTicketCommentsEditCommentBodySchema = z.strictObject({
  content: z.string(),
});
export type ProjectsTicketCommentsEditCommentBody = z.input<typeof projectsTicketCommentsEditCommentBodySchema>;

export const projectsTicketCommentsAddReactionResponseSchema = z.object({
  commentId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  userId: z.string(),
  emoji: z.string(),
});
export type ProjectsTicketCommentsAddReactionResponse = z.infer<typeof projectsTicketCommentsAddReactionResponseSchema>;

export const projectsTicketCommentsAddReactionBodySchema = z.strictObject({
  emoji: z.string(),
});
export type ProjectsTicketCommentsAddReactionBody = z.input<typeof projectsTicketCommentsAddReactionBodySchema>;

export const projectsCustomFieldsGetTicketValuesResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  fieldId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  value: z.unknown(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  field: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    name: z.string(),
    type: z.string(),
    options: z.array(z.string()).nullable(),
    required: z.boolean().nullable(),
    position: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
  }),
}));
export type ProjectsCustomFieldsGetTicketValuesResponse = z.infer<typeof projectsCustomFieldsGetTicketValuesResponseSchema>;

export const projectsCustomFieldsUpsertTicketValuesResponseSchema = z.object({
  success: z.literal(true),
});
export type ProjectsCustomFieldsUpsertTicketValuesResponse = z.infer<typeof projectsCustomFieldsUpsertTicketValuesResponseSchema>;

export const projectsCustomFieldsUpsertTicketValuesBodySchema = z.strictObject({
  values: z.array(z.object({
    fieldId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    value: z.string().nullable().optional(),
  })),
});
export type ProjectsCustomFieldsUpsertTicketValuesBody = z.input<typeof projectsCustomFieldsUpsertTicketValuesBodySchema>;

export const projectsTicketAssociationsGetGitLinksResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  provider: z.enum(["github", "gitlab", "bitbucket"]),
  refType: z.enum(["commit", "pull_request", "branch"]),
  externalId: z.string(),
  title: z.string().nullable(),
  url: z.string().nullable(),
  author: z.string().nullable(),
  status: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
}));
export type ProjectsTicketAssociationsGetGitLinksResponse = z.infer<typeof projectsTicketAssociationsGetGitLinksResponseSchema>;

export const projectsTicketAssociationsAddLabelResponseSchema = z.object({
  success: z.literal(true),
});
export type ProjectsTicketAssociationsAddLabelResponse = z.infer<typeof projectsTicketAssociationsAddLabelResponseSchema>;

export const projectsTicketAssociationsAddLabelBodySchema = z.strictObject({
  labelId: z.number(),
});
export type ProjectsTicketAssociationsAddLabelBody = z.input<typeof projectsTicketAssociationsAddLabelBodySchema>;

export const projectsTicketsRankTicketResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  rank: z.string(),
  status: z.string(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ProjectsTicketsRankTicketResponse = z.infer<typeof projectsTicketsRankTicketResponseSchema>;

export const projectsTicketsRankTicketBodySchema = z.strictObject({
  beforeTicketId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  afterTicketId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  status: z.string().optional(),
  version: z.number().int().gt(0).lte(9007199254740991).optional(),
});
export type ProjectsTicketsRankTicketBody = z.input<typeof projectsTicketsRankTicketBodySchema>;

export const projectsTicketAssociationsListRelatedLinksResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}));
export type ProjectsTicketAssociationsListRelatedLinksResponse = z.infer<typeof projectsTicketAssociationsListRelatedLinksResponseSchema>;

export const projectsTicketAssociationsAddRelatedLinkResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProjectsTicketAssociationsAddRelatedLinkResponse = z.infer<typeof projectsTicketAssociationsAddRelatedLinkResponseSchema>;

export const projectsTicketAssociationsAddRelatedLinkBodySchema = z.strictObject({
  url: z.string(),
  label: z.string().optional(),
});
export type ProjectsTicketAssociationsAddRelatedLinkBody = z.input<typeof projectsTicketAssociationsAddRelatedLinkBodySchema>;

export const projectsTicketAssociationsListRelationsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  relationType: z.enum(["blocks", "blocked_by", "duplicate_of", "relates_to"]),
  direction: z.enum(["outgoing", "incoming"]),
  relatedTicket: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    status: z.string(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
    points: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    project: z.object({
      key: z.string(),
    }).nullable(),
    assignee: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }).nullable(),
  }),
}));
export type ProjectsTicketAssociationsListRelationsResponse = z.infer<typeof projectsTicketAssociationsListRelationsResponseSchema>;

export const projectsTicketAssociationsAddRelationResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  workItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  relatedWorkItemId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  relationType: z.enum(["blocks", "blocked_by", "duplicate_of", "relates_to"]),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ProjectsTicketAssociationsAddRelationResponse = z.infer<typeof projectsTicketAssociationsAddRelationResponseSchema>;

export const projectsTicketAssociationsAddRelationBodySchema = z.strictObject({
  relatedTicketId: z.number().int().gt(0).lte(9007199254740991),
  relationType: z.enum(["blocks", "blocked_by", "duplicate_of", "relates_to"]),
});
export type ProjectsTicketAssociationsAddRelationBody = z.input<typeof projectsTicketAssociationsAddRelationBodySchema>;

export const projectsTicketAssociationsGetSubtasksResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  title: z.string(),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG"]),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ticketNumber: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  epicId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  assigneeMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  reporterId: z.string().nullable(),
  points: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  storyPoints: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  link: z.string().nullable(),
  rank: z.string(),
  parentTicketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  originalEstimate: z.string().nullable(),
  timeSpent: z.string(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  moduleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  cycleId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  sequenceId: z.string().nullable(),
  estimate: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  descriptionExcerpt: z.string(),
  assigneeId: z.string().nullable(),
  assignee: z.object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
  assignees: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    assignedAt: z.iso.datetime({ offset: true }),
    assignedBy: z.string().nullable(),
    userId: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }),
  })),
  labels: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    labelId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
    label: z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      orgId: z.string(),
      name: z.string(),
      color: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  })),
  cycle: z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    status: z.enum(["draft", "active", "completed"]),
    startDate: z.string(),
    endDate: z.string(),
  }).nullable(),
}));
export type ProjectsTicketAssociationsGetSubtasksResponse = z.infer<typeof projectsTicketAssociationsGetSubtasksResponseSchema>;

export const ticketTimeEntriesLogTicketTimeResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  userMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  date: z.string(),
  hours: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  workLink: z.string().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  approvedByMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  approvedAt: z.iso.datetime({ offset: true }).nullable(),
  rejectionReason: z.string().nullable(),
  isBillable: z.boolean(),
  payrollStatus: z.enum(["UNPROCESSED", "EXPORTED"]).nullable(),
  payrollExportId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  timesheetPeriodId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  timerSessionId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  billingType: z.enum(["BILLABLE", "NON_BILLABLE", "FIXED"]).nullable(),
  billRate: z.string().nullable(),
  costRate: z.string().nullable(),
  currency: z.string().nullable(),
  rateSource: z.enum(["RATE_CARD", "PROJECT_MEMBER"]).nullable(),
  invoicingStatus: z.enum(["UNINVOICED", "INVOICE_DRAFTED", "INVOICED"]).nullable(),
  submittedAt: z.iso.datetime({ offset: true }).nullable(),
  lockedAt: z.iso.datetime({ offset: true }).nullable(),
  lockedByMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  voidedAt: z.iso.datetime({ offset: true }).nullable(),
  voidReason: z.string().nullable(),
  source: z.enum(["MANUAL", "TIMER", "API", "IMPORT"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type TicketTimeEntriesLogTicketTimeResponse = z.infer<typeof ticketTimeEntriesLogTicketTimeResponseSchema>;

export const ticketTimeEntriesLogTicketTimeBodySchema = z.strictObject({
  date: z.iso.date(),
  hours: z.number().gt(0),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  workLink: z.string().optional(),
});
export type TicketTimeEntriesLogTicketTimeBody = z.input<typeof ticketTimeEntriesLogTicketTimeBodySchema>;

export const projectsTicketAssociationsGetWatchersResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  ticketId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
  userId: z.string().nullable(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
}));
export type ProjectsTicketAssociationsGetWatchersResponse = z.infer<typeof projectsTicketAssociationsGetWatchersResponseSchema>;

export const projectsTicketAssociationsAddWatcherResponseSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
});
export type ProjectsTicketAssociationsAddWatcherResponse = z.infer<typeof projectsTicketAssociationsAddWatcherResponseSchema>;

export const projectsTicketAssociationsAddWatcherBodySchema = z.strictObject({
  userId: z.string().optional(),
});
export type ProjectsTicketAssociationsAddWatcherBody = z.input<typeof projectsTicketAssociationsAddWatcherBodySchema>;

export const updatesListUpdatesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    authorMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    authorName: z.string(),
    body: z.string(),
    wins: z.string().nullable(),
    risks: z.string().nullable(),
    next: z.string().nullable(),
    citations: z.string().nullable(),
    status: z.enum(["draft", "published"]),
    audience: z.enum(["internal", "client"]),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type UpdatesListUpdatesResponse = z.infer<typeof updatesListUpdatesResponseSchema>;

export const updatesCreateUpdateResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  authorMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  authorName: z.string(),
  body: z.string(),
  wins: z.string().nullable(),
  risks: z.string().nullable(),
  next: z.string().nullable(),
  citations: z.string().nullable(),
  status: z.enum(["draft", "published"]),
  audience: z.enum(["internal", "client"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type UpdatesCreateUpdateResponse = z.infer<typeof updatesCreateUpdateResponseSchema>;

export const updatesCreateUpdateBodySchema = z.strictObject({
  body: z.string(),
  wins: z.string().nullable().optional(),
  risks: z.string().nullable().optional(),
  next: z.string().nullable().optional(),
  citations: z.string().nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
  audience: z.enum(["internal", "client"]).optional(),
});
export type UpdatesCreateUpdateBody = z.input<typeof updatesCreateUpdateBodySchema>;

export const viewsListViewsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    orgId: z.string(),
    createdBy: z.string(),
    name: z.string(),
    filters: z.unknown(),
    groupBy: z.string().nullable(),
    orderBy: z.string().nullable(),
    layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]),
    isPinned: z.boolean(),
    visibility: z.enum(["private", "shared"]),
    displayOptions: z.unknown(),
    scope: z.enum(["project", "workspace"]),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type ViewsListViewsResponse = z.infer<typeof viewsListViewsResponseSchema>;

export const viewsCreateViewResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  orgId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  filters: z.unknown(),
  groupBy: z.string().nullable(),
  orderBy: z.string().nullable(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]),
  isPinned: z.boolean(),
  visibility: z.enum(["private", "shared"]),
  displayOptions: z.unknown(),
  scope: z.enum(["project", "workspace"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ViewsCreateViewResponse = z.infer<typeof viewsCreateViewResponseSchema>;

export const viewsCreateViewBodySchema = z.strictObject({
  name: z.string(),
  filters: z.record(z.string(), z.unknown()).optional(),
  groupBy: z.string().optional(),
  orderBy: z.string().optional(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]).optional(),
  isPinned: z.boolean().optional(),
  visibility: z.enum(["private", "shared"]).optional(),
  displayOptions: z.record(z.string(), z.unknown()).optional(),
});
export type ViewsCreateViewBody = z.input<typeof viewsCreateViewBodySchema>;

export const viewsUpdateViewResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  orgId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  filters: z.unknown(),
  groupBy: z.string().nullable(),
  orderBy: z.string().nullable(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]),
  isPinned: z.boolean(),
  visibility: z.enum(["private", "shared"]),
  displayOptions: z.unknown(),
  scope: z.enum(["project", "workspace"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ViewsUpdateViewResponse = z.infer<typeof viewsUpdateViewResponseSchema>;

export const viewsUpdateViewBodySchema = z.strictObject({
  name: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  groupBy: z.string().nullable().optional(),
  orderBy: z.string().nullable().optional(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]).optional(),
  isPinned: z.boolean().optional(),
  visibility: z.enum(["private", "shared"]).optional(),
  displayOptions: z.record(z.string(), z.unknown()).optional(),
});
export type ViewsUpdateViewBody = z.input<typeof viewsUpdateViewBodySchema>;

export const projectsWebhooksListWebhooksResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    orgId: z.string(),
    projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    url: z.string(),
    events: z.array(z.string()),
    isActive: z.boolean(),
    hasSecret: z.boolean(),
    secretSetAt: z.iso.datetime({ offset: true }).nullable(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    lastDeliveryAt: z.iso.datetime({ offset: true }).nullable(),
    lastDeliveryStatus: z.enum(["pending", "success", "failed"]).nullable(),
    failureRate: z.number().nullable(),
  })),
  hasMore: z.boolean(),
  nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type ProjectsWebhooksListWebhooksResponse = z.infer<typeof projectsWebhooksListWebhooksResponseSchema>;

export const projectsWebhooksCreateWebhookResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  url: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  hasSecret: z.boolean(),
  secretSetAt: z.iso.datetime({ offset: true }).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  lastDeliveryAt: z.iso.datetime({ offset: true }).nullable(),
  lastDeliveryStatus: z.enum(["pending", "success", "failed"]).nullable(),
  failureRate: z.number().nullable(),
});
export type ProjectsWebhooksCreateWebhookResponse = z.infer<typeof projectsWebhooksCreateWebhookResponseSchema>;

export const projectsWebhooksCreateWebhookBodySchema = z.strictObject({
  url: z.string(),
  events: z.array(z.string()),
  secret: z.string().optional(),
});
export type ProjectsWebhooksCreateWebhookBody = z.input<typeof projectsWebhooksCreateWebhookBodySchema>;

export const projectsWebhooksUpdateWebhookResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  url: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  hasSecret: z.boolean(),
  secretSetAt: z.iso.datetime({ offset: true }).nullable(),
  version: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  lastDeliveryAt: z.iso.datetime({ offset: true }).nullable(),
  lastDeliveryStatus: z.enum(["pending", "success", "failed"]).nullable(),
  failureRate: z.number().nullable(),
});
export type ProjectsWebhooksUpdateWebhookResponse = z.infer<typeof projectsWebhooksUpdateWebhookResponseSchema>;

export const projectsWebhooksUpdateWebhookBodySchema = z.strictObject({
  version: z.number().int().gt(0).lte(9007199254740991),
  url: z.string().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});
export type ProjectsWebhooksUpdateWebhookBody = z.input<typeof projectsWebhooksUpdateWebhookBodySchema>;

export const projectsWebhooksListDeliveriesResponseSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    webhookId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    event: z.string(),
    status: z.enum(["pending", "success", "failed"]),
    responseCode: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
    attempts: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    lastError: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    deliveredAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  nextCursor: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type ProjectsWebhooksListDeliveriesResponse = z.infer<typeof projectsWebhooksListDeliveriesResponseSchema>;

export const projectsWebhooksRetryDeliveryResponseSchema = z.object({
  success: z.boolean(),
  responseCode: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type ProjectsWebhooksRetryDeliveryResponse = z.infer<typeof projectsWebhooksRetryDeliveryResponseSchema>;

export const projectsWebhooksGetImpactResponseSchema = z.object({
  webhookId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  events: z.array(z.string()),
  totalDeliveries: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  successfulDeliveries: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  lastSuccessAt: z.iso.datetime({ offset: true }).nullable(),
  lastFailureAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ProjectsWebhooksGetImpactResponse = z.infer<typeof projectsWebhooksGetImpactResponseSchema>;

export const projectsWebhooksRotateSecretResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  secret: z.string(),
  secretHint: z.string(),
});
export type ProjectsWebhooksRotateSecretResponse = z.infer<typeof projectsWebhooksRotateSecretResponseSchema>;

export const projectsWebhooksSendTestResponseSchema = z.object({
  success: z.boolean(),
  responseCode: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
});
export type ProjectsWebhooksSendTestResponse = z.infer<typeof projectsWebhooksSendTestResponseSchema>;

export const whiteboardsListWhiteboardsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    name: z.string(),
    elementCount: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    visibility: z.enum(["project", "private", "public"]),
    createdBy: z.string().nullable(),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  pagination: z.object({
    limit: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
export type WhiteboardsListWhiteboardsResponse = z.infer<typeof whiteboardsListWhiteboardsResponseSchema>;

export const whiteboardsCreateWhiteboardResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  name: z.string(),
  data: z.unknown(),
  visibility: z.enum(["project", "private", "public"]),
  access: z.enum(["view", "edit", "manage"]),
  sharing: z.object({
    visibility: z.enum(["project", "private", "public"]),
    publicAccess: z.enum(["viewer", "editor"]).nullable(),
    shareToken: z.string().nullable(),
    linkExpiresAt: z.iso.datetime({ offset: true }).nullable(),
    allowExport: z.boolean(),
  }).nullable(),
  shares: z.array(z.object({
    userId: z.string(),
    role: z.enum(["viewer", "editor"]),
    name: z.string().nullable(),
    email: z.string(),
  })).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type WhiteboardsCreateWhiteboardResponse = z.infer<typeof whiteboardsCreateWhiteboardResponseSchema>;

export const whiteboardsCreateWhiteboardBodySchema = z.strictObject({
  name: z.string(),
});
export type WhiteboardsCreateWhiteboardBody = z.input<typeof whiteboardsCreateWhiteboardBodySchema>;

export const whiteboardsGetWhiteboardResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  name: z.string(),
  data: z.unknown(),
  visibility: z.enum(["project", "private", "public"]),
  access: z.enum(["view", "edit", "manage"]),
  sharing: z.object({
    visibility: z.enum(["project", "private", "public"]),
    publicAccess: z.enum(["viewer", "editor"]).nullable(),
    shareToken: z.string().nullable(),
    linkExpiresAt: z.iso.datetime({ offset: true }).nullable(),
    allowExport: z.boolean(),
  }).nullable(),
  shares: z.array(z.object({
    userId: z.string(),
    role: z.enum(["viewer", "editor"]),
    name: z.string().nullable(),
    email: z.string(),
  })).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type WhiteboardsGetWhiteboardResponse = z.infer<typeof whiteboardsGetWhiteboardResponseSchema>;

export const whiteboardsUpdateWhiteboardResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  name: z.string(),
  data: z.unknown(),
  visibility: z.enum(["project", "private", "public"]),
  access: z.enum(["view", "edit", "manage"]),
  sharing: z.object({
    visibility: z.enum(["project", "private", "public"]),
    publicAccess: z.enum(["viewer", "editor"]).nullable(),
    shareToken: z.string().nullable(),
    linkExpiresAt: z.iso.datetime({ offset: true }).nullable(),
    allowExport: z.boolean(),
  }).nullable(),
  shares: z.array(z.object({
    userId: z.string(),
    role: z.enum(["viewer", "editor"]),
    name: z.string().nullable(),
    email: z.string(),
  })).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type WhiteboardsUpdateWhiteboardResponse = z.infer<typeof whiteboardsUpdateWhiteboardResponseSchema>;

export const whiteboardsUpdateWhiteboardBodySchema = z.strictObject({
  name: z.string().optional(),
  data: z.object({
    type: z.string().optional(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
    source: z.string().optional(),
    elements: z.array(z.record(z.string(), z.unknown())),
    appState: z.record(z.string(), z.unknown()).optional(),
    files: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});
export type WhiteboardsUpdateWhiteboardBody = z.input<typeof whiteboardsUpdateWhiteboardBodySchema>;

export const whiteboardSharingSetSharesResponseSchema = z.array(z.object({
  userId: z.string(),
  role: z.enum(["viewer", "editor"]),
  name: z.string().nullable(),
  email: z.string(),
}));
export type WhiteboardSharingSetSharesResponse = z.infer<typeof whiteboardSharingSetSharesResponseSchema>;

export const whiteboardSharingSetSharesBodySchema = z.strictObject({
  shares: z.array(z.object({
    userId: z.string(),
    role: z.enum(["viewer", "editor"]),
  })),
});
export type WhiteboardSharingSetSharesBody = z.input<typeof whiteboardSharingSetSharesBodySchema>;

export const whiteboardSharingUpdateSharingResponseSchema = z.object({
  visibility: z.enum(["project", "private", "public"]),
  publicAccess: z.enum(["viewer", "editor"]).nullable(),
  shareToken: z.string().nullable(),
  linkExpiresAt: z.iso.datetime({ offset: true }).nullable(),
  allowExport: z.boolean(),
});
export type WhiteboardSharingUpdateSharingResponse = z.infer<typeof whiteboardSharingUpdateSharingResponseSchema>;

export const whiteboardSharingUpdateSharingBodySchema = z.strictObject({
  visibility: z.enum(["project", "private", "public"]).optional(),
  publicAccess: z.enum(["viewer", "editor"]).optional(),
  linkExpiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  allowExport: z.boolean().optional(),
});
export type WhiteboardSharingUpdateSharingBody = z.input<typeof whiteboardSharingUpdateSharingBodySchema>;

export const whiteboardSharingRotateShareTokenResponseSchema = z.object({
  visibility: z.enum(["project", "private", "public"]),
  publicAccess: z.enum(["viewer", "editor"]).nullable(),
  shareToken: z.string().nullable(),
  linkExpiresAt: z.iso.datetime({ offset: true }).nullable(),
  allowExport: z.boolean(),
});
export type WhiteboardSharingRotateShareTokenResponse = z.infer<typeof whiteboardSharingRotateShareTokenResponseSchema>;

export const workflowUpdateWipLimitResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  order: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  color: z.string().nullable(),
  type: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]),
  wipLimit: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type WorkflowUpdateWipLimitResponse = z.infer<typeof workflowUpdateWipLimitResponseSchema>;

export const workflowUpdateWipLimitBodySchema = z.strictObject({
  wipLimit: z.number().int().gte(0).lte(9007199254740991).nullable(),
});
export type WorkflowUpdateWipLimitBody = z.input<typeof workflowUpdateWipLimitBodySchema>;

export const workflowListTransitionsResponseSchema = z.array(z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  fromStatusId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  toStatusId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string().nullable(),
  requiresApproval: z.boolean(),
  requiredFields: z.array(z.string()),
  allowedRoles: z.array(z.string()),
  createdByMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
}));
export type WorkflowListTransitionsResponse = z.infer<typeof workflowListTransitionsResponseSchema>;

export const workflowCreateTransitionResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  fromStatusId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  toStatusId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string().nullable(),
  requiresApproval: z.boolean(),
  requiredFields: z.array(z.string()),
  allowedRoles: z.array(z.string()),
  createdByMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type WorkflowCreateTransitionResponse = z.infer<typeof workflowCreateTransitionResponseSchema>;

export const workflowCreateTransitionBodySchema = z.strictObject({
  fromStatusId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  toStatusId: z.number().int().gt(0).lte(9007199254740991),
  name: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  requiredFields: z.array(z.string()).optional(),
  allowedRoles: z.array(z.string()).optional(),
});
export type WorkflowCreateTransitionBody = z.input<typeof workflowCreateTransitionBodySchema>;

export const workflowUpdateTransitionResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  orgId: z.string(),
  projectId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  fromStatusId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  toStatusId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string().nullable(),
  requiresApproval: z.boolean(),
  requiredFields: z.array(z.string()),
  allowedRoles: z.array(z.string()),
  createdByMembershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type WorkflowUpdateTransitionResponse = z.infer<typeof workflowUpdateTransitionResponseSchema>;

export const workflowUpdateTransitionBodySchema = z.strictObject({
  fromStatusId: z.number().int().gt(0).lte(9007199254740991).nullable().optional(),
  toStatusId: z.number().int().gt(0).lte(9007199254740991).optional(),
  name: z.string().nullable().optional(),
  requiresApproval: z.boolean().optional(),
  requiredFields: z.array(z.string()).optional(),
  allowedRoles: z.array(z.string()).optional(),
});
export type WorkflowUpdateTransitionBody = z.input<typeof workflowUpdateTransitionBodySchema>;

export const workloadCapacityCapacityResponseSchema = z.object({
  members: z.array(z.object({
    userId: z.string(),
    membershipId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    teams: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      name: z.string(),
    })),
    workingDaysInWindow: z.number(),
    leaveDays: z.number(),
    halfLeaveDays: z.number(),
    netCapacityDays: z.number(),
    capacityHours: z.number().nullable(),
    loggedHours: z.number(),
    estimateHours: z.number().nullable(),
    allocationPercent: z.number().nullable(),
    varianceHours: z.number().nullable(),
    isOverAllocated: z.boolean(),
    isZeroCapacity: z.boolean(),
    utilizationPercent: z.number().nullable(),
  })),
});
export type WorkloadCapacityCapacityResponse = z.infer<typeof workloadCapacityCapacityResponseSchema>;

export const feedbucketRouteToIntakeResponseSchema = z.object({
  intakeId: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  created: z.boolean(),
});
export type FeedbucketRouteToIntakeResponse = z.infer<typeof feedbucketRouteToIntakeResponseSchema>;

export const notificationsUnreadCountResponseSchema = z.object({
  count: z.number().int().gte(0).lte(9007199254740991),
});
export type NotificationsUnreadCountResponse = z.infer<typeof notificationsUnreadCountResponseSchema>;

export const publicGetPublicFormResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  fields: z.array(z.object({
    key: z.string(),
    type: z.string(),
    label: z.string(),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })),
  publicToken: z.string().nullable(),
});
export type PublicGetPublicFormResponse = z.infer<typeof publicGetPublicFormResponseSchema>;

export const publicSubmitPublicFormResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  message: z.string(),
});
export type PublicSubmitPublicFormResponse = z.infer<typeof publicSubmitPublicFormResponseSchema>;

export const publicSubmitPublicFormBodySchema = z.strictObject({
  values: z.record(z.string(), z.unknown()),
  submittedByName: z.string().optional(),
});
export type PublicSubmitPublicFormBody = z.input<typeof publicSubmitPublicFormBodySchema>;

export const publicGetProjectIntakeFormResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  fields: z.array(z.object({
    key: z.string(),
    type: z.string(),
    label: z.string(),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })),
  publicToken: z.string().nullable(),
});
export type PublicGetProjectIntakeFormResponse = z.infer<typeof publicGetProjectIntakeFormResponseSchema>;

export const publicGetRoadmapResponseSchema = z.object({
  orgName: z.string().nullable(),
  roadmap: z.object({
    planned: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      title: z.string(),
      description: z.string().nullable(),
      status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
      category: z.string().nullable(),
      targetQuarter: z.string().nullable(),
      votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    })),
    in_progress: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      title: z.string(),
      description: z.string().nullable(),
      status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
      category: z.string().nullable(),
      targetQuarter: z.string().nullable(),
      votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    })),
    completed: z.array(z.object({
      id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
      title: z.string(),
      description: z.string().nullable(),
      status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
      category: z.string().nullable(),
      targetQuarter: z.string().nullable(),
      votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    })),
  }),
  feedback: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    createdAt: z.iso.datetime({ offset: true }),
  })),
  changelog: z.array(z.object({
    id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
    title: z.string(),
    content: z.string().nullable(),
    version: z.string().nullable(),
    type: z.enum(["feature", "improvement", "fix"]).nullable(),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
});
export type PublicGetRoadmapResponse = z.infer<typeof publicGetRoadmapResponseSchema>;

export const publicSubmitRoadmapFeedbackResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  message: z.string(),
});
export type PublicSubmitRoadmapFeedbackResponse = z.infer<typeof publicSubmitRoadmapFeedbackResponseSchema>;

export const publicSubmitRoadmapFeedbackBodySchema = z.strictObject({
  title: z.string(),
  description: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
});
export type PublicSubmitRoadmapFeedbackBody = z.input<typeof publicSubmitRoadmapFeedbackBodySchema>;

export const publicVoteRoadmapResponseSchema = z.object({
  id: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  type: z.enum(["roadmap", "feedback"]),
  votes: z.number().int().gte(-9007199254740991).lte(9007199254740991),
  voted: z.boolean(),
});
export type PublicVoteRoadmapResponse = z.infer<typeof publicVoteRoadmapResponseSchema>;

export const publicVoteRoadmapBodySchema = z.strictObject({
  type: z.enum(["roadmap", "feedback"]),
  id: z.number().int().gt(0).lte(9007199254740991),
  voterKey: z.string(),
});
export type PublicVoteRoadmapBody = z.input<typeof publicVoteRoadmapBodySchema>;

export const publicWhiteboardLinksGetByTokenResponseSchema = z.object({
  name: z.string(),
  data: z.unknown(),
  access: z.enum(["edit", "view"]),
  allowExport: z.boolean(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type PublicWhiteboardLinksGetByTokenResponse = z.infer<typeof publicWhiteboardLinksGetByTokenResponseSchema>;

export const publicWhiteboardLinksUpdateByTokenResponseSchema = z.object({
  success: z.literal(true),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type PublicWhiteboardLinksUpdateByTokenResponse = z.infer<typeof publicWhiteboardLinksUpdateByTokenResponseSchema>;

export const publicWhiteboardLinksUpdateByTokenBodySchema = z.strictObject({
  data: z.object({
    type: z.string().optional(),
    version: z.number().int().gte(-9007199254740991).lte(9007199254740991).optional(),
    source: z.string().optional(),
    elements: z.array(z.record(z.string(), z.unknown())),
    appState: z.record(z.string(), z.unknown()).optional(),
    files: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type PublicWhiteboardLinksUpdateByTokenBody = z.input<typeof publicWhiteboardLinksUpdateByTokenBodySchema>;

export const storageDownloadResponseSchema = z.string();
export type StorageDownloadResponse = z.infer<typeof storageDownloadResponseSchema>;


export const BUILD_CONTRACT_OPERATIONS = [
  { operationId: "AgentTokensController_list", method: "GET", path: "/agent-tokens", response: "agentTokensListResponseSchema" },
  { operationId: "AgentTokensController_create", method: "POST", path: "/agent-tokens", response: "agentTokensCreateResponseSchema", body: "agentTokensCreateBodySchema" },
  { operationId: "AgentTokensController_revoke", method: "DELETE", path: "/agent-tokens/{tokenId}" },
  { operationId: "ProjectsAiController_summary", method: "POST", path: "/ai/projects/{projectId}/summary", response: "projectsAiSummaryResponseSchema" },
  { operationId: "ProjectsAiController_improveDraftDescription", method: "POST", path: "/ai/projects/{projectId}/tickets/draft/improve-description", response: "projectsAiImproveDraftDescriptionResponseSchema", body: "projectsAiImproveDraftDescriptionBodySchema" },
  { operationId: "ProjectsAiController_suggestDraftFields", method: "POST", path: "/ai/projects/{projectId}/tickets/draft/suggest-fields", response: "projectsAiSuggestDraftFieldsResponseSchema", body: "projectsAiSuggestDraftFieldsBodySchema" },
  { operationId: "ProjectsAiController_suggestDraftTitle", method: "POST", path: "/ai/projects/{projectId}/tickets/draft/suggest-title", response: "projectsAiSuggestDraftTitleResponseSchema", body: "projectsAiSuggestDraftTitleBodySchema" },
  { operationId: "ProjectsAiController_generateTicketChecklist", method: "POST", path: "/ai/tickets/{projectId}/{ticketId}/generate-checklist", response: "projectsAiGenerateTicketChecklistResponseSchema" },
  { operationId: "ProjectsAiController_ticketHandoff", method: "POST", path: "/ai/tickets/{projectId}/{ticketId}/handoff", response: "projectsAiTicketHandoffResponseSchema" },
  { operationId: "ProjectsAiController_improveTicketDescription", method: "POST", path: "/ai/tickets/{projectId}/{ticketId}/improve-description", response: "projectsAiImproveTicketDescriptionResponseSchema", body: "projectsAiImproveTicketDescriptionBodySchema" },
  { operationId: "ProjectsAiController_suggestTicketSubtasks", method: "POST", path: "/ai/tickets/{projectId}/{ticketId}/suggest-subtasks", response: "projectsAiSuggestTicketSubtasksResponseSchema" },
  { operationId: "ProjectsAiController_summarizeTicket", method: "POST", path: "/ai/tickets/{projectId}/{ticketId}/summarize", response: "projectsAiSummarizeTicketResponseSchema" },
  { operationId: "ProjectsAiController_summarizeTicketComments", method: "POST", path: "/ai/tickets/{projectId}/{ticketId}/summarize-comments", response: "projectsAiSummarizeTicketCommentsResponseSchema" },
  { operationId: "ProjectsController_listProjects", method: "GET", path: "/build", response: "projectsListProjectsResponseSchema" },
  { operationId: "ProjectsController_createProject", method: "POST", path: "/build", response: "projectsCreateProjectResponseSchema", body: "projectsCreateProjectBodySchema" },
  { operationId: "AgentPulseController_getTopSignal", method: "GET", path: "/build/agent-pulse/top-signal", response: "agentPulseGetTopSignalResponseSchema" },
  { operationId: "ProjectsTicketsController_getAllWork", method: "GET", path: "/build/all-work", response: "projectsTicketsGetAllWorkResponseSchema" },
  { operationId: "ProjectsTicketsController_getAllWorkIds", method: "GET", path: "/build/all-work/ids", response: "projectsTicketsGetAllWorkIdsResponseSchema" },
  { operationId: "ApprovalsInboxController_getInbox", method: "GET", path: "/build/approvals/inbox", response: "approvalsInboxGetInboxResponseSchema" },
  { operationId: "ProjectsRoadmapController_listChangelog", method: "GET", path: "/build/changelog", response: "projectsRoadmapListChangelogResponseSchema" },
  { operationId: "ProjectsRoadmapController_createChangelog", method: "POST", path: "/build/changelog", response: "projectsRoadmapCreateChangelogResponseSchema", body: "projectsRoadmapCreateChangelogBodySchema" },
  { operationId: "ProjectsRoadmapController_updateChangelog", method: "PATCH", path: "/build/changelog/{entryId}", response: "projectsRoadmapUpdateChangelogResponseSchema", body: "projectsRoadmapUpdateChangelogBodySchema" },
  { operationId: "ProjectsRoadmapController_deleteChangelog", method: "DELETE", path: "/build/changelog/{entryId}" },
  { operationId: "DashboardLayoutController_getLayout", method: "GET", path: "/build/command-center/layout", response: "dashboardLayoutGetLayoutResponseSchema" },
  { operationId: "DashboardLayoutController_saveLayout", method: "PUT", path: "/build/command-center/layout", response: "dashboardLayoutSaveLayoutResponseSchema", body: "dashboardLayoutSaveLayoutBodySchema" },
  { operationId: "CommentDraftsController_readByTicket", method: "GET", path: "/build/comment-drafts/by-ticket/{ticketId}", response: "commentDraftsReadByTicketResponseSchema" },
  { operationId: "CommentDraftsController_deleteByTicket", method: "DELETE", path: "/build/comment-drafts/by-ticket/{ticketId}", response: "commentDraftsDeleteByTicketResponseSchema" },
  { operationId: "CommentDraftsController_listMine", method: "GET", path: "/build/comment-drafts/mine", response: "commentDraftsListMineResponseSchema" },
  { operationId: "CommentDraftsController_deleteAll", method: "DELETE", path: "/build/comment-drafts/mine", response: "commentDraftsDeleteAllResponseSchema" },
  { operationId: "CommentDraftsController_upsert", method: "PUT", path: "/build/comment-drafts/tickets/{ticketId}", response: "commentDraftsUpsertResponseSchema", body: "commentDraftsUpsertBodySchema" },
  { operationId: "CommentDraftsController_generateDraft", method: "POST", path: "/build/comment-drafts/tickets/{ticketId}/generate-draft", response: "commentDraftsGenerateDraftResponseSchema" },
  { operationId: "CommentDraftsController_deleteOne", method: "DELETE", path: "/build/comment-drafts/{draftId}", response: "commentDraftsDeleteOneResponseSchema" },
  { operationId: "ProjectsRoadmapController_listFeedback", method: "GET", path: "/build/feedback", response: "projectsRoadmapListFeedbackResponseSchema" },
  { operationId: "ProjectsRoadmapController_updateFeedback", method: "PATCH", path: "/build/feedback/{postId}", response: "projectsRoadmapUpdateFeedbackResponseSchema", body: "projectsRoadmapUpdateFeedbackBodySchema" },
  { operationId: "ProjectsRoadmapController_deleteFeedback", method: "DELETE", path: "/build/feedback/{postId}" },
  { operationId: "ProjectsRoadmapController_mergeFeedback", method: "POST", path: "/build/feedback/{postId}/merge", response: "projectsRoadmapMergeFeedbackResponseSchema", body: "projectsRoadmapMergeFeedbackBodySchema" },
  { operationId: "ProjectsController_listLabels", method: "GET", path: "/build/labels", response: "projectsListLabelsResponseSchema" },
  { operationId: "ProjectsController_createLabel", method: "POST", path: "/build/labels", response: "projectsCreateLabelResponseSchema", body: "projectsCreateLabelBodySchema" },
  { operationId: "ProjectsController_updateLabel", method: "PATCH", path: "/build/labels/{labelId}", response: "projectsUpdateLabelResponseSchema", body: "projectsUpdateLabelBodySchema" },
  { operationId: "ProjectsController_deleteLabel", method: "DELETE", path: "/build/labels/{labelId}" },
  { operationId: "LandingPreferenceController_getPreference", method: "GET", path: "/build/landing-preference", response: "landingPreferenceGetPreferenceResponseSchema" },
  { operationId: "LandingPreferenceController_setPreference", method: "PUT", path: "/build/landing-preference", response: "landingPreferenceSetPreferenceResponseSchema", body: "landingPreferenceSetPreferenceBodySchema" },
  { operationId: "ManagedProductsController_listManagedProducts", method: "GET", path: "/build/managed-products", response: "managedProductsListManagedProductsResponseSchema" },
  { operationId: "ManagedProductsController_createManagedProduct", method: "POST", path: "/build/managed-products", response: "managedProductsCreateManagedProductResponseSchema", body: "managedProductsCreateManagedProductBodySchema" },
  { operationId: "ManagedProductsController_bulkUpdateManagedProducts", method: "POST", path: "/build/managed-products/bulk", response: "managedProductsBulkUpdateManagedProductsResponseSchema", body: "managedProductsBulkUpdateManagedProductsBodySchema" },
  { operationId: "ManagedProductsController_getManagedProduct", method: "GET", path: "/build/managed-products/{managedProductId}", response: "managedProductsGetManagedProductResponseSchema" },
  { operationId: "ManagedProductsController_updateManagedProduct", method: "PATCH", path: "/build/managed-products/{managedProductId}", response: "managedProductsUpdateManagedProductResponseSchema", body: "managedProductsUpdateManagedProductBodySchema" },
  { operationId: "ManagedProductsController_deleteManagedProduct", method: "DELETE", path: "/build/managed-products/{managedProductId}" },
  { operationId: "ManagedProductsController_getProductInsights", method: "GET", path: "/build/managed-products/{managedProductId}/insights", response: "managedProductsGetProductInsightsResponseSchema" },
  { operationId: "BuildMembersController_list", method: "GET", path: "/build/members", response: "buildMembersListResponseSchema" },
  { operationId: "BuildMembersController_add", method: "POST", path: "/build/members", response: "buildMembersAddResponseSchema", body: "buildMembersAddBodySchema" },
  { operationId: "BuildMembersController_remove", method: "DELETE", path: "/build/members/{userId}" },
  { operationId: "ProjectResourcesController_listOrgCustomStates", method: "GET", path: "/build/org-custom-states", response: "projectResourcesListOrgCustomStatesResponseSchema" },
  { operationId: "ClientPortalController_listPortalProjects", method: "GET", path: "/build/portal/projects", response: "clientPortalListPortalProjectsResponseSchema" },
  { operationId: "ClientPortalController_listPortalChangeRequests", method: "GET", path: "/build/portal/projects/{projectId}/change-requests", response: "clientPortalListPortalChangeRequestsResponseSchema" },
  { operationId: "ClientPortalController_createPortalChangeRequest", method: "POST", path: "/build/portal/projects/{projectId}/change-requests", response: "clientPortalCreatePortalChangeRequestResponseSchema", body: "clientPortalCreatePortalChangeRequestBodySchema" },
  { operationId: "ClientPortalController_getProjectOverview", method: "GET", path: "/build/portal/projects/{projectId}/overview", response: "clientPortalGetProjectOverviewResponseSchema" },
  { operationId: "PortfoliosController_listPortfolios", method: "GET", path: "/build/portfolios", response: "portfoliosListPortfoliosResponseSchema" },
  { operationId: "PortfoliosController_createPortfolio", method: "POST", path: "/build/portfolios", response: "portfoliosCreatePortfolioResponseSchema", body: "portfoliosCreatePortfolioBodySchema" },
  { operationId: "PortfoliosController_getPortfolio", method: "GET", path: "/build/portfolios/{portfolioId}", response: "portfoliosGetPortfolioResponseSchema" },
  { operationId: "PortfoliosController_updatePortfolio", method: "PATCH", path: "/build/portfolios/{portfolioId}", response: "portfoliosUpdatePortfolioResponseSchema", body: "portfoliosUpdatePortfolioBodySchema" },
  { operationId: "PortfoliosController_deletePortfolio", method: "DELETE", path: "/build/portfolios/{portfolioId}" },
  { operationId: "PortfoliosController_linkProject", method: "POST", path: "/build/portfolios/{portfolioId}/projects", response: "portfoliosLinkProjectResponseSchema", body: "portfoliosLinkProjectBodySchema" },
  { operationId: "PortfoliosController_unlinkProject", method: "DELETE", path: "/build/portfolios/{portfolioId}/projects/{projectId}" },
  { operationId: "ProgramsController_listPrograms", method: "GET", path: "/build/programs", response: "programsListProgramsResponseSchema" },
  { operationId: "ProgramsController_createProgram", method: "POST", path: "/build/programs", response: "programsCreateProgramResponseSchema", body: "programsCreateProgramBodySchema" },
  { operationId: "ProgramsController_getProgram", method: "GET", path: "/build/programs/{programId}", response: "programsGetProgramResponseSchema" },
  { operationId: "ProgramsController_updateProgram", method: "PATCH", path: "/build/programs/{programId}", response: "programsUpdateProgramResponseSchema", body: "programsUpdateProgramBodySchema" },
  { operationId: "ProgramsController_deleteProgram", method: "DELETE", path: "/build/programs/{programId}" },
  { operationId: "ProjectsReleasesController_listOrgReleases", method: "GET", path: "/build/releases", response: "projectsReleasesListOrgReleasesResponseSchema" },
  { operationId: "RisksController_listOrgRisks", method: "GET", path: "/build/risks", response: "risksListOrgRisksResponseSchema" },
  { operationId: "ProjectsRoadmapController_listRoadmap", method: "GET", path: "/build/roadmap", response: "projectsRoadmapListRoadmapResponseSchema" },
  { operationId: "ProjectsRoadmapController_createRoadmap", method: "POST", path: "/build/roadmap", response: "projectsRoadmapCreateRoadmapResponseSchema", body: "projectsRoadmapCreateRoadmapBodySchema" },
  { operationId: "ProjectsRoadmapController_readRoadmapPublication", method: "GET", path: "/build/roadmap-publication", response: "projectsRoadmapReadRoadmapPublicationResponseSchema" },
  { operationId: "ProjectsRoadmapController_publishRoadmap", method: "POST", path: "/build/roadmap-publication", response: "projectsRoadmapPublishRoadmapResponseSchema" },
  { operationId: "ProjectsRoadmapController_updateRoadmap", method: "PATCH", path: "/build/roadmap/{itemId}", response: "projectsRoadmapUpdateRoadmapResponseSchema", body: "projectsRoadmapUpdateRoadmapBodySchema" },
  { operationId: "ProjectsRoadmapController_deleteRoadmap", method: "DELETE", path: "/build/roadmap/{itemId}" },
  { operationId: "ProjectsRoadmapController_getRoadmapSignals", method: "GET", path: "/build/roadmap/{itemId}/signals", response: "projectsRoadmapGetRoadmapSignalsResponseSchema" },
  { operationId: "ScopeDirectoryController_resolve", method: "POST", path: "/build/scope-directory/resolve", response: "scopeDirectoryResolveResponseSchema", body: "scopeDirectoryResolveBodySchema" },
  { operationId: "ScopeDirectoryController_search", method: "GET", path: "/build/scope-directory/search", response: "scopeDirectorySearchResponseSchema" },
  { operationId: "ProjectsTicketsController_searchTickets", method: "GET", path: "/build/search/tickets", response: "projectsTicketsSearchTicketsResponseSchema" },
  { operationId: "TeamsController_listTeams", method: "GET", path: "/build/teams", response: "teamsListTeamsResponseSchema" },
  { operationId: "TeamsController_createTeam", method: "POST", path: "/build/teams", response: "teamsCreateTeamResponseSchema", body: "teamsCreateTeamBodySchema" },
  { operationId: "TeamsController_getTeam", method: "GET", path: "/build/teams/{teamId}", response: "teamsGetTeamResponseSchema" },
  { operationId: "TeamsController_updateTeam", method: "PATCH", path: "/build/teams/{teamId}", response: "teamsUpdateTeamResponseSchema", body: "teamsUpdateTeamBodySchema" },
  { operationId: "TeamsController_deleteTeam", method: "DELETE", path: "/build/teams/{teamId}" },
  { operationId: "TeamsController_listTeamMembers", method: "GET", path: "/build/teams/{teamId}/members", response: "teamsListTeamMembersResponseSchema" },
  { operationId: "TeamsController_addMember", method: "POST", path: "/build/teams/{teamId}/members", response: "teamsAddMemberResponseSchema", body: "teamsAddMemberBodySchema" },
  { operationId: "TeamsController_removeMember", method: "DELETE", path: "/build/teams/{teamId}/members/{memberId}" },
  { operationId: "TeamsController_updateMemberRole", method: "PATCH", path: "/build/teams/{teamId}/members/{memberUserId}", response: "teamsUpdateMemberRoleResponseSchema", body: "teamsUpdateMemberRoleBodySchema" },
  { operationId: "TeamsController_listTeamProjects", method: "GET", path: "/build/teams/{teamId}/projects", response: "teamsListTeamProjectsResponseSchema" },
  { operationId: "TeamsController_addProject", method: "POST", path: "/build/teams/{teamId}/projects", response: "teamsAddProjectResponseSchema", body: "teamsAddProjectBodySchema" },
  { operationId: "TeamsController_removeProject", method: "DELETE", path: "/build/teams/{teamId}/projects/{projectId}" },
  { operationId: "ProjectsTemplatesController_listTemplates", method: "GET", path: "/build/templates", response: "projectsTemplatesListTemplatesResponseSchema" },
  { operationId: "ProjectsTemplatesController_createTemplate", method: "POST", path: "/build/templates", response: "projectsTemplatesCreateTemplateResponseSchema", body: "projectsTemplatesCreateTemplateBodySchema" },
  { operationId: "ProjectsTemplatesController_deleteTemplate", method: "DELETE", path: "/build/templates/{templateId}" },
  { operationId: "ProjectsTemplatesController_applyTemplate", method: "POST", path: "/build/templates/{templateId}/apply", response: "projectsTemplatesApplyTemplateResponseSchema", body: "projectsTemplatesApplyTemplateBodySchema" },
  { operationId: "WorkspaceViewsController_listWorkspaceViews", method: "GET", path: "/build/views", response: "workspaceViewsListWorkspaceViewsResponseSchema" },
  { operationId: "WorkspaceViewsController_createWorkspaceView", method: "POST", path: "/build/views", response: "workspaceViewsCreateWorkspaceViewResponseSchema", body: "workspaceViewsCreateWorkspaceViewBodySchema" },
  { operationId: "WorkspaceViewsController_updateWorkspaceView", method: "PATCH", path: "/build/views/{viewId}", response: "workspaceViewsUpdateWorkspaceViewResponseSchema", body: "workspaceViewsUpdateWorkspaceViewBodySchema" },
  { operationId: "WorkspaceViewsController_deleteWorkspaceView", method: "DELETE", path: "/build/views/{viewId}" },
  { operationId: "ProjectsByIdController_getProject", method: "GET", path: "/build/{projectId}", response: "projectsByIdGetProjectResponseSchema" },
  { operationId: "ProjectsByIdController_updateProject", method: "PATCH", path: "/build/{projectId}", response: "projectsByIdUpdateProjectResponseSchema", body: "projectsByIdUpdateProjectBodySchema" },
  { operationId: "ProjectsByIdController_deleteProject", method: "DELETE", path: "/build/{projectId}" },
  { operationId: "ProjectsActivityFeedController_getProjectActivity", method: "GET", path: "/build/{projectId}/activity", response: "projectsActivityFeedGetProjectActivityResponseSchema" },
  { operationId: "ProjectsReportsController_getAnalytics", method: "GET", path: "/build/{projectId}/analytics", response: "projectsReportsGetAnalyticsResponseSchema" },
  { operationId: "ProjectsReportsController_getTimeBudget", method: "GET", path: "/build/{projectId}/analytics/time-budget", response: "projectsReportsGetTimeBudgetResponseSchema" },
  { operationId: "BuildApprovalsController_listApprovals", method: "GET", path: "/build/{projectId}/approvals", response: "buildApprovalsListApprovalsResponseSchema" },
  { operationId: "BuildApprovalsController_createApproval", method: "POST", path: "/build/{projectId}/approvals", response: "buildApprovalsCreateApprovalResponseSchema", body: "buildApprovalsCreateApprovalBodySchema" },
  { operationId: "BuildApprovalsController_getApproval", method: "GET", path: "/build/{projectId}/approvals/{approvalId}", response: "buildApprovalsGetApprovalResponseSchema" },
  { operationId: "BuildApprovalsController_updateApproval", method: "PATCH", path: "/build/{projectId}/approvals/{approvalId}", response: "buildApprovalsUpdateApprovalResponseSchema", body: "buildApprovalsUpdateApprovalBodySchema" },
  { operationId: "BuildApprovalsController_softDeleteApproval", method: "DELETE", path: "/build/{projectId}/approvals/{approvalId}", body: "buildApprovalsSoftDeleteApprovalBodySchema" },
  { operationId: "BuildApprovalsController_decideApproval", method: "PATCH", path: "/build/{projectId}/approvals/{approvalId}/decide", response: "buildApprovalsDecideApprovalResponseSchema", body: "buildApprovalsDecideApprovalBodySchema" },
  { operationId: "ProjectsAutomationsController_list", method: "GET", path: "/build/{projectId}/automations", response: "projectsAutomationsListResponseSchema" },
  { operationId: "ProjectsAutomationsController_create", method: "POST", path: "/build/{projectId}/automations", response: "projectsAutomationsCreateResponseSchema", body: "projectsAutomationsCreateBodySchema" },
  { operationId: "ProjectsAutomationsController_dryRun", method: "POST", path: "/build/{projectId}/automations/dry-run", response: "projectsAutomationsDryRunResponseSchema", body: "projectsAutomationsDryRunBodySchema" },
  { operationId: "ProjectsAutomationsController_listRuns", method: "GET", path: "/build/{projectId}/automations/runs", response: "projectsAutomationsListRunsResponseSchema" },
  { operationId: "ProjectsAutomationsController_replayRun", method: "POST", path: "/build/{projectId}/automations/runs/{runId}/replay", response: "projectsAutomationsReplayRunResponseSchema" },
  { operationId: "ProjectsAutomationsController_update", method: "PATCH", path: "/build/{projectId}/automations/{automationId}", response: "projectsAutomationsUpdateResponseSchema", body: "projectsAutomationsUpdateBodySchema" },
  { operationId: "ProjectsAutomationsController_delete", method: "DELETE", path: "/build/{projectId}/automations/{automationId}" },
  { operationId: "ProjectsAutomationsController_getAiPolicy", method: "GET", path: "/build/{projectId}/automations/{automationId}/ai-policy", response: "projectsAutomationsGetAiPolicyResponseSchema" },
  { operationId: "ProjectsAutomationsController_putAiPolicy", method: "PUT", path: "/build/{projectId}/automations/{automationId}/ai-policy", response: "projectsAutomationsPutAiPolicyResponseSchema", body: "projectsAutomationsPutAiPolicyBodySchema" },
  { operationId: "ProjectsAutomationsController_getHumanConfirmation", method: "GET", path: "/build/{projectId}/automations/{automationId}/human-confirmation", response: "projectsAutomationsGetHumanConfirmationResponseSchema" },
  { operationId: "ProjectsAutomationsController_putHumanConfirmation", method: "PUT", path: "/build/{projectId}/automations/{automationId}/human-confirmation", response: "projectsAutomationsPutHumanConfirmationResponseSchema", body: "projectsAutomationsPutHumanConfirmationBodySchema" },
  { operationId: "ProjectsAutomationsController_getTokenQuota", method: "GET", path: "/build/{projectId}/automations/{automationId}/token-quota", response: "projectsAutomationsGetTokenQuotaResponseSchema" },
  { operationId: "ProjectsAutomationsController_getToolPermissions", method: "GET", path: "/build/{projectId}/automations/{automationId}/tool-permissions", response: "projectsAutomationsGetToolPermissionsResponseSchema" },
  { operationId: "ProjectsAutomationsController_putToolPermissions", method: "PUT", path: "/build/{projectId}/automations/{automationId}/tool-permissions", response: "projectsAutomationsPutToolPermissionsResponseSchema", body: "projectsAutomationsPutToolPermissionsBodySchema" },
  { operationId: "ProjectsBudgetController_getBudget", method: "GET", path: "/build/{projectId}/budget", response: "projectsBudgetGetBudgetResponseSchema" },
  { operationId: "ProjectsBudgetController_updateBudget", method: "PATCH", path: "/build/{projectId}/budget", response: "projectsBudgetUpdateBudgetResponseSchema", body: "projectsBudgetUpdateBudgetBodySchema" },
  { operationId: "BugsController_listBugs", method: "GET", path: "/build/{projectId}/bugs", response: "bugsListBugsResponseSchema" },
  { operationId: "BugsController_getBug", method: "GET", path: "/build/{projectId}/bugs/{bugId}", response: "bugsGetBugResponseSchema" },
  { operationId: "ChangeRequestsController_listChangeRequests", method: "GET", path: "/build/{projectId}/change-requests", response: "changeRequestsListChangeRequestsResponseSchema" },
  { operationId: "ChangeRequestsController_createChangeRequest", method: "POST", path: "/build/{projectId}/change-requests", response: "changeRequestsCreateChangeRequestResponseSchema", body: "changeRequestsCreateChangeRequestBodySchema" },
  { operationId: "ChangeRequestsController_updateChangeRequest", method: "PATCH", path: "/build/{projectId}/change-requests/{changeRequestId}", response: "changeRequestsUpdateChangeRequestResponseSchema", body: "changeRequestsUpdateChangeRequestBodySchema" },
  { operationId: "ChangeRequestsController_deleteChangeRequest", method: "DELETE", path: "/build/{projectId}/change-requests/{changeRequestId}" },
  { operationId: "ChangeRequestAffectedItemsController_listAffectedTickets", method: "GET", path: "/build/{projectId}/change-requests/{changeRequestId}/affected-tickets", response: "changeRequestAffectedItemsListAffectedTicketsResponseSchema" },
  { operationId: "ChangeRequestAffectedItemsController_linkTicket", method: "POST", path: "/build/{projectId}/change-requests/{changeRequestId}/affected-tickets", response: "changeRequestAffectedItemsLinkTicketResponseSchema", body: "changeRequestAffectedItemsLinkTicketBodySchema" },
  { operationId: "ChangeRequestAffectedItemsController_unlinkTicket", method: "DELETE", path: "/build/{projectId}/change-requests/{changeRequestId}/affected-tickets/{affectedItemId}" },
  { operationId: "ClientPortalManagementController_getPreview", method: "GET", path: "/build/{projectId}/client-portal/preview", response: "clientPortalManagementGetPreviewResponseSchema" },
  { operationId: "ClientPortalManagementController_publishPortal", method: "POST", path: "/build/{projectId}/client-portal/publish", response: "clientPortalManagementPublishPortalResponseSchema" },
  { operationId: "ClientPortalManagementController_getSettings", method: "GET", path: "/build/{projectId}/client-portal/settings", response: "clientPortalManagementGetSettingsResponseSchema" },
  { operationId: "ClientPortalManagementController_unpublishPortal", method: "POST", path: "/build/{projectId}/client-portal/unpublish", response: "clientPortalManagementUnpublishPortalResponseSchema" },
  { operationId: "ClientVisibilityController_getVisibilitySummary", method: "GET", path: "/build/{projectId}/client-visibility", response: "clientVisibilityGetVisibilitySummaryResponseSchema" },
  { operationId: "ClientVisibilityController_toggleMilestoneVisibility", method: "PATCH", path: "/build/{projectId}/client-visibility/milestones/{milestoneId}", response: "clientVisibilityToggleMilestoneVisibilityResponseSchema", body: "clientVisibilityToggleMilestoneVisibilityBodySchema" },
  { operationId: "ClientVisibilityController_toggleTicketVisibility", method: "PATCH", path: "/build/{projectId}/client-visibility/tickets/{ticketId}", response: "clientVisibilityToggleTicketVisibilityResponseSchema", body: "clientVisibilityToggleTicketVisibilityBodySchema" },
  { operationId: "ProjectsCustomFieldsController_listFields", method: "GET", path: "/build/{projectId}/custom-fields", response: "projectsCustomFieldsListFieldsResponseSchema" },
  { operationId: "ProjectsCustomFieldsController_createField", method: "POST", path: "/build/{projectId}/custom-fields", response: "projectsCustomFieldsCreateFieldResponseSchema", body: "projectsCustomFieldsCreateFieldBodySchema" },
  { operationId: "ProjectsCustomFieldsController_updateField", method: "PATCH", path: "/build/{projectId}/custom-fields/{fieldId}", response: "projectsCustomFieldsUpdateFieldResponseSchema", body: "projectsCustomFieldsUpdateFieldBodySchema" },
  { operationId: "ProjectsCustomFieldsController_deleteField", method: "DELETE", path: "/build/{projectId}/custom-fields/{fieldId}" },
  { operationId: "ProjectResourcesController_listCustomStates", method: "GET", path: "/build/{projectId}/custom-states", response: "projectResourcesListCustomStatesResponseSchema" },
  { operationId: "ProjectResourcesController_createCustomState", method: "POST", path: "/build/{projectId}/custom-states", response: "projectResourcesCreateCustomStateResponseSchema", body: "projectResourcesCreateCustomStateBodySchema" },
  { operationId: "ProjectResourcesController_bulkReorderCustomStates", method: "PUT", path: "/build/{projectId}/custom-states", response: "projectResourcesBulkReorderCustomStatesResponseSchema", body: "projectResourcesBulkReorderCustomStatesBodySchema" },
  { operationId: "ProjectResourcesController_updateCustomState", method: "PATCH", path: "/build/{projectId}/custom-states/{stateId}", response: "projectResourcesUpdateCustomStateResponseSchema", body: "projectResourcesUpdateCustomStateBodySchema" },
  { operationId: "ProjectResourcesController_deleteCustomState", method: "DELETE", path: "/build/{projectId}/custom-states/{stateId}" },
  { operationId: "CyclesController_listCycles", method: "GET", path: "/build/{projectId}/cycles", response: "cyclesListCyclesResponseSchema" },
  { operationId: "CyclesController_createCycle", method: "POST", path: "/build/{projectId}/cycles", response: "cyclesCreateCycleResponseSchema", body: "cyclesCreateCycleBodySchema" },
  { operationId: "CyclesController_updateCycle", method: "PATCH", path: "/build/{projectId}/cycles/{cycleId}", response: "cyclesUpdateCycleResponseSchema", body: "cyclesUpdateCycleBodySchema" },
  { operationId: "CyclesController_deleteCycle", method: "DELETE", path: "/build/{projectId}/cycles/{cycleId}" },
  { operationId: "DecisionsController_listDecisions", method: "GET", path: "/build/{projectId}/decisions", response: "decisionsListDecisionsResponseSchema" },
  { operationId: "DecisionsController_createDecision", method: "POST", path: "/build/{projectId}/decisions", response: "decisionsCreateDecisionResponseSchema", body: "decisionsCreateDecisionBodySchema" },
  { operationId: "DecisionsController_updateDecision", method: "PATCH", path: "/build/{projectId}/decisions/{decisionId}", response: "decisionsUpdateDecisionResponseSchema", body: "decisionsUpdateDecisionBodySchema" },
  { operationId: "DecisionsController_softDeleteDecision", method: "DELETE", path: "/build/{projectId}/decisions/{decisionId}" },
  { operationId: "EpicsController_listEpics", method: "GET", path: "/build/{projectId}/epics", response: "epicsListEpicsResponseSchema" },
  { operationId: "FilesController_listFiles", method: "GET", path: "/build/{projectId}/files", response: "filesListFilesResponseSchema" },
  { operationId: "FilesController_uploadFile", method: "POST", path: "/build/{projectId}/files", response: "filesUploadFileResponseSchema", body: "filesUploadFileBodySchema" },
  { operationId: "FilesController_softDeleteFile", method: "DELETE", path: "/build/{projectId}/files/{fileId}" },
  { operationId: "FilesController_getSignedUrl", method: "GET", path: "/build/{projectId}/files/{fileId}/url", response: "filesGetSignedUrlResponseSchema" },
  { operationId: "FormsController_listForms", method: "GET", path: "/build/{projectId}/forms", response: "formsListFormsResponseSchema" },
  { operationId: "FormsController_createForm", method: "POST", path: "/build/{projectId}/forms", response: "formsCreateFormResponseSchema", body: "formsCreateFormBodySchema" },
  { operationId: "FormsController_getForm", method: "GET", path: "/build/{projectId}/forms/{formId}", response: "formsGetFormResponseSchema" },
  { operationId: "FormsController_updateForm", method: "PATCH", path: "/build/{projectId}/forms/{formId}", response: "formsUpdateFormResponseSchema", body: "formsUpdateFormBodySchema" },
  { operationId: "FormsController_deleteForm", method: "DELETE", path: "/build/{projectId}/forms/{formId}" },
  { operationId: "SubmissionsController_listSubmissions", method: "GET", path: "/build/{projectId}/forms/{formId}/submissions", response: "submissionsListSubmissionsResponseSchema" },
  { operationId: "SubmissionsController_createSubmission", method: "POST", path: "/build/{projectId}/forms/{formId}/submissions", response: "submissionsCreateSubmissionResponseSchema", body: "submissionsCreateSubmissionBodySchema" },
  { operationId: "SubmissionsController_updateSubmission", method: "PATCH", path: "/build/{projectId}/forms/{formId}/submissions/{submissionId}", response: "submissionsUpdateSubmissionResponseSchema", body: "submissionsUpdateSubmissionBodySchema" },
  { operationId: "TicketImportExportController_commitImport", method: "POST", path: "/build/{projectId}/import-export/tickets", response: "ticketImportExportCommitImportResponseSchema", body: "ticketImportExportCommitImportBodySchema" },
  { operationId: "TicketImportExportController_exportTickets", method: "GET", path: "/build/{projectId}/import-export/tickets/export", response: "ticketImportExportExportTicketsResponseSchema" },
  { operationId: "TicketImportExportController_previewExport", method: "GET", path: "/build/{projectId}/import-export/tickets/export/preview", response: "ticketImportExportPreviewExportResponseSchema" },
  { operationId: "TicketImportExportController_previewImport", method: "POST", path: "/build/{projectId}/import-export/tickets/preview", response: "ticketImportExportPreviewImportResponseSchema", body: "ticketImportExportPreviewImportBodySchema" },
  { operationId: "IncidentsController_listIncidents", method: "GET", path: "/build/{projectId}/incidents", response: "incidentsListIncidentsResponseSchema" },
  { operationId: "IncidentsController_createIncident", method: "POST", path: "/build/{projectId}/incidents", response: "incidentsCreateIncidentResponseSchema", body: "incidentsCreateIncidentBodySchema" },
  { operationId: "IncidentsController_getIncident", method: "GET", path: "/build/{projectId}/incidents/{incidentId}", response: "incidentsGetIncidentResponseSchema" },
  { operationId: "IncidentsController_updateIncident", method: "PATCH", path: "/build/{projectId}/incidents/{incidentId}", response: "incidentsUpdateIncidentResponseSchema", body: "incidentsUpdateIncidentBodySchema" },
  { operationId: "IncidentsController_deleteIncident", method: "DELETE", path: "/build/{projectId}/incidents/{incidentId}" },
  { operationId: "IncidentsController_addDecision", method: "POST", path: "/build/{projectId}/incidents/{incidentId}/decisions", response: "incidentsAddDecisionResponseSchema", body: "incidentsAddDecisionBodySchema" },
  { operationId: "IncidentsController_addFollowUpAction", method: "POST", path: "/build/{projectId}/incidents/{incidentId}/follow-ups", response: "incidentsAddFollowUpActionResponseSchema", body: "incidentsAddFollowUpActionBodySchema" },
  { operationId: "IncidentsController_updateFollowUpAction", method: "PATCH", path: "/build/{projectId}/incidents/{incidentId}/follow-ups/{followUpActionId}", response: "incidentsUpdateFollowUpActionResponseSchema", body: "incidentsUpdateFollowUpActionBodySchema" },
  { operationId: "IncidentsController_addUpdate", method: "POST", path: "/build/{projectId}/incidents/{incidentId}/updates", response: "incidentsAddUpdateResponseSchema", body: "incidentsAddUpdateBodySchema" },
  { operationId: "IntakeController_listIntake", method: "GET", path: "/build/{projectId}/intake", response: "intakeListIntakeResponseSchema" },
  { operationId: "IntakeController_createIntake", method: "POST", path: "/build/{projectId}/intake", response: "intakeCreateIntakeResponseSchema", body: "intakeCreateIntakeBodySchema" },
  { operationId: "IntakeController_updateIntake", method: "PATCH", path: "/build/{projectId}/intake/{requestId}", response: "intakeUpdateIntakeResponseSchema", body: "intakeUpdateIntakeBodySchema" },
  { operationId: "ProjectsController_getInvoiceLineDetail", method: "GET", path: "/build/{projectId}/invoice-line-detail", response: "projectsGetInvoiceLineDetailResponseSchema" },
  { operationId: "ProjectResourcesController_listProjectLabels", method: "GET", path: "/build/{projectId}/labels", response: "projectResourcesListProjectLabelsResponseSchema" },
  { operationId: "MeetingsController_listMeetings", method: "GET", path: "/build/{projectId}/meetings", response: "meetingsListMeetingsResponseSchema" },
  { operationId: "MeetingsController_createMeeting", method: "POST", path: "/build/{projectId}/meetings", response: "meetingsCreateMeetingResponseSchema", body: "meetingsCreateMeetingBodySchema" },
  { operationId: "MeetingsController_getMeeting", method: "GET", path: "/build/{projectId}/meetings/{meetingId}", response: "meetingsGetMeetingResponseSchema" },
  { operationId: "MeetingsController_updateMeeting", method: "PATCH", path: "/build/{projectId}/meetings/{meetingId}", response: "meetingsUpdateMeetingResponseSchema", body: "meetingsUpdateMeetingBodySchema" },
  { operationId: "MeetingsController_deleteMeeting", method: "DELETE", path: "/build/{projectId}/meetings/{meetingId}" },
  { operationId: "ActionItemsController_createItem", method: "POST", path: "/build/{projectId}/meetings/{meetingId}/action-items", response: "actionItemsCreateItemResponseSchema", body: "actionItemsCreateItemBodySchema" },
  { operationId: "ActionItemsController_updateItem", method: "PATCH", path: "/build/{projectId}/meetings/{meetingId}/action-items/{itemId}", response: "actionItemsUpdateItemResponseSchema", body: "actionItemsUpdateItemBodySchema" },
  { operationId: "ActionItemsController_deleteItem", method: "DELETE", path: "/build/{projectId}/meetings/{meetingId}/action-items/{itemId}" },
  { operationId: "ActionItemsController_convertToTask", method: "POST", path: "/build/{projectId}/meetings/{meetingId}/action-items/{itemId}/convert-to-task", response: "actionItemsConvertToTaskResponseSchema" },
  { operationId: "MeetingsController_addAttendee", method: "POST", path: "/build/{projectId}/meetings/{meetingId}/attendees", response: "meetingsAddAttendeeResponseSchema", body: "meetingsAddAttendeeBodySchema" },
  { operationId: "MeetingsController_removeAttendee", method: "DELETE", path: "/build/{projectId}/meetings/{meetingId}/attendees/{attendeeUserId}" },
  { operationId: "MeetingsController_upsertStandup", method: "PUT", path: "/build/{projectId}/meetings/{meetingId}/standup", response: "meetingsUpsertStandupResponseSchema", body: "meetingsUpsertStandupBodySchema" },
  { operationId: "ProjectResourcesController_listMembers", method: "GET", path: "/build/{projectId}/members", response: "projectResourcesListMembersResponseSchema" },
  { operationId: "ProjectResourcesController_addMember", method: "POST", path: "/build/{projectId}/members", response: "projectResourcesAddMemberResponseSchema", body: "projectResourcesAddMemberBodySchema" },
  { operationId: "ProjectResourcesController_updateMemberRole", method: "PATCH", path: "/build/{projectId}/members/{memberUserId}", response: "projectResourcesUpdateMemberRoleResponseSchema", body: "projectResourcesUpdateMemberRoleBodySchema" },
  { operationId: "MilestonesController_listMilestones", method: "GET", path: "/build/{projectId}/milestones", response: "milestonesListMilestonesResponseSchema" },
  { operationId: "MilestonesController_createMilestone", method: "POST", path: "/build/{projectId}/milestones", response: "milestonesCreateMilestoneResponseSchema", body: "milestonesCreateMilestoneBodySchema" },
  { operationId: "MilestonesController_updateMilestone", method: "PATCH", path: "/build/{projectId}/milestones/{milestoneId}", response: "milestonesUpdateMilestoneResponseSchema", body: "milestonesUpdateMilestoneBodySchema" },
  { operationId: "MilestonesController_deleteMilestone", method: "DELETE", path: "/build/{projectId}/milestones/{milestoneId}" },
  { operationId: "ModulesController_listModules", method: "GET", path: "/build/{projectId}/modules", response: "modulesListModulesResponseSchema" },
  { operationId: "ModulesController_createModule", method: "POST", path: "/build/{projectId}/modules", response: "modulesCreateModuleResponseSchema", body: "modulesCreateModuleBodySchema" },
  { operationId: "ModulesController_updateModule", method: "PATCH", path: "/build/{projectId}/modules/{moduleId}", response: "modulesUpdateModuleResponseSchema", body: "modulesUpdateModuleBodySchema" },
  { operationId: "ModulesController_deleteModule", method: "DELETE", path: "/build/{projectId}/modules/{moduleId}" },
  { operationId: "ProjectsReleasesController_listReleases", method: "GET", path: "/build/{projectId}/releases", response: "projectsReleasesListReleasesResponseSchema" },
  { operationId: "ProjectsReleasesController_createRelease", method: "POST", path: "/build/{projectId}/releases", response: "projectsReleasesCreateReleaseResponseSchema", body: "projectsReleasesCreateReleaseBodySchema" },
  { operationId: "ProjectsReleasesController_updateRelease", method: "PATCH", path: "/build/{projectId}/releases/{releaseId}", response: "projectsReleasesUpdateReleaseResponseSchema", body: "projectsReleasesUpdateReleaseBodySchema" },
  { operationId: "ProjectsReleasesController_deleteRelease", method: "DELETE", path: "/build/{projectId}/releases/{releaseId}" },
  { operationId: "ProjectsReportsController_burnup", method: "GET", path: "/build/{projectId}/reports/burnup", response: "projectsReportsBurnupResponseSchema" },
  { operationId: "ProjectsReportsController_cfd", method: "GET", path: "/build/{projectId}/reports/cfd", response: "projectsReportsCfdResponseSchema" },
  { operationId: "ProjectsReportsController_criticalPath", method: "GET", path: "/build/{projectId}/reports/critical-path", response: "projectsReportsCriticalPathResponseSchema" },
  { operationId: "ProjectsReportsController_getCycleTime", method: "GET", path: "/build/{projectId}/reports/cycle-time", response: "projectsReportsGetCycleTimeResponseSchema" },
  { operationId: "ProjectsReportsController_getLeadTime", method: "GET", path: "/build/{projectId}/reports/lead-time", response: "projectsReportsGetLeadTimeResponseSchema" },
  { operationId: "ProjectsReportsController_snapshot", method: "POST", path: "/build/{projectId}/reports/snapshot", response: "projectsReportsSnapshotResponseSchema" },
  { operationId: "ProjectsReportsController_velocity", method: "GET", path: "/build/{projectId}/reports/velocity", response: "projectsReportsVelocityResponseSchema" },
  { operationId: "RisksController_listRisks", method: "GET", path: "/build/{projectId}/risks", response: "risksListRisksResponseSchema" },
  { operationId: "RisksController_createRisk", method: "POST", path: "/build/{projectId}/risks", response: "risksCreateRiskResponseSchema", body: "risksCreateRiskBodySchema" },
  { operationId: "RisksController_getRiskStats", method: "GET", path: "/build/{projectId}/risks/stats", response: "risksGetRiskStatsResponseSchema" },
  { operationId: "RisksController_updateRisk", method: "PATCH", path: "/build/{projectId}/risks/{riskId}", response: "risksUpdateRiskResponseSchema", body: "risksUpdateRiskBodySchema" },
  { operationId: "RisksController_softDeleteRisk", method: "DELETE", path: "/build/{projectId}/risks/{riskId}" },
  { operationId: "ProjectResourcesController_getRoster", method: "GET", path: "/build/{projectId}/roster", response: "projectResourcesGetRosterResponseSchema" },
  { operationId: "ProjectsSettingsIterationsController_getSettings", method: "GET", path: "/build/{projectId}/settings/iterations", response: "projectsSettingsIterationsGetSettingsResponseSchema" },
  { operationId: "ProjectsSettingsIterationsController_updateSettings", method: "PATCH", path: "/build/{projectId}/settings/iterations", response: "projectsSettingsIterationsUpdateSettingsResponseSchema", body: "projectsSettingsIterationsUpdateSettingsBodySchema" },
  { operationId: "ProjectsRetentionSettingsController_getSettings", method: "GET", path: "/build/{projectId}/settings/retention", response: "projectsRetentionSettingsGetSettingsResponseSchema" },
  { operationId: "ProjectsRetentionSettingsController_updatePolicy", method: "PATCH", path: "/build/{projectId}/settings/retention", response: "projectsRetentionSettingsUpdatePolicyResponseSchema", body: "projectsRetentionSettingsUpdatePolicyBodySchema" },
  { operationId: "ProjectsRetentionSettingsController_setLegalHold", method: "PATCH", path: "/build/{projectId}/settings/retention/legal-hold", body: "projectsRetentionSettingsSetLegalHoldBodySchema" },
  { operationId: "TestCasesController_listCases", method: "GET", path: "/build/{projectId}/test-cases", response: "testCasesListCasesResponseSchema" },
  { operationId: "TestCasesController_createCase", method: "POST", path: "/build/{projectId}/test-cases", response: "testCasesCreateCaseResponseSchema", body: "testCasesCreateCaseBodySchema" },
  { operationId: "TestCasesController_updateCase", method: "PATCH", path: "/build/{projectId}/test-cases/{caseId}", response: "testCasesUpdateCaseResponseSchema", body: "testCasesUpdateCaseBodySchema" },
  { operationId: "TestCasesController_deleteCase", method: "DELETE", path: "/build/{projectId}/test-cases/{caseId}" },
  { operationId: "TestRunsController_listRuns", method: "GET", path: "/build/{projectId}/test-runs", response: "testRunsListRunsResponseSchema" },
  { operationId: "TestRunsController_createRun", method: "POST", path: "/build/{projectId}/test-runs", response: "testRunsCreateRunResponseSchema", body: "testRunsCreateRunBodySchema" },
  { operationId: "TestRunsController_getRun", method: "GET", path: "/build/{projectId}/test-runs/{runId}", response: "testRunsGetRunResponseSchema" },
  { operationId: "TestRunsController_updateRun", method: "PATCH", path: "/build/{projectId}/test-runs/{runId}", response: "testRunsUpdateRunResponseSchema", body: "testRunsUpdateRunBodySchema" },
  { operationId: "TestRunsController_deleteRun", method: "DELETE", path: "/build/{projectId}/test-runs/{runId}" },
  { operationId: "TestRunsController_updateResult", method: "PATCH", path: "/build/{projectId}/test-runs/{runId}/results/{resultId}", response: "testRunsUpdateResultResponseSchema", body: "testRunsUpdateResultBodySchema" },
  { operationId: "TestRunsController_createBugFromResult", method: "POST", path: "/build/{projectId}/test-runs/{runId}/results/{resultId}/bug", response: "testRunsCreateBugFromResultResponseSchema", body: "testRunsCreateBugFromResultBodySchema" },
  { operationId: "TestSuitesController_listSuites", method: "GET", path: "/build/{projectId}/test-suites", response: "testSuitesListSuitesResponseSchema" },
  { operationId: "ProjectsTicketsController_listTickets", method: "GET", path: "/build/{projectId}/tickets", response: "projectsTicketsListTicketsResponseSchema" },
  { operationId: "ProjectsTicketsController_createTicket", method: "POST", path: "/build/{projectId}/tickets", response: "projectsTicketsCreateTicketResponseSchema", body: "projectsTicketsCreateTicketBodySchema" },
  { operationId: "ProjectsTicketsController_bulkUpdate", method: "POST", path: "/build/{projectId}/tickets/bulk", response: "projectsTicketsBulkUpdateResponseSchema", body: "projectsTicketsBulkUpdateBodySchema" },
  { operationId: "ProjectsTicketsController_getColumnCounts", method: "GET", path: "/build/{projectId}/tickets/column-counts", response: "projectsTicketsGetColumnCountsResponseSchema" },
  { operationId: "ProjectsTicketsController_getTicketByKey", method: "GET", path: "/build/{projectId}/tickets/key/{ticketNumber}", response: "projectsTicketsGetTicketByKeyResponseSchema" },
  { operationId: "ProjectsTicketsController_getTicket", method: "GET", path: "/build/{projectId}/tickets/{ticketId}", response: "projectsTicketsGetTicketResponseSchema" },
  { operationId: "ProjectsTicketsController_updateTicket", method: "PATCH", path: "/build/{projectId}/tickets/{ticketId}", response: "projectsTicketsUpdateTicketResponseSchema", body: "projectsTicketsUpdateTicketBodySchema" },
  { operationId: "ProjectsTicketsController_deleteTicket", method: "DELETE", path: "/build/{projectId}/tickets/{ticketId}" },
  { operationId: "ProjectsTicketsController_getActivity", method: "GET", path: "/build/{projectId}/tickets/{ticketId}/activity", response: "projectsTicketsGetActivityResponseSchema" },
  { operationId: "ProjectsTicketAssociationsController_addAttachment", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/attachments", response: "projectsTicketAssociationsAddAttachmentResponseSchema", body: "projectsTicketAssociationsAddAttachmentBodySchema" },
  { operationId: "ProjectsTicketChecklistsController_getChecklists", method: "GET", path: "/build/{projectId}/tickets/{ticketId}/checklists", response: "projectsTicketChecklistsGetChecklistsResponseSchema" },
  { operationId: "ProjectsTicketChecklistsController_createChecklist", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/checklists", response: "projectsTicketChecklistsCreateChecklistResponseSchema", body: "projectsTicketChecklistsCreateChecklistBodySchema" },
  { operationId: "ProjectsTicketChecklistsController_updateChecklist", method: "PATCH", path: "/build/{projectId}/tickets/{ticketId}/checklists/{checklistId}", response: "projectsTicketChecklistsUpdateChecklistResponseSchema", body: "projectsTicketChecklistsUpdateChecklistBodySchema" },
  { operationId: "ProjectsTicketChecklistsController_deleteChecklist", method: "DELETE", path: "/build/{projectId}/tickets/{ticketId}/checklists/{checklistId}" },
  { operationId: "ProjectsTicketChecklistsController_createChecklistItem", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/checklists/{checklistId}/items", response: "projectsTicketChecklistsCreateChecklistItemResponseSchema", body: "projectsTicketChecklistsCreateChecklistItemBodySchema" },
  { operationId: "ProjectsTicketChecklistsController_updateChecklistItem", method: "PATCH", path: "/build/{projectId}/tickets/{ticketId}/checklists/{checklistId}/items/{itemId}", response: "projectsTicketChecklistsUpdateChecklistItemResponseSchema", body: "projectsTicketChecklistsUpdateChecklistItemBodySchema" },
  { operationId: "ProjectsTicketChecklistsController_deleteChecklistItem", method: "DELETE", path: "/build/{projectId}/tickets/{ticketId}/checklists/{checklistId}/items/{itemId}" },
  { operationId: "ProjectsTicketCommentsController_addComment", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/comments", response: "projectsTicketCommentsAddCommentResponseSchema", body: "projectsTicketCommentsAddCommentBodySchema" },
  { operationId: "ProjectsTicketCommentsController_getComment", method: "GET", path: "/build/{projectId}/tickets/{ticketId}/comments/{commentId}", response: "projectsTicketCommentsGetCommentResponseSchema" },
  { operationId: "ProjectsTicketCommentsController_editComment", method: "PATCH", path: "/build/{projectId}/tickets/{ticketId}/comments/{commentId}", response: "projectsTicketCommentsEditCommentResponseSchema", body: "projectsTicketCommentsEditCommentBodySchema" },
  { operationId: "ProjectsTicketCommentsController_deleteComment", method: "DELETE", path: "/build/{projectId}/tickets/{ticketId}/comments/{commentId}" },
  { operationId: "ProjectsTicketCommentsController_addReaction", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/comments/{commentId}/reactions", response: "projectsTicketCommentsAddReactionResponseSchema", body: "projectsTicketCommentsAddReactionBodySchema" },
  { operationId: "ProjectsTicketCommentsController_removeReaction", method: "DELETE", path: "/build/{projectId}/tickets/{ticketId}/comments/{commentId}/reactions/{emoji}" },
  { operationId: "ProjectsCustomFieldsController_getTicketValues", method: "GET", path: "/build/{projectId}/tickets/{ticketId}/custom-field-values", response: "projectsCustomFieldsGetTicketValuesResponseSchema" },
  { operationId: "ProjectsCustomFieldsController_upsertTicketValues", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/custom-field-values", response: "projectsCustomFieldsUpsertTicketValuesResponseSchema", body: "projectsCustomFieldsUpsertTicketValuesBodySchema" },
  { operationId: "ProjectsTicketAssociationsController_getGitLinks", method: "GET", path: "/build/{projectId}/tickets/{ticketId}/git-links", response: "projectsTicketAssociationsGetGitLinksResponseSchema" },
  { operationId: "ProjectsTicketAssociationsController_addLabel", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/labels", response: "projectsTicketAssociationsAddLabelResponseSchema", body: "projectsTicketAssociationsAddLabelBodySchema" },
  { operationId: "ProjectsTicketAssociationsController_removeLabel", method: "DELETE", path: "/build/{projectId}/tickets/{ticketId}/labels/{labelId}" },
  { operationId: "ProjectsTicketsController_rankTicket", method: "PATCH", path: "/build/{projectId}/tickets/{ticketId}/rank", response: "projectsTicketsRankTicketResponseSchema", body: "projectsTicketsRankTicketBodySchema" },
  { operationId: "ProjectsTicketAssociationsController_listRelatedLinks", method: "GET", path: "/build/{projectId}/tickets/{ticketId}/related-links", response: "projectsTicketAssociationsListRelatedLinksResponseSchema" },
  { operationId: "ProjectsTicketAssociationsController_addRelatedLink", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/related-links", response: "projectsTicketAssociationsAddRelatedLinkResponseSchema", body: "projectsTicketAssociationsAddRelatedLinkBodySchema" },
  { operationId: "ProjectsTicketAssociationsController_listRelations", method: "GET", path: "/build/{projectId}/tickets/{ticketId}/relations", response: "projectsTicketAssociationsListRelationsResponseSchema" },
  { operationId: "ProjectsTicketAssociationsController_addRelation", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/relations", response: "projectsTicketAssociationsAddRelationResponseSchema", body: "projectsTicketAssociationsAddRelationBodySchema" },
  { operationId: "ProjectsTicketAssociationsController_removeRelation", method: "DELETE", path: "/build/{projectId}/tickets/{ticketId}/relations" },
  { operationId: "ProjectsTicketAssociationsController_getSubtasks", method: "GET", path: "/build/{projectId}/tickets/{ticketId}/subtasks", response: "projectsTicketAssociationsGetSubtasksResponseSchema" },
  { operationId: "TicketTimeEntriesController_logTicketTime", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/time-entries", response: "ticketTimeEntriesLogTicketTimeResponseSchema", body: "ticketTimeEntriesLogTicketTimeBodySchema" },
  { operationId: "ProjectsTicketAssociationsController_getWatchers", method: "GET", path: "/build/{projectId}/tickets/{ticketId}/watchers", response: "projectsTicketAssociationsGetWatchersResponseSchema" },
  { operationId: "ProjectsTicketAssociationsController_addWatcher", method: "POST", path: "/build/{projectId}/tickets/{ticketId}/watchers", response: "projectsTicketAssociationsAddWatcherResponseSchema", body: "projectsTicketAssociationsAddWatcherBodySchema" },
  { operationId: "ProjectsTicketAssociationsController_removeWatcher", method: "DELETE", path: "/build/{projectId}/tickets/{ticketId}/watchers" },
  { operationId: "UpdatesController_listUpdates", method: "GET", path: "/build/{projectId}/updates", response: "updatesListUpdatesResponseSchema" },
  { operationId: "UpdatesController_createUpdate", method: "POST", path: "/build/{projectId}/updates", response: "updatesCreateUpdateResponseSchema", body: "updatesCreateUpdateBodySchema" },
  { operationId: "UpdatesController_softDeleteUpdate", method: "DELETE", path: "/build/{projectId}/updates/{updateId}" },
  { operationId: "ViewsController_listViews", method: "GET", path: "/build/{projectId}/views", response: "viewsListViewsResponseSchema" },
  { operationId: "ViewsController_createView", method: "POST", path: "/build/{projectId}/views", response: "viewsCreateViewResponseSchema", body: "viewsCreateViewBodySchema" },
  { operationId: "ViewsController_updateView", method: "PATCH", path: "/build/{projectId}/views/{viewId}", response: "viewsUpdateViewResponseSchema", body: "viewsUpdateViewBodySchema" },
  { operationId: "ViewsController_deleteView", method: "DELETE", path: "/build/{projectId}/views/{viewId}" },
  { operationId: "ProjectsWebhooksController_listWebhooks", method: "GET", path: "/build/{projectId}/webhooks", response: "projectsWebhooksListWebhooksResponseSchema" },
  { operationId: "ProjectsWebhooksController_createWebhook", method: "POST", path: "/build/{projectId}/webhooks", response: "projectsWebhooksCreateWebhookResponseSchema", body: "projectsWebhooksCreateWebhookBodySchema" },
  { operationId: "ProjectsWebhooksController_updateWebhook", method: "PATCH", path: "/build/{projectId}/webhooks/{webhookId}", response: "projectsWebhooksUpdateWebhookResponseSchema", body: "projectsWebhooksUpdateWebhookBodySchema" },
  { operationId: "ProjectsWebhooksController_deleteWebhook", method: "DELETE", path: "/build/{projectId}/webhooks/{webhookId}" },
  { operationId: "ProjectsWebhooksController_listDeliveries", method: "GET", path: "/build/{projectId}/webhooks/{webhookId}/deliveries", response: "projectsWebhooksListDeliveriesResponseSchema" },
  { operationId: "ProjectsWebhooksController_retryDelivery", method: "POST", path: "/build/{projectId}/webhooks/{webhookId}/deliveries/{deliveryId}/retry", response: "projectsWebhooksRetryDeliveryResponseSchema" },
  { operationId: "ProjectsWebhooksController_getImpact", method: "GET", path: "/build/{projectId}/webhooks/{webhookId}/impact", response: "projectsWebhooksGetImpactResponseSchema" },
  { operationId: "ProjectsWebhooksController_rotateSecret", method: "POST", path: "/build/{projectId}/webhooks/{webhookId}/rotate-secret", response: "projectsWebhooksRotateSecretResponseSchema" },
  { operationId: "ProjectsWebhooksController_sendTest", method: "POST", path: "/build/{projectId}/webhooks/{webhookId}/test", response: "projectsWebhooksSendTestResponseSchema" },
  { operationId: "WhiteboardsController_listWhiteboards", method: "GET", path: "/build/{projectId}/whiteboards", response: "whiteboardsListWhiteboardsResponseSchema" },
  { operationId: "WhiteboardsController_createWhiteboard", method: "POST", path: "/build/{projectId}/whiteboards", response: "whiteboardsCreateWhiteboardResponseSchema", body: "whiteboardsCreateWhiteboardBodySchema" },
  { operationId: "WhiteboardsController_getWhiteboard", method: "GET", path: "/build/{projectId}/whiteboards/{whiteboardId}", response: "whiteboardsGetWhiteboardResponseSchema" },
  { operationId: "WhiteboardsController_updateWhiteboard", method: "PATCH", path: "/build/{projectId}/whiteboards/{whiteboardId}", response: "whiteboardsUpdateWhiteboardResponseSchema", body: "whiteboardsUpdateWhiteboardBodySchema" },
  { operationId: "WhiteboardsController_deleteWhiteboard", method: "DELETE", path: "/build/{projectId}/whiteboards/{whiteboardId}" },
  { operationId: "WhiteboardSharingController_setShares", method: "PUT", path: "/build/{projectId}/whiteboards/{whiteboardId}/shares", response: "whiteboardSharingSetSharesResponseSchema", body: "whiteboardSharingSetSharesBodySchema" },
  { operationId: "WhiteboardSharingController_removeShare", method: "DELETE", path: "/build/{projectId}/whiteboards/{whiteboardId}/shares/{targetUserId}" },
  { operationId: "WhiteboardSharingController_updateSharing", method: "PATCH", path: "/build/{projectId}/whiteboards/{whiteboardId}/sharing", response: "whiteboardSharingUpdateSharingResponseSchema", body: "whiteboardSharingUpdateSharingBodySchema" },
  { operationId: "WhiteboardSharingController_rotateShareToken", method: "POST", path: "/build/{projectId}/whiteboards/{whiteboardId}/sharing/rotate-token", response: "whiteboardSharingRotateShareTokenResponseSchema" },
  { operationId: "WorkflowController_updateWipLimit", method: "PATCH", path: "/build/{projectId}/workflow/statuses/{statusId}/wip", response: "workflowUpdateWipLimitResponseSchema", body: "workflowUpdateWipLimitBodySchema" },
  { operationId: "WorkflowController_listTransitions", method: "GET", path: "/build/{projectId}/workflow/transitions", response: "workflowListTransitionsResponseSchema" },
  { operationId: "WorkflowController_createTransition", method: "POST", path: "/build/{projectId}/workflow/transitions", response: "workflowCreateTransitionResponseSchema", body: "workflowCreateTransitionBodySchema" },
  { operationId: "WorkflowController_updateTransition", method: "PATCH", path: "/build/{projectId}/workflow/transitions/{transitionId}", response: "workflowUpdateTransitionResponseSchema", body: "workflowUpdateTransitionBodySchema" },
  { operationId: "WorkflowController_deleteTransition", method: "DELETE", path: "/build/{projectId}/workflow/transitions/{transitionId}" },
  { operationId: "WorkloadCapacityController_capacity", method: "GET", path: "/build/{projectId}/workload/capacity", response: "workloadCapacityCapacityResponseSchema" },
  { operationId: "FeedbucketController_routeToIntake", method: "POST", path: "/feedbucket/submissions/{submissionId}/route-to-intake", response: "feedbucketRouteToIntakeResponseSchema" },
  { operationId: "NotificationsController_unreadCount", method: "GET", path: "/notifications/unread-count", response: "notificationsUnreadCountResponseSchema" },
  { operationId: "PublicController_getPublicForm", method: "GET", path: "/public/forms/{token}", response: "publicGetPublicFormResponseSchema" },
  { operationId: "PublicController_submitPublicForm", method: "POST", path: "/public/forms/{token}/submit", response: "publicSubmitPublicFormResponseSchema", body: "publicSubmitPublicFormBodySchema" },
  { operationId: "PublicController_getProjectIntakeForm", method: "GET", path: "/public/intake/{projectId}/form", response: "publicGetProjectIntakeFormResponseSchema" },
  { operationId: "PublicController_getRoadmap", method: "GET", path: "/public/roadmap", response: "publicGetRoadmapResponseSchema" },
  { operationId: "PublicController_submitRoadmapFeedback", method: "POST", path: "/public/roadmap/feedback", response: "publicSubmitRoadmapFeedbackResponseSchema", body: "publicSubmitRoadmapFeedbackBodySchema" },
  { operationId: "PublicController_voteRoadmap", method: "POST", path: "/public/roadmap/vote", response: "publicVoteRoadmapResponseSchema", body: "publicVoteRoadmapBodySchema" },
  { operationId: "PublicWhiteboardLinksController_getByToken", method: "GET", path: "/public/whiteboard-links/{token}", response: "publicWhiteboardLinksGetByTokenResponseSchema" },
  { operationId: "PublicWhiteboardLinksController_updateByToken", method: "PATCH", path: "/public/whiteboard-links/{token}", response: "publicWhiteboardLinksUpdateByTokenResponseSchema", body: "publicWhiteboardLinksUpdateByTokenBodySchema" },
  { operationId: "StorageController_download", method: "GET", path: "/storage/download", response: "storageDownloadResponseSchema" },
] as const;
