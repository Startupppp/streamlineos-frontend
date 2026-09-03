import { z } from "zod";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-refinements";

const sprintNameSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .min(2, "Sprint name must be at least 2 characters")
      .max(100, "Sprint name must be 100 characters or fewer")
      .regex(/[A-Za-z0-9]/, "Sprint name must contain at least one letter or number"),
  );

const sprintDatesObject = z.object({
  name: sprintNameSchema,
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  goal: z.string().optional(),
});

export const createSprintSchema = sprintDatesObject.superRefine((data, ctx) => {
  refineNotBeforeToday(data.startDate, ctx, "startDate", "Start date cannot be in the past");
  refineNotBeforeToday(data.endDate, ctx, "endDate", "End date cannot be in the past");
  refineDateOrder(data, ctx, {
    mode: "after",
    message: "End date must be after start date",
  });
});

export const editSprintSchema = sprintDatesObject.superRefine((data, ctx) => {
  refineDateOrder(data, ctx, {
    mode: "after",
    message: "End date must be after start date",
  });
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type EditSprintInput = z.infer<typeof editSprintSchema>;
