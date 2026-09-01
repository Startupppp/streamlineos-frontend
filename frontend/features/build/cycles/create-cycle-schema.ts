import { z } from "zod";
import {
  refineDateOrder,
  refineNotBeforeToday,
} from "@/lib/date-constraints";

export const DESCRIPTION_MAX = 500;

export const createCycleSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .transform((v) => v.trim())
      .pipe(
        z
          .string()
          .min(2, "Name must be at least 2 characters")
          .max(100, "Name must be 100 characters or fewer")
          .regex(/[A-Za-z0-9]/, "Name must contain at least one letter or number")
      ),
    description: z
      .string()
      .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or fewer`)
      .optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .superRefine((data, ctx) => {
    refineNotBeforeToday(data.startDate, ctx, "startDate", "Start date cannot be in the past");
    refineNotBeforeToday(data.endDate, ctx, "endDate", "End date cannot be in the past");
    refineDateOrder(data, ctx, {
      mode: "after",
      message: "End date must be after start date",
    });
  });

export type CreateCycleForm = z.infer<typeof createCycleSchema>;
