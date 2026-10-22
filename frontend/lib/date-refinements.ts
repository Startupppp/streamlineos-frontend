import type { RefinementCtx } from "zod";
import { z } from "zod";
import { isEndInvalidForStart, type DateBoundMode } from "@/lib/date-constraints";
import { getTodayString } from "@/lib/date-utils";


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
