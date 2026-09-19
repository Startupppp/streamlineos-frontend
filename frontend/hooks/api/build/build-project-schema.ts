import { z } from 'zod';

const ticketLabelSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.string(),
});

const projectListItemMemberSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  image: z.string().nullable(),
});

const projectListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  key: z.string(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  managedProductId: z.number().nullable(),
  pmWorkspaceId: z.string().optional(),
  manager: z.object({ id: z.string(), firstName: z.string().nullable(), lastName: z.string().nullable(), image: z.string().nullable() }).nullable(),
  progress: z.object({ total: z.number(), done: z.number(), percentage: z.number() }),
  health: z.enum(['on_track', 'at_risk', 'off_track']),
  members: z.array(projectListItemMemberSchema),
  teams: z.array(z.string()),
});

const projectListPageSchema = z.object({
  data: z.array(projectListItemSchema),
  hasMore: z.boolean(),
  nextCursor: z.number().nullable(),
});

const projectRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  key: z.string(),
  clientMembershipId: z.number().nullable(),
  managerMembershipId: z.number().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).nullable(),
  priority: z.string().nullable(),
  dealId: z.number().nullable(),
  managedProductId: z.number().nullable(),
  pmWorkspaceId: z.string(),
  budget: z.string().nullable(),
  budgetMinor: z.number().nullable(),
  budgetCurrency: z.string().nullable(),
  settings: z.object({ modules: z.object({ sprints: z.boolean(), epics: z.boolean(), timeTracking: z.boolean(), wiki: z.boolean() }), projectType: z.string().optional(), workflow: z.string().optional(), features: z.record(z.string(), z.boolean()).optional() }).nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const projectStatusRowSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  orgId: z.string(),
  name: z.string(),
  order: z.number(),
  color: z.string().nullable(),
  wipLimit: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectDetailMemberContract = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  membershipId: z.number(),
  role: z.string(),
  user: z.object({
    id: z.number(),
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }),
  }),
}).transform((m) => ({
  id: m.id,
  projectId: m.projectId,
  userId: m.user.user.id,
  role: m.role,
  joinedAt: null,
  user: {
    id: m.user.user.id,
    name: m.user.user.name,
    firstName: m.user.user.firstName,
    lastName: m.user.user.lastName,
    email: m.user.user.email,
    image: m.user.user.image,
  },
}));

const projectDetailSchema = projectRowSchema.extend({
  statuses: z.array(projectStatusRowSchema),
  members: z.array(projectDetailMemberContract),
});

const projectMemberSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  image: z.string().nullable(),
  email: z.string(),
  role: z.string(),
  joinedAt: z.string(),
});

const projectRosterSchema = z.object({
  teams: z.array(z.object({ id: z.number(), name: z.string(), key: z.string() })),
  members: z.array(z.object({ id: z.string(), name: z.string().nullable(), firstName: z.string().nullable(), lastName: z.string().nullable(), email: z.string(), image: z.string().nullable() })),
});

const projectMemberRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  membershipId: z.number(),
  userId: z.string().optional(),
  role: z.string(),
  hourlyRate: z.string(),
  hourlyRateMinor: z.number(),
  rateCurrency: z.string().nullable(),
  joinedAt: z.string(),
});

const memberRoleSchema = z.object({
  id: z.number(),
  membershipId: z.number(),
  role: z.string(),
  userId: z.string(),
});

const projectCustomStateSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  color: z.string().nullable(),
  order: z.number(),
  type: z
    .enum(["backlog", "unstarted", "started", "completed", "cancelled"])
    .nullable()
    .optional(),
  wipLimit: z.number().nullable().optional(),
});

const bulkReorderStatesResultSchema = z.object({
  items: z.array(z.object({ id: z.number(), order: z.number() })),
});

const buildCustomFieldSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  type: z.enum(["text", "number", "date", "user", "select", "multi_select", "checkbox", "url", "currency"]),
  options: z.array(z.string()).nullable(),
  required: z.boolean(),
  position: z.number(),
  createdAt: z.string(),
});

