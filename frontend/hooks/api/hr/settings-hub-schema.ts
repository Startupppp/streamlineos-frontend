import { z } from "zod";

const effectiveRulesItemContract = z.object({
  policyType: z.string(),
  matchedPolicy: z.object({
    id: z.number().int(),
    name: z.string(),
    policyType: z.string(),
    version: z.number().int(),
    status: z.string(),
    effectiveFrom: z.string(),
    effectiveTo: z.string().nullable(),
    priority: z.number().int(),
    rules: z.record(z.string(), z.unknown()),
  }),
  rules: z.record(z.string(), z.unknown()),
  trace: z.object({
    policyId: z.number().int(),
    policyName: z.string(),
    version: z.number().int(),
    matchedScopes: z.array(
      z.object({ scopeType: z.string(), scopeValue: z.string(), specificity: z.number() }),
    ),
    maxSpecificity: z.number(),
    priority: z.number().int(),
  }),
});

export const effectiveRulesContract = z.array(effectiveRulesItemContract);

const policyVersionItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  version: z.number().int(),
  status: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  priority: z.number().int(),
  parentPolicyId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const templateVersionItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  version: z.number().int(),
  status: z.string(),
  kind: z.string(),
  description: z.string().nullable(),
  parentTemplateId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const workflowVersionItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  version: z.number().int(),
  status: z.string(),
  objectType: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const versionsContract = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("policy"), name: z.string(), items: z.array(policyVersionItemContract) }),
  z.object({ entity: z.literal("template"), name: z.string(), items: z.array(templateVersionItemContract) }),
  z.object({ entity: z.literal("workflow"), name: z.string(), items: z.array(workflowVersionItemContract) }),
]);

export type EffectiveRulesResponse = z.infer<typeof effectiveRulesContract>;
export type EffectiveRuleItem = z.infer<typeof effectiveRulesItemContract>;
export type VersionsResponse = z.infer<typeof versionsContract>;
