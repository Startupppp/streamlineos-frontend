import { z } from "zod";
import type { ReportingLineView } from "@/hooks/api/hr/reporting-lines-schema";
import type { SetReportingLineInput } from "@/hooks/api/hr/reporting-lines";

/**
 * The one client mirror of the D4 contract: a required change reason counts at
 * least this many non-whitespace characters (backend CHANGE_REASON_MIN_CHARS).
 * Everything else about the frequency guard — when it applies, who may pass it —
 * is the server's to decide; the UI only reads its counts and shows its answer.
 */
export const CHANGE_REASON_MIN_CHARS = 10;

export function nonWhitespaceLength(value: string | undefined): number {
  return (value ?? "").replace(/\s/g, "").length;
}

/** Read straight from the server's fields (CONTRACT §4.3); no client rule on top. */
export function requiresChangeReason(line: Pick<ReportingLineView, "primaryChangesLast24h" | "changeThreshold">): boolean {
  return line.primaryChangesLast24h >= line.changeThreshold;
}

type SecondaryEntry = ReportingLineView["secondary"][number];

function isCurrentOn(entry: SecondaryEntry, today: string): boolean {
  return entry.effectiveFrom <= today && (entry.effectiveTo === null || entry.effectiveTo >= today);
}

/** Additional managers scheduled to start after `today` — shown read-only, never re-dated. */
export function upcomingSecondaries(line: ReportingLineView, today: string): SecondaryEntry[] {
  return line.secondary.filter((entry) => entry.effectiveFrom > today);
}

const managerRefSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    designation: z.string().nullable(),
    state: z.enum(["active", "on-notice", "inactive", "exited"]),
  })
  .nullable();

export const reportingLineEditorSchema = z
  .object({
    primaryManagerUserId: z.string().nullable(),
    primaryManagerRef: managerRefSchema,
    topLevel: z.boolean(),
    topLevelReason: z.string().trim().max(500, "Keep the reason under 500 characters"),
    secondaryManagers: z.array(
      z.object({
        managerUserId: z.string().min(1, "Choose a manager or remove this row"),
        label: z.string().trim().max(60, "Keep the label under 60 characters"),
        managerRef: managerRefSchema,
      }),
    ),
    effectiveFrom: z.string(),
    reason: z.string().trim().max(1000, "Keep the reason under 1,000 characters"),
    emergency: z.boolean(),
    /** Set by the sheet from the line's counts; not a field the user edits. */
    reasonRequired: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.topLevel) {
      if (!value.topLevelReason)
        ctx.addIssue({ code: "custom", message: "Explain why this role has no reporting manager.", path: ["topLevelReason"] });
    } else if (!value.primaryManagerUserId) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a primary reporting manager, or mark the role as top-level.",
        path: ["primaryManagerUserId"],
      });
    }
    const seen = new Set<string>(value.primaryManagerUserId && !value.topLevel ? [value.primaryManagerUserId] : []);
    value.secondaryManagers.forEach((entry, index) => {
      if (!entry.managerUserId) return;
      if (seen.has(entry.managerUserId))
        ctx.addIssue({
          code: "custom",
          message: entry.managerUserId === value.primaryManagerUserId ? "Already the primary reporting manager." : "Already added.",
          path: ["secondaryManagers", index, "managerUserId"],
        });
      seen.add(entry.managerUserId);
    });
    if ((value.reasonRequired || value.emergency) && nonWhitespaceLength(value.reason) < CHANGE_REASON_MIN_CHARS)
      ctx.addIssue({
        code: "custom",
        message: `Give a reason of at least ${CHANGE_REASON_MIN_CHARS} characters.`,
        path: ["reason"],
      });
  });

export type ReportingLineEditorValues = z.infer<typeof reportingLineEditorSchema>;

/**
 * `today` is the viewer's local date; the form edits only the additional
 * managers in force on it (a scheduled one would otherwise be re-dated).
 */
export function editorDefaults(line: ReportingLineView, today: string): ReportingLineEditorValues {
  const current = line.current;
  return {
    primaryManagerUserId: current?.managerUserId ?? null,
    primaryManagerRef:
      current?.managerUserId && current.managerName
        ? {
            userId: current.managerUserId,
            name: current.managerName,
            email: current.managerEmail,
            designation: current.managerDesignation,
            state: current.managerState,
          }
        : null,
    topLevel: line.topLevel !== null && current === null,
    topLevelReason: line.topLevel?.reason ?? "",
    secondaryManagers: line.secondary
      .filter((entry) => isCurrentOn(entry, today))
      .map((entry) => ({ managerUserId: entry.manager.userId, label: entry.label ?? "", managerRef: entry.manager })),
    effectiveFrom: "",
    reason: "",
    emergency: false,
    reasonRequired: false,
  };
}

/**
 * The PUT body (CONTRACT §4.4). Blank optional fields are omitted.
 * `secondaryManagers` is the desired full set, and the server re-dates every line
 * in it from the effective date — so it is sent only when the user changed the
 * set (or a top-level role ends them); otherwise it is omitted, meaning "unchanged".
 */
export function editorPayload(
  employeeUserId: string,
  values: ReportingLineEditorValues,
  { secondariesChanged }: { secondariesChanged: boolean },
): SetReportingLineInput {
  return {
    employeeUserId,
    primaryManagerUserId: values.topLevel ? null : values.primaryManagerUserId,
    ...(values.topLevel ? { topLevelReason: values.topLevelReason } : {}),
    ...(values.topLevel
      ? { secondaryManagers: [] }
      : secondariesChanged
        ? {
            secondaryManagers: values.secondaryManagers.map((entry) => ({
              managerUserId: entry.managerUserId,
              ...(entry.label ? { label: entry.label } : {}),
            })),
          }
        : {}),
    ...(values.effectiveFrom ? { effectiveFrom: values.effectiveFrom } : {}),
    ...(values.reason ? { reason: values.reason } : {}),
    ...(values.emergency ? { emergency: true } : {}),
  };
}

/** Where a server refusal belongs on the form (FE-79). */
export const ERROR_FIELD: Partial<Record<string, keyof ReportingLineEditorValues>> = {
  SELF_REFERENCE: "primaryManagerUserId",
  MANAGER_NOT_ELIGIBLE: "primaryManagerUserId",
  MANAGER_NOT_FOUND: "primaryManagerUserId",
  PRIMARY_CYCLE: "primaryManagerUserId",
  SECONDARY_DUPLICATES_PRIMARY: "secondaryManagers",
  SECONDARY_DUPLICATE: "secondaryManagers",
  SECONDARY_CAP_EXCEEDED: "secondaryManagers",
  TOP_LEVEL_WITH_MANAGER: "topLevelReason",
  TOP_LEVEL_REASON_REQUIRED: "topLevelReason",
  TOP_LEVEL_NOT_ALLOWED: "topLevelReason",
  CHANGE_REASON_REQUIRED: "reason",
  INVALID_EFFECTIVE_DATE: "effectiveFrom",
};
