import { z } from "zod";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { DocumentAudience, DocumentAudienceEntry } from "@/hooks/api/hr/document-classification";
import type { DocumentClassification } from "@/types/hr";

export interface ClassificationOption {
  value: DocumentClassification;
  label: string;
  tone: BadgeTone;
  description: string;
  /** Internal and Restricted are the only classes that can reach the Knowledge Base, and only for someone who may publish. */
  shareable: boolean;
}

export const CLASSIFICATION_OPTIONS: readonly ClassificationOption[] = [
  {
    value: "PERSONAL",
    label: "Personal",
    tone: "neutral",
    description: "Belongs to a person. It stays in HR and is never shared.",
    shareable: false,
  },
  {
    value: "CONFIDENTIAL",
    label: "Confidential",
    tone: "danger",
    description: "HR only. It is never shown in the Knowledge Base.",
    shareable: false,
  },
  {
    value: "INTERNAL",
    label: "Internal",
    tone: "info",
    description: "A company document that can be shared with employees in the Knowledge Base.",
    shareable: true,
  },
  {
    value: "RESTRICTED",
    label: "Restricted",
    tone: "warning",
    description: "Shared only with the departments or locations you choose.",
    shareable: true,
  },
];

export function classificationOption(value: DocumentClassification): ClassificationOption {
  return CLASSIFICATION_OPTIONS.find((option) => option.value === value) ?? CLASSIFICATION_OPTIONS[0];
}

export const AUDIENCE_MODES = ["HR_ONLY", "ALL_EMPLOYEES", "SELECTED"] as const;
export type AudienceMode = (typeof AUDIENCE_MODES)[number];

export const classificationFormSchema = z
  .object({
    classification: z.enum(["PERSONAL", "CONFIDENTIAL", "RESTRICTED", "INTERNAL"]),
    effectiveDate: z.string(),
    audienceMode: z.enum(AUDIENCE_MODES),
    departmentIds: z.array(z.string()),
    locationIds: z.array(z.string()),
  })
  .refine(
    (values) =>
      !classificationOption(values.classification).shareable ||
      values.audienceMode !== "SELECTED" ||
      values.departmentIds.length + values.locationIds.length > 0,
    { message: "Pick at least one department or location.", path: ["audienceMode"] },
  );

export type ClassificationFormValues = z.infer<typeof classificationFormSchema>;

/** What the form shows for a document as the server has it. A document nobody has given an audience is HR only. */
export function formValuesFromView(view: {
  classification: DocumentClassification;
  effectiveDate: string | null;
  audiences: readonly DocumentAudience[];
}): ClassificationFormValues {
  const everyone = view.audiences.some((audience) => audience.kind === "ALL_EMPLOYEES");
  const departmentIds = view.audiences.flatMap((a) => (a.kind === "DEPARTMENT" && a.refId ? [a.refId] : []));
  const locationIds = view.audiences.flatMap((a) => (a.kind === "LOCATION" && a.refId ? [a.refId] : []));
  const audienceMode: AudienceMode = everyone
    ? "ALL_EMPLOYEES"
    : departmentIds.length + locationIds.length > 0
      ? "SELECTED"
      : "HR_ONLY";
  return {
    classification: view.classification,
    effectiveDate: view.effectiveDate ?? "",
    audienceMode,
    departmentIds,
    locationIds,
  };
}

/** The audience set to send. Only Internal and Restricted carry one; anything else is sent as none, which the server clears anyway. */
export function audiencesFromForm(values: ClassificationFormValues): DocumentAudienceEntry[] {
  if (!classificationOption(values.classification).shareable) return [];
  if (values.audienceMode === "ALL_EMPLOYEES") return [{ kind: "ALL_EMPLOYEES", refId: null }];
  if (values.audienceMode === "HR_ONLY") return [];
  return [
    ...values.departmentIds.map((refId): DocumentAudienceEntry => ({ kind: "DEPARTMENT", refId })),
    ...values.locationIds.map((refId): DocumentAudienceEntry => ({ kind: "LOCATION", refId })),
  ];
}

const audienceKey = (entry: DocumentAudienceEntry): string => `${entry.kind}:${entry.refId ?? ""}`;

export function sameAudiences(a: readonly DocumentAudienceEntry[], b: readonly DocumentAudienceEntry[]): boolean {
  const left = new Set(a.map(audienceKey));
  const right = new Set(b.map(audienceKey));
  return left.size === right.size && [...left].every((key) => right.has(key));
}
