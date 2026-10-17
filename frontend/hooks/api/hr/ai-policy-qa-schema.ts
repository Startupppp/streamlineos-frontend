import { z } from "zod";

export const policyQaContract = z.object({
  answer: z.string(),
  confidence: z.enum(["high", "medium", "low", "not_found"]),
  citations: z.array(
    z.object({
      policyId: z.number().int(),
      policyType: z.string(),
      policyName: z.string().nullable(),
      snippet: z.string(),
      path: z.string(),
      source: z.literal("hr_policy_registry"),
    }),
  ),
  shouldEscalate: z.boolean(),
  escalationReason: z.string().optional(),
  suggestTicket: z.boolean(),
  capability: z.object({
    mode: z.literal("explain_draft_only"),
    mayInventPolicy: z.boolean(),
    mayApprovePayroll: z.boolean(),
    mayFileStatutory: z.boolean(),
    mayMoveMoney: z.boolean(),
    honestyLabel: z.string(),
    note: z.string(),
  }),
  forbiddenActions: z.array(z.string()),
  advisory: z.literal(true),
  disclaimer: z.string(),
});

export type PolicyQaResult = z.infer<typeof policyQaContract>;
