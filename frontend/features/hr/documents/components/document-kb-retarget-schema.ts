import { z } from "zod";
import type { DocumentAudienceEntry } from "@/hooks/api/hr/document-classification";
import type { DocumentKbLinkState } from "@/hooks/api/hr/document-kb-link";
import { sameAudiences } from "./document-classification-model";

export const RETARGET_AUDIENCE_MODES = ["HR_ONLY", "ALL_EMPLOYEES", "SELECTED"] as const;
export type RetargetAudienceMode = (typeof RETARGET_AUDIENCE_MODES)[number];

export const retargetFormSchema = z
  .object({
    versionMode: z.enum(["FOLLOW_LATEST", "PINNED"]),
    pinnedVersion: z.number().int().min(1).nullable(),
    audienceMode: z.enum(RETARGET_AUDIENCE_MODES),
    departmentIds: z.array(z.string()),
    locationIds: z.array(z.string()),
  })
  .refine(
    (v) => v.versionMode !== "PINNED" || (v.pinnedVersion !== null && v.pinnedVersion >= 1),
    { message: "A version number is required when pinning.", path: ["pinnedVersion"] },
  )
  .refine(
    (v) => v.audienceMode !== "SELECTED" || v.departmentIds.length + v.locationIds.length > 0,
    { message: "Pick at least one department or location.", path: ["audienceMode"] },
  );

export type RetargetFormValues = z.infer<typeof retargetFormSchema>;

export function formValuesFromLink(link: NonNullable<DocumentKbLinkState["link"]>): RetargetFormValues {
  const everyone = link.audiences.some((a) => a.kind === "ALL_EMPLOYEES");
  const departmentIds = link.audiences.flatMap((a) => (a.kind === "DEPARTMENT" && a.refId ? [a.refId] : []));
  const locationIds = link.audiences.flatMap((a) => (a.kind === "LOCATION" && a.refId ? [a.refId] : []));
  const audienceMode: RetargetAudienceMode = everyone
    ? "ALL_EMPLOYEES"
    : departmentIds.length + locationIds.length > 0
      ? "SELECTED"
      : "HR_ONLY";
  return {
    versionMode: link.versionMode,
    pinnedVersion: link.pinnedVersion,
    audienceMode,
    departmentIds,
    locationIds,
  };
}

export function audienceEntriesFromRetargetForm(values: RetargetFormValues): DocumentAudienceEntry[] {
  if (values.audienceMode === "ALL_EMPLOYEES") return [{ kind: "ALL_EMPLOYEES", refId: null }];
  if (values.audienceMode === "SELECTED") {
    return [
      ...values.departmentIds.map((refId): DocumentAudienceEntry => ({ kind: "DEPARTMENT", refId })),
      ...values.locationIds.map((refId): DocumentAudienceEntry => ({ kind: "LOCATION", refId })),
    ];
  }
  return [];
}

export interface RetargetBody {
  audiences?: DocumentAudienceEntry[];
  versionMode?: "FOLLOW_LATEST" | "PINNED";
  pinnedVersion?: number;
}

export function buildRetargetBody(
  values: RetargetFormValues,
  currentLink: NonNullable<DocumentKbLinkState["link"]>,
): RetargetBody {
  const body: RetargetBody = {};

  const versionModeChanged = values.versionMode !== currentLink.versionMode;
  const pinnedVersionChanged = values.pinnedVersion !== currentLink.pinnedVersion;

  if (versionModeChanged || (values.versionMode === "PINNED" && pinnedVersionChanged)) {
    body.versionMode = values.versionMode;
    if (values.versionMode === "PINNED" && values.pinnedVersion !== null) {
      body.pinnedVersion = values.pinnedVersion;
    }
  }

  const newAudiences = audienceEntriesFromRetargetForm(values);
  if (!sameAudiences(newAudiences, currentLink.audiences)) {
    body.audiences = newAudiences;
  }

  return body;
}
