import { z } from "zod";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-refinements";
import type { Cycle } from "@/types/projects";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";

const DESCRIPTION_MAX = 500;
const GOAL_MAX = 500;
export const CAPACITY_MAX = 100_000;

const cycleFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .transform((value) => value.trim())
      .pipe(
        z
          .string()
          .min(2, "Name must be at least 2 characters")
          .max(100, "Name must be 100 characters or fewer")
          .regex(
            /[A-Za-z0-9]/,
            "Name must contain at least one letter or number",
          ),
      ),
    description: z
      .string()
      .max(
        DESCRIPTION_MAX,
        `Description must be ${DESCRIPTION_MAX} characters or fewer`,
      ),
    goal: z
      .string()
      .max(GOAL_MAX, `Goal must be ${GOAL_MAX} characters or fewer`),
    capacity: z
      .string()
      .refine(
        (value) => value === "" || /^\d+$/.test(value),
        "Capacity must be a whole number of points",
      )
      .refine(
        (value) => value === "" || Number(value) <= CAPACITY_MAX,
        `Capacity must be ${CAPACITY_MAX} or fewer`,
      ),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .superRefine((data, context) => {
    refineDateOrder(data, context, {
      mode: "after",
      message: "End date must be after start date",
    });
  });

export const createCycleSchema = cycleFormSchema.superRefine((data, context) => {
  refineNotBeforeToday(
    data.startDate,
    context,
    "startDate",
    "Start date cannot be in the past",
  );
  refineNotBeforeToday(
    data.endDate,
    context,
    "endDate",
    "End date cannot be in the past",
  );
});

export { cycleFormSchema };

export type CycleFormValues = z.infer<typeof cycleFormSchema>;

export const EMPTY_CYCLE_FORM_VALUES: CycleFormValues = {
  name: "",
  description: "",
  goal: "",
  capacity: "",
  startDate: "",
  endDate: "",
};

export const CYCLE_DESCRIPTION_MAX = DESCRIPTION_MAX;

export function buildCycleConflictDiffs(
  formValues: CycleFormValues,
  serverCycle: Cycle,
): TicketConflictFieldDiff[] {
  const capacity =
    formValues.capacity === "" ? null : Number(formValues.capacity);
  const fmt = (v: unknown): string =>
    v === null || v === undefined || v === "" ? "—" : String(v);
  const diffs: TicketConflictFieldDiff[] = [];
  if (formValues.name !== serverCycle.name)
    diffs.push({
      key: "name",
      label: "Name",
      serverValue: fmt(serverCycle.name),
      pendingValue: fmt(formValues.name),
    });
  if (formValues.description !== (serverCycle.description ?? ""))
    diffs.push({
      key: "description",
      label: "Description",
      serverValue: fmt(serverCycle.description),
      pendingValue: fmt(formValues.description),
    });
  if (formValues.goal !== (serverCycle.goal ?? ""))
    diffs.push({
      key: "goal",
      label: "Goal",
      serverValue: fmt(serverCycle.goal),
      pendingValue: fmt(formValues.goal),
    });
  if (capacity !== serverCycle.capacity)
    diffs.push({
      key: "capacity",
      label: "Capacity",
      serverValue: fmt(serverCycle.capacity),
      pendingValue: fmt(capacity),
    });
  if (formValues.startDate !== serverCycle.startDate)
    diffs.push({
      key: "startDate",
      label: "Start date",
      serverValue: fmt(serverCycle.startDate),
      pendingValue: fmt(formValues.startDate),
    });
  if (formValues.endDate !== serverCycle.endDate)
    diffs.push({
      key: "endDate",
      label: "End date",
      serverValue: fmt(serverCycle.endDate),
      pendingValue: fmt(formValues.endDate),
    });
  return diffs;
}
