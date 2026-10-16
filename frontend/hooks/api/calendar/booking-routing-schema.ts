import { z } from "zod";

const routingModeSchema = z.enum(["fair_rotation", "weighted_rotation", "least_loaded", "collective"]);
const routingFallbackSchema = z.enum(["next_eligible", "primary_host", "no_match"]);

export const routingHostInputSchema = z.object({
  membershipId: z.number().int().positive(),
  weight: z.number().int().min(1).max(100),
  priority: z.number().int().min(-1000).max(1000),
  territories: z.array(z.string().trim().min(1).max(120)).max(100),
  languages: z.array(z.string().trim().min(2).max(35)).max(20),
  minimumSkillLevel: z.number().int().min(1).max(5),
  dailyLimit: z.number().int().min(1).max(100).nullable(),
  active: z.boolean(),
});

export const routingRuleInputSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  mode: routingModeSchema,
  fallbackMode: routingFallbackSchema,
  crmOwnerEnabled: z.boolean(),
  collectiveMinimumHosts: z.number().int().min(1).max(25),
  hosts: z.array(routingHostInputSchema).min(1).max(25),
}).superRefine((value, context) => {
  const membershipIds = value.hosts.map((host) => host.membershipId);
  if (new Set(membershipIds).size !== membershipIds.length)
    context.addIssue({ code: "custom", path: ["hosts"], message: "Each host can appear only once" });
  if (value.mode === "collective" && value.collectiveMinimumHosts > value.hosts.length)
    context.addIssue({ code: "custom", path: ["collectiveMinimumHosts"], message: "Minimum hosts exceeds the host count" });
});

export const routingRuleContract = z.object({
  id: z.number().int().positive(),
  bookingRuleId: z.number().int().positive(),
  status: z.enum(["active", "paused"]),
  versionId: z.number().int().positive(),
  version: z.number().int().positive(),
  mode: routingModeSchema,
  fallbackMode: routingFallbackSchema,
  crmOwnerEnabled: z.boolean(),
  collectiveMinimumHosts: z.number().int().positive(),
  hosts: z.array(routingHostInputSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const routingHostCandidatesContract = z.array(z.object({
  membershipId: z.number().int().positive(),
  userId: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().email(),
}));

export type RoutingRuleInput = z.infer<typeof routingRuleInputSchema>;
export type RoutingRule = z.infer<typeof routingRuleContract>;
export type RoutingHostCandidate = z.infer<typeof routingHostCandidatesContract>[number];
