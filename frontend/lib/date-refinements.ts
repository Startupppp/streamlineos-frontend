import type { RefinementCtx } from "zod";
import { z } from "zod";
import { isEndInvalidForStart, type DateBoundMode } from "@/lib/date-constraints";
import { getTodayString } from "@/lib/date-utils";

/*
  The two zod refinements that used to live in `date-constraints`. They are the
  only thing in that module that touched zod, and `date-picker` imports the
  pure helpers beside them — which made zod (and its full locale table, 224 kB
  raw / 53 kB gzip) eagerly reachable from every route that renders a date
  field, whether or not that route validates a form. Splitting them out keeps
  the picker's dependency to date-fns.
*/

type DateOrderKeys = {
  startKey?: string;
  endKey?: string;
  mode?: DateBoundMode;
  message?: string;
};

export function refineDateOrder<T extends Record<string, unknown>>(
  data: T,
  ctx: RefinementCtx,
  options?: DateOrderKeys,
): void {
  const startKey = options?.startKey ?? "startDate";
  const endKey = options?.endKey ?? "endDate";
  const mode = options?.mode ?? "after";
  const start = data[startKey];
  const end = data[endKey];
  if (typeof start !== "string" || typeof end !== "string" || !start || !end) {
    return;
  }
  const invalid = isEndInvalidForStart(start, end, mode);
  if (!invalid) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message:
      options?.message ??
      (mode === "after"
        ? "End date must be after start date"
        : "End date must be on or after start date"),
    path: [endKey],
  });
}

export function refineNotBeforeToday(
  value: string | null | undefined,
  ctx: RefinementCtx,
  path: string,
  message = "Date cannot be in the past",
): void {
  if (!value) return;
  const today = getTodayString();
  if (value < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: [path],
    });
  }
}
