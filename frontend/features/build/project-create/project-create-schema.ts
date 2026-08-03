import { z } from "zod";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-constraints";

export const PROJECT_NAME_MAX = 100;
export const PROJECT_KEY_MAX = 10;
export const PROJECT_DESCRIPTION_MAX = 2000;

export const basicsSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(PROJECT_NAME_MAX, `Name must be ${PROJECT_NAME_MAX} characters or fewer`)
      .refine((v) => v.trim().length >= 2, { message: "Name cannot be blank or whitespace only" })
      .refine((v) => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(v), {
        message: "Name contains invalid characters",
      }),
    key: z
      .string()
      .min(2, "Key must be at least 2 characters")
      .max(PROJECT_KEY_MAX, `Key must be ${PROJECT_KEY_MAX} characters or fewer`)
      .regex(/^[A-Z][A-Z0-9]*$/, "Key must start with a letter and contain only uppercase letters/numbers"),
    description: z
      .string()
      .max(PROJECT_DESCRIPTION_MAX, `Description must be ${PROJECT_DESCRIPTION_MAX} characters or fewer`)
      .optional(),
    managerId: z.string().optional(),
    clientId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    refineNotBeforeToday(data.startDate, ctx, "startDate", "Start date cannot be in the past");
    refineNotBeforeToday(data.endDate, ctx, "endDate", "End date cannot be in the past");
    refineDateOrder(data, ctx, {
      mode: "after",
      message: "End date must be after start date",
    });
  });

export type BasicsValues = z.infer<typeof basicsSchema>;
