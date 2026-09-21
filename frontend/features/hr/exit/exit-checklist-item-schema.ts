import { z } from "zod";
import {
  EXIT_CHECKLIST_QUEUES,
  EXIT_CHECKLIST_STATUSES,
  type ExitChecklistItemUpdateInput,
} from "@/hooks/api/hr/exit-schema";
import type { ExitChecklistItem } from "@/hooks/api/hr/exit";

export const EXIT_CHECKLIST_OWNER_CHOICES = ["keep", ...EXIT_CHECKLIST_QUEUES, "person"] as const;

export type ExitChecklistOwnerChoice = (typeof EXIT_CHECKLIST_OWNER_CHOICES)[number];

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

export const exitChecklistItemFormSchema = z
  .object({
    status: z.enum(EXIT_CHECKLIST_STATUSES),
    evidence: z.string().trim().max(2000, "Keep evidence under 2000 characters"),
    notes: z.string().trim().max(2000, "Keep notes under 2000 characters"),
    dueDate: z.string().regex(isoDay, "Pick a date").or(z.literal("")),
    owner: z.enum(EXIT_CHECKLIST_OWNER_CHOICES),
    ownerUserId: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.status !== "PENDING" && values.evidence.length === 0)
      ctx.addIssue({ code: "custom", path: ["evidence"], message: "Say what closes this item — the evidence is what an auditor reads" });
    if (values.owner === "person" && values.ownerUserId.length === 0)
      ctx.addIssue({ code: "custom", path: ["ownerUserId"], message: "Choose who owns this item" });
  });

export type ExitChecklistItemFormInput = z.input<typeof exitChecklistItemFormSchema>;
export type ExitChecklistItemFormValues = z.output<typeof exitChecklistItemFormSchema>;

export function exitChecklistItemFormDefaults(item: ExitChecklistItem): ExitChecklistItemFormInput {
  return {
    status: item.status,
    evidence: item.evidence ?? "",
    notes: item.notes ?? "",
    dueDate: item.dueDate ?? "",
    owner: "keep",
    ownerUserId: "",
  };
}

export function exitChecklistItemUpdateFromForm(
  item: ExitChecklistItem,
  values: ExitChecklistItemFormValues,
  canReassign: boolean,
): ExitChecklistItemUpdateInput {
  const input: ExitChecklistItemUpdateInput = {};
  if (values.status !== item.status) input.status = values.status;
  const closing = input.status !== undefined && input.status !== "PENDING";
  if (values.evidence.length > 0 && (closing || values.evidence !== (item.evidence ?? ""))) input.evidence = values.evidence;
  if (values.notes !== (item.notes ?? "")) input.notes = values.notes;
  if (canReassign) {
    if (values.dueDate.length > 0 && values.dueDate !== item.dueDate) input.dueDate = values.dueDate;
    if (values.owner === "person") input.ownerUserId = values.ownerUserId;
    else if (values.owner !== "keep") input.ownerQueue = values.owner;
  }
  return input;
}
