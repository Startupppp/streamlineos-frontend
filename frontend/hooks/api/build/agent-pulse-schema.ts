import { z } from "zod";
import { agentPulseGetTopSignalResponseSchema } from "@/contracts/build-contracts.generated";

export const agentPulseSignalTypeSchema = agentPulseGetTopSignalResponseSchema.unwrap().shape.type;

export const agentPulseContract = agentPulseGetTopSignalResponseSchema;

export type AgentPulseSignalType = z.infer<typeof agentPulseSignalTypeSchema>;
export type AgentPulseSignal = Exclude<z.infer<typeof agentPulseContract>, null>;
