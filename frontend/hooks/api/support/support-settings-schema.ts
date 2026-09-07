import { z } from "zod";

export const supportMacroRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  title: z.string(),
  body: z.string(),
  category: z.string().nullable(),
  visibility: z.string(),
  actions: z.record(z.string(), z.unknown()),
  usageCount: z.number(),
  createdByMembershipId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const supportMacroListContract = z.array(supportMacroRowContract);

export const macroUsageContract = z.array(
  z.object({ id: z.number(), title: z.string(), usageCount: z.number() }),
);

export const previewMacroContract = z.object({ body: z.string() });

export const applyMacroResultContract = z.object({
  body: z.string(),
  isInternal: z.boolean(),
  actionsApplied: z.record(z.string(), z.unknown()),
});

export const supportRoutingRuleRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  conditions: z.array(z.unknown()),
  assigneeMembershipId: z.number().nullable(),
  setPriority: z.string().nullable(),
  assignmentMode: z.string(),
  candidateAgentIds: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  isEnabled: z.boolean(),
  sortOrder: z.number(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const supportRoutingRuleListContract = z.array(supportRoutingRuleRowContract);

export const supportAgentSkillRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string().nullable(),
  userMembershipId: z.number(),
  skill: z.string(),
  createdAt: z.string(),
});

export const supportAgentSkillListContract = z.array(supportAgentSkillRowContract);

export const setAgentSkillsResultContract = z.object({
  success: z.literal(true),
  skills: z.array(z.string()),
});

export const supportAgentAvailabilityRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number(),
  isAvailable: z.boolean(),
  updatedAt: z.string(),
});

export const supportAgentAvailabilityListContract = z.array(supportAgentAvailabilityRowContract);

export const supportVipClientRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  clientId: z.number(),
  createdAt: z.string(),
});

export const supportVipClientListContract = z.array(supportVipClientRowContract);

export const supportSlaPolicyRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullable(),
  category: z.string().nullable(),
  businessHoursId: z.number().nullable(),
  firstResponseTargetMins: z.number(),
  resolutionTargetMins: z.number(),
  pauseStatuses: z.array(z.string()),
  isEnabled: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const supportSlaPolicyListContract = z.array(supportSlaPolicyRowContract);

export const supportSettingsAuditLogRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string().nullable(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  changes: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});

export const supportSettingsAuditLogListContract = z.array(supportSettingsAuditLogRowContract);

export const supportCustomFieldContract = z.object({
  id: z.number(),
  orgId: z.string(),
  key: z.string(),
  label: z.string(),
  fieldType: z.string(),
  options: z.array(z.string()).nullable(),
  required: z.boolean(),
  category: z.string().nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const supportCustomFieldListContract = z.array(supportCustomFieldContract);

export const supportSuccessContract = z.object({ success: z.literal(true) });

export const runEscalationsContract = z.object({
  checked: z.number(),
  escalated: z.number(),
});
