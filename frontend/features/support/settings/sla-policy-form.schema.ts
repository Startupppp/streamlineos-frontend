import { z } from "zod";
import type {
  SlaPolicy, SlaPauseStatus, CreateSlaPolicyInput, UpdateSlaPolicyInput,
} from "@/hooks/api/support/sla-policies";

export const NO_PRIORITY = "ANY";
export const NO_BUSINESS_HOURS = "none";

export const PAUSE_STATUS_OPTIONS: { value: SlaPauseStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const positiveIntString = (label: string) =>
  z
    .string()
    .min(1, "Required")
    .refine((v) => !isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) > 0, `${label} must be a positive integer`);

export const policySchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  priority: z.enum(["ANY", "LOW", "MEDIUM", "HIGH", "URGENT"]),
  category: z.string().max(100).optional(),
  businessHoursId: z.string(),
  firstResponseTargetMins: positiveIntString("First response target"),
  resolutionTargetMins: positiveIntString("Resolution target"),
  pauseStatuses: z.array(z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])),
  isEnabled: z.boolean(),
});
export type PolicyForm = z.infer<typeof policySchema>;

export const DEFAULT_FORM_VALUES: PolicyForm = {
  name: "",
  priority: "MEDIUM",
  category: "",
  businessHoursId: NO_BUSINESS_HOURS,
  firstResponseTargetMins: "60",
  resolutionTargetMins: "480",
  pauseStatuses: ["WAITING"],
  isEnabled: true,
};

export function policyToFormValues(policy: SlaPolicy): PolicyForm {
  return {
    name: policy.name,
    priority: policy.priority ?? "ANY",
    category: policy.category ?? "",
    businessHoursId: policy.businessHoursId !== null ? String(policy.businessHoursId) : NO_BUSINESS_HOURS,
    firstResponseTargetMins: String(policy.firstResponseTargetMins),
    resolutionTargetMins: String(policy.resolutionTargetMins),
    pauseStatuses: policy.pauseStatuses,
    isEnabled: policy.isEnabled,
  };
}

export function buildCreatePayload(data: PolicyForm): CreateSlaPolicyInput {
  return {
    name: data.name,
    priority: data.priority === "ANY" ? undefined : data.priority,
    category: data.category ? data.category : undefined,
    businessHoursId: data.businessHoursId === NO_BUSINESS_HOURS ? undefined : Number(data.businessHoursId),
    firstResponseTargetMins: Number(data.firstResponseTargetMins),
    resolutionTargetMins: Number(data.resolutionTargetMins),
    pauseStatuses: data.pauseStatuses,
    isEnabled: data.isEnabled,
  };
}

export function buildUpdatePayload(data: PolicyForm): UpdateSlaPolicyInput {
  return {
    name: data.name,
    priority: data.priority === "ANY" ? null : data.priority,
    category: data.category ? data.category : null,
    businessHoursId: data.businessHoursId === NO_BUSINESS_HOURS ? null : Number(data.businessHoursId),
    firstResponseTargetMins: Number(data.firstResponseTargetMins),
    resolutionTargetMins: Number(data.resolutionTargetMins),
    pauseStatuses: data.pauseStatuses,
    isEnabled: data.isEnabled,
  };
}