const ticketFieldValueSchema = z.object({
  id: z.number(),
  ticketId: z.number(),
  fieldId: z.number(),
  value: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  field: z.object({
    id: z.number(),
    orgId: z.string(),
    projectId: z.number(),
    name: z.string(),
    type: z.enum(["text", "number", "date", "user", "select", "multi_select", "checkbox", "url", "currency"]),
    options: z.array(z.string()).nullable(),
    required: z.boolean(),
    position: z.number(),
    createdAt: z.string(),
  }),
});

const projectReleaseListItemSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  version: z.string(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'released', 'archived']),
  releaseDate: z.string().nullable(),
  ticketCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const projectReleaseRowSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  version: z.string(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'released', 'archived']),
  releaseDate: z.string().nullable(),
  ticketCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const projectWebhookSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  url: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
});

const webhookDeliverySchema = z.object({
  id: z.number(),
  webhookId: z.number(),
  event: z.string(),
  status: z.enum(['success', 'failed', 'pending']),
  responseCode: z.number().nullable(),
  attempts: z.number(),
  lastError: z.string().nullable(),
  deliveredAt: z.string(),
});

const webhookTestResultSchema = z.object({
  success: z.boolean(),
  responseCode: z.number().nullable(),
});

const projectAutomationConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty']),
  value: z.string().optional(),
});

const projectAutomationActionSchema = z.object({
  type: z.enum(['set_status', 'set_assignee', 'set_priority', 'add_label', 'add_comment']),
  value: z.string(),
});

const projectAutomationListItemSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  isActive: z.boolean(),
  triggerEvent: z.string(),
  conditions: z.array(projectAutomationConditionSchema),
  actions: z.array(projectAutomationActionSchema),
  createdAt: z.string(),
});

const projectAutomationRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  isActive: z.boolean(),
  triggerEvent: z.string(),
  conditions: z.array(projectAutomationConditionSchema),
  actions: z.array(projectAutomationActionSchema),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const workspaceMemberItemSchema = z.object({
  id: z.string(),
  role: z.enum(['member', 'admin']),
  addedAt: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  teams: z.array(z.string()),
});

const workspaceMemberPageSchema = z.object({
  data: z.array(workspaceMemberItemSchema),
  pagination: z.object({ limit: z.number(), hasMore: z.boolean(), nextCursor: z.string().nullable() }),
});

const workspaceMemberRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  membershipId: z.number(),
  role: z.string(),
  pmWorkspaceId: z.string(),
  addedAt: z.string(),
});

export const ticketLabelListContract = z.array(ticketLabelSchema);
export const ticketLabelContract = ticketLabelSchema;
export const projectListPageContract = projectListPageSchema;
export const projectRowContract = projectRowSchema;
export const projectDetailContract = projectDetailSchema;
export const projectMemberListContract = z.array(projectMemberSchema);
export const projectMemberRowContract = projectMemberRowSchema;
export const memberRoleContract = memberRoleSchema;
export const projectRosterContract = projectRosterSchema;
export const projectCustomStateListContract = z.array(projectCustomStateSchema);
export const projectCustomStateContract = projectCustomStateSchema;
export const bulkReorderStatesResultContract = bulkReorderStatesResultSchema;
export const buildCustomFieldListContract = z.array(buildCustomFieldSchema);
export const buildCustomFieldContract = buildCustomFieldSchema;
export const ticketFieldValueListContract = z.array(ticketFieldValueSchema);
export const ticketFieldValueCreateContract = z.object({ success: z.literal(true) });
export const projectReleaseListContract = z.array(projectReleaseListItemSchema);
export const projectReleaseRowContract = projectReleaseRowSchema;
export const projectWebhookListContract = z.array(projectWebhookSchema);
export const projectWebhookRowContract = projectWebhookSchema;
export const webhookDeliveryListContract = z.array(webhookDeliverySchema);
export const webhookTestResultContract = webhookTestResultSchema;
export const projectAutomationListContract = z.array(projectAutomationListItemSchema);
export const projectAutomationRowContract = projectAutomationRowSchema;
export const workspaceMemberPageContract = workspaceMemberPageSchema;
export const workspaceMemberRowContract = workspaceMemberRowSchema;
export const successContract = z.object({ success: z.literal(true) });
