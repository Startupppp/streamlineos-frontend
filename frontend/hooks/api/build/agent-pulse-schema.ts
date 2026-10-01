import { z } from "zod";
import { genAgentPulseTopSignalSchema } from "@/contracts/build-contracts.generated";

export const agentPulseSignalTypeSchema = z.enum([
  "delivery_risk",
  "comment_draft",
  "overdue_approval",
  "blocked_milestone",
  "dependency_change",
]);

export const agentPulseContract = genAgentPulseTopSignalSchema;

export type AgentPulseSignalType = z.infer<typeof agentPulseSignalTypeSchema>;
export type AgentPulseSignal = Exclude<z.infer<typeof agentPulseContract>, null>;
