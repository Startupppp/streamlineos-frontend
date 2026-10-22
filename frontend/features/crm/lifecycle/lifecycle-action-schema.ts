import { z } from "zod";
import { majorToMinor } from "@/lib/accounting/money";
import type {
  CloseLifecycleInput,
  LifecycleSignalKind,
  RecordLifecycleSignalInput,
  RenewLifecycleInput,
} from "@/hooks/api/crm/lifecycle";


export const SIGNAL_KIND_LABEL: Record<LifecycleSignalKind, string> = {
  "support-escalation": "Support escalation",
  "invoice-overdue": "Invoice overdue",
  "champion-departed": "Champion departed",
  "usage-decline": "Usage decline",
  "detractor-response": "Detractor response",
  "relationship-silence": "Relationship silence",
  "expansion-interest": "Expansion interest",
  "renewal-commitment": "Renewal commitment",
  note: "Note",
};

export const SIGNAL_KINDS = [
  "support-escalation",
  "invoice-overdue",
  "champion-departed",
  "usage-decline",
  "detractor-response",
  "relationship-silence",
  "expansion-interest",
  "renewal-commitment",
  "note",
] as const satisfies readonly LifecycleSignalKind[];

const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") return true;
      const n = Number(value);
      return Number.isInteger(n) && n >= min && n <= max;
    }, message);

export const recordSignalSchema = z.object({
  kind: z.enum(SIGNAL_KINDS),
  impact: optionalInt(-100, 100, "A whole number from -100 to 100"),
  note: z.string().trim().max(2000),
});
export type RecordSignalFormValues = z.infer<typeof recordSignalSchema>;

export function toSignalInput(
  customerLifecycleId: string,
  values: RecordSignalFormValues,
): RecordLifecycleSignalInput {
  return {
    customerLifecycleId,
    kind: values.kind,
    ...(values.impact !== "" ? { impact: Number(values.impact) } : {}),
    ...(values.note !== "" ? { note: values.note } : {}),
  };
}

export const renewSchema = z.object({
  termMonths: optionalInt(1, 120, "Between 1 and 120 months"),
  contractValue: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
      "Enter an amount of 0 or more",
    ),
  startedOn: z.string(),
  note: z.string().trim().max(2000),
});
export type RenewFormValues = z.infer<typeof renewSchema>;

export function toRenewInput(
  customerLifecycleId: string,
  values: RenewFormValues,
  currency: string,
): RenewLifecycleInput {
  return {
    customerLifecycleId,
    ...(values.termMonths !== "" ? { termMonths: Number(values.termMonths) } : {}),
    ...(values.contractValue !== ""
      ? { contractValueMinor: majorToMinor(Number(values.contractValue), currency) }
      : {}),
    ...(values.startedOn !== "" ? { startedOn: values.startedOn } : {}),
    ...(values.note !== "" ? { note: values.note } : {}),
  };
}

export const closeSchema = z.object({
  status: z.enum(["churned", "cancelled"]),
  reason: z.string().trim().min(1, "Say why the contract ended").max(500),
});
export type CloseFormValues = z.infer<typeof closeSchema>;

export function toCloseInput(
  customerLifecycleId: string,
  values: CloseFormValues,
): CloseLifecycleInput {
  return { customerLifecycleId, status: values.status, reason: values.reason };
}
